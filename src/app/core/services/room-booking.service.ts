// ================================
// 📁 src/app/core/services/room-booking.service.ts

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError, combineLatest } from 'rxjs';
import { map, delay, switchMap, tap, catchError, filter, take, timeout } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { RoomService } from './room.service';
import { EstablishmentService } from './establishment.service';
import { Room } from '../models/room.interface';
import { 
  Booking, BookingRequest, BookingStatus, PriceBreakdown, PriceCalculatorConfig,
  BookingValidationRules, BookingProgress, WhatsAppMessage, BookingStats,
  BOOKING_CONSTANTS, PartialBookingRequest, BookingUpdate, BookingSearchParams
} from '../models/booking.interface';
import { 
  DayAvailability, DateSelection, CalendarConfig, DateString,
  CALENDAR_CONSTANTS, CalendarMonth, DateValidationResult
} from '../models/calendar.interface';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RoomBookingService {
  
  // ================================
  // 🗂️ ESTADO Y OBSERVABLES
  // ================================
  
  private bookingsSubject = new BehaviorSubject<Booking[]>([]);
  private currentBookingSubject = new BehaviorSubject<PartialBookingRequest | null>(null);
  private bookingProgressSubject = new BehaviorSubject<BookingProgress | null>(null);
  
  public bookings$ = this.bookingsSubject.asObservable();
  public currentBooking$ = this.currentBookingSubject.asObservable();
  public bookingProgress$ = this.bookingProgressSubject.asObservable();
  
  private priceConfig: PriceCalculatorConfig = BOOKING_CONSTANTS.DEFAULT_PRICE_CONFIG;
  private validationRules: BookingValidationRules = BOOKING_CONSTANTS.DEFAULT_VALIDATION_RULES;
  private calendarConfig: CalendarConfig = CALENDAR_CONSTANTS.DEFAULT_CONFIG;

  private readonly apiUrl = environment.apiUrl || 'http://localhost:3001';
  private readonly useRealAPI = environment.useRealAPI !== false;

  constructor(
    private roomService: RoomService,
    private establishmentService: EstablishmentService,
    private http: HttpClient 
  ) {
    this.loadBookingsFromStorage();
    console.log(`🔄 RoomBookingService - Mode: ${this.useRealAPI ? 'REAL API' : 'MOCK DATA'}`);
  }

  // ================================
  // 📅 DISPONIBILIDAD Y CALENDARIO
  // ================================

  getRoomAvailability(roomId: string, startDate: DateString, endDate: DateString): Observable<DayAvailability[]> {
    if (this.useRealAPI) {
      console.log(`🌐 Fetching real availability for room ${roomId}: ${startDate} to ${endDate}`);
      
      // ✅ MAPEAR ID PARA API
      const backendId = this.mapFrontendIdToBackend(roomId);
      console.log(`🔄 Availability ID mapping: ${roomId} → ${backendId}`);
      
      return this.http.get<any>(`${this.apiUrl}/api/availability/rooms/${backendId}`, {
        params: { start_date: startDate, end_date: endDate }
      }).pipe(
        map(response => {
          console.log('✅ Real availability data received:', response.data.stats);
          return this.transformApiAvailabilityToFrontend(response.data.availability);
        }),
        catchError(error => {
          console.error('❌ API error, falling back to mock:', error);
          return this.getMockAvailability(roomId, startDate, endDate);
        })
      );
    }

    // ✅ FALLBACK A TU CÓDIGO ORIGINAL
    return this.getMockAvailability(roomId, startDate, endDate);
  }

  getCalendarMonth(roomId: string, year: number, month: number): Observable<CalendarMonth> {
    // ✅ INTENTAR API REAL PRIMERO
    if (this.useRealAPI) {
      console.log(`🌐 Fetching real calendar for room ${roomId}: ${year}-${month}`);
      
      // ✅ MAPEAR ID PARA API
      const backendId = this.mapFrontendIdToBackend(roomId);
      console.log(`🔄 Calendar ID mapping: ${roomId} → ${backendId}`);
      
      return this.http.get<any>(`${this.apiUrl}/api/availability/rooms/${backendId}/calendar/${year}/${month}`).pipe(
        map(response => {
          console.log(`✅ Real calendar data received:`, response.data.stats);
          return this.transformApiCalendarToFrontend(response.data);
        }),
        catchError(error => {
          console.error('❌ API error, falling back to mock calendar:', error);
          return this.getMockCalendarMonth(roomId, year, month);
        })
      );
    }

    // ✅ FALLBACK A TU CÓDIGO ORIGINAL
    return this.getMockCalendarMonth(roomId, year, month);
  }

  validateDateSelection(roomId: string, checkIn: DateString, checkOut: DateString): Observable<DateValidationResult> {
    const errors: DateValidationResult['errors'] = [];
    const warnings: DateValidationResult['warnings'] = [];
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    const nights = this.calculateNights(checkIn, checkOut);

    // Validaciones básicas (iguales que antes)
    if (checkInDate < today) {
      errors.push({
        code: 'PAST_DATE',
        message: 'La fecha de llegada no puede ser en el pasado',
        field: 'checkIn'
      });
    }

    if (checkOutDate <= checkInDate) {
      errors.push({
        code: 'INVALID_RANGE',
        message: 'La fecha de salida debe ser posterior a la fecha de llegada',
        field: 'checkOut'
      });
    }

    // Si ya hay errores básicos, devolver inmediatamente
    if (errors.length > 0) {
      return of({ isValid: false, errors, warnings });
    }

    // ✅ INTENTAR VALIDACIÓN REAL
    if (this.useRealAPI) {
      console.log(`🌐 Validating dates with API for room ${roomId}`);
      
      // ✅ MAPEAR ID PARA API
      const backendId = this.mapFrontendIdToBackend(roomId);
      console.log(`🔄 Validation ID mapping: ${roomId} → ${backendId}`);
      
      return this.http.get<any>(`${this.apiUrl}/api/availability/rooms/${backendId}/validate`, {
        params: { check_in_date: checkIn, check_out_date: checkOut }
      }).pipe(
        map(response => {
          console.log(`✅ Real validation result:`, response.data.is_valid);
          return {
            isValid: response.data.is_valid,
            errors: (response.data.errors || []).map((error: any) => ({
              code: error.code,
              message: error.message,
              field: 'range' as const
            })),
            warnings: []
          };
        }),
        catchError(error => {
          console.error('❌ Validation API error, using basic validation:', error);
          return this.getMockValidation(roomId, nights);
        })
      );
    }

    return this.getMockValidation(roomId, nights);
  }

  // ================================
  // 🔄 TRANSFORMADORES API
  // ================================

  private transformApiAvailabilityToFrontend(apiAvailability: any[]): DayAvailability[] {
    return apiAvailability.map(day => ({
      date: day.date,
      dayOfWeek: new Date(day.date).getDay() as any,
      dayNumber: new Date(day.date).getDate(),
      isAvailable: day.is_available,
      isBlocked: day.is_blocked,
      isBooked: day.is_booked,
      isPastDate: new Date(day.date) < new Date(),
      isToday: this.isSameDay(new Date(day.date), new Date()),
      minimumStay: day.minimum_stay_override || 1,
      hasSpecialPrice: !!day.price_override,
      checkInAllowed: day.is_available,
      checkOutAllowed: true
    }));
  }

  private transformApiCalendarToFrontend(apiCalendar: any): CalendarMonth {
    return {
      year: apiCalendar.year,
      month: (apiCalendar.month - 1) as any,
      monthName: CALENDAR_CONSTANTS.MONTH_NAMES[apiCalendar.month - 1],
      monthNameShort: CALENDAR_CONSTANTS.MONTH_NAMES_SHORT[apiCalendar.month - 1],
      days: this.transformApiAvailabilityToFrontend(apiCalendar.days),
      totalDays: apiCalendar.stats.total_days,
      previousMonthDays: [],
      nextMonthDays: [],
      availableDays: apiCalendar.stats.available_days,
      bookedDays: apiCalendar.stats.booked_days,
      blockedDays: apiCalendar.stats.blocked_days,
      isCurrentMonth: this.isCurrentMonth(apiCalendar.year, apiCalendar.month - 1),
      isPastMonth: this.isPastMonth(apiCalendar.year, apiCalendar.month - 1),
      isFutureMonth: this.isFutureMonth(apiCalendar.year, apiCalendar.month - 1)
    };
  }

  private getMockAvailability(roomId: string, startDate: DateString, endDate: DateString): Observable<DayAvailability[]> {
    return this.roomService.getRoomById(roomId).pipe(
      map(room => {
        if (!room) return [];
        
        const availability: DayAvailability[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dateString = this.formatDate(date);
          const dayAvailability = this.generateDayAvailability(room, dateString);
          availability.push(dayAvailability);
        }
        
        return availability;
      }),
      delay(200)
    );
  }

  private getMockCalendarMonth(roomId: string, year: number, month: number): Observable<CalendarMonth> {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = this.formatDate(firstDay);
    const endDate = this.formatDate(lastDay);
    
    return this.getMockAvailability(roomId, startDate, endDate).pipe(
      map(days => ({
        year,
        month: month as any,
        monthName: CALENDAR_CONSTANTS.MONTH_NAMES[month],
        monthNameShort: CALENDAR_CONSTANTS.MONTH_NAMES_SHORT[month],
        days,
        totalDays: days.length,
        previousMonthDays: [],
        nextMonthDays: [],
        availableDays: days.filter(d => d.isAvailable).length,
        bookedDays: days.filter(d => d.isBooked).length,
        blockedDays: days.filter(d => d.isBlocked).length,
        isCurrentMonth: this.isCurrentMonth(year, month),
        isPastMonth: this.isPastMonth(year, month),
        isFutureMonth: this.isFutureMonth(year, month)
      }))
    );
  }

  private getMockValidation(roomId: string, nights: number): Observable<DateValidationResult> {
    return this.roomService.getRoomById(roomId).pipe(
      map(room => {
        const errors: DateValidationResult['errors'] = [];
        const warnings: DateValidationResult['warnings'] = [];

        if (room && room.availability.minimumStay && nights < room.availability.minimumStay) {
          errors.push({
            code: 'MIN_STAY',
            message: `Esta habitación requiere una estancia mínima de ${room.availability.minimumStay} noches`,
            field: 'range'
          });
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings
        };
      }),
      delay(100)
    );
  }

  // ================================
  // 💰 CÁLCULO DE PRECIOS
  // ================================

  calculatePrice(roomId: string, checkIn: DateString, checkOut: DateString): Observable<PriceBreakdown> {
    return this.roomService.getRoomById(roomId).pipe(
      map(room => {
        if (!room) {
          throw new Error('Habitación no encontrada');
        }
        
        const nights = this.calculateNights(checkIn, checkOut);
        const pricePerNight = room.pricing.basePrice;
        let subtotal = pricePerNight * nights;
        
        const breakdown: PriceBreakdown = {
          pricePerNight,
          nights,
          subtotal,
          iva: { percentage: 0, amount: 0 },
          total: 0,
          totalCOP: 0
        };
        
        if (this.priceConfig.cleaningFeePercentage > 0) {
          breakdown.cleaningFee = Math.round(subtotal * (this.priceConfig.cleaningFeePercentage / 100));
        }

        if (this.priceConfig.serviceFeePercentage > 0) {
          breakdown.serviceFee = Math.round(subtotal * (this.priceConfig.serviceFeePercentage / 100));
        }

        const totalBeforeTax = subtotal + (breakdown.cleaningFee || 0) + (breakdown.serviceFee || 0);

        breakdown.iva = {
          percentage: this.priceConfig.ivaPercentage,
          amount: Math.round(totalBeforeTax * (this.priceConfig.ivaPercentage / 100))
        };

        breakdown.total = totalBeforeTax + breakdown.iva.amount;
        breakdown.totalCOP = breakdown.total;
        
        return breakdown;
      }),
      delay(100)
    );
  }

  // ================================
  // 📋 GESTIÓN DE RESERVAS
  // ================================

initializeBooking(roomId: string): Observable<PartialBookingRequest> {
  console.log(`🚀 BookingService.initializeBooking called with roomId: ${roomId}`);
  return new Observable(observer => {
    setTimeout(() => {
      this.performBookingInitialization(roomId).subscribe({
        next: (result) => observer.next(result),
        error: (error) => observer.error(error),
        complete: () => observer.complete()
      });
    }, 100);
  });
}

private performBookingInitialization(roomId: string): Observable<PartialBookingRequest> {
  console.log(`🛏️ Performing booking initialization for ${roomId}`);
  
  return combineLatest([
    this.getRoomSafelyWithRetry(roomId),
    this.establishmentService.getEstablishmentInfo()
  ]).pipe(
    map(([room, establishment]) => {
      if (!room) {
        console.warn(`⚠️ Room ${roomId} not found, using fallback booking`);
        
        const fallbackBooking: PartialBookingRequest = {
          propertyId: roomId,
          guests: {
            adults: 1,
            children: 0,
            infants: 0,
            total: 1
          },
          purposeOfStay: 'vacation',
          isFirstTimeInArmenia: true,
          hostWhatsapp: establishment.contactInfo?.whatsapp || '+573137065373',
          hostName: establishment.host?.name || 'Hostal Norte Armenia'
        };
        
        this.currentBookingSubject.next(fallbackBooking);
        this.initializeProgress();
        return fallbackBooking;
      }
      
      console.log(`✅ Booking initialization successful for room: ${room.name} ($${room.pricing.basePrice})`);
      
      const initialBooking: PartialBookingRequest = {
        propertyId: roomId,
        guests: {
          adults: 1,
          children: 0,
          infants: 0,
          total: 1
        },
        purposeOfStay: 'vacation',
        isFirstTimeInArmenia: true,
        hostWhatsapp: establishment.contactInfo?.whatsapp || '+573137065373',
        hostName: establishment.host?.name || 'Hostal Norte Armenia'
      };
      
      this.currentBookingSubject.next(initialBooking);
      this.initializeProgress();
      return initialBooking;
    }),
    catchError(error => {
      console.error('❌ Error in booking initialization:', error);
      
      const emergencyBooking: PartialBookingRequest = {
        propertyId: roomId,
        guests: {
          adults: 1,
          children: 0,
          infants: 0,
          total: 1
        },
        purposeOfStay: 'vacation',
        isFirstTimeInArmenia: true,
        hostWhatsapp: '+573137065373',
        hostName: 'Hostal Norte Armenia'
      };
      
      console.log('🔄 Using emergency fallback booking');
      this.currentBookingSubject.next(emergencyBooking);
      this.initializeProgress();
      return of(emergencyBooking);
    })
  );
}
  debugBookingState(roomId: string): void {
    console.log('🔍 DEBUG - Booking State:');
    console.log(`📍 Requested Room ID: ${roomId}`);
    console.log(`🏠 Rooms loaded: ${this.roomService['roomsSubject'].value.length}`);
    console.log(`📋 Available Room IDs:`, this.roomService['roomsSubject'].value.map((r: any) => r.id));
    
    const room = this.roomService['roomsSubject'].value.find((r: any) => r.id === roomId);
    if (room) {
      console.log(`✅ Room found: ${room.name}, Price: ${room.pricing.basePrice}`);
    } else {
      console.log(`❌ Room ${roomId} not found in loaded rooms`);
    }
  }


  updateCurrentBooking(updates: Partial<PartialBookingRequest>): Observable<PartialBookingRequest> {
    const current = this.currentBookingSubject.value;
    if (!current) {
      return throwError('No hay una reserva activa');
    }
    
    const updated = { ...current, ...updates };
    this.currentBookingSubject.next(updated);
    this.updateProgress();
    
    return of(updated);
  }

  submitBooking(): Observable<Booking> {
    const currentBooking = this.currentBookingSubject.value;
    if (!currentBooking) {
      return throwError('No hay una reserva para enviar');
    }
    
    return this.validateCurrentBooking().pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return throwError('La reserva contiene errores: ' + validation.errors.map((e: any) => e.message).join(', '));
        }
        
        return this.createBooking(currentBooking as BookingRequest);
      })
    );
  }

  private createBooking(bookingRequest: BookingRequest): Observable<Booking> {
    return combineLatest([
      this.roomService.getRoomById(bookingRequest.propertyId),
      this.establishmentService.getEstablishmentInfo(),
      this.calculatePrice(bookingRequest.propertyId, bookingRequest.checkInDate, bookingRequest.checkOutDate)
    ]).pipe(
      map(([room, establishment, priceBreakdown]) => {
        if (!room) {
          throw new Error('Habitación no encontrada');
        }
        
        const booking: Booking = {
          id: this.generateBookingId(),
          bookingReference: this.generateBookingReference(),
          status: 'pending',
          paymentStatus: 'pending',
          
          propertyId: room.id,
          propertyTitle: `${room.name} - ${establishment.name}`,
          propertyImage: room.images.main,
          propertyAddress: establishment.address,
          propertyZone: establishment.areaInfo.neighborhood,
          
          checkInDate: bookingRequest.checkInDate,
          checkOutDate: bookingRequest.checkOutDate,
          nights: this.calculateNights(bookingRequest.checkInDate, bookingRequest.checkOutDate),
          
          guests: bookingRequest.guests,
          guestInfo: bookingRequest.guestInfo,
          
          priceBreakdown,
          
          hostName: establishment.host.name,
          hostWhatsapp: establishment.contactInfo.whatsapp,
          
          whatsappMessageSent: false,
          
          specialRequests: bookingRequest.specialRequests,
          estimatedArrivalTime: bookingRequest.estimatedArrivalTime,
          purposeOfStay: bookingRequest.purposeOfStay,
          
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          
          cancellationPolicy: establishment.policies.cancellationPolicy,
          minimumStay: room.availability.minimumStay || 1
        };
        
        this.addBooking(booking);
        this.sendWhatsAppMessage(booking).subscribe();
        
        return booking;
      }),
      delay(500)
    );
  }

  // ================================
  // 🆔 MAPEO DE IDs FRONTEND
  // ================================

  private mapFrontendIdToBackend(frontendId: string): string {
    if (frontendId.startsWith('room-')) {
      return frontendId.replace('room-', '');
    }
    return frontendId;
  }

  private mapBackendIdToFrontend(backendId: number | string): string {
    return `room-${backendId}`;
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS
  // ================================

  private generateDayAvailability(room: Room, date: DateString): DayAvailability {
    const dateObj = new Date(date);
    const today = new Date();
    const dayOfWeek = dateObj.getDay() as any;
    
    // Mock: algunas fechas bloqueadas aleatoriamente
    const isBlocked = Math.random() < 0.1; // 10% de días bloqueados
    const isBooked = Math.random() < 0.15;  // 15% de días con reserva
    
    return {
      date,
      dayOfWeek,
      dayNumber: dateObj.getDate(),
      isAvailable: !isBlocked && !isBooked && dateObj >= today,
      isBlocked,
      isBooked,
      isPastDate: dateObj < today,
      isToday: this.isSameDay(dateObj, today),
      minimumStay: room.availability.minimumStay,
      hasSpecialPrice: false,
      checkInAllowed: true,
      checkOutAllowed: true
    };
  }

  private calculateNights(checkIn: DateString, checkOut: DateString): number {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private formatDate(date: Date): DateString {
    return date.toISOString().split('T')[0];
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private isCurrentMonth(year: number, month: number): boolean {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month;
  }

  private isPastMonth(year: number, month: number): boolean {
    const today = new Date();
    const monthDate = new Date(year, month);
    return monthDate < new Date(today.getFullYear(), today.getMonth());
  }

  private isFutureMonth(year: number, month: number): boolean {
    const today = new Date();
    const monthDate = new Date(year, month);
    return monthDate > new Date(today.getFullYear(), today.getMonth());
  }

  private generateBookingId(): string {
    return 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateBookingReference(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 999) + 1;
    return `HNA-${dateStr}-${randomNum.toString().padStart(3, '0')}`;
  }

  private populateWhatsAppTemplate(template: string, booking: Booking): string {
    return template
      .replace('{{hostName}}', booking.hostName)
      .replace('{{bookingReference}}', booking.bookingReference)
      .replace('{{propertyTitle}}', booking.propertyTitle)
      .replace('{{guestName}}', `${booking.guestInfo.firstName} ${booking.guestInfo.lastName}`)
      .replace('{{checkInDate}}', this.formatDateForDisplay(booking.checkInDate))
      .replace('{{checkOutDate}}', this.formatDateForDisplay(booking.checkOutDate))
      .replace('{{checkInTime}}', '15:00')
      .replace('{{checkOutTime}}', '11:00')
      .replace('{{nights}}', booking.nights.toString())
      .replace('{{totalGuests}}', booking.guests.total.toString())
      .replace('{{total}}', booking.priceBreakdown.total.toLocaleString())
      .replace('{{guestPhone}}', booking.guestInfo.phone)
      .replace('{{guestEmail}}', booking.guestInfo.email)
      .replace('{{specialRequests}}', booking.specialRequests ? 
        `\n🗒️ *Solicitudes especiales:*\n${booking.specialRequests}` : '');
  }

  private generateWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }

  private formatDateForDisplay(date: DateString): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private initializeProgress(): void {
    const progress: BookingProgress = {
      currentStep: 1,
      totalSteps: 4,
      steps: [
        { stepNumber: 1, stepName: 'dates', isCompleted: false, isValid: false, errors: [] },
        { stepNumber: 2, stepName: 'guests', isCompleted: false, isValid: false, errors: [] },
        { stepNumber: 3, stepName: 'details', isCompleted: false, isValid: false, errors: [] },
        { stepNumber: 4, stepName: 'review', isCompleted: false, isValid: false, errors: [] }
      ],
      canProceed: false,
      completionPercentage: 0
    };
    
    this.bookingProgressSubject.next(progress);
  }

  private updateProgress(): void {
    const current = this.currentBookingSubject.value;
    const progress = this.bookingProgressSubject.value;
    
    if (!current || !progress) return;
    
    progress.steps[0].isValid = !!(current.checkInDate && current.checkOutDate);
    progress.steps[1].isValid = !!(current.guests && current.guests.total > 0);
    progress.steps[2].isValid = !!(current.guestInfo?.firstName && current.guestInfo?.email);
    
    const completedSteps = progress.steps.filter(s => s.isValid).length;
    progress.completionPercentage = (completedSteps / progress.totalSteps) * 100;
    progress.canProceed = progress.steps[progress.currentStep - 1]?.isValid || false;
    
    this.bookingProgressSubject.next(progress);
  }

  private addBooking(booking: Booking): void {
    const current = this.bookingsSubject.value;
    this.bookingsSubject.next([...current, booking]);
    this.saveBookingsToStorage([...current, booking]);
  }

  private loadBookingsFromStorage(): void {
    try {
      const saved = localStorage.getItem('hostal_norte_bookings');
      if (saved) {
        const bookings = JSON.parse(saved);
        this.bookingsSubject.next(bookings);
      }
    } catch (error) {
      console.warn('Error loading bookings from storage:', error);
    }
  }

  private saveBookingsToStorage(bookings: Booking[]): void {
    try {
      localStorage.setItem('hostal_norte_bookings', JSON.stringify(bookings));
    } catch (error) {
      console.warn('Error saving bookings to storage:', error);
    }
  }

  validateCurrentBooking(): Observable<DateValidationResult> {
    const current = this.currentBookingSubject.value;
    if (!current || !current.checkInDate || !current.checkOutDate || !current.propertyId) {
      return of({
        isValid: false,
        errors: [{
          code: 'INCOMPLETE_BOOKING',
          message: 'Información de reserva incompleta',
          field: 'range'
        }],
        warnings: []
      });
    }
    
    return this.validateDateSelection(current.propertyId, current.checkInDate, current.checkOutDate);
  }

  sendWhatsAppMessage(booking: Booking): Observable<WhatsAppMessage> {
    const template = BOOKING_CONSTANTS.WHATSAPP_TEMPLATES['new-booking'];
    
    const messageText = this.populateWhatsAppTemplate(template, booking);
    const whatsappUrl = this.generateWhatsAppUrl(booking.hostWhatsapp, messageText);
    
    const message: WhatsAppMessage = {
      bookingId: booking.id,
      hostWhatsapp: booking.hostWhatsapp,
      messageText,
      messageType: 'new-booking',
      isSent: false,
      whatsappUrl
    };

    setTimeout(() => {
      message.isSent = true;
      message.sentAt = new Date().toISOString();
      this.updateBookingWhatsAppStatus(booking.id, true);
    }, 1000);
    
    return of(message).pipe(delay(100));
  }

  private updateBookingWhatsAppStatus(bookingId: string, sent: boolean): void {
    const current = this.bookingsSubject.value;
    const updated = current.map(booking => 
      booking.id === bookingId 
        ? { ...booking, whatsappMessageSent: sent, updatedAt: new Date().toISOString() }
        : booking
    );
    this.bookingsSubject.next(updated);
    this.saveBookingsToStorage(updated);
  }

  clearCurrentBooking(): void {
    this.currentBookingSubject.next(null);
    this.bookingProgressSubject.next(null);
  }

  getBookings(): Observable<Booking[]> {
    return this.bookings$;
  }

  getBookingById(id: string): Observable<Booking | undefined> {
    return this.bookings$.pipe(
      map(bookings => bookings.find(b => b.id === id))
    );
  }

  openWhatsApp(booking: Booking): void {
    const template = BOOKING_CONSTANTS.WHATSAPP_TEMPLATES['new-booking'];
    const messageText = this.populateWhatsAppTemplate(template, booking);
    const whatsappUrl = this.generateWhatsAppUrl(booking.hostWhatsapp, messageText);
    
    window.open(whatsappUrl, '_blank');
  }

// ================================
// 🔧 MÉTODOS HELPER NUEVOS
// ================================

private waitForRoomsToLoad(): Observable<Room[]> {
  console.log('⏳ Waiting for rooms to load...');
  
  return this.roomService.rooms$.pipe(
    tap(rooms => console.log(`🔍 Current rooms count: ${rooms.length}`)),
    filter(rooms => rooms.length > 0),
    take(1),
    timeout(10000), 
    tap(() => console.log('✅ Rooms loaded successfully')),
    catchError(error => {
      console.error('❌ Timeout waiting for rooms to load:', error);
      return of([] as Room[]);
    })
  );
}


private getRoomSafelyWithRetry(roomId: string): Observable<Room | null> {
  console.log(`🔍 Looking for room: ${roomId}`);
  
  return this.roomService.getRoomById(roomId).pipe(
    map(room => room || null),
    tap(room => {
      if (room) {
        console.log(`✅ Room found: ${room.name}`);
      } else {
        console.warn(`⚠️ Room ${roomId} not found, checking available rooms...`);
        this.debugAvailableRooms();
      }
    }),
    catchError(error => {
      console.error(`❌ Error getting room ${roomId}:`, error);
      return of(null);
    }),
    switchMap(room => {
      if (room) {
        return of(room);
      }
      
      console.log(`🔄 Retrying room lookup for ${roomId}...`);
      return this.roomService.getRoomById(roomId).pipe(
        map(retryRoom => retryRoom || null),
        catchError(() => of(null))
      );
    })
  );
}

private debugAvailableRooms(): void {
  console.log('🔍 DEBUG - Available rooms:');
  const roomService = this.roomService as any;
  const rooms = roomService.roomsSubject?.value || [];
  
  console.log(`📊 Total rooms: ${rooms.length}`);
  
  if (rooms.length === 0) {
    console.log('❌ No rooms found in RoomService');
    return;
  }
  
  rooms.forEach((room: Room, index: number) => {
    console.log(`${index + 1}. ID: ${room.id}, Name: ${room.name}, Price: ${room.pricing?.basePrice}`);
  });
}

}

