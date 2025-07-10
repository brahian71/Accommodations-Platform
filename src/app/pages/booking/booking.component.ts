// 📁 src/app/pages/booking/booking.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, combineLatest, Observable, of } from 'rxjs';
import { takeUntil, switchMap, map, tap, catchError, debounceTime } from 'rxjs/operators';

import { Room, RoomType } from '../../core/models/room.interface';
import { Establishment } from '../../core/models/establishment.interface';
import { RoomService } from '../../core/services/room.service';
import { EstablishmentService } from '../../core/services/establishment.service';

import { BookingService } from '../../core/services/booking.service';
import { 
  Booking, BookingRequest, PriceBreakdown, BookingProgress, 
  PartialBookingRequest, WhatsAppMessage 
} from '../../core/models/booking.interface';
import { 
  DayAvailability, DateSelection, CalendarMonth, DateValidationResult 
} from '../../core/models/calendar.interface';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.scss']
})
export class BookingComponent implements OnInit, OnDestroy {
  
  // ================================
  // 🗂️ PROPIEDADES PRINCIPALES
  // ================================
  
  room: Room | null = null;                      
  establishment: Establishment | null = null; 
  currentBooking: PartialBookingRequest | null = null;
  bookingProgress: BookingProgress | null = null;
  priceBreakdown: PriceBreakdown | null = null;
  dateValidation: DateValidationResult | null = null;
  isLoading = true;
  isSubmitting = false;
  showCalendar = false;
  calendarMode: 'check-in' | 'check-out' = 'check-in';
  datesForm!: FormGroup;
  guestsForm!: FormGroup;
  detailsForm!: FormGroup;
  currentMonth: CalendarMonth | null = null;
  availableDaysInMonth: DayAvailability[] = [];
  selectedDates: DateSelection = {
    checkIn: null,
    checkOut: null,
    nights: 0,
    totalDays: 0,
    isValid: false,
    errors: [],
    warnings: [],
    weekendNights: 0,
    weekdayNights: 0,
    hasHolidays: false,
    applicableDiscounts: []
  };
  currentStep = 1;
  totalSteps = 4;
  canProceed = false;
  private stepValidations = {
    dates: false,
    guests: false, 
    details: false,
    review: false
  };

  private destroy$ = new Subject<void>();
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private roomService: RoomService,           
    private establishmentService: EstablishmentService,
    private bookingService: BookingService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadRoomAndInitializeBooking(); 
    this.setupFormSubscriptions();
    this.setupBookingSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.bookingService.clearCurrentBooking();
  }

  private loadRoomAndInitializeBooking(): void {  

    const roomId = this.route.snapshot.paramMap.get('roomId') || this.route.snapshot.paramMap.get('id');
    
    if (!roomId) {
      this.error = 'ID de habitación no válido. Verifica la URL de navegación.';  
      this.isLoading = false;
      console.error('❌ roomId no encontrado en ruta. Parámetros disponibles:', this.route.snapshot.paramMap.keys);
      return;
    }

    console.log('🔍 Cargando habitación con ID:', roomId);

    combineLatest([
      this.roomService.getRoomById(roomId),
      this.establishmentService.getEstablishmentInfo(),
      this.bookingService.initializeBooking(roomId) 
    ]).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('❌ Error cargando datos de booking:', error);
        this.error = 'Error al cargar la habitación: ' + error.message; 
        this.isLoading = false;
        return of([null, null, null]);
      })
    ).subscribe(([room, establishment, booking]) => {
      if (room && establishment && booking) {
        this.room = room;                    
        this.establishment = establishment;
        this.currentBooking = booking;
        this.initializeCalendar();
        this.restoreBookingState();
        this.updateStepValidations();
        this.isLoading = false;
        
        console.log('✅ Habitación cargada:', room.name);     
        console.log('✅ Establecimiento cargado:', establishment.name);
        console.log('✅ Booking inicializado:', booking);
      } else {
        this.error = `Habitación con ID "${roomId}" no encontrada. Verifica que la habitación existe.`;
        this.isLoading = false;
        console.error('❌ Datos no cargados correctamente:', { room, establishment, booking });
      }
    });
  }

  private initializeForms(): void {
    this.datesForm = this.fb.group({
      checkInDate: ['', Validators.required],
      checkOutDate: ['', Validators.required]
    });
    this.guestsForm = this.fb.group({
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, [Validators.min(0)]],
      infants: [0, [Validators.min(0)]]
    });
    this.detailsForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]{8,15}$/)]],
      whatsapp: [''],
      documentType: ['cedula', Validators.required],
      documentNumber: ['', [Validators.required, Validators.minLength(6)]],
      nationality: ['Colombiana', Validators.required],
      specialRequests: [''],
      estimatedArrivalTime: [''],
      purposeOfStay: ['vacation', Validators.required],
      isFirstTimeInArmenia: [true],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      emergencyContactRelationship: ['']
    });
  }

  private restoreBookingState(): void {
    if (!this.currentBooking) return;
    if (this.currentBooking.checkInDate && this.currentBooking.checkOutDate) {
      this.selectedDates.checkIn = this.currentBooking.checkInDate;
      this.selectedDates.checkOut = this.currentBooking.checkOutDate;
      this.selectedDates.nights = this.currentBooking.nights || 0;
      
      this.datesForm.patchValue({
        checkInDate: this.currentBooking.checkInDate,
        checkOutDate: this.currentBooking.checkOutDate
      }, { emitEvent: false });
      this.calculatePrice();
    }
    if (this.currentBooking.guests) {
      this.guestsForm.patchValue({
        adults: this.currentBooking.guests.adults,
        children: this.currentBooking.guests.children,
        infants: this.currentBooking.guests.infants
      }, { emitEvent: false });
    }
    if (this.currentBooking.guestInfo) {
      this.detailsForm.patchValue({
        firstName: this.currentBooking.guestInfo.firstName,
        lastName: this.currentBooking.guestInfo.lastName,
        email: this.currentBooking.guestInfo.email,
        phone: this.currentBooking.guestInfo.phone,
        whatsapp: this.currentBooking.guestInfo.whatsapp,
        documentType: this.currentBooking.guestInfo.documentType,
        documentNumber: this.currentBooking.guestInfo.documentNumber,
        nationality: this.currentBooking.guestInfo.nationality,
        emergencyContactName: this.currentBooking.guestInfo.emergencyContact?.name,
        emergencyContactPhone: this.currentBooking.guestInfo.emergencyContact?.phone,
        emergencyContactRelationship: this.currentBooking.guestInfo.emergencyContact?.relationship
      }, { emitEvent: false });
    }
  }

  private setupFormSubscriptions(): void {
    this.datesForm.valueChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(dates => {
      if (dates.checkInDate && dates.checkOutDate) {
        this.updateBookingDates(dates.checkInDate, dates.checkOutDate);
      }
      this.updateStepValidations();
    });

    this.guestsForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(guests => {
      const totalGuests = guests.adults + guests.children + guests.infants;
      if (this.room && totalGuests > this.room.maxGuests) { 
        this.guestsForm.setErrors({ maxGuestsExceeded: true });
      } else {
        this.guestsForm.setErrors(null);
      }
      
      this.updateBookingGuests({
        adults: guests.adults,
        children: guests.children,
        infants: guests.infants,
        total: totalGuests
      });
      this.updateStepValidations();
    });

    this.detailsForm.valueChanges.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(details => {
      this.updateBookingDetails(details);
      this.updateStepValidations();
    });
  }

  private setupBookingSubscriptions(): void {
    this.bookingService.currentBooking$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(booking => {
      if (booking) {
        this.currentBooking = booking;
      }
    });
  }

  private updateStepValidations(): void {
    this.stepValidations.dates = !!(
      this.selectedDates.checkIn && 
      this.selectedDates.checkOut && 
      this.selectedDates.isValid &&
      this.datesForm.valid
    );
    this.stepValidations.guests = !!(
      this.guestsForm.valid &&
      this.guestsForm.get('adults')?.value >= 1 &&
      !this.guestsForm.errors?.maxGuestsExceeded
    );
    this.stepValidations.details = !!(
      this.detailsForm.valid &&
      this.detailsForm.get('firstName')?.value &&
      this.detailsForm.get('lastName')?.value &&
      this.detailsForm.get('email')?.value &&
      this.detailsForm.get('phone')?.value
    );
    this.stepValidations.review = !!(
      this.stepValidations.dates &&
      this.stepValidations.guests &&
      this.stepValidations.details
    );
    this.updateCanProceed();
  }

  private updateCanProceed(): void {
    switch (this.currentStep) {
      case 1:
        this.canProceed = this.stepValidations.dates;
        break;
      case 2:
        this.canProceed = this.stepValidations.guests;
        break;
      case 3:
        this.canProceed = this.stepValidations.details;
        break;
      case 4:
        this.canProceed = this.stepValidations.review;
        break;
      default:
        this.canProceed = false;
    }
  }

  // ================================
  // 📅 GESTIÓN DE CALENDARIO
  // ================================

  private initializeCalendar(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    this.loadCalendarMonth(year, month);
  }

  private loadCalendarMonth(year: number, month: number): void {
    if (!this.room) return; 

    this.bookingService.getCalendarMonth(this.room.id, year, month).pipe( 
      takeUntil(this.destroy$)
    ).subscribe(calendarMonth => {
      this.currentMonth = calendarMonth;
      this.availableDaysInMonth = calendarMonth.days;
    });
  }

  toggleCalendar(mode?: 'check-in' | 'check-out'): void {
    if (mode) {
      this.calendarMode = mode;
    } else {
      if (!this.selectedDates.checkIn) {
        this.calendarMode = 'check-in';
      } else if (!this.selectedDates.checkOut) {
        this.calendarMode = 'check-out';
      } else {
        this.calendarMode = 'check-in';
      }
    }
    
    this.showCalendar = !this.showCalendar;
    if (this.showCalendar && this.calendarMode === 'check-out' && this.selectedDates.checkIn) {
      const checkInDate = new Date(this.selectedDates.checkIn);
      this.loadCalendarMonth(checkInDate.getFullYear(), checkInDate.getMonth());
    }
  }

  onDateSelect(date: string): void {
    const selectedDay = this.availableDaysInMonth.find(d => d.date === date);
    if (!selectedDay || !this.isDayAvailable(selectedDay)) {
      this.error = this.getUnavailabilityMessage(selectedDay);
      setTimeout(() => this.error = null, 3000);
      return;
    }

    this.handleIntelligentDateSelection(date);
  }

  private handleIntelligentDateSelection(date: string): void {
    const hasCheckIn = !!this.selectedDates.checkIn;
    const hasCheckOut = !!this.selectedDates.checkOut;

    if (!hasCheckIn) {
      this.setCheckInDate(date);
      
    } else if (!hasCheckOut) {
      
      if (date <= this.selectedDates.checkIn!) {
        this.resetDateSelection();
        this.setCheckInDate(date);
      } else {
        this.attemptCheckOutSelection(date);
      }     
    } else {
      this.resetDateSelection();
      this.setCheckInDate(date);
    }
  }

  private setCheckInDate(date: string): void {
    this.selectedDates.checkIn = date;
    this.selectedDates.checkOut = null;
    this.selectedDates.nights = 0;
    this.selectedDates.isValid = false;
    
    this.datesForm.patchValue({ 
      checkInDate: date,
      checkOutDate: '' 
    });
    this.calendarMode = 'check-out';
    
    console.log('✅ Check-in seleccionado:', date);
  }

  private attemptCheckOutSelection(date: string): void {
    const checkInDate = this.selectedDates.checkIn!;
    const rangeValidation = this.validateCompleteRange(checkInDate, date);
    
    if (!rangeValidation.isValid) {
      this.error = `No se puede seleccionar este rango: ${rangeValidation.errors[0]}`;
      setTimeout(() => this.error = null, 4000);
      this.suggestAlternativeCheckOut(checkInDate, date);
      return;
    }
    this.setCheckOutDate(date);
  }

  private setCheckOutDate(date: string): void {
    this.selectedDates.checkOut = date;
    this.selectedDates.nights = this.calculateNights(this.selectedDates.checkIn!, date);
    
    this.datesForm.patchValue({ checkOutDate: date });
    this.validateSelectedDates();
    this.showCalendar = false;
    this.calendarMode = 'check-in'; 
    
    console.log('✅ Check-out seleccionado:', date, `(${this.selectedDates.nights} noches)`);
  }

  private resetDateSelection(): void {
    this.selectedDates = {
      checkIn: null,
      checkOut: null,
      nights: 0,
      totalDays: 0,
      isValid: false,
      errors: [],
      warnings: [],
      weekendNights: 0,
      weekdayNights: 0,
      hasHolidays: false,
      applicableDiscounts: []
    };
    
    this.datesForm.patchValue({ 
      checkInDate: '',
      checkOutDate: '' 
    });
    
    this.calendarMode = 'check-in';
    this.priceBreakdown = null;
  }

  private validateSelectedDates(): void {
    if (!this.room || !this.selectedDates.checkIn || !this.selectedDates.checkOut) { 
      return;
    }
    const rangeValidation = this.validateCompleteRange(
      this.selectedDates.checkIn, 
      this.selectedDates.checkOut
    );

    if (!rangeValidation.isValid) {
      this.selectedDates.isValid = false;
      this.selectedDates.errors = rangeValidation.errors;
      this.dateValidation = {
        isValid: false,
        errors: rangeValidation.errors.map(err => ({ code: 'RANGE_ERROR', message: err, field: 'range' as const })),
        warnings: []
      };
      this.updateStepValidations();
      return;
    }
    this.bookingService.validateDateSelection(
      this.room.id,  
      this.selectedDates.checkIn, 
      this.selectedDates.checkOut
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(validation => {
      this.dateValidation = validation;
      this.selectedDates.isValid = validation.isValid;
      this.selectedDates.errors = validation.errors.map((e: any) => e.message);
      this.selectedDates.warnings = validation.warnings.map((w: any) => w.message);
      
      if (validation.isValid) {
        this.calculatePrice();
      }
      
      this.updateStepValidations();
    });
  }

  private validateCompleteRange(checkIn: string, checkOut: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayData = this.availableDaysInMonth.find(d => d.date === dateString);
      
      if (!dayData || !this.isDayAvailable(dayData)) {
        const dayName = this.formatDate(dateString);
        
        if (dayData?.isBooked) {
          errors.push(`${dayName} está ocupado por otra reserva`);
        } else if (dayData?.isBlocked) {
          errors.push(`${dayName} no está disponible`);
        } else if (dayData?.isPastDate) {
          errors.push(`${dayName} es una fecha pasada`);
        } else {
          errors.push(`${dayName} no está disponible`);
        }

        if (errors.length >= 3) {
          if (this.countUnavailableDaysInRange(checkIn, checkOut) > 3) {
            errors.push('...y más días no disponibles');
          }
          break;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private countUnavailableDaysInRange(checkIn: string, checkOut: string): number {
    let count = 0;
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayData = this.availableDaysInMonth.find(d => d.date === dateString);
      
      if (!dayData || !this.isDayAvailable(dayData)) {
        count++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  private getUnavailabilityMessage(day: any): string {
    if (!day) {
      return 'Esta fecha no está disponible';
    }
    
    if (day.isPastDate) {
      return 'No puedes seleccionar fechas pasadas';
    }
    
    if (day.isBooked) {
      return `El ${this.formatDate(day.date)} está ocupado por otra reserva`;
    }
    
    if (day.isBlocked) {
      return `El ${this.formatDate(day.date)} no está disponible para reservas`;
    }
    
    return 'Esta fecha no está disponible para reserva';
  }

  private suggestAlternativeCheckOut(checkIn: string, attemptedCheckOut: string): void {
    const suggestion = this.findNextAvailableCheckOut(checkIn, attemptedCheckOut);
    
    if (suggestion) {
      const suggestionDate = this.formatDate(suggestion);
      setTimeout(() => {
        if (this.error) {
          this.error = `Fecha no disponible. ¿Qué tal hasta el ${suggestionDate}?`;
        }
      }, 2000);
    }
  }

  private findNextAvailableCheckOut(checkIn: string, fromDate: string): string | null {
    const startSearch = new Date(fromDate);
    const maxDays = 14; 
    
    for (let i = 1; i <= maxDays; i++) {
      const testDate = new Date(startSearch);
      testDate.setDate(testDate.getDate() + i);
      const testDateString = testDate.toISOString().split('T')[0];
      const rangeValidation = this.validateCompleteRange(checkIn, testDateString);
      if (rangeValidation.isValid) {
        return testDateString;
      }
    }
    
    return null;
  }

  // ================================
  // 💰 CÁLCULO DE PRECIOS
  // ================================

  private calculatePrice(): void {
    if (!this.room || !this.selectedDates.checkIn || !this.selectedDates.checkOut) { 
      return;
    }

    this.bookingService.calculatePrice(
      this.room.id, 
      this.selectedDates.checkIn,
      this.selectedDates.checkOut
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(priceBreakdown => {
      this.priceBreakdown = priceBreakdown;
      this.selectedDates.nights = priceBreakdown.nights;
      this.selectedDates.estimatedTotal = priceBreakdown.total;
      this.selectedDates.applicableDiscounts = [];
      
    });
  }

  // ================================
  // 📋 ACTUALIZACIÓN DE BOOKING
  // ================================

  private updateBookingDates(checkIn: string, checkOut: string): void {
    const nights = this.calculateNights(checkIn, checkOut);
    
    this.bookingService.updateCurrentBooking({
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights
    }).subscribe();
  }

  private updateBookingGuests(guests: any): void {
    this.bookingService.updateCurrentBooking({ guests }).subscribe();
  }

  private updateBookingDetails(details: any): void {
    const guestInfo = {
      firstName: details.firstName,
      lastName: details.lastName,
      email: details.email,
      phone: details.phone,
      whatsapp: details.whatsapp || details.phone,
      documentType: details.documentType,
      documentNumber: details.documentNumber,
      nationality: details.nationality,
      emergencyContact: details.emergencyContactName ? {
        name: details.emergencyContactName,
        phone: details.emergencyContactPhone,
        relationship: details.emergencyContactRelationship
      } : undefined
    };

    this.bookingService.updateCurrentBooking({
      guestInfo,
      specialRequests: details.specialRequests,
      estimatedArrivalTime: details.estimatedArrivalTime,
      purposeOfStay: details.purposeOfStay,
      isFirstTimeInArmenia: details.isFirstTimeInArmenia
    }).subscribe();
  }

  // ================================
  // 🚀 NAVEGACIÓN ENTRE PASOS
  // ================================

  nextStep(): void {
    if (!this.canProceed) {
      this.error = 'Por favor completa todos los campos requeridos antes de continuar';
      setTimeout(() => this.error = null, 3000);
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateCanProceed();
      this.scrollToTop();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateCanProceed();
      this.scrollToTop();
    }
  }

  goToStep(step: number): void {
    const canGoToStep = this.validateStepAccess(step);
    
    if (canGoToStep && step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
      this.updateCanProceed();
      this.scrollToTop();
    }
  }

  private validateStepAccess(targetStep: number): boolean {
    switch (targetStep) {
      case 1:
        return true;
      case 2:
        return this.stepValidations.dates;
      case 3:
        return this.stepValidations.dates && this.stepValidations.guests;
      case 4:
        return this.stepValidations.dates && this.stepValidations.guests && this.stepValidations.details;
      default:
        return false;
    }
  }

  // ================================
  // 📤 ENVÍO DE RESERVA
  // ================================

  submitBooking(): void {
    if (this.isSubmitting || !this.canProceed) return;

    if (!this.stepValidations.review) {
      this.error = 'Por favor verifica que todos los datos estén completos y correctos';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    console.log('🚀 Enviando reserva...');

    this.bookingService.submitBooking().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('❌ Error en submitBooking:', error);
        this.error = 'Error al crear la reserva: ' + error.message;
        this.isSubmitting = false;
        return of(null);
      })
    ).subscribe(booking => {
      console.log('📋 Booking recibido:', booking);
      this.isSubmitting = false;
      
      if (booking) {
        console.log('✅ Reserva creada exitosamente:', booking.bookingReference);
        this.router.navigate(['/booking/confirmation', booking.id], { 
          replaceUrl: true,
          state: { 
            booking: booking,
            whatsappMessage: (booking as any).whatsappMessage,
            whatsappUrl: (booking as any).whatsappUrl
          }
        });
      }
    });
  }

  openWhatsApp(): void {
    if (!this.currentBooking || !this.room || !this.establishment) {
      console.warn('⚠️ Datos incompletos para WhatsApp');
      return;
    }
    
    const tempBooking: Partial<Booking> = {
      bookingReference: 'TEMP-' + Date.now(),
      propertyTitle: this.room.name,                
      propertyId: this.room.id,                     
      hostName: this.establishment.host.name,       
      hostWhatsapp: this.establishment.contactInfo.whatsapp, 
      guestInfo: this.currentBooking.guestInfo!,
      checkInDate: this.currentBooking.checkInDate!,
      checkOutDate: this.currentBooking.checkOutDate!,
      nights: this.currentBooking.nights!,
      guests: this.currentBooking.guests!,
      priceBreakdown: this.priceBreakdown!,
      specialRequests: this.currentBooking.specialRequests
    };

    try {
      this.bookingService.openWhatsApp(tempBooking as Booking);
      console.log('✅ WhatsApp abierto correctamente');
    } catch (error) {
      console.error('❌ Error al abrir WhatsApp:', error);
      this.error = 'Error al abrir WhatsApp. Por favor intenta nuevamente.';
      setTimeout(() => this.error = null, 3000);
    }
  }

  // ================================
  // 🔧 MÉTODOS AUXILIARES
  // ================================

  private calculateNights(checkIn: string, checkOut: string): number {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatPrice(amount: number): string {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0';
    }
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      console.warn('Error formatting price:', amount);
      return `$${amount.toLocaleString()}`;
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting date:', date);
      return date;
    }
  }

  getDayOfWeek(date: string): string {
    return new Date(date).toLocaleDateString('es-CO', { weekday: 'short' });
  }

  // ================================
  // 🎨 GETTERS PARA TEMPLATE
  // ================================

  get currentStepName(): string {
    const steps = ['dates', 'guests', 'details', 'review'];
    return steps[this.currentStep - 1] || '';
  }

  get progressPercentage(): number {
    const completedSteps = Object.values(this.stepValidations).filter(Boolean).length;
    return (completedSteps / this.totalSteps) * 100;
  }

  get maxGuests(): number {
    return this.room?.maxGuests || 10; 
  }

  get isValidToSubmit(): boolean {
    return this.stepValidations.review && this.canProceed;
  }

  get stepErrors(): string[] {
    const errors: string[] = [];
    switch (this.currentStep) {
      case 1:
        if (!this.stepValidations.dates) {
          if (!this.selectedDates.checkIn || !this.selectedDates.checkOut) {
            errors.push('Selecciona las fechas de llegada y salida');
          } else if (!this.selectedDates.isValid) {
            errors.push(...this.selectedDates.errors);
          }
        }
        break;
      case 2:
        if (!this.stepValidations.guests) {
          if (this.guestsForm.errors?.maxGuestsExceeded) {
            errors.push(`Esta habitación acepta máximo ${this.maxGuests} huéspedes`); 
          }
        }
        break;
      case 3:
        if (!this.stepValidations.details) {
          errors.push('Completa toda la información requerida');
        }
        break;
    }
    
    return errors;
  }

  get totalPrice(): number {
    return this.priceBreakdown?.total || 0;
  }

  get hasDiscounts(): boolean {
    return false;
  }

  // ================================
  // 🔄 EVENTOS DEL CALENDARIO
  // ================================

  onCalendarNavigate(direction: 'prev' | 'next'): void {
    if (!this.currentMonth) return;

    let newYear = this.currentMonth.year;
    let newMonth = this.currentMonth.month;

    if (direction === 'next') {
      newMonth++;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
    } else {
      newMonth--;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
    }

    this.loadCalendarMonth(newYear, newMonth);
  }

  isDayAvailable(day: DayAvailability): boolean {
    return day.isAvailable && !day.isBlocked && !day.isBooked && !day.isPastDate;
  }

  isDaySelected(day: DayAvailability): boolean {
    return day.date === this.selectedDates.checkIn || day.date === this.selectedDates.checkOut;
  }

  isDayInRange(day: DayAvailability): boolean {
    if (!this.selectedDates.checkIn || !this.selectedDates.checkOut) return false;
    
    const dayDate = new Date(day.date);
    const checkIn = new Date(this.selectedDates.checkIn);
    const checkOut = new Date(this.selectedDates.checkOut);
    
    return dayDate > checkIn && dayDate < checkOut;
  }

  clearDateSelection(): void {
    this.resetDateSelection();
    this.error = null;
    this.dateValidation = null;
    this.updateStepValidations();
  }

  get calendarModeText(): string {
    const modes = {
      'check-in': 'Selecciona fecha de llegada',
      'check-out': 'Selecciona fecha de salida'
    };
    return modes[this.calendarMode] || '';
  }

  get isCalendarInValidState(): boolean {
    return !!(this.selectedDates.checkIn && this.selectedDates.checkOut && this.selectedDates.isValid);
  }

  get rangeInfo(): string {
    if (!this.selectedDates.checkIn) {
      return 'Selecciona fecha de llegada';
    }
    
    if (!this.selectedDates.checkOut) {
      return 'Selecciona fecha de salida';
    }
    
    return `${this.selectedDates.nights} noche${this.selectedDates.nights !== 1 ? 's' : ''}`;
  }

  get isCurrentStepValid(): boolean {
    return this.stepValidations[this.currentStepName as keyof typeof this.stepValidations] || false;
  }

  get canGoToNextStep(): boolean {
    return this.canProceed && this.currentStep < this.totalSteps;
  }

  get canGoToPrevStep(): boolean {
    return this.currentStep > 1;
  }
}