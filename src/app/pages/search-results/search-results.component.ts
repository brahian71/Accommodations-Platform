// 📁 src/app/pages/search-results/search-results.component.ts
// VERSIÓN CORREGIDA - OBSERVABLES INICIALIZADOS

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

// Importar tipos actualizados
import { 
  Property, 
  ZoneType, 
  PropertyType, 
  AmenityType, 
  ServiceType,
  ARMENIA_NORTH_ZONES,
  PROPERTY_TYPE_LABELS,
  AMENITY_LABELS,
  SERVICE_LABELS
} from '../../core/models/property.interface';

import { 
  SearchParams, 
  Filters, 
  SortOption,
  SearchResultsConfig,
  SORT_OPTIONS,
  DEFAULT_FILTERS,
  DEFAULT_SEARCH_RESULTS_CONFIG,
  DEFAULT_SEARCH_PARAMS
} from '../../core/models/search.interface';

import { PropertyService } from '../../core/services/property.service';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss']
})
export class SearchResultsComponent implements OnInit, OnDestroy {

  // 🎯 REACTIVE DATA - ✅ OBSERVABLES INICIALIZADOS
  filteredProperties$: Observable<Property[]> = of([]);
  searchParams$: Observable<SearchParams> = of(DEFAULT_SEARCH_PARAMS);
  filters$: Observable<Filters> = of(DEFAULT_FILTERS);
  config$: Observable<SearchResultsConfig> = of(DEFAULT_SEARCH_RESULTS_CONFIG);

  // 📊 STATE
  isLoading = false;
  searchError: string | null = null;
  totalResults = 0;

  // 🔍 SEARCH DATA
  searchData: SearchParams = {
    destination: '',
    checkIn: '',
    checkOut: '',
    guests: 2
  };

  // 📱 SUBJECTS
  private searchParamsSubject = new BehaviorSubject<SearchParams>(this.searchData);
  private filtersSubject = new BehaviorSubject<Filters>(DEFAULT_FILTERS);
  private configSubject = new BehaviorSubject<SearchResultsConfig>(DEFAULT_SEARCH_RESULTS_CONFIG);

  // 🧹 CLEANUP
  private destroy$ = new Subject<void>();

  // 📅 COMPUTED PROPERTIES
  readonly today = new Date().toISOString().split('T')[0];
  readonly tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // 🗺️ CONFIGURACIONES ESTÁTICAS
  readonly northZones = Object.entries(ARMENIA_NORTH_ZONES).map(([key, value]) => ({
    key: key as ZoneType,
    name: value.name,
    description: value.description,
    icon: value.icon
  }));

  readonly sortOptions = SORT_OPTIONS;
  readonly itemsPerPageOptions = [5, 10, 20, 50];

  // 🔄 FILTROS ACTUALES (para UI)
  currentMinRating = 0;

  constructor(
    private propertyService: PropertyService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initializeObservables();
  }

  ngOnInit(): void {
    this.loadSearchParamsFromRoute();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ================================
  // 🔄 INICIALIZACIÓN
  // ================================

  private initializeObservables(): void {
    this.searchParams$ = this.searchParamsSubject.asObservable();
    this.filters$ = this.filtersSubject.asObservable();
    this.config$ = this.configSubject.asObservable();

    // Combinar parámetros de búsqueda y filtros para obtener resultados
    this.filteredProperties$ = combineLatest([
      this.searchParams$,
      this.filters$,
      this.config$
    ]).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(([searchParams, filters, config]) => 
        this.propertyService.getProperties().pipe(
          map(properties => this.applyFiltersAndSort(properties, searchParams, filters, config))
        )
      )
    );
  }

