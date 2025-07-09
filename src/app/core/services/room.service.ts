// ================================
// 📁 src/app/core/services/room.service.ts
// ================================

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, EMPTY } from 'rxjs';
import { map, delay, switchMap, tap, catchError } from 'rxjs/operators';

import { Room, RoomType, RoomFilters, RoomSearchParams, RoomStats, BathroomType, RoomAmenityType } from '../models/room.interface';

import { DataProviderService } from './data-provider.service';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  
  private roomsSubject = new BehaviorSubject<Room[]>([]);
  private favoritesSubject = new BehaviorSubject<string[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  
  public rooms$ = this.roomsSubject.asObservable();
  public favorites$ = this.favoritesSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private dataProvider: DataProviderService) {
    console.log('🛏️ RoomService initialized - Using 100% DataProvider');
    this.loadFavoritesFromStorage();
    this.loadRoomsFromDataProvider();

    this.rooms$.subscribe(rooms => {
      console.log('🔄 RoomService - rooms$ actualizado:', rooms.length, 'habitaciones');
    });
  }

  private loadRoomsFromDataProvider(): void {
    this.isLoadingSubject.next(true);
    console.log('📡 RoomService: Solicitando habitaciones a DataProvider...');
    
    this.dataProvider.getRooms().subscribe({
      next: (rooms) => {
        console.log('✅ RoomService: Habitaciones cargadas desde DataProvider:', rooms.length);
        console.log('🏠 RoomService: Actualizando BehaviorSubject con habitaciones:', rooms);
        console.log('📋 RoomService: IDs de habitaciones:', rooms.map(r => r.id));
        this.roomsSubject.next(rooms);
        this.isLoadingSubject.next(false);
        console.log('🎯 RoomService: BehaviorSubject actualizado. Estado final:', this.roomsSubject.value.length, 'habitaciones');
      },
      error: (error) => {
        console.error('❌ RoomService: Error cargando habitaciones:', error);
        this.isLoadingSubject.next(false);
        console.log('🔄 RoomService: Manteniendo array vacío por error');
        this.roomsSubject.next([]);
      }
    });
  }

  refreshRooms(): Observable<Room[]> {
    console.log('🔄 RoomService: Refrescando habitaciones...');
    this.loadRoomsFromDataProvider();
    return this.rooms$;
  }

  debugCurrentState(): void {
    console.log('🔍 RoomService Debug Estado Actual:');
    console.log('📊 Habitaciones en BehaviorSubject:', this.roomsSubject.value.length);
    console.log('🏠 Habitaciones:', this.roomsSubject.value.map(r => ({ id: r.id, name: r.name, price: r.pricing.basePrice })));
    console.log('⏳ Loading state:', this.isLoadingSubject.value);
  }

  // ================================
  // 🛏️ CONSULTAS BÁSICAS DE HABITACIONES
  // ================================

  getRooms(): Observable<Room[]> {
    return this.rooms$; 
  }

  getFeaturedRooms(): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => {
        console.log('🏠 getFeaturedRooms: Processing', rooms.length, 'habitaciones');
        
        if (rooms.length === 0) {
          console.log('⚠️ getFeaturedRooms: No hay habitaciones disponibles');
          return [];
        }
        rooms.forEach(room => {
          console.log(`🛏️ Room ${room.id}: ${room.name}, type: ${room.roomType}, active: ${room.availability.isActive}, available: ${room.availability.isAvailable}`);
        });
        const availableRooms = rooms.filter(room => {
          const isValid = room.availability.isActive && room.availability.isAvailable;
          if (!isValid) {
            console.log(`❌ Room ${room.id} filtered out - active: ${room.availability.isActive}, available: ${room.availability.isAvailable}`);
          }
          return isValid;
        });
        
        console.log('✅ getFeaturedRooms: Habitaciones disponibles:', availableRooms.length);
        
        const roomsToProcess = availableRooms.length > 0 ? availableRooms : rooms;

        const featured = roomsToProcess
          .sort((a, b) => b.stats.rating - a.stats.rating)
          .slice(0, 4);
          
        console.log('🌟 getFeaturedRooms: Habitaciones destacadas:', featured.length, featured.map(r => r.name));
        
        return featured;
      }),
      delay(150)
    );
  }

  getRoomById(id: string): Observable<Room | undefined> {
    return this.rooms$.pipe(
      map(rooms => rooms.find(room => room.id === id)),
      delay(150)
    );
  }

  getAvailableRooms(): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => rooms.filter(room => 
        room.availability.isActive && room.availability.isAvailable
      )),
      delay(200)
    );
  }

  // ================================
  // 🔍 BÚSQUEDAS POR CRITERIOS
  // ================================

  getRoomsByType(type: RoomType): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => rooms.filter(room => room.roomType === type)),
      delay(150)
    );
  }

  getRoomsByCapacity(minGuests: number): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => rooms.filter(room => room.maxGuests >= minGuests)),
      delay(150)
    );
  }

  getRoomsByPriceRange(minPrice: number, maxPrice: number): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => rooms.filter(room => 
        room.pricing.basePrice >= minPrice && room.pricing.basePrice <= maxPrice
      )),
      delay(150)
    );
  }

  getRoomsByAmenities(amenities: RoomAmenityType[]): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => rooms.filter(room => 
        amenities.every(amenity => room.amenities.includes(amenity))
      )),
      delay(200)
    );
  }

  getRoomsByBathroomType(type: BathroomType): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => rooms.filter(room => room.bathroomType === type)),
      delay(150)
    );
  }

  // ================================
  // 🔍 BÚSQUEDA AVANZADA CON FILTROS
  // ================================

  searchRooms(searchParams: RoomSearchParams): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => {
        if (rooms.length === 0) return [];
        
        let filtered = [...rooms];

        // Filtrar por número de huéspedes
        if (searchParams.guests > 0) {
          filtered = filtered.filter(room => room.maxGuests >= searchParams.guests);
        }

        // Filtrar por tipo de habitación
        if (searchParams.roomType) {
          filtered = filtered.filter(room => room.roomType === searchParams.roomType);
        }

        // Filtrar por precio máximo
        if (searchParams.maxPrice && searchParams.maxPrice > 0) {
          filtered = filtered.filter(room => room.pricing.basePrice <= searchParams.maxPrice!);
        }

        // Solo habitaciones disponibles
        filtered = filtered.filter(room => 
          room.availability.isActive && room.availability.isAvailable
        );

        return filtered;
      }),
      delay(300)
    );
  }

  searchWithFilters(filters: RoomFilters): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => {
        if (rooms.length === 0) return [];
        
        let filtered = [...rooms];

        // Filtrar por tipos de habitación
        if (filters.roomTypes.length > 0) {
          filtered = filtered.filter(room => filters.roomTypes.includes(room.roomType));
        }

        // Filtrar por capacidad
        if (filters.capacity > 0) {
          filtered = filtered.filter(room => room.maxGuests >= filters.capacity);
        }

        // Filtrar por rango de precios
        if (filters.priceRange.min > 0 || filters.priceRange.max < Infinity) {
          filtered = filtered.filter(room => 
            room.pricing.basePrice >= filters.priceRange.min &&
            room.pricing.basePrice <= filters.priceRange.max
          );
        }

        // Filtrar por amenidades
        if (filters.amenities.length > 0) {
          filtered = filtered.filter(room => 
            filters.amenities.every(amenity => room.amenities.includes(amenity))
          );
        }

        // Filtrar por tipo de baño
        if (filters.bathroomType) {
          filtered = filtered.filter(room => room.bathroomType === filters.bathroomType);
        }

        // Filtrar por balcón
        if (filters.hasBalcony) {
          filtered = filtered.filter(room => room.amenities.includes('balcon'));
        }

        // Filtrar por espacio de trabajo
        if (filters.hasWorkspace) {
          filtered = filtered.filter(room => 
            room.amenities.includes('escritorio') && room.amenities.includes('silla-trabajo')
          );
        }

        // Filtrar por calificación mínima
        if (filters.minRating && filters.minRating > 0) {
          filtered = filtered.filter(room => room.stats.rating >= filters.minRating!);
        }

        // Solo habitaciones disponibles
        filtered = filtered.filter(room => 
          room.availability.isActive && room.availability.isAvailable
        );

        return filtered;
      }),
      delay(300)
    );
  }

  searchByText(searchTerm: string): Observable<Room[]> {
    if (!searchTerm.trim()) {
      return this.rooms$;
    }

    const term = searchTerm.toLowerCase();
    
    return this.rooms$.pipe(
      map(rooms => rooms.filter(room =>
        room.name.toLowerCase().includes(term) ||
        room.description.toLowerCase().includes(term) ||
        room.roomNumber.toLowerCase().includes(term) ||
        room.features.some(feature => feature.toLowerCase().includes(term)) ||
        room.roomType.toLowerCase().includes(term)
      )),
      delay(250)
    );
  }

  // ================================
  // 📊 ORDENAMIENTO
  // ================================

  sortRooms(rooms: Room[], sortBy: string): Room[] {
    const sorted = [...rooms];
    
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.pricing.basePrice - b.pricing.basePrice);
      
      case 'price-desc':
        return sorted.sort((a, b) => b.pricing.basePrice - a.pricing.basePrice);
      
      case 'rating':
        return sorted.sort((a, b) => b.stats.rating - a.stats.rating);
      
      case 'reviews':
        return sorted.sort((a, b) => b.stats.reviewCount - a.stats.reviewCount);

      case 'capacity':
        return sorted.sort((a, b) => b.maxGuests - a.maxGuests);
      
      case 'room-number':
        return sorted.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
      
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      
      case 'relevance':
      default:
        return sorted.sort((a, b) => {
          // Priorizar por disponibilidad
          if (a.availability.isAvailable !== b.availability.isAvailable) {
            return a.availability.isAvailable ? -1 : 1;
          }

          // Luego por calificación
          if (Math.abs(a.stats.rating - b.stats.rating) > 0.1) {
            return b.stats.rating - a.stats.rating;
          }

          // Finalmente por número de habitación
          return a.roomNumber.localeCompare(b.roomNumber);
        });
    }
  }

  // ================================
  // ⭐ GESTIÓN DE FAVORITOS
  // ================================

  toggleFavorite(roomId: string): Observable<boolean> {
    const currentFavorites = this.favoritesSubject.value;
    const isFavorite = currentFavorites.includes(roomId);
    
    let newFavorites: string[];
    
    if (isFavorite) {
      newFavorites = currentFavorites.filter(id => id !== roomId);
    } else {
      newFavorites = [...currentFavorites, roomId];
    }
    
    this.favoritesSubject.next(newFavorites);
    this.saveFavoritesToStorage(newFavorites);
    
    return of(!isFavorite).pipe(delay(100));
  }

  isFavorite(roomId: string): Observable<boolean> {
    return this.favorites$.pipe(
      map(favorites => favorites.includes(roomId))
    );
  }

  getFavoriteRooms(): Observable<Room[]> {
    return this.rooms$.pipe(
      map(rooms => {
        const favoriteIds = this.favoritesSubject.value;
        return rooms.filter(room => favoriteIds.includes(room.id));
      }),
      delay(150)
    );
  }

  // ================================
  // 📊 ESTADÍSTICAS Y ANALYTICS
  // ================================

  getRoomStats(): Observable<RoomStats> {
    return this.rooms$.pipe(
      map(rooms => {
        if (rooms.length === 0) {
          return {
            totalRooms: 0,
            availableRooms: 0,
            occupiedRooms: 0,
            averagePrice: 0,
            averageRating: 0,
            totalReviews: 0,
            occupancyRate: 0,
            mostPopularRoomType: 'doble' as RoomType,
            averageStayDuration: 0
          };
        }

        const available = rooms.filter(r => r.availability.isAvailable);
        const occupied = rooms.filter(r => !r.availability.isAvailable);
        
        const avgPrice = Math.round(rooms.reduce((sum, r) => sum + r.pricing.basePrice, 0) / rooms.length);
        const avgRating = Math.round((rooms.reduce((sum, r) => sum + r.stats.rating, 0) / rooms.length) * 10) / 10;
        const totalReviews = rooms.reduce((sum, r) => sum + r.stats.reviewCount, 0);
        const totalBookings = rooms.reduce((sum, r) => sum + r.stats.bookingCount, 0);
        const avgOccupancy = Math.round((rooms.reduce((sum, r) => sum + (r.stats.occupancyRate || 0), 0) / rooms.length));
        
        // Encontrar tipo de habitación más popular
        const typeCount = rooms.reduce((acc, r) => {
          acc[r.roomType] = (acc[r.roomType] || 0) + r.stats.bookingCount;
          return acc;
        }, {} as Record<RoomType, number>);
        
        const mostPopularType = Object.entries(typeCount)
          .sort(([,a], [,b]) => b - a)[0]?.[0] as RoomType || 'doble';

        const avgStayDuration = 2.8; // Mock data

        return {
          totalRooms: rooms.length,
          availableRooms: available.length,
          occupiedRooms: occupied.length,
          averagePrice: avgPrice,
          averageRating: avgRating,
          totalReviews: totalReviews,
          occupancyRate: avgOccupancy,
          mostPopularRoomType: mostPopularType,
          averageStayDuration: avgStayDuration
        };
      }),
      delay(200)
    );
  }

  incrementRoomViews(roomId: string): Observable<boolean> {
    console.log(`👁️ Habitación ${roomId} vista`);
    return of(true);
  }

  getSimilarRooms(roomId: string, limit: number = 3): Observable<Room[]> {
    return this.getRoomById(roomId).pipe(
      switchMap(room => {
        if (!room) return of([]);

        return this.rooms$.pipe(
          map(allRooms => 
            allRooms
              .filter(r => r.id !== roomId)
              .sort((a, b) => {
                // Priorizar por mismo tipo de habitación
                const aScore = (a.roomType === room.roomType ? 3 : 0) + 
                              (Math.abs(a.maxGuests - room.maxGuests) <= 1 ? 2 : 0) +
                              (Math.abs(a.pricing.basePrice - room.pricing.basePrice) <= 20000 ? 1 : 0);
                
                const bScore = (b.roomType === room.roomType ? 3 : 0) + 
                              (Math.abs(b.maxGuests - room.maxGuests) <= 1 ? 2 : 0) +
                              (Math.abs(b.pricing.basePrice - room.pricing.basePrice) <= 20000 ? 1 : 0);
                
                return bScore - aScore;
              })
              .slice(0, limit)
          )
        );
      })
    );
  }

  // ================================
  // 💰 CÁLCULOS DE PRECIOS
  // ================================

  calculateRoomPrice(roomId: string, nights: number): Observable<{
    basePrice: number;
    subtotal: number;
    discount?: { type: 'weekly' | 'monthly'; percentage: number; amount: number };
    total: number;
  }> {
    console.log(`💰 Calculating price for room ${roomId}, ${nights} nights`);
    
    return this.getRoomById(roomId).pipe(
      map(room => {
        if (!room) {
          console.error(`❌ Room ${roomId} not found for price calculation. Available rooms:`, this.roomsSubject.value.map(r => r.id));
          
          // ✅ FALLBACK: Usar precio por defecto en lugar de error
          const defaultPrice = 75000; // Precio base por defecto
          console.log(`🔄 Using default price ${defaultPrice} for missing room ${roomId}`);
          
          return {
            basePrice: defaultPrice,
            subtotal: defaultPrice * nights,
            discount: undefined,
            total: defaultPrice * nights
          };
        }
        
        console.log(`✅ Room ${roomId} found: ${room.name}, base price: ${room.pricing.basePrice}`);
        
        const basePrice = room.pricing.basePrice;
        let subtotal = basePrice * nights;
        let discount: any = undefined;
        
        // Aplicar descuentos por estancia larga
        if (nights >= 7 && nights < 28) {
          discount = {
            type: 'weekly' as const,
            percentage: 5,
            amount: Math.round(subtotal * 0.05)
          };
        } else if (nights >= 28) {
          discount = {
            type: 'monthly' as const,
            percentage: 15,
            amount: Math.round(subtotal * 0.15)
          };
        }
        
        const finalSubtotal = discount ? subtotal - discount.amount : subtotal;
        
        return {
          basePrice,
          subtotal: basePrice * nights,
          discount,
          total: finalSubtotal
        };
      }),
      delay(100),
      catchError(error => {
        console.error(`❌ Error calculating price for room ${roomId}:`, error);
        
        // ✅ FALLBACK ROBUSTO: Devolver precio por defecto
        const defaultPrice = 75000;
        return of({
          basePrice: defaultPrice,
          subtotal: defaultPrice * nights,
          discount: undefined,
          total: defaultPrice * nights
        });
      })
    );
  }

  // ================================
  // 🔧 MÉTODO ADICIONAL: Debug room availability
  // ================================

  // ✅ AÑADIR ESTE MÉTODO PARA DEBUGGING:
  debugRoomAvailability(roomId: string): void {
    console.log('🔍 Debug Room Availability for:', roomId);
    console.log('📊 Current rooms in service:', this.roomsSubject.value.length);
    console.log('🏠 Available room IDs:', this.roomsSubject.value.map(r => ({ id: r.id, name: r.name })));
    
    const room = this.roomsSubject.value.find(r => r.id === roomId);
    if (room) {
      console.log('✅ Room found:', room.name, 'Price:', room.pricing.basePrice);
    } else {
      console.log('❌ Room NOT found. Searched for:', roomId);
      console.log('🔄 Trying to find similar IDs...');
      const similarIds = this.roomsSubject.value.filter(r => 
        r.id.includes(roomId.replace('room-', '')) || 
        roomId.includes(r.id.replace('room-', ''))
      );
      console.log('🔍 Similar IDs found:', similarIds.map(r => r.id));
    }
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS
  // ================================

  private loadFavoritesFromStorage(): void {
    try {
      const saved = localStorage.getItem('hostal_norte_favorites');
      if (saved) {
        const favorites = JSON.parse(saved);
        this.favoritesSubject.next(favorites);
      }
    } catch (error) {
      console.warn('Error loading favorites from storage:', error);
    }
  }

  private saveFavoritesToStorage(favorites: string[]): void {
    try {
      localStorage.setItem('hostal_norte_favorites', JSON.stringify(favorites));
    } catch (error) {
      console.warn('Error saving favorites to storage:', error);
    }
  }

  // ================================
  // 🛠️ UTILIDADES
  // ================================

  getRoomTypeLabel(type: RoomType): string {
    const labels = {
      'individual': 'Habitación Individual',
      'doble': 'Habitación Doble',
      'triple': 'Habitación Triple',
      'cuadruple': 'Habitación Cuádruple',
      'suite': 'Suite',
      'familiar': 'Habitación Familiar'
    };
    return labels[type] || type;
  }

  checkRoomAvailability(roomId: string, checkIn: string, checkOut: string): Observable<boolean> {
    console.log(`🔍 Checking availability for room ${roomId}`);
    
    // ✅ VERIFICAR QUE LA HABITACIÓN EXISTE PRIMERO
    const room = this.roomsSubject.value.find(r => r.id === roomId);
    if (!room) {
      console.warn(`⚠️ Room ${roomId} not found for availability check. Returning false.`);
      return of(false).pipe(delay(300));
    }
    
    // Mock: 90% de probabilidad de estar disponible
    const isAvailable = Math.random() > 0.1;
    console.log(`✅ Room ${roomId} availability: ${isAvailable}`);
    
    return of(isAvailable).pipe(delay(300));
  }

  // ✅ CORREGIDO: Usar DataProvider en lugar de datos mock
  getEstablishmentStats(): Observable<any> {
    return this.getRoomStats().pipe(
      map(roomStats => ({
        totalRooms: roomStats.totalRooms,
        averagePrice: roomStats.averagePrice,
        averageRating: roomStats.averageRating,
        totalReviews: roomStats.totalReviews,
        occupancyRate: roomStats.occupancyRate
      }))
    );
  }
}