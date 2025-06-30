// 📁 src/app/pages/booking/booking-routing.module.ts

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BookingComponent } from './booking.component';
import { BookingConfirmationComponent } from './booking-confirmation/booking-confirmation.component';

const routes: Routes = [
  {
    path: ':roomId',
    component: BookingComponent,
    data: {
      title: 'Reservar Habitación',
      description: 'Completa tu reserva en el Hostal Norte Armenia'
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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BookingRoutingModule { }