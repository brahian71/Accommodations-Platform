// 📁 src/app/core/services/room-search.service.ts

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { Room, RoomType, RoomAmenityType } from '../models/room.interface';
import { 
  RoomSearchParams, 
  RoomFilters, 
  FilterState, 
  RoomSearchConfig,
  RoomSuggestion,
  RoomSearchStats,
  DEFAULT_ROOM_FILTERS,
  DEFAULT_ROOM_SEARCH_CONFIG,
  DEFAULT_ROOM_SEARCH_PARAMS,
  ROOM_SUGGESTIONS,
  getActiveFilters
} from '../models/room-search.interface';

import { RoomService } from './room.service';

@Injectable({
  providedIn: 'root'
})
export class RoomSearchService {

  // 📱 REACTIVE STATE
  private searchParamsSubject = new BehaviorSubject<RoomSearchParams>(DEFAULT_ROOM_SEARCH_PARAMS);
  private filtersSubject = new BehaviorSubject<RoomFilters>(DEFAULT_ROOM_FILTERS);
  private configSubject = new BehaviorSubject<RoomSearchConfig>(DEFAULT_ROOM_SEARCH_CONFIG);

  // 🔍 PUBLIC OBSERVABLES
  public searchParams$ = this.searchParamsSubject.asObservable();
  public filters$ = this.filtersSubject.asObservable();
  public config$ = this.configSubject.asObservable();

  constructor(private roomService: RoomService) {}

  // ================================
  // 🔍 BÚSQUEDA PRINCIPAL
  // ================================

  searchRooms(params: RoomSearchParams): Observable<Room[]> {
    this.updateSearchParams(params);
    
    return this.roomService.getRooms().pipe(
      map(rooms => this.filterBySearchParams(rooms, params))
    );
  }

  searchWithFilters(params: RoomSearchParams, filters: RoomFilters): Observable<Room[]> {
    return this.roomService.searchWithFilters({
      roomTypes: this.getActiveRoomTypes(filters),
      capacity: params.guests,
      priceRange: {
        min: filters.minPrice,
        max: filters.maxPrice
      },
      amenities: this.getActiveAmenities(filters),
      minRating: filters.minRating,
      availableDates: params.checkIn && params.checkOut ? {
        checkIn: params.checkIn,
        checkOut: params.checkOut
      } : undefined
    });
  }

