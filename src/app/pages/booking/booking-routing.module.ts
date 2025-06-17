// 📁 src/app/pages/booking/booking-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BookingComponent } from './booking.component';
import { BookingConfirmationComponent } from './booking-confirmation/booking-confirmation.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: ':id',
        component: BookingComponent,
        data: { 
          title: 'Reservar Alojamiento',
          description: 'Completa tu reserva en el Norte de Armenia' 
        }
      },
      {
        path: 'confirmation/:bookingId',
        component: BookingConfirmationComponent,
        data: { 
          title: 'Reserva Confirmada',
          description: 'Tu reserva ha sido procesada exitosamente' 
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BookingRoutingModule { }