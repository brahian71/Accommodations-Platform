// ================================
// 📁 hostal-norte-backend/src/controllers/availability.controller.ts
// 🎯 CONTROLLER DE DISPONIBILIDAD - REEMPLAZA MOCK DATA
// ================================

import { Request, Response } from 'express';
import { executeQuery } from '../config/database';

// ================================
// 🗂️ TYPES & INTERFACES
// ================================

interface AvailabilityQuery {
  room_id: number;
  start_date: string;
  end_date: string;
}

interface DayAvailability {
  date: string;
  room_id: number;
  is_available: boolean;
  is_blocked: boolean;
  is_booked: boolean;
  price_override?: number;
  minimum_stay_override?: number;
  notes?: string;
  reason?: string;
}

interface CalendarMonth {
  year: number;
  month: number;
  room_id: number;
  days: DayAvailability[];
  stats: {
    total_days: number;
    available_days: number;
    blocked_days: number;
    booked_days: number;
  };
}

// ================================
// 📅 OBTENER DISPONIBILIDAD POR RANGO
// ================================

export const getRoomAvailability = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { start_date, end_date } = req.query;

    // Validaciones básicas
    if (!roomId || !start_date || !end_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Se requieren roomId, start_date y end_date',
        required: {
          roomId: 'Parámetro en URL',
          start_date: 'Query parameter (YYYY-MM-DD)',
          end_date: 'Query parameter (YYYY-MM-DD)'
        }
      });
    }

    // Verificar que la habitación existe
    const roomExists = await executeQuery(
      'SELECT id, name FROM rooms WHERE id = $1 AND is_active = true',
      [roomId]
    );

    if (roomExists.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Habitación con ID ${roomId} no encontrada o inactiva`
      });
    }

    // Obtener disponibilidad del rango solicitado
    const availabilityQuery = `
      WITH date_range AS (
        SELECT generate_series(
          $2::date, 
          $3::date, 
          '1 day'::interval
        )::date AS date
      ),
      room_availability_data AS (
        SELECT 
          dr.date,
          ra.room_id,
          COALESCE(ra.is_available, true) as is_available,
          COALESCE(ra.is_blocked, false) as is_blocked,
          COALESCE(ra.is_booked, false) as is_booked,
          ra.price_override,
          ra.minimum_stay_override,
          ra.notes,
          ra.reason,
          ra.created_at,
          ra.updated_at
        FROM date_range dr
        LEFT JOIN room_availability ra ON dr.date = ra.date AND ra.room_id = $1
      )
      SELECT 
        date,
        COALESCE(room_id, $1::integer) as room_id,
        is_available,
        is_blocked,
        is_booked,
        price_override,
        minimum_stay_override,
        notes,
        reason,
        CASE 
          WHEN date < CURRENT_DATE THEN false
          ELSE is_available
        END as final_availability
      FROM room_availability_data
      ORDER BY date;
    `;

    const result = await executeQuery(availabilityQuery, [roomId, start_date, end_date]);

    // Formatear respuesta
    const availability: DayAvailability[] = result.rows.map((row: any) => ({
      date: row.date.toISOString().split('T')[0],
      room_id: parseInt(row.room_id),
      is_available: row.final_availability && !row.is_blocked && !row.is_booked,
      is_blocked: row.is_blocked,
      is_booked: row.is_booked,
      price_override: row.price_override ? parseFloat(row.price_override) : null,
      minimum_stay_override: row.minimum_stay_override,
      notes: row.notes,
      reason: row.reason
    }));

    res.json({
      status: 'success',
      message: 'Disponibilidad obtenida exitosamente',
      data: {
        room_id: parseInt(roomId),
        room_name: roomExists.rows[0].name,
        period: {
          start_date: start_date as string,
          end_date: end_date as string,
          total_days: availability.length
        },
        availability,
        stats: {
          total_days: availability.length,
          available_days: availability.filter(d => d.is_available).length,
          blocked_days: availability.filter(d => d.is_blocked).length,
          booked_days: availability.filter(d => d.is_booked).length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo disponibilidad:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno obteniendo disponibilidad',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Error interno'
    });
  }
};

// ================================
// 🗓️ OBTENER CALENDARIO MENSUAL
// ================================

export const getCalendarMonth = async (req: Request, res: Response) => {
  try {
    const { roomId, year, month } = req.params;

    // Validaciones
    if (!roomId || !year || !month) {
      return res.status(400).json({
        status: 'error',
        message: 'Se requieren roomId, year y month',
        example: '/api/availability/rooms/1/calendar/2025/7'
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        status: 'error',
        message: 'El mes debe estar entre 1 y 12'
      });
    }

    // Verificar que la habitación existe
    const roomExists = await executeQuery(
      'SELECT id, name FROM rooms WHERE id = $1 AND is_active = true',
      [roomId]
    );

    if (roomExists.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Habitación con ID ${roomId} no encontrada o inactiva`
      });
    }

    // Calcular primer y último día del mes
    const firstDay = new Date(yearNum, monthNum - 1, 1);
    const lastDay = new Date(yearNum, monthNum, 0);
    
    const start_date = firstDay.toISOString().split('T')[0];
    const end_date = lastDay.toISOString().split('T')[0];

    // Obtener disponibilidad del mes usando la misma lógica
    const availabilityQuery = `
      WITH date_range AS (
        SELECT generate_series(
          $2::date, 
          $3::date, 
          '1 day'::interval
        )::date AS date
      ),
      room_availability_data AS (
        SELECT 
          dr.date,
          ra.room_id,
          COALESCE(ra.is_available, true) as is_available,
          COALESCE(ra.is_blocked, false) as is_blocked,
          COALESCE(ra.is_booked, false) as is_booked,
          ra.price_override,
          ra.minimum_stay_override,
          ra.notes,
          ra.reason
        FROM date_range dr
        LEFT JOIN room_availability ra ON dr.date = ra.date AND ra.room_id = $1
      )
      SELECT 
        date,
        COALESCE(room_id, $1::integer) as room_id,
        is_available,
        is_blocked,
        is_booked,
        price_override,
        minimum_stay_override,
        notes,
        reason,
        CASE 
          WHEN date < CURRENT_DATE THEN false
          ELSE is_available
        END as final_availability
      FROM room_availability_data
      ORDER BY date;
    `;

    const result = await executeQuery(availabilityQuery, [roomId, start_date, end_date]);

    // Formatear disponibilidad
    const availability: DayAvailability[] = result.rows.map((row: any) => ({
      date: row.date.toISOString().split('T')[0],
      room_id: parseInt(row.room_id),
      is_available: row.final_availability && !row.is_blocked && !row.is_booked,
      is_blocked: row.is_blocked,
      is_booked: row.is_booked,
      price_override: row.price_override ? parseFloat(row.price_override) : null,
      minimum_stay_override: row.minimum_stay_override,
      notes: row.notes,
      reason: row.reason
    }));

    // Calcular estadísticas
    const stats = {
      total_days: availability.length,
      available_days: availability.filter(d => d.is_available).length,
      blocked_days: availability.filter(d => d.is_blocked).length,
      booked_days: availability.filter(d => d.is_booked).length
    };

    // Formatear como calendario mensual
    const calendarData: CalendarMonth = {
      year: yearNum,
      month: monthNum,
      room_id: parseInt(roomId),
      days: availability,
      stats
    };

    res.json({
      status: 'success',
      message: `Calendario de ${getMonthName(monthNum)} ${yearNum} obtenido exitosamente`,
      data: calendarData
    });

  } catch (error) {
    console.error('❌ Error obteniendo calendario:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno obteniendo calendario',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Error interno'
    });
  }
};

