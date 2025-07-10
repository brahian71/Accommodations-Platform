// ================================
// 📁 hostal-norte-backend/src/controllers/bookings.controller.ts
// 🎯 CONTROLLER COMPLETO DE RESERVAS
// ================================

import { Request, Response } from 'express';
import { executeQuery } from '../config/database';

// ================================
// 🗂️ TYPES & INTERFACES
// ================================

interface BookingRequest {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: {
    adults: number;
    children: number;
    infants: number;
    total: number;
  };
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    documentType?: string;
    documentNumber?: string;
  };
  specialRequests?: string;
  estimatedArrivalTime?: string;
  purposeOfStay?: string;
  isFirstTimeInArmenia?: boolean;
  hostWhatsapp?: string;
  hostName?: string;
}

interface PriceBreakdown {
  basePrice: number;
  nights: number;
  subtotal: number;
  iva: {
    percentage: number;
    amount: number;
  };
  total: number;
  currency: string;
}

// ================================
// 📋 CREAR NUEVA RESERVA
// ================================

export const createBooking = async (req: Request, res: Response) => {
  try {
    console.log('📝 Creating new booking:', req.body);
    
    const bookingData: BookingRequest = req.body;
    
    // 1. ✅ VALIDAR DATOS BÁSICOS
    const validation = validateBookingData(bookingData);
    if (!validation.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de reserva inválidos',
        errors: validation.errors
      });
    }
    
    // 2. ✅ VERIFICAR QUE LA HABITACIÓN EXISTE
    const roomExists = await executeQuery(
      'SELECT id, name, base_price FROM rooms WHERE id = $1 AND is_active = true',
      [bookingData.roomId]
    );
    
    if (roomExists.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Habitación ${bookingData.roomId} no encontrada o inactiva`
      });
    }
    
    const room = roomExists.rows[0];
    
    // 3. ✅ VALIDAR DISPONIBILIDAD (usando nuestro sistema existente)
    const isAvailable = await validateRoomAvailability(
      bookingData.roomId,
      bookingData.checkInDate,
      bookingData.checkOutDate
    );
    
    if (!isAvailable.isValid) {
      return res.status(409).json({
        status: 'error',
        message: 'Las fechas seleccionadas no están disponibles',
        details: isAvailable.errors,
        code: 'DATES_NOT_AVAILABLE'
      });
    }
    
    // 4. ✅ GENERAR REFERENCIA ÚNICA
    const bookingReference = generateBookingReference();
    
    // 5. ✅ CALCULAR PRECIOS
    const nights = calculateNights(bookingData.checkInDate, bookingData.checkOutDate);
    const priceBreakdown = calculatePriceBreakdown(room.base_price, nights);
    
    // 6. ✅ CREAR RESERVA EN BD
    const createQuery = `
      INSERT INTO bookings (
        booking_reference, room_id, status, payment_status,
        check_in_date, check_out_date, nights,
        total_guests, adults, children, infants,
        guest_info, price_breakdown,
        host_name, host_whatsapp, host_email,
        special_requests, estimated_arrival_time, purpose_of_stay,
        is_first_time_armenia, whatsapp_message_sent,
        created_at, updated_at
      ) VALUES (
        $1, $2, 'pending', 'pending',
        $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        $18, false,
        NOW(), NOW()
      ) RETURNING *
    `;
    
    const createResult = await executeQuery(createQuery, [
      bookingReference,
      bookingData.roomId,
      bookingData.checkInDate,
      bookingData.checkOutDate,
      nights,
      bookingData.guests.total,
      bookingData.guests.adults,
      bookingData.guests.children,
      bookingData.guests.infants,
      JSON.stringify(bookingData.guestInfo),
      JSON.stringify(priceBreakdown),
      bookingData.hostName || 'Hostal Norte Armenia',
      bookingData.hostWhatsapp || '+573137065373',
      'reservas@hostalnortearmenia.com',
      bookingData.specialRequests || null,
      bookingData.estimatedArrivalTime || null,
      bookingData.purposeOfStay || 'vacation',
      bookingData.isFirstTimeInArmenia !== false
    ]);
    
    const newBooking = createResult.rows[0];
    
    // 7. ✅ GENERAR MENSAJE WHATSAPP
    const whatsappMessage = generateWhatsAppMessage(newBooking, room);
    
    console.log('✅ Booking created successfully:', bookingReference);
    
    res.status(201).json({
      status: 'success',
      message: 'Reserva creada exitosamente',
      data: {
        booking: formatBookingResponse(newBooking, room),
        whatsappMessage
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno creando reserva',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

// ================================
// 📖 OBTENER RESERVA POR REFERENCIA
// ================================

export const getBookingByReference = async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    
    const query = `
      SELECT b.*, r.name as room_name, r.base_price as room_base_price
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.booking_reference = $1
    `;
    
    const result = await executeQuery(query, [reference]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Reserva ${reference} no encontrada`
      });
    }
    
    const booking = result.rows[0];
    
    res.json({
      status: 'success',
      data: formatBookingResponse(booking)
    });
    
  } catch (error) {
    console.error('❌ Error getting booking:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error obteniendo reserva'
    });
  }
};

