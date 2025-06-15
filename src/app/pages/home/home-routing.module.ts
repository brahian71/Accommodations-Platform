// 📁 src/app/pages/home/home-routing.module.ts
// ROUTING PARA STANDALONE COMPONENT

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home.component').then(c => c.HomeComponent),
    title: 'Habitaciones en el Norte de Armenia - Accommodations Platform'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }