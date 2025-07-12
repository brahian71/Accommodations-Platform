// ================================
// 📁 src/app/admin/services/admin-data.service.ts
// 🎯 SERVICIO CENTRALIZADO ADMIN - Siguiendo patrón DataProvider
// ================================

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

import { Room } from '../../core/models/room.interface';
import { Establishment } from '../../core/models/establishment.interface';
import { environment } from '../../../environments/environment';

// ================================
// 🔒 INTERFACES ADMIN
// ================================

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: AdminPermission[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export type AdminPermission = 
  | 'establishment:edit' | 'establishment:view'
  | 'rooms:create' | 'rooms:edit' | 'rooms:delete' | 'rooms:view'
  | 'pricing:edit' | 'pricing:view'
  | 'bookings:edit' | 'bookings:view'
  | 'users:manage' | 'stats:view';

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  user: AdminUser;
  token: string;
  expiresIn: number;
}

export interface AdminEstablishmentUpdate {
  name?: string;
  description?: string;
  tagline?: string;
  address?: string;
  contactInfo?: Partial<Establishment['contactInfo']>;
  host?: Partial<Establishment['host']>;
  amenities?: string[];
  services?: string[];
  policies?: Partial<Establishment['policies']>;
  areaInfo?: Partial<Establishment['areaInfo']>;
  updatedBy?: string;
  changeReason?: string;
}

export interface AdminRoomUpdate {
  roomNumber?: string;
  name?: string;
  description?: string;
  roomType?: Room['roomType'];
  bathroomType?: Room['bathroomType'];
  maxGuests?: number;
  beds?: Room['beds'];
  area?: number;
  floor?: number;
  hasWindow?: boolean;
  windowView?: Room['windowView'];
  amenities?: Room['amenities'];
  features?: string[];
  pricing?: Partial<Room['pricing']>;
  availability?: Partial<Room['availability']>;
  updatedBy?: string;
}

export interface AdminApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  source?: string;
  timestamp?: string;
  error?: string;
}

