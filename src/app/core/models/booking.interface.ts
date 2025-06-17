// 📁 src/app/core/models/booking.interface.ts

export type BookingStatus = 'draft' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'whatsapp' | 'transfer' | 'pse' | 'credit-card';

// ================================
// 🏠 INFORMACIÓN DE LA RESERVA
// ================================

export interface BookingRequest {
  // Información básica
  propertyId: string;
  checkInDate: string;    // Format: 'YYYY-MM-DD'
  checkOutDate: string;   // Format: 'YYYY-MM-DD'
  nights: number;
  
  // Huéspedes
  guests: {
    adults: number;
    children: number;
    infants: number;
    total: number;
  };
  
  // Información del huésped principal
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsapp?: string;
    documentType: 'cedula' | 'pasaporte' | 'tarjeta-identidad';
    documentNumber: string;
    nationality: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  
  // Detalles adicionales
  specialRequests?: string;
  estimatedArrivalTime?: string;
  purposeOfStay: 'vacation' | 'business' | 'family-visit' | 'other';
  isFirstTimeInArmenia: boolean;
  
  // Información de contacto del anfitrión
  hostWhatsapp: string;
  hostName: string;
}

// ================================
// 💰 CÁLCULOS DE PRECIO
// ================================

export interface PriceBreakdown {
  // Precios base
  pricePerNight: number;
  nights: number;
  subtotal: number;
  
  // Descuentos aplicables
  weeklyDiscount?: {
    percentage: number;
    amount: number;
  };
  monthlyDiscount?: {
    percentage: number;
    amount: number;
  };
  
  // Tarifas adicionales
  cleaningFee?: number;
  serviceFee?: number;
  
  // Impuestos (Colombia)
  iva: {
    percentage: number;
    amount: number;
  };
  
  // Total final
  total: number;
  totalCOP: number;
}

export interface PriceCalculatorConfig {
  applyWeeklyDiscount: boolean;    // Si >= 7 noches
  applyMonthlyDiscount: boolean;   // Si >= 28 noches
  cleaningFeePercentage: number;   // % del subtotal
  serviceFeePercentage: number;    // % del subtotal
  ivaPercentage: number;           // 19% en Colombia
}

// ================================
// 📅 DISPONIBILIDAD Y CALENDARIO
// ================================

export interface AvailabilityInfo {
  date: string;              // 'YYYY-MM-DD'
  isAvailable: boolean;
  isBlocked: boolean;
  isBooked: boolean;
  isPastDate: boolean;
  priceOverride?: number;    // Precio especial para esa fecha
  minimumStay?: number;      // Estancia mínima para esa fecha
  reason?: string;           // Razón del bloqueo si aplica
}

export interface CalendarMonth {
  year: number;
  month: number;              // 0-11 (JavaScript format)
  monthName: string;
  days: AvailabilityInfo[];
}

export interface BookingDates {
  checkIn: string | null;
  checkOut: string | null;
  nights: number;
  isValid: boolean;
  errors: string[];
}

// ================================
// 📋 RESERVA COMPLETA
// ================================

export interface Booking {
  // Identificación
  id: string;
  bookingReference: string;    // Formato: ARM-20250616-001
  
  // Estado
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  
  // Información de la reserva
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  propertyAddress: string;
  propertyZone: string;
  
  // Fechas y duración
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  
  // Huéspedes
  guests: BookingRequest['guests'];
  guestInfo: BookingRequest['guestInfo'];
  
  // Precio
  priceBreakdown: PriceBreakdown;
  
  // Anfitrión
  hostName: string;
  hostWhatsapp: string;
  hostEmail?: string;
  
  // Comunicación
  whatsappMessageSent: boolean;
  whatsappMessageId?: string;
  
  // Detalles adicionales
  specialRequests?: string;
  estimatedArrivalTime?: string;
  purposeOfStay: BookingRequest['purposeOfStay'];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  
  // Políticas aplicadas
  cancellationPolicy: 'flexible' | 'moderada' | 'estricta';
  minimumStay: number;
}

// ================================
// 🔧 CONFIGURACIONES Y VALIDACIONES
// ================================

export interface BookingValidationRules {
  // Fechas
  maxAdvanceBookingDays: number;     // Máximo 365 días adelante
  minAdvanceBookingHours: number;    // Mínimo 2 horas adelante
  maxStayDays: number;               // Máximo 90 días
  
  // Huéspedes
  maxGuestsPerProperty: number;
  requireEmergencyContact: boolean;
  
  // Documentación
  requiredDocuments: string[];
  
  // Check-in/out
  defaultCheckInTime: string;        // '15:00'
  defaultCheckOutTime: string;       // '11:00'
  allowSameDayBooking: boolean;
}

export interface BookingFormStep {
  stepNumber: number;
  stepName: 'dates' | 'guests' | 'details' | 'review' | 'confirmation';
  isCompleted: boolean;
  isValid: boolean;
  errors: string[];
}

export interface BookingProgress {
  currentStep: number;
  totalSteps: number;
  steps: BookingFormStep[];
  canProceed: boolean;
  completionPercentage: number;
}

// ================================
// 📱 WHATSAPP INTEGRATION
// ================================

export interface WhatsAppMessage {
  bookingId: string;
  hostWhatsapp: string;
  messageText: string;
  messageType: 'new-booking' | 'booking-update' | 'cancellation';
  isSent: boolean;
  sentAt?: string;
  whatsappUrl: string;
}

export interface WhatsAppTemplate {
  type: WhatsAppMessage['messageType'];
  template: string;
}

// ================================
// 📊 ESTADÍSTICAS Y REPORTES
// ================================

export interface BookingStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  averageStayDuration: number;
  occupancyRate: number;
  mostPopularZone: string;
  mostPopularPropertyType: string;
}

// ================================
// 🎯 UTILIDADES Y CONSTANTES
// ================================

export const BOOKING_CONSTANTS = {
  // Configuración por defecto
  DEFAULT_PRICE_CONFIG: {
    applyWeeklyDiscount: true,
    applyMonthlyDiscount: true,
    cleaningFeePercentage: 10,
    serviceFeePercentage: 5,
    ivaPercentage: 19
  } as PriceCalculatorConfig,
  
  // Reglas de validación
  DEFAULT_VALIDATION_RULES: {
    maxAdvanceBookingDays: 365,
    minAdvanceBookingHours: 2,
    maxStayDays: 90,
    maxGuestsPerProperty: 10,
    requireEmergencyContact: true,
    requiredDocuments: ['documentType', 'documentNumber'],
    defaultCheckInTime: '15:00',
    defaultCheckOutTime: '11:00',
    allowSameDayBooking: false
  } as BookingValidationRules,
  
  // Plantillas WhatsApp
  WHATSAPP_TEMPLATES: {
    'new-booking': `🏠 *Nueva Reserva - Norte Armenia*

¡Hola {{hostName}}! Tienes una nueva solicitud de reserva:

📋 *Detalles de la Reserva:*
• Referencia: {{bookingReference}}
• Propiedad: {{propertyTitle}}
• Huésped: {{guestName}}
• Check-in: {{checkInDate}} ({{checkInTime}})
• Check-out: {{checkOutDate}} ({{checkOutTime}})
• Noches: {{nights}}
• Huéspedes: {{totalGuests}}
• Total: $\{{total}} COP

📱 *Contacto del Huésped:*
• Teléfono: {{guestPhone}}
• Email: {{guestEmail}}

{{specialRequests}}

Por favor confirma la disponibilidad lo antes posible.

¡Gracias por ser parte de Norte Armenia! 🇨🇴`,

    'booking-update': `📝 *Actualización de Reserva*

Hola {{hostName}}, la reserva {{bookingReference}} ha sido actualizada.

{{updateDetails}}`,

    'cancellation': `❌ *Cancelación de Reserva*

Hola {{hostName}}, la reserva {{bookingReference}} ha sido cancelada.

Motivo: {{cancellationReason}}`
  } as Record<WhatsAppMessage['messageType'], string>
};

// ================================
// 🔄 TIPOS DERIVADOS Y UTILIDADES
// ================================

export type BookingRequestKeys = keyof BookingRequest;
export type BookingKeys = keyof Booking;
export type RequiredGuestInfo = Required<BookingRequest['guestInfo']>;

// Tipo para formularios parciales durante el proceso
export type PartialBookingRequest = Partial<BookingRequest>;

// Tipo para actualizaciones de reserva
export type BookingUpdate = Partial<Pick<Booking, 'status' | 'paymentStatus' | 'specialRequests' | 'estimatedArrivalTime'>>;

// Tipo para búsqueda de reservas
export interface BookingSearchParams {
  propertyId?: string;
  guestEmail?: string;
  bookingReference?: string;
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
}