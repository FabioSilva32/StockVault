import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslationService, Language } from '../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

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
              <path d="M3 17L8 12L12 16L17 9L21 13" stroke="#a5b4fc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="21" cy="13" r="2" fill="#6c63ff"/>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M16 18V6M8 18V12M12 18v-9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          {{ 'nav.compare' | translate }}
        </a>
        <a routerLink="/watchlist" routerLinkActive="active" class="mobile-nav-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>
          {{ 'nav.watchlist' | translate }}
        </a>
        <a routerLink="/transactions" routerLinkActive="active" class="mobile-nav-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          {{ 'nav.history' | translate }}
        </a>
        <a routerLink="/journal" routerLinkActive="active" class="mobile-nav-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {{ 'nav.journal' | translate }}
        </a>
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
      background: var(--nav-bg, rgba(8,12,24,0.85));
      border-bottom: 1px solid rgba(255,255,255,0.07);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
    }
    .navbar-inner {
      display: flex;
      align-items: center;
      height: 60px;
      gap: 24px;
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
      background: linear-gradient(135deg, rgba(108,99,255,0.3), rgba(108,99,255,0.1));
      border: 1px solid rgba(108,99,255,0.3);
      display: grid;
      place-items: center;
    }
    .brand-name {
      font-size: 17px;
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.03em;
    }
    .brand-accent {
      background: linear-gradient(135deg, #a5b4fc, #6c63ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .navbar-nav {
      display: flex;
      align-items: center;
      gap: 2px;
      flex: 1;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 13px;
      border-radius: 8px;
      text-decoration: none;
      color: #64748b;
      font-size: 13.5px;
      font-weight: 500;
      transition: all 0.18s ease;
      position: relative;
    }
    .nav-link:hover {
      color: #cbd5e1;
      background: rgba(255,255,255,0.04);
    }
    .nav-link.active {
      color: #a5b4fc;
      background: rgba(108,99,255,0.12);
      font-weight: 600;
    }
    .nav-icon { flex-shrink: 0; }
    .navbar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .live-clock {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 500;
      color: #475569;
      letter-spacing: 0.05em;
    }
    .market-status {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #475569;
    }
    .market-status.open .status-dot {
      background: #00d395;
      box-shadow: 0 0 8px #00d395;
      animation: pulseGreen 2s ease-in-out infinite;
    }
    .market-status.open .status-text { color: #00d395; }
    .market-status.open { border-color: rgba(0,211,149,0.2); }
    @keyframes pulseGreen {
      0%, 100% { box-shadow: 0 0 6px #00d395; }
      50% { box-shadow: 0 0 12px #00d395; }
    }

    /* Language Segmented Control */
    .lang-segment {
      display: flex;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      padding: 2px;
      gap: 1px;
    }
    .lang-tab {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lang-tab:hover {
      background: rgba(255,255,255,0.04);
      color: #cbd5e1;
    }
    .lang-tab.active {
      background: rgba(108,99,255,0.2);
      border: 1px solid rgba(108,99,255,0.3);
      color: #fff;
      box-shadow: 0 0 10px rgba(108,99,255,0.15);
    }

    /* Theme Toggle */
    .theme-toggle {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: all 0.2s ease;
      font-size: 16px;
    }
    .theme-toggle:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.2);
      transform: rotate(15deg) scale(1.08);
    }
    .theme-icon { line-height: 1; }

    /* Hamburger */
    .hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      width: 36px;
      height: 36px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      transition: all 0.2s ease;
    }
    .hamburger span {
      display: block;
      width: 16px;
      height: 1.5px;
      background: #94a3b8;
      border-radius: 2px;
      transition: all 0.25s ease;
      transform-origin: center;
    }
    .hamburger.open span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
    .hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
    .hamburger.open span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

    /* Mobile Menu */
    .mobile-menu {
      display: none;
      flex-direction: column;
      overflow: hidden;
      max-height: 0;
      transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease;
      opacity: 0;
      border-top: 1px solid rgba(255,255,255,0.05);
      background: rgba(8,12,24,0.98);
      backdrop-filter: blur(24px);
    }
    .mobile-menu.open { max-height: 500px; opacity: 1; }
    .mobile-nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 24px;
      color: #64748b;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      transition: all 0.15s ease;
    }
    .mobile-nav-link:hover, .mobile-nav-link.active {
      background: rgba(108,99,255,0.08);
      color: #a5b4fc;
    }

    @media (max-width: 900px) {
      .live-clock { display: none; }
    }
    @media (max-width: 768px) {
      .navbar-nav { display: none; }
      .hamburger { display: flex; }
      .mobile-menu { display: flex; }
      .market-status .status-text { display: none; }
      .navbar-inner { gap: 8px; }
      .lang-segment { padding: 1px; }
      .lang-tab { padding: 4px 6px; font-size: 12px; }
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  clock = '';
  marketOpen = false;
  isDark = true;
  currentLang: Language = 'en';
  mobileMenuOpen = false;
  private clockInterval?: any;

  constructor(private translationService: TranslationService) {}

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
