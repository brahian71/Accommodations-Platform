// 📁 src/app/core/models/search.interface.ts
// VERSIÓN CORREGIDA - TODOS LOS TIPOS INCLUIDOS

import { PropertyType, ZoneType, AmenityType, ServiceType } from './property.interface';

export interface SearchParams {
  destination: ZoneType | string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface PropertyTypeFilters {
  habitacion: boolean;
  apartamento: boolean;
  studio: boolean;
  casa: boolean;
  penthouse: boolean;
}

export interface ZoneFilters {
  'norte-centro': boolean;
  'la-secreta': boolean;
  'bosques-pinares': boolean;
  'ciudadela-del-cafe': boolean;
  'villa-liliana': boolean;
}

export interface AmenityFilters {
  wifi: boolean;
  parking: boolean;
  breakfast: boolean;
  kitchen: boolean;
  ac: boolean;
  tv: boolean;
  'washing-machine': boolean;
  security: boolean;
  elevator: boolean;
  balcony: boolean;
}

export interface ServiceFilters {
  cleaning: boolean;
  transport: boolean;
  'luggage-storage': boolean;
  concierge: boolean;
  'tour-info': boolean;
  'late-checkin': boolean;
}

export interface StayDurationFilters {
  shortTerm: boolean; // 1-6 noches
  weekly: boolean; // 7-29 noches  
  monthly: boolean; // 30+ noches
}

export interface Filters {
  zones: ZoneFilters;
  propertyTypes: PropertyTypeFilters;
  amenities: AmenityFilters;
  services: ServiceFilters;
  stayDuration: StayDurationFilters;
  minRating: number;
  priceMin: number;
  priceMax: number;
  maxGuests: number;
  instantBook: boolean;
  verified: boolean;
}

export interface FilterState {
  activeFilters: Filters;
  hasActiveFilters: boolean;
  filterCount: number;
}

export interface SortOption {
  value: string;
  label: string;
  icon?: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: 'relevance', label: 'Más Relevantes', icon: '⭐' },
  { value: 'price-asc', label: 'Precio: Menor a Mayor', icon: '💰' },
  { value: 'price-desc', label: 'Precio: Mayor a Menor', icon: '💎' },
  { value: 'rating', label: 'Mejor Calificados', icon: '👍' },
  { value: 'reviews', label: 'Más Reseñas', icon: '💬' },
  { value: 'distance', label: 'Más Cerca del Centro', icon: '📍' },
  { value: 'newest', label: 'Más Recientes', icon: '🆕' }
];

// ================================
// 🆕 INTERFAZ SEARCH RESULTS CONFIG - AGREGADA
// ================================

export interface SearchResultsConfig {
  viewMode: 'list' | 'map';
  sortBy: string;
  itemsPerPage: number;
  currentPage: number;
  showMap: boolean;
}

export interface QuickSuggestion {
  destination: ZoneType;
  label: string;
  icon: string;
  description?: string;
}

export const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { 
    destination: 'norte-centro', 
    label: 'Norte Centro', 
    icon: '🏢',
    description: 'Zona comercial y conectada'
  },
  { 
    destination: 'la-secreta', 
    label: 'La Secreta', 
    icon: '🏘️',
    description: 'Barrio tranquilo y familiar' 
  },
  { 
    destination: 'bosques-pinares', 
    label: 'Bosques de Pinares', 
    icon: '🌲',
    description: 'Zona exclusiva con naturaleza'
  },
  { 
    destination: 'ciudadela-del-cafe', 
    label: 'Ciudadela del Café', 
    icon: '☕',
    description: 'Desarrollo moderno'
  }
];

export interface SearchHistoryItem {
  id: string;
  searchParams: SearchParams;
  timestamp: Date;
  resultsCount: number;
}

export interface PopularSearch {
  destination: string;
  searchCount: number;
  averageStay: number;
  popularWith: string[]; // ['familias', 'viajeros de negocios', 'estudiantes']
}

// ================================
// 🔧 CONFIGURACIONES POR DEFECTO - CORREGIDAS
// ================================

export const DEFAULT_SEARCH_PARAMS: SearchParams = {
  destination: '',
  checkIn: '',
  checkOut: '',
  guests: 2
};

export const DEFAULT_FILTERS: Filters = {
  zones: {
    'norte-centro': false,
    'la-secreta': false,
    'bosques-pinares': false,
    'ciudadela-del-cafe': false,
    'villa-liliana': false
  },
  propertyTypes: {
    habitacion: false,
    apartamento: false,
    studio: false,
    casa: false,
    penthouse: false
  },
  amenities: {
    wifi: false,
    parking: false,
    breakfast: false,
    kitchen: false,
    ac: false,
    tv: false,
    'washing-machine': false,
    security: false,
    elevator: false,
    balcony: false
  },
  services: {
    cleaning: false,
    transport: false,
    'luggage-storage': false,
    concierge: false,
    'tour-info': false,
    'late-checkin': false
  },
  stayDuration: {
    shortTerm: false,
    weekly: false,
    monthly: false
  },
  minRating: 0,
  priceMin: 0,
  priceMax: 200000, // 200k COP por noche
  maxGuests: 10,
  instantBook: false,
  verified: false
};

export const DEFAULT_SEARCH_RESULTS_CONFIG: SearchResultsConfig = {
  viewMode: 'list',
  sortBy: 'relevance',
  itemsPerPage: 10,
  currentPage: 1,
  showMap: false
};

export const PRICE_RANGES = [
  { min: 0, max: 50000, label: 'Hasta $50.000' },
  { min: 50000, max: 75000, label: '$50.000 - $75.000' },
  { min: 75000, max: 100000, label: '$75.000 - $100.000' },
  { min: 100000, max: 150000, label: '$100.000 - $150.000' },
  { min: 150000, max: 999999, label: 'Más de $150.000' }
];