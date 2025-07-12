// ================================
// 📁 src/app/admin/pages/admin-rooms/admin-rooms.component.ts
// 🛏️ GESTIÓN DE HABITACIONES
// ================================

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-rooms',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>🛏️ Gestión de Habitaciones</h1>
        <p>Administra todas las habitaciones del establecimiento</p>
      </div>
      
      <div class="page-content">
        <div class="development-notice">
          <h3>🔧 En Desarrollo</h3>
          <p>Sistema CRUD completo de habitaciones con gestión avanzada de precios.</p>
          <p>Funcionalidades incluidas:</p>
          <ul>
            <li>➕ Crear nuevas habitaciones</li>
            <li>✏️ Editar habitaciones existentes</li>
            <li>🗑️ Eliminar habitaciones</li>
            <li>💰 Sistema de precios inteligente</li>
            <li>📷 Gestión de imágenes por habitación</li>
            <li>🎯 Configuración de amenities</li>
            <li>📅 Control de disponibilidad</li>
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
      background: #e8f5e8;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      border: 1px solid #c8e6c9;
    }

    .development-notice h3 {
      color: #2e7d32;
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
export class AdminRoomsComponent {
  constructor() {
    console.log('🛏️ AdminRoomsComponent initialized');
  }
}