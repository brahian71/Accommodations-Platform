// 📁 src/app/core/models/establishment.interface.ts
// ================================
// 🏨 INFORMACIÓN DEL ESTABLECIMIENTO
// ================================

export interface Establishment {
  id: string;
  name: string;
  description: string;
  tagline?: string;
  
  // Ubicación única
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  
  // Contacto
  contactInfo: {
    phone: string;
    whatsapp: string;
    email?: string;
    website?: string;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
    };
  };
  
  // Información del anfitrión/administrador
  host: {
    name: string;
    photo?: string;
    description?: string;
    responseTime: 'inmediata' | 'en horas' | 'en 1 día';
    languages?: string[];
  };
  
  // Servicios generales del establecimiento
  amenities: EstablishmentAmenityType[];
  services: EstablishmentServiceType[];
  
  // Políticas generales
  policies: {
    checkInTime: string;
    checkOutTime: string;
    cancellationPolicy: 'flexible' | 'moderada' | 'estricta';
    houseRules: string[];
    smokingAllowed: boolean;
    petsAllowed: boolean;
    partiesAllowed: boolean;
  };
  
  // Información del área
  areaInfo: {
    neighborhood: string;
    nearbyPlaces: string[];
    transportAccess: string[];
    walkingDistances: {
      [place: string]: string; // ej: "Centro comercial": "5 min"
    };
  };
  
  // Galería general del establecimiento
  images: {
    main: string;
    gallery: string[];
    exterior?: string[];
    commonAreas?: string[];
  };
  
  // Estadísticas
  stats: {
    totalRooms: number;
    totalCapacity: number;
    averageRating: number;
    totalReviews: number;
    yearsOperating?: number;
  };
  
  // Estado
  isActive: boolean;
  isVerified: boolean;
  establishmentType: 'hotel' | 'hostal' | 'casa-huespedes' | 'apartahotel';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ================================
// 🏠 TIPOS DE SERVICIOS DEL ESTABLECIMIENTO
// ================================

export type EstablishmentAmenityType = 
  | 'wifi-gratis'
  | 'parqueadero'
  | 'desayuno-incluido'
  | 'cocina-compartida'
  | 'sala-comun'
  | 'terraza'
  | 'jardin'
  | 'lavanderia'
  | 'recepcion-24h'
  | 'vigilancia'
  | 'ascensor'
  | 'aire-acondicionado-central';

export type EstablishmentServiceType = 
  | 'limpieza-diaria'
  | 'transporte-aeropuerto'
  | 'tour-booking'
  | 'informacion-turistica'
  | 'servicio-lavanderia'
  | 'custodia-equipaje'
  | 'cambio-moneda'
  | 'despertador'
  | 'room-service';

// ================================
// 🏷️ LABELS PARA UI
// ================================

export const ESTABLISHMENT_AMENITY_LABELS = {
  'wifi-gratis': 'WiFi Gratis en Todo el Establecimiento',
  'parqueadero': 'Parqueadero Privado',
  'desayuno-incluido': 'Desayuno Continental',
  'cocina-compartida': 'Cocina Compartida Equipada',
  'sala-comun': 'Sala Común',
  'terraza': 'Terraza',
  'jardin': 'Jardín',
  'lavanderia': 'Área de Lavandería',
  'recepcion-24h': 'Recepción 24 Horas',
  'vigilancia': 'Vigilancia y Seguridad',
  'ascensor': 'Ascensor',
  'aire-acondicionado-central': 'Aire Acondicionado Central'
};

export const ESTABLISHMENT_SERVICE_LABELS = {
  'limpieza-diaria': 'Limpieza Diaria de Habitaciones',
  'transporte-aeropuerto': 'Transporte al Aeropuerto',
  'tour-booking': 'Reserva de Tours y Actividades',
  'informacion-turistica': 'Información Turística Local',
  'servicio-lavanderia': 'Servicio de Lavandería',
  'custodia-equipaje': 'Custodia de Equipaje',
  'cambio-moneda': 'Cambio de Moneda',
  'despertador': 'Servicio de Despertador',
  'room-service': 'Servicio a la Habitación'
};

// ================================
// 🎯 CONFIGURACIÓN DE ESTABLECIMIENTO
// ================================

export interface EstablishmentConfig {
  allowOnlineBooking: boolean;
  requireAdvanceBooking: boolean;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  
  automaticConfirmation: boolean;
  requirePaymentUpfront: boolean;
  acceptCreditCards: boolean;
  
  businessHours: {
    checkIn: { start: string; end: string };
    checkOut: { start: string; end: string };
    reception?: { start: string; end: string };
  };
  
  seasonalPricing: boolean;
  weekendPricing: boolean;
  holidayPricing: boolean;
}