// ================================
// 📊 OBTENER TODAS LAS RESERVAS (ADMIN)
// ================================

export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT b.*, r.name as room_name, r.room_number
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
    `;
    
    let params: any[] = [];
    
    if (status) {
      query += ' WHERE b.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const result = await executeQuery(query, params);
    
    // Obtener estadísticas
    const statsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM bookings 
      GROUP BY status
    `;
    
    const statsResult = await executeQuery(statsQuery);
    const stats = statsResult.rows.reduce((acc: any, row: any) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});
    
    res.json({
      status: 'success',
      data: {
        bookings: result.rows.map(formatBookingResponse),
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: result.rows.length
        },
        stats
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting bookings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error obteniendo reservas'
    });
  }
};

// ================================
// 🔄 ACTUALIZAR ESTADO DE RESERVA
// ================================

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, notes } = req.body;
    
    // Validar estados permitidos
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'expired'];
    const validPaymentStatuses = ['pending', 'confirmed', 'paid', 'refunded'];
    
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Estado inválido: ${status}. Estados permitidos: ${validStatuses.join(', ')}`
      });
    }
    
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Estado de pago inválido: ${paymentStatus}`
      });
    }
    
    let updateFields: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
      
      // Si se confirma o cancela, agregar timestamp
      if (status === 'confirmed') {
        updateFields.push(`confirmed_at = NOW()`);
      } else if (status === 'cancelled') {
        updateFields.push(`cancelled_at = NOW()`);
      }
    }
    
    if (paymentStatus) {
      updateFields.push(`payment_status = $${paramIndex}`);
      params.push(paymentStatus);
      paramIndex++;
    }
    
    if (notes) {
      updateFields.push(`host_notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }
    
    updateFields.push('updated_at = NOW()');
    
    const query = `
      UPDATE bookings 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    params.push(id);
    
    const result = await executeQuery(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Reserva ${id} no encontrada`
      });
    }
    
    console.log(`✅ Booking ${id} updated - Status: ${status || 'unchanged'}, Payment: ${paymentStatus || 'unchanged'}`);
    
    res.json({
      status: 'success',
      message: 'Reserva actualizada exitosamente',
      data: formatBookingResponse(result.rows[0])
    });
    
  } catch (error) {
    console.error('❌ Error updating booking:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error actualizando reserva'
    });
  }
};

// ================================
// 📱 MARCAR WHATSAPP COMO ENVIADO
// ================================

export const markWhatsAppSent = async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    
    const query = `
      UPDATE bookings 
      SET 
        whatsapp_message_sent = true,
        updated_at = NOW()
      WHERE booking_reference = $1
      RETURNING booking_reference, whatsapp_message_sent
    `;
    
    const result = await executeQuery(query, [reference]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Reserva ${reference} no encontrada`
      });
    }
    
    res.json({
      status: 'success',
      message: 'WhatsApp marcado como enviado',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error marking WhatsApp sent:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error actualizando estado WhatsApp'
    });
  }
};

