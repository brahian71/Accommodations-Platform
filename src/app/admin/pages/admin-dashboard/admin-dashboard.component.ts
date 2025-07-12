// ================================
// 📁 src/app/admin/pages/admin-dashboard/admin-dashboard.component.ts
// 🏠 DASHBOARD PRINCIPAL ADMIN
// ================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminUser } from '../../services/admin-data.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <!-- 🎨 HEADER -->
      <div class="dashboard-header">
        <h1 class="dashboard-title">🎯 Dashboard Admin</h1>
        <div class="user-info" *ngIf="currentUser">
          <span class="welcome-text">Bienvenido, <strong>{{ currentUser.username }}</strong></span>
          <span class="user-role" [class]="'role-' + currentUser.role">{{ getRoleLabel(currentUser.role) }}</span>
          <button class="logout-btn" (click)="logout()">🚪 Cerrar Sesión</button>
        </div>
      </div>

      <!-- 📊 CONTENIDO PRINCIPAL -->
      <div class="dashboard-content">
        <div class="welcome-section">
          <h2>¡Bienvenido al panel de administración de Hostal Norte Armenia!</h2>
          <p>Gestiona tu establecimiento de manera eficiente desde este panel de control.</p>
        </div>

        <!-- 🔗 ENLACES RÁPIDOS -->
        <div class="quick-links">
          <h3>🚀 Acciones Rápidas:</h3>
          <div class="links-grid">
            <a routerLink="/admin/establishment" class="quick-link establishment">
              <span class="link-icon">🏨</span>
              <span class="link-title">Gestionar Establecimiento</span>
              <span class="link-desc">Editar información, contacto y políticas</span>
            </a>
            
            <a routerLink="/admin/rooms" class="quick-link rooms">
              <span class="link-icon">🛏️</span>
              <span class="link-title">Gestionar Habitaciones</span>
              <span class="link-desc">Administrar habitaciones y precios</span>
            </a>
            
            <div class="quick-link disabled">
              <span class="link-icon">📅</span>
              <span class="link-title">Calendario de Reservas</span>
              <span class="link-desc">Próximamente disponible</span>
            </div>
            
            <div class="quick-link disabled">
              <span class="link-icon">📊</span>
              <span class="link-title">Estadísticas</span>
              <span class="link-desc">Reportes y métricas</span>
            </div>
          </div>
        </div>

        <!-- 📋 FUNCIONALIDADES PRÓXIMAS -->
        <div class="future-features">
          <h3>🔧 Próximas Funcionalidades:</h3>
          <div class="features-list">
            <div class="feature-item">📊 Estadísticas en tiempo real</div>
            <div class="feature-item">💰 Sistema de precios avanzado</div>
            <div class="feature-item">📅 Calendario de reservas interactivo</div>
            <div class="feature-item">📧 Sistema de notificaciones</div>
            <div class="feature-item">📱 App móvil complementaria</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      min-height: 100vh;
      background: #f8fafc;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .dashboard-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .welcome-text {
      font-size: 1.1rem;
    }

    .user-role {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-owner { background: #fbbf24; color: #92400e; }
    .role-manager { background: #34d399; color: #065f46; }
    .role-staff { background: #60a5fa; color: #1e3a8a; }

    .logout-btn {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .logout-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .dashboard-content {
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-section {
      text-align: center;
      margin-bottom: 50px;
    }

    .welcome-section h2 {
      color: #374151;
      font-size: 1.8rem;
      margin-bottom: 10px;
    }

    .welcome-section p {
      color: #6b7280;
      font-size: 1.1rem;
    }

    .quick-links h3, .future-features h3 {
      color: #374151;
      font-size: 1.5rem;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 50px;
    }

    .quick-link {
      background: white;
      padding: 30px 25px;
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border: 2px solid transparent;
    }

    .quick-link:not(.disabled):hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      border-color: #667eea;
    }

    .quick-link.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .link-icon {
      font-size: 3rem;
      margin-bottom: 15px;
      display: block;
    }

    .link-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      display: block;
    }

    .link-desc {
      font-size: 0.9rem;
      color: #6b7280;
      line-height: 1.4;
    }

    .quick-link.establishment:hover .link-icon { transform: scale(1.1); }
    .quick-link.rooms:hover .link-icon { transform: scale(1.1); }

    .future-features {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    }

    .features-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }

    .feature-item {
      background: #f1f5f9;
      padding: 15px 20px;
      border-radius: 8px;
      color: #475569;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }

      .dashboard-title {
        font-size: 2rem;
      }

      .dashboard-content {
        padding: 20px;
      }

      .links-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  
  currentUser: AdminUser | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private adminAuthService: AdminAuthService
  ) {
    console.log('🏠 AdminDashboardComponent initialized');
  }

  ngOnInit(): void {
    // Obtener información del usuario actual
    this.adminAuthService.getCurrentUser().pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser = user;
      console.log('👤 Current admin user:', user?.username);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    console.log('🚪 AdminDashboardComponent: Logout requested');
    this.adminAuthService.logout().subscribe(() => {
      console.log('✅ Logout completed');
    });
  }

  getRoleLabel(role: string): string {
    const labels = {
      'owner': 'Propietario',
      'manager': 'Administrador', 
      'staff': 'Personal'
    };
    return labels[role as keyof typeof labels] || role;
  }
}