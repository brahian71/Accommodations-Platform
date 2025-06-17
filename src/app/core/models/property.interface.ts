// 📁 src/app/core/models/property.interface.ts

export type PropertyType = 'habitacion' | 'apartamento' | 'studio' | 'casa' | 'penthouse';

export type ZoneType = 'norte-centro' | 'la-secreta' | 'bosques-pinares' | 'ciudadela-del-cafe' | 'villa-liliana';

export type AmenityType = 
  | 'wifi' 
  | 'parking' 
  | 'breakfast' 
  | 'kitchen' 
  | 'ac' 
  | 'tv'
  | 'washing-machine'
  | 'security'
  | 'elevator'
  | 'balcony';

export type ServiceType = 
  | 'cleaning' 
  | 'transport' 
  | 'luggage-storage' 
  | 'concierge'
  | 'tour-info'
  | 'late-checkin';

export interface Property {
  id: string;
  title: string;
  location: string;
  zone: ZoneType;
  address?: string;
  description: string;
  
  pricePerNight: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  currency: 'COP';

  rating: number;
  reviewsCount: number;

  image: string;
  images?: string[];

  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  area?: number; 
  floor?: number;

  features: string[];
  amenities: AmenityType[];
  services: ServiceType[];

  hostName: string;
  hostPhoto?: string;
  hostWhatsapp?: string;
  responseTime?: string; 

  nearbyPlaces: string[];
  transportAccess: string[];

  checkInTime: string;
  checkOutTime: string;
  minimumStay?: number; 
  cancellationPolicy?: 'flexible' | 'moderada' | 'estricta';

  isFavorite: boolean;
  isVerified: boolean;
  isInstantBook: boolean;
  isAvailable: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface PropertyCardConfig {
  displayMode: 'compact' | 'detailed' | 'horizontal';
  showFavoriteButton: boolean;
  showPricing: boolean;
  showFeatures: boolean;
  showContact: boolean;
  showLocation: boolean;
}

export interface PropertyFilters {
  zones: ZoneType[];
  propertyTypes: PropertyType[];
  amenities: AmenityType[];
  services: ServiceType[];
  minPrice: number;
  maxPrice: number;
  minRating: number;
  maxGuests: number;
  instantBook: boolean;
  verified: boolean;
}

export const ARMENIA_NORTH_ZONES = {
  'norte-centro': {
    name: 'Norte Centro',
    description: 'Zona comercial y residencial cerca del centro',
    icon: '🏢'
  },
  'la-secreta': {
    name: 'La Secreta', 
    description: 'Barrio tranquilo y familiar',
    icon: '🏘️'
  },
  'bosques-pinares': {
    name: 'Bosques de Pinares',
    description: 'Zona exclusiva con áreas verdes',
    icon: '🌲'
  },
  'ciudadela-del-cafe': {
    name: 'Ciudadela del Café',
    description: 'Desarrollo residencial moderno',
    icon: '☕'
  },
  'villa-liliana': {
    name: 'Villa Liliana',
    description: 'Sector tranquilo y bien conectado',
    icon: '🏠'
  }
};

export const PROPERTY_TYPE_LABELS = {
  'habitacion': 'Habitación Privada',
  'apartamento': 'Apartamento Completo', 
  'studio': 'Studio',
  'casa': 'Casa Familiar',
  'penthouse': 'Penthouse'
};

export const AMENITY_LABELS = {
  'wifi': 'WiFi gratis',
  'parking': 'Parqueadero',
  'breakfast': 'Desayuno incluido',
  'kitchen': 'Cocina equipada',
  'ac': 'Aire acondicionado',
  'tv': 'Televisión',
  'washing-machine': 'Lavadora',
  'security': 'Vigilancia 24h',
  'elevator': 'Ascensor',
  'balcony': 'Balcón'
};

export const SERVICE_LABELS = {
  'cleaning': 'Servicio de limpieza',
  'transport': 'Transporte al aeropuerto',
  'luggage-storage': 'Guarda equipaje',
  'concierge': 'Servicio de conserjería',
  'tour-info': 'Información turística',
  'late-checkin': 'Check-in tardío'
};