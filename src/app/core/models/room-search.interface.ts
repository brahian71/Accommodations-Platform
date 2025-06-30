// 📁 src/app/core/models/room-search.interface.ts

import { RoomType, BathroomType, RoomAmenityType } from './room.interface';

// ================================
// 🔍 PARÁMETROS DE BÚSQUEDA PRINCIPAL
// ================================

export interface RoomSearchParams {
  checkIn: string;
  checkOut: string;
  guests: number;
  roomType?: RoomType;
}

// ================================
// 🎛️ FILTROS ESPECÍFICOS PARA HABITACIONES
// ================================

export interface RoomTypeFilters {
  individual: boolean;
  doble: boolean;
  triple: boolean;
  cuadruple: boolean;
  suite: boolean;
  familiar: boolean;
}

export interface RoomAmenityFilters {
  'aire-acondicionado': boolean;
  'tv-smart': boolean;
  'escritorio': boolean;
  'caja-fuerte': boolean;
  'minibar': boolean;
  'balcon': boolean;
  'bano-privado': boolean;
  'secador-pelo': boolean;
}

export interface RoomFeatureFilters {
  hasWorkspace: boolean;
  hasBalcony: boolean;
  hasPrivateBathroom: boolean;
  hasAirConditioning: boolean;
  hasSmartTV: boolean;
  hasSafe: boolean;
}

export interface CapacityFilters {
  guests1: boolean;     // 1 huésped
  guests2: boolean;     // 2 huéspedes
  guests3: boolean;     // 3 huéspedes
  guests4Plus: boolean; // 4+ huéspedes
}

export interface PriceRangeFilters {
  budget: boolean;      // Hasta $60,000
  mid: boolean;         // $60,000 - $90,000
  premium: boolean;     // $90,000+
}

// ================================
// 🎯 FILTROS PRINCIPALES
// ================================

export interface RoomFilters {
  roomTypes: RoomTypeFilters;
  amenities: RoomAmenityFilters;
  features: RoomFeatureFilters;
  capacity: CapacityFilters;
  priceRange: PriceRangeFilters;
  
  // Filtros numéricos
  minPrice: number;
  maxPrice: number;
  minRating: number;
  maxGuests: number;
  
  // Filtros de disponibilidad
  availableOnly: boolean;
  instantBook: boolean;
}

export interface FilterState {
  activeFilters: RoomFilters;
  hasActiveFilters: boolean;
  filterCount: number;
}

// ================================
// 📊 CONFIGURACIÓN DE BÚSQUEDA
// ================================

export interface RoomSearchConfig {
  viewMode: 'grid' | 'list';
  sortBy: string;
  itemsPerPage: number;
  currentPage: number;
  showFilters: boolean;
}

export interface SortOption {
  value: string;
  label: string;
  icon?: string;
}

export const ROOM_SORT_OPTIONS: SortOption[] = [
  { value: 'relevance', label: 'Más Relevantes', icon: '⭐' },
  { value: 'price-asc', label: 'Precio: Menor a Mayor', icon: '💰' },
  { value: 'price-desc', label: 'Precio: Mayor a Menor', icon: '💎' },
  { value: 'rating', label: 'Mejor Calificadas', icon: '👍' },
  { value: 'capacity', label: 'Mayor Capacidad', icon: '👥' },
  { value: 'room-number', label: 'Número de Habitación', icon: '🔢' }
];

// ================================
// 🎯 SUGERENCIAS Y AYUDAS
// ================================

export interface RoomSuggestion {
  roomType: RoomType;
  label: string;
  icon: string;
  description: string;
  idealFor: string[];
}