// ================================
// ✅ VALIDAR RANGO DE FECHAS PARA BOOKING
// ================================

export const validateDateRange = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { check_in_date, check_out_date } = req.query;

    if (!roomId || !check_in_date || !check_out_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Se requieren roomId, check_in_date y check_out_date'
      });
    }

    // Verificar que la habitación existe
    const roomExists = await executeQuery(
      'SELECT id, name FROM rooms WHERE id = $1 AND is_active = true',
      [roomId]
    );

    if (roomExists.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Habitación con ID ${roomId} no encontrada o inactiva`
      });
    }

    // Obtener disponibilidad del rango (excluyendo el día de salida)
    const checkInDate = new Date(check_in_date as string);
    const checkOutDate = new Date(check_out_date as string);
    const adjustedCheckOut = new Date(checkOutDate);
    adjustedCheckOut.setDate(adjustedCheckOut.getDate() - 1);
    
    const start_date = checkInDate.toISOString().split('T')[0];
    const end_date = adjustedCheckOut.toISOString().split('T')[0];

    // Usar la misma query de disponibilidad
    const availabilityQuery = `
      WITH date_range AS (
        SELECT generate_series(
          $2::date, 
          $3::date, 
          '1 day'::interval
        )::date AS date
      ),
      room_availability_data AS (
        SELECT 
          dr.date,
          ra.room_id,
          COALESCE(ra.is_available, true) as is_available,
          COALESCE(ra.is_blocked, false) as is_blocked,
          COALESCE(ra.is_booked, false) as is_booked,
          ra.notes,
          ra.reason
        FROM date_range dr
        LEFT JOIN room_availability ra ON dr.date = ra.date AND ra.room_id = $1
      )
      SELECT 
        date,
        is_available,
        is_blocked,
        is_booked,
        reason,
        CASE 
          WHEN date < CURRENT_DATE THEN false
          ELSE is_available
        END as final_availability
      FROM room_availability_data
      ORDER BY date;
    `;

    const result = await executeQuery(availabilityQuery, [roomId, start_date, end_date]);

    // Verificar disponibilidad
    const availability = result.rows.map((row: any) => ({
      date: row.date.toISOString().split('T')[0],
      is_available: row.final_availability && !row.is_blocked && !row.is_booked,
      is_blocked: row.is_blocked,
      is_booked: row.is_booked,
      reason: row.reason
    }));

    const unavailableDays = availability.filter((day: any) => !day.is_available);
    const isValid = unavailableDays.length === 0;

    // Calcular noches
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      status: 'success',
      message: isValid ? 'Rango de fechas válido' : 'Rango de fechas no disponible',
      data: {
        is_valid: isValid,
        room_id: parseInt(roomId),
        room_name: roomExists.rows[0].name,
        check_in_date: check_in_date as string,
        check_out_date: check_out_date as string,
        nights,
        unavailable_days: unavailableDays.map((day: any) => ({
          date: day.date,
          reason: day.is_blocked ? 'blocked' : day.is_booked ? 'booked' : 'unavailable'
        })),
        errors: unavailableDays.map((day: any) => ({
          code: day.is_blocked ? 'BLOCKED' : day.is_booked ? 'BOOKED' : 'UNAVAILABLE',
          message: `${day.date} no está disponible`,
          date: day.date
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error validando rango de fechas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno validando fechas',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Error interno'
    });
  }
};

// ================================
// 🛠️ FUNCIONES AUXILIARES
// ================================

const getMonthName = (month: number): string => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[month - 1] || 'Mes desconocido';
};

// ================================
// 🎯 EXPORTS
// ================================

export default {
  getRoomAvailability,
  getCalendarMonth,
  validateDateRange
};