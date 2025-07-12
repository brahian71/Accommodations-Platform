// 📁 src/app/admin/admin.module.ts

import { NgModule } from '@angular/core';
import { AdminRoutingModule } from './admin-routing.module';

// ✅ Servicios globales del módulo admin
import { AdminDataService } from './services/admin-data.service';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@NgModule({
  imports: [
    AdminRoutingModule
  ],
  providers: [
    AdminDataService,
    AdminAuthService,
    AdminAuthGuard
  ]
})
export class AdminModule {
  constructor() {
    console.log('🏗️ AdminModule loaded successfully');
    console.log('🔐 Admin authentication system ready');
  }
}