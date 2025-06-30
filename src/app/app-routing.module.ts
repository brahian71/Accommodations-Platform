// 📁 src/app/app-routing.module.ts
// ✅ CORREGIDO: Routing consistente y sin conflictos

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomeModule)
  },
  
  // ✅ HABITACIONES: Room Selection
  {
    path: 'rooms',
    loadChildren: () => import('./pages/search-results/search-results.module').then(m => m.SearchResultsModule),
    data: { 
      title: 'Nuestras Habitaciones',
      description: 'Habitaciones disponibles en el Hostal Norte Armenia' 
    }
  },
  
  // ✅ DETALLES: Room Details
  {
    path: 'rooms/:roomId', 
    loadChildren: () => import('./pages/property-details/property-details.module').then(m => m.PropertyDetailsModule),
    data: { 
      title: 'Detalles de Habitación',
      description: 'Información completa de la habitación' 
    }
  },

  // ✅ BOOKING: Módulo completo (booking + confirmation)
  {
    path: 'booking',
    loadChildren: () => import('./pages/booking/booking.module').then(m => m.BookingModule),
    data: { 
      title: 'Sistema de Reservas',
      description: 'Reserva y confirmación de habitaciones' 
    }
  },

  // ================================
  // 🔄 REDIRECTS DE COMPATIBILIDAD
  // ================================
  
  {
    path: 'search-results',
    redirectTo: '/rooms'
  },
  {
    path: 'property/:id',
    redirectTo: '/rooms/:id'
  },
  {
    path: 'search',
    redirectTo: '/rooms'
  },
  {
    path: 'habitaciones',
    redirectTo: '/rooms'
  },
  {
    path: 'habitacion/:id',
    redirectTo: '/rooms/:id'
  },

  {
    path: 'booking-confirmation/:bookingId',
    redirectTo: '/booking/confirmation/:bookingId'
  },
  {
    path: 'confirmation/:bookingId',
    redirectTo: '/booking/confirmation/:bookingId'
  },
  
  // ✅ WILDCARD
  {
    path: '**',
    redirectTo: '/home'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false, 
    scrollPositionRestoration: 'top',
    anchorScrolling: 'enabled',
    onSameUrlNavigation: 'reload'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }