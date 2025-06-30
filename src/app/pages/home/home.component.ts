// 📁 src/app/pages/home/home.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import { Room, RoomType, ROOM_TYPE_LABELS } from '../../core/models/room.interface';
import { Establishment } from '../../core/models/establishment.interface';
import { RoomSearchParams, RoomSuggestion, ROOM_SUGGESTIONS } from '../../core/models/room-search.interface';

import { RoomService } from '../../core/services/room.service';
import { EstablishmentService } from '../../core/services/establishment.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  featuredRooms$: Observable<Room[]>;
  establishment$: Observable<Establishment>;
  isLoading = true;
  searchError: string | null = null;

  // Búsqueda simplificada sin zona geográfica
  searchData: RoomSearchParams = {
    checkIn: '', 
    checkOut: '',  
    guests: 1
  };

  private destroy$ = new Subject<void>();
  readonly today = new Date().toISOString().split('T')[0];
  readonly tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  readonly roomSuggestions = ROOM_SUGGESTIONS;
  readonly roomTypeLabels = ROOM_TYPE_LABELS;

  // Stats del establecimiento para mostrar
  establishmentStats$ = this.roomService.getEstablishmentStats();

  constructor(
    private roomService: RoomService,
    private establishmentService: EstablishmentService,
    private router: Router
  ) {
    this.featuredRooms$ = this.roomService.getFeaturedRooms();
    this.establishment$ = this.establishmentService.getEstablishmentInfo();
  }

  ngOnInit(): void {
    this.initializeDefaultDates();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeDefaultDates(): void {
    this.searchData.checkIn = this.getDateString(1); 
    this.searchData.checkOut = this.getDateString(3);
  }

  private getDateString(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  private loadData(): void {
    setTimeout(() => {
      this.isLoading = false;
    }, 800);

    // Cargar habitaciones y establecimiento
    combineLatest([
      this.featuredRooms$,
      this.establishment$
    ]).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([rooms, establishment]) => {
          this.isLoading = false;
          console.log('✅ Datos cargados:', {
            rooms: rooms.length,
            establishment: establishment.name
          });
        },
        error: (error) => {
          this.isLoading = false;
          this.searchError = 'Error cargando habitaciones. Inténtalo de nuevo.';
          console.error('❌ Error cargando datos:', error);
        }
      });
  }

  // ================================
  // 🔍 SEARCH FUNCTIONALITY
  // ================================

  onSearchSubmit(form: any): void {
    console.log('🔍 Formulario enviado:', {
      formValid: form.valid,
      searchData: this.searchData
    });
    this.searchError = null;

    if (!this.validateSearchData()) {
      console.log('❌ Validación fallida:', this.searchError);
      return;
    }

    console.log('✅ Validación exitosa, ejecutando búsqueda...');
    this.performSearch(this.searchData);
  }

  private validateSearchData(): boolean {
    const { checkIn, checkOut, guests } = this.searchData;
    
    if (checkIn && checkOut) {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (checkInDate < today) {
        this.searchError = 'La fecha de llegada no puede ser anterior a hoy';
        return false;
      }
      
      if (checkOutDate <= checkInDate) {
        this.searchError = 'La fecha de salida debe ser posterior a la fecha de llegada';
        return false;
      }
    }
    
    if (!guests || guests < 1) {
      this.searchError = 'Debe haber al menos 1 huésped';
      return false;
    }
    
    if (guests > 6) {
      this.searchError = 'Para grupos de más de 6 personas, contacte directamente';
      return false;
    }
    
    return true;
  }

  private performSearch(params: RoomSearchParams): void {
    const queryParams = {
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      guests: params.guests.toString()
    };

    console.log('🚀 Navegando a rooms con:', queryParams);
    
    this.router.navigate(['/rooms'], {
      queryParams
    }).then(success => {
      if (success) {
        console.log('✅ Navegación exitosa a rooms');
      } else {
        console.error('❌ Error en navegación');
        this.searchError = 'Error en la navegación. Inténtalo de nuevo.';
      }
    });
  }

  // Búsqueda rápida por tipo de habitación
  searchRoomType(roomType: RoomType): void {
    console.log('🎯 Búsqueda rápida por tipo:', roomType);

    this.searchData = {
      checkIn: this.getDateString(1),
      checkOut: this.getDateString(3),
      guests: roomType === 'familiar' ? 4 : roomType === 'suite' ? 2 : 1,
      roomType
    };

    this.performSearch(this.searchData);
  }

  // Búsqueda por número de huéspedes
  searchByGuests(guests: number): void {
    console.log('👥 Búsqueda por huéspedes:', guests);

    this.searchData = {
      checkIn: this.getDateString(1),
      checkOut: this.getDateString(3),
      guests
    };

    this.performSearch(this.searchData);
  }

  // ================================
  // 🏠 ROOM ACTIONS
  // ================================
  
  viewRoomDetails(roomId: string): void {
    console.log('🛏️ Ver detalles de habitación:', roomId);

    if (this.roomService.incrementRoomViews) {
      this.roomService.incrementRoomViews(roomId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }

    this.router.navigate(['/rooms', roomId]);
  }

  // ELIMINADO: Funcionalidad de favoritos removida completamente

  // ================================
  // 🗺️ NAVIGATION
  // ================================

  viewAllRooms(): void {
    this.router.navigate(['/rooms']);
  }

  viewRoomsByType(roomType: RoomType): void {
    this.router.navigate(['/rooms'], {
      queryParams: {
        type: roomType
      }
    });
  }

  // ================================
  // 🛠️ UTILITY FUNCTIONS
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

  getRoomFeatures(room: Room): string[] {
    if (room?.features && room.features.length > 0) {
      return room.features.slice(0, 3);
    }
    
    // Features por defecto según tipo de habitación
    switch (room.roomType) {
      case 'individual':
        return ['Cama individual', 'Escritorio', 'Baño privado'];
      case 'doble':
        return ['Cama doble', 'Armario amplio', 'Ventana exterior'];
      case 'triple':
        return ['3 camas', 'Espacio amplio', 'Baño privado'];
      case 'cuadruple':
        return ['4 camas', 'Sala de estar', 'Baño compartido'];
      case 'suite':
        return ['Cama king', 'Sala de estar', 'Balcón privado'];
      case 'familiar':
        return ['Múltiples camas', 'Espacio familiar', 'Zona de juegos'];
      default:
        return ['WiFi gratis', 'Limpieza incluida', 'Aire acondicionado'];
    }
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  }

  getRoomMainAmenities(room: Room): string[] {
    const priorityAmenities = ['aire-acondicionado', 'tv-smart', 'escritorio', 'bano-privado', 'balcon'];
    return room.amenities
      .filter(amenity => priorityAmenities.includes(amenity))
      .slice(0, 3);
  }

  // ================================
  // 🎯 TRACKING & ANALYTICS
  // ================================

  trackInteraction(action: string, data?: any): void {
    console.log(`📊 ${action}:`, data);
    
    switch (action) {
      case 'contact_whatsapp':
        this.openWhatsAppContact();
        break;
      case 'room_type_click':
        this.trackRoomTypeInteraction(data);
        break;
      case 'room_view':
        this.trackRoomView(data);
        break;
    }
  }

  private openWhatsAppContact(): void {
    // Usar el WhatsApp del establecimiento
    this.establishment$.pipe(takeUntil(this.destroy$)).subscribe(establishment => {
      const message = encodeURIComponent(`Hola! Me interesa información sobre las habitaciones en ${establishment.name}`);
      const phone = establishment.contactInfo.whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    });
  }

  private trackRoomTypeInteraction(roomType: RoomType): void {
    console.log('🛏️ Tipo de habitación seleccionado:', roomType);
  }

  private trackRoomView(roomId: string): void {
    console.log('👁️ Habitación vista:', roomId);
  }

  // ================================
  // 🎨 UI HELPERS
  // ================================

  getRoomBadgeClass(room: Room): string {
    if (room.roomType === 'suite') return 'badge-premium';
    if (room.availability.isAvailable) return 'badge-available';
    return 'badge-standard';
  }

  getRoomBadgeText(room: Room): string {
    if (room.roomType === 'suite') return 'SUITE PREMIUM';
    if (room.availability.isAvailable) return 'DISPONIBLE';
    return this.getRoomTypeName(room);
  }

  shouldShowSpecialOffer(room: Room): boolean {
    return room.pricing.weeklyDiscount !== undefined && room.pricing.weeklyDiscount > 0;
  }

  getSpecialOfferText(room: Room): string {
    if (room.pricing.weeklyDiscount) {
      return `${room.pricing.weeklyDiscount}% descuento semanal`;
    }
    if (room.pricing.monthlyDiscount) {
      return `${room.pricing.monthlyDiscount}% descuento mensual`;
    }
    return '';
  }

  // ================================
  // 📊 ESTABLECIMIENTO INFO HELPERS
  // ================================

  getEstablishmentName(): Observable<string> {
    return this.establishment$.pipe(
      map(establishment => establishment.name)
    );
  }

  getEstablishmentDescription(): Observable<string> {
    return this.establishment$.pipe(
      map(establishment => establishment.description)
    );
  }

  getEstablishmentLocation(): Observable<string> {
    return this.establishment$.pipe(
      map(establishment => establishment.areaInfo.neighborhood)
    );
  }

  // ================================
  // 🎯 BUSINESS LOGIC HELPERS
  // ================================

  getRoomCapacityLabel(room: Room): string {
    const guests = room.maxGuests;
    if (guests === 1) return '1 persona';
    return `${guests} personas`;
  }

  getRoomPriceRange(): Observable<{min: number, max: number}> {
    return this.establishmentStats$.pipe(
      map(stats => stats.priceRange)
    );
  }

  isRoomAvailable(room: Room): boolean {
    return room.availability.isActive && room.availability.isAvailable;
  }

  getRoomAvailabilityText(room: Room): string {
    if (!room.availability.isActive) return 'No disponible';
    if (!room.availability.isAvailable) return 'Ocupada';
    return 'Disponible';
  }

  // ================================
  // 📱 RESPONSIVE HELPERS
  // ================================

  getGridClass(): string {
    // Para responsive grid - mantiene tu sistema actual
    return 'properties-grid'; // Mantienes tu CSS existente
  }

  shouldShowExtendedFeatures(): boolean {
    // Para mostrar features extendidos en desktop
    return window.innerWidth > 768;
  }

  // ================================
  // 🎯 MÉTODOS ADICIONALES PARA COMPATIBILIDAD CON HTML
  // ================================

  // Método simplificado para botón de contacto en lugar de favoritos
  contactAboutRoom(roomId: string, event: Event): void {
    event.stopPropagation();
    
    console.log('📞 Contacto sobre habitación:', roomId);
    
    // Abrir WhatsApp con mensaje específico sobre la habitación
    this.featuredRooms$.pipe(takeUntil(this.destroy$)).subscribe(rooms => {
      const room = rooms.find(r => r.id === roomId);
      if (room) {
        this.establishment$.pipe(takeUntil(this.destroy$)).subscribe(establishment => {
          const message = encodeURIComponent(
            `Hola! Me interesa la ${room.roomType} "${room.roomNumber}" en ${establishment.name}. ¿Está disponible?`
          );
          const phone = establishment.contactInfo.whatsapp?.replace(/\D/g, '') || '573001234567';
          window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        });
      }
    });
  }
}