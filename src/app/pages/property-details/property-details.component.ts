// 📁 src/app/pages/property-details/property-details.component.ts
// 🔄 MIGRADO: Property Details → Room Details - OPTIMIZADO

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject, of, combineLatest } from 'rxjs';
import { map, takeUntil, switchMap, catchError, tap } from 'rxjs/operators';

// ✅ IMPORTS - Room + Establishment
import { 
  Room, 
  RoomType, 
  RoomAmenityType, 
  BathroomType,
  ROOM_TYPE_LABELS,
  ROOM_AMENITY_LABELS,
  BED_TYPE_LABELS
} from '../../core/models/room.interface';

import { 
  Establishment,
  EstablishmentAmenityType,
  EstablishmentServiceType,
  ESTABLISHMENT_AMENITY_LABELS,
  ESTABLISHMENT_SERVICE_LABELS
} from '../../core/models/establishment.interface';

// ✅ SERVICIOS
import { RoomService } from '../../core/services/room.service';
import { EstablishmentService } from '../../core/services/establishment.service';

interface BookingData {
  checkIn: string;
  checkOut: string;
  guests: number;
  totalNights: number;
  subtotal: number;
  taxes: number;
  total: number;
  discount?: {
    type: 'weekly' | 'monthly';
    percentage: number;
    amount: number;
  };
}

@Component({
  selector: 'app-property-details',
  templateUrl: './property-details.component.html',
  styleUrls: ['./property-details.component.scss']
})
export class PropertyDetailsComponent implements OnInit, OnDestroy {

  // 🛏️ ROOM + ESTABLISHMENT DATA
  room$: Observable<Room | undefined> = of(undefined);
  establishment$: Observable<Establishment>;
  similarRooms$: Observable<Room[]> = of([]);
  isLoading = true;
  notFound = false;

  // 📅 BOOKING DATA
  bookingData: BookingData = {
    checkIn: '',
    checkOut: '',
    guests: 2,
    totalNights: 0,
    subtotal: 0,
    taxes: 0,
    total: 0
  };

  // 🎨 UI STATE
  selectedImageIndex = 0;
  showImageGallery = false;
  showBookingWidget = false;
  activeSection = 'overview';

  // 🎯 OBSERVABLES
  private roomId$ = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();

