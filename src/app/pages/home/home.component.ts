// 📁 src/app/pages/home/home.component.ts
// VERSIÓN CORREGIDA - SIN ERRORES

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Importar desde la nueva arquitectura actualizada
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
  
  // 🎯 DATOS REACTIVOS
  featuredProperties$: Observable<Property[]>;
  
  // 📊 ESTADO
  isLoading = true;
  searchError: string | null = null;
  
  // 🔍 FORM DATA
  searchData: SearchParams = {
    destination: '',
    checkIn: '',
    checkOut: '',
    guests: 2
  };
  
  // 🧹 CLEANUP
  private destroy$ = new Subject<void>();

  // 📅 COMPUTED PROPERTIES
  readonly today = new Date().toISOString().split('T')[0];
  readonly tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // 🚀 SUGERENCIAS RÁPIDAS - Usando datos actualizados
  readonly quickSuggestions = QUICK_SUGGESTIONS;

  // 🗺️ ZONAS DEL NORTE DE ARMENIA - Usando configuración actualizada
  readonly zonasDelNorte = Object.entries(ARMENIA_NORTH_ZONES).map(([key, value]) => ({
    key: key as ZoneType,
    ...value,
    properties: this.getPropertiesCountByZone(key as ZoneType)
  }));

  // 🏷️ TIPOS DE ALOJAMIENTOS - Usando etiquetas actualizadas
  readonly propertyTypeLabels = PROPERTY_TYPE_LABELS;

  constructor(
    private propertyService: PropertyService,
    private router: Router
  ) {
    // Usar servicio actualizado
    this.featuredProperties$ = this.propertyService.getFeaturedProperties();
  }

  ngOnInit(): void {
    this.loadFeaturedProperties();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ================================
  // 🔄 DATA LOADING
  // ================================
  
  private loadFeaturedProperties(): void {
    // Simular loading realista
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
    if (form.valid && this.validateSearchData()) {
      this.performSearch(this.searchData);
    } else {
      this.searchError = 'Por favor completa todos los campos requeridos';
    }
  }

  private validateSearchData(): boolean {
    const { destination, checkIn, checkOut, guests } = this.searchData;
    
    if (!destination || !checkIn || !checkOut) {
      return false;
    }
    
    if (new Date(checkIn) >= new Date(checkOut)) {
      this.searchError = 'La fecha de salida debe ser posterior a la de llegada';
      return false;
    }
    
    if (guests < 1) {
      this.searchError = 'Debe haber al menos 1 huésped';
      return false;
    }
    
    return true;
  }

  private performSearch(params: SearchParams): void {
    this.searchError = null;
    
    this.router.navigate(['/search'], { 
      queryParams: {
        zone: params.destination,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        guests: params.guests,
        area: 'armenia-norte'
      }
    });
  }

  searchDestination(destination: ZoneType): void {
    const searchParams: SearchParams = {
      destination,
      checkIn: this.getDateString(1),
      checkOut: this.getDateString(3),
      guests: 2
    };

    this.performSearch(searchParams);
  }

  // ================================
  // 🏠 PROPERTY ACTIONS
  // ================================
  
  viewPropertyDetails(propertyId: string): void {
    console.log('🏠 Ver detalles de habitación:', propertyId);
    
    // Incrementar vistas si el servicio lo soporta
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
  // 🛠️ UTILITY FUNCTIONS - CORREGIDOS
  // ================================
  
  trackByPropertyId(index: number, property: Property): string {
    return property.id;
  }

  // ✅ MÉTODO CORREGIDO - Recibe Property completa
  getPropertyTypeName(property: Property): string {
    return this.propertyTypeLabels[property.propertyType] || 'Alojamiento';
  }

  // ✅ MÉTODO ALTERNATIVO - Recibe solo el tipo
  getPropertyTypeLabel(propertyType: PropertyType): string {
    return this.propertyTypeLabels[propertyType] || 'Alojamiento';
  }

  getPropertyFeatures(property: Property): string[] {
    if (property?.features && property.features.length > 0) {
      return property.features.slice(0, 3);
    }
    
    // Features por defecto basados en el tipo
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
  // 🗺️ NAVIGATION
  // ================================

  viewAllProperties(): void {
    this.router.navigate(['/search'], {
      queryParams: {
        area: 'armenia-norte'
      }
    });
  }

  viewPropertiesByZone(zone: ZoneType): void {
    this.router.navigate(['/search'], {
      queryParams: {
        zone: zone,
        area: 'armenia-norte'
      }
    });
  }

  // ================================
  // 🔧 HELPER METHODS
  // ================================

  private getDateString(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  private getPropertiesCountByZone(zone: ZoneType): string {
    // En una implementación real, esto vendría del servicio
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