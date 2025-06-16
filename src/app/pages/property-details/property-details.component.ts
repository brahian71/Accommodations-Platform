// 📁 src/app/pages/property-details/property-details.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { map, takeUntil, switchMap, catchError, tap } from 'rxjs/operators';

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

import { PropertyService } from '../../core/services/property.service';

interface BookingData {
  checkIn: string;
  checkOut: string;
  guests: number;
  totalNights: number;
  subtotal: number;
  taxes: number;
  total: number;
}

@Component({
  selector: 'app-property-details',
  templateUrl: './property-details.component.html',
  styleUrls: ['./property-details.component.scss']
})
export class PropertyDetailsComponent implements OnInit, OnDestroy {

  // 🏠 PROPERTY DATA
  property$: Observable<Property | undefined> = of(undefined);
  similarProperties$: Observable<Property[]> = of([]);
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
  private propertyId$ = new BehaviorSubject<string>('');
  private destroy$ = new Subject<void>();

  // 📅 COMPUTED PROPERTIES
  readonly today = new Date().toISOString().split('T')[0];
  readonly tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private propertyService: PropertyService
  ) {
    this.initializeBookingData();
  }

  ngOnInit(): void {
    this.loadPropertyFromRoute();
    this.setupPropertyData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ================================
  // 🔄 INICIALIZACIÓN
  // ================================

  private loadPropertyFromRoute(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const propertyId = params['id'];
        if (propertyId) {
          this.propertyId$.next(propertyId);
        } else {
          this.notFound = true;
          this.isLoading = false;
        }
      });

    // Cargar parámetros de búsqueda si vienen de search-results
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['checkIn']) this.bookingData.checkIn = params['checkIn'];
        if (params['checkOut']) this.bookingData.checkOut = params['checkOut'];
        if (params['guests']) this.bookingData.guests = +params['guests'];
        this.calculateBookingTotal();
      });
  }

  private setupPropertyData(): void {
    this.property$ = this.propertyId$.pipe(
      switchMap(id => {
        if (!id) return of(undefined);
        
        this.isLoading = true;
        return this.propertyService.getPropertyById(id).pipe(
          tap(property => {
            this.isLoading = false;
            this.notFound = !property;
            
            if (property) {
              // Incrementar vistas
              this.propertyService.incrementPropertyViews(property.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe();
              
              // Cargar propiedades similares
              this.loadSimilarProperties(property.id);
            }
          }),
          catchError(error => {
            console.error('❌ Error cargando propiedad:', error);
            this.isLoading = false;
            this.notFound = true;
            return of(undefined);
          })
        );
      })
    );
  }

  private loadSimilarProperties(propertyId: string): void {
    this.similarProperties$ = this.propertyService.getSimilarProperties(propertyId, 3);
  }

  private initializeBookingData(): void {
    // Inicializar con fechas por defecto si no vienen de query params
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

  nextImage(property: Property): void {
    const images = this.getPropertyImages(property);
    this.selectedImageIndex = (this.selectedImageIndex + 1) % images.length;
  }

  previousImage(property: Property): void {
    const images = this.getPropertyImages(property);
    this.selectedImageIndex = this.selectedImageIndex === 0 
      ? images.length - 1 
      : this.selectedImageIndex - 1;
  }

  getPropertyImages(property: Property): string[] {
    return property.images?.length ? property.images : [property.image];
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

    this.property$.pipe(
      takeUntil(this.destroy$),
      map(property => {
        if (!property) return;

        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        const subtotal = nights * property.pricePerNight;
        const taxes = Math.round(subtotal * 0.19); // IVA 19%
        const total = subtotal + taxes;

        this.bookingData = {
          ...this.bookingData,
          totalNights: nights,
          subtotal,
          taxes,
          total
        };
      })
    ).subscribe();
  }

  private resetBookingCalculation(): void {
    this.bookingData = {
      ...this.bookingData,
      totalNights: 0,
      subtotal: 0,
      taxes: 0,
      total: 0
    };
  }

  proceedToBooking(property: Property): void {
    if (!this.validateBookingData()) return;

    // Navegar a la página de booking con los datos
    this.router.navigate(['/booking', property.id], {
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

  toggleFavorite(property: Property): void {
    this.propertyService.toggleFavorite(property.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isFavorite) => {
          console.log(`${isFavorite ? '❤️' : '🤍'} Favorito actualizado`);
          // La actualización del estado se maneja automáticamente por el service
        },
        error: (error) => console.error('❌ Error actualizando favorito:', error)
      });
  }

  contactHost(property: Property): void {
    if (property.hostWhatsapp) {
      const message = encodeURIComponent(
        `Hola ${property.hostName}! Me interesa tu ${this.getPropertyTypeLabel(property.propertyType).toLowerCase()} "${property.title}" en ${property.location}. ¿Podemos hablar sobre disponibilidad?`
      );
      window.open(`https://wa.me/${property.hostWhatsapp}?text=${message}`, '_blank');
    }
  }

  callHost(property: Property): void {
    if (property.hostWhatsapp) {
      window.open(`tel:${property.hostWhatsapp}`);
    }
  }

  shareProperty(property: Property): void {
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: `Mira esta ${this.getPropertyTypeLabel(property.propertyType).toLowerCase()} en ${property.location}`,
        url: window.location.href
      });
    } else {
      // Fallback: copiar URL al clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Enlace copiado al portapapeles');
    }
  }

  viewSimilarProperty(propertyId: string): void {
    this.router.navigate(['/property', propertyId]);
  }

  goBackToSearch(): void {
    this.router.navigate(['/search-results'], {
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
  // 🛠️ UTILIDADES
  // ================================

  getZoneName(zoneKey: ZoneType): string {
    return ARMENIA_NORTH_ZONES[zoneKey]?.name || zoneKey;
  }

  getZoneDescription(zoneKey: ZoneType): string {
    return ARMENIA_NORTH_ZONES[zoneKey]?.description || '';
  }

  getZoneIcon(zoneKey: ZoneType): string {
    return ARMENIA_NORTH_ZONES[zoneKey]?.icon || '📍';
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
    const priorityAmenities: AmenityType[] = ['wifi', 'ac', 'parking', 'kitchen', 'tv'];
    return property.amenities.filter(amenity => priorityAmenities.includes(amenity));
  }

  getSecondaryAmenities(property: Property): AmenityType[] {
    const priorityAmenities: AmenityType[] = ['wifi', 'ac', 'parking', 'kitchen', 'tv'];
    return property.amenities.filter(amenity => !priorityAmenities.includes(amenity));
  }

  getWeeklyDiscount(property: Property): number {
    return this.propertyService.calculateWeeklyDiscount(property);
  }

  getMonthlyDiscount(property: Property): number {
    return this.propertyService.calculateMonthlyDiscount(property);
  }

  getCancellationPolicyLabel(policy: string): string {
    const policies = {
      'flexible': 'Cancelación flexible - Reembolso completo hasta 24h antes',
      'moderada': 'Cancelación moderada - Reembolso parcial hasta 5 días antes',
      'estricta': 'Cancelación estricta - Sin reembolso tras confirmación'
    };
    return policies[policy as keyof typeof policies] || policy;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(date);
  }

  trackByPropertyId(index: number, property: Property): string {
    return property.id;
  }
}