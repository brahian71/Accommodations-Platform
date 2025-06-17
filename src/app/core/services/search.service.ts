// 📁 src/app/core/services/search.service.ts

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { 
  Property, 
  ZoneType, 
  PropertyType, 
  AmenityType, 
  ServiceType,
  ARMENIA_NORTH_ZONES 
} from '../models/property.interface';

import { 
  SearchParams, 
  Filters, 
  FilterState, 
  SearchResultsConfig,
  QuickSuggestion,
  DEFAULT_FILTERS,
  DEFAULT_SEARCH_RESULTS_CONFIG,
  DEFAULT_SEARCH_PARAMS,
  QUICK_SUGGESTIONS 
} from '../models/search.interface';

import { PropertyService } from './property.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  // 📱 REACTIVE STATE
  private searchParamsSubject = new BehaviorSubject<SearchParams>(DEFAULT_SEARCH_PARAMS);
  private filtersSubject = new BehaviorSubject<Filters>(DEFAULT_FILTERS);
  private configSubject = new BehaviorSubject<SearchResultsConfig>(DEFAULT_SEARCH_RESULTS_CONFIG);

  // 🔍 PUBLIC OBSERVABLES
  public searchParams$ = this.searchParamsSubject.asObservable();
  public filters$ = this.filtersSubject.asObservable();
  public config$ = this.configSubject.asObservable();

  constructor(private propertyService: PropertyService) {}

  // ================================
  // 🔍 BÚSQUEDA PRINCIPAL
  // ================================

  searchProperties(params: SearchParams): Observable<Property[]> {
    this.updateSearchParams(params);
    
    return this.propertyService.getProperties().pipe(
      map(properties => this.filterBySearchParams(properties, params))
    );
  }

  searchWithFilters(params: SearchParams, filters: Filters): Observable<Property[]> {
    return this.propertyService.searchWithFilters(params, filters);
  }

  getFilteredResults(): Observable<Property[]> {
    return combineLatest([
      this.propertyService.getProperties(),
      this.searchParams$,
      this.filters$,
      this.config$
    ]).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      map(([properties, searchParams, filters, config]) => {
        let filtered = this.filterBySearchParams(properties, searchParams);

        filtered = this.applyUrbanFilters(filtered, filters);
        filtered = this.sortProperties(filtered, config.sortBy);
        
        return filtered;
      })
    );
  }

  searchByText(searchTerm: string): Observable<Property[]> {
    return this.propertyService.searchProperties(searchTerm);
  }

  // ================================
  // 🎛️ FILTROS ESPECÍFICOS PARA HABITACIONES URBANAS
  // ================================

  private applyUrbanFilters(properties: Property[], filters: Filters): Property[] {
    return properties.filter(property => {
      const zoneMatch = !this.hasActiveZoneFilters(filters) || 
        filters.zones[property.zone];

      const propertyTypeMatch = !this.hasActivePropertyTypeFilters(filters) || 
        filters.propertyTypes[property.propertyType];

      const amenityMatch = !this.hasActiveAmenityFilters(filters) || 
        this.checkAmenitiesMatch(property.amenities, filters.amenities);

      const serviceMatch = !this.hasActiveServiceFilters(filters) || 
        this.checkServicesMatch(property.services, filters.services);

      const ratingMatch = property.rating >= filters.minRating;

      const priceMatch = property.pricePerNight >= filters.priceMin && 
                        property.pricePerNight <= filters.priceMax;

      const guestMatch = property.maxGuests >= filters.maxGuests;

      const verifiedMatch = !filters.verified || property.isVerified;
      const instantBookMatch = !filters.instantBook || property.isInstantBook;

      return zoneMatch && propertyTypeMatch && amenityMatch && serviceMatch && 
             ratingMatch && priceMatch && guestMatch && verifiedMatch && instantBookMatch;
    });
  }

  private checkAmenitiesMatch(propertyAmenities: AmenityType[], filterAmenities: any): boolean {
    const activeAmenities = Object.entries(filterAmenities)
      .filter(([_, active]) => active)
      .map(([amenity, _]) => amenity as AmenityType);

    return activeAmenities.length === 0 || 
           activeAmenities.every(amenity => propertyAmenities.includes(amenity));
  }

  private checkServicesMatch(propertyServices: ServiceType[], filterServices: any): boolean {
    const activeServices = Object.entries(filterServices)
      .filter(([_, active]) => active)
      .map(([service, _]) => service as ServiceType);

    return activeServices.length === 0 || 
           activeServices.every(service => propertyServices.includes(service));
  }

  // ================================
  // 📊 ORDENAMIENTO MEJORADO
  // ================================

  sortProperties(properties: Property[], sortBy: string): Property[] {
    const sorted = [...properties];
    
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.pricePerNight - b.pricePerNight);
      
      case 'price-desc':
        return sorted.sort((a, b) => b.pricePerNight - a.pricePerNight);
      
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      
      case 'reviews':
        return sorted.sort((a, b) => b.reviewsCount - a.reviewsCount);

      case 'distance':
        return sorted.sort((a, b) => {
          const aDistance = this.getDistanceToCenter(a.zone);
          const bDistance = this.getDistanceToCenter(b.zone);
          return aDistance - bDistance;
        });
      
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      
      case 'relevance':
      default:
        return sorted.sort((a, b) => {
          if (a.isVerified !== b.isVerified) {
            return a.isVerified ? -1 : 1;
          }

          if (Math.abs(a.rating - b.rating) > 0.1) {
            return b.rating - a.rating;
          }

          const aDistance = this.getDistanceToCenter(a.zone);
          const bDistance = this.getDistanceToCenter(b.zone);
          return aDistance - bDistance;
        });
    }
  }
  private getDistanceToCenter(zone: ZoneType): number {
    const distances = {
      'norte-centro': 1,
      'villa-liliana': 2,
      'la-secreta': 3,
      'bosques-pinares': 4,
      'ciudadela-del-cafe': 5
    };
    return distances[zone] || 6;
  }

  // ================================
  // 🎛️ GESTIÓN DE ESTADO
  // ================================

  updateSearchParams(params: Partial<SearchParams>): void {
    const current = this.searchParamsSubject.value;
    this.searchParamsSubject.next({ ...current, ...params });
  }

  updateFilters(filters: Partial<Filters>): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({ ...current, ...filters });
  }

  updateZoneFilter(zone: ZoneType, active: boolean): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      zones: {
        ...current.zones,
        [zone]: active
      }
    });
  }

  updatePropertyTypeFilter(type: PropertyType, active: boolean): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      propertyTypes: {
        ...current.propertyTypes,
        [type]: active
      }
    });
  }

  updateAmenityFilter(amenity: AmenityType, active: boolean): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      amenities: {
        ...current.amenities,
        [amenity]: active
      }
    });
  }

  updateServiceFilter(service: ServiceType, active: boolean): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      services: {
        ...current.services,
        [service]: active
      }
    });
  }

  clearFilters(): void {
    this.filtersSubject.next(DEFAULT_FILTERS);
  }

  applyBusinessFilters(): void {
    const businessFilters: Partial<Filters> = {
      zones: {
        ...DEFAULT_FILTERS.zones,
        'norte-centro': true,
        'villa-liliana': true
      },
      amenities: {
        ...DEFAULT_FILTERS.amenities,
        wifi: true,
        ac: true
      },
      services: {
        ...DEFAULT_FILTERS.services,
        'late-checkin': true
      },
      verified: true
    };
    
    this.updateFilters(businessFilters);
  }

  updateConfig(config: Partial<SearchResultsConfig>): void {
    const current = this.configSubject.value;
    this.configSubject.next({ ...current, ...config });
  }

  setViewMode(mode: 'list' | 'map'): void {
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

  getZoneSuggestions(): QuickSuggestion[] {
    return QUICK_SUGGESTIONS;
  }

  getAvailableZones(): { key: ZoneType; name: string; description: string }[] {
    return Object.entries(ARMENIA_NORTH_ZONES).map(([key, value]) => ({
      key: key as ZoneType,
      name: value.name,
      description: value.description
    }));
  }

  getSearchStats(): Observable<{
    totalResults: number;
    averagePrice: number;
    availableZones: string[];
    topRatedCount: number;
  }> {
    return this.getFilteredResults().pipe(
      map(properties => ({
        totalResults: properties.length,
        averagePrice: properties.length > 0 
          ? Math.round(properties.reduce((sum, p) => sum + p.pricePerNight, 0) / properties.length)
          : 0,
        availableZones: [...new Set(properties.map(p => ARMENIA_NORTH_ZONES[p.zone].name))],
        topRatedCount: properties.filter(p => p.rating >= 4.5).length
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
    if (nights > 365) {
      return { valid: false, error: 'La estancia no puede ser mayor a 365 días' };
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

  calculateTotalPrice(pricePerNight: number, checkIn: string, checkOut: string): number {
    const nights = this.calculateNights(checkIn, checkOut);
    return pricePerNight * nights;
  }

  getRecommendations(): Observable<Property[]> {
    const currentParams = this.searchParamsSubject.value;
    
    if (currentParams.destination) {
      return this.propertyService.getPropertiesByZone(currentParams.destination as ZoneType);
    } else {
      return this.propertyService.getTopRatedProperties(3);
    }
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS
  // ================================

  private filterBySearchParams(properties: Property[], params: SearchParams): Property[] {
    let filtered = [...properties];

    if (params.destination) {
      filtered = filtered.filter(property => 
        property.zone === params.destination ||
        property.location.toLowerCase().includes(params.destination.toLowerCase())
      );
    }
    if (params.guests > 0) {
      filtered = filtered.filter(property => property.maxGuests >= params.guests);
    }

    return filtered;
  }

  private hasActiveZoneFilters(filters: Filters): boolean {
    return Object.values(filters.zones).some(filter => filter);
  }

  private hasActivePropertyTypeFilters(filters: Filters): boolean {
    return Object.values(filters.propertyTypes).some(filter => filter);
  }

  private hasActiveAmenityFilters(filters: Filters): boolean {
    return Object.values(filters.amenities).some(filter => filter);
  }

  private hasActiveServiceFilters(filters: Filters): boolean {
    return Object.values(filters.services).some(filter => filter);
  }

  private hasAnyActiveFilters(filters: Filters): boolean {
    return this.hasActiveZoneFilters(filters) ||
           this.hasActivePropertyTypeFilters(filters) ||
           this.hasActiveAmenityFilters(filters) ||
           this.hasActiveServiceFilters(filters) ||
           filters.minRating > 0 ||
           filters.priceMin > 0 ||
           filters.priceMax < 200000 ||
           filters.verified ||
           filters.instantBook;
  }

  private countActiveFilters(filters: Filters): number {
    let count = 0;
    
    count += Object.values(filters.zones).filter(active => active).length;
    count += Object.values(filters.propertyTypes).filter(active => active).length;
    count += Object.values(filters.amenities).filter(active => active).length;
    count += Object.values(filters.services).filter(active => active).length;
    
    if (filters.minRating > 0) count++;
    if (filters.priceMin > 0 || filters.priceMax < 200000) count++;
    if (filters.verified) count++;
    if (filters.instantBook) count++;
    
    return count;
  }
}