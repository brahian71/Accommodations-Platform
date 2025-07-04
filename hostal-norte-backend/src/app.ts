import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { testConnection, closePool } from './config/database';

// Configuración de variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// 🔒 MIDDLEWARE DE SEGURIDAD
// ================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ================================
// 📝 LOGGING
// ================================
app.use(morgan('combined'));

// ================================
// 🌐 CORS - Permitir requests desde Angular
// ================================
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// ================================
// 📦 PARSERS
// ================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================================
// 🏠 RUTAS PRINCIPALES
// ================================

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hostal Norte Armenia Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta de información del API
app.get('/api', (req, res) => {
  res.json({
    message: 'Hostal Norte Armenia API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      rooms: '/api/rooms',
      bookings: '/api/bookings',
      establishment: '/api/establishment'
    },
    documentation: 'En desarrollo'
  });
});

// ================================
// 🗄️ RUTAS DE PRUEBA CON POSTGRESQL
// ================================

// Endpoint de prueba para verificar conexión a BD
app.get('/api/test-db', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    if (dbConnected) {
      res.json({
        status: 'success',
        message: 'Conexión a PostgreSQL exitosa',
        database: process.env.DB_NAME
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'No se pudo conectar a PostgreSQL'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error probando conexión a base de datos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint de prueba para obtener habitaciones (básico)
app.get('/api/rooms', async (req, res) => {
  try {
    const { executeQuery } = await import('./config/database');
    const result = await executeQuery('SELECT id, room_number, name, base_price FROM rooms ORDER BY room_number');
    
    res.json({
      status: 'success',
      message: 'Habitaciones obtenidas exitosamente',
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error obteniendo habitaciones:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error obteniendo habitaciones',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// ================================
// 🚫 MANEJO DE RUTAS NO ENCONTRADAS
// ================================
app.use('*', (req, res) => {
  res.status(404).json({ 
    status: 'error',
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: ['/health', '/api', '/api/test-db', '/api/rooms']
  });
});

// ================================
// 🛠️ MANEJO GLOBAL DE ERRORES
// ================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// ================================
// 🚀 INICIAR SERVIDOR
// ================================
const startServer = async () => {
  try {
    console.log('🔄 Iniciando Hostal Norte Armenia Backend...');
    
    // Probar conexión a base de datos
    console.log('🗄️ Probando conexión a PostgreSQL...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos. Verifique la configuración en .env');
      process.exit(1);
    }

    // Iniciar servidor HTTP
    const server = app.listen(PORT, () => {
      console.log('\n🎉 ¡Servidor iniciado exitosamente!');
      console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🏠 API Info: http://localhost:${PORT}/api`);
      console.log(`🗄️ Test DB: http://localhost:${PORT}/api/test-db`);
      console.log(`🛏️ Habitaciones: http://localhost:${PORT}/api/rooms`);
      console.log(`📅 Iniciado: ${new Date().toLocaleString('es-CO')}`);
      console.log('🛑 Para detener: Ctrl+C\n');
    });

    // Manejo de cierre limpio
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor...`);
      
      server.close(async () => {
        console.log('🔒 Servidor HTTP cerrado');
        await closePool();
        console.log('✅ Cierre limpio completado');
        process.exit(0);
      });
    };

    // Escuchar señales de cierre
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
startServer();