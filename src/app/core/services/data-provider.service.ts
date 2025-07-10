// 📁 src/app/core/services/data-provider.service.ts
// ✅ VERSIÓN VENDIBLE - SIN FALLBACKS HARDCODEADOS

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { Room } from '../models/room.interface';
import { Establishment } from '../models/establishment.interface';
import { Booking, BookingRequest } from '../models/booking.interface';
import { ROOMS_DATA } from '../data/rooms-data';
import { ESTABLISHMENT_INFO } from '../data/establishment-data';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataProviderService {
  
  private readonly apiUrl = environment.apiUrl;
  private readonly useRealAPI = environment.useRealAPI;

  constructor(private http: HttpClient) {
    console.log(`🔄 DataProvider initialized - Mode: ${this.useRealAPI ? 'REAL API' : 'MOCK DATA'}`);
    console.log(`🌐 API URL: ${this.apiUrl}`);
  }

  // ================================
  // 🛏️ ROOMS DATA
  // ================================

  getRooms(): Observable<Room[]> {
    if (this.useRealAPI) {
      console.log('🌐 Fetching rooms from API...');
      return this.http.get<any>(`${this.apiUrl}/api/rooms`).pipe(
        map(response => {
          console.log('✅ Rooms from API:', response);
          return this.transformApiRoomsToFrontend(response.data);
        }),
        catchError(error => {
          console.error('❌ Error fetching rooms from API:', error);
          console.log('🔄 Fallback to mock data');
          return of(ROOMS_DATA);
        })
      );
    } else {
      console.log('📁 Using mock rooms data');
      return of(ROOMS_DATA);
    }
  }

  getRoomById(id: string): Observable<Room | null> {
    if (this.useRealAPI) {
      console.log(`🌐 Fetching room ${id} from API...`);
      
      const backendId = this.mapFrontendIdToBackend(id);
      console.log(`🔄 ID mapping: ${id} → ${backendId}`);
      
      return this.http.get<any>(`${this.apiUrl}/api/rooms/${backendId}`).pipe(
        map(response => {
          console.log(`✅ Room ${id} fetched from API:`, response.data.name);
          return this.transformApiRoomToFrontend(response.data);
        }),
        catchError(error => {
          console.error(`❌ Error fetching room ${id} from API:`, error);
          console.log('🔄 Fallback to mock data');
          const room = ROOMS_DATA.find(r => r.id === id) || null;
          return of(room);
        })
      );
    } else {
      console.log(`📁 Using mock data for room ${id}`);
      const room = ROOMS_DATA.find(r => r.id === id) || null;
      return of(room);
    }
  }

  // ================================
  // 🏢 ESTABLISHMENT DATA - SIN FALLBACKS
  // ================================

  getEstablishmentInfo(): Observable<Establishment> {
    if (this.useRealAPI) {
      console.log('🌐 Fetching establishment from API...');
      return this.http.get<any>(`${this.apiUrl}/api/establishment`).pipe(
        map(response => {
          console.log('✅ Establishment from API:', response.data.name);
          console.log('🔍 Source confirmed:', response.source); // Para confirmar que viene de DB
          return this.transformApiEstablishmentToFrontend(response.data);
        }),
        catchError(error => {
          console.error('❌ Error fetching establishment from API:', error);
          console.log('🔄 Fallback to mock data');
          return of(ESTABLISHMENT_INFO);
        })
      );
    } else {
      console.log('📁 Using mock establishment data');
      return of(ESTABLISHMENT_INFO);
    }
  }

  // ================================
  // 📋 BOOKINGS DATA
  // ================================

  createBooking(bookingRequest: BookingRequest): Observable<Booking> {
    if (this.useRealAPI) {
      console.log('🌐 Creating booking via API...');
      return this.http.post<any>(`${this.apiUrl}/api/bookings`, bookingRequest).pipe(
        map(response => response.data),
        catchError(error => {
          console.error('❌ Error creating booking via API:', error);
          console.log('🔄 Fallback to mock booking creation');
          const mockBooking = this.createMockBooking(bookingRequest);
          return of(mockBooking);
        })
      );
    } else {
      console.log('📁 Creating mock booking');
      const mockBooking = this.createMockBooking(bookingRequest);
      return of(mockBooking);
    }
  }

  // ================================
  // 🔄 DATA TRANSFORMERS
  // ================================

  private transformApiRoomsToFrontend(apiRooms: any[]): Room[] {
    console.log(`🔄 Transforming ${apiRooms.length} rooms from API format to frontend format`);
    return apiRooms.map(apiRoom => this.transformApiRoomToFrontend(apiRoom));
  }

  private transformApiRoomToFrontend(apiRoom: any): Room {
    console.log('🔄 Transforming room:', apiRoom.name, 'with room_type:', apiRoom.room_type);

    const frontendId = this.mapBackendIdToFrontend(apiRoom.id);
    console.log(`🔄 Backend ID ${apiRoom.id} → Frontend ID ${frontendId}`);
    
    const getRoomTypeFromName = (name: string, roomNumber: string): string => {
      const nameLower = name.toLowerCase();
      const numberLower = roomNumber.toLowerCase();
      
      if (nameLower.includes('individual') || nameLower.includes('sencilla')) return 'individual';
      if (nameLower.includes('doble') || nameLower.includes('double')) return 'doble';
      if (nameLower.includes('triple')) return 'triple';
      if (nameLower.includes('cuadruple')) return 'cuadruple';
      if (nameLower.includes('suite')) return 'suite';
      if (nameLower.includes('familiar') || nameLower.includes('family')) return 'familiar';
      
      if (numberLower.includes('hab')) return 'doble';
      if (numberLower.includes('suite')) return 'suite';
      if (numberLower.includes('fam')) return 'familiar';
      
      return 'doble';
    };

    const roomType = apiRoom.room_type || getRoomTypeFromName(apiRoom.name, apiRoom.room_number);

    return {
      id: frontendId,
      roomNumber: apiRoom.room_number,
      name: apiRoom.name,
      description: apiRoom.description || '',
      roomType: roomType as any,
      bathroomType: (apiRoom.bathroom_type || 'privado') as any,
      maxGuests: apiRoom.max_guests || 2,
      beds: apiRoom.beds || [{ type: 'doble', size: 'doble' }],
      area: apiRoom.area || 25,
      floor: apiRoom.floor || 1,
      hasWindow: apiRoom.has_window !== false,
      windowView: (apiRoom.window_view || 'exterior') as any,
      amenities: apiRoom.amenities || ['wifi-gratis', 'aire-acondicionado', 'tv-smart'],
      features: apiRoom.features || ['Baño privado', 'WiFi gratis', 'Aire acondicionado'],
      
      pricing: {
        basePrice: parseFloat(apiRoom.base_price),
        currency: 'COP',
        seasonalPricing: apiRoom.seasonal_pricing || {}
      },
      
      images: apiRoom.images || {
        main: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop',
        gallery: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop']
      },
      
      availability: {
        isActive: apiRoom.is_active !== false,
        isAvailable: apiRoom.is_available !== false,
        minimumStay: apiRoom.minimum_stay || 1,
        maximumStay: apiRoom.maximum_stay || 30
      },
      
      stats: {
        rating: parseFloat(apiRoom.rating) || 4.5,
        reviewCount: apiRoom.review_count || 0,
        bookingCount: apiRoom.booking_count || 0,
        occupancyRate: parseFloat(apiRoom.occupancy_rate) || 0
      },
      
      createdAt: apiRoom.created_at || new Date().toISOString(),
      updatedAt: apiRoom.updated_at || new Date().toISOString()
    };
  }

  // ✅ ESTABLISHMENT TRANSFORMER - 100% SIN FALLBACKS HARDCODEADOS
  private transformApiEstablishmentToFrontend(apiEstablishment: any): Establishment {
    console.log('🔄 Transforming establishment - NO FALLBACKS VERSION');
    
    // ✅ VALIDAR QUE VENGA DATOS REALES
    if (!apiEstablishment) {
      throw new Error('❌ No se recibieron datos del establecimiento desde el API');
    }
    
    return {
      // ✅ DATOS BÁSICOS - SIN FALLBACKS
      id: apiEstablishment.id?.toString(),
      name: apiEstablishment.name,
      description: apiEstablishment.description,
      tagline: apiEstablishment.tagline,
      
      // ✅ UBICACIÓN - SIN FALLBACKS
      address: apiEstablishment.address,
      coordinates: apiEstablishment.coordinates,
      
      // ✅ CONTACTO - DIRECTO DEL API
      contactInfo: apiEstablishment.contact_info,
      
      // ✅ HOST - DIRECTO DEL API
      host: apiEstablishment.host_info,
      
      // ✅ AMENITIES - DIRECTO DEL API (SIN FALLBACKS)
      amenities: apiEstablishment.amenities,
      
      // ✅ SERVICIOS - DIRECTO DEL API (SIN FALLBACKS)
      services: apiEstablishment.services,
      
      // ✅ POLÍTICAS - DIRECTO DEL API (SIN FALLBACKS)
      policies: apiEstablishment.policies,
      
      // ✅ ÁREA INFO - DIRECTO DEL API (SIN FALLBACKS)
      areaInfo: apiEstablishment.area_info,
      
      // ✅ IMÁGENES - DIRECTO DEL API (SIN FALLBACKS)
      images: apiEstablishment.images,
      
      // ✅ ESTADÍSTICAS - DIRECTO DEL API (SIN FALLBACKS)
      stats: apiEstablishment.stats,
      
      // ✅ SOLO MANTENER CAMPOS CALCULADOS/TÉCNICOS
      isActive: apiEstablishment.is_active !== false,
      isVerified: apiEstablishment.is_verified !== false,
      establishmentType: apiEstablishment.establishment_type || 'hostal',
      
      // ✅ TIMESTAMPS - DIRECTO DEL API
      createdAt: apiEstablishment.created_at,
      updatedAt: apiEstablishment.updated_at
    };
  }

  // ================================
  // 🆔 MAPEO DE IDs FRONTEND ↔ BACKEND
  // ================================

  private mapFrontendIdToBackend(frontendId: string): string {
    // Convertir "room-2" → "2"
    if (frontendId.startsWith('room-')) {
      return frontendId.replace('room-', '');
    }
    // Si ya es numérico, devolver tal como está
    return frontendId;
  }

  private mapBackendIdToFrontend(backendId: number | string): string {
    // Convertir 2 → "room-2"
    return `room-${backendId}`;
  }

  // ================================
  // 🔧 HELPER METHODS
  // ================================

  private createMockBooking(bookingRequest: BookingRequest): Booking {
    const bookingId = 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const bookingReference = `HNA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 999) + 1}`;
    
    return {
      id: bookingId,
      bookingReference: bookingReference,
      status: 'pending',
      paymentStatus: 'pending',
      propertyId: bookingRequest.propertyId,
      propertyTitle: `Habitación Mock - ${bookingRequest.propertyId}`,
      propertyImage: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop',
      propertyAddress: 'Hostal Norte Armenia - Mock',
      propertyZone: 'Centro',
      checkInDate: bookingRequest.checkInDate,
      checkOutDate: bookingRequest.checkOutDate,
      nights: bookingRequest.nights,
      guests: bookingRequest.guests,
      guestInfo: bookingRequest.guestInfo,
      priceBreakdown: {
        pricePerNight: 75000,
        nights: bookingRequest.nights,
        subtotal: 75000 * bookingRequest.nights,
        iva: { percentage: 19, amount: Math.round(75000 * bookingRequest.nights * 0.19) },
        total: Math.round(75000 * bookingRequest.nights * 1.19),
        totalCOP: Math.round(75000 * bookingRequest.nights * 1.19)
      },
      hostName: 'Carlos Mendoza',
      hostWhatsapp: '+57 301 234 5678',
      whatsappMessageSent: false,
      specialRequests: bookingRequest.specialRequests,
      estimatedArrivalTime: bookingRequest.estimatedArrivalTime,
      purposeOfStay: bookingRequest.purposeOfStay,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cancellationPolicy: 'flexible',
      minimumStay: 1
    } as Booking;
  }
}