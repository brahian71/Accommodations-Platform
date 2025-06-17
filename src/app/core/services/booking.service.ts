// 📁 src/app/core/services/booking.service.ts

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError, combineLatest } from 'rxjs';
import { map, delay, switchMap, tap } from 'rxjs/operators';

import { PropertyService } from './property.service';
import { Property } from '../models/property.interface';
import { 
  Booking, BookingRequest, BookingStatus, PriceBreakdown, PriceCalculatorConfig,
  BookingValidationRules, BookingProgress, WhatsAppMessage, BookingStats,
  BOOKING_CONSTANTS, PartialBookingRequest, BookingUpdate, BookingSearchParams
} from '../models/booking.interface';
import { 
  DayAvailability, DateSelection, CalendarConfig, DateString,
  CALENDAR_CONSTANTS, CalendarMonth, DateValidationResult
} from '../models/calendar.interface';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  
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

  constructor(private propertyService: PropertyService) {
    this.loadBookingsFromStorage();
  }

  // ================================
  // 📅 DISPONIBILIDAD Y CALENDARIO
  // ================================

  getPropertyAvailability(propertyId: string, startDate: DateString, endDate: DateString): Observable<DayAvailability[]> {
    return this.propertyService.getPropertyById(propertyId).pipe(
      map(property => {
        if (!property) return [];
        
        const availability: DayAvailability[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dateString = this.formatDate(date);
          const dayAvailability = this.generateDayAvailability(property, dateString);
          availability.push(dayAvailability);
        }
        
        return availability;
      }),
      delay(200)
    );
  }

  getCalendarMonth(propertyId: string, year: number, month: number): Observable<CalendarMonth> {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = this.formatDate(firstDay);
    const endDate = this.formatDate(lastDay);
    
    return this.getPropertyAvailability(propertyId, startDate, endDate).pipe(
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
  validateDateSelection(propertyId: string, checkIn: DateString, checkOut: DateString): Observable<DateValidationResult> {
    const errors: DateValidationResult['errors'] = [];
    const warnings: DateValidationResult['warnings'] = [];
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    const nights = this.calculateNights(checkIn, checkOut);
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
    const hoursUntilCheckIn = (checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60);
    if (hoursUntilCheckIn < this.validationRules.minAdvanceBookingHours) {
      errors.push({
        code: 'MIN_ADVANCE',
        message: `Debes reservar con al menos ${this.validationRules.minAdvanceBookingHours} horas de anticipación`,
        field: 'checkIn'
      });
    }

    const daysUntilCheckIn = Math.ceil(hoursUntilCheckIn / 24);
    if (daysUntilCheckIn > this.validationRules.maxAdvanceBookingDays) {
      errors.push({
        code: 'MAX_ADVANCE',
        message: `No puedes reservar con más de ${this.validationRules.maxAdvanceBookingDays} días de anticipación`,
        field: 'checkIn'
      });
    }

    if (nights > this.validationRules.maxStayDays) {
      errors.push({
        code: 'MAX_STAY',
        message: `La estancia máxima permitida es de ${this.validationRules.maxStayDays} días`,
        field: 'range'
      });
    }
    
    return this.propertyService.getPropertyById(propertyId).pipe(
      map(property => {
        if (property && property.minimumStay && nights < property.minimumStay) {
          errors.push({
            code: 'MIN_STAY',
            message: `Esta propiedad requiere una estancia mínima de ${property.minimumStay} noches`,
            field: 'range'
          });
        }
        
        if (nights >= 7 && property?.pricePerWeek) {
          warnings.push({
            code: 'WEEKLY_DISCOUNT',
            message: 'Descuento semanal aplicado automáticamente'
          });
        }
        
        if (nights >= 28 && property?.pricePerMonth) {
          warnings.push({
            code: 'MONTHLY_DISCOUNT',
            message: 'Descuento mensual aplicado automáticamente'
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

  calculatePrice(propertyId: string, checkIn: DateString, checkOut: DateString): Observable<PriceBreakdown> {
    return this.propertyService.getPropertyById(propertyId).pipe(
      map(property => {
        if (!property) {
          throw new Error('Propiedad no encontrada');
        }
        
        const nights = this.calculateNights(checkIn, checkOut);
        const pricePerNight = property.pricePerNight;
        let subtotal = pricePerNight * nights;
        
        const breakdown: PriceBreakdown = {
          pricePerNight,
          nights,
          subtotal,
          iva: { percentage: 0, amount: 0 },
          total: 0,
          totalCOP: 0
        };

        if (this.priceConfig.applyWeeklyDiscount && nights >= 7 && property.pricePerWeek) {
          const weeklyTotal = Math.floor(nights / 7) * property.pricePerWeek;
          const remainingDays = nights % 7;
          const remainingTotal = remainingDays * pricePerNight;
          const newSubtotal = weeklyTotal + remainingTotal;
          
          breakdown.weeklyDiscount = {
            percentage: Math.round(((subtotal - newSubtotal) / subtotal) * 100),
            amount: subtotal - newSubtotal
          };
          
          subtotal = newSubtotal;
          breakdown.subtotal = subtotal;
        }

        if (this.priceConfig.applyMonthlyDiscount && nights >= 28 && property.pricePerMonth) {
          const monthlyTotal = Math.floor(nights / 30) * property.pricePerMonth;
          const remainingDays = nights % 30;
          const remainingTotal = remainingDays * pricePerNight;
          const newSubtotal = monthlyTotal + remainingTotal;
          
          breakdown.monthlyDiscount = {
            percentage: Math.round(((subtotal - newSubtotal) / subtotal) * 100),
            amount: subtotal - newSubtotal
          };
          
          subtotal = newSubtotal;
          breakdown.subtotal = subtotal;
        }

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

  initializeBooking(propertyId: string): Observable<PartialBookingRequest> {
    return this.propertyService.getPropertyById(propertyId).pipe(
      map(property => {
        if (!property) {
          throw new Error('Propiedad no encontrada');
        }
        
        const initialBooking: PartialBookingRequest = {
          propertyId,
          guests: {
            adults: 1,
            children: 0,
            infants: 0,
            total: 1
          },
          purposeOfStay: 'vacation',
          isFirstTimeInArmenia: true,
          hostWhatsapp: property.hostWhatsapp || '',
          hostName: property.hostName
        };
        
        this.currentBookingSubject.next(initialBooking);
        this.initializeProgress();
        
        return initialBooking;
      })
    );
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
      this.propertyService.getPropertyById(bookingRequest.propertyId),
      this.calculatePrice(bookingRequest.propertyId, bookingRequest.checkInDate, bookingRequest.checkOutDate)
    ]).pipe(
      map(([property, priceBreakdown]) => {
        if (!property) {
          throw new Error('Propiedad no encontrada');
        }
        
        const booking: Booking = {
          id: this.generateBookingId(),
          bookingReference: this.generateBookingReference(),
          status: 'pending',
          paymentStatus: 'pending',
          
          propertyId: property.id,
          propertyTitle: property.title,
          propertyImage: property.image,
          propertyAddress: property.address || property.location,
          propertyZone: property.zone,
          
          checkInDate: bookingRequest.checkInDate,
          checkOutDate: bookingRequest.checkOutDate,
          nights: this.calculateNights(bookingRequest.checkInDate, bookingRequest.checkOutDate),
          
          guests: bookingRequest.guests,
          guestInfo: bookingRequest.guestInfo,
          
          priceBreakdown,
          
          hostName: property.hostName,
          hostWhatsapp: property.hostWhatsapp || '',
          
          whatsappMessageSent: false,
          
          specialRequests: bookingRequest.specialRequests,
          estimatedArrivalTime: bookingRequest.estimatedArrivalTime,
          purposeOfStay: bookingRequest.purposeOfStay,
          
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          
          cancellationPolicy: property.cancellationPolicy || 'moderada',
          minimumStay: property.minimumStay || 1
        };
        
        // Guardar la reserva
        this.addBooking(booking);
        
        // Enviar mensaje de WhatsApp
        this.sendWhatsAppMessage(booking).subscribe();
        
        return booking;
      }),
      delay(500)
    );
  }

  // ================================
  // 📱 INTEGRACIÓN WHATSAPP
  // ================================

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

  openWhatsApp(booking: Booking): void {
    const template = BOOKING_CONSTANTS.WHATSAPP_TEMPLATES['new-booking'];
    const messageText = this.populateWhatsAppTemplate(template, booking);
    const whatsappUrl = this.generateWhatsAppUrl(booking.hostWhatsapp, messageText);
    
    window.open(whatsappUrl, '_blank');
    this.updateBookingWhatsAppStatus(booking.id, true);
  }

  // ================================
  // 📊 CONSULTAS Y BÚSQUEDAS
  // ================================

  getBookings(): Observable<Booking[]> {
    return this.bookings$;
  }

  getBookingById(id: string): Observable<Booking | undefined> {
    return this.bookings$.pipe(
      map(bookings => bookings.find(b => b.id === id))
    );
  }

  getBookingByReference(reference: string): Observable<Booking | undefined> {
    return this.bookings$.pipe(
      map(bookings => bookings.find(b => b.bookingReference === reference))
    );
  }

  searchBookings(params: BookingSearchParams): Observable<Booking[]> {
    return this.bookings$.pipe(
      map(bookings => {
        let filtered = [...bookings];
        
        if (params.propertyId) {
          filtered = filtered.filter(b => b.propertyId === params.propertyId);
        }
        
        if (params.guestEmail) {
          filtered = filtered.filter(b => 
            b.guestInfo.email.toLowerCase().includes(params.guestEmail!.toLowerCase())
          );
        }
        
        if (params.bookingReference) {
          filtered = filtered.filter(b => 
            b.bookingReference.toLowerCase().includes(params.bookingReference!.toLowerCase())
          );
        }
        
        if (params.status) {
          filtered = filtered.filter(b => b.status === params.status);
        }
        
        if (params.dateFrom) {
          filtered = filtered.filter(b => b.checkInDate >= params.dateFrom!);
        }
        
        if (params.dateTo) {
          filtered = filtered.filter(b => b.checkOutDate <= params.dateTo!);
        }
        
        return filtered.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
    );
  }

  getBookingStats(): Observable<BookingStats> {
    return this.bookings$.pipe(
      map(bookings => {
        const total = bookings.length;
        const pending = bookings.filter(b => b.status === 'pending').length;
        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const cancelled = bookings.filter(b => b.status === 'cancelled').length;
        
        const totalRevenue = bookings
          .filter(b => b.status === 'confirmed' || b.status === 'completed')
          .reduce((sum, b) => sum + b.priceBreakdown.total, 0);
        
        const avgBookingValue = total > 0 ? totalRevenue / total : 0;
        const avgStayDuration = total > 0 ? 
          bookings.reduce((sum, b) => sum + b.nights, 0) / total : 0;
        
        // Calcular zona más popular
        const zoneCount = bookings.reduce((acc, b) => {
          acc[b.propertyZone] = (acc[b.propertyZone] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const mostPopularZone = Object.entries(zoneCount)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
        
        return {
          totalBookings: total,
          pendingBookings: pending,
          confirmedBookings: confirmed,
          cancelledBookings: cancelled,
          totalRevenue,
          averageBookingValue: Math.round(avgBookingValue),
          averageStayDuration: Math.round(avgStayDuration * 10) / 10,
          occupancyRate: 0, // Calculado por propiedad
          mostPopularZone,
          mostPopularPropertyType: ''
        };
      })
    );
  }

  // ================================
  // 🔧 MÉTODOS PRIVADOS Y UTILIDADES
  // ================================

  private generateDayAvailability(property: Property, date: DateString): DayAvailability {
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
      minimumStay: property.minimumStay,
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
    return `ARM-${dateStr}-${randomNum.toString().padStart(3, '0')}`;
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
    
    // Actualizar validación de cada paso
    progress.steps[0].isValid = !!(current.checkInDate && current.checkOutDate);
    progress.steps[1].isValid = !!(current.guests && current.guests.total > 0);
    progress.steps[2].isValid = !!(current.guestInfo?.firstName && current.guestInfo?.email);
    
    // Calcular progreso
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

  private loadBookingsFromStorage(): void {
    try {
      const saved = localStorage.getItem('armenia_norte_bookings');
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
      localStorage.setItem('armenia_norte_bookings', JSON.stringify(bookings));
    } catch (error) {
      console.warn('Error saving bookings to storage:', error);
    }
  }

  // ================================
  // 🧹 LIMPIEZA Y RESET
  // ================================

  clearCurrentBooking(): void {
    this.currentBookingSubject.next(null);
    this.bookingProgressSubject.next(null);
  }

  resetBookingProgress(): void {
    this.initializeProgress();
  }
}