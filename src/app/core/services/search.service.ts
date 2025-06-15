// 📁 src/app/core/services/search.service.ts
// SEARCH SERVICE PARA HABITACIONES DEL NORTE DE ARMENIA

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Importar tipos actualizados
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

  /**
   * Realizar búsqueda de habitaciones con parámetros específicos
   */
  searchProperties(params: SearchParams): Observable<Property[]> {
    this.updateSearchParams(params);
    
    return this.propertyService.getProperties().pipe(
      map(properties => this.filterBySearchParams(properties, params))
    );
  }

  /**
   * Búsqueda avanzada con filtros específicos para habitaciones urbanas
   */
  searchWithFilters(params: SearchParams, filters: Filters): Observable<Property[]> {
    return this.propertyService.searchWithFilters(params, filters);
  }

  /**
   * Obtener resultados filtrados y ordenados (método principal)
   */
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
        // 1. Filtrar por parámetros de búsqueda
        let filtered = this.filterBySearchParams(properties, searchParams);
        
        // 2. Aplicar filtros urbanos
        filtered = this.applyUrbanFilters(filtered, filters);
        
        // 3. Ordenar resultados
        filtered = this.sortProperties(filtered, config.sortBy);
        
        return filtered;
      })
    );
  }

  /**
   * Búsqueda por texto libre (nombre, descripción, zona, anfitrión)
   */
  searchByText(searchTerm: string): Observable<Property[]> {
    return this.propertyService.searchProperties(searchTerm);
  }

  // ================================
  // 🎛️ FILTROS ESPECÍFICOS PARA HABITACIONES URBANAS
  // ================================

  /**
   * Aplicar filtros específicos para habitaciones del norte de Armenia
   */
  private applyUrbanFilters(properties: Property[], filters: Filters): Property[] {
    return properties.filter(property => {
      // Filtro por zonas del norte
      const zoneMatch = !this.hasActiveZoneFilters(filters) || 
        filters.zones[property.zone];

      // Filtro por tipos de alojamiento urbano
      const propertyTypeMatch = !this.hasActivePropertyTypeFilters(filters) || 
        filters.propertyTypes[property.propertyType];

      // Filtro por amenidades urbanas
      const amenityMatch = !this.hasActiveAmenityFilters(filters) || 
        this.checkAmenitiesMatch(property.amenities, filters.amenities);

      // Filtro por servicios urbanos
      const serviceMatch = !this.hasActiveServiceFilters(filters) || 
        this.checkServicesMatch(property.services, filters.services);

      // Filtro por calificación mínima
      const ratingMatch = property.rating >= filters.minRating;

      // Filtro por rango de precios
      const priceMatch = property.pricePerNight >= filters.priceMin && 
                        property.pricePerNight <= filters.priceMax;

      // Filtro por número máximo de huéspedes
      const guestMatch = property.maxGuests >= filters.maxGuests;

      // Filtros especiales
      const verifiedMatch = !filters.verified || property.isVerified;
      const instantBookMatch = !filters.instantBook || property.isInstantBook;

      return zoneMatch && propertyTypeMatch && amenityMatch && serviceMatch && 
             ratingMatch && priceMatch && guestMatch && verifiedMatch && instantBookMatch;
    });
  }

  /**
   * Verificar coincidencia de amenidades (requiere que todas las seleccionadas estén presentes)
   */
  private checkAmenitiesMatch(propertyAmenities: AmenityType[], filterAmenities: any): boolean {
    const activeAmenities = Object.entries(filterAmenities)
      .filter(([_, active]) => active)
      .map(([amenity, _]) => amenity as AmenityType);

    return activeAmenities.length === 0 || 
           activeAmenities.every(amenity => propertyAmenities.includes(amenity));
  }

  /**
   * Verificar coincidencia de servicios (requiere que todos los seleccionados estén presentes)
   */
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

  /**
   * Ordenar propiedades según criterio específico para habitaciones urbanas
   */
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
        // Ordenar por cercanía al centro (Norte Centro es más cercano)
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
        // Relevancia: verificados primero, luego por rating y ubicación
        return sorted.sort((a, b) => {
          // Prioridad 1: Verificados
          if (a.isVerified !== b.isVerified) {
            return a.isVerified ? -1 : 1;
          }
          
          // Prioridad 2: Rating
          if (Math.abs(a.rating - b.rating) > 0.1) {
            return b.rating - a.rating;
          }
          
          // Prioridad 3: Cercanía al centro
          const aDistance = this.getDistanceToCenter(a.zone);
          const bDistance = this.getDistanceToCenter(b.zone);
          return aDistance - bDistance;
        });
    }
  }

  /**
   * Obtener distancia simulada al centro (Norte Centro = 1, Villa Liliana = 2, etc.)
   */
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

  /**
   * Actualizar parámetros de búsqueda
   */
  updateSearchParams(params: Partial<SearchParams>): void {
    const current = this.searchParamsSubject.value;
    this.searchParamsSubject.next({ ...current, ...params });
  }

  /**
   * Actualizar filtros específicos
   */
  updateFilters(filters: Partial<Filters>): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({ ...current, ...filters });
  }

  /**
   * Actualizar filtro de zona específica
   */
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

  /**
   * Actualizar filtro de tipo de propiedad
   */
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

  /**
   * Actualizar filtro de amenidad
   */
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

  /**
   * Actualizar filtro de servicio
   */
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

  /**
   * Limpiar todos los filtros
   */
  clearFilters(): void {
    this.filtersSubject.next(DEFAULT_FILTERS);
  }

  /**
   * Aplicar filtros predefinidos para viajeros de negocios
   */
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

  /**
   * Actualizar configuración de resultados
   */
  updateConfig(config: Partial<SearchResultsConfig>): void {
    const current = this.configSubject.value;
    this.configSubject.next({ ...current, ...config });
  }

  /**
   * Cambiar modo de vista
   */
  setViewMode(mode: 'list' | 'map'): void {
    this.updateConfig({ viewMode: mode });
  }

  /**
   * Cambiar criterio de ordenamiento
   */
  setSortBy(sortBy: string): void {
    this.updateConfig({ sortBy });
  }

  /**
   * Cambiar página actual
   */
  setCurrentPage(page: number): void {
    this.updateConfig({ currentPage: page });
  }

  // ================================
  // 📊 INFORMACIÓN Y ESTADÍSTICAS
  // ================================

  /**
   * Obtener estado actual de filtros
   */
  getFilterState(): Observable<FilterState> {
    return this.filters$.pipe(
      map(filters => ({
        activeFilters: filters,
        hasActiveFilters: this.hasAnyActiveFilters(filters),
        filterCount: this.countActiveFilters(filters)
      }))
    );
  }

  /**
   * Obtener sugerencias de zonas del norte de Armenia
   */
  getZoneSuggestions(): QuickSuggestion[] {
    return QUICK_SUGGESTIONS;
  }

  /**
   * Obtener nombres de zonas disponibles
   */
  getAvailableZones(): { key: ZoneType; name: string; description: string }[] {
    return Object.entries(ARMENIA_NORTH_ZONES).map(([key, value]) => ({
      key: key as ZoneType,
      name: value.name,
      description: value.description
    }));
  }

  /**
   * Obtener estadísticas de búsqueda actual
   */
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
  // ✅ VALIDACIÓN Y UTILIDADES
  // ================================

  /**
   * Validar fechas de búsqueda para habitaciones
   */
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

  /**
   * Calcular número de noches
   */
  calculateNights(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Calcular precio total estimado
   */
  calculateTotalPrice(pricePerNight: number, checkIn: string, checkOut: string): number {
    const nights = this.calculateNights(checkIn, checkOut);
    return pricePerNight * nights;
  }

  /**
   * Obtener recomendaciones basadas en búsqueda actual
   */
  getRecommendations(): Observable<Property[]> {
    const currentParams = this.searchParamsSubject.value;
    
    if (currentParams.destination) {
      // Recomendar propiedades en la misma zona
      return this.propertyService.getPropertiesByZone(currentParams.destination as ZoneType);
    } else {
      // Recomendar propiedades mejor calificadas
      return this.propertyService.getTopRatedProperties(3);
    }
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS
  // ================================

  private filterBySearchParams(properties: Property[], params: SearchParams): Property[] {
    let filtered = [...properties];

    // Filtrar por zona específica
    if (params.destination) {
      filtered = filtered.filter(property => 
        property.zone === params.destination ||
        property.location.toLowerCase().includes(params.destination.toLowerCase())
      );
    }

    // Filtrar por capacidad de huéspedes
    if (params.guests > 0) {
      filtered = filtered.filter(property => property.maxGuests >= params.guests);
    }

    // En una aplicación real, aquí filtrarías por disponibilidad de fechas
    // if (params.checkIn && params.checkOut) {
    //   filtered = this.filterByAvailability(filtered, params.checkIn, params.checkOut);
    // }

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