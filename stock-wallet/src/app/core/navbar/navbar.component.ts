import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslationService, Language } from '../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AuthService, AuthUser } from '../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <header class="navbar">
      <div class="container navbar-inner">
        <a routerLink="/portfolio" class="navbar-brand" (click)="mobileMenuOpen = false">
          <div class="brand-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17L8 12L12 16L17 9L21 13" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="21" cy="13" r="2" fill="#0ea5e9"/>
            </svg>
          </div>
          <span class="brand-name">Stock<span class="brand-accent">Vault</span></span>
        </a>

        <nav class="navbar-nav">
          <a routerLink="/portfolio" routerLinkActive="active" class="nav-link">
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="13" width="6" height="9" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="9" y="8" width="6" height="14" rx="1.5" fill="currentColor"/><rect x="16" y="3" width="6" height="19" rx="1.5" fill="currentColor" opacity="0.7"/></svg>
            <span>{{ 'nav.wallet' | translate }}</span>
          </a>
          <a routerLink="/market" routerLinkActive="active" class="nav-link">
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span>{{ 'nav.market' | translate }}</span>
          </a>
          <a routerLink="/compare" routerLinkActive="active" class="nav-link">
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M16 18V6M8 18V12M12 18v-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3 12h18" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" stroke-linecap="round"/></svg>
            <span>{{ 'nav.compare' | translate }}</span>
          </a>
          <a routerLink="/watchlist" routerLinkActive="active" class="nav-link">
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>
            <span>{{ 'nav.watchlist' | translate }}</span>
          </a>
          <a routerLink="/transactions" routerLinkActive="active" class="nav-link">
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2"/><path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            <span>{{ 'nav.history' | translate }}</span>
          </a>
          <a routerLink="/journal" routerLinkActive="active" class="nav-link">
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>{{ 'nav.journal' | translate }}</span>
          </a>
        </nav>

        <div class="navbar-right">
          <div class="live-clock">{{ clock }}</div>
          <div class="market-status" [class.open]="marketOpen">
            <span class="status-dot"></span>
            <span class="status-text">{{ marketOpen ? ('nav.market_open' | translate) : ('nav.market_closed' | translate) }}</span>
          </div>

          <!-- Language Selector -->
          <div class="lang-segment">
            <button class="lang-tab" [class.active]="currentLang === 'en'" (click)="selectLanguage('en')" title="English">🇺🇸</button>
            <button class="lang-tab" [class.active]="currentLang === 'pt'" (click)="selectLanguage('pt')" title="Português">🇵🇹</button>
            <button class="lang-tab" [class.active]="currentLang === 'es'" (click)="selectLanguage('es')" title="Español">🇪🇸</button>
          </div>

          <!-- Theme Toggle -->
          <button class="theme-toggle" (click)="toggleTheme()" [title]="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
            <span class="theme-icon" *ngIf="isDark">☀️</span>
            <span class="theme-icon" *ngIf="!isDark">🌙</span>
          </button>

          <!-- Auth Status Buttons / User Menu -->
          <ng-container *ngIf="authService.currentUser$ | async as user; else loggedOutTemplate">
            <div class="user-menu-wrapper" (click)="toggleUserDropdown($event)">
              <div class="user-pill">
                <div class="user-avatar">{{ getInitials(user.name) }}</div>
                <span class="user-name">{{ user.name }}</span>
                <span class="user-badge">PRO</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </div>

              <!-- Dropdown Menu -->
              <div class="user-dropdown" *ngIf="userDropdownOpen" (click)="$event.stopPropagation()">
                <div class="dropdown-header">
                  <div class="dropdown-name">{{ user.name }}</div>
                  <div class="dropdown-email">{{ user.email }}</div>
                  <div class="dropdown-balance">Buying Power: <span class="balance-val">\${{ user.cashBalance | number:'1.2-2' }}</span></div>
                </div>
                <div class="dropdown-divider"></div>
                <a routerLink="/portfolio" class="dropdown-item" (click)="userDropdownOpen = false">
                  <span>📊 Portfolio Overview</span>
                </a>
                <a routerLink="/journal" class="dropdown-item" (click)="userDropdownOpen = false">
                  <span>📓 Trading Journal</span>
                </a>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item logout-action" (click)="logout()">
                  <span>🚪 Sign Out</span>
                </button>
              </div>
            </div>
          </ng-container>

          <ng-template #loggedOutTemplate>
            <div class="auth-btn-group">
              <button class="auth-nav-btn signin-btn" (click)="openLogin()">Sign In</button>
              <button class="auth-nav-btn register-btn" (click)="openRegister()">Get Started</button>
            </div>
          </ng-template>

          <!-- Hamburger (mobile only) -->
          <button class="hamburger" (click)="mobileMenuOpen = !mobileMenuOpen" [class.open]="mobileMenuOpen" aria-label="Toggle menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      <!-- Mobile slide-down menu -->
      <div class="mobile-menu" [class.open]="mobileMenuOpen" (click)="mobileMenuOpen = false">
        <a routerLink="/portfolio" routerLinkActive="active" class="mobile-nav-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="13" width="6" height="9" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="9" y="8" width="6" height="14" rx="1.5" fill="currentColor"/><rect x="16" y="3" width="6" height="19" rx="1.5" fill="currentColor" opacity="0.7"/></svg>
          {{ 'nav.wallet' | translate }}
        </a>
        <a routerLink="/market" routerLinkActive="active" class="mobile-nav-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          {{ 'nav.market' | translate }}
        </a>
        <a routerLink="/compare" routerLinkActive="active" class="mobile-nav-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16 18V6M8 18V12M12 18v-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3 12h18" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" stroke-linecap="round"/></svg>
          {{ 'nav.compare' | translate }}
        </a>
        <a routerLink="/watchlist" routerLinkActive="active" class="mobile-nav-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>
          {{ 'nav.watchlist' | translate }}
        </a>
        <a routerLink="/transactions" routerLinkActive="active" class="mobile-nav-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2"/><path d="M9 12h6M9 16h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          {{ 'nav.history' | translate }}
        </a>
        <a routerLink="/journal" routerLinkActive="active" class="mobile-nav-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {{ 'nav.journal' | translate }}
        </a>

        <div style="padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 8px;">
          <ng-container *ngIf="authService.currentUser$ | async as user; else mobileLoggedOut">
            <div style="font-size: 13px; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">{{ user.name }} (PRO)</div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">{{ user.email }}</div>
            <button (click)="logout()" style="background: rgba(244,63,94,0.15); border: 1px solid rgba(244,63,94,0.3); color: #f43f5e; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; width: 100%;">Sign Out</button>
          </ng-container>
          <ng-template #mobileLoggedOut>
            <div style="display: flex; gap: 8px;">
              <button (click)="openLogin()" style="flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: #fff; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">Sign In</button>
              <button (click)="openRegister()" style="flex: 1; background: #0ea5e9; border: none; color: #000; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">Get Started</button>
            </div>
          </ng-template>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .navbar {
      background: rgba(9, 10, 15, 0.92);
      border-bottom: 1px solid rgba(255,255,255,0.07);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
    }
    .navbar-inner {
      display: flex;
      align-items: center;
      height: 60px;
      gap: 20px;
    }
    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      flex-shrink: 0;
    }
    .brand-logo {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(14, 165, 233, 0.05));
      border: 1px solid rgba(14, 165, 233, 0.35);
      display: grid;
      place-items: center;
      box-shadow: 0 0 16px rgba(14, 165, 233, 0.15);
    }
    .brand-name {
      font-size: 18px;
      font-weight: 800;
      color: var(--text-primary, #f8fafc);
      letter-spacing: -0.4px;
    }
    .brand-accent {
      color: #38bdf8;
    }
    .navbar-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 12px;
      border-radius: 8px;
      color: var(--text-secondary, #94a3b8);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .nav-link:hover {
      color: var(--text-primary, #f8fafc);
      background: rgba(255,255,255,0.04);
    }
    .nav-link.active {
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.1);
      font-weight: 600;
    }
    .nav-icon {
      flex-shrink: 0;
      opacity: 0.8;
    }
    .nav-link.active .nav-icon {
      opacity: 1;
    }
    .navbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
    }
    .live-clock {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: var(--text-secondary, #94a3b8);
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      padding: 4px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .market-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary, #94a3b8);
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      padding: 4px 9px;
      border-radius: 6px;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #f43f5e;
      box-shadow: 0 0 6px rgba(244, 63, 94, 0.4);
    }
    .market-status.open .status-dot {
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
    }
    .market-status.open .status-text {
      color: #10b981;
    }
    .lang-segment {
      display: flex;
      align-items: center;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 6px;
      padding: 2px;
      gap: 1px;
    }
    .lang-tab {
      background: transparent;
      border: none;
      padding: 2px 5px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      line-height: 1;
      opacity: 0.45;
      transition: all 0.15s ease;
    }
    .lang-tab:hover {
      opacity: 0.8;
    }
    .lang-tab.active {
      opacity: 1;
      background: rgba(255,255,255,0.1);
    }
    .theme-toggle {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-secondary, #94a3b8);
      display: grid;
      place-items: center;
      transition: all 0.15s ease;
    }
    .theme-toggle:hover {
      background: rgba(255,255,255,0.07);
      color: var(--text-primary, #f8fafc);
    }

    /* Auth Buttons */
    .auth-btn-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .auth-nav-btn {
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .signin-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }
    .signin-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .register-btn {
      background: #0ea5e9;
      border: none;
      color: #030712;
      font-weight: 700;
    }
    .register-btn:hover {
      background: #38bdf8;
      box-shadow: 0 0 12px rgba(14, 165, 233, 0.35);
    }

    /* User Menu Dropdown */
    .user-menu-wrapper {
      position: relative;
      cursor: pointer;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 4px 10px 4px 4px;
      border-radius: 999px;
      transition: all 0.2s;
    }
    .user-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(14, 165, 233, 0.4);
    }
    .user-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #10b981);
      color: #030712;
      font-weight: 800;
      font-size: 11px;
      display: grid;
      place-items: center;
    }
    .user-name {
      font-size: 12.5px;
      font-weight: 600;
      color: #f1f5f9;
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .user-badge {
      font-size: 9px;
      font-weight: 800;
      color: #38bdf8;
      background: rgba(14, 165, 233, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .user-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 220px;
      background: #0f121a;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      box-shadow: 0 16px 36px rgba(0,0,0,0.6);
      padding: 8px;
      z-index: 1000;
      animation: fadeIn 0.15s ease-out;
    }
    .dropdown-header {
      padding: 8px 10px;
    }
    .dropdown-name {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
    }
    .dropdown-email {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .dropdown-balance {
      font-size: 11px;
      color: #94a3b8;
    }
    .balance-val {
      font-weight: 700;
      color: #10b981;
      font-family: 'JetBrains Mono', monospace;
    }
    .dropdown-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: 6px 0;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 8px 10px;
      font-size: 12.5px;
      color: #cbd5e1;
      text-decoration: none;
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
    }
    .dropdown-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #38bdf8;
    }
    .logout-action {
      color: #f43f5e;
    }
    .logout-action:hover {
      background: rgba(244, 63, 94, 0.1);
      color: #fb7185;
    }

    .hamburger {
      display: none;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      width: 32px;
      height: 32px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 6px;
      cursor: pointer;
      padding: 6px;
    }
    .hamburger span {
      display: block;
      height: 2px;
      background: var(--text-secondary, #94a3b8);
      border-radius: 2px;
      transition: all 0.2s ease;
    }
    .mobile-menu {
      display: none;
    }

    @media (max-width: 900px) {
      .navbar-nav {
        display: none;
      }
      .hamburger {
        display: flex;
      }
      .mobile-menu {
        display: flex;
        flex-direction: column;
        background: #090a0f;
        border-top: 1px solid rgba(255,255,255,0.07);
        padding: 8px 0;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }
      .mobile-menu.open {
        max-height: 480px;
      }
      .mobile-nav-link {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        color: var(--text-secondary, #94a3b8);
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
      }
      .mobile-nav-link.active {
        color: #38bdf8;
        background: rgba(14, 165, 233, 0.08);
      }
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  clock = '';
  marketOpen = false;
  isDark = true;
  currentLang: Language = 'en';
  mobileMenuOpen = false;
  userDropdownOpen = false;
  private clockInterval?: any;

  constructor(
    private translationService: TranslationService,
    public authService: AuthService
  ) {}

  @HostListener('document:click')
  onDocumentClick(): void {
    this.userDropdownOpen = false;
  }

  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    
    // Restore saved theme preference
    const savedTheme = localStorage.getItem('sv-theme');
    this.isDark = savedTheme !== 'light';
    this.applyTheme();

    // Subscribe to language switches
    this.translationService.lang$.subscribe(lang => {
      this.currentLang = lang;
    });
  }

  ngOnDestroy(): void {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('sv-theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  selectLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
  }

  toggleUserDropdown(e: MouseEvent): void {
    e.stopPropagation();
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  openLogin(): void {
    this.authService.openAuthModal('login', 'Sign in to access your portfolio, execute trades, and manage watchlists.');
  }

  openRegister(): void {
    this.authService.openAuthModal('register', 'Create an institutional paper trading account with $50,000 buying power.');
  }

  logout(): void {
    this.userDropdownOpen = false;
    this.authService.logout();
  }

  getInitials(name: string): string {
    if (!name) return 'SV';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private applyTheme(): void {
    document.body.classList.toggle('theme-light', !this.isDark);
  }

  private updateClock(): void {
    const now = new Date();
    this.clock = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const day = now.getUTCDay();
    const totalMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    this.marketOpen = day >= 1 && day <= 5 && totalMin >= 870 && totalMin < 1260;
  }
}
