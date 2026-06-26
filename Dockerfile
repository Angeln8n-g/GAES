# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de definición de dependencias
COPY package*.json ./

# Instalar dependencias limpias
RUN npm ci

# Copiar todo el código de la aplicación
COPY . .

# Argumentos de construcción para inyectar variables de entorno de Vite
ARG VITE_API_URL
ARG VITE_API_MODE

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_MODE=$VITE_API_MODE

# Compilar la aplicación para producción (genera la carpeta dist/)
RUN npm run build

# Stage 2: Serve the React application with Nginx
FROM nginx:alpine

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los recursos compilados de la etapa anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto 80 (puerto por defecto del servidor web)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
