// 📁 src/app/admin/admin-routing.module.ts
// ROUTING PARA ADMIN CON STANDALONE COMPONENTS

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminAuthGuard } from './guards/admin-auth.guard';

const routes: Routes = [
  // ================================
  // 🔐 LOGIN (Sin protección)
  // ================================
  {
    path: 'login',
    loadComponent: () => import('./pages/admin-login/admin-login.component').then(c => c.AdminLoginComponent),
    title: 'Iniciar Sesión - Panel Admin'
  },

  // ================================
  // 🛡️ RUTAS PROTEGIDAS
  // ================================
  {
    path: '',
    canActivate: [AdminAuthGuard],
    canActivateChild: [AdminAuthGuard],
    children: [
      // Dashboard Principal
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin-dashboard/admin-dashboard.component').then(c => c.AdminDashboardComponent),
        title: 'Dashboard - Panel Admin',
        data: { 
          permissions: ['establishment:view', 'rooms:view', 'stats:view'],
          requireAnyPermission: true
        }
      },

      // Gestión de Establecimiento
      {
        path: 'establishment',
        loadComponent: () => import('./pages/admin-establishment/admin-establishment.component').then(c => c.AdminEstablishmentComponent),
        title: 'Gestión de Establecimiento - Panel Admin',
        data: { 
          permissions: ['establishment:view'],
          requireAnyPermission: false
        }
      },

      // Gestión de Habitaciones
      {
        path: 'rooms',
        loadComponent: () => import('./pages/admin-rooms/admin-rooms.component').then(c => c.AdminRoomsComponent),
        title: 'Gestión de Habitaciones - Panel Admin',
        data: { 
          permissions: ['rooms:view'],
          requireAnyPermission: false
        }
      },

      // Página de No Autorizado
      {
        path: 'unauthorized',
        loadComponent: () => import('./pages/admin-unauthorized/admin-unauthorized.component').then(c => c.AdminUnauthorizedComponent),
        title: 'Acceso No Autorizado - Panel Admin'
      },

      // Redirección por defecto
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }