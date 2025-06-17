// 📁 src/app/pages/booking/booking-confirmation/booking-confirmation.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { BookingService } from '../../../core/services/booking.service';
import { PropertyService } from '../../../core/services/property.service';
import { Booking } from '../../../core/models/booking.interface';
import { Property } from '../../../core/models/property.interface';

@Component({
  selector: 'app-booking-confirmation',
  template: `
    <!-- 📁 booking-confirmation.component.html -->
    
    <div class="confirmation-page" *ngIf="!isLoading">
      
      <!-- ================================ -->
      <!-- ✅ HEADER DE CONFIRMACIÓN -->
      <!-- ================================ -->
      
      <header class="confirmation-header">
        <div class="container">
          <div class="success-message">
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
            <div class="confirmation-content">
              
              <!-- Detalles de la propiedad -->
              <section class="detail-section" *ngIf="booking && property">
                <h2>Detalles de tu alojamiento</h2>
                <div class="property-card">
                  <img [src]="property.image" [alt]="property.title" class="property-image">
                  <div class="property-info">
                    <h3>{{ property.title }}</h3>
                    <p class="location">📍 {{ property.location }}</p>
                    <div class="property-features">
                      <span>{{ property.bedrooms }} hab</span>
                      <span>{{ property.bathrooms }} baños</span>
                      <span>{{ property.maxGuests }} huéspedes</span>
                    </div>
                  </div>
                </div>
              </section>
              
              <!-- Fechas y duración -->
              <section class="detail-section" *ngIf="booking">
                <h2>Fechas de tu estancia</h2>
                <div class="dates-info">
                  <div class="date-item">
                    <div class="date-label">Llegada</div>
                    <div class="date-value" *ngIf="booking.checkInDate">{{ formatDate(booking.checkInDate) }}</div>
                    <div class="date-time">Check-in: {{ property?.checkInTime || '15:00' }}</div>
                  </div>
                  <div class="nights-separator">
                    <span class="nights-count" *ngIf="booking.nights">{{ booking.nights }} noches</span>
                  </div>
                  <div class="date-item">
                    <div class="date-label">Salida</div>
                    <div class="date-value" *ngIf="booking.checkOutDate">{{ formatDate(booking.checkOutDate) }}</div>
                    <div class="date-time">Check-out: {{ property?.checkOutTime || '11:00' }}</div>
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
              <div class="host-contact card" *ngIf="booking && property">
                <h3>Contacta a tu anfitrión</h3>
                <div class="host-info">
                  <img [src]="property.hostPhoto" [alt]="booking.hostName" class="host-avatar">
                  <div class="host-details">
                    <strong>{{ booking.hostName }}</strong>
                    <span>{{ property.responseTime || 'Respuesta rápida' }}</span>
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
              (click)="viewProperty()"
              *ngIf="property">
              👁️ Ver propiedad
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
  property: Property | null = null;
  
  isLoading = true;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private propertyService: PropertyService
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
        
        // Cargar información de la propiedad
        return this.propertyService.getPropertyById(booking.propertyId);
      }),
      catchError(error => {
        this.error = error.message || 'Error al cargar la reserva';
        this.isLoading = false;
        return of(null);
      })
    ).subscribe(property => {
      if (property) {
        this.property = property;
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

  viewProperty(): void {
    if (this.property) {
      this.router.navigate(['/property', this.property.id]);
    }
  }

  downloadConfirmation(): void {
    if (!this.booking) return;
    
    // Crear contenido de confirmación
    const confirmationText = this.generateConfirmationText();
    
    // Crear y descargar archivo
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
      text: `¡Reservé ${this.property?.title} del ${this.formatDate(this.booking.checkInDate)} al ${this.formatDate(this.booking.checkOutDate)}!`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare(shareData)) {
      navigator.share(shareData);
    } else {
      // Fallback: copiar al portapapeles
      const shareText = `${shareData.text}\n${shareData.url}`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('¡Enlace copiado al portapapeles!');
      });
    }
  }

  private generateConfirmationText(): string {
    if (!this.booking || !this.property) return '';
    
    return `
🏠 CONFIRMACIÓN DE RESERVA - NORTE ARMENIA
========================================

Referencia: ${this.booking.bookingReference}
Estado: ${this.booking.status.toUpperCase()}

PROPIEDAD:
${this.property.title}
${this.property.location}

FECHAS:
Llegada: ${this.formatDate(this.booking.checkInDate)} (${this.property.checkInTime || '15:00'})
Salida: ${this.formatDate(this.booking.checkOutDate)} (${this.property.checkOutTime || '11:00'})
Noches: ${this.booking.nights}

HUÉSPEDES:
Huésped principal: ${this.booking.guestInfo.firstName} ${this.booking.guestInfo.lastName}
Email: ${this.booking.guestInfo.email}
Teléfono: ${this.booking.guestInfo.phone}
Total huéspedes: ${this.booking.guests.total}

ANFITRIÓN:
${this.booking.hostName}
WhatsApp: ${this.booking.hostWhatsapp}

PRECIO:
Total pagado: ${this.formatPrice(this.booking.priceBreakdown.total)}

¡Gracias por elegir Norte Armenia!
Fecha de reserva: ${new Date(this.booking.createdAt).toLocaleDateString('es-CO')}
    `.trim();
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
      return date; // Fallback al string original
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