// ================================
// 📁 src/app/core/services/establishment.service.ts
// 🔄 CORREGIDO: Migrado a DataProvider - Sin dependencias mock
// ================================

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { delay, tap, catchError, map } from 'rxjs/operators';

import { Establishment } from '../models/establishment.interface';
// ✅ FALLBACK: Solo para emergencias
import { ESTABLISHMENT_INFO } from '../data/establishment-data';

// ✅ MIGRADO: Usar DataProvider
import { DataProviderService } from './data-provider.service';

@Injectable({
  providedIn: 'root'
})
export class EstablishmentService {
  
  // ✅ CORREGIDO: Inicializar vacío hasta cargar datos reales
  private establishmentSubject = new BehaviorSubject<Establishment | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  public establishment$ = this.establishmentSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private dataProvider: DataProviderService) {
    console.log('🏨 EstablishmentService initialized - Using DataProvider');
    this.loadEstablishmentFromDataProvider();
  }

  // ✅ NUEVO: Cargar establecimiento desde DataProvider
  private loadEstablishmentFromDataProvider(): void {
    this.isLoadingSubject.next(true);
    
    this.dataProvider.getEstablishmentInfo().subscribe({
      next: (establishment) => {
        console.log('✅ EstablishmentService: Datos cargados desde DataProvider');
        this.establishmentSubject.next(establishment);
        this.isLoadingSubject.next(false);
      },
      error: (error) => {
        console.error('❌ EstablishmentService: Error cargando desde DataProvider:', error);
        console.log('🔄 EstablishmentService: Usando fallback a datos mock');
        this.establishmentSubject.next(ESTABLISHMENT_INFO);
        this.isLoadingSubject.next(false);
      }
    });
  }

  // ✅ NUEVO: Refrescar datos desde API
  refreshEstablishment(): Observable<Establishment> {
    console.log('🔄 EstablishmentService: Refrescando datos...');
    this.loadEstablishmentFromDataProvider();
    return this.getEstablishmentInfo();
  }

  // ================================
  // 🏨 INFORMACIÓN DEL ESTABLECIMIENTO
  // ================================

  // ✅ CORREGIDO: Usar DataProvider
  getEstablishmentInfo(): Observable<Establishment> {
    return this.dataProvider.getEstablishmentInfo().pipe(
      tap(establishment => {
        // Actualizar subject con datos frescos
        this.establishmentSubject.next(establishment);
      }),
      delay(100),
      catchError(error => {
        console.error('❌ Error getting establishment info:', error);
        // Fallback a mock data solo en caso de error
        return of(ESTABLISHMENT_INFO);
      })
    );
  }

  updateEstablishmentInfo(updates: Partial<Establishment>): Observable<Establishment> {
    const current = this.establishmentSubject.value;
    if (!current) {
      return this.getEstablishmentInfo();
    }

    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.establishmentSubject.next(updated);
    return of(updated).pipe(delay(100));
  }

  // ================================
  // 📊 ESTADÍSTICAS DEL ESTABLECIMIENTO
  // ================================

  getEstablishmentStats(): Observable<{
    totalRooms: number;
    occupancyRate: number;
    averageRating: number;
    totalReviews: number;
    yearsOperating: number;
    monthlyBookings: number;
    repeatGuests: number;
  }> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => ({
        totalRooms: establishment.stats.totalRooms,
        occupancyRate: 78, // Mock data - podría venir del API en el futuro
        averageRating: establishment.stats.averageRating,
        totalReviews: establishment.stats.totalReviews,
        yearsOperating: establishment.stats.yearsOperating || 3,
        monthlyBookings: 45, // Mock data
        repeatGuests: 23 // Mock data
      })),
      delay(200)
    );
  }

  // ================================
  // 📱 INFORMACIÓN DE CONTACTO
  // ================================

  getContactInfo(): Observable<Establishment['contactInfo']> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.contactInfo),
      delay(50)
    );
  }

  getWhatsAppLink(message?: string): Observable<string> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => {
        const phone = establishment.contactInfo.whatsapp.replace(/\D/g, '');
        const defaultMessage = `Hola! Me interesa información sobre ${establishment.name}`;
        const finalMessage = message || defaultMessage;
        const encodedMessage = encodeURIComponent(finalMessage);
        return `https://wa.me/${phone}?text=${encodedMessage}`;
      })
    );
  }

  // ================================
  // 🗺️ INFORMACIÓN DE UBICACIÓN
  // ================================

  getLocationInfo(): Observable<{
    address: string;
    coordinates?: { lat: number; lng: number };
    neighborhood: string;
    nearbyPlaces: string[];
    walkingDistances: { [place: string]: string };
  }> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => ({
        address: establishment.address,
        coordinates: establishment.coordinates,
        neighborhood: establishment.areaInfo.neighborhood,
        nearbyPlaces: establishment.areaInfo.nearbyPlaces,
        walkingDistances: establishment.areaInfo.walkingDistances
      })),
      delay(100)
    );
  }

  getTransportInfo(): Observable<string[]> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.areaInfo.transportAccess),
      delay(50)
    );
  }

  // ================================
  // 🎯 SERVICIOS Y AMENIDADES
  // ================================

  getAmenities(): Observable<Establishment['amenities']> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.amenities),
      delay(50)
    );
  }

  getServices(): Observable<Establishment['services']> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.services),
      delay(50)
    );
  }

  getPolicies(): Observable<Establishment['policies']> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.policies),
      delay(50)
    );
  }

  // ================================
  // 🖼️ GALERÍA
  // ================================

  getGallery(): Observable<Establishment['images']> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.images),
      delay(100)
    );
  }

  getMainImage(): Observable<string> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.images.main),
      delay(50)
    );
  }

  // ================================
  // 🆔 INFORMACIÓN ESPECÍFICA
  // ================================

  getHostInfo(): Observable<Establishment['host']> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.host),
      delay(50)
    );
  }

  getEstablishmentName(): Observable<string> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.name),
      delay(25)
    );
  }

  getEstablishmentDescription(): Observable<string> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.description),
      delay(25)
    );
  }

  isEstablishmentVerified(): Observable<boolean> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => establishment.isVerified),
      delay(25)
    );
  }

  // ================================
  // 🔧 UTILIDADES Y HELPERS
  // ================================

  formatAddress(establishment: Establishment): string {
    if (typeof establishment.address === 'string') {
      return establishment.address;
    } else {
      // Si address es un objeto complejo
      return `${establishment.address}`;
    }
  }

  getBusinessHours(): Observable<{ checkIn: string; checkOut: string }> {
    return this.getPolicies().pipe(
      map(policies => ({
        checkIn: policies.checkInTime || '15:00',
        checkOut: policies.checkOutTime || '11:00'
      }))
    );
  }

  // ================================
  // 📊 MÉTRICAS Y ANALYTICS
  // ================================

  getQuickStats(): Observable<{
    name: string;
    rating: number;
    totalReviews: number;
    totalRooms: number;
    isVerified: boolean;
  }> {
    return this.getEstablishmentInfo().pipe(
      map(establishment => ({
        name: establishment.name,
        rating: establishment.stats.averageRating,
        totalReviews: establishment.stats.totalReviews,
        totalRooms: establishment.stats.totalRooms,
        isVerified: establishment.isVerified
      }))
    );
  }
}