// ================================
// 🛠️ FUNCIONES AUXILIARES
// ================================

function validateBookingData(data: BookingRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.roomId) errors.push('Room ID es requerido');
  if (!data.checkInDate) errors.push('Fecha de llegada es requerida');
  if (!data.checkOutDate) errors.push('Fecha de salida es requerida');
  if (!data.guests?.total || data.guests.total < 1) errors.push('Debe haber al menos 1 huésped');
  if (!data.guestInfo?.firstName) errors.push('Nombre del huésped es requerido');
  if (!data.guestInfo?.lastName) errors.push('Apellido del huésped es requerido');
  if (!data.guestInfo?.email) errors.push('Email del huésped es requerido');
  if (!data.guestInfo?.phone) errors.push('Teléfono del huésped es requerido');
  
  // Validar fechas
  if (data.checkInDate && data.checkOutDate) {
    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);
    const today = new Date();
    
    if (checkIn < today) errors.push('La fecha de llegada no puede ser en el pasado');
    if (checkOut <= checkIn) errors.push('La fecha de salida debe ser posterior a la llegada');
  }
  
  return { isValid: errors.length === 0, errors };
}

async function validateRoomAvailability(roomId: string, checkIn: string, checkOut: string) {
  try {
    // Usar nuestro sistema de availability existente
    const { executeQuery } = await import('../config/database');
    
    const query = `
      SELECT date, is_available, is_blocked, is_booked
      FROM room_availability
      WHERE room_id = $1 
      AND date >= $2 
      AND date < $3
    `;
    
    const result = await executeQuery(query, [roomId, checkIn, checkOut]);
    
    const unavailableDays = result.rows.filter((day: any) =>
      !day.is_available || day.is_blocked || day.is_booked
    );
    
    return {
      isValid: unavailableDays.length === 0,
      errors: unavailableDays.map((day: any) => ({
        date: day.date,
        reason: day.is_blocked ? 'blocked' : day.is_booked ? 'booked' : 'unavailable'
      }))
    };
    
  } catch (error) {
    console.error('Error validating availability:', error);
    return { isValid: false, errors: ['Error validando disponibilidad'] };
  }
}

function generateBookingReference(): string {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 999) + 1;
  return `HNA-${dateStr}-${randomNum.toString().padStart(3, '0')}`;
}

function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = checkOutDate.getTime() - checkInDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculatePriceBreakdown(basePrice: number, nights: number): PriceBreakdown {
  const subtotal = basePrice * nights;
  const ivaPercentage = 19;
  const ivaAmount = Math.round(subtotal * (ivaPercentage / 100));
  const total = subtotal + ivaAmount;
  
  return {
    basePrice,
    nights,
    subtotal,
    iva: {
      percentage: ivaPercentage,
      amount: ivaAmount
    },
    total,
    currency: 'COP'
  };
}

