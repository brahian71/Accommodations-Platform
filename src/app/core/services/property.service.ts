// 📁 src/app/core/services/property.service.ts

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';

import { Property, ZoneType, PropertyType, AmenityType, ServiceType } from '../models/property.interface';
import { SearchParams, Filters } from '../models/search.interface';
import { MOCK_PROPERTIES, FEATURED_PROPERTIES, ARMENIA_NORTH_STATS } from '../data/mock-properties';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  
  private propertiesSubject = new BehaviorSubject<Property[]>(MOCK_PROPERTIES);
  private favoritesSubject = new BehaviorSubject<string[]>([]);
  
  public properties$ = this.propertiesSubject.asObservable();
  public favorites$ = this.favoritesSubject.asObservable();

  constructor() {
    // Inicializar favoritos desde localStorage
    this.loadFavoritesFromStorage();
  }

  // ================================
  // 🔍 MÉTODOS BÁSICOS DE BÚSQUEDA
  // ================================

  /**
   * Obtener todas las propiedades del norte de Armenia
   */
  getProperties(): Observable<Property[]> {
    return this.properties$.pipe(
      delay(300) // Simular delay de API
    );
  }

  /**
   * Obtener propiedades destacadas para la página de inicio
   */
  getFeaturedProperties(): Observable<Property[]> {
    return of(FEATURED_PROPERTIES).pipe(
      delay(200)
    );
  }

  /**
   * Obtener una propiedad por ID
   */
  getPropertyById(id: string): Observable<Property | undefined> {
    return this.properties$.pipe(
      map(properties => properties.find(property => property.id === id)),
      delay(200)
    );
  }

  // ================================
  // 🗺️ BÚSQUEDAS POR UBICACIÓN
  // ================================

  /**
   * Obtener propiedades por zona del norte de Armenia
   */
  getPropertiesByZone(zone: ZoneType): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => property.zone === zone)
      ),
      delay(200)
    );
  }

  /**
   * Obtener propiedades por múltiples zonas
   */
  getPropertiesByZones(zones: ZoneType[]): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => zones.includes(property.zone))
      ),
      delay(200)
    );
  }

  // ================================
  // 🏠 BÚSQUEDAS POR TIPO DE PROPIEDAD
  // ================================

  /**
   * Obtener propiedades por tipo (habitación, apartamento, etc.)
   */
  getPropertiesByType(type: PropertyType): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => property.propertyType === type)
      ),
      delay(200)
    );
  }

  /**
   * Obtener propiedades por múltiples tipos
   */
  getPropertiesByTypes(types: PropertyType[]): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => types.includes(property.propertyType))
      ),
      delay(200)
    );
  }

  // ================================
  // 💰 BÚSQUEDAS POR PRECIO
  // ================================

  /**
   * Obtener propiedades en un rango de precios
   */
  getPropertiesByPriceRange(minPrice: number, maxPrice: number): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => 
          property.pricePerNight >= minPrice && property.pricePerNight <= maxPrice
        )
      ),
      delay(200)
    );
  }

  /**
   * Obtener propiedades con descuentos semanales/mensuales
   */
  getPropertiesWithDiscounts(): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => 
          property.pricePerWeek !== undefined || property.pricePerMonth !== undefined
        )
      ),
      delay(200)
    );
  }

  // ================================
  // ⭐ BÚSQUEDAS POR CALIFICACIÓN
  // ================================

  /**
   * Obtener propiedades con calificación mínima
   */
  getPropertiesByMinRating(minRating: number): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => property.rating >= minRating)
      ),
      delay(200)
    );
  }

  /**
   * Obtener propiedades mejor calificadas
   */
  getTopRatedProperties(limit: number = 5): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        [...properties]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, limit)
      ),
      delay(200)
    );
  }

  // ================================
  // 🔧 BÚSQUEDAS POR SERVICIOS Y AMENIDADES
  // ================================

  /**
   * Obtener propiedades por amenidades específicas
   */
  getPropertiesByAmenities(amenities: AmenityType[]): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => 
          amenities.every(amenity => property.amenities.includes(amenity))
        )
      ),
      delay(200)
    );
  }

  /**
   * Obtener propiedades por servicios específicos
   */
  getPropertiesByServices(services: ServiceType[]): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => 
          services.every(service => property.services.includes(service))
        )
      ),
      delay(200)
    );
  }

  /**
   * Obtener propiedades para viajeros de negocios
   */
  getBusinessProperties(): Observable<Property[]> {
    const businessAmenities: AmenityType[] = ['wifi', 'ac'];
    const businessServices: ServiceType[] = ['late-checkin'];
    
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => 
          businessAmenities.some(amenity => property.amenities.includes(amenity)) &&
          (property.zone === 'norte-centro' || property.zone === 'villa-liliana')
        )
      ),
      delay(200)
    );
  }

  // ================================
  // 👥 BÚSQUEDAS POR CAPACIDAD
  // ================================

  /**
   * Obtener propiedades por número de huéspedes
   */
  getPropertiesByGuestCount(guestCount: number): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => property.maxGuests >= guestCount)
      ),
      delay(200)
    );
  }

  // ================================
  // 🔍 BÚSQUEDA AVANZADA
  // ================================

  /**
   * Búsqueda de texto completo
   */
  searchProperties(searchTerm: string): Observable<Property[]> {
    if (!searchTerm.trim()) {
      return this.getProperties();
    }

    const term = searchTerm.toLowerCase();
    
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property =>
          property.title.toLowerCase().includes(term) ||
          property.location.toLowerCase().includes(term) ||
          property.description.toLowerCase().includes(term) ||
          property.features.some(feature => feature.toLowerCase().includes(term)) ||
          property.nearbyPlaces.some(place => place.toLowerCase().includes(term)) ||
          property.hostName.toLowerCase().includes(term)
        )
      ),
      delay(300)
    );
  }

  /**
   * Búsqueda con filtros avanzados
   */
  searchWithFilters(searchParams: SearchParams, filters: Partial<Filters>): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => {
        let filtered = [...properties];

        // Filtrar por zona si se especifica
        if (searchParams.destination) {
          filtered = filtered.filter(p => p.zone === searchParams.destination);
        }

        // Filtrar por capacidad de huéspedes
        if (searchParams.guests) {
          filtered = filtered.filter(p => p.maxGuests >= searchParams.guests);
        }

        // Aplicar filtros adicionales
        if (filters.zones) {
          const activeZones = Object.entries(filters.zones)
            .filter(([_, active]) => active)
            .map(([zone, _]) => zone as ZoneType);
          
          if (activeZones.length > 0) {
            filtered = filtered.filter(p => activeZones.includes(p.zone));
          }
        }

        if (filters.propertyTypes) {
          const activeTypes = Object.entries(filters.propertyTypes)
            .filter(([_, active]) => active)
            .map(([type, _]) => type as PropertyType);
          
          if (activeTypes.length > 0) {
            filtered = filtered.filter(p => activeTypes.includes(p.propertyType));
          }
        }

        if (filters.minRating) {
          filtered = filtered.filter(p => p.rating >= filters.minRating!);
        }

        if (filters.priceMin || filters.priceMax) {
          filtered = filtered.filter(p => 
            p.pricePerNight >= (filters.priceMin || 0) &&
            p.pricePerNight <= (filters.priceMax || Infinity)
          );
        }

        if (filters.verified) {
          filtered = filtered.filter(p => p.isVerified);
        }

        if (filters.instantBook) {
          filtered = filtered.filter(p => p.isInstantBook);
        }

        return filtered;
      }),
      delay(300)
    );
  }

  // ================================
  // ❤️ GESTIÓN DE FAVORITOS
  // ================================

  /**
   * Toggle favorito
   */
  toggleFavorite(propertyId: string): Observable<boolean> {
    const currentFavorites = this.favoritesSubject.value;
    const isFavorite = currentFavorites.includes(propertyId);
    
    let newFavorites: string[];
    
    if (isFavorite) {
      newFavorites = currentFavorites.filter(id => id !== propertyId);
    } else {
      newFavorites = [...currentFavorites, propertyId];
    }
    
    this.favoritesSubject.next(newFavorites);
    this.saveFavoritesToStorage(newFavorites);
    this.updatePropertyFavoriteStatus(propertyId, !isFavorite);
    
    return of(!isFavorite);
  }

  /**
   * Verificar si una propiedad es favorita
   */
  isFavorite(propertyId: string): Observable<boolean> {
    return this.favorites$.pipe(
      map(favorites => favorites.includes(propertyId))
    );
  }

  /**
   * Obtener todas las propiedades favoritas
   */
  getFavoriteProperties(): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => properties.filter(property => property.isFavorite))
    );
  }

  // ================================
  // 📊 ESTADÍSTICAS Y ANALYTICS
  // ================================

  /**
   * Obtener estadísticas del norte de Armenia
   */
  getPropertyStats(): Observable<any> {
    return of(ARMENIA_NORTH_STATS).pipe(delay(100));
  }

  /**
   * Incrementar vistas de propiedad
   */
  incrementPropertyViews(propertyId: string): Observable<boolean> {
    console.log(`📈 Propiedad ${propertyId} vista`);
    // En una app real, esto haría una llamada a la API para registrar la vista
    return of(true);
  }

  /**
   * Obtener propiedades similares
   */
  getSimilarProperties(propertyId: string, limit: number = 3): Observable<Property[]> {
    return this.getPropertyById(propertyId).pipe(
      map(property => {
        if (!property) return [];

        return MOCK_PROPERTIES
          .filter(p => 
            p.id !== propertyId && 
            (p.zone === property.zone || p.propertyType === property.propertyType)
          )
          .sort((a, b) => {
            // Priorizar misma zona y tipo similar
            const aScore = (a.zone === property.zone ? 2 : 0) + 
                          (a.propertyType === property.propertyType ? 1 : 0);
            const bScore = (b.zone === property.zone ? 2 : 0) + 
                          (b.propertyType === property.propertyType ? 1 : 0);
            return bScore - aScore;
          })
          .slice(0, limit);
      })
    );
  }

  // ================================
  // 🎯 MÉTODOS ESPECÍFICOS DEL NEGOCIO
  // ================================

  /**
   * Obtener propiedades disponibles para reserva inmediata
   */
  getInstantBookProperties(): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => property.isInstantBook && property.isAvailable)
      ),
      delay(200)
    );
  }

  /**
   * Obtener propiedades verificadas
   */
  getVerifiedProperties(): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => property.isVerified)
      ),
      delay(200)
    );
  }

  /**
   * Obtener propiedades por anfitrión
   */
  getPropertiesByHost(hostName: string): Observable<Property[]> {
    return this.properties$.pipe(
      map(properties => 
        properties.filter(property => property.hostName === hostName)
      ),
      delay(200)
    );
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS
  // ================================

  private updatePropertyFavoriteStatus(propertyId: string, isFavorite: boolean): void {
    const currentProperties = this.propertiesSubject.value;
    const updatedProperties = currentProperties.map(property => 
      property.id === propertyId 
        ? { ...property, isFavorite }
        : property
    );
    this.propertiesSubject.next(updatedProperties);
  }

  private loadFavoritesFromStorage(): void {
    try {
      const saved = localStorage.getItem('armenia_norte_favorites');
      if (saved) {
        const favorites = JSON.parse(saved);
        this.favoritesSubject.next(favorites);
        
        favorites.forEach((id: string) => {
          this.updatePropertyFavoriteStatus(id, true);
        });
      }
    } catch (error) {
      console.warn('Error loading favorites from storage:', error);
    }
  }

  private saveFavoritesToStorage(favorites: string[]): void {
    try {
      localStorage.setItem('armenia_norte_favorites', JSON.stringify(favorites));
    } catch (error) {
      console.warn('Error saving favorites to storage:', error);
    }
  }

  // ================================
  // 🛠️ UTILIDADES
  // ================================

  /**
   * Calcular descuento semanal
   */
  calculateWeeklyDiscount(property: Property): number {
    if (!property.pricePerWeek) return 0;
    const regularWeeklyPrice = property.pricePerNight * 7;
    return Math.round(((regularWeeklyPrice - property.pricePerWeek) / regularWeeklyPrice) * 100);
  }

  /**
   * Calcular descuento mensual
   */
  calculateMonthlyDiscount(property: Property): number {
    if (!property.pricePerMonth) return 0;
    const regularMonthlyPrice = property.pricePerNight * 30;
    return Math.round(((regularMonthlyPrice - property.pricePerMonth) / regularMonthlyPrice) * 100);
  }

  /**
   * Verificar disponibilidad en fechas (simulado)
   */
  checkAvailability(propertyId: string, checkIn: string, checkOut: string): Observable<boolean> {
    // En una app real, esto consultaría la disponibilidad real
    return of(true).pipe(delay(500));
  }
}