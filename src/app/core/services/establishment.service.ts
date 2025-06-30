// 📁 src/app/core/services/establishment.service.ts

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { Establishment } from '../models/establishment.interface';
import { ESTABLISHMENT_INFO } from '../data/establishment-data';

@Injectable({
  providedIn: 'root'
})
export class EstablishmentService {
  
  private establishmentSubject = new BehaviorSubject<Establishment>(ESTABLISHMENT_INFO);
  public establishment$ = this.establishmentSubject.asObservable();

  constructor() {}

  // ================================
  // 🏨 INFORMACIÓN DEL ESTABLECIMIENTO
  // ================================

  getEstablishmentInfo(): Observable<Establishment> {
    return this.establishment$.pipe(delay(100));
  }

  updateEstablishmentInfo(updates: Partial<Establishment>): Observable<Establishment> {
    const current = this.establishmentSubject.value;
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
    const establishment = this.establishmentSubject.value;
    
    return of({
      totalRooms: establishment.stats.totalRooms,
      occupancyRate: 78, // Mock data
      averageRating: establishment.stats.averageRating,
      totalReviews: establishment.stats.totalReviews,
      yearsOperating: establishment.stats.yearsOperating || 3,
      monthlyBookings: 45, // Mock data
      repeatGuests: 23 // Mock data
    }).pipe(delay(200));
  }

  // ================================
  // 📱 INFORMACIÓN DE CONTACTO
  // ================================

  getContactInfo(): Observable<Establishment['contactInfo']> {
    return of(this.establishmentSubject.value.contactInfo).pipe(delay(50));
  }

  getWhatsAppLink(message?: string): string {
    const establishment = this.establishmentSubject.value;
    const phone = establishment.contactInfo.whatsapp.replace(/\D/g, '');
    const defaultMessage = `Hola! Me interesa información sobre ${establishment.name}`;
    const finalMessage = message || defaultMessage;
    const encodedMessage = encodeURIComponent(finalMessage);
    return `https://wa.me/${phone}?text=${encodedMessage}`;
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
    const establishment = this.establishmentSubject.value;
    
    return of({
      address: establishment.address,
      coordinates: establishment.coordinates,
      neighborhood: establishment.areaInfo.neighborhood,
      nearbyPlaces: establishment.areaInfo.nearbyPlaces,
      walkingDistances: establishment.areaInfo.walkingDistances
    }).pipe(delay(100));
  }

  getTransportInfo(): Observable<string[]> {
    return of(this.establishmentSubject.value.areaInfo.transportAccess).pipe(delay(50));
  }

  // ================================
  // 🎯 SERVICIOS Y AMENIDADES
  // ================================

  getAmenities(): Observable<Establishment['amenities']> {
    return of(this.establishmentSubject.value.amenities).pipe(delay(50));
  }

  getServices(): Observable<Establishment['services']> {
    return of(this.establishmentSubject.value.services).pipe(delay(50));
  }

  getPolicies(): Observable<Establishment['policies']> {
    return of(this.establishmentSubject.value.policies).pipe(delay(50));
  }

  // ================================
  // 🖼️ GALERÍA
  // ================================

  getGallery(): Observable<Establishment['images']> {
    return of(this.establishmentSubject.value.images).pipe(delay(100));
  }

  getMainImage(): Observable<string> {
    return of(this.establishmentSubject.value.images.main).pipe(delay(50));
  }
}