export const ROOM_SUGGESTIONS: RoomSuggestion[] = [
  {
    roomType: 'individual',
    label: 'Habitación Individual',
    icon: '🛏️',
    description: 'Perfecta para viajeros solos',
    idealFor: ['Viajero solo', 'Viaje de negocios', 'Estancia corta']
  },
  {
    roomType: 'doble',
    label: 'Habitación Doble',
    icon: '👥',
    description: 'Ideal para parejas',
    idealFor: ['Parejas', 'Amigos', 'Viaje romántico']
  },
  {
    roomType: 'familiar',
    label: 'Habitación Familiar',
    icon: '👨‍👩‍👧‍👦',
    description: 'Espaciosa para familias',
    idealFor: ['Familias', 'Grupos', 'Estancia larga']
  },
  {
    roomType: 'suite',
    label: 'Suite Premium',
    icon: '✨',
    description: 'Máximo confort y lujo',
    idealFor: ['Ocasiones especiales', 'Luna de miel', 'Experiencia premium']
  }
];

// ================================
// 📊 ESTADÍSTICAS DE BÚSQUEDA
// ================================

export interface RoomSearchStats {
  totalResults: number;
  availableRooms: number;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  mostPopularType: RoomType;
  averageRating: number;
}

export interface SearchHistoryItem {
  id: string;
  searchParams: RoomSearchParams;
  timestamp: Date;
  resultsCount: number;
}

// ================================
// 🔧 CONFIGURACIONES POR DEFECTO
// ================================

export const DEFAULT_ROOM_SEARCH_PARAMS: RoomSearchParams = {
  checkIn: '',
  checkOut: '',
  guests: 1
};

export const DEFAULT_ROOM_FILTERS: RoomFilters = {
  roomTypes: {
    individual: false,
    doble: false,
    triple: false,
    cuadruple: false,
    suite: false,
    familiar: false
  },
  amenities: {
    'aire-acondicionado': false,
    'tv-smart': false,
    'escritorio': false,
    'caja-fuerte': false,
    'minibar': false,
    'balcon': false,
    'bano-privado': false,
    'secador-pelo': false
  },
  features: {
    hasWorkspace: false,
    hasBalcony: false,
    hasPrivateBathroom: false,
    hasAirConditioning: false,
    hasSmartTV: false,
    hasSafe: false
  },
  capacity: {
    guests1: false,
    guests2: false,
    guests3: false,
    guests4Plus: false
  },
  priceRange: {
    budget: false,
    mid: false,
    premium: false
  },
  minPrice: 0,
  maxPrice: 200000,
  minRating: 0,
  maxGuests: 10,
  availableOnly: true,
  instantBook: false
};

export const DEFAULT_ROOM_SEARCH_CONFIG: RoomSearchConfig = {
  viewMode: 'grid',
  sortBy: 'relevance',
  itemsPerPage: 8,
  currentPage: 1,
  showFilters: true
};

// ================================
// 📋 RANGOS DE PRECIO PREDEFINIDOS
// ================================

export const ROOM_PRICE_RANGES = [
  { 
    id: 'budget',
    min: 0, 
    max: 60000, 
    label: 'Económico - Hasta $60.000',
    description: 'Habitaciones cómodas a precio accesible'
  },
  { 
    id: 'mid',
    min: 60000, 
    max: 90000, 
    label: 'Intermedio - $60.000 - $90.000',
    description: 'Habitaciones con comodidades adicionales'
  },
  { 
    id: 'premium',
    min: 90000, 
    max: 999999, 
    label: 'Premium - Más de $90.000',
    description: 'Suites y habitaciones de lujo'
  }
];

// ================================
// 🎨 LABELS PARA LA INTERFAZ
// ================================

export const ROOM_TYPE_FILTER_LABELS = {
  individual: 'Individual (1 persona)',
  doble: 'Doble (2 personas)',
  triple: 'Triple (3 personas)',
  cuadruple: 'Cuádruple (4 personas)',
  suite: 'Suite Premium',
  familiar: 'Familiar (4+ personas)'
};

export const ROOM_AMENITY_FILTER_LABELS = {
  'aire-acondicionado': 'Aire Acondicionado',
  'tv-smart': 'Smart TV',
  'escritorio': 'Área de Trabajo',
  'caja-fuerte': 'Caja Fuerte',
  'minibar': 'Minibar',
  'balcon': 'Balcón Privado',
  'bano-privado': 'Baño Privado',
  'secador-pelo': 'Secador de Pelo'
};

