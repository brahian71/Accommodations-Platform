// ================================
// 📁 src/app/core/models/room.interface.ts
// ================================

export type RoomType = 'individual' | 'doble' | 'triple' | 'cuadruple' | 'suite' | 'familiar';
export type BedType = 'individual' | 'doble' | 'queen' | 'king' | 'litera' | 'sofa-cama';
export type BathroomType = 'privado' | 'compartido';

export interface Room {
  id: string;
  roomNumber: string;      // "Habitación 1", "Suite 2", etc.
  name: string;            // "Suite Deluxe", "Habitación Doble Vista Jardín"
  description: string;
  
  // Tipo y configuración
  roomType: RoomType;
  bathroomType: BathroomType;
  
  // Capacidad
  maxGuests: number;
  beds: {
    type: BedType;
    quantity: number;
  }[];
  
  // Características físicas
  area?: number;           // m²
  floor?: number;
  hasWindow: boolean;
  windowView?: 'interior' | 'calle' | 'jardin' | 'terraza';
  
  // Amenidades específicas de la habitación
  amenities: RoomAmenityType[];
  features: string[];      // ["Balcón privado", "Escritorio", "Armario amplio"]
  
  // Precios
  pricing: {
    basePrice: number;
    currency: 'COP';
    weeklyDiscount?: number;   // Porcentaje
    monthlyDiscount?: number;  // Porcentaje
    seasonalPricing?: {
      high: number;    // Temporada alta
      low: number;     // Temporada baja
    };
  };
  
  // Imágenes específicas de la habitación
  images: {
    main: string;
    gallery: string[];
  };
  
  // Disponibilidad y restricciones
  availability: {
    isActive: boolean;
    isAvailable: boolean;
    minimumStay?: number;
    maximumStay?: number;
    blockedDates?: string[];
  };
  
  // Estadísticas
  stats: {
    rating: number;
    reviewCount: number;
    bookingCount: number;
    occupancyRate?: number;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ================================
// 🛏️ AMENIDADES ESPECÍFICAS DE HABITACIÓN
// ================================

export type RoomAmenityType = 
  | 'aire-acondicionado'
  | 'calefaccion'
  | 'ventilador'
  | 'tv-cable'
  | 'tv-smart'
  | 'escritorio'
  | 'silla-trabajo'
  | 'armario'
  | 'caja-fuerte'
  | 'minibar'
  | 'cafetera'
  | 'balcon'
  | 'bano-privado'
  | 'ducha-agua-caliente'
  | 'secador-pelo'
  | 'toallas-incluidas'
  | 'kit-aseo'
  | 'blackout-curtains';

export const ROOM_AMENITY_LABELS = {
  'aire-acondicionado': 'Aire Acondicionado',
  'calefaccion': 'Calefacción',
  'ventilador': 'Ventilador',
  'tv-cable': 'TV por Cable',
  'tv-smart': 'Smart TV',
  'escritorio': 'Escritorio de Trabajo',
  'silla-trabajo': 'Silla Ergonómica',
  'armario': 'Armario Amplio',
  'caja-fuerte': 'Caja Fuerte',
  'minibar': 'Minibar',
  'cafetera': 'Cafetera',
  'balcon': 'Balcón Privado',
  'bano-privado': 'Baño Privado',
  'ducha-agua-caliente': 'Ducha con Agua Caliente',
  'secador-pelo': 'Secador de Pelo',
  'toallas-incluidas': 'Toallas Incluidas',
  'kit-aseo': 'Kit de Aseo',
  'blackout-curtains': 'Cortinas Blackout'
};

export const ROOM_TYPE_LABELS = {
  'individual': 'Habitación Individual',
  'doble': 'Habitación Doble',
  'triple': 'Habitación Triple',
  'cuadruple': 'Habitación Cuádruple',
  'suite': 'Suite',
  'familiar': 'Habitación Familiar'
};

export const BED_TYPE_LABELS = {
  'individual': 'Cama Individual',
  'doble': 'Cama Doble',
  'queen': 'Cama Queen',
  'king': 'Cama King',
  'litera': 'Litera',
  'sofa-cama': 'Sofá Cama'
};

// ================================
// 🔍 FILTROS PARA HABITACIONES
// ================================

export interface RoomFilters {
  roomTypes: RoomType[];
  capacity: number;
  priceRange: {
    min: number;
    max: number;
  };
  amenities: RoomAmenityType[];
  bathroomType?: BathroomType;
  hasBalcony?: boolean;
  hasWorkspace?: boolean;
  minRating?: number;
  availableDates?: {
    checkIn: string;
    checkOut: string;
  };
}

export interface RoomSearchParams {
  checkIn?: string;
  checkOut?: string;
  guests: number;
  roomType?: RoomType;
  maxPrice?: number;
}

// ================================
// 📊 ESTADÍSTICAS DE HABITACIONES
// ================================

export interface RoomStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  averagePrice: number;
  averageRating: number;
  totalReviews: number;
  occupancyRate: number;
  mostPopularRoomType: RoomType;
  averageStayDuration: number;
}

// ================================
// 🎨 CONFIGURACIÓN DE DISPLAY
// ================================

export interface RoomCardConfig {
  showPricing: boolean;
  showAmenities: boolean;
  showCapacity: boolean;
  showRating: boolean;
  showAvailability: boolean;
  compactMode: boolean;
}

export interface RoomDetailConfig {
  showBookingWidget: boolean;
  showSimilarRooms: boolean;
  showEstablishmentInfo: boolean;
  showGallery: boolean;
  enableVirtualTour?: boolean;
}