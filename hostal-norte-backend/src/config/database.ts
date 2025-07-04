// Debug temporal para src/config/database.ts
// Reemplaza TEMPORALMENTE tu archivo src/config/database.ts con este código

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// 🔍 DEBUG: Verificar variables de entorno
console.log('🔍 DEBUG - Variables de entorno:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD?.length);

// Configuración del pool de conexiones PostgreSQL
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hostal_norte_armenia',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345', // Fallback con tu contraseña
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test de conexión a la base de datos
export const testConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 DEBUG - Intentando conectar con:');
    console.log('Host:', process.env.DB_HOST || 'localhost');
    console.log('Port:', parseInt(process.env.DB_PORT || '5432'));
    console.log('Database:', process.env.DB_NAME || 'hostal_norte_armenia');
    console.log('User:', process.env.DB_USER || 'postgres');
    console.log('Password length:', (process.env.DB_PASSWORD || '12345').length);
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    client.release();
    
    console.log('✅ Conexión a PostgreSQL exitosa');
    console.log(`📅 Hora del servidor: ${result.rows[0].current_time}`);
    console.log(`🗄️ Versión PostgreSQL: ${result.rows[0].pg_version.split(' ')[0]}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error);
    return false;
  }
};

// Query helper para ejecutar consultas con manejo de errores
export const executeQuery = async (query: string, params: any[] = []): Promise<any> => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    console.error('❌ Error ejecutando query:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Cerrar pool de conexiones (para shutdown limpio)
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('🔒 Pool de conexiones PostgreSQL cerrado');
  } catch (error) {
    console.error('❌ Error cerrando pool:', error);
  }
};