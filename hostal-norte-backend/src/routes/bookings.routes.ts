// ================================
// 📁 hostal-norte-backend/src/routes/bookings.routes.ts
// 🛤️ RUTAS DE RESERVAS - ORDEN CORREGIDO
// ================================

import { Router } from 'express';
import {
  createBooking,
  getBookingByReference,
  getAllBookings,
  updateBookingStatus,
  markWhatsAppSent
} from '../controllers/bookings.controller';

const router = Router();

// ================================
// 📊 RUTAS ESPECÍFICAS PRIMERO (ORDEN CRÍTICO)
// ================================

/**
 * GET /api/bookings/info
 * Información sobre los endpoints de reservas
 * ⚠️ DEBE IR ANTES de /:reference para evitar conflictos
 */
router.get('/info', (req, res) => {
  res.json({
    status: 'success',
    message: 'API de Reservas - Hostal Norte Armenia',
    version: '1.0.0',
    system_status: {
      bookings_api: 'ACTIVE',
      whatsapp_integration: 'READY',
      database: 'CONNECTED',
      endpoints_count: 6
    },
    endpoints: {
      info: {
        url: '/api/bookings/info',
        method: 'GET',
        description: 'Información del sistema de reservas'
      },
      create_booking: {
        url: '/api/bookings',
        method: 'POST',
        description: 'Crear nueva reserva',
        required_fields: ['roomId', 'checkInDate', 'checkOutDate', 'guests', 'guestInfo'],
        example_body: {
          roomId: '2',
          checkInDate: '2025-07-20',
          checkOutDate: '2025-07-22',
          guests: {
            adults: 2,
            children: 0,
            infants: 0,
            total: 2
          },
          guestInfo: {
            firstName: 'Ana',
            lastName: 'García',
            email: 'ana.garcia@email.com',
            phone: '+573123456789',
            documentType: 'cedula',
            documentNumber: '12345678'
          },
          specialRequests: 'Habitación silenciosa',
          estimatedArrivalTime: '16:00',
          purposeOfStay: 'vacation',
          isFirstTimeInArmenia: true
        }
      },
      get_booking: {
        url: '/api/bookings/:reference',
        method: 'GET',
        description: 'Obtener reserva por referencia',
        example: '/api/bookings/HNA-20250720-001'
      },
      list_bookings: {
        url: '/api/bookings',
        method: 'GET',
        description: 'Listar todas las reservas (Admin)',
        query_params: {
          status: 'pending | confirmed | cancelled | completed | expired',
          limit: 'number (default: 50)',
          offset: 'number (default: 0)'
        },
        example: '/api/bookings?status=pending&limit=10'
      },
      update_status: {
        url: '/api/bookings/:id/status',
        method: 'PUT',
        description: 'Actualizar estado de reserva (Admin)',
        example_body: {
          status: 'confirmed',
          paymentStatus: 'paid',
          notes: 'Pago confirmado por transferencia Nequi'
        }
      },
      mark_whatsapp_sent: {
        url: '/api/bookings/:reference/whatsapp-sent',
        method: 'POST',
        description: 'Marcar WhatsApp como enviado',
        example: '/api/bookings/HNA-20250720-001/whatsapp-sent'
      }
    },
    data_models: {
      booking_statuses: ['pending', 'confirmed', 'cancelled', 'completed', 'expired'],
      payment_statuses: ['pending', 'confirmed', 'paid', 'refunded'],
      document_types: ['cedula', 'passport', 'foreigner_card'],
      purpose_options: ['vacation', 'business', 'family', 'tourism', 'other']
    },
    whatsapp_workflow: {
      step_1: 'Usuario completa formulario de reserva en frontend',
      step_2: 'POST /api/bookings crea reserva con estado "pending"',
      step_3: 'Sistema genera mensaje WhatsApp automático',
      step_4: 'Frontend muestra botón "Confirmar vía WhatsApp"',
      step_5: 'Usuario hace clic → abre WhatsApp con mensaje pre-cargado',
      step_6: 'Host recibe mensaje y confirma/rechaza via WhatsApp',
      step_7: 'Admin actualiza estado usando PUT /api/bookings/:id/status',
      step_8: 'Sistema sincroniza disponibilidad automáticamente'
    },
    example_flow: {
      sample_reference: 'HNA-20250720-001',
      sample_whatsapp_message: '🏨 NUEVA RESERVA - HOSTAL NORTE ARMENIA\n📋 Referencia: HNA-20250720-001\n👤 Huésped: Ana García...',
      price_calculation_example: {
        room_base_price: 120000,
        nights: 2,
        subtotal: 240000,
        iva_19_percent: 45600,
        total: 285600,
        currency: 'COP'
      }
    },
    database_tables: {
      bookings: 'Tabla principal de reservas con 29 columnas',
      rooms: 'Habitaciones disponibles (5 activas)',
      room_availability: 'Control de disponibilidad por fecha'
    },
    contact_support: {
      whatsapp: '+573137065373',
      email: 'reservas@hostalnortearmenia.com'
    }
  });
});

