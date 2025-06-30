// 📁 src/app/pages/booking/booking-confirmation/booking-confirmation.component.ts
// 🔄 MIGRADO: Property Booking Confirmation → Room Booking Confirmation + Establishment

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// ✅ NUEVOS IMPORTS - Room + Establishment
import { Room, ROOM_TYPE_LABELS } from '../../../core/models/room.interface';
import { Establishment } from '../../../core/models/establishment.interface';
import { RoomService } from '../../../core/services/room.service';
import { EstablishmentService } from '../../../core/services/establishment.service';

// ✅ MANTENER - Booking interfaces
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/booking.interface';

@Component({
  selector: 'app-booking-confirmation',
  template: `
    <!-- 📁 booking-confirmation.component.html -->
    <!-- 🔄 MIGRADO: Property Confirmation → Room Confirmation + Establishment -->
    
    <div class="confirmation-page" *ngIf="!isLoading">
      
      <!-- ================================ -->
      <!-- ✅ HEADER DE CONFIRMACIÓN -->
      <!-- ================================ -->
      
      <header class="confirmation-header">
        <div class="container">
          <div class="success-message d-flex flex-column align-center gap-4">
            <div class="success-icon">✅</div>
            <div class="success-content">
              <h1 class="success-title">¡Reserva Confirmada!</h1>
              <p class="success-subtitle">Tu reserva ha sido procesada exitosamente</p>
              <div class="booking-reference">
                <strong>Referencia: {{ booking?.bookingReference }}</strong>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- ================================ -->
      <!-- 📋 DETALLES DE LA RESERVA -->
      <!-- ================================ -->
      
      <main class="confirmation-main">
        <div class="container">
          <div class="confirmation-layout">
            
            <!-- Información principal -->
            <div class="confirmation-content d-flex flex-column gap-8">
              
              <!-- Detalles de la habitación y establecimiento -->
              <section class="detail-section" *ngIf="booking && room && establishment">
                <h2>Detalles de tu habitación</h2>
                <div class="room-card">
                  <img [src]="room.images.main" [alt]="room.name" class="room-image">
                  <div class="room-info">
                    <h3>{{ room.name }}</h3>
                    <p class="room-type">{{ getRoomTypeLabel(room.roomType) }}</p>
                    <p class="establishment-info">🏨 {{ establishment.name }}</p>
                    <p class="location">📍 {{ establishment.areaInfo.neighborhood }}</p>
                    <div class="room-features">
                      <span>{{ room.roomNumber }}</span>
                      <span>{{ room.maxGuests }} huéspedes</span>
                      <span>{{ room.bathroomType === 'privado' ? 'Baño privado' : 'Baño compartido' }}</span>
                    </div>
                  </div>
                </div>
              </section>
              
              <!-- Fechas y duración -->
              <section class="detail-section" *ngIf="booking && establishment">
                <h2>Fechas de tu estancia</h2>
                <div class="dates-info">
                  <div class="date-item">
                    <div class="date-label">Llegada</div>
                    <div class="date-value" *ngIf="booking.checkInDate">{{ formatDate(booking.checkInDate) }}</div>
                    <div class="date-time">Check-in: {{ establishment.policies.checkInTime }}</div>
                  </div>
                  <div class="nights-separator">
                    <span class="nights-count" *ngIf="booking.nights">{{ booking.nights }} noches</span>
                  </div>
                  <div class="date-item">
                    <div class="date-label">Salida</div>
                    <div class="date-value" *ngIf="booking.checkOutDate">{{ formatDate(booking.checkOutDate) }}</div>
                    <div class="date-time">Check-out: {{ establishment.policies.checkOutTime }}</div>
                  </div>
                </div>
              </section>
              
              <!-- Información del huésped -->
              <section class="detail-section" *ngIf="booking">
                <h2>Información del huésped</h2>
                <div class="guest-info">
                  <div class="guest-detail">
                    <strong>{{ booking.guestInfo.firstName }} {{ booking.guestInfo.lastName }}</strong>
                  </div>
                  <div class="guest-detail">
                    📧 {{ booking.guestInfo.email }}
                  </div>
                  <div class="guest-detail">
                    📱 {{ booking.guestInfo.phone }}
                  </div>
                  <div class="guest-detail">
                    👥 {{ booking.guests.total }} huéspedes 
                    ({{ booking.guests.adults }} adultos<span *ngIf="booking.guests.children">, {{ booking.guests.children }} niños</span><span *ngIf="booking.guests.infants">, {{ booking.guests.infants }} bebés</span>)
                  </div>
                </div>
              </section>
              
              <!-- Solicitudes especiales -->
              <section class="detail-section" *ngIf="booking?.specialRequests">
                <h2>Solicitudes especiales</h2>
                <div class="special-requests">
                  <p>{{ booking?.specialRequests || '' }}</p>
                </div>
              </section>
              
            </div>

            <!-- Sidebar con acciones -->
            <aside class="confirmation-sidebar">
              
              <!-- Resumen de precio -->
              <div class="price-summary card" *ngIf="booking">
                <h3>Resumen de pago</h3>
                <div class="price-breakdown">
                  <div class="price-row">
                    <span>{{ formatPrice(booking.priceBreakdown.pricePerNight || 0) }} × {{ booking.priceBreakdown.nights || 0 }} noches</span>
                    <span>{{ formatPrice(booking.priceBreakdown.subtotal || 0) }}</span>
                  </div>
                  
                  <div class="price-row discount" *ngIf="booking.priceBreakdown.weeklyDiscount">
                    <span>Descuento semanal</span>
                    <span>-{{ formatPrice(booking.priceBreakdown.weeklyDiscount.amount || 0) }}</span>
                  </div>
                  
                  <div class="price-row discount" *ngIf="booking.priceBreakdown.monthlyDiscount">
                    <span>Descuento mensual</span>
                    <span>-{{ formatPrice(booking.priceBreakdown.monthlyDiscount.amount || 0) }}</span>
                  </div>
                  
                  <div class="price-row" *ngIf="booking.priceBreakdown.cleaningFee">
                    <span>Tarifa de limpieza</span>
                    <span>{{ formatPrice(booking.priceBreakdown.cleaningFee || 0) }}</span>
                  </div>
                  
                  <div class="price-row" *ngIf="booking.priceBreakdown.serviceFee">
                    <span>Tarifa de servicio</span>
                    <span>{{ formatPrice(booking.priceBreakdown.serviceFee || 0) }}</span>
                  </div>
                  
                  <div class="price-row">
                    <span>IVA ({{ booking.priceBreakdown.iva.percentage || 0 }}%)</span>
                    <span>{{ formatPrice(booking.priceBreakdown.iva.amount || 0) }}</span>
                  </div>
                  
                  <div class="price-total">
                    <span>Total pagado</span>
                    <span>{{ formatPrice(booking.priceBreakdown.total || 0) }}</span>
                  </div>
                </div>
              </div>
              
              <!-- Información del anfitrión -->
              <div class="host-contact card" *ngIf="booking && establishment">
                <h3>Contacta a tu anfitrión</h3>
                <div class="host-info">
                  <img [src]="establishment.host.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'" 
                       [alt]="establishment.host.name" 
                       class="host-avatar">
                  <div class="host-details">
                    <strong>{{ establishment.host.name }}</strong>
                    <span>{{ getResponseTimeLabel(establishment.host.responseTime) }}</span>
                  </div>
                </div>
                
                <button 
                  class="btn btn-primary btn-full"
                  (click)="contactHost()">
                  <i class="icon-whatsapp"></i>
                  Enviar mensaje
                </button>
                
                <p class="contact-note">
                  Tu anfitrión recibirá tus datos de contacto automáticamente
                </p>
              </div>
              
              <!-- Próximos pasos -->
              <div class="next-steps card">
                <h3>Próximos pasos</h3>
                <ul class="steps-list">
                  <li>✅ Reserva confirmada</li>
                  <li>📧 Correo de confirmación enviado</li>
                  <li>📱 Tu anfitrión te contactará pronto</li>
                  <li>🏠 ¡Disfruta tu estancia!</li>
                </ul>
              </div>
              
            </aside>

          </div>
        </div>
      </main>

      <!-- ================================ -->
      <!-- 🎮 ACCIONES PRINCIPALES -->
      <!-- ================================ -->
      
      <footer class="confirmation-actions">
        <div class="container">
          <div class="actions-grid">
            
            <button 
              class="btn btn-outline"
              (click)="goHome()">
              🏠 Volver al inicio
            </button>
            
            <button 
              class="btn btn-outline"
              (click)="viewRoom()"
              *ngIf="room">
              👁️ Ver habitación
            </button>
            
            <button 
              class="btn btn-primary"
              (click)="downloadConfirmation()">
              📄 Descargar confirmación
            </button>
            
            <button 
              class="btn btn-secondary"
              (click)="shareBooking()">
              📤 Compartir
            </button>
            
          </div>
        </div>
      </footer>

    </div>

    <!-- Loading state -->
    <div class="loading-container" *ngIf="isLoading">
      <div class="loading-spinner"></div>
      <p>Cargando detalles de tu reserva...</p>
    </div>

    <!-- Error state -->
    <div class="error-container" *ngIf="error">
      <div class="error-content">
        <h2>❌ Error al cargar la reserva</h2>
        <p>{{ error }}</p>
        <button class="btn btn-primary" (click)="goHome()">
          Volver al inicio
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./booking-confirmation.component.scss']
})
export class BookingConfirmationComponent implements OnInit, OnDestroy {
  
  booking: Booking | null = null;
  room: Room | null = null;              
  establishment: Establishment | null = null;
  
  isLoading = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private roomService: RoomService,
    private establishmentService: EstablishmentService 
  ) {}

  ngOnInit(): void {
    this.loadBookingDetails();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBookingDetails(): void {
    const bookingId = this.route.snapshot.paramMap.get('bookingId');
    
    if (!bookingId) {
      this.error = 'ID de reserva no válido';
      this.isLoading = false;
      return;
    }

    this.bookingService.getBookingById(bookingId).pipe(
      takeUntil(this.destroy$),
      switchMap(booking => {
        if (!booking) {
          throw new Error('Reserva no encontrada');
        }
        
        this.booking = booking;
        
        // ✅ NOTA: Usando propertyId temporalmente hasta actualizar interface Booking
        // En el futuro se puede cambiar a roomId cuando se actualice la interface
        return combineLatest([
          this.roomService.getRoomById(booking.propertyId),       // ✅ USAR: propertyId (mantener interface existente)
          this.establishmentService.getEstablishmentInfo()
        ]);
      }),
      catchError(error => {
        this.error = error.message || 'Error al cargar la reserva';
        this.isLoading = false;
        return of([null, null]);
      })
    ).subscribe(([room, establishment]) => {
      if (room && establishment) {
        this.room = room;   
        this.establishment = establishment; 
      }
      this.isLoading = false;
    });
  }

  contactHost(): void {
    if (this.booking) {
      this.bookingService.openWhatsApp(this.booking);
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  viewRoom(): void {
    if (this.room) {
      this.router.navigate(['/rooms', this.room.id]);
    }
  }

  downloadConfirmation(): void {
    if (!this.booking) return;
    

    const confirmationText = this.generateConfirmationText();
    
    const blob = new Blob([confirmationText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Confirmacion-${this.booking.bookingReference}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  shareBooking(): void {
    if (!this.booking) return;
    
    const shareData = {
      title: 'Mi reserva en Norte Armenia',
      text: `¡Reservé ${this.room?.name} del ${this.formatDate(this.booking.checkInDate)} al ${this.formatDate(this.booking.checkOutDate)}!`, // ✅ CAMBIO: room.name en lugar de property.title
      url: window.location.href
    };

    if (navigator.share && navigator.canShare(shareData)) {
      navigator.share(shareData);
    } else {

      const shareText = `${shareData.text}\n${shareData.url}`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('¡Enlace copiado al portapapeles!');
      });
    }
  }

  private generateConfirmationText(): string {
    if (!this.booking || !this.room || !this.establishment) return '';
    
    return `
🏠 CONFIRMACIÓN DE RESERVA - NORTE ARMENIA
========================================

Referencia: ${this.booking.bookingReference}
Estado: ${this.booking.status.toUpperCase()}

ESTABLECIMIENTO:
${this.establishment.name}
${this.establishment.areaInfo.neighborhood}

HABITACIÓN:
${this.room.name}
${this.room.roomNumber}
Tipo: ${this.getRoomTypeLabel(this.room.roomType)}
Capacidad: ${this.room.maxGuests} huéspedes

FECHAS:
Llegada: ${this.formatDate(this.booking.checkInDate)} (${this.establishment.policies.checkInTime})
Salida: ${this.formatDate(this.booking.checkOutDate)} (${this.establishment.policies.checkOutTime})
Noches: ${this.booking.nights}

HUÉSPEDES:
Huésped principal: ${this.booking.guestInfo.firstName} ${this.booking.guestInfo.lastName}
Email: ${this.booking.guestInfo.email}
Teléfono: ${this.booking.guestInfo.phone}
Total huéspedes: ${this.booking.guests.total}

ANFITRIÓN:
${this.establishment.host.name}
WhatsApp: ${this.establishment.contactInfo.whatsapp}

PRECIO:
Total pagado: ${this.formatPrice(this.booking.priceBreakdown.total)}

¡Gracias por elegir Norte Armenia!
Fecha de reserva: ${new Date(this.booking.createdAt).toLocaleDateString('es-CO')}
    `.trim();
  }

  // ================================
  // 🛠️ UTILIDADES
  // ================================

  getRoomTypeLabel(roomType: string): string {
    return ROOM_TYPE_LABELS[roomType as keyof typeof ROOM_TYPE_LABELS] || roomType;
  }

  getResponseTimeLabel(responseTime: string): string {
    const times = {
      'inmediata': 'Respuesta inmediata',
      'en horas': 'Responde en pocas horas', 
      'en 1 día': 'Responde en 1 día'
    };
    return times[responseTime as keyof typeof times] || responseTime;
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
      return `${amount.toLocaleString()}`;
    }
  }
}