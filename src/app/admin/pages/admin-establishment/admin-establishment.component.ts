// ================================
// 📁 src/app/admin/pages/admin-establishment/admin-establishment.component.ts
// 🏨 GESTIÓN DE ESTABLECIMIENTO
// ================================

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-establishment',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>🏨 Gestión de Establecimiento</h1>
        <p>Administra la información de tu establecimiento</p>
      </div>
      
      <div class="page-content">
        <div class="development-notice">
          <h3>🔧 En Desarrollo</h3>
          <p>Este módulo estará disponible en la siguiente fase de desarrollo.</p>
          <p>Incluirá:</p>
          <ul>
            <li>✏️ Edición de información básica</li>
            <li>📞 Gestión de datos de contacto</li>
            <li>🏠 Administración de amenities</li>
            <li>📋 Configuración de políticas</li>
            <li>📷 Gestión de imágenes</li>
          </ul>
        </div>
        
        <a routerLink="/admin/dashboard" class="back-btn">
          ← Volver al Dashboard
        </a>
      </div>
    </div>
  `,
  styles: [`
    .admin-page {
      min-height: 100vh;
      background: #f8fafc;
      padding: 40px;
    }

    .page-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .page-header h1 {
      color: #667eea;
      font-size: 2.5rem;
      margin-bottom: 10px;
    }

    .page-header p {
      color: #666;
      font-size: 1.1rem;
    }

    .page-content {
      max-width: 600px;
      margin: 0 auto;
    }

    .development-notice {
      background: #e3f2fd;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      border: 1px solid #bbdefb;
    }

    .development-notice h3 {
      color: #1976d2;
      margin-bottom: 15px;
    }

    .development-notice ul {
      color: #555;
      margin: 15px 0;
    }

    .back-btn {
      background: #6b7280;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      display: inline-block;
      transition: background 0.2s ease;
    }

    .back-btn:hover {
      background: #4b5563;
    }
  `]
})
export class AdminEstablishmentComponent {
  constructor() {
    console.log('🏨 AdminEstablishmentComponent initialized');
  }
}