// ================================
// 🔧 SERVICIO ADMIN DATA
// ================================

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {
  
  private readonly apiUrl = environment.apiUrl;
  private readonly adminApiUrl = `${this.apiUrl}/api/admin`;
  
  // ✅ ESTADO REACTIVO - Siguiendo patrón establecido
  private currentUserSubject = new BehaviorSubject<AdminUser | null>(null);
  private authTokenSubject = new BehaviorSubject<string | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public authToken$ = this.authTokenSubject.asObservable();

  constructor(private http: HttpClient) {
    console.log('🔄 AdminDataService initialized');
    console.log('🌐 Admin API URL:', this.adminApiUrl);
    this.loadTokenFromStorage();
  }

  // ================================
  // 🔐 AUTENTICACIÓN
  // ================================

  login(credentials: AdminLoginRequest): Observable<AdminLoginResponse> {
    console.log('🔐 AdminDataService: Attempting login for user:', credentials.username);
    
    return this.http.post<AdminApiResponse<AdminLoginResponse>>(`${this.adminApiUrl}/auth/login`, credentials).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          console.log('✅ AdminDataService: Login successful');
          
          // Guardar token y usuario
          this.authTokenSubject.next(response.data.token);
          this.currentUserSubject.next(response.data.user);
          this.saveTokenToStorage(response.data.token);
          
          return response.data;
        }
        throw new Error(response.message || 'Login failed');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Login failed:', error);
        throw error;
      })
    );
  }

  logout(): Observable<boolean> {
    console.log('🔐 AdminDataService: Logging out');
    
    // Limpiar estado
    this.authTokenSubject.next(null);
    this.currentUserSubject.next(null);
    this.removeTokenFromStorage();
    
    return of(true);
  }

  validateToken(): Observable<AdminUser> {
    const token = this.authTokenSubject.value;
    if (!token) {
      throw new Error('No token available');
    }

    return this.http.get<AdminApiResponse<AdminUser>>(`${this.adminApiUrl}/auth/validate`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          this.currentUserSubject.next(response.data);
          return response.data;
        }
        throw new Error('Token validation failed');
      }),
      catchError(error => {
        console.error('❌ Token validation failed:', error);
        this.logout();
        throw error;
      })
    );
  }

  // ================================
  // 🏨 GESTIÓN DE ESTABLECIMIENTO
  // ================================

  getEstablishmentForEdit(): Observable<Establishment> {
    console.log('🏨 AdminDataService: Fetching establishment for edit');
    
    return this.http.get<AdminApiResponse<Establishment>>(`${this.adminApiUrl}/establishment`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          console.log('✅ AdminDataService: Establishment data loaded for edit');
          return response.data;
        }
        throw new Error(response.message || 'Failed to load establishment');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Error loading establishment:', error);
        throw error;
      })
    );
  }

  updateEstablishment(updates: AdminEstablishmentUpdate): Observable<Establishment> {
    console.log('🏨 AdminDataService: Updating establishment:', Object.keys(updates));
    
    return this.http.put<AdminApiResponse<Establishment>>(`${this.adminApiUrl}/establishment`, updates, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          console.log('✅ AdminDataService: Establishment updated successfully');
          return response.data;
        }
        throw new Error(response.message || 'Failed to update establishment');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Error updating establishment:', error);
        throw error;
      })
    );
  }

  // ================================
  // 🛏️ GESTIÓN DE HABITACIONES
  // ================================

  getRoomsForAdmin(): Observable<Room[]> {
    console.log('🛏️ AdminDataService: Fetching rooms for admin');
    
    return this.http.get<AdminApiResponse<Room[]>>(`${this.adminApiUrl}/rooms`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          console.log('✅ AdminDataService: Rooms loaded for admin:', response.data.length);
          return response.data.map(room => this.transformApiRoomToFrontend(room));
        }
        throw new Error(response.message || 'Failed to load rooms');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Error loading rooms:', error);
        throw error;
      })
    );
  }

  getRoomByIdForAdmin(roomId: string): Observable<Room> {
    console.log('🛏️ AdminDataService: Fetching room for admin:', roomId);
    const backendId = this.mapFrontendIdToBackend(roomId);
    
    return this.http.get<AdminApiResponse<Room>>(`${this.adminApiUrl}/rooms/${backendId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          console.log('✅ AdminDataService: Room loaded for admin');
          return this.transformApiRoomToFrontend(response.data);
        }
        throw new Error(response.message || 'Failed to load room');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Error loading room:', error);
        throw error;
      })
    );
  }

  createRoom(roomData: AdminRoomUpdate): Observable<Room> {
    console.log('🛏️ AdminDataService: Creating new room:', roomData.name);
    
    return this.http.post<AdminApiResponse<Room>>(`${this.adminApiUrl}/rooms`, roomData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          console.log('✅ AdminDataService: Room created successfully');
          return this.transformApiRoomToFrontend(response.data);
        }
        throw new Error(response.message || 'Failed to create room');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Error creating room:', error);
        throw error;
      })
    );
  }

  updateRoom(roomId: string, updates: AdminRoomUpdate): Observable<Room> {
    console.log('🛏️ AdminDataService: Updating room:', roomId);
    const backendId = this.mapFrontendIdToBackend(roomId);
    
    return this.http.put<AdminApiResponse<Room>>(`${this.adminApiUrl}/rooms/${backendId}`, updates, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          console.log('✅ AdminDataService: Room updated successfully');
          return this.transformApiRoomToFrontend(response.data);
        }
        throw new Error(response.message || 'Failed to update room');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Error updating room:', error);
        throw error;
      })
    );
  }

  deleteRoom(roomId: string): Observable<boolean> {
    console.log('🛏️ AdminDataService: Deleting room:', roomId);
    const backendId = this.mapFrontendIdToBackend(roomId);
    
    return this.http.delete<AdminApiResponse>(`${this.adminApiUrl}/rooms/${backendId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        if (response.status === 'success') {
          console.log('✅ AdminDataService: Room deleted successfully');
          return true;
        }
        throw new Error(response.message || 'Failed to delete room');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Error deleting room:', error);
        throw error;
      })
    );
  }

  // ================================
  // 📁 GESTIÓN DE IMÁGENES
  // ================================

  uploadImage(file: File, imageType: 'establishment' | 'room', resourceId?: string): Observable<{url: string; filename: string}> {
    console.log('📁 AdminDataService: Uploading image:', file.name, 'type:', imageType);
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('imageType', imageType);
    if (resourceId) {
      formData.append('resourceId', resourceId);
    }
    
    return this.http.post<AdminApiResponse<{url: string; filename: string}>>(`${this.adminApiUrl}/upload`, formData, {
      headers: this.getAuthHeaders(false) // No Content-Type para FormData
    }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          console.log('✅ AdminDataService: Image uploaded successfully');
          return response.data;
        }
        throw new Error(response.message || 'Failed to upload image');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Error uploading image:', error);
        throw error;
      })
    );
  }

  deleteImage(imageUrl: string): Observable<boolean> {
    console.log('📁 AdminDataService: Deleting image:', imageUrl);
    
    return this.http.delete<AdminApiResponse>(`${this.adminApiUrl}/upload`, {
      headers: this.getAuthHeaders(),
      body: { imageUrl }
    }).pipe(
      map(response => {
        if (response.status === 'success') {
          console.log('✅ AdminDataService: Image deleted successfully');
          return true;
        }
        throw new Error(response.message || 'Failed to delete image');
      }),
      catchError(error => {
        console.error('❌ AdminDataService: Error deleting image:', error);
        throw error;
      })
    );
  }

  // ================================
  // 🔄 TRANSFORMADORES DE DATOS
  // ================================

  private transformApiRoomToFrontend(apiRoom: any): Room {
    // ✅ Reutilizar lógica del DataProviderService
    const frontendId = this.mapBackendIdToFrontend(apiRoom.id);
    
    return {
      id: frontendId,
      roomNumber: apiRoom.room_number,
      name: apiRoom.name,
      description: apiRoom.description || '',
      roomType: apiRoom.room_type as any,
      bathroomType: (apiRoom.bathroom_type || 'privado') as any,
      maxGuests: apiRoom.max_guests || 2,
      beds: apiRoom.beds || [{ type: 'doble', quantity: 1 }],
      area: apiRoom.area || 25,
      floor: apiRoom.floor || 1,
      hasWindow: apiRoom.has_window !== false,
      windowView: (apiRoom.window_view || 'exterior') as any,
      amenities: apiRoom.amenities || [],
      features: apiRoom.features || [],
      
      pricing: {
        basePrice: parseFloat(apiRoom.base_price),
        currency: 'COP',
        seasonalPricing: apiRoom.seasonal_pricing || {}
      },
      
      images: apiRoom.images || {
        main: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop',
        gallery: []
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

  // ================================
  // 🔧 MÉTODOS AUXILIARES
  // ================================

  private getAuthHeaders(includeContentType: boolean = true): HttpHeaders {
    const token = this.authTokenSubject.value;
    let headers = new HttpHeaders();
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (includeContentType) {
      headers = headers.set('Content-Type', 'application/json');
    }
    
    return headers;
  }

  private mapFrontendIdToBackend(frontendId: string): string {
    return frontendId.startsWith('room-') ? frontendId.replace('room-', '') : frontendId;
  }

  private mapBackendIdToFrontend(backendId: number | string): string {
    return `room-${backendId}`;
  }

  private saveTokenToStorage(token: string): void {
    try {
      localStorage.setItem('admin_auth_token', token);
    } catch (error) {
      console.warn('Could not save token to localStorage:', error);
    }
  }

  private loadTokenFromStorage(): void {
    try {
      const token = localStorage.getItem('admin_auth_token');
      if (token) {
        this.authTokenSubject.next(token);
        // Validar token automáticamente
        this.validateToken().subscribe({
          next: () => console.log('✅ Token validated from storage'),
          error: () => this.removeTokenFromStorage()
        });
      }
    } catch (error) {
      console.warn('Could not load token from localStorage:', error);
    }
  }

  private removeTokenFromStorage(): void {
    try {
      localStorage.removeItem('admin_auth_token');
    } catch (error) {
      console.warn('Could not remove token from localStorage:', error);
    }
  }

  // ================================
  // 🔍 MÉTODOS DE ESTADO
  // ================================

  isAuthenticated(): boolean {
    return !!this.authTokenSubject.value && !!this.currentUserSubject.value;
  }

  getCurrentUser(): AdminUser | null {
    return this.currentUserSubject.value;
  }

  hasPermission(permission: AdminPermission): boolean {
    const user = this.currentUserSubject.value;
    if (!user) return false;
    
    // Owner tiene todos los permisos
    if (user.role === 'owner') return true;
    
    return user.permissions.includes(permission);
  }

  hasAnyPermission(permissions: AdminPermission[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }
}