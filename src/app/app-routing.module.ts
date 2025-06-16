// 📁 src/app/app-routing.module.ts
// ✅ VERSIÓN CORREGIDA CON ARQUITECTURA CONSISTENTE

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
    loadChildren: () => import('./pages/property-details/property-details.module').then(m => m.PropertyDetailsModule) // ✅ CAMBIO: loadChildren
  },
  {
    path: 'search',
    redirectTo: '/search-results'
  },
  {
    path: '**',
    redirectTo: '/home'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }