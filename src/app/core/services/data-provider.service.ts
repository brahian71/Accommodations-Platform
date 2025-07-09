
// 📁 src/app/core/services/data-provider.service.ts

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
      // ✅ CORREGIDO: Añadir /api/ a la URL
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
  // 🏢 ESTABLISHMENT DATA
  // ================================

  getEstablishmentInfo(): Observable<Establishment> {
    if (this.useRealAPI) {
      console.log('🌐 Fetching establishment from API...');
      return this.http.get<any>(`${this.apiUrl}/api/establishment`).pipe(
        map(response => {
          console.log('✅ Establishment from API:', response.data.name);
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

  private transformApiEstablishmentToFrontend(apiEstablishment: any): Establishment {
    return {
      id: apiEstablishment.id?.toString() || 'hostal-norte-armenia',
      name: apiEstablishment.name || 'Hostal Norte Armenia',
      description: apiEstablishment.description || 'Acogedor hostal ubicado en el corazón del norte de Armenia, Quindío.',
      tagline: apiEstablishment.tagline || 'Tu hogar en el corazón del Quindío',
      
      address: apiEstablishment.address || 'Carrera 15 #25-30, Norte Centro, Armenia, Quindío',
      coordinates: apiEstablishment.coordinates || {
        lat: 4.5339,
        lng: -75.6811
      },
      
      contactInfo: apiEstablishment.contact_info || {
        phone: '+573137065373',
        whatsapp: '+573137065373',
        email: 'reservas@hostalnortearmenia.com',
        website: 'www.hostalnortearmenia.com',
        socialMedia: {
          instagram: '@hostalnortearmenia',
          facebook: 'HostalNorteArmenia'
        }
      },
      
      host: apiEstablishment.host_info || {
        name: 'María González',
        photo: 'https://images.unsplash.com/photo-1494790108755-2616b612e886?w=150&h=150&fit=crop&crop=face',
        description: 'Anfitriona experimentada con más de 8 años en hospitalidad.',
        responseTime: 'inmediata',
        languages: ['Español', 'Inglés básico']
      },
      
      amenities: apiEstablishment.amenities || [
        'wifi-gratis',
        'parqueadero',
        'cocina-compartida',
        'sala-comun',
        'terraza',
        'lavanderia',
        'recepcion-24h',
        'vigilancia'
      ],
      
      services: apiEstablishment.services || [
        'limpieza-diaria',
        'transporte-aeropuerto',
        'informacion-turistica',
        'custodia-equipaje',
        'tour-booking'
      ],
      
      policies: apiEstablishment.policies || {
        checkInTime: '15:00',
        checkOutTime: '11:00',
        cancellationPolicy: 'flexible',
        houseRules: [
          'No fumar en habitaciones',
          'Respeto por otros huéspedes',
          'No mascotas',
          'No fiestas en habitaciones',
          'Silencio después de las 10:00 PM'
        ],
        smokingAllowed: false,
        petsAllowed: false,
        partiesAllowed: false
      },
      
      areaInfo: {
        neighborhood: apiEstablishment.neighborhood || 'Norte Centro, Armenia',
        nearbyPlaces: apiEstablishment.area_info?.nearbyPlaces || [
          'Centro Comercial Portal del Quindío',
          'Clínica La Sagrada Familia',
          'Universidad del Quindío',
          'Parque Los Fundadores'
        ],
        transportAccess: apiEstablishment.area_info?.transportAccess || [
          'Bus urbano líneas 1, 2, 3 y 7',
          'Taxi disponible 24 horas',
          'A 10 minutos del centro'
        ],
        walkingDistances: apiEstablishment.area_info?.walkingDistances || {
          'Centro Comercial Portal del Quindío': '8 min',
          'Parque Los Fundadores': '12 min',
          'Centro de Armenia': '10 min'
        }
      },
      
      images: apiEstablishment.images || {
        main: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
        gallery: [
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'
        ],
        exterior: [
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop'
        ],
        commonAreas: [
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'
        ]
      },
      
      stats: {
        totalRooms: apiEstablishment.total_rooms || 5,
        totalCapacity: apiEstablishment.total_capacity || 12,
        averageRating: parseFloat(apiEstablishment.average_rating) || 4.8,
        totalReviews: apiEstablishment.total_reviews || 543,
        yearsOperating: apiEstablishment.years_operating || 3
      },
      
      isActive: apiEstablishment.is_active !== undefined ? apiEstablishment.is_active : true,
      isVerified: apiEstablishment.is_verified !== undefined ? apiEstablishment.is_verified : true,
      establishmentType: apiEstablishment.establishment_type || 'hostal',
      
      createdAt: apiEstablishment.created_at || '2022-01-15T00:00:00.000Z',
      updatedAt: apiEstablishment.updated_at || new Date().toISOString()
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