# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Stage 2: Production Run
FROM node:20-alpine

RUN apk add --no-cache postgresql-client gzip bash

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
# Asegurar que los archivos de migraciones .sql estén disponibles en runtime
RUN mkdir -p /app/dist/migrations /app/backups
COPY src/migrations /app/dist/migrations

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.js"]