export const ROOM_FEATURE_FILTER_LABELS = {
  hasWorkspace: 'Espacio de Trabajo',
  hasBalcony: 'Con Balcón',
  hasPrivateBathroom: 'Baño Privado',
  hasAirConditioning: 'Aire Acondicionado',
  hasSmartTV: 'Smart TV',
  hasSafe: 'Caja Fuerte'
};

export const CAPACITY_FILTER_LABELS = {
  guests1: '1 Huésped',
  guests2: '2 Huéspedes',
  guests3: '3 Huéspedes',
  guests4Plus: '4+ Huéspedes'
};

// ================================
// 🎯 UTILIDADES DE VALIDACIÓN
// ================================

export interface RoomSearchValidation {
  isValid: boolean;
  errors: {
    field: keyof RoomSearchParams;
    message: string;
  }[];
  warnings: string[];
}

export function validateRoomSearch(params: RoomSearchParams): RoomSearchValidation {
  const errors: RoomSearchValidation['errors'] = [];
  const warnings: string[] = [];

  // Validar fechas
  if (!params.checkIn || !params.checkOut) {
    errors.push({
      field: 'checkIn',
      message: 'Las fechas de llegada y salida son requeridas'
    });
  } else {
    const checkInDate = new Date(params.checkIn);
    const checkOutDate = new Date(params.checkOut);
    const today = new Date();
    
    if (checkInDate < today) {
      errors.push({
        field: 'checkIn',
        message: 'La fecha de llegada no puede ser en el pasado'
      });
    }
    
    if (checkOutDate <= checkInDate) {
      errors.push({
        field: 'checkOut',
        message: 'La fecha de salida debe ser posterior a la llegada'
      });
    }
  }

  // Validar huéspedes
  if (params.guests < 1) {
    errors.push({
      field: 'guests',
      message: 'Debe especificar al menos 1 huésped'
    });
  } else if (params.guests > 6) {
    warnings.push('Para grupos de más de 6 personas, contacte directamente al establecimiento');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ================================
// 📊 TIPOS DERIVADOS
// ================================

export type RoomFilterKey = keyof RoomFilters;
export type RoomTypeFilterKey = keyof RoomTypeFilters;
export type RoomAmenityFilterKey = keyof RoomAmenityFilters;

export interface ActiveFilterSummary {
  roomTypes: RoomType[];
  amenities: RoomAmenityType[];
  priceRange?: { min: number; max: number };
  capacity?: number;
  features: string[];
  totalActive: number;
}

// ================================
// 🔄 FUNCIONES UTILITARIAS
// ================================

export function getActiveFilters(filters: RoomFilters): ActiveFilterSummary {
  const activeRoomTypes = Object.entries(filters.roomTypes)
    .filter(([_, active]) => active)
    .map(([type, _]) => type as RoomType);

  const activeAmenities = Object.entries(filters.amenities)
    .filter(([_, active]) => active)
    .map(([amenity, _]) => amenity as RoomAmenityType);

  const activeFeatures = Object.entries(filters.features)
    .filter(([_, active]) => active)
    .map(([feature, _]) => ROOM_FEATURE_FILTER_LABELS[feature as keyof typeof ROOM_FEATURE_FILTER_LABELS]);

  const totalActive = activeRoomTypes.length + 
                     activeAmenities.length + 
                     activeFeatures.length +
                     (filters.minPrice > 0 || filters.maxPrice < 200000 ? 1 : 0) +
                     (filters.minRating > 0 ? 1 : 0);

  return {
    roomTypes: activeRoomTypes,
    amenities: activeAmenities,
    priceRange: filters.minPrice > 0 || filters.maxPrice < 200000 
      ? { min: filters.minPrice, max: filters.maxPrice }
      : undefined,
    capacity: filters.maxGuests > 0 ? filters.maxGuests : undefined,
    features: activeFeatures,
    totalActive
  };
}

export function clearAllFilters(): RoomFilters {
  return { ...DEFAULT_ROOM_FILTERS };
}