function generateWhatsAppMessage(booking: any, room: any) {
  const guestInfo = typeof booking.guest_info === 'string' 
    ? JSON.parse(booking.guest_info) 
    : booking.guest_info;
    
  const priceBreakdown = typeof booking.price_breakdown === 'string'
    ? JSON.parse(booking.price_breakdown)
    : booking.price_breakdown;
  
  const message = `
🏨 *NUEVA RESERVA - HOSTAL NORTE ARMENIA*

📋 *Referencia:* ${booking.booking_reference}
👤 *Huésped:* ${guestInfo.firstName} ${guestInfo.lastName}
📞 *Teléfono:* ${guestInfo.phone}
📧 *Email:* ${guestInfo.email}

🛏️ *Habitación:* ${room.name}
📅 *Llegada:* ${formatDate(booking.check_in_date)}
📅 *Salida:* ${formatDate(booking.check_out_date)}
🌙 *Noches:* ${booking.nights}
👥 *Huéspedes:* ${booking.total_guests} (${booking.adults} adultos${booking.children > 0 ? `, ${booking.children} niños` : ''})

💰 *TOTAL:* $${priceBreakdown.total.toLocaleString()} COP

${booking.special_requests ? `\n🗒️ *Solicitudes especiales:*\n${booking.special_requests}` : ''}

⏰ *Llegada estimada:* ${booking.estimated_arrival_time || 'Por confirmar'}
🎯 *Motivo:* ${translatePurpose(booking.purpose_of_stay)}

---
✅ Para CONFIRMAR la reserva, responde: "CONFIRMAR ${booking.booking_reference}"
❌ Para RECHAZAR, responde: "RECHAZAR ${booking.booking_reference}"

*Esta reserva expira en 24 horas si no se confirma*
  `.trim();

  const phone = booking.host_whatsapp || '+573137065373';
  
  // ✅ NUEVA LÓGICA PARA LIMPIAR EL TELÉFONO
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  
  return {
    message,
    url: `https://wa.me/${cleanPhone}?text=${encodedMessage}`,
    urlMobile: `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`,
    bookingReference: booking.booking_reference
  };
}

// ✅ NUEVA FUNCIÓN AUXILIAR PARA LIMPIAR NÚMEROS
function cleanPhoneNumber(phone: string): string {
  // Quitar todos los caracteres no numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Si empieza con 57 (código de Colombia), usar tal como está
  if (cleaned.startsWith('57')) {
    return cleaned;
  }
  
  // Si empieza con 3 (número colombiano sin código país), agregar 57
  if (cleaned.startsWith('3')) {
    return `57${cleaned}`;
  }
  
  // Si tiene otro formato, asumir que necesita código país 57
  return `57${cleaned}`;
}

function formatBookingResponse(booking: any, room?: any) {
  // Parse JSON fields if they're strings
  const guestInfo = typeof booking.guest_info === 'string' 
    ? JSON.parse(booking.guest_info) 
    : booking.guest_info;
    
  const priceBreakdown = typeof booking.price_breakdown === 'string'
    ? JSON.parse(booking.price_breakdown)
    : booking.price_breakdown;
  
  return {
    id: booking.id,
    bookingReference: booking.booking_reference,
    status: booking.status,
    paymentStatus: booking.payment_status,
    
    room: {
      id: booking.room_id,
      name: booking.room_name || room?.name,
      roomNumber: booking.room_number
    },
    
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    nights: booking.nights,
    
    guests: {
      total: booking.total_guests,
      adults: booking.adults,
      children: booking.children,
      infants: booking.infants
    },
    
    guestInfo,
    priceBreakdown,
    
    specialRequests: booking.special_requests,
    estimatedArrivalTime: booking.estimated_arrival_time,
    purposeOfStay: booking.purpose_of_stay,
    isFirstTimeInArmenia: booking.is_first_time_armenia,
    
    whatsappMessageSent: booking.whatsapp_message_sent,
    
    createdAt: booking.created_at,
    updatedAt: booking.updated_at,
    confirmedAt: booking.confirmed_at,
    cancelledAt: booking.cancelled_at
  };
}

function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function translatePurpose(purpose: string): string {
  const translations = {
    vacation: 'Vacaciones',
    business: 'Negocios',
    family: 'Familia',
    tourism: 'Turismo',
    other: 'Otro'
  };
  
  return translations[purpose as keyof typeof translations] || purpose;
}

export default {
  createBooking,
  getBookingByReference,
  getAllBookings,
  updateBookingStatus,
  markWhatsAppSent
};