  getFilteredResults(): Observable<Room[]> {
    return combineLatest([
      this.roomService.getRooms(),
      this.searchParams$,
      this.filters$,
      this.config$
    ]).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      map(([rooms, searchParams, filters, config]) => {
        let filtered = this.filterBySearchParams(rooms, searchParams);

        filtered = this.applyRoomFilters(filtered, filters);
        filtered = this.roomService.sortRooms(filtered, config.sortBy);
        
        return filtered;
      })
    );
  }

  searchByText(searchTerm: string): Observable<Room[]> {
    return this.roomService.searchByText(searchTerm);
  }

  // ================================
  // 🎛️ FILTROS ESPECÍFICOS PARA HABITACIONES
  // ================================

  private applyRoomFilters(rooms: Room[], filters: RoomFilters): Room[] {
    return rooms.filter(room => {
      // Filtrar por tipos de habitación
      const roomTypeMatch = !this.hasActiveRoomTypeFilters(filters) || 
        filters.roomTypes[room.roomType];

      // Filtrar por amenidades
      const amenityMatch = !this.hasActiveAmenityFilters(filters) || 
        this.checkAmenitiesMatch(room.amenities, filters.amenities);

      // Filtrar por características especiales
      const featureMatch = this.checkFeaturesMatch(room, filters.features);

      // Filtrar por capacidad
      const capacityMatch = this.checkCapacityMatch(room.maxGuests, filters.capacity);

      // Filtrar por rango de precios
      const priceMatch = room.pricing.basePrice >= filters.minPrice && 
                        room.pricing.basePrice <= filters.maxPrice;

      // Filtrar por calificación
      const ratingMatch = room.stats.rating >= filters.minRating;

      // Filtrar por huéspedes máximos
      const guestMatch = room.maxGuests >= filters.maxGuests;

      // Solo habitaciones disponibles (si está activado)
      const availabilityMatch = !filters.availableOnly || 
        (room.availability.isActive && room.availability.isAvailable);

      return roomTypeMatch && amenityMatch && featureMatch && capacityMatch && 
             priceMatch && ratingMatch && guestMatch && availabilityMatch;
    });
  }

  private checkAmenitiesMatch(roomAmenities: RoomAmenityType[], filterAmenities: any): boolean {
    const activeAmenities = Object.entries(filterAmenities)
      .filter(([_, active]) => active)
      .map(([amenity, _]) => amenity as RoomAmenityType);

    return activeAmenities.length === 0 || 
           activeAmenities.every(amenity => roomAmenities.includes(amenity));
  }

  private checkFeaturesMatch(room: Room, features: any): boolean {
    const checks = {
      hasWorkspace: () => room.amenities.includes('escritorio') && room.amenities.includes('silla-trabajo'),
      hasBalcony: () => room.amenities.includes('balcon'),
      hasPrivateBathroom: () => room.bathroomType === 'privado',
      hasAirConditioning: () => room.amenities.includes('aire-acondicionado'),
      hasSmartTV: () => room.amenities.includes('tv-smart'),
      hasSafe: () => room.amenities.includes('caja-fuerte')
    };

    return Object.entries(features).every(([feature, active]) => {
      if (!active) return true;
      const checkFn = checks[feature as keyof typeof checks];
      return checkFn ? checkFn() : true;
    });
  }

  private checkCapacityMatch(roomCapacity: number, capacityFilters: any): boolean {
    const activeCapacities = Object.entries(capacityFilters)
      .filter(([_, active]) => active)
      .map(([capacity, _]) => capacity);

    if (activeCapacities.length === 0) return true;

    return activeCapacities.some(capacity => {
      switch (capacity) {
        case 'guests1': return roomCapacity >= 1;
        case 'guests2': return roomCapacity >= 2;
        case 'guests3': return roomCapacity >= 3;
        case 'guests4Plus': return roomCapacity >= 4;
        default: return true;
      }
    });
  }

  // ================================
  // 🎛️ GESTIÓN DE ESTADO
  // ================================

  updateSearchParams(params: Partial<RoomSearchParams>): void {
    const current = this.searchParamsSubject.value;
    this.searchParamsSubject.next({ ...current, ...params });
  }

  updateFilters(filters: Partial<RoomFilters>): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({ ...current, ...filters });
  }

  updateRoomTypeFilter(type: RoomType, active: boolean): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      roomTypes: {
        ...current.roomTypes,
        [type]: active
      }
    });
  }

  updateAmenityFilter(amenity: RoomAmenityType, active: boolean): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      amenities: {
        ...current.amenities,
        [amenity]: active
      }
    });
  }

  updatePriceRange(min: number, max: number): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      minPrice: min,
      maxPrice: max
    });
  }

  updateCapacityFilter(guests: number): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      maxGuests: guests
    });
  }

  clearFilters(): void {
    this.filtersSubject.next(DEFAULT_ROOM_FILTERS);
  }

  applyQuickFilter(filterType: 'business' | 'family' | 'romantic' | 'budget'): void {
    let quickFilters: Partial<RoomFilters>;
    
    switch (filterType) {
      case 'business':
        quickFilters = {
          roomTypes: { ...DEFAULT_ROOM_FILTERS.roomTypes, doble: true },
          amenities: { 
            ...DEFAULT_ROOM_FILTERS.amenities, 
            'escritorio': true,
            'aire-acondicionado': true,
            'tv-smart': true 
          },
          features: { 
            ...DEFAULT_ROOM_FILTERS.features, 
            hasWorkspace: true 
          }
        };
        break;
        
      case 'family':
        quickFilters = {
          roomTypes: { 
            ...DEFAULT_ROOM_FILTERS.roomTypes, 
            familiar: true, 
            triple: true 
          },
          capacity: { 
            ...DEFAULT_ROOM_FILTERS.capacity, 
            guests4Plus: true 
          }
        };
        break;
        
      case 'romantic':
        quickFilters = {
          roomTypes: { 
            ...DEFAULT_ROOM_FILTERS.roomTypes, 
            suite: true 
          },
          amenities: { 
            ...DEFAULT_ROOM_FILTERS.amenities, 
            'balcon': true,
            'minibar': true 
          },
          features: { 
            ...DEFAULT_ROOM_FILTERS.features, 
            hasBalcony: true 
          }
        };
        break;
        
      case 'budget':
        quickFilters = {
          priceRange: { 
            ...DEFAULT_ROOM_FILTERS.priceRange, 
            budget: true 
          },
          maxPrice: 60000
        };
        break;
        
      default:
        quickFilters = {};
    }
    
    this.updateFilters(quickFilters);
  }

  updateConfig(config: Partial<RoomSearchConfig>): void {
    const current = this.configSubject.value;
    this.configSubject.next({ ...current, ...config });
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.updateConfig({ viewMode: mode });
  }

  setSortBy(sortBy: string): void {
    this.updateConfig({ sortBy });
  }

  setCurrentPage(page: number): void {
    this.updateConfig({ currentPage: page });
  }

  // ================================
  // 📊 INFORMACIÓN Y ESTADÍSTICAS
  // ================================

  getFilterState(): Observable<FilterState> {
    return this.filters$.pipe(
      map(filters => ({
        activeFilters: filters,
        hasActiveFilters: this.hasAnyActiveFilters(filters),
        filterCount: this.countActiveFilters(filters)
      }))
    );
  }

  getRoomSuggestions(): RoomSuggestion[] {
    return ROOM_SUGGESTIONS;
  }

  getSearchStats(): Observable<RoomSearchStats> {
    return this.getFilteredResults().pipe(
      map(rooms => ({
        totalResults: rooms.length,
        availableRooms: rooms.filter(r => r.availability.isAvailable).length,
        averagePrice: rooms.length > 0 
          ? Math.round(rooms.reduce((sum, r) => sum + r.pricing.basePrice, 0) / rooms.length)
          : 0,
        priceRange: {
          min: rooms.length > 0 ? Math.min(...rooms.map(r => r.pricing.basePrice)) : 0,
          max: rooms.length > 0 ? Math.max(...rooms.map(r => r.pricing.basePrice)) : 0
        },
        mostPopularType: this.getMostPopularRoomType(rooms),
        averageRating: rooms.length > 0 
          ? Math.round((rooms.reduce((sum, r) => sum + r.stats.rating, 0) / rooms.length) * 10) / 10
          : 0
      }))
    );
  }

  // ================================
  //  VALIDACIÓN Y UTILIDADES
  // ================================

  validateSearchDates(checkIn: string, checkOut: string): { valid: boolean; error?: string } {
    if (!checkIn || !checkOut) {
      return { valid: false, error: 'Fechas de llegada y salida son requeridas' };
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return { valid: false, error: 'La fecha de llegada no puede ser en el pasado' };
    }

    if (checkOutDate <= checkInDate) {
      return { valid: false, error: 'La fecha de salida debe ser posterior a la llegada' };
    }

    const nights = this.calculateNights(checkIn, checkOut);
    if (nights > 90) {
      return { valid: false, error: 'La estancia no puede ser mayor a 90 días' };
    }

    return { valid: true };
  }

  calculateNights(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  getRecommendations(params?: RoomSearchParams): Observable<Room[]> {
    if (params?.guests) {
      return this.roomService.getRoomsByCapacity(params.guests);
    } else {
      return this.roomService.getFeaturedRooms();
    }
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS
  // ================================

  private filterBySearchParams(rooms: Room[], params: RoomSearchParams): Room[] {
    let filtered = [...rooms];

    // Filtrar por capacidad de huéspedes
    if (params.guests > 0) {
      filtered = filtered.filter(room => room.maxGuests >= params.guests);
    }

    // Filtrar por tipo de habitación específico
    if (params.roomType) {
      filtered = filtered.filter(room => room.roomType === params.roomType);
    }

    // Solo habitaciones activas y disponibles
    filtered = filtered.filter(room => 
      room.availability.isActive && room.availability.isAvailable
    );

    return filtered;
  }

  private getActiveRoomTypes(filters: RoomFilters): RoomType[] {
    return Object.entries(filters.roomTypes)
      .filter(([_, active]) => active)
      .map(([type, _]) => type as RoomType);
  }

  private getActiveAmenities(filters: RoomFilters): RoomAmenityType[] {
    return Object.entries(filters.amenities)
      .filter(([_, active]) => active)
      .map(([amenity, _]) => amenity as RoomAmenityType);
  }

  private hasActiveRoomTypeFilters(filters: RoomFilters): boolean {
    return Object.values(filters.roomTypes).some(filter => filter);
  }

  private hasActiveAmenityFilters(filters: RoomFilters): boolean {
    return Object.values(filters.amenities).some(filter => filter);
  }

  private hasAnyActiveFilters(filters: RoomFilters): boolean {
    return this.hasActiveRoomTypeFilters(filters) ||
           this.hasActiveAmenityFilters(filters) ||
           Object.values(filters.features).some(filter => filter) ||
           Object.values(filters.capacity).some(filter => filter) ||
           Object.values(filters.priceRange).some(filter => filter) ||
           filters.minRating > 0 ||
           filters.minPrice > 0 ||
           filters.maxPrice < 200000;
  }

  private countActiveFilters(filters: RoomFilters): number {
    let count = 0;
    
    count += Object.values(filters.roomTypes).filter(active => active).length;
    count += Object.values(filters.amenities).filter(active => active).length;
    count += Object.values(filters.features).filter(active => active).length;
    count += Object.values(filters.capacity).filter(active => active).length;
    count += Object.values(filters.priceRange).filter(active => active).length;
    
    if (filters.minRating > 0) count++;
    if (filters.minPrice > 0 || filters.maxPrice < 200000) count++;
    
    return count;
  }

  private getMostPopularRoomType(rooms: Room[]): RoomType {
    if (rooms.length === 0) return 'doble';
    
    const typeCount = rooms.reduce((acc, room) => {
      acc[room.roomType] = (acc[room.roomType] || 0) + 1;
      return acc;
    }, {} as Record<RoomType, number>);
    
    return Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as RoomType || 'doble';
  }
}

