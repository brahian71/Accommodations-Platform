// ================================
// 📁 hostal-norte-backend/src/routes/availability.routes.ts
// 🛤️ RUTAS DE DISPONIBILIDAD - ENDPOINTS PARA CALENDARIO
// ================================

import { Router } from 'express';
import {
  getRoomAvailability,
  getCalendarMonth,
  validateDateRange
} from '../controllers/availability.controller';

const router = Router();

// ================================
// 📅 RUTAS DE DISPONIBILIDAD
// ================================

/**
 * GET /api/availability/rooms/:roomId
 * Obtener disponibilidad de una habitación en un rango de fechas
 * 
 * Parámetros:
 * - roomId: ID de la habitación
 * 
 * Query parameters:
 * - start_date: Fecha de inicio (YYYY-MM-DD)
 * - end_date: Fecha de fin (YYYY-MM-DD)
 * 
 * Ejemplo: /api/availability/rooms/1?start_date=2025-07-15&end_date=2025-07-25
 */
router.get('/rooms/:roomId', getRoomAvailability);

/**
 * GET /api/availability/rooms/:roomId/calendar/:year/:month
 * Obtener calendario mensual de una habitación
 * 
 * Parámetros:
 * - roomId: ID de la habitación
 * - year: Año (YYYY)
 * - month: Mes (1-12)
 * 
 * Ejemplo: /api/availability/rooms/1/calendar/2025/7
 */
router.get('/rooms/:roomId/calendar/:year/:month', getCalendarMonth);

/**
 * GET /api/availability/rooms/:roomId/validate
 * Validar si un rango de fechas está disponible para booking
 * 
 * Parámetros:
 * - roomId: ID de la habitación
 * 
 * Query parameters:
 * - check_in_date: Fecha de llegada (YYYY-MM-DD)
 * - check_out_date: Fecha de salida (YYYY-MM-DD)
 * 
 * Ejemplo: /api/availability/rooms/1/validate?check_in_date=2025-07-15&check_out_date=2025-07-17
 */
router.get('/rooms/:roomId/validate', validateDateRange);

// ================================
// 📊 RUTA DE INFORMACIÓN DE LA API
// ================================

/**
 * GET /api/availability
 * Información sobre los endpoints de disponibilidad
 */
router.get('/', (req, res) => {
  res.json({
    message: 'API de Disponibilidad - Hostal Norte Armenia',
    version: '1.0.0',
    endpoints: {
      room_availability: {
        url: '/api/availability/rooms/:roomId',
        method: 'GET',
        description: 'Obtener disponibilidad de una habitación en un rango de fechas',
        parameters: {
          roomId: 'ID de la habitación (path parameter)',
          start_date: 'Fecha de inicio YYYY-MM-DD (query parameter)',
          end_date: 'Fecha de fin YYYY-MM-DD (query parameter)'
        },
        example: '/api/availability/rooms/1?start_date=2025-07-15&end_date=2025-07-25'
      },
      calendar_month: {
        url: '/api/availability/rooms/:roomId/calendar/:year/:month',
        method: 'GET',
        description: 'Obtener calendario mensual de una habitación',
        parameters: {
          roomId: 'ID de la habitación',
          year: 'Año (YYYY)',
          month: 'Mes (1-12)'
        },
        example: '/api/availability/rooms/1/calendar/2025/7'
      },
      validate_dates: {
        url: '/api/availability/rooms/:roomId/validate',
        method: 'GET',
        description: 'Validar disponibilidad para un booking',
        parameters: {
          roomId: 'ID de la habitación (path parameter)',
          check_in_date: 'Fecha de llegada YYYY-MM-DD (query parameter)',
          check_out_date: 'Fecha de salida YYYY-MM-DD (query parameter)'
        },
        example: '/api/availability/rooms/1/validate?check_in_date=2025-07-15&check_out_date=2025-07-17'
      }
    },
    room_ids_available: [1, 2, 3, 4, 5],
    date_format: 'YYYY-MM-DD',
    timezone: 'America/Bogota'
  });
});

// ================================
// 🚫 MANEJO DE RUTAS NO ENCONTRADAS
// ================================
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint de disponibilidad no encontrado',
    path: req.originalUrl,
    available_endpoints: [
      'GET /api/availability/',
      'GET /api/availability/rooms/:roomId',
      'GET /api/availability/rooms/:roomId/calendar/:year/:month',
      'GET /api/availability/rooms/:roomId/validate'
    ]
  });
});

export default router;