  // 📅 COMPUTED PROPERTIES
  readonly today = new Date().toISOString().split('T')[0];
  readonly tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roomService: RoomService,
    private establishmentService: EstablishmentService
  ) {
    this.initializeBookingData();
    this.establishment$ = this.establishmentService.getEstablishmentInfo();
  }

  ngOnInit(): void {
    this.loadRoomFromRoute();
    this.setupRoomData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRoomFromRoute(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const roomId = params['roomId']; // ✅ CAMBIO: 'id' → 'roomId'
        if (roomId) {
          this.roomId$.next(roomId);
        } else {
          this.notFound = true;
          this.isLoading = false;
        }
      });

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['checkIn']) this.bookingData.checkIn = params['checkIn'];
        if (params['checkOut']) this.bookingData.checkOut = params['checkOut'];
        if (params['guests']) this.bookingData.guests = +params['guests'];
        this.calculateBookingTotal();
      });
  }

  private setupRoomData(): void {
    this.room$ = this.roomId$.pipe(
      switchMap(id => {
        if (!id) return of(undefined);
        
        this.isLoading = true;
        return this.roomService.getRoomById(id).pipe(
          tap(room => {
            this.isLoading = false;
            this.notFound = !room;
            
            if (room) {
              if (this.roomService.incrementRoomViews) {
                this.roomService.incrementRoomViews(room.id)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe();
              }
              this.loadSimilarRooms(room.id);
            }
          }),
          catchError(error => {
            console.error('❌ Error cargando habitación:', error);
            this.isLoading = false;
            this.notFound = true;
            return of(undefined);
          })
        );
      })
    );
  }

  private loadSimilarRooms(roomId: string): void {
    if (this.roomService.getSimilarRooms) {
      this.similarRooms$ = this.roomService.getSimilarRooms(roomId, 3);
    }
  }

  private initializeBookingData(): void {
    if (!this.bookingData.checkIn) {
      this.bookingData.checkIn = this.today;
    }
    if (!this.bookingData.checkOut) {
      this.bookingData.checkOut = this.tomorrow;
    }
  }

  // ================================
  // 🖼️ GALERÍA DE IMÁGENES
  // ================================

  openImageGallery(index: number = 0): void {
    this.selectedImageIndex = index;
    this.showImageGallery = true;
    document.body.style.overflow = 'hidden';
  }

  closeImageGallery(): void {
    this.showImageGallery = false;
    document.body.style.overflow = 'auto';
  }

  nextImage(room: Room): void {
    const images = this.getRoomImages(room);
    this.selectedImageIndex = (this.selectedImageIndex + 1) % images.length;
  }

  previousImage(room: Room): void {
    const images = this.getRoomImages(room);
    this.selectedImageIndex = this.selectedImageIndex === 0 
      ? images.length - 1 
      : this.selectedImageIndex - 1;
  }

  getRoomImages(room: Room): string[] {
    return room.images?.gallery?.length 
      ? [room.images.main, ...room.images.gallery] 
      : [room.images.main];
  }

  // ================================
  // 📅 BOOKING WIDGET
  // ================================

  toggleBookingWidget(): void {
    this.showBookingWidget = !this.showBookingWidget;
  }

  calculateBookingTotal(): void {
    if (!this.bookingData.checkIn || !this.bookingData.checkOut) {
      this.resetBookingCalculation();
      return;
    }

    const checkIn = new Date(this.bookingData.checkIn);
    const checkOut = new Date(this.bookingData.checkOut);
    
    if (checkOut <= checkIn) {
      this.resetBookingCalculation();
      return;
    }

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    if (this.roomService.calculateRoomPrice) {
      combineLatest([
        this.room$,
        this.roomService.calculateRoomPrice(this.roomId$.value, nights)
      ]).pipe(
        takeUntil(this.destroy$),
        map(([room, pricing]) => {
          if (!room) return;

          const taxes = Math.round(pricing.subtotal * 0.19); // IVA 19%
          const total = pricing.total + taxes;

          this.bookingData = {
            ...this.bookingData,
            totalNights: nights,
            subtotal: pricing.subtotal,
            taxes,
            total,
            discount: pricing.discount
          };
        })
      ).subscribe();
    } else {
      // Cálculo simple si no hay servicio avanzado
      this.room$.pipe(takeUntil(this.destroy$)).subscribe(room => {
        if (!room) return;
        
        const subtotal = room.pricing.basePrice * nights;
        const taxes = Math.round(subtotal * 0.19);
        const total = subtotal + taxes;

        this.bookingData = {
          ...this.bookingData,
          totalNights: nights,
          subtotal,
          taxes,
          total
        };
      });
    }
  }

  private resetBookingCalculation(): void {
    this.bookingData = {
      ...this.bookingData,
      totalNights: 0,
      subtotal: 0,
      taxes: 0,
      total: 0,
      discount: undefined
    };
  }

  proceedToBooking(room: Room): void {
    if (!this.validateBookingData()) return;
    
    this.router.navigate(['/booking', room.id], {
      queryParams: {
        checkIn: this.bookingData.checkIn,
        checkOut: this.bookingData.checkOut,
        guests: this.bookingData.guests,
        total: this.bookingData.total
      }
    });
  }

  private validateBookingData(): boolean {
    const { checkIn, checkOut, guests } = this.bookingData;
    
    if (!checkIn || !checkOut) {
      alert('Por favor selecciona las fechas de estadía');
      return false;
    }
    
    if (new Date(checkOut) <= new Date(checkIn)) {
      alert('La fecha de salida debe ser posterior a la de llegada');
      return false;
    }
    
    if (guests < 1) {
      alert('Debe haber al menos 1 huésped');
      return false;
    }
    
    return true;
  }

  // ================================
  // 🤝 ACCIONES DEL USUARIO
  // ================================

  // ELIMINADO: toggleFavorite() - Reemplazado por contacto específico

  // ✅ NUEVO: Contacto específico sobre esta habitación
  contactAboutRoom(room: Room): void {
    console.log('📞 Contacto específico sobre habitación:', room.id);
    
    this.establishment$.pipe(takeUntil(this.destroy$)).subscribe(establishment => {
      const message = encodeURIComponent(
        `Hola! Me interesa la ${room.roomType} "${room.name}" (${room.roomNumber}) en ${establishment.name}. ¿Está disponible para ${this.bookingData.checkIn} - ${this.bookingData.checkOut}? Somos ${this.bookingData.guests} huésped${this.bookingData.guests > 1 ? 'es' : ''}.`
      );
      const phone = establishment.contactInfo.whatsapp?.replace(/\D/g, '') || '573001234567';
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    });
  }

  contactHost(): void {
    this.establishment$.pipe(takeUntil(this.destroy$)).subscribe(establishment => {
      const message = encodeURIComponent(
        `Hola ${establishment.host.name}! Me interesa información sobre la habitación "${this.roomId$.value}" en ${establishment.name}. ¿Podemos hablar sobre disponibilidad?`
      );
      const phone = establishment.contactInfo.whatsapp?.replace(/\D/g, '') || '573001234567';
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    });
  }

  callHost(): void {
    this.establishment$.pipe(takeUntil(this.destroy$)).subscribe(establishment => {
      window.open(`tel:${establishment.contactInfo.phone}`);
    });
  }

  shareRoom(room: Room): void {
    if (navigator.share) {
      navigator.share({
        title: room.name,
        text: `Mira esta ${this.getRoomTypeName(room.roomType)} en nuestro establecimiento`,
        url: window.location.href
      }).catch(err => {
        console.log('Error sharing:', err);
        this.copyLinkToClipboard();
      });
    } else {
      this.copyLinkToClipboard();
    }
  }

  private copyLinkToClipboard(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Enlace copiado al portapapeles');
      });
    } else {
      // Fallback para navegadores más antiguos
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Enlace copiado al portapapeles');
    }
  }

  viewSimilarRoom(roomId: string): void {
    this.router.navigate(['/rooms', roomId]);
  }

  goBackToSearch(): void {
    this.router.navigate(['/rooms'], {
      queryParams: {
        checkIn: this.bookingData.checkIn,
        checkOut: this.bookingData.checkOut,
        guests: this.bookingData.guests
      }
    });
  }

  // ================================
  // 📍 NAVEGACIÓN DE SECCIONES
  // ================================

  scrollToSection(sectionId: string): void {
    this.activeSection = sectionId;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  // ================================
  // 🛠️ UTILIDADES - ROOM
  // ================================

  getRoomTypeName(type: RoomType): string {
    return ROOM_TYPE_LABELS[type] || type;
  }

  getRoomAmenityLabel(amenity: RoomAmenityType): string {
    return ROOM_AMENITY_LABELS[amenity] || amenity;
  }

  getBedTypeLabel(bed: { type: any; quantity: number }): string {
    const label = BED_TYPE_LABELS[bed.type as keyof typeof BED_TYPE_LABELS] || bed.type;
    return bed.quantity > 1 ? `${bed.quantity} ${label}s` : label;
  }

  getBathroomTypeLabel(type: BathroomType): string {
    return type === 'privado' ? 'Baño Privado' : 'Baño Compartido';
  }

  getMainAmenities(room: Room): RoomAmenityType[] {
    const priorityAmenities: RoomAmenityType[] = [
      'aire-acondicionado', 'tv-smart', 'escritorio', 'bano-privado', 'balcon'
    ];
    return room.amenities.filter(amenity => priorityAmenities.includes(amenity));
  }

  getSecondaryAmenities(room: Room): RoomAmenityType[] {
    const priorityAmenities: RoomAmenityType[] = [
      'aire-acondicionado', 'tv-smart', 'escritorio', 'bano-privado', 'balcon'
    ];
    return room.amenities.filter(amenity => !priorityAmenities.includes(amenity));
  }

  getRoomCapacityText(room: Room): string {
    return room.maxGuests === 1 ? '1 persona' : `Hasta ${room.maxGuests} personas`;
  }

  getRoomWindowView(room: Room): string {
    const views = {
      'interior': 'Vista interior',
      'calle': 'Vista a la calle',
      'jardin': 'Vista al jardín',
      'terraza': 'Vista a la terraza'
    };
    return room.windowView ? views[room.windowView as keyof typeof views] || room.windowView : 'Sin especificar';
  }

  // ================================
  // 🛠️ UTILIDADES - ESTABLISHMENT
  // ================================

  getEstablishmentAmenityLabel(amenity: EstablishmentAmenityType): string {
    return ESTABLISHMENT_AMENITY_LABELS[amenity] || amenity;
  }

  getEstablishmentServiceLabel(service: EstablishmentServiceType): string {
    return ESTABLISHMENT_SERVICE_LABELS[service] || service;
  }

  getCancellationPolicyLabel(policy: string): string {
    const policies = {
      'flexible': 'Cancelación flexible - Reembolso completo hasta 24h antes',
      'moderada': 'Cancelación moderada - Reembolso parcial hasta 5 días antes',
      'estricta': 'Cancelación estricta - Sin reembolso tras confirmación'
    };
    return policies[policy as keyof typeof policies] || policy;
  }

  getResponseTimeLabel(responseTime: string): string {
    const times = {
      'inmediata': 'Respuesta inmediata',
      'en horas': 'Responde en pocas horas',
      'en 1 día': 'Responde en 1 día'
    };
    return times[responseTime as keyof typeof times] || responseTime;
  }

  // ================================
  // 💰 UTILIDADES DE PRECIO
  // ================================

  getWeeklyDiscount(room: Room): number {
    return 0;
  }

  getMonthlyDiscount(room: Room): number {
    return 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(date);
  }

  // ================================
  // 🎯 TRACKING
  // ================================

  trackByRoomId(index: number, room: Room): string {
    return room.id;
  }

  // ================================
  // 🔧 HELPERS PARA TEMPLATE
  // ================================

  hasDiscount(room: Room): boolean {
    return false;
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