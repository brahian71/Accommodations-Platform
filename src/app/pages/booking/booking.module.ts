// 📁 src/app/pages/booking/booking.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { BookingRoutingModule } from './booking-routing.module';
import { BookingComponent } from './booking.component';
import { BookingConfirmationComponent } from './booking-confirmation/booking-confirmation.component';

import { BookingService } from '../../core/services/booking.service';

@NgModule({
  declarations: [
    BookingComponent,
    BookingConfirmationComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    BookingRoutingModule
  ],
  providers: [
    BookingService
  ]
})
export class BookingModule { }