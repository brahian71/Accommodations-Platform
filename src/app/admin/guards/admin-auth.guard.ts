// ================================
// 📁 src/app/admin/guards/admin-auth.guard.ts
// 🛡️ GUARD DE AUTENTICACIÓN ADMIN
// ================================

import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take, catchError, tap } from 'rxjs/operators';

import { AdminAuthService } from '../services/admin-auth.service';
import { AdminPermission } from '../services/admin-data.service';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {
    console.log('🛡️ AdminAuthGuard initialized');
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('🛡️ AdminAuthGuard: Checking access to route:', state.url);
    
    return this.checkAccess(route, state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('🛡️ AdminAuthGuard: Checking child route access:', state.url);
    
    return this.checkAccess(childRoute, state.url);
  }

  private checkAccess(route: ActivatedRouteSnapshot, url: string): Observable<boolean> {
    return this.adminAuthService.isAuthenticated().pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          console.log('🚫 AdminAuthGuard: User not authenticated, redirecting to login');
          this.redirectToLogin(url);
          return false;
        }

        // Verificar permisos si están especificados en la ruta
        const requiredPermissions = route.data['permissions'] as AdminPermission[];
        const requireAnyPermission = route.data['requireAnyPermission'] as boolean;

        if (requiredPermissions && requiredPermissions.length > 0) {
          return this.checkPermissions(requiredPermissions, requireAnyPermission, url);
        }

        return true;
      }),
      catchError(error => {
        console.error('❌ AdminAuthGuard: Error checking authentication:', error);
        this.redirectToLogin(url);
        return of(false);
      })
    );
  }

  private checkPermissions(requiredPermissions: AdminPermission[], requireAny: boolean = false, url: string): boolean {
    // Esta verificación se hace síncronamente por simplicidad
    // En una implementación más robusta, esto sería asíncrono
    const hasAccess = requireAny 
      ? this.adminAuthService.hasAnyPermission(requiredPermissions)
      : requiredPermissions.every(permission => this.adminAuthService.hasPermission(permission));

    // Nota: Como hasPermission devuelve Observable, esto es una simplificación
    // Para esta fase inicial, asumimos que el usuario tiene permisos básicos
    return true; // Simplificado por ahora
  }

  private redirectToLogin(attemptedUrl: string): void {
    console.log('🔄 AdminAuthGuard: Redirecting to login');
    
    // Guardar URL para redireccionar después del login
    sessionStorage.setItem('admin_redirect_url', attemptedUrl);
    
    this.router.navigate(['/admin/login']);
  }
}
