// ================================
// 📁 src/app/admin/pages/admin-unauthorized/admin-unauthorized.component.ts
// 🚫 PÁGINA DE ACCESO NO AUTORIZADO
// ================================

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="unauthorized-page">
      <div class="unauthorized-content">
        <h1 class="error-icon">🚫</h1>
        <h2>Acceso No Autorizado</h2>
        <p>No tienes permisos suficientes para acceder a esta página.</p>
        
        <div class="error-details">
          <p>Si crees que esto es un error, contacta al administrador del sistema.</p>
        </div>
        
        <div class="action-buttons">
          <a routerLink="/admin/dashboard" class="btn-primary">
            🏠 Ir al Dashboard
          </a>
          <a routerLink="/admin/login" class="btn-secondary">
            🔐 Iniciar Sesión
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-page {
      min-height: 100vh;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .unauthorized-content {
      text-align: center;
      max-width: 500px;
      background: white;
      padding: 60px 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    h2 {
      color: #374151;
      font-size: 2rem;
      margin-bottom: 16px;
      font-weight: 600;
    }

    p {
      color: #6b7280;
      font-size: 1.1rem;
      margin-bottom: 30px;
      line-height: 1.5;
    }

    .error-details {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 30px;
    }

    .error-details p {
      margin: 0;
      font-size: 0.9rem;
      color: inherit;
    }

    .action-buttons {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
    }

    @media (max-width: 480px) {
      .unauthorized-content {
        padding: 40px 30px;
      }

      .action-buttons {
        flex-direction: column;
        align-items: center;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class AdminUnauthorizedComponent {
  constructor() {
    console.log('🚫 AdminUnauthorizedComponent initialized');
  }
}
