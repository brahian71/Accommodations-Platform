// 📁 src/app/pages/search-results/search-results.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith, tap } from 'rxjs/operators';
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

  allProperties: Property[] = [];
  filteredProperties: Property[] = [];
  paginatedProperties: Property[] = [];
  
  // 📊 STATE
  isLoading = false;
  searchError: string | null = null;
  totalResults = 0;
  totalPages = 0;

  // 🔍 SEARCH DATA
  searchData: SearchParams = {
    destination: '',
    checkIn: '',
    checkOut: '',
    guests: 2
  };

  // 📱 CURRENT CONFIG
  currentFilters: Filters = { ...DEFAULT_FILTERS };
  currentConfig: SearchResultsConfig = { ...DEFAULT_SEARCH_RESULTS_CONFIG };

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

  currentMinRating = 0;

  constructor(
    private propertyService: PropertyService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.loadSearchParamsFromRoute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.isLoading = true;
    this.propertyService.getProperties()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (properties) => {
          this.allProperties = properties;
          this.applyFiltersAndUpdate();
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.searchError = 'Error cargando habitaciones. Inténtalo de nuevo.';
          console.error('❌ Error cargando propiedades:', error);
        }
      });
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
        this.applyFiltersAndUpdate();
      });
  }
  private applyFiltersAndUpdate(): void {
    let filtered = [...this.allProperties];

    if (this.searchData.destination) {
      filtered = filtered.filter(p => p.zone === this.searchData.destination);
    }

    if (this.searchData.guests) {
      filtered = filtered.filter(p => p.maxGuests >= this.searchData.guests);
    }

    const activeZones = Object.entries(this.currentFilters.zones)
      .filter(([_, active]) => active)
      .map(([zone, _]) => zone as ZoneType);
    
    if (activeZones.length > 0) {
      filtered = filtered.filter(p => activeZones.includes(p.zone));
    }

    const activeTypes = Object.entries(this.currentFilters.propertyTypes)
      .filter(([_, active]) => active)
      .map(([type, _]) => type as PropertyType);
    
    if (activeTypes.length > 0) {
      filtered = filtered.filter(p => activeTypes.includes(p.propertyType));
    }

    const activeAmenities = Object.entries(this.currentFilters.amenities)
      .filter(([_, active]) => active)
      .map(([amenity, _]) => amenity as AmenityType);
    
    if (activeAmenities.length > 0) {
      filtered = filtered.filter(p => 
        activeAmenities.every(amenity => p.amenities.includes(amenity))
      );
    }

    const activeServices = Object.entries(this.currentFilters.services)
      .filter(([_, active]) => active)
      .map(([service, _]) => service as ServiceType);
    
    if (activeServices.length > 0) {
      filtered = filtered.filter(p => 
        activeServices.every(service => p.services.includes(service))
      );
    }

    if (this.currentFilters.priceMin || this.currentFilters.priceMax) {
      filtered = filtered.filter(p => 
        p.pricePerNight >= (this.currentFilters.priceMin || 0) &&
        p.pricePerNight <= (this.currentFilters.priceMax || Infinity)
      );
    }

    if (this.currentFilters.minRating) {
      filtered = filtered.filter(p => p.rating >= this.currentFilters.minRating);
    }

    if (this.currentFilters.verified) {
      filtered = filtered.filter(p => p.isVerified);
    }

    if (this.currentFilters.instantBook) {
      filtered = filtered.filter(p => p.isInstantBook);
    }

    filtered = this.sortProperties(filtered, this.currentConfig.sortBy);

    this.filteredProperties = filtered;
    this.totalResults = filtered.length;
    this.totalPages = Math.ceil(this.totalResults / this.currentConfig.itemsPerPage);
    this.updatePagination();
  }

  private sortProperties(properties: Property[], sortBy: string): Property[] {
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
          const aDistance = a.zone === 'norte-centro' ? 1 : a.zone === 'villa-liliana' ? 2 : 3;
          const bDistance = b.zone === 'norte-centro' ? 1 : b.zone === 'villa-liliana' ? 2 : 3;
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
          return b.rating - a.rating;
        });
    }
  }

  private updatePagination(): void {
    const startIndex = (this.currentConfig.currentPage - 1) * this.currentConfig.itemsPerPage;
    const endIndex = startIndex + this.currentConfig.itemsPerPage;
    this.paginatedProperties = this.filteredProperties.slice(startIndex, endIndex);
  }

  toggleZone(zone: ZoneType, active: boolean): void {
    this.currentFilters.zones[zone] = active;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  togglePropertyType(type: PropertyType, active: boolean): void {
    this.currentFilters.propertyTypes[type] = active;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  toggleAmenity(amenity: AmenityType, active: boolean): void {
    this.currentFilters.amenities[amenity] = active;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  toggleService(service: ServiceType, active: boolean): void {
    this.currentFilters.services[service] = active;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  toggleSpecialFilter(filterType: string, active: boolean): void {
    switch (filterType) {
      case 'verified':
        this.currentFilters.verified = active;
        break;
      case 'instantBook':
        this.currentFilters.instantBook = active;
        break;
      case 'businessFriendly':
        if (active) {
          this.currentFilters.amenities.wifi = true;
          this.currentFilters.amenities.ac = true;
          this.currentFilters.zones['norte-centro'] = true;
          this.currentFilters.zones['villa-liliana'] = true;
        }
        break;
    }
    
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  onPriceFilterClick(priceRange: { priceMin: number; priceMax: number }): void {
    this.currentFilters.priceMin = priceRange.priceMin;
    this.currentFilters.priceMax = priceRange.priceMax;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  setMinRating(rating: number): void {
    this.currentMinRating = rating;
    this.currentFilters.minRating = rating;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  clearFilters(): void {
    this.currentMinRating = 0;
    this.currentFilters = { ...DEFAULT_FILTERS };
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  // ================================
  // 🔍 BÚSQUEDA
  // ================================

  performSearch(): void {
    this.searchError = null;

    if (!this.validateSearchData()) {
      return;
    }

    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
    
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
  }

  // ================================
  // 🎛️ CONFIGURACIÓN DE VISTA
  // ================================

  updateSortBy(sortBy: string): void {
    this.currentConfig.sortBy = sortBy;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  setViewMode(viewMode: 'list' | 'map'): void {
    this.currentConfig.viewMode = viewMode;
  }

  updateItemsPerPage(itemsPerPage: number): void {
    this.currentConfig.itemsPerPage = itemsPerPage;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }
  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentConfig.currentPage = page;
      this.updatePagination();
    }
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
          this.updatePropertyInLists(propertyId, { isFavorite });
          console.log(`${isFavorite ? '❤️' : '🤍'} Favorito actualizado`);
        },
        error: (error) => console.error('❌ Error actualizando favorito:', error)
      });
  }

  private updatePropertyInLists(propertyId: string, updates: Partial<Property>): void {
    this.allProperties = this.allProperties.map(p => 
      p.id === propertyId ? { ...p, ...updates } : p
    );
    this.filteredProperties = this.filteredProperties.map(p => 
      p.id === propertyId ? { ...p, ...updates } : p
    );
    this.paginatedProperties = this.paginatedProperties.map(p => 
      p.id === propertyId ? { ...p, ...updates } : p
    );
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
    const priorityAmenities: AmenityType[] = ['wifi', 'ac', 'parking', 'kitchen', 'security'];
    return property.amenities
      .filter(amenity => priorityAmenities.includes(amenity))
      .slice(0, 3);
  }

  getWeeklyDiscount(property: Property): number {
    return this.propertyService.calculateWeeklyDiscount(property);
  }

  hasActiveFiltersSync(): boolean {
    return Object.values(this.currentFilters.zones).some(active => active) ||
           Object.values(this.currentFilters.propertyTypes).some(active => active) ||
           Object.values(this.currentFilters.amenities).some(active => active) ||
           Object.values(this.currentFilters.services).some(active => active) ||
           this.currentFilters.minRating > 0 ||
           this.currentFilters.priceMin > 0 ||
           this.currentFilters.priceMax < 200000 ||
           this.currentFilters.verified ||
           this.currentFilters.instantBook;
  }

  getActiveFiltersCount(): number {
    let count = 0;
    count += Object.values(this.currentFilters.zones).filter(active => active).length;
    count += Object.values(this.currentFilters.propertyTypes).filter(active => active).length;
    count += Object.values(this.currentFilters.amenities).filter(active => active).length;
    count += Object.values(this.currentFilters.services).filter(active => active).length;
    
    if (this.currentFilters.minRating > 0) count++;
    if (this.currentFilters.priceMin > 0 || this.currentFilters.priceMax < 200000) count++;
    if (this.currentFilters.verified) count++;
    if (this.currentFilters.instantBook) count++;
    
    return count;
  }

  getZonePropertyCount(zone: ZoneType): number {
    return this.allProperties.filter(p => p.zone === zone).length;
  }
}