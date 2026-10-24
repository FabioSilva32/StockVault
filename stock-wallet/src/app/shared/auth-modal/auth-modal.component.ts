import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthModalState } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-overlay" *ngIf="state.open" (click)="closeOnBackdrop($event)">
      <div class="auth-dialog glass" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="auth-header">
          <div class="auth-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>StockVault Institutional ID</span>
          </div>
          <button class="auth-close-btn" (click)="close()" aria-label="Close modal">✕</button>
        </div>

        <!-- Dynamic Context Alert -->
        <div class="auth-context-banner" *ngIf="state.reason">
          <div class="banner-icon">🔒</div>
          <div class="banner-text">
            <strong>Action Restricted in Guest Mode</strong>
            <p>{{ state.reason }}</p>
          </div>
        </div>

        <!-- Mode Tabs -->
        <div class="auth-tabs">
          <button 
            class="auth-tab" 
            [class.active]="state.tab === 'login'" 
            (click)="setTab('login')">
            Sign In
          </button>
          <button 
            class="auth-tab" 
            [class.active]="state.tab === 'register'" 
            (click)="setTab('register')">
            Create Account
          </button>
        </div>

        <!-- Error Message -->
        <div class="auth-error-msg" *ngIf="errorMessage">
          <span>⚠️</span> {{ errorMessage }}
        </div>

        <!-- Quick 1-Click Demo Account -->
        <div class="demo-access-box">
          <div class="demo-info">
            <span class="demo-tag">PRO DEMO ACCESS</span>
            <span class="demo-desc">Instant $75,000 paper trading account</span>
          </div>
          <button class="demo-btn" (click)="onQuickDemo()" [disabled]="loading">
            <span *ngIf="!loading">Launch Demo Account ⚡</span>
            <span *ngIf="loading">Authenticating...</span>
          </button>
        </div>

        <div class="divider">
          <span>or continue with email</span>
        </div>

        <!-- Form: Sign In -->
        <form *ngIf="state.tab === 'login'" (ngSubmit)="onLogin()" class="auth-form">
          <div class="form-group">
            <label for="login-email">Email Address</label>
            <input 
              id="login-email" 
              type="email" 
              [(ngModel)]="email" 
              name="email" 
              placeholder="name@domain.com" 
              required 
              autocomplete="email">
          </div>
          <div class="form-group">
            <div class="label-row">
              <label for="login-pass">Password</label>
            </div>
            <input 
              id="login-pass" 
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              placeholder="••••••••" 
              required 
              autocomplete="current-password">
          </div>
          <button type="submit" class="submit-btn" [disabled]="loading || !email || !password">
            <span *ngIf="!loading">Sign In to Terminal →</span>
            <span *ngIf="loading">Signing in...</span>
          </button>
        </form>

        <!-- Form: Register -->
        <form *ngIf="state.tab === 'register'" (ngSubmit)="onRegister()" class="auth-form">
          <div class="form-group">
            <label for="reg-name">Full Name</label>
            <input 
              id="reg-name" 
              type="text" 
              [(ngModel)]="name" 
              name="name" 
              placeholder="Trader Name" 
              required>
          </div>
          <div class="form-group">
            <label for="reg-email">Work / Personal Email</label>
            <input 
              id="reg-email" 
              type="email" 
              [(ngModel)]="email" 
              name="email" 
              placeholder="trader@domain.com" 
              required>
          </div>
          <div class="form-group">
            <label for="reg-pass">Create Password (min 6 characters)</label>
            <input 
              id="reg-pass" 
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              placeholder="••••••••" 
              required>
          </div>
          <button type="submit" class="submit-btn" [disabled]="loading || !name || !email || !password">
            <span *ngIf="!loading">Create Free Trader Account →</span>
            <span *ngIf="loading">Creating account...</span>
          </button>
        </form>

        <!-- Guest Dismissal -->
        <div class="auth-footer">
          <button class="guest-dismiss-btn" (click)="close()">
            Continue exploring in Guest Mode ↗
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .auth-overlay {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.78);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    .auth-dialog {
      width: 100%;
      max-width: 440px;
      background: #0d111a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7), 0 0 40px rgba(14, 165, 233, 0.08);
      color: #f8fafc;
    }
    .auth-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .auth-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.1);
      border: 1px solid rgba(14, 165, 233, 0.25);
      padding: 4px 10px;
      border-radius: 999px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .auth-close-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .auth-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .auth-context-banner {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      background: rgba(14, 165, 233, 0.06);
      border: 1px solid rgba(14, 165, 233, 0.18);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 20px;
    }
    .banner-icon {
      font-size: 18px;
      line-height: 1.2;
    }
    .banner-text strong {
      display: block;
      font-size: 13px;
      color: #7dd3fc;
      margin-bottom: 2px;
    }
    .banner-text p {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.4;
    }
    .auth-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      background: rgba(255, 255, 255, 0.03);
      padding: 4px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .auth-tab {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .auth-tab.active {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    .auth-error-msg {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.25);
      color: #fb7185;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .demo-access-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%);
      border: 1px solid rgba(14, 165, 233, 0.28);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 18px;
    }
    .demo-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .demo-tag {
      font-size: 10px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.06em;
    }
    .demo-desc {
      font-size: 12px;
      color: #cbd5e1;
    }
    .demo-btn {
      background: #0ea5e9;
      color: #030712;
      border: none;
      font-weight: 700;
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .demo-btn:hover:not(:disabled) {
      background: #38bdf8;
      transform: translateY(-1px);
    }
    .divider {
      position: relative;
      text-align: center;
      margin: 18px 0;
    }
    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
    }
    .divider span {
      position: relative;
      background: #0d111a;
      padding: 0 12px;
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
    }
    .form-group input {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 10px 12px;
      color: #fff;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-group input:focus {
      border-color: #0ea5e9;
      background: rgba(14, 165, 233, 0.02);
    }
    .submit-btn {
      margin-top: 6px;
      background: #0ea5e9;
      color: #030712;
      border: none;
      font-weight: 700;
      font-size: 13px;
      padding: 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .submit-btn:hover:not(:disabled) {
      background: #38bdf8;
      box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
    }
    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .auth-footer {
      margin-top: 18px;
      text-align: center;
    }
    .guest-dismiss-btn {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 12px;
      cursor: pointer;
      transition: color 0.2s;
    }
    .guest-dismiss-btn:hover {
      color: #94a3b8;
      text-decoration: underline;
    }
  `]
})
export class AuthModalComponent implements OnInit, OnDestroy {
  state: AuthModalState = { open: false, tab: 'login' };
  email = '';
  password = '';
  name = '';
  loading = false;
  errorMessage = '';

  private sub?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.sub = this.authService.authModalState$.subscribe(s => {
      this.state = s;
      this.errorMessage = '';
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  setTab(tab: 'login' | 'register'): void {
    this.state.tab = tab;
    this.errorMessage = '';
  }

  close(): void {
    this.authService.closeAuthModal();
  }

  closeOnBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) {
      this.close();
    }
  }

  onLogin(): void {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.close();
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Invalid credentials. Please verify your email and password.';
      }
    });
  }

  onRegister(): void {
    if (!this.name || !this.email || !this.password) return;
    this.loading = true;
    this.errorMessage = '';

    this.authService.register(this.name, this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.close();
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.error || 'Failed to create account. Please try again.';
      }
    });
  }

  onQuickDemo(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.loginDemo().subscribe({
      next: () => {
        this.loading = false;
        this.close();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Could not start demo session.';
      }
    });
  }
}
