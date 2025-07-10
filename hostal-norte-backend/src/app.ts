// 📁 hostal-norte-backend/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { testConnection, closePool } from './config/database';
import availabilityRoutes from './routes/availability.routes';
import establishmentRoutes from './routes/establishment.routes';
import bookingsRoutes from './routes/bookings.routes';

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
// 🌐 CORS
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
// 🏥 HEALTH CHECK
// ================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hostal Norte Armenia Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ================================
// 📋 API INFO
// ================================
app.get('/api', (req, res) => {
  res.json({
    message: 'Hostal Norte Armenia API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      rooms: '/api/rooms',
      availability: '/api/availability',
      bookings: '/api/bookings',
      establishment: '/api/establishment'
    },
    features: {
      availability_system: 'Sistema de disponibilidad en tiempo real',
      calendar_api: 'API de calendario mensual para habitaciones',
      date_validation: 'Validación de rangos de fechas para reservas',
      real_database: 'Datos reales desde PostgreSQL'
    },
    documentation: 'En desarrollo'
  });
});

// ================================
// 🧪 DATABASE TEST
// ================================
app.get('/api/test-db', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    if (dbConnected) {
      res.json({
        status: 'success',
        message: 'Conexión a PostgreSQL exitosa',
        database: process.env.DB_NAME,
        tables_available: ['rooms', 'room_availability', 'bookings', 'establishment']
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

// ================================
// 🛏️ ROOMS ENDPOINT
// ================================
app.get('/api/rooms', async (req, res) => {
  try {
    const { executeQuery } = await import('./config/database');
    const result = await executeQuery(`
      SELECT 
        id, 
        room_number, 
        name, 
        room_type,
        base_price,
        max_guests,
        area,
        floor,
        bathroom_type,
        has_window,
        window_view,
        is_active,
        is_available,
        amenities,
        features,
        images,
        created_at,
        updated_at
      FROM rooms 
      WHERE is_active = true
      ORDER BY room_number
    `);
    
    res.json({
      status: 'success',
      message: 'Habitaciones obtenidas exitosamente',
      data: result.rows,
      count: result.rows.length,
      meta: {
        total_rooms: result.rows.length,
        active_rooms: result.rows.filter((r: any) => r.is_available).length,
        room_types: [...new Set(result.rows.map((r: any) => r.room_type))]
      }
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
// 🛤️ ROUTES REGISTRATION
// ================================

// ✅ RUTAS ESPECIALIZADAS - EN ORDEN DE PRIORIDAD
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/establishment', establishmentRoutes); // ← AHORA FUNCIONARÁ CORRECTAMENTE

// ================================
// 🚫 404 HANDLER
// ================================
app.use('*', (req, res) => {
  res.status(404).json({ 
    status: 'error',
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'GET /api/test-db',
      'GET /api/rooms',
      'GET /api/establishment',
      'GET /api/availability',
      'GET /api/availability/rooms/:roomId',
      'GET /api/availability/rooms/:roomId/calendar/:year/:month',
      'GET /api/availability/rooms/:roomId/validate',
      'GET /api/bookings',
      'POST /api/bookings'
    ]
  });
});

// ================================
// 🚨 ERROR HANDLER
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
// 🚀 SERVER STARTUP
// ================================
const startServer = async () => {
  try {
    console.log('🔄 Iniciando Hostal Norte Armenia Backend...');

    console.log('🗄️ Probando conexión a PostgreSQL...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos. Verifique la configuración en .env');
      process.exit(1);
    }

    const server = app.listen(PORT, () => {
      console.log('\n🎉 ¡Servidor iniciado exitosamente!');
      console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🏠 API Info: http://localhost:${PORT}/api`);
      console.log(`🗄️ Test DB: http://localhost:${PORT}/api/test-db`);
      console.log(`🛏️ Habitaciones: http://localhost:${PORT}/api/rooms`);
      console.log(`🏨 Establecimiento: http://localhost:${PORT}/api/establishment`);
      console.log('\n🔥 ¡ENDPOINTS ESPECIALIZADOS!');
      console.log(`📅 Availability API: http://localhost:${PORT}/api/availability`);
      console.log(`📊 Calendario Hab. 1: http://localhost:${PORT}/api/availability/rooms/1/calendar/2025/7`);
      console.log(`✅ Validar fechas: http://localhost:${PORT}/api/availability/rooms/1/validate?check_in_date=2025-07-15&check_out_date=2025-07-17`);
      console.log(`📋 Bookings: http://localhost:${PORT}/api/bookings`);
      console.log(`📅 Iniciado: ${new Date().toLocaleString('es-CO')}`);
      console.log('🛑 Para detener: Ctrl+C\n');
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor...`);
      
      server.close(async () => {
        console.log('🔒 Servidor HTTP cerrado');
        await closePool();
        console.log('✅ Cierre limpio completado');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

startServer();