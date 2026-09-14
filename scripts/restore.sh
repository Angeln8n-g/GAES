#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE RESTAURACIÓN SEGURA DE POSTGRESQL - GAES / CAPACITAHUB
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/apps/gaes/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-gaes_postgres}"
DB_NAME="${DB_NAME:-capacitahub_db}"
DB_USER="${DB_USER:-postgres}"

if [ $# -lt 1 ]; then
  echo "Uso: $0 <nombre_archivo_o_ruta.sql.gz> [--yes]"
  echo "Ejemplo: $0 backup_capacitahub_2026-09-14_063000.sql.gz"
  exit 1
fi

TARGET_INPUT="$1"
CONFIRM_FLAG="${2:-}"

# Resolver ruta completa del archivo
if [ -f "${TARGET_INPUT}" ]; then
  FILEPATH="${TARGET_INPUT}"
  FILENAME=$(basename "${FILEPATH}")
elif [ -f "${BACKUP_DIR}/${TARGET_INPUT}" ]; then
  FILEPATH="${BACKUP_DIR}/${TARGET_INPUT}"
  FILENAME="${TARGET_INPUT}"
else
  echo "❌ Error: El archivo de respaldo no fue encontrado en ${TARGET_INPUT} ni en ${BACKUP_DIR}/${TARGET_INPUT}"
  exit 1
fi

SHA_FILE="${BACKUP_DIR}/${FILENAME}.sha256"

echo "========================================================"
echo "⚠️  ADVERTENCIA DE RESTAURACIÓN DE BASE DE DATOS"
echo "========================================================"
echo "🎯 Archivo objetivo: ${FILENAME}"
echo "🐘 Base de datos destino: ${DB_NAME}"
echo "📁 Tamaño: $(du -h "${FILEPATH}" | cut -f1)"

# 1. Verificar integridad SHA-256
echo "🔍 Verificando integridad SHA-256..."
CALCULATED_SHA=$(sha256sum "${FILEPATH}" | awk '{print $1}')

if [ -f "${SHA_FILE}" ]; then
  EXPECTED_SHA=$(cat "${SHA_FILE}" | awk '{print $1}')
  if [ "${CALCULATED_SHA}" != "${EXPECTED_SHA}" ]; then
    echo "❌ Error de integridad: El SHA-256 calculado (${CALCULATED_SHA}) no coincide con el registrado (${EXPECTED_SHA})."
    exit 1
  fi
  echo "✅ Integridad SHA-256 verificada correctamente."
else
  echo "⚠️ Archivo .sha256 no encontrado. Continuando bajo verificación directa (${CALCULATED_SHA})..."
fi

# 2. Solicitar confirmación interactiva a menos que se use --yes
if [ "${CONFIRM_FLAG}" != "--yes" ] && [ "${CONFIRM_FLAG}" != "-y" ]; then
  read -p "¿Está completamente seguro de SOBREESCRIBIR la base de datos actual? (escriba 'SI' para confirmar): " CONFIRM
  if [ "${CONFIRM}" != "SI" ] && [ "${CONFIRM}" != "si" ]; then
    echo "Operación cancelada por el usuario."
    exit 0
  fi
fi

# 3. Crear respaldo de seguridad preventivo
echo "🛡️ Generando respaldo de seguridad previo..."
/opt/apps/gaes/scripts/backup.sh "pre_restore_safety" || true

# 4. Restaurar usando Docker o psql local
echo "🔄 Restaurando base de datos a partir de ${FILENAME}..."
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  gunzip -c "${FILEPATH}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"
else
  gunzip -c "${FILEPATH}" | psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5434}" -U "${DB_USER}" -d "${DB_NAME}"
fi

echo "========================================================"
echo "✅ ¡Base de datos restaurada satisfactoriamente!"
echo "📅 Finalizado: $(date)"
echo "========================================================"
