#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE RESPALDO AUTOMATIZADO DE POSTGRESQL - GAES / CAPACITAHUB
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/apps/gaes/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-gaes_postgres}"
DB_NAME="${DB_NAME:-capacitahub_db}"
DB_USER="${DB_USER:-postgres}"
TRIGGER_TYPE="${1:-manual_admin}"

mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
FILENAME="backup_capacitahub_${TIMESTAMP}.sql.gz"
TARGET_FILE="${BACKUP_DIR}/${FILENAME}"
SHA_FILE="${BACKUP_DIR}/${FILENAME}.sha256"
JSON_FILE="${BACKUP_DIR}/${FILENAME}.json"

echo "========================================================"
echo "📦 Iniciando respaldo de PostgreSQL (${DB_NAME})"
echo "📅 Fecha: $(date)"
echo "🎯 Destino: ${TARGET_FILE}"
echo "========================================================"

# Generar dump comprimido con gzip
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "🐳 Ejecutando pg_dump a través de contenedor Docker: ${CONTAINER_NAME}..."
  docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${TARGET_FILE}"
elif command -v pg_dump >/dev/null 2>&1; then
  echo "🐘 Ejecutando pg_dump local..."
  pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5434}" -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${TARGET_FILE}"
else
  echo "❌ Error: No se encontró ni Docker ni pg_dump disponible en el sistema."
  exit 1
fi

# Validar que el archivo exista y no esté vacío
if [ ! -s "${TARGET_FILE}" ]; then
  echo "❌ Error: El archivo de respaldo se generó vacío o no existe."
  rm -f "${TARGET_FILE}"
  exit 1
fi

FILESIZE=$(stat -c%s "${TARGET_FILE}")
FILESIZE_KB=$(( FILESIZE / 1024 ))

# Generar Checksum SHA-256
SHA256=$(sha256sum "${TARGET_FILE}" | awk '{print $1}')
echo "${SHA256}  ${FILENAME}" > "${SHA_FILE}"

# Generar metadatos JSON
cat <<EOF > "${JSON_FILE}"
{
  "filename": "${FILENAME}",
  "filepath": "${TARGET_FILE}",
  "sizeBytes": ${FILESIZE},
  "sizeFormatted": "${FILESIZE_KB} KB",
  "sha256": "${SHA256}",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "triggerType": "${TRIGGER_TYPE}",
  "databaseName": "${DB_NAME}"
}
EOF

echo "✅ Respaldo generado con éxito:"
echo "   - Archivo: ${FILENAME}"
echo "   - Tamaño: ${FILESIZE_KB} KB"
echo "   - SHA-256: ${SHA256}"

# Rotación y depuración automática de respaldos antiguos (más de 14 días en CLI)
echo "🧹 Limpiando respaldos con más de 14 días de antigüedad..."
find "${BACKUP_DIR}" -name "backup_capacitahub_*.sql.gz" -type f -mtime +14 -exec rm -f {} \;
find "${BACKUP_DIR}" -name "backup_capacitahub_*.sql.gz.sha256" -type f -mtime +14 -exec rm -f {} \;
find "${BACKUP_DIR}" -name "backup_capacitahub_*.sql.gz.json" -type f -mtime +14 -exec rm -f {} \;

echo "✨ Operación de respaldo concluida exitosamente."
