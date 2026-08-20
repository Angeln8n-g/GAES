import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const shouldEnableSSL = () => {
  if (process.env.DB_SSL === 'true' || process.env.DB_SSL === '1') {
    return { rejectUnauthorized: false };
  }
  if (process.env.DB_SSL === 'false' || process.env.DB_SSL === '0') {
    return false;
  }
  if (connectionString) {
    if (
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('@postgres:') ||
      connectionString.includes('sslmode=disable')
    ) {
      return false;
    }
    if (connectionString.includes('sslmode=require') || connectionString.includes('ssl=true')) {
      return { rejectUnauthorized: false };
    }
  }
  return false;
};

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: shouldEnableSSL()
      }
    : {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'capacitahub_db',
        ssl: shouldEnableSSL()
      }
);

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});
