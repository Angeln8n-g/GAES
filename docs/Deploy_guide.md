Aquí tienes una guía paso a paso para desplegar un contenedor de PostgreSQL en Coolify, sembrar tus datos de inicio y conectarlo a tu ecosistema.

Parte 1: Desplegar PostgreSQL en Coolify
Coolify cuenta con soporte nativo para bases de datos que se configuran con un solo clic.

Crear el Recurso de Base de Datos:
Entra a tu proyecto en Coolify.
Selecciona el entorno donde está tu app (ej. production).
Haz clic en New Resource (Nuevo Recurso) -> Database -> PostgreSQL.
Configurar Parámetros Básicos:
Destination/Server: Selecciona tu servidor (usualmente localhost si es el mismo).
Database Name: Asigna un nombre (ej. capacitahub_db).
Username: Tu usuario de base de datos (ej. postgres).
Password: Escribe una contraseña segura o deja la generada automáticamente por Coolify.
Desplegar:
Haz clic en Deploy en la esquina superior derecha. Coolify descargará la imagen oficial de PostgreSQL y la pondrá en marcha.
Parte 2: Cargar tu Esquema y Datos Semilla (schema.sql)
Una vez que PostgreSQL esté levantado en Coolify, necesitas ejecutar tu archivo schema.sql en él.

Método A: Desde tu máquina local (Recomendado por comodidad)
En el panel de control de tu base de datos PostgreSQL en Coolify, busca la opción Public Access (Acceso Público) y actívala. Esto mapeará el puerto interno 5432 a un puerto público aleatorio en tu servidor (ej. 54321).
Utiliza una herramienta de terminal o un gestor gráfico de bases de datos (como DBeaver, pgAdmin o la consola psql) desde tu computadora local para conectarte:
bash
psql -h TU_IP_DEL_SERVIDOR -p PUERTO_PUBLICO_COOLIFY -U USUARIO_POSTGRES -d NOMBRE_DB -f schema.sql
(Opcional) Por seguridad, tras cargar el esquema, puedes desactivar el Public Access en Coolify para que la base de datos quede aislada dentro de la red interna del servidor Docker.
Método B: Ejecución interna desde Coolify
Ve a la consola web de tu contenedor PostgreSQL en Coolify (pestaña Terminal).
Entra al shell interactivo de postgres:
bash
psql -U postgres -d capacitahub_db
Copia el contenido del archivo schema.sql y pégalo directamente en la consola para ejecutar los queries de creación de tablas e inserción de datos semilla.
Parte 3: Arquitectura y Conexión de la App (¡Punto Importante!)
Dado que tu aplicación de React + Vite es una Single Page Application (SPA), corre al 100% en el navegador del usuario final. Por motivos de arquitectura y seguridad, un navegador web no puede conectarse directamente a una base de datos PostgreSQL.

La conexión correcta se realiza de la siguiente manera:

[ Navegador del Cliente (React App) ]
               │
          (HTTPS / JSON)
               ▼
[ Servidor API Backend (Node.js/FastAPI/Express...) ]  <-- Desplegado en Coolify
               │
        (Conexión TCP / DB)
               ▼
[ Base de Datos PostgreSQL ]                           <-- Desplegado en Coolify (Parte 1)
Configuración en Coolify:
Despliega tu API Backend en Coolify:
Enlaza la API con tu base de datos PostgreSQL usando la URL de conexión interna que te da Coolify (ej. postgresql://postgres:password@postgresql-docker-id:5432/capacitahub_db). Al usar la red interna de Docker, la conexión es ultra-rápida y segura.
Genera un dominio público para tu API Backend (ej. https://api.tu-dominio.com).
Configura tu React Frontend en Coolify:
Ve a los Build Arguments de tu contenedor de React en Coolify.
Agrega las variables de entorno de producción:
VITE_API_MODE = true
VITE_API_URL = https://api.tu-dominio.com/api (la URL pública de tu API).
Despliega la React App. Cuando el navegador del cliente consulte datos, enviará peticiones HTTP a tu API backend, y el backend a su vez consultará tu base de datos de PostgreSQL en Coolify.