/**
 * GET /api/bookings/stats
 * Estadísticas del sistema de reservas
 */
router.get('/stats', async (req, res) => {
  try {
    const { executeQuery } = await import('../config/database');
    
    // Obtener estadísticas básicas
    const statsQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_bookings,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as week_bookings
      FROM bookings
    `;
    
    const result = await executeQuery(statsQuery);
    const stats = result.rows[0];
    
    res.json({
      status: 'success',
      message: 'Estadísticas del sistema de reservas',
      data: {
        total_bookings: parseInt(stats.total_bookings),
        by_status: {
          pending: parseInt(stats.pending_count),
          confirmed: parseInt(stats.confirmed_count),
          cancelled: parseInt(stats.cancelled_count),
          completed: parseInt(stats.completed_count)
        },
        recent_activity: {
          today: parseInt(stats.today_bookings),
          this_week: parseInt(stats.week_bookings)
        },
        last_updated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error getting booking stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error obteniendo estadísticas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// ================================
// 📋 RUTAS PRINCIPALES DE RESERVAS
// ================================

/**
 * POST /api/bookings
 * Crear nueva reserva
 */
router.post('/', createBooking);

/**
 * GET /api/bookings
 * Obtener todas las reservas (ADMIN)
 * ⚠️ DEBE IR ANTES de /:reference para que funcione sin query params
 */
router.get('/', (req, res, next) => {
  // Si tiene query params o es una request explícita, manejar como getAllBookings
  if (Object.keys(req.query).length > 0 || req.path === '/') {
    return getAllBookings(req, res);
  }
  // Si no, continuar con el siguiente handler
  next();
});

/**
 * GET /api/bookings/:reference
 * Obtener reserva por referencia
 * ⚠️ DEBE IR DESPUÉS de las rutas específicas (/info, /stats)
 */
router.get('/:reference', getBookingByReference);

/**
 * PUT /api/bookings/:id/status
 * Actualizar estado de reserva (ADMIN)
 */
router.put('/:id/status', updateBookingStatus);

/**
 * POST /api/bookings/:reference/whatsapp-sent
 * Marcar WhatsApp como enviado
 */
router.post('/:reference/whatsapp-sent', markWhatsAppSent);

// ================================
// 🚫 MANEJO DE RUTAS NO ENCONTRADAS
// ================================
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint de reservas no encontrado',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /api/bookings/info',
      'GET /api/bookings/stats',
      'POST /api/bookings',
      'GET /api/bookings',
      'GET /api/bookings/:reference',
      'PUT /api/bookings/:id/status',
      'POST /api/bookings/:reference/whatsapp-sent'
    ],
    tip: 'Usa GET /api/bookings/info para ver la documentación completa'
  });
});

export default router;