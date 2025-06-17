// 📁 src/app/app-routing.module.ts

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
  {
    path: 'search-results',
    loadChildren: () => import('./pages/search-results/search-results.module').then(m => m.SearchResultsModule)
  },
  {
    path: 'property/:id', 
    loadChildren: () => import('./pages/property-details/property-details.module').then(m => m.PropertyDetailsModule)
  },

  {
    path: 'booking',
    loadChildren: () => import('./pages/booking/booking.module').then(m => m.BookingModule),
    data: { 
      title: 'Sistema de Reservas',
      description: 'Reserva tu alojamiento en el Norte de Armenia' 
    }
  },
  {
    path: 'booking-confirmation/:bookingId',
    loadChildren: () => import('./pages/booking/booking.module').then(m => m.BookingModule)
  },

  {
    path: 'search',
    redirectTo: '/search-results'
  },
  {
    path: 'reserve/:id',
    redirectTo: '/booking/:id'
  },
  {
    path: 'book/:id',
    redirectTo: '/booking/:id'
  },
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