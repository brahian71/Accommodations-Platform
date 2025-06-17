// 📁 src/app/core/models/booking.interface.ts

export type BookingStatus = 'draft' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'whatsapp' | 'transfer' | 'pse' | 'credit-card';

// ================================
// 🏠 INFORMACIÓN DE LA RESERVA
// ================================

export interface BookingRequest {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  
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
  
  specialRequests?: string;
  estimatedArrivalTime?: string;
  purposeOfStay: 'vacation' | 'business' | 'family-visit' | 'other';
  isFirstTimeInArmenia: boolean;

  hostWhatsapp: string;
  hostName: string;
}

// ================================
// 💰 CÁLCULOS DE PRECIO
// ================================

export interface PriceBreakdown {
  pricePerNight: number;
  nights: number;
  subtotal: number;
  
  weeklyDiscount?: {
    percentage: number;
    amount: number;
  };
  monthlyDiscount?: {
    percentage: number;
    amount: number;
  };

  cleaningFee?: number;
  serviceFee?: number;

  iva: {
    percentage: number;
    amount: number;
  };
  
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
  date: string;
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
  month: number;
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
  id: string;
  bookingReference: string;    // Formato: ARM-20250616-001
  
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  propertyAddress: string;
  propertyZone: string;

  checkInDate: string;
  checkOutDate: string;
  nights: number;

  guests: BookingRequest['guests'];
  guestInfo: BookingRequest['guestInfo'];

  priceBreakdown: PriceBreakdown;

  hostName: string;
  hostWhatsapp: string;
  hostEmail?: string;

  whatsappMessageSent: boolean;
  whatsappMessageId?: string;

  specialRequests?: string;
  estimatedArrivalTime?: string;
  purposeOfStay: BookingRequest['purposeOfStay'];

  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  
  cancellationPolicy: 'flexible' | 'moderada' | 'estricta';
  minimumStay: number;
}

// ================================
// 🔧 CONFIGURACIONES Y VALIDACIONES
// ================================

export interface BookingValidationRules {
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  maxStayDays: number;

  maxGuestsPerProperty: number;
  requireEmergencyContact: boolean;

  requiredDocuments: string[];

  defaultCheckInTime: string;
  defaultCheckOutTime: string;
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
  DEFAULT_PRICE_CONFIG: {
    applyWeeklyDiscount: true,
    applyMonthlyDiscount: true,
    cleaningFeePercentage: 10,
    serviceFeePercentage: 5,
    ivaPercentage: 19
  } as PriceCalculatorConfig,
  
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

export type PartialBookingRequest = Partial<BookingRequest>;

export type BookingUpdate = Partial<Pick<Booking, 'status' | 'paymentStatus' | 'specialRequests' | 'estimatedArrivalTime'>>;
export interface BookingSearchParams {
  propertyId?: string;
  guestEmail?: string;
  bookingReference?: string;
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
}