// 📁 src/app/pages/booking/booking.module.ts
// ✅ VERSIÓN CORREGIDA - Solo componentes que existen

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { BookingRoutingModule } from './booking-routing.module';
import { BookingComponent } from './booking.component';
import { BookingConfirmationComponent } from './booking-confirmation/booking-confirmation.component';

// Importar servicios
import { BookingService } from '../../core/services/booking.service';

@NgModule({
  declarations: [
    BookingComponent,
    BookingConfirmationComponent
    // ✅ REMOVIDO: Componentes que no existen aún
    // CalendarComponent,
    // PriceCalculatorComponent,
    // GuestSelectorComponent
  ],
  imports: [
    CommonModule,           // ✅ Para ngIf, ngFor, pipes básicos
    ReactiveFormsModule,    // ✅ Para formGroup
    FormsModule,           // ✅ Para ngModel
    RouterModule,          // ✅ Para routerLink
    BookingRoutingModule
  ],
  providers: [
    BookingService
  ]
})
export class BookingModule { }