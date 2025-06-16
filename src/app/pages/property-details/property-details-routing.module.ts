// 📁 src/app/pages/property-details/property-details-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PropertyDetailsComponent } from './property-details.component';

const routes: Routes = [
  {
    path: '',
    component: PropertyDetailsComponent,
    data: {
      title: 'Detalles del Alojamiento',
      description: 'Ver detalles completos del alojamiento en el norte de Armenia'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PropertyDetailsRoutingModule { }
