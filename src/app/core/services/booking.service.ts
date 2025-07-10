// 📁 src/app/core/services/booking.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError, combineLatest } from 'rxjs';
import { map, delay, switchMap, tap, catchError } from 'rxjs/operators';

import { RoomService } from './room.service';
import { EstablishmentService } from './establishment.service';
import { Room } from '../models/room.interface';
import { Establishment } from '../models/establishment.interface';

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
  // 🌐 API CONFIGURATION
  // ================================
  
  private readonly API_BASE = 'http://localhost:3001/api';
  private readonly BOOKINGS_ENDPOINT = `${this.API_BASE}/bookings`;
  private readonly AVAILABILITY_ENDPOINT = `${this.API_BASE}/availability`;
  
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

  constructor(
    private http: HttpClient,
    private roomService: RoomService,
    private establishmentService: EstablishmentService 
  ) {
    console.log('📅 BookingService initialized - UNIFIED VERSION');
    console.log('🎯 API Base:', this.API_BASE);
    this.loadBookingsFromStorage();
  }
  getRoomAvailability(roomId: string, startDate: DateString, endDate: DateString): Observable<DayAvailability[]> {
    console.log('🔍 Getting availability (UNIFIED) for room:', roomId, 'dates:', startDate, 'to', endDate);
    
    const backendId = this.mapFrontendIdToBackend(roomId);
    console.log(`🔄 ID mapping: ${roomId} → ${backendId}`);
    
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);

    return this.http.get<any>(`${this.AVAILABILITY_ENDPOINT}/rooms/${backendId}`, { params }).pipe(
      map(response => {
        console.log('✅ Availability API success:', response.data.stats);
        return this.convertApiAvailabilityToDayAvailability(response.data.availability);
      }),
      catchError(error => {
        console.warn('⚠️ Availability API failed, using fallback:', error.status);
        return this.generateMockAvailability(roomId, startDate, endDate);
      })
    );
  }

 getCalendarMonth(roomId: string, year: number, month: number): Observable<CalendarMonth> {
    console.log('📅 Getting calendar (UNIFIED) for room:', roomId);
    console.log('📅 Requested year/month:', year, month, '(0-indexed)');
    console.log('📅 Month name:', ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][month]);
    
    const backendId = this.mapFrontendIdToBackend(roomId);
    console.log('🔄 Calendar ID mapping:', roomId, '→', backendId);
    
    const backendMonth = month + 1;
    console.log('📅 Backend month (1-indexed):', backendMonth);
    
    return this.http.get<any>(`${this.AVAILABILITY_ENDPOINT}/rooms/${backendId}/calendar/${year}/${backendMonth}`).pipe(
      map(response => {
        console.log('✅ Calendar API raw response:', response);
        console.log('✅ Calendar API stats:', response.data.stats);
        
        const calendarData = this.convertApiCalendarToCalendarMonth(response.data);
        console.log('📊 Calendar after conversion:');
        console.log('  - Total days:', calendarData.totalDays);
        console.log('  - Available days:', calendarData.availableDays);
        console.log('  - Booked days:', calendarData.bookedDays);
        console.log('  - Blocked days:', calendarData.blockedDays);
        
        if (calendarData.availableDays === 0) {
          console.warn('⚠️ WARNING: NO AVAILABLE DAYS AFTER CONVERSION!');
          console.log('🔍 Sample day data:', calendarData.days.slice(0, 3));
        }
        
        return calendarData;
      }),
      catchError(error => {
        console.warn('⚠️ Calendar API failed:', error.status, error.message);
        console.log('🔄 Using mock calendar fallback');
        return this.generateMockCalendarMonth(roomId, year, month);
      })
    );
  }

  validateDateSelection(roomId: string, checkIn: DateString, checkOut: DateString): Observable<DateValidationResult> {
    console.log('✅ Validating dates (UNIFIED):', roomId, checkIn, checkOut);
    const errors: DateValidationResult['errors'] = [];
    const warnings: DateValidationResult['warnings'] = [];
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    
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
    if (errors.length > 0) {
      return of({ isValid: false, errors, warnings });
    }
    const backendId = this.mapFrontendIdToBackend(roomId);
    const params = new HttpParams()
      .set('check_in_date', checkIn)
      .set('check_out_date', checkOut);

    return this.http.get<any>(`${this.AVAILABILITY_ENDPOINT}/rooms/${backendId}/validate`, { params }).pipe(
      map(response => {
        console.log('✅ Date validation API success:', response.data.is_valid);
        
        return {
          isValid: response.data.is_valid,
          errors: (response.data.errors || []).map((err: any) => ({
            code: err.code || 'API_ERROR',
            message: err.message || err,
            field: this.mapFieldType(err.field) as 'checkIn' | 'checkOut' | 'range'
          })),
          warnings: []
        };
      }),
      catchError(error => {
        console.warn('⚠️ Date validation API failed, using basic validation:', error.status);
        return this.validateWithRoomRules(roomId, checkIn, checkOut);
      })
    );
  }

  private validateWithRoomRules(roomId: string, checkIn: DateString, checkOut: DateString): Observable<DateValidationResult> {
    const nights = this.calculateNights(checkIn, checkOut);
    
    return this.roomService.getRoomById(roomId).pipe(
      map(room => {
        const errors: DateValidationResult['errors'] = [];
        
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
          warnings: []
        };
      })
    );
  }

  // ================================
  // 💰 CÁLCULO DE PRECIOS
  // ================================

  calculatePrice(roomId: string, checkIn: DateString, checkOut: DateString): Observable<PriceBreakdown> {
    console.log('💰 Calculating price (UNIFIED) for room:', roomId);
    
    return this.roomService.getRoomById(roomId).pipe(
      map(room => {
        if (!room) {
          throw new Error('Habitación no encontrada');
        }
        
        const nights = this.calculateNights(checkIn, checkOut);
        const pricePerNight = room.pricing.basePrice;
        const subtotal = pricePerNight * nights;
        
        const breakdown: PriceBreakdown = {
          pricePerNight,
          nights,
          subtotal,
          iva: {
            percentage: 19,
            amount: Math.round(subtotal * 0.19)
          },
          total: subtotal + Math.round(subtotal * 0.19),
          totalCOP: subtotal + Math.round(subtotal * 0.19)
        };
        
        console.log('✅ Price calculated (UNIFIED):', breakdown);
        return breakdown;
      }),
      delay(100)
    );
  }

  // ================================
  // 📋 GESTIÓN DE RESERVAS
  // ================================

  initializeBooking(roomId: string): Observable<PartialBookingRequest> {
    console.log('🚀 BookingService.initializeBooking (UNIFIED) called with roomId:', roomId);
    
    return combineLatest([
      this.roomService.getRoomById(roomId),
      this.establishmentService.getEstablishmentInfo()
    ]).pipe(
      map(([room, establishment]) => {
        if (!room) {
          throw new Error('Habitación no encontrada');
        }
        
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
          hostWhatsapp: establishment.contactInfo.whatsapp,
          hostName: establishment.host.name 
        };
        
        this.currentBookingSubject.next(initialBooking);
        this.initializeProgress();
        
        console.log('✅ Booking initialized (UNIFIED) successfully for room:', room.name);
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

  // ================================
  // 🚀 SUBMIT BOOKING
  // ================================

  submitBooking(): Observable<Booking> {
    const currentBooking = this.currentBookingSubject.value;
    if (!currentBooking) {
      return throwError('No hay una reserva para enviar');
    }
    
    console.log('🚀 Submitting booking (UNIFIED)...', currentBooking);
    
    return this.validateCurrentBooking().pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return throwError('La reserva contiene errores: ' + validation.errors.map((e: any) => e.message).join(', '));
        }
        
        return this.createBookingViaAPI(currentBooking as BookingRequest);
      })
    );
  }

  private createBookingViaAPI(bookingRequest: BookingRequest): Observable<Booking> {
    console.log('📤 Creating booking via API (UNIFIED):', bookingRequest);

    const apiPayload = {
      roomId: this.mapFrontendIdToBackend(bookingRequest.propertyId),
      checkInDate: bookingRequest.checkInDate,
      checkOutDate: bookingRequest.checkOutDate,
      guests: {
        adults: bookingRequest.guests.adults,
        children: bookingRequest.guests.children,
        infants: bookingRequest.guests.infants,
        total: bookingRequest.guests.total
      },
      guestInfo: {
        firstName: bookingRequest.guestInfo.firstName,
        lastName: bookingRequest.guestInfo.lastName,
        email: bookingRequest.guestInfo.email,
        phone: bookingRequest.guestInfo.phone,
        documentType: bookingRequest.guestInfo.documentType || 'cedula',
        documentNumber: bookingRequest.guestInfo.documentNumber || '12345678'
      },
      specialRequests: bookingRequest.specialRequests || null,
      estimatedArrivalTime: bookingRequest.estimatedArrivalTime || null,
      purposeOfStay: bookingRequest.purposeOfStay,
      isFirstTimeInArmenia: bookingRequest.isFirstTimeInArmenia
    };

    console.log('📤 API Payload (UNIFIED):', apiPayload);

    // Test de conectividad + crear reserva
    return this.http.get(`http://localhost:3001/health`).pipe(
      switchMap(() => {
        console.log('✅ Backend is reachable, creating booking...');
        return this.http.post<any>(this.BOOKINGS_ENDPOINT, apiPayload);
      }),
      map(response => {
        console.log('✅ Booking API response (UNIFIED):', response);
        
        if (response.status === 'success' && response.data) {
          const apiBooking = response.data.booking;
          const whatsappMessage = response.data.whatsappMessage;

          const frontendBooking: Booking = {
            id: apiBooking.id.toString(),
            bookingReference: apiBooking.bookingReference,
            status: apiBooking.status as BookingStatus,
            paymentStatus: apiBooking.paymentStatus,
            
            propertyId: this.mapBackendIdToFrontend(apiBooking.room.id),
            propertyTitle: apiBooking.room.name,
            propertyImage: '',
            propertyAddress: '',
            propertyZone: '',
            
            checkInDate: apiBooking.checkInDate,
            checkOutDate: apiBooking.checkOutDate,
            nights: apiBooking.nights,
            
            guests: apiBooking.guests,
            guestInfo: apiBooking.guestInfo,
            
            priceBreakdown: {
              pricePerNight: parseFloat(apiBooking.priceBreakdown.basePrice),
              nights: apiBooking.priceBreakdown.nights,
              subtotal: apiBooking.priceBreakdown.subtotal,
              iva: apiBooking.priceBreakdown.iva,
              total: apiBooking.priceBreakdown.total,
              totalCOP: apiBooking.priceBreakdown.total
            },
            
            hostName: apiBooking.host_name || bookingRequest.hostName,
            hostWhatsapp: apiBooking.host_whatsapp || bookingRequest.hostWhatsapp,
            
            whatsappMessageSent: false,
            
            specialRequests: apiBooking.specialRequests,
            estimatedArrivalTime: apiBooking.estimatedArrivalTime,
            purposeOfStay: apiBooking.purposeOfStay,
            
            createdAt: apiBooking.createdAt,
            updatedAt: apiBooking.updatedAt,
            confirmedAt: apiBooking.confirmedAt,
            
            cancellationPolicy: 'flexible',
            minimumStay: 1
          };

          (frontendBooking as any).whatsappUrl = whatsappMessage.url;
          (frontendBooking as any).whatsappMessage = whatsappMessage.message;

          this.addBooking(frontendBooking);
          
          console.log('✅ Booking created (UNIFIED):', frontendBooking.bookingReference);
          console.log('📱 WhatsApp URL ready:', whatsappMessage.url);
          
          return frontendBooking;
        }
        
        throw new Error('Respuesta del API inválida');
      }),
      catchError(error => {
        console.error('❌ Error creating booking (UNIFIED):', error);
        
        if (error.status === 0) {
          return throwError('No se puede conectar al servidor. ¿Está el backend funcionando?');
        }
        
        if (error.status === 409) {
          return throwError('Las fechas seleccionadas no están disponibles');
        }
        
        if (error.error && error.error.message) {
          return throwError(error.error.message);
        }
        
        return throwError(`Error del servidor (${error.status}): ${error.statusText || 'Error desconocido'}`);
      })
    );
  }

  // ================================
  // 📱 INTEGRACIÓN WHATSAPP
  // ================================

  sendWhatsAppMessage(booking: Booking): Observable<WhatsAppMessage> {
    if ((booking as any).whatsappMessage && (booking as any).whatsappUrl) {
      const message: WhatsAppMessage = {
        bookingId: booking.id,
        hostWhatsapp: booking.hostWhatsapp,
        messageText: (booking as any).whatsappMessage,
        messageType: 'new-booking',
        isSent: false,
        whatsappUrl: (booking as any).whatsappUrl
      };
      
      return of(message);
    }
    
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

    return of(message).pipe(delay(100));
  }

  openWhatsApp(booking: Booking): void {
    console.log('📱 Opening WhatsApp (UNIFIED) for booking:', booking.bookingReference);
    
    let whatsappUrl: string;
    
    if ((booking as any).whatsappUrl) {
      whatsappUrl = (booking as any).whatsappUrl;
    } else {
      const template = BOOKING_CONSTANTS.WHATSAPP_TEMPLATES['new-booking'];
      const messageText = this.populateWhatsAppTemplate(template, booking);
      whatsappUrl = this.generateWhatsAppUrl(booking.hostWhatsapp, messageText);
    }
    
    console.log('📱 Opening WhatsApp URL:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
    
    this.updateBookingWhatsAppStatus(booking.id, true);
  }

  // ================================
  // 🔄 MÉTODOS DE CONVERSIÓN API
  // ================================

  private convertApiAvailabilityToDayAvailability(apiData: any[]): DayAvailability[] {
  console.log('🔄 Converting API availability data:', apiData.length, 'days');
  console.log('📊 API raw sample:', apiData.slice(0, 3));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];
  
  console.log('📅 Today for comparison:', todayString);
  console.log('📅 Today as Date object:', today);
  
  return apiData.map((day, index) => {
    const dayDateString = day.date;
    
    const dayDate = new Date(dayDateString);
    dayDate.setHours(0, 0, 0, 0);

    const isPastDate = dayDate.getTime() < today.getTime();
    const backendAvailable = day.is_available === true;
    const backendBlocked = day.is_blocked === true;
    const backendBooked = day.is_booked === true;
    const isAvailable = backendAvailable && !backendBlocked && !backendBooked && !isPastDate;

    if (index < 10 || day.is_available === true) {
      console.log(`📅 Day ${dayDateString} (${index}):`, {
        raw_backend_data: day,
        dayDate_timestamp: dayDate.getTime(),
        today_timestamp: today.getTime(),
        isPastDate_calculation: `${dayDate.getTime()} < ${today.getTime()} = ${isPastDate}`,
        backend_available: backendAvailable,
        backend_blocked: backendBlocked,
        backend_booked: backendBooked,
        isPastDate: isPastDate,
        FINAL_isAvailable: isAvailable
      });
    }
    
    const result = {
      date: dayDateString,
      dayOfWeek: dayDate.getDay() as any,
      dayNumber: dayDate.getDate(),
      isAvailable: isAvailable,
      isBlocked: backendBlocked,
      isBooked: backendBooked,
      isPastDate: isPastDate,
      isToday: dayDateString === todayString,
      minimumStay: day.minimum_stay_override || 1,
      hasSpecialPrice: !!day.price_override,
      checkInAllowed: true,
      checkOutAllowed: true
    };
    
    return result;
  });
}

 private convertApiCalendarToCalendarMonth(apiCalendar: any): CalendarMonth {
  console.log('🔄 Converting API calendar to CalendarMonth:', apiCalendar);
  
  const convertedDays = this.convertApiAvailabilityToDayAvailability(apiCalendar.days);
  const totalDays = convertedDays.length;
  const availableDays = convertedDays.filter(d => d.isAvailable).length;
  const bookedDays = convertedDays.filter(d => d.isBooked).length;
  const blockedDays = convertedDays.filter(d => d.isBlocked).length;
  
  console.log('📊 Calendar month conversion stats:');
  console.log('  - Backend reported available:', apiCalendar.stats?.available_days || 'unknown');
  console.log('  - Frontend calculated available:', availableDays);
  console.log('  - Backend reported booked:', apiCalendar.stats?.booked_days || 'unknown');
  console.log('  - Frontend calculated booked:', bookedDays);
  
  if (availableDays === 0 && (apiCalendar.stats?.available_days || 0) > 0) {
    console.error('🚨 CONVERSION PROBLEM: Backend has available days but frontend shows 0!');
    console.log('🔍 Sample converted days:', convertedDays.slice(0, 5));
  }
  
  const month = (apiCalendar.month - 1) as any; 
  
  return {
    year: apiCalendar.year,
    month: month,
    monthName: CALENDAR_CONSTANTS.MONTH_NAMES[month],
    monthNameShort: CALENDAR_CONSTANTS.MONTH_NAMES_SHORT[month],
    days: convertedDays,
    totalDays: totalDays,
    previousMonthDays: [],
    nextMonthDays: [],
    availableDays: availableDays,
    bookedDays: bookedDays,
    blockedDays: blockedDays,
    isCurrentMonth: this.isCurrentMonth(apiCalendar.year, month),
    isPastMonth: this.isPastMonth(apiCalendar.year, month),
    isFutureMonth: this.isFutureMonth(apiCalendar.year, month)
  };
}

  // ================================
  // 🔄 MÉTODOS FALLBACK (MOCK)
  // ================================

  private generateMockAvailability(roomId: string, startDate: DateString, endDate: DateString): Observable<DayAvailability[]> {
  console.log('🔄 Generating mock availability for', roomId, 'from', startDate, 'to', endDate);
  
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(this.formatDate(date));
  }

  const availability = dates.map(dateString => {
    const dateObj = new Date(dateString + 'T12:00:00');
    
    // ✅ FIX: Comparación simple de strings
    const isPastDate = dateString < todayString;
    
    // ✅ FIX: Más días disponibles para testing
    const isBlocked = false;
    const isBooked = Math.random() < 0.1; // Solo 10% ocupados
    const isAvailable = !isBlocked && !isBooked && !isPastDate;
    
    return {
      date: dateString,
      dayOfWeek: dateObj.getDay() as any,
      dayNumber: dateObj.getDate(),
      isAvailable,
      isBlocked,
      isBooked,
      isPastDate,
      isToday: dateString === todayString,
      minimumStay: 1,
      hasSpecialPrice: false,
      checkInAllowed: true,
      checkOutAllowed: true
    };
  });
  
  const availableCount = availability.filter(d => d.isAvailable).length;
  console.log('✅ Generated mock availability:', availableCount, 'available days out of', availability.length);
  
  if (availableCount === 0) {
    console.warn('⚠️ NO AVAILABLE DAYS IN MOCK! All days are past?');
    console.log('📅 Today string:', todayString);
    console.log('📅 Date range:', startDate, 'to', endDate);
  }
  
  return of(availability).pipe(delay(100));
}

  private generateMockCalendarMonth(roomId: string, year: number, month: number): Observable<CalendarMonth> {
  console.log('🔄 Generating mock calendar for', roomId, year, month);
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = this.formatDate(firstDay);
  const endDate = this.formatDate(lastDay);
  
  console.log('📅 Mock calendar date range:', startDate, 'to', endDate);
  
  return this.generateMockAvailability(roomId, startDate, endDate).pipe(
    map(days => {
      const availableDays = days.filter(d => d.isAvailable).length;
      
      console.log('📊 Mock calendar generated:');
      console.log('  - Total days:', days.length);
      console.log('  - Available days:', availableDays);
      
      return {
        year,
        month: month as any,
        monthName: CALENDAR_CONSTANTS.MONTH_NAMES[month],
        monthNameShort: CALENDAR_CONSTANTS.MONTH_NAMES_SHORT[month],
        days,
        totalDays: days.length,
        previousMonthDays: [],
        nextMonthDays: [],
        availableDays,
        bookedDays: days.filter(d => d.isBooked).length,
        blockedDays: days.filter(d => d.isBlocked).length,
        isCurrentMonth: this.isCurrentMonth(year, month),
        isPastMonth: this.isPastMonth(year, month),
        isFutureMonth: this.isFutureMonth(year, month)
      };
    })
  );
}

  // ================================
  // 🆔 MAPEO DE IDs
  // ================================

  private mapFrontendIdToBackend(frontendId: string): string {
    // room-2 → 2
    if (frontendId.startsWith('room-')) {
      return frontendId.replace('room-', '');
    }
    return frontendId;
  }

  private mapBackendIdToFrontend(backendId: number | string): string {
    // 2 → room-2
    return `room-${backendId}`;
  }

  private mapFieldType(field: string): 'checkIn' | 'checkOut' | 'range' {
    switch (field?.toLowerCase()) {
      case 'checkin':
      case 'check_in':
      case 'check-in':
      case 'checkindate':
        return 'checkIn';
      case 'checkout':
      case 'check_out':
      case 'check-out':
      case 'checkoutdate':
        return 'checkOut';
      default:
        return 'range';
    }
  }

  // ================================
  // 🔧 MÉTODOS AUXILIARES
  // ================================

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
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate();
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
    let cleanPhone = phone.replace(/\D/g, '');
    
    if (!cleanPhone.startsWith('57')) {
      cleanPhone = '57' + cleanPhone;
    }
    
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

  // ================================
  // 🧹 MÉTODOS PÚBLICOS
  // ================================

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

  resetBookingProgress(): void {
    this.initializeProgress();
  }
}