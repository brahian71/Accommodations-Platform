// 📁 src/app/pages/search-results/search-results.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { map, takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { Room, RoomType, RoomAmenityType, ROOM_TYPE_LABELS, ROOM_AMENITY_LABELS } from '../../core/models/room.interface';
import { Establishment } from '../../core/models/establishment.interface';
import { 
  RoomSearchParams, 
  RoomFilters, 
  RoomSearchConfig,
  ROOM_SORT_OPTIONS,
  DEFAULT_ROOM_FILTERS,
  DEFAULT_ROOM_SEARCH_CONFIG,
  DEFAULT_ROOM_SEARCH_PARAMS,
  ROOM_PRICE_RANGES
} from '../../core/models/room-search.interface';

import { RoomService } from '../../core/services/room.service';
import { EstablishmentService } from '../../core/services/establishment.service';
import { RoomSearchService } from '../../core/services/room-search.service';

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

  allRooms: Room[] = [];
  filteredRooms: Room[] = [];
  paginatedRooms: Room[] = [];
  
  establishment$: Observable<Establishment>;
  
  // 📊 STATE
  isLoading = false;
  searchError: string | null = null;
  totalResults = 0;
  totalPages = 0;

  // 🔍 SEARCH DATA (SIN ZONA GEOGRÁFICA)
  searchData: RoomSearchParams = {
    checkIn: '',
    checkOut: '',
    guests: 1
  };

  // 📱 CURRENT CONFIG
  currentFilters: RoomFilters = { ...DEFAULT_ROOM_FILTERS };
  currentConfig: RoomSearchConfig = { ...DEFAULT_ROOM_SEARCH_CONFIG };

  // 🧹 CLEANUP
  private destroy$ = new Subject<void>();

  // 📅 COMPUTED PROPERTIES
  readonly today = new Date().toISOString().split('T')[0];
  readonly tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // 🗂️ CONFIGURACIONES ESTÁTICAS
  readonly sortOptions = ROOM_SORT_OPTIONS;
  readonly itemsPerPageOptions = [8, 16, 24, 32];
  readonly priceRanges = ROOM_PRICE_RANGES;
  readonly roomTypeLabels = ROOM_TYPE_LABELS;

  currentMinRating = 0;

  constructor(
    private roomService: RoomService,
    private establishmentService: EstablishmentService,
    private roomSearchService: RoomSearchService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.establishment$ = this.establishmentService.getEstablishmentInfo();
  }

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
    this.roomService.getRooms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rooms) => {
          this.allRooms = rooms;
          this.applyFiltersAndUpdate();
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.searchError = 'Error cargando habitaciones. Inténtalo de nuevo.';
          console.error('❌ Error cargando habitaciones:', error);
        }
      });
  }

  private loadSearchParamsFromRoute(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const searchParams: RoomSearchParams = {
          checkIn: params['checkIn'] || '',
          checkOut: params['checkOut'] || '',
          guests: +params['guests'] || 1,
          roomType: params['type'] as RoomType || undefined
        };

        this.searchData = { ...searchParams };
        this.applyFiltersAndUpdate();
      });
  }

  public applyFiltersAndUpdate(): void {
    let filtered = [...this.allRooms];

    // Filtrar por parámetros de búsqueda
    if (this.searchData.guests) {
      filtered = filtered.filter(room => room.maxGuests >= this.searchData.guests);
    }

    if (this.searchData.roomType) {
      filtered = filtered.filter(room => room.roomType === this.searchData.roomType);
    }

    // Filtrar por tipos de habitación
    const activeRoomTypes = Object.entries(this.currentFilters.roomTypes)
      .filter(([_, active]) => active)
      .map(([type, _]) => type as RoomType);
    
    if (activeRoomTypes.length > 0) {
      filtered = filtered.filter(room => activeRoomTypes.includes(room.roomType));
    }

    // Filtrar por amenidades de habitación
    const activeAmenities = Object.entries(this.currentFilters.amenities)
      .filter(([_, active]) => active)
      .map(([amenity, _]) => amenity as RoomAmenityType);
    
    if (activeAmenities.length > 0) {
      filtered = filtered.filter(room => 
        activeAmenities.every(amenity => room.amenities.includes(amenity))
      );
    }

    // Filtrar por características especiales
    if (this.currentFilters.features.hasWorkspace) {
      filtered = filtered.filter(room => 
        room.amenities.includes('escritorio') && room.amenities.includes('silla-trabajo')
      );
    }

    if (this.currentFilters.features.hasBalcony) {
      filtered = filtered.filter(room => room.amenities.includes('balcon'));
    }

    if (this.currentFilters.features.hasPrivateBathroom) {
      filtered = filtered.filter(room => room.bathroomType === 'privado');
    }

    if (this.currentFilters.features.hasAirConditioning) {
      filtered = filtered.filter(room => room.amenities.includes('aire-acondicionado'));
    }

    if (this.currentFilters.features.hasSmartTV) {
      filtered = filtered.filter(room => room.amenities.includes('tv-smart'));
    }

    if (this.currentFilters.features.hasSafe) {
      filtered = filtered.filter(room => room.amenities.includes('caja-fuerte'));
    }

    // Filtrar por capacidad
    const activeCapacities = Object.entries(this.currentFilters.capacity)
      .filter(([_, active]) => active);
    
    if (activeCapacities.length > 0) {
      filtered = filtered.filter(room => {
        return activeCapacities.some(([capacity, _]) => {
          switch (capacity) {
            case 'guests1': return room.maxGuests >= 1;
            case 'guests2': return room.maxGuests >= 2;
            case 'guests3': return room.maxGuests >= 3;
            case 'guests4Plus': return room.maxGuests >= 4;
            default: return true;
          }
        });
      });
    }

    // Filtrar por rango de precios
    if (this.currentFilters.minPrice || this.currentFilters.maxPrice) {
      filtered = filtered.filter(room => 
        room.pricing.basePrice >= (this.currentFilters.minPrice || 0) &&
        room.pricing.basePrice <= (this.currentFilters.maxPrice || Infinity)
      );
    }

    // Filtrar por rangos de precio predefinidos
    const activePriceRanges = Object.entries(this.currentFilters.priceRange)
      .filter(([_, active]) => active)
      .map(([range, _]) => range);

    if (activePriceRanges.length > 0) {
      filtered = filtered.filter(room => {
        return activePriceRanges.some(range => {
          switch (range) {
            case 'budget': return room.pricing.basePrice <= 60000;
            case 'mid': return room.pricing.basePrice > 60000 && room.pricing.basePrice <= 90000;
            case 'premium': return room.pricing.basePrice > 90000;
            default: return true;
          }
        });
      });
    }

    // Filtrar por calificación
    if (this.currentFilters.minRating) {
      filtered = filtered.filter(room => room.stats.rating >= this.currentFilters.minRating);
    }

    // Solo habitaciones disponibles
    if (this.currentFilters.availableOnly) {
      filtered = filtered.filter(room => 
        room.availability.isActive && room.availability.isAvailable
      );
    }

    // Ordenar habitaciones
    filtered = this.sortRooms(filtered, this.currentConfig.sortBy);

    this.filteredRooms = filtered;
    this.totalResults = filtered.length;
    this.totalPages = Math.ceil(this.totalResults / this.currentConfig.itemsPerPage);
    this.updatePagination();
  }

  private sortRooms(rooms: Room[], sortBy: string): Room[] {
    return this.roomService.sortRooms(rooms, sortBy);
  }

  private updatePagination(): void {
    const startIndex = (this.currentConfig.currentPage - 1) * this.currentConfig.itemsPerPage;
    const endIndex = startIndex + this.currentConfig.itemsPerPage;
    this.paginatedRooms = this.filteredRooms.slice(startIndex, endIndex);
  }

  // ================================
  // 🎛️ FILTROS POR TIPO DE HABITACIÓN
  // ================================

  toggleRoomType(type: RoomType, active: boolean): void {
    this.currentFilters.roomTypes[type] = active;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  toggleAmenity(amenity: string, active: boolean): void {
    const amenityKey = amenity as keyof typeof this.currentFilters.amenities;
    if (amenityKey in this.currentFilters.amenities) {
      (this.currentFilters.amenities as any)[amenityKey] = active;
    }
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  toggleFeature(feature: keyof RoomFilters['features'], active: boolean): void {
    this.currentFilters.features[feature] = active;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  toggleCapacity(capacity: keyof RoomFilters['capacity'], active: boolean): void {
    this.currentFilters.capacity[capacity] = active;
    this.currentConfig.currentPage = 1;
    this.applyFiltersAndUpdate();
  }

  public isPriceRangeActive(rangeId: string): boolean {
    switch (rangeId) {
      case 'budget': return this.currentFilters.priceRange.budget;
      case 'mid': return this.currentFilters.priceRange.mid;
      case 'premium': return this.currentFilters.priceRange.premium;
      default: return false;
    }
  }

  onPriceRangeClick(priceRange: { id: string; min: number; max: number }): void {
    // Reset otros rangos
    Object.keys(this.currentFilters.priceRange).forEach(key => {
      this.currentFilters.priceRange[key as keyof typeof this.currentFilters.priceRange] = false;
    });
    
    // Activar el seleccionado
    this.currentFilters.priceRange[priceRange.id as keyof typeof this.currentFilters.priceRange] = true;
    this.currentFilters.minPrice = priceRange.min;
    this.currentFilters.maxPrice = priceRange.max;
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
    this.currentFilters = { ...DEFAULT_ROOM_FILTERS };
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
    
    // Actualizar URL sin zona geográfica
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        checkIn: this.searchData.checkIn,
        checkOut: this.searchData.checkOut,
        guests: this.searchData.guests,
        type: this.searchData.roomType
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

    if (guests > 6) {
      this.searchError = 'Para grupos de más de 6 personas, contacte directamente';
      return false;
    }
    
    return true;
  }

  resetSearch(): void {
    this.searchData = { ...DEFAULT_ROOM_SEARCH_PARAMS };
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

  setViewMode(viewMode: 'grid' | 'list'): void {
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
  // 🏠 ACCIONES DE HABITACIONES
  // ================================

  viewRoom(roomId: string): void {
    if (this.roomService.incrementRoomViews) {
      this.roomService.incrementRoomViews(roomId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }

    this.router.navigate(['/rooms', roomId]);
  }

  // ELIMINADO: toggleFavorite() - Reemplazado por contacto

  // ✅ NUEVO: Contacto específico sobre habitación
  contactAboutRoom(roomId: string, event: Event): void {
    event.stopPropagation();
    
    console.log('📞 Contacto sobre habitación:', roomId);
    
    // Buscar la habitación específica
    const room = this.allRooms.find(r => r.id === roomId);
    if (room) {
      this.establishment$.pipe(takeUntil(this.destroy$)).subscribe(establishment => {
        const message = encodeURIComponent(
          `Hola! Me interesa la ${room.roomType} "${room.roomNumber}" en ${establishment.name}. ¿Está disponible para ${this.searchData.checkIn} - ${this.searchData.checkOut}?`
        );
        const phone = establishment.contactInfo.whatsapp?.replace(/\D/g, '') || '573001234567';
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
      });
    }
  }

  quickBook(roomId: string): void {
    console.log('⚡ Reserva rápida para habitación:', roomId);
    this.router.navigate(['/booking', roomId], {
      queryParams: {
        checkIn: this.searchData.checkIn,
        checkOut: this.searchData.checkOut,
        guests: this.searchData.guests
      }
    });
  }

  contactHost(): void {
    // Contactar al establecimiento directamente
    this.establishment$.pipe(takeUntil(this.destroy$)).subscribe(establishment => {
      const message = encodeURIComponent(
        `Hola! Me interesa información sobre las habitaciones en ${establishment.name}.`
      );
      const phone = establishment.contactInfo.whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    });
  }

  // ================================
  // 🛠️ UTILIDADES
  // ================================

  trackByRoomId(index: number, room: Room): string {
    return room.id;
  }

  getRoomTypeName(room: Room): string {
    return this.roomTypeLabels[room.roomType] || 'Habitación';
  }

  getRoomTypeLabel(roomType: RoomType): string {
    return this.roomTypeLabels[roomType] || 'Habitación';
  }

  getAmenityLabel(amenity: RoomAmenityType): string {
    return ROOM_AMENITY_LABELS[amenity] || amenity;
  }

  getMainAmenities(room: Room): RoomAmenityType[] {
    const priorityAmenities: RoomAmenityType[] = ['aire-acondicionado', 'tv-smart', 'escritorio', 'bano-privado', 'balcon'];
    return room.amenities
      .filter(amenity => priorityAmenities.includes(amenity))
      .slice(0, 3);
  }

  getRoomCapacityLabel(room: Room): string {
    const guests = room.maxGuests;
    if (guests === 1) return '1 persona';
    return `${guests} personas`;
  }

  hasActiveFiltersSync(): boolean {
    return Object.values(this.currentFilters.roomTypes).some(active => active) ||
           Object.values(this.currentFilters.amenities).some(active => active) ||
           Object.values(this.currentFilters.features).some(active => active) ||
           Object.values(this.currentFilters.capacity).some(active => active) ||
           Object.values(this.currentFilters.priceRange).some(active => active) ||
           this.currentFilters.minRating > 0 ||
           this.currentFilters.minPrice > 0 ||
           this.currentFilters.maxPrice < 200000;
  }

  getActiveFiltersCount(): number {
    let count = 0;
    count += Object.values(this.currentFilters.roomTypes).filter(active => active).length;
    count += Object.values(this.currentFilters.amenities).filter(active => active).length;
    count += Object.values(this.currentFilters.features).filter(active => active).length;
    count += Object.values(this.currentFilters.capacity).filter(active => active).length;
    count += Object.values(this.currentFilters.priceRange).filter(active => active).length;
    
    if (this.currentFilters.minRating > 0) count++;
    if (this.currentFilters.minPrice > 0 || this.currentFilters.maxPrice < 200000) count++;
    
    return count;
  }

  getEstablishmentName(): Observable<string> {
    return this.establishment$.pipe(
      map(establishment => establishment.name)
    );
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  }

  shouldShowWeeklyPrice(room: Room): boolean {
    return room.pricing.weeklyDiscount !== undefined && room.pricing.weeklyDiscount > 0;
  }

  getWeeklyDiscount(room: Room): number {
    return room.pricing.weeklyDiscount || 0;
  }

  shouldShowMonthlyPrice(room: Room): boolean {
    return room.pricing.monthlyDiscount !== undefined && room.pricing.monthlyDiscount > 0;
  }

  getMonthlyDiscount(room: Room): number {
    return room.pricing.monthlyDiscount || 0;
  }

  isRoomAvailable(room: Room): boolean {
    return room.availability.isActive && room.availability.isAvailable;
  }

  getRoomAvailabilityText(room: Room): string {
    if (!room.availability.isActive) return 'No disponible';
    if (!room.availability.isAvailable) return 'Ocupada';
    return 'Disponible';
  }
}