  private loadSearchParamsFromRoute(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const searchParams: SearchParams = {
          destination: params['zone'] || params['destination'] || '',
          checkIn: params['checkIn'] || '',
          checkOut: params['checkOut'] || '',
          guests: +params['guests'] || 2
        };

        this.searchData = { ...searchParams };
        this.searchParamsSubject.next(searchParams);
      });
  }

  private setupSearch(): void {
    this.filteredProperties$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (properties) => {
          this.totalResults = properties.length;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.searchError = 'Error buscando habitaciones. Inténtalo de nuevo.';
          console.error('❌ Error en búsqueda:', error);
        }
      });
  }

  // ================================
  // 🔍 APLICAR FILTROS Y ORDENAMIENTO
  // ================================

  private applyFiltersAndSort(
    properties: Property[],
    searchParams: SearchParams, 
    filters: Filters, 
    config: SearchResultsConfig
  ): Property[] {
    let filtered = [...properties];

    // Aplicar búsqueda por zona
    if (searchParams.destination) {
      filtered = filtered.filter(p => p.zone === searchParams.destination);
    }

    // Aplicar filtro de huéspedes
    if (searchParams.guests) {
      filtered = filtered.filter(p => p.maxGuests >= searchParams.guests);
    }

    // Aplicar filtros de zona
    if (filters.zones) {
      const activeZones = Object.entries(filters.zones)
        .filter(([_, active]) => active)
        .map(([zone, _]) => zone as ZoneType);
      
      if (activeZones.length > 0) {
        filtered = filtered.filter(p => activeZones.includes(p.zone));
      }
    }

    // Aplicar filtros de tipo de propiedad
    if (filters.propertyTypes) {
      const activeTypes = Object.entries(filters.propertyTypes)
        .filter(([_, active]) => active)
        .map(([type, _]) => type as PropertyType);
      
      if (activeTypes.length > 0) {
        filtered = filtered.filter(p => activeTypes.includes(p.propertyType));
      }
    }

    // Aplicar filtros de amenidades
    if (filters.amenities) {
      const activeAmenities = Object.entries(filters.amenities)
        .filter(([_, active]) => active)
        .map(([amenity, _]) => amenity as AmenityType);
      
      if (activeAmenities.length > 0) {
        filtered = filtered.filter(p => 
          activeAmenities.every(amenity => p.amenities.includes(amenity))
        );
      }
    }

    // Aplicar filtros de servicios
    if (filters.services) {
      const activeServices = Object.entries(filters.services)
        .filter(([_, active]) => active)
        .map(([service, _]) => service as ServiceType);
      
      if (activeServices.length > 0) {
        filtered = filtered.filter(p => 
          activeServices.every(service => p.services.includes(service))
        );
      }
    }

    // Aplicar filtros de precio
    if (filters.priceMin || filters.priceMax) {
      filtered = filtered.filter(p => 
        p.pricePerNight >= (filters.priceMin || 0) &&
        p.pricePerNight <= (filters.priceMax || Infinity)
      );
    }

    // Aplicar filtro de calificación
    if (filters.minRating) {
      filtered = filtered.filter(p => p.rating >= filters.minRating);
    }

    // Aplicar filtros especiales
    if (filters.verified) {
      filtered = filtered.filter(p => p.isVerified);
    }

    if (filters.instantBook) {
      filtered = filtered.filter(p => p.isInstantBook);
    }

    // Aplicar ordenamiento
    return this.sortProperties(filtered, config.sortBy);
  }

  private sortProperties(properties: Property[], sortBy: string): Property[] {
    switch (sortBy) {
      case 'price-asc':
        return properties.sort((a, b) => a.pricePerNight - b.pricePerNight);
      case 'price-desc':
        return properties.sort((a, b) => b.pricePerNight - a.pricePerNight);
      case 'rating':
        return properties.sort((a, b) => b.rating - a.rating);
      case 'reviews':
        return properties.sort((a, b) => b.reviewsCount - a.reviewsCount);
      case 'distance':
        return properties.sort((a, b) => {
          const aDistance = a.zone === 'norte-centro' ? 1 : a.zone === 'villa-liliana' ? 2 : 3;
          const bDistance = b.zone === 'norte-centro' ? 1 : b.zone === 'villa-liliana' ? 2 : 3;
          return aDistance - bDistance;
        });
      case 'newest':
        return properties.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'relevance':
      default:
        return properties.sort((a, b) => {
          if (a.isVerified !== b.isVerified) {
            return a.isVerified ? -1 : 1;
          }
          return b.rating - a.rating;
        });
    }
  }

  // ================================
  // 🎛️ GESTIÓN DE FILTROS
  // ================================

  toggleZone(zone: ZoneType, active: boolean): void {
    const currentFilters = this.filtersSubject.value;
    const updatedFilters = {
      ...currentFilters,
      zones: {
        ...currentFilters.zones,
        [zone]: active
      }
    };
    this.filtersSubject.next(updatedFilters);
  }

  togglePropertyType(type: PropertyType, active: boolean): void {
    const currentFilters = this.filtersSubject.value;
    const updatedFilters = {
      ...currentFilters,
      propertyTypes: {
        ...currentFilters.propertyTypes,
        [type]: active
      }
    };
    this.filtersSubject.next(updatedFilters);
  }

  toggleAmenity(amenity: AmenityType, active: boolean): void {
    const currentFilters = this.filtersSubject.value;
    const updatedFilters = {
      ...currentFilters,
      amenities: {
        ...currentFilters.amenities,
        [amenity]: active
      }
    };
    this.filtersSubject.next(updatedFilters);
  }

  toggleService(service: ServiceType, active: boolean): void {
    const currentFilters = this.filtersSubject.value;
    const updatedFilters = {
      ...currentFilters,
      services: {
        ...currentFilters.services,
        [service]: active
      }
    };
    this.filtersSubject.next(updatedFilters);
  }

  toggleSpecialFilter(filterType: string, active: boolean): void {
    const currentFilters = this.filtersSubject.value;
    const updatedFilters = { ...currentFilters };

    switch (filterType) {
      case 'verified':
        updatedFilters.verified = active;
        break;
      case 'instantBook':
        updatedFilters.instantBook = active;
        break;
      case 'businessFriendly':
        if (active) {
          updatedFilters.amenities = {
            ...updatedFilters.amenities,
            wifi: true,
            ac: true
          };
          updatedFilters.zones = {
            ...updatedFilters.zones,
            'norte-centro': true,
            'villa-liliana': true
          };
        }
        break;
    }

    this.filtersSubject.next(updatedFilters);
  }

  onPriceFilterClick(priceRange: { priceMin: number; priceMax: number }): void {
    const currentFilters = this.filtersSubject.value;
    const updatedFilters = {
      ...currentFilters,
      priceMin: priceRange.priceMin,
      priceMax: priceRange.priceMax
    };
    this.filtersSubject.next(updatedFilters);
  }

  setMinRating(rating: number): void {
    this.currentMinRating = rating;
    const currentFilters = this.filtersSubject.value;
    const updatedFilters = {
      ...currentFilters,
      minRating: rating
    };
    this.filtersSubject.next(updatedFilters);
  }

  clearFilters(): void {
    this.currentMinRating = 0;
    this.filtersSubject.next(DEFAULT_FILTERS);
  }

  // ================================
  // 🔍 BÚSQUEDA
  // ================================

  performSearch(): void {
    this.searchError = null;

    if (!this.validateSearchData()) {
      return;
    }

    this.searchParamsSubject.next({ ...this.searchData });
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        zone: this.searchData.destination,
        checkIn: this.searchData.checkIn,
        checkOut: this.searchData.checkOut,
        guests: this.searchData.guests
      },
      queryParamsHandling: 'merge'
    });
  }

  private validateSearchData(): boolean {
    const { checkIn, checkOut, guests } = this.searchData;
    
    if (checkIn && checkOut && new Date(checkIn) >= new Date(checkOut)) {
      this.searchError = 'La fecha de salida debe ser posterior a la de llegada';
      return false;
    }
    
    if (guests < 1) {
      this.searchError = 'Debe haber al menos 1 huésped';
      return false;
    }
    
    return true;
  }

  resetSearch(): void {
    this.searchData = {
      destination: '',
      checkIn: '',
      checkOut: '',
      guests: 2
    };
    this.clearFilters();
    this.performSearch();
  }

  // ================================
  // 🎛️ CONFIGURACIÓN DE VISTA
  // ================================

  updateSortBy(sortBy: string): void {
    const currentConfig = this.configSubject.value;
    this.configSubject.next({
      ...currentConfig,
      sortBy,
      currentPage: 1
    });
  }

  setViewMode(viewMode: 'list' | 'map'): void {
    const currentConfig = this.configSubject.value;
    this.configSubject.next({
      ...currentConfig,
      viewMode
    });
  }

  updateItemsPerPage(itemsPerPage: number): void {
    const currentConfig = this.configSubject.value;
    this.configSubject.next({
      ...currentConfig,
      itemsPerPage,
      currentPage: 1
    });
  }

  // ================================
  // 📄 PAGINACIÓN
  // ================================

  getPaginatedProperties(): Observable<Property[]> {
    return combineLatest([this.filteredProperties$, this.config$]).pipe(
      map(([properties, config]) => {
        const startIndex = (config.currentPage - 1) * config.itemsPerPage;
        const endIndex = startIndex + config.itemsPerPage;
        return properties.slice(startIndex, endIndex);
      })
    );
  }

  getPageNumbers(): Observable<number[]> {
    return combineLatest([this.filteredProperties$, this.config$]).pipe(
      map(([properties, config]) => {
        const totalPages = Math.ceil(properties.length / config.itemsPerPage);
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      })
    );
  }

  goToPage(page: number): void {
    const currentConfig = this.configSubject.value;
    this.configSubject.next({
      ...currentConfig,
      currentPage: page
    });
  }

  // ================================
  // 🏠 ACCIONES DE PROPIEDADES
  // ================================

  viewProperty(propertyId: string): void {
    this.propertyService.incrementPropertyViews(propertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    this.router.navigate(['/property', propertyId]);
  }

  toggleFavorite(propertyId: string): void {
    this.propertyService.toggleFavorite(propertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isFavorite) => {
          console.log(`${isFavorite ? '❤️' : '🤍'} Favorito actualizado`);
        },
        error: (error) => console.error('❌ Error actualizando favorito:', error)
      });
  }

  quickBook(propertyId: string): void {
    console.log('⚡ Reserva rápida para:', propertyId);
    this.router.navigate(['/booking', propertyId], {
      queryParams: {
        checkIn: this.searchData.checkIn,
        checkOut: this.searchData.checkOut,
        guests: this.searchData.guests
      }
    });
  }

  contactHost(property: Property): void {
    if (property.hostWhatsapp) {
      const message = encodeURIComponent(
        `Hola ${property.hostName}! Me interesa tu habitación "${property.title}" en ${property.location}. ¿Está disponible?`
      );
      window.open(`https://wa.me/${property.hostWhatsapp}?text=${message}`, '_blank');
    }
  }

  selectProperty(propertyId: string): void {
    console.log('🗺️ Propiedad seleccionada en mapa:', propertyId);
  }

  // ================================
  // 🛠️ UTILIDADES
  // ================================

  trackByPropertyId(index: number, property: Property): string {
    return property.id;
  }

  getZoneName(zoneKey: string): string {
    return ARMENIA_NORTH_ZONES[zoneKey as ZoneType]?.name || zoneKey;
  }

  getPropertyTypeLabel(type: PropertyType): string {
    return PROPERTY_TYPE_LABELS[type] || type;
  }

  getAmenityLabel(amenity: AmenityType): string {
    return AMENITY_LABELS[amenity] || amenity;
  }

  getServiceLabel(service: ServiceType): string {
    return SERVICE_LABELS[service] || service;
  }

  getMainAmenities(property: Property): AmenityType[] {
    const priorityAmenities: AmenityType[] = ['wifi', 'ac', 'parking', 'kitchen'];
    return property.amenities
      .filter(amenity => priorityAmenities.includes(amenity))
      .slice(0, 3);
  }

  getWeeklyDiscount(property: Property): number {
    return this.propertyService.calculateWeeklyDiscount(property);
  }

  hasActiveFiltersSync(): boolean {
    const filters = this.filtersSubject.value;
    
    return Object.values(filters.zones).some(active => active) ||
           Object.values(filters.propertyTypes).some(active => active) ||
           Object.values(filters.amenities).some(active => active) ||
           Object.values(filters.services).some(active => active) ||
           filters.minRating > 0 ||
           filters.priceMin > 0 ||
           filters.priceMax < 999999 ||
           filters.verified ||
           filters.instantBook;
  }

  getActiveFiltersCount(): number {
    const filters = this.filtersSubject.value;
    
    let count = 0;
    count += Object.values(filters.zones).filter(active => active).length;
    count += Object.values(filters.propertyTypes).filter(active => active).length;
    count += Object.values(filters.amenities).filter(active => active).length;
    count += Object.values(filters.services).filter(active => active).length;
    
    if (filters.minRating > 0) count++;
    if (filters.priceMin > 0 || filters.priceMax < 999999) count++;
    if (filters.verified) count++;
    if (filters.instantBook) count++;
    
    return count;
  }

  getZonePropertyCount(zone: ZoneType): number {
    const counts = {
      'norte-centro': 8,
      'la-secreta': 6, 
      'bosques-pinares': 4,
      'ciudadela-del-cafe': 5,
      'villa-liliana': 3
    };
    return counts[zone] || 0;
  }
}