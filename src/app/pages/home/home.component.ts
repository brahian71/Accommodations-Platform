// 📁 src/app/pages/home/home.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Property, ZoneType, ARMENIA_NORTH_ZONES, PROPERTY_TYPE_LABELS, PropertyType } from '../../core/models/property.interface';
import { SearchParams, QuickSuggestion, QUICK_SUGGESTIONS } from '../../core/models/search.interface';
import { PropertyService } from '../../core/services/property.service';

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
  featuredProperties$: Observable<Property[]>;
  isLoading = true;
  searchError: string | null = null;

  searchData: SearchParams = {
    destination: '',
    checkIn: '', 
    checkOut: '',  
    guests: 2
  };
  private destroy$ = new Subject<void>();
  readonly today = new Date().toISOString().split('T')[0];
  readonly tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  readonly quickSuggestions = QUICK_SUGGESTIONS;
  readonly zonasDelNorte = Object.entries(ARMENIA_NORTH_ZONES).map(([key, value]) => ({
    key: key as ZoneType,
    ...value,
    properties: this.getPropertiesCountByZone(key as ZoneType)
  }));
  readonly propertyTypeLabels = PROPERTY_TYPE_LABELS;

  constructor(
    private propertyService: PropertyService,
    private router: Router
  ) {
    this.featuredProperties$ = this.propertyService.getFeaturedProperties();
  }

  ngOnInit(): void {
    this.initializeDefaultDates();
    this.loadFeaturedProperties();
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
  private loadFeaturedProperties(): void {
    setTimeout(() => {
      this.isLoading = false;
    }, 800);

    this.featuredProperties$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (properties) => {
          this.isLoading = false;
          console.log('✅ Habitaciones del Norte de Armenia cargadas:', properties.length);
        },
        error: (error) => {
          this.isLoading = false;
          this.searchError = 'Error cargando habitaciones. Inténtalo de nuevo.';
          console.error('❌ Error cargando habitaciones:', error);
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
    const { destination, checkIn, checkOut, guests } = this.searchData;
    
    if (!destination) {
      this.searchError = 'Por favor selecciona una zona del norte de Armenia';
      return false;
    }

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
    
    return true;
  }

  private performSearch(params: SearchParams): void {
    const queryParams = {
      destination: params.destination,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      guests: params.guests.toString()
    };

    console.log('🚀 Navegando a search-results con:', queryParams);
    
    this.router.navigate(['/search-results'], {
      queryParams
    }).then(success => {
      if (success) {
        console.log('✅ Navegación exitosa a search-results');
      } else {
        console.error('❌ Error en navegación');
        this.searchError = 'Error en la navegación. Inténtalo de nuevo.';
      }
    });
  }

  searchDestination(destination: ZoneType): void {
    console.log('🎯 Búsqueda rápida por zona:', destination);

    this.searchData = {
      destination,
      checkIn: this.getDateString(1),
      checkOut: this.getDateString(3),
      guests: 2
    };

    this.performSearch(this.searchData);
  }

  // ================================
  // 🏠 PROPERTY ACTIONS
  // ================================
  
  viewPropertyDetails(propertyId: string): void {
    console.log('🏠 Ver detalles de habitación:', propertyId);

    if (this.propertyService.incrementPropertyViews) {
      this.propertyService.incrementPropertyViews(propertyId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }

    this.router.navigate(['/property', propertyId]);
  }

  toggleFavorite(propertyId: string, event: Event): void {
    event.stopPropagation();
    
    console.log('❤️ Toggle favorito para habitación:', propertyId);
    
    if (this.propertyService.toggleFavorite) {
      this.propertyService.toggleFavorite(propertyId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (isFavorite) => {
            console.log(`${isFavorite ? '❤️' : '🤍'} Favorito actualizado`);
          },
          error: (error) => console.error('❌ Error actualizando favorito:', error)
        });
    }
  }

  // ================================
  // 🗺️ NAVIGATION
  // ================================

  viewAllProperties(): void {
    this.router.navigate(['/search-results'], {
      queryParams: {
        area: 'armenia-norte'
      }
    });
  }

  viewPropertiesByZone(zone: ZoneType): void {
    this.router.navigate(['/search-results'], {
      queryParams: {
        destination: zone, 
        area: 'armenia-norte'
      }
    });
  }

  // ================================
  // 🛠️ UTILITY FUNCTIONS
  // ================================
  
  trackByPropertyId(index: number, property: Property): string {
    return property.id;
  }

  getPropertyTypeName(property: Property): string {
    return this.propertyTypeLabels[property.propertyType] || 'Alojamiento';
  }

  getPropertyTypeLabel(propertyType: PropertyType): string {
    return this.propertyTypeLabels[propertyType] || 'Alojamiento';
  }

  getPropertyFeatures(property: Property): string[] {
    if (property?.features && property.features.length > 0) {
      return property.features.slice(0, 3);
    }
    
    switch (property.propertyType) {
      case 'habitacion':
        return ['Baño privado', 'WiFi gratis', 'Ventana exterior'];
      case 'apartamento':
        return ['Cocina equipada', 'Sala de estar', 'WiFi gratis'];
      case 'studio':
        return ['Concepto abierto', 'Cocina integrada', 'Balcón'];
      case 'casa':
        return ['Múltiples habitaciones', 'Patio privado', 'Parqueadero'];
      case 'penthouse':
        return ['Vista panorámica', 'Terraza privada', 'Lujo'];
      default:
        return ['WiFi gratis', 'Limpieza incluida'];
    }
  }

  getZoneName(zone: ZoneType): string {
    return ARMENIA_NORTH_ZONES[zone]?.name || zone;
  }

  getZoneDescription(zone: ZoneType): string {
    return ARMENIA_NORTH_ZONES[zone]?.description || '';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  }

  getPropertyMainAmenities(property: Property): string[] {
    const priorityAmenities = ['wifi', 'ac', 'parking', 'kitchen', 'tv'];
    return property.amenities
      .filter(amenity => priorityAmenities.includes(amenity))
      .slice(0, 3);
  }

  private getPropertiesCountByZone(zone: ZoneType): string {
    const counts = {
      'norte-centro': '8',
      'la-secreta': '6', 
      'bosques-pinares': '4',
      'ciudadela-del-cafe': '5',
      'villa-liliana': '3'
    };
    return counts[zone] || '2';
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
      case 'zone_click':
        this.trackZoneInteraction(data);
        break;
      case 'property_view':
        this.trackPropertyView(data);
        break;
    }
  }

  private openWhatsAppContact(): void {
    const message = encodeURIComponent('Hola! Me interesa información sobre las habitaciones en el norte de Armenia, Quindío');
    window.open(`https://wa.me/573001234567?text=${message}`, '_blank');
  }

  private trackZoneInteraction(zone: ZoneType): void {
    console.log('📍 Zona seleccionada:', zone);
  }

  private trackPropertyView(propertyId: string): void {
    console.log('👁️ Propiedad vista:', propertyId);
  }

  // ================================
  // 🎨 UI HELPERS
  // ================================

  getPropertyBadgeClass(property: Property): string {
    if (property.isVerified && property.isInstantBook) return 'badge-premium';
    if (property.isVerified) return 'badge-verified';
    if (property.isInstantBook) return 'badge-instant';
    return 'badge-standard';
  }

  getPropertyBadgeText(property: Property): string {
    if (property.isVerified && property.isInstantBook) return 'VERIFICADO + RESERVA INMEDIATA';
    if (property.isVerified) return 'VERIFICADO';
    if (property.isInstantBook) return 'RESERVA INMEDIATA';
    return this.getPropertyTypeName(property);
  }

  shouldShowSpecialOffer(property: Property): boolean {
    return property.pricePerWeek !== undefined && property.pricePerWeek < (property.pricePerNight * 6);
  }

  getSpecialOfferText(property: Property): string {
    if (this.shouldShowSpecialOffer(property)) {
      return 'Descuento semanal disponible';
    }
    return '';
  }
}