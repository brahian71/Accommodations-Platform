// ================================
// 📁 src/app/admin/services/admin-auth.service.ts
// 🔐 SERVICIO DE AUTENTICACIÓN ADMIN
// ================================

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, timer, of } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';

import { AdminDataService, AdminUser, AdminLoginRequest, AdminLoginResponse, AdminPermission } from './admin-data.service';

// ================================
// 🔒 INTERFACES DE AUTENTICACIÓN
// ================================

export interface AuthState {
  isAuthenticated: boolean;
  user: AdminUser | null;
  isLoading: boolean;
  error: string | null;
  lastActivity: Date;
}

export interface LoginResult {
  success: boolean;
  user?: AdminUser;
  error?: string;
  redirectUrl?: string;
}

// ================================
// 🔐 SERVICIO DE AUTENTICACIÓN
// ================================

@Injectable({
  providedIn: 'root'
})
export class AdminAuthService {
  
  // ✅ ESTADO REACTIVO
  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
    lastActivity: new Date()
  });
  
  public authState$ = this.authStateSubject.asObservable();
  
  // ✅ CONFIGURACIÓN
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
  private readonly ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minuto
  private activityTimer$?: Observable<number>;

  constructor(
    private adminDataService: AdminDataService,
    private router: Router
  ) {
    console.log('🔐 AdminAuthService initialized');
    this.initializeAuthState();
    this.startActivityMonitoring();
  }

  // ================================
  // 🔑 MÉTODOS DE AUTENTICACIÓN
  // ================================

  login(credentials: AdminLoginRequest): Observable<LoginResult> {
    console.log('🔐 AdminAuthService: Starting login process');
    
    this.updateAuthState({ isLoading: true, error: null });
    
    return this.adminDataService.login(credentials).pipe(
      map((response: AdminLoginResponse) => {
        console.log('✅ AdminAuthService: Login successful');
        
        // Actualizar estado
        this.updateAuthState({
          isAuthenticated: true,
          user: response.user,
          isLoading: false,
          error: null,
          lastActivity: new Date()
        });
        
        // Determinar URL de redirección
        const redirectUrl = this.getRedirectUrl(response.user);
        
        return {
          success: true,
          user: response.user,
          redirectUrl
        } as LoginResult;
      }),
      catchError(error => {
        console.error('❌ AdminAuthService: Login failed:', error);
        
        this.updateAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: this.getErrorMessage(error)
        });
        
        return of({
          success: false,
          error: this.getErrorMessage(error)
        } as LoginResult);
      })
    );
  }

  logout(redirectToLogin: boolean = true): Observable<boolean> {
    console.log('🔐 AdminAuthService: Logging out');
    
    return this.adminDataService.logout().pipe(
      tap(() => {
        // Limpiar estado
        this.updateAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
          lastActivity: new Date()
        });
        
        // Detener monitoreo de actividad
        this.stopActivityMonitoring();
        
        // Redireccionar si es necesario
        if (redirectToLogin) {
          this.router.navigate(['/admin/login']);
        }
      })
    );
  }

  validateSession(): Observable<boolean> {
    console.log('🔐 AdminAuthService: Validating session');
    
    if (!this.adminDataService.isAuthenticated()) {
      return of(false);
    }
    
    this.updateAuthState({ isLoading: true });
    
    return this.adminDataService.validateToken().pipe(
      map((user: AdminUser) => {
        console.log('✅ AdminAuthService: Session valid');
        
        this.updateAuthState({
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null,
          lastActivity: new Date()
        });
        
        return true;
      }),
      catchError(error => {
        console.error('❌ AdminAuthService: Session invalid:', error);
        
        this.updateAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: 'Sesión expirada'
        });
        
        return of(false);
      })
    );
  }

  // ================================
  // 🕐 GESTIÓN DE SESIÓN Y ACTIVIDAD
  // ================================

  refreshSession(): void {
    console.log('🔄 AdminAuthService: Refreshing session');
    this.updateLastActivity();
    
    // Validar token en segundo plano
    this.validateSession().subscribe({
      next: (isValid) => {
        if (!isValid) {
          this.logout();
        }
      },
      error: () => this.logout()
    });
  }

  updateLastActivity(): void {
    const currentState = this.authStateSubject.value;
    if (currentState.isAuthenticated) {
      this.updateAuthState({
        ...currentState,
        lastActivity: new Date()
      });
    }
  }

  checkSessionTimeout(): boolean {
    const currentState = this.authStateSubject.value;
    if (!currentState.isAuthenticated) return false;
    
    const timeSinceActivity = Date.now() - currentState.lastActivity.getTime();
    const isExpired = timeSinceActivity > this.SESSION_TIMEOUT;
    
    if (isExpired) {
      console.log('⏰ AdminAuthService: Session expired due to inactivity');
      this.logout();
      return true;
    }
    
    return false;
  }

  // ================================
  // 🔒 AUTORIZACIÓN Y PERMISOS
  // ================================

  hasPermission(permission: AdminPermission): Observable<boolean> {
    return this.authState$.pipe(
      map(state => {
        if (!state.isAuthenticated || !state.user) return false;
        return this.adminDataService.hasPermission(permission);
      })
    );
  }

  hasAnyPermission(permissions: AdminPermission[]): Observable<boolean> {
    return this.authState$.pipe(
      map(state => {
        if (!state.isAuthenticated || !state.user) return false;
        return this.adminDataService.hasAnyPermission(permissions);
      })
    );
  }

  requirePermission(permission: AdminPermission): Observable<boolean> {
    return this.hasPermission(permission).pipe(
      tap(hasPermission => {
        if (!hasPermission) {
          console.warn(`🚫 AdminAuthService: Permission denied: ${permission}`);
          this.router.navigate(['/admin/unauthorized']);
        }
      })
    );
  }

  canAccessAdminPanel(): Observable<boolean> {
    return this.hasAnyPermission([
      'establishment:view',
      'rooms:view', 
      'pricing:view',
      'bookings:view',
      'stats:view'
    ]);
  }

  // ================================
  // 🎯 INFORMACIÓN DE USUARIO
  // ================================

  getCurrentUser(): Observable<AdminUser | null> {
    return this.authState$.pipe(
      map(state => state.user)
    );
  }

  isAuthenticated(): Observable<boolean> {
    return this.authState$.pipe(
      map(state => state.isAuthenticated)
    );
  }

  isLoading(): Observable<boolean> {
    return this.authState$.pipe(
      map(state => state.isLoading)
    );
  }

  getAuthError(): Observable<string | null> {
    return this.authState$.pipe(
      map(state => state.error)
    );
  }

  getUserRole(): Observable<string | null> {
    return this.authState$.pipe(
      map(state => state.user?.role || null)
    );
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS
  // ================================

  private initializeAuthState(): void {
    console.log('🔄 AdminAuthService: Initializing auth state');
    
    // Intentar validar sesión existente
    if (this.adminDataService.isAuthenticated()) {
      this.validateSession().subscribe();
    }
  }

  private startActivityMonitoring(): void {
    console.log('👀 AdminAuthService: Starting activity monitoring');
    
    this.activityTimer$ = timer(this.ACTIVITY_CHECK_INTERVAL, this.ACTIVITY_CHECK_INTERVAL);
    
    this.activityTimer$.subscribe(() => {
      this.checkSessionTimeout();
    });
    
    // Escuchar eventos de actividad del usuario
    if (typeof window !== 'undefined') {
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, () => {
          this.updateLastActivity();
        }, { passive: true });
      });
    }
  }

  private stopActivityMonitoring(): void {
    console.log('⏹️ AdminAuthService: Stopping activity monitoring');
    // El timer se detiene automáticamente cuando el observable se completa
  }

  private updateAuthState(updates: Partial<AuthState>): void {
    const currentState = this.authStateSubject.value;
    const newState = { ...currentState, ...updates };
    this.authStateSubject.next(newState);
  }

  private getRedirectUrl(user: AdminUser): string {
    // Determinar página inicial basada en permisos
    if (user.permissions.includes('stats:view')) {
      return '/admin/dashboard';
    } else if (user.permissions.includes('establishment:view')) {
      return '/admin/establishment';
    } else if (user.permissions.includes('rooms:view')) {
      return '/admin/rooms';
    } else {
      return '/admin';
    }
  }

  private getErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    } else if (error?.message) {
      return error.message;
    } else if (error?.status === 401) {
      return 'Credenciales inválidas';
    } else if (error?.status === 403) {
      return 'No tienes permisos para acceder';
    } else if (error?.status === 0) {
      return 'No se puede conectar al servidor';
    } else {
      return 'Error de autenticación';
    }
  }

  // ================================
  // 🔧 MÉTODOS DE CONVENIENCIA
  // ================================

  isOwner(): Observable<boolean> {
    return this.authState$.pipe(
      map(state => state.user?.role === 'owner')
    );
  }

  isManager(): Observable<boolean> {
    return this.authState$.pipe(
      map(state => state.user?.role === 'manager')
    );
  }

  canEditEstablishment(): Observable<boolean> {
    return this.hasAnyPermission(['establishment:edit']);
  }

  canManageRooms(): Observable<boolean> {
    return this.hasAnyPermission(['rooms:create', 'rooms:edit', 'rooms:delete']);
  }

  canManagePricing(): Observable<boolean> {
    return this.hasAnyPermission(['pricing:edit']);
  }

  canViewStats(): Observable<boolean> {
    return this.hasAnyPermission(['stats:view']);
  }

  // ================================
  // 🧹 LIMPIEZA
  // ================================

  ngOnDestroy(): void {
    this.stopActivityMonitoring();
  }
}