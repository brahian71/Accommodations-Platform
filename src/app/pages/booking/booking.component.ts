// 📁 src/app/pages/booking/booking.component.ts - VERSIÓN CORREGIDA

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, combineLatest, Observable, of } from 'rxjs';
import { takeUntil, switchMap, map, tap, catchError, debounceTime } from 'rxjs/operators';

import { PropertyService } from '../../core/services/property.service';
import { BookingService } from '../../core/services/booking.service';
import { Property } from '../../core/models/property.interface';
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
  
  property: Property | null = null;
  currentBooking: PartialBookingRequest | null = null;
  bookingProgress: BookingProgress | null = null;
  priceBreakdown: PriceBreakdown | null = null;
  dateValidation: DateValidationResult | null = null;
  
  // Estados de carga
  isLoading = true;
  isSubmitting = false;
  showCalendar = false;
  calendarMode: 'check-in' | 'check-out' = 'check-in';
  
  // Formularios por pasos
  datesForm!: FormGroup;
  guestsForm!: FormGroup;
  detailsForm!: FormGroup;
  
  // Datos del calendario - MEJORADO
  currentMonth: CalendarMonth | null = null;
  availableDaysInMonth: DayAvailability[] = []; // ✅ NUEVO: Cache de días disponibles
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
  
  // UI Estados - MEJORADO
  currentStep = 1;
  totalSteps = 4;
  canProceed = false; // ✅ CORREGIDO: Ahora se calcula localmente
  
  // ✅ NUEVO: Estado de validación por pasos
  private stepValidations = {
    dates: false,
    guests: false, 
    details: false,
    review: false
  };
  
  // Observables cleanup
  private destroy$ = new Subject<void>();
  
  // Error handling
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private propertyService: PropertyService,
    private bookingService: BookingService
  ) {
    this.initializeForms();
  }

  // ================================
  // 🚀 LIFECYCLE HOOKS
  // ================================

  ngOnInit(): void {
    this.loadPropertyAndInitializeBooking();
    this.setupFormSubscriptions();
    this.setupBookingSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.bookingService.clearCurrentBooking();
  }

  // ================================
  // 📋 INICIALIZACIÓN
  // ================================

  private loadPropertyAndInitializeBooking(): void {
    const propertyId = this.route.snapshot.paramMap.get('id');
    
    if (!propertyId) {
      this.error = 'ID de propiedad no válido';
      this.isLoading = false;
      return;
    }

    combineLatest([
      this.propertyService.getPropertyById(propertyId),
      this.bookingService.initializeBooking(propertyId)
    ]).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.error = 'Error al cargar la propiedad: ' + error.message;
        this.isLoading = false;
        return of([null, null]);
      })
    ).subscribe(([property, booking]) => {
      if (property && booking) {
        this.property = property;
        this.currentBooking = booking;
        this.initializeCalendar();
        this.restoreBookingState(); // ✅ NUEVO: Restaurar estado
        this.updateStepValidations(); // ✅ NUEVO: Validar pasos
        this.isLoading = false;
        
        console.log('🏠 Propiedad cargada:', property.title);
        console.log('📅 Booking inicializado:', booking);
      }
    });
  }

  private initializeForms(): void {
    // Formulario de fechas
    this.datesForm = this.fb.group({
      checkInDate: ['', Validators.required],
      checkOutDate: ['', Validators.required]
    });

    // Formulario de huéspedes - MEJORADO con validación dinámica
    this.guestsForm = this.fb.group({
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, [Validators.min(0)]],
      infants: [0, [Validators.min(0)]]
    });

    // Formulario de detalles del huésped
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

  // ✅ NUEVO: Restaurar estado del booking
  private restoreBookingState(): void {
    if (!this.currentBooking) return;

    // Restaurar fechas si existen
    if (this.currentBooking.checkInDate && this.currentBooking.checkOutDate) {
      this.selectedDates.checkIn = this.currentBooking.checkInDate;
      this.selectedDates.checkOut = this.currentBooking.checkOutDate;
      this.selectedDates.nights = this.currentBooking.nights || 0;
      
      this.datesForm.patchValue({
        checkInDate: this.currentBooking.checkInDate,
        checkOutDate: this.currentBooking.checkOutDate
      }, { emitEvent: false });
      
      // Recalcular precio si hay fechas válidas
      this.calculatePrice();
    }

    // Restaurar huéspedes
    if (this.currentBooking.guests) {
      this.guestsForm.patchValue({
        adults: this.currentBooking.guests.adults,
        children: this.currentBooking.guests.children,
        infants: this.currentBooking.guests.infants
      }, { emitEvent: false });
    }

    // Restaurar detalles
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
    // Escuchar cambios en fechas - MEJORADO con debounce
    this.datesForm.valueChanges.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(dates => {
      if (dates.checkInDate && dates.checkOutDate) {
        this.updateBookingDates(dates.checkInDate, dates.checkOutDate);
      }
      this.updateStepValidations();
    });

    // Escuchar cambios en huéspedes - MEJORADO con validación
    this.guestsForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(guests => {
      const totalGuests = guests.adults + guests.children + guests.infants;
      
      // ✅ VALIDACIÓN MEJORADA: Verificar límites
      if (this.property && totalGuests > this.property.maxGuests) {
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

    // Escuchar cambios en detalles - MEJORADO
    this.detailsForm.valueChanges.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(details => {
      this.updateBookingDetails(details);
      this.updateStepValidations();
    });
  }

  private setupBookingSubscriptions(): void {
    // Escuchar booking actual - SIMPLIFICADO
    this.bookingService.currentBooking$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(booking => {
      if (booking) {
        this.currentBooking = booking;
        // No llamar updateFormsFromBooking aquí para evitar loops infinitos
      }
    });
  }

  // ================================
  // ✅ NUEVO: VALIDACIONES POR PASOS
  // ================================

  private updateStepValidations(): void {
    // Validar paso de fechas
    this.stepValidations.dates = !!(
      this.selectedDates.checkIn && 
      this.selectedDates.checkOut && 
      this.selectedDates.isValid &&
      this.datesForm.valid
    );

    // Validar paso de huéspedes
    this.stepValidations.guests = !!(
      this.guestsForm.valid &&
      this.guestsForm.get('adults')?.value >= 1 &&
      !this.guestsForm.errors?.maxGuestsExceeded
    );

    // Validar paso de detalles
    this.stepValidations.details = !!(
      this.detailsForm.valid &&
      this.detailsForm.get('firstName')?.value &&
      this.detailsForm.get('lastName')?.value &&
      this.detailsForm.get('email')?.value &&
      this.detailsForm.get('phone')?.value
    );

    // Validar paso de revisión
    this.stepValidations.review = !!(
      this.stepValidations.dates &&
      this.stepValidations.guests &&
      this.stepValidations.details
    );

    // Actualizar canProceed basado en el paso actual
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
  // 📅 GESTIÓN DE CALENDARIO - MEJORADA
  // ================================

  private initializeCalendar(): void {
    const today = new Date();
    this.loadCalendarMonth(today.getFullYear(), today.getMonth());
  }

  private loadCalendarMonth(year: number, month: number): void {
    if (!this.property) return;

    this.bookingService.getCalendarMonth(this.property.id, year, month).pipe(
      takeUntil(this.destroy$)
    ).subscribe(calendarMonth => {
      this.currentMonth = calendarMonth;
      this.availableDaysInMonth = calendarMonth.days; // ✅ NUEVO: Cache
    });
  }

  toggleCalendar(mode: 'check-in' | 'check-out'): void {
    this.calendarMode = mode;
    this.showCalendar = !this.showCalendar;
  }

  // ✅ CORREGIDO: Validación mejorada de selección de fechas
  onDateSelect(date: string): void {
    const selectedDay = this.availableDaysInMonth.find(d => d.date === date);
    
    // ✅ VALIDACIÓN CRÍTICA: Verificar disponibilidad antes de seleccionar
    if (!selectedDay || !this.isDayAvailable(selectedDay)) {
      this.error = 'Esta fecha no está disponible para reserva';
      setTimeout(() => this.error = null, 3000);
      return;
    }

    if (this.calendarMode === 'check-in') {
      this.selectedDates.checkIn = date;
      this.datesForm.patchValue({ checkInDate: date });
      
      // Si ya hay check-out, validar rango completo
      if (this.selectedDates.checkOut) {
        this.validateSelectedDates();
      } else {
        // Cambiar a modo check-out automáticamente
        this.calendarMode = 'check-out';
      }
    } else {
      // ✅ VALIDACIÓN: Check-out debe ser posterior a check-in
      if (this.selectedDates.checkIn && date <= this.selectedDates.checkIn) {
        this.error = 'La fecha de salida debe ser posterior a la fecha de llegada';
        setTimeout(() => this.error = null, 3000);
        return;
      }

      this.selectedDates.checkOut = date;
      this.datesForm.patchValue({ checkOutDate: date });
      this.validateSelectedDates();
      this.showCalendar = false;
    }
  }

  // ✅ CORREGIDO: Validación de rango completo
  private validateSelectedDates(): void {
    if (!this.property || !this.selectedDates.checkIn || !this.selectedDates.checkOut) {
      return;
    }

    // ✅ VALIDACIÓN CRÍTICA: Verificar que todo el rango esté disponible
    const rangeValidation = this.validateDateRange(
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

    // Validación con el servicio
    this.bookingService.validateDateSelection(
      this.property.id, 
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

  // ✅ NUEVO: Validar rango de fechas localmente
  private validateDateRange(checkIn: string, checkOut: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Generar todas las fechas en el rango
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayData = this.availableDaysInMonth.find(d => d.date === dateString);
      
      if (!dayData || !this.isDayAvailable(dayData)) {
        if (dayData?.isBooked) {
          errors.push(`El ${this.formatDate(dateString)} está ocupado por otra reserva`);
        } else if (dayData?.isBlocked) {
          errors.push(`El ${this.formatDate(dateString)} no está disponible`);
        } else {
          errors.push(`El ${this.formatDate(dateString)} no está disponible`);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      isValid: errors.length === 0,
      errors: errors.slice(0, 3) // Mostrar máximo 3 errores para no sobrecargar la UI
    };
  }

  // ================================
  // 💰 CÁLCULO DE PRECIOS - OPTIMIZADO
  // ================================

  private calculatePrice(): void {
    if (!this.property || !this.selectedDates.checkIn || !this.selectedDates.checkOut) {
      return;
    }

    this.bookingService.calculatePrice(
      this.property.id,
      this.selectedDates.checkIn,
      this.selectedDates.checkOut
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(priceBreakdown => {
      this.priceBreakdown = priceBreakdown;
      this.selectedDates.nights = priceBreakdown.nights;
      this.selectedDates.estimatedTotal = priceBreakdown.total;
      
      // Actualizar descuentos aplicables
      this.selectedDates.applicableDiscounts = [];
      if (priceBreakdown.weeklyDiscount) {
        this.selectedDates.applicableDiscounts.push(`Descuento semanal: ${priceBreakdown.weeklyDiscount.percentage}%`);
      }
      if (priceBreakdown.monthlyDiscount) {
        this.selectedDates.applicableDiscounts.push(`Descuento mensual: ${priceBreakdown.monthlyDiscount.percentage}%`);
      }
    });
  }

  // ================================
  // 📋 ACTUALIZACIÓN DE BOOKING - MEJORADA
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
  // 🚀 NAVEGACIÓN ENTRE PASOS - MEJORADA
  // ================================

  nextStep(): void {
    if (!this.canProceed) {
      this.error = 'Por favor completa todos los campos requeridos antes de continuar';
      setTimeout(() => this.error = null, 3000);
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateCanProceed(); // ✅ ACTUALIZAR estado para el nuevo paso
      this.scrollToTop();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateCanProceed(); // ✅ ACTUALIZAR estado para el paso anterior
      this.scrollToTop();
    }
  }

  goToStep(step: number): void {
    // ✅ VALIDACIÓN: Solo permitir ir a pasos completados o el siguiente
    const canGoToStep = this.validateStepAccess(step);
    
    if (canGoToStep && step >= 1 && step <= this.totalSteps) {
      this.currentStep = step;
      this.updateCanProceed();
      this.scrollToTop();
    }
  }

  // ✅ NUEVO: Validar acceso a pasos
  private validateStepAccess(targetStep: number): boolean {
    switch (targetStep) {
      case 1:
        return true; // Siempre se puede ir al paso 1
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
  // 📤 ENVÍO DE RESERVA - MEJORADO
  // ================================

  submitBooking(): void {
    if (this.isSubmitting || !this.canProceed) return;

    if (!this.stepValidations.review) {
      this.error = 'Por favor verifica que todos los datos estén completos y correctos';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    this.bookingService.submitBooking().pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.error = 'Error al crear la reserva: ' + error.message;
        this.isSubmitting = false;
        return of(null);
      })
    ).subscribe(booking => {
      console.log('🔍 Booking creado:', booking);
      this.isSubmitting = false;
      
      if (booking) {
        console.log('✅ Reserva creada exitosamente:', booking);
        this.router.navigate(['/booking/confirmation', booking.id], { replaceUrl: true });
      }
    });
  }

  openWhatsApp(): void {
    if (!this.currentBooking || !this.property) return;

    // Crear booking temporal para WhatsApp
    const tempBooking: Partial<Booking> = {
      bookingReference: 'TEMP-' + Date.now(),
      propertyTitle: this.property.title,
      hostName: this.property.hostName,
      hostWhatsapp: this.property.hostWhatsapp || '',
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
    } catch (error) {
      this.error = 'Error al abrir WhatsApp. Por favor intenta nuevamente.';
      setTimeout(() => this.error = null, 3000);
    }
  }

  // ================================
  // 🔧 MÉTODOS AUXILIARES - OPTIMIZADOS
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
  // 🎨 GETTERS PARA TEMPLATE - MEJORADOS
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
    return this.property?.maxGuests || 10;
  }

  get isValidToSubmit(): boolean {
    return this.stepValidations.review && this.canProceed;
  }

  get stepErrors(): string[] {
    const errors: string[] = [];
    
    // Errores específicos del paso actual
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
            errors.push(`Esta propiedad acepta máximo ${this.maxGuests} huéspedes`);
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
    return !!(this.priceBreakdown?.weeklyDiscount || this.priceBreakdown?.monthlyDiscount);
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