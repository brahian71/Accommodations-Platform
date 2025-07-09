// 📁 hostal-norte-backend/src/app.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { testConnection, closePool } from './config/database';
import availabilityRoutes from './routes/availability.routes';

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

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hostal Norte Armenia Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Hostal Norte Armenia API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      rooms: '/api/rooms',
      availability: '/api/availability',
      bookings: '/api/bookings (próximamente)',
      establishment: '/api/establishment (próximamente)'
    },
    new_features: {
      availability_system: 'Sistema de disponibilidad en tiempo real',
      calendar_api: 'API de calendario mensual para habitaciones',
      date_validation: 'Validación de rangos de fechas para reservas'
    },
    documentation: 'En desarrollo'
  });
});

// ================================
// 🗄️ RUTAS CON POSTGRESQL
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

// ✅ ENDPOINT MEJORADO: Habitaciones con más información
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

// ✅ ENDPOINT: Información del establecimiento
// ✅ REEMPLAZAR POR ESTA VERSIÓN SIMPLIFICADA:
app.get('/api/establishment', async (req, res) => {
  try {
    console.log('📡 Establishment endpoint called - returning default data');
    
    // ✅ SIEMPRE DEVOLVER DATOS POR DEFECTO (no consultar BD)
    // Esto elimina todos los errores de columnas faltantes
    const establishmentData = {
      id: 1,
      name: 'Hostal Norte Armenia',
      description: 'Acogedor hostal ubicado en el corazón del norte de Armenia, Quindío. Ofrecemos habitaciones cómodas y un ambiente familiar para que disfrutes de tu estadía en el Eje Cafetero.',
      tagline: 'Tu hogar en el corazón del Quindío',
      address: 'Carrera 15 #25-30, Norte Centro, Armenia, Quindío, Colombia',
      coordinates: { 
        lat: 4.5339, 
        lng: -75.6811 
      },
      contact_info: {
        phone: '+573137065373',
        whatsapp: '+573137065373',
        email: 'reservas@hostalnortearmenia.com',
        website: 'www.hostalnortearmenia.com',
        socialMedia: {
          instagram: '@hostalnortearmenia',
          facebook: 'HostalNorteArmenia'
        }
      },
      host_info: {
        name: 'María González',
        photo: 'https://images.unsplash.com/photo-1494790108755-2616b612e886?w=150&h=150&fit=crop&crop=face',
        description: 'Anfitriona experimentada con más de 8 años en hospitalidad. Me encanta ayudar a los huéspedes a descubrir lo mejor del Quindío.',
        responseTime: 'Menos de una hora',
        languages: ['Español', 'Inglés básico'],
        verifiedHost: true
      },
      amenities: [
        'wifi-gratis',
        'parqueadero',
        'cocina-compartida', 
        'sala-comun',
        'terraza',
        'lavanderia',
        'recepcion-24h',
        'vigilancia',
        'zona-bbq',
        'jardin'
      ],
      services: [
        'limpieza-diaria',
        'transporte-aeropuerto',
        'informacion-turistica',
        'custodia-equipaje',
        'tour-booking',
        'servicio-lavanderia',
        'desayuno-opcional'
      ],
      policies: {
        checkInTime: '15:00',
        checkOutTime: '11:00',
        cancellationPolicy: 'flexible',
        houseRules: [
          'No fumar en habitaciones',
          'Respeto por otros huéspedes', 
          'No mascotas',
          'No fiestas en habitaciones',
          'Silencio después de las 10:00 PM'
        ],
        smokingAllowed: false,
        petsAllowed: false,
        partiesAllowed: false,
        minimumAge: 18,
        identificationRequired: true
      },
      area_info: {
        neighborhood: 'Norte Centro, Armenia',
        nearbyPlaces: [
          'Centro Comercial Portal del Quindío (8 min caminando)',
          'Clínica La Sagrada Familia (5 min caminando)',
          'Universidad del Quindío (12 min caminando)',
          'Parque Los Fundadores (10 min caminando)',
          'Terminal de Transporte (15 min en taxi)',
          'Aeropuerto El Edén (25 min en taxi)'
        ],
        transportAccess: [
          'Bus urbano líneas 1, 2, 3 y 7',
          'Taxi disponible 24 horas',
          'Cerca de rutas principales',
          'Acceso directo desde centro de Armenia'
        ],
        walkingDistances: {
          'Centro Comercial Portal del Quindío': '8 min',
          'Parque Los Fundadores': '10 min', 
          'Centro de Armenia': '12 min',
          'Clínica La Sagrada Familia': '5 min',
          'Universidad del Quindío': '12 min'
        },
        nearbyAttractions: [
          'Parque Nacional del Café',
          'Valle de Cocora',
          'Salento',
          'Filandia', 
          'Panaca',
          'Recuca'
        ]
      },
      images: {
        main: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
        gallery: [
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop'
        ],
        exterior: [
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop'
        ],
        commonAreas: [
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop'
        ]
      },
      stats: {
        totalRooms: 5,
        totalCapacity: 12,
        averageRating: 4.8,
        totalReviews: 543,
        yearsOperating: 3,
        occupancyRate: 78,
        responseRate: 100,
        acceptanceRate: 95
      },
      certifications: [
        'Registro Nacional de Turismo',
        'Certificado de Bioseguridad COVID-19',
        'Certificado de Calidad Turística'
      ],
      is_active: true,
      is_verified: true,
      establishment_type: 'hostal',
      created_at: '2022-01-15T00:00:00.000Z',
      updated_at: new Date().toISOString()
    };

    res.json({
      status: 'success',
      message: 'Información del establecimiento obtenida exitosamente',
      data: establishmentData,
      source: 'default_data',
      note: 'Datos por defecto mientras se configura la base de datos'
    });

  } catch (error) {
    console.error('❌ Error en endpoint establishment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.use('/api/availability', availabilityRoutes);

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
      'GET /api/rooms/:id',
      'GET /api/availability',
      'GET /api/availability/rooms/:roomId',
      'GET /api/availability/rooms/:roomId/calendar/:year/:month',
      'GET /api/availability/rooms/:roomId/validate'
    ]
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

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
      console.log('\n🔥 ¡NUEVOS ENDPOINTS DE DISPONIBILIDAD!');
      console.log(`📅 Availability API: http://localhost:${PORT}/api/availability`);
      console.log(`📊 Calendario Hab. 1: http://localhost:${PORT}/api/availability/rooms/1/calendar/2025/7`);
      console.log(`✅ Validar fechas: http://localhost:${PORT}/api/availability/rooms/1/validate?check_in_date=2025-07-15&check_out_date=2025-07-17`);
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