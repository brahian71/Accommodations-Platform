// ================================
// 📁 src/app/admin/pages/admin-login/admin-login.component.ts
// 🔐 COMPONENTE DE LOGIN ADMIN
// ================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AdminAuthService, LoginResult } from '../../services/admin-auth.service';
import { environment } from '../../../../environments/environment';




@Component({
  selector: 'app-admin-login',
  standalone: true, 
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  template: `
    <div class="admin-login-container">
      <!-- 🎨 HEADER -->
      <div class="login-header">
        <div class="logo-section">
          <h1 class="logo-title">Hostal Norte Armenia</h1>
          <p class="logo-subtitle">Panel de Administración</p>
        </div>
      </div>

      <!-- 📋 FORMULARIO DE LOGIN -->
      <div class="login-form-container">
        <div class="login-card">
          <div class="card-header">
            <h2>Iniciar Sesión</h2>
            <p>Accede al panel de administración</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
            <!-- ❌ MENSAJES DE ERROR -->
            <div *ngIf="errorMessage" class="error-alert">
              <span class="error-icon">⚠️</span>
              <span class="error-text">{{ errorMessage }}</span>
            </div>

            <!-- 👤 CAMPO USUARIO -->
            <div class="form-group">
              <label for="username" class="form-label">
                <span class="label-icon">👤</span>
                Usuario
              </label>
              <input
                id="username"
                type="text"
                formControlName="username"
                placeholder="Ingresa tu usuario"
                class="form-input"
                [class.error]="usernameControl?.invalid && usernameControl?.touched"
                autocomplete="username"
              />
              <div *ngIf="usernameControl?.invalid && usernameControl?.touched" class="field-error">
                Usuario es requerido
              </div>
            </div>

            <!-- 🔒 CAMPO CONTRASEÑA -->
            <div class="form-group">
              <label for="password" class="form-label">
                <span class="label-icon">🔒</span>
                Contraseña
              </label>
              <div class="password-input-container">
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="Ingresa tu contraseña"
                  class="form-input"
                  [class.error]="passwordControl?.invalid && passwordControl?.touched"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="password-toggle"
                  (click)="togglePasswordVisibility()"
                >
                  <span>{{ showPassword ? '👁️‍🗨️' : '👁️' }}</span>
                </button>
              </div>
              <div *ngIf="passwordControl?.invalid && passwordControl?.touched" class="field-error">
                Contraseña es requerida
              </div>
            </div>

            <!-- 💾 RECORDAR SESIÓN -->
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  formControlName="rememberMe"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">Recordar sesión</span>
              </label>
            </div>

            <!-- 🚀 BOTÓN DE SUBMIT -->
            <button
              type="submit"
              class="login-button"
              [disabled]="!isFormValid || isLoading"
              [class.loading]="isLoading"
            >
              <span *ngIf="!isLoading" class="button-text">
                <span class="button-icon">🔑</span>
                Ingresar al Panel
              </span>
              <span *ngIf="isLoading" class="button-loading">
                <span class="spinner"></span>
                Validando credenciales...
              </span>
            </button>
          </form>

          <!-- 🔗 ENLACES ADICIONALES -->
          <div class="login-footer">
            <a href="#" class="forgot-password" (click)="onForgotPassword($event)">
              ¿Olvidaste tu contraseña?
            </a>
            <div class="divider"></div>
            <a [routerLink]="['/']" class="back-to-site">
              ← Volver al sitio web
            </a>
          </div>
        </div>

        <!-- 📋 INFORMACIÓN DE ACCESO (Solo en desarrollo) -->
        <div *ngIf="showDemoCredentials" class="demo-credentials">
          <h4>🧪 Credenciales de Demo</h4>
          <p><strong>Usuario:</strong> admin</p>
          <p><strong>Contraseña:</strong> admin123</p>
          <small>Solo visible en modo desarrollo</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-login-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .login-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo-title {
      color: white;
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    .logo-subtitle {
      color: rgba(255,255,255,0.9);
      font-size: 1.1rem;
      margin: 5px 0 0 0;
      font-weight: 300;
    }

    .login-form-container {
      width: 100%;
      max-width: 400px;
    }

    .login-card {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }

    .card-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .card-header h2 {
      color: #333;
      font-size: 1.8rem;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .card-header p {
      color: #666;
      margin: 0;
      font-size: 0.95rem;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .error-alert {
      background: #fee2e2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #374151;
      font-weight: 500;
      font-size: 0.9rem;
    }

    .form-input {
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.2s ease;
      background: #f9fafb;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      background: white;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-input.error {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .password-input-container {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .password-toggle:hover {
      background: #f3f4f6;
    }

    .field-error {
      color: #ef4444;
      font-size: 0.8rem;
      margin-top: 4px;
    }

    .checkbox-group {
      flex-direction: row;
      align-items: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }

    .checkbox-input {
      display: none;
    }

    .checkbox-custom {
      width: 18px;
      height: 18px;
      border: 2px solid #d1d5db;
      border-radius: 4px;
      position: relative;
      transition: all 0.2s ease;
    }

    .checkbox-input:checked + .checkbox-custom {
      background: #667eea;
      border-color: #667eea;
    }

    .checkbox-input:checked + .checkbox-custom::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 12px;
      font-weight: bold;
    }

    .checkbox-text {
      color: #374151;
      font-size: 0.9rem;
    }

    .login-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .login-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .login-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .login-button.loading {
      background: #9ca3af;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .login-footer {
      margin-top: 30px;
      text-align: center;
    }

    .forgot-password {
      color: #667eea;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .forgot-password:hover {
      text-decoration: underline;
    }

    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 20px 0;
    }

    .back-to-site {
      color: #6b7280;
      text-decoration: none;
      font-size: 0.9rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .back-to-site:hover {
      color: #374151;
    }

    .demo-credentials {
      margin-top: 20px;
      background: rgba(255,255,255,0.9);
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.3);
    }

    .demo-credentials h4 {
      margin: 0 0 10px 0;
      color: #374151;
      font-size: 0.9rem;
    }

    .demo-credentials p {
      margin: 4px 0;
      color: #4b5563;
      font-size: 0.85rem;
    }

    .demo-credentials small {
      color: #9ca3af;
      font-size: 0.75rem;
    }

    @media (max-width: 480px) {
      .admin-login-container {
        padding: 15px;
      }
      
      .login-card {
        padding: 30px 20px;
      }
      
      .logo-title {
        font-size: 2rem;
      }
    }
  `]
})
export class AdminLoginComponent implements OnInit, OnDestroy {
  
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  showPassword = false;
  showDemoCredentials = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private adminAuthService: AdminAuthService,
    private router: Router
  ) {
    console.log('🔐 AdminLoginComponent initialized');
    
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    console.log('🔄 AdminLoginComponent: Component initialized');
    
    // Verificar si ya está autenticado
    this.adminAuthService.isAuthenticated().pipe(
      takeUntil(this.destroy$)
    ).subscribe(isAuthenticated => {
      if (isAuthenticated) {
        console.log('✅ User already authenticated, redirecting...');
        this.redirectToAdminPanel();
      }
    });

    // Mostrar credenciales demo en desarrollo
    this.showDemoCredentials = !environment.production;
    
    // Cargar credenciales si están guardadas
    this.loadSavedCredentials();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const credentials = {
      username: this.loginForm.get('username')?.value,
      password: this.loginForm.get('password')?.value
    };

    console.log('🔐 AdminLoginComponent: Attempting login for user:', credentials.username);

    this.adminAuthService.login(credentials).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result: LoginResult) => {
        this.isLoading = false;
        
        if (result.success) {
          console.log('✅ AdminLoginComponent: Login successful');
          
          // Guardar credenciales si está marcado
          if (this.loginForm.get('rememberMe')?.value) {
            this.saveCredentials(credentials.username);
          } else {
            this.clearSavedCredentials();
          }
          
          // Redireccionar
          this.redirectAfterLogin(result.redirectUrl);
        } else {
          console.error('❌ AdminLoginComponent: Login failed:', result.error);
          this.errorMessage = result.error || 'Error de autenticación';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('❌ AdminLoginComponent: Login error:', error);
        this.errorMessage = 'Error de conexión. Inténtalo de nuevo.';
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    console.log('🔗 AdminLoginComponent: Forgot password clicked');
    alert('Funcionalidad de recuperación de contraseña en desarrollo.\n\nContacta al administrador del sistema.');
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private redirectAfterLogin(defaultRedirectUrl?: string): void {
    const savedUrl = sessionStorage.getItem('admin_redirect_url');
    if (savedUrl) {
      sessionStorage.removeItem('admin_redirect_url');
      this.router.navigateByUrl(savedUrl);
      return;
    }

    if (defaultRedirectUrl) {
      this.router.navigateByUrl(defaultRedirectUrl);
      return;
    }

    this.redirectToAdminPanel();
  }

  private redirectToAdminPanel(): void {
    this.router.navigate(['/admin/dashboard']);
  }

  private saveCredentials(username: string): void {
    try {
      localStorage.setItem('admin_remembered_username', username);
    } catch (error) {
      console.warn('Could not save credentials:', error);
    }
  }

  private loadSavedCredentials(): void {
    try {
      const savedUsername = localStorage.getItem('admin_remembered_username');
      if (savedUsername) {
        this.loginForm.patchValue({
          username: savedUsername,
          rememberMe: true
        });
      }
    } catch (error) {
      console.warn('Could not load saved credentials:', error);
    }
  }

  private clearSavedCredentials(): void {
    try {
      localStorage.removeItem('admin_remembered_username');
    } catch (error) {
      console.warn('Could not clear saved credentials:', error);
    }
  }

  get usernameControl() {
    return this.loginForm.get('username');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  get isFormValid(): boolean {
    return this.loginForm.valid;
  }
}