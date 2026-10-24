import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FinnhubService } from '../../core/services/finnhub.service';
import { KeyboardShortcutService } from '../../core/services/keyboard-shortcut.service';

interface PaletteResult {
  type: 'page' | 'ticker';
  label: string;
  sublabel?: string;
  icon: string;
  action: () => void;
}

const PAGES: PaletteResult[] = [];

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="palette-overlay" (mousedown)="close()" *ngIf="isOpen">
      <div class="palette-box" (mousedown)="$event.stopPropagation()">
        <div class="palette-search-row">
          <svg class="palette-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            #searchInput
            class="palette-input"
            type="text"
            placeholder="Search pages, stocks, tickers…"
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange($event)"
            (keydown)="onKeyDown($event)"
            autocomplete="off"
          />
          <kbd class="palette-esc" (click)="close()">ESC</kbd>
        </div>

        <div class="palette-results" *ngIf="results.length > 0 || isSearching">
          <!-- Loading -->
          <div class="palette-loading" *ngIf="isSearching">
            <div class="palette-spinner"></div>
            <span>Searching Finnhub…</span>
          </div>

          <!-- Results list -->
          <ng-container *ngIf="!isSearching">
            <div class="palette-section-label" *ngIf="pageResults.length > 0">Pages</div>
            <div
              class="palette-item"
              *ngFor="let item of pageResults; let i = index"
              [class.active]="activeIndex === i"
              (mouseenter)="activeIndex = i"
              (click)="execute(item)">
              <span class="palette-item-icon">{{ item.icon }}</span>
              <div class="palette-item-text">
                <span class="palette-item-label">{{ item.label }}</span>
                <span class="palette-item-sublabel" *ngIf="item.sublabel">{{ item.sublabel }}</span>
              </div>
              <kbd class="palette-hint">↵</kbd>
            </div>

            <div class="palette-section-label" *ngIf="tickerResults.length > 0" style="margin-top:8px">Stocks & ETFs</div>
            <div
              class="palette-item"
              *ngFor="let item of tickerResults; let i = index"
              [class.active]="activeIndex === pageResults.length + i"
              (mouseenter)="activeIndex = pageResults.length + i"
              (click)="execute(item)">
              <span class="palette-item-icon ticker-icon-chip">{{ item.icon }}</span>
              <div class="palette-item-text">
                <span class="palette-item-label">{{ item.label }}</span>
                <span class="palette-item-sublabel" *ngIf="item.sublabel">{{ item.sublabel }}</span>
              </div>
              <span class="palette-item-badge">View →</span>
            </div>
          </ng-container>
        </div>

        <!-- Empty state when query but no results -->
        <div class="palette-empty" *ngIf="!isSearching && query.length > 1 && results.length === 0">
          <span>No results for "<strong>{{ query }}</strong>"</span>
        </div>

        <!-- Default shortcuts hint -->
        <div class="palette-footer" *ngIf="!query">
          <span class="palette-hint-item"><kbd>↑↓</kbd> Navigate</span>
          <span class="palette-hint-item"><kbd>↵</kbd> Select</span>
          <span class="palette-hint-item"><kbd>ESC</kbd> Close</span>
          <span class="palette-hint-item" style="margin-left:auto"><kbd>G</kbd> Market &nbsp; <kbd>W</kbd> Wallet &nbsp; <kbd>C</kbd> Compare</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .palette-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 2000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 12vh;
      animation: paletteIn 0.18s ease;
    }
    @keyframes paletteIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .palette-box {
      width: 100%;
      max-width: 620px;
      background: rgba(13,18,37,0.97);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(108,99,255,0.12);
      overflow: hidden;
      animation: boxSlide 0.22s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes boxSlide {
      from { opacity: 0; transform: translateY(-12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .palette-search-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .palette-search-icon { color: #0ea5e9; flex-shrink: 0; }
    .palette-input {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      color: #f1f5f9;
      font-size: 16px;
      font-family: inherit;
      font-weight: 500;
    }
    .palette-input::placeholder { color: #475569; }
    .palette-esc {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 11px;
      color: #64748b;
      cursor: pointer;
      font-family: inherit;
      flex-shrink: 0;
    }
    .palette-results {
      max-height: 360px;
      overflow-y: auto;
      padding: 8px 8px;
    }
    .palette-section-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #475569;
      padding: 6px 12px 4px;
    }
    .palette-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.12s;
    }
    .palette-item.active, .palette-item:hover {
      background: rgba(108,99,255,0.12);
    }
    .palette-item-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      font-size: 14px;
      flex-shrink: 0;
    }
    .ticker-icon-chip {
      font-size: 11px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: -0.03em;
      background: rgba(14,165,233,0.1);
      border: 1px solid rgba(14,165,233,0.2);
    }
    .palette-item-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .palette-item-label { font-size: 13.5px; font-weight: 600; color: #f1f5f9; }
    .palette-item-sublabel { font-size: 11.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .palette-item-badge { font-size: 11px; color: #0ea5e9; font-weight: 700; flex-shrink: 0; }
    .palette-hint { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 2px 6px; font-size: 11px; color: #64748b; font-family: inherit; flex-shrink: 0; }
    .palette-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px;
      color: #64748b;
      font-size: 13px;
    }
    .palette-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(14,165,233,0.2);
      border-top-color: #0ea5e9;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .palette-empty {
      padding: 24px 20px;
      text-align: center;
      color: #475569;
      font-size: 13px;
    }
    .palette-empty strong { color: #94a3b8; }
    .palette-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      border-top: 1px solid rgba(255,255,255,0.05);
      background: rgba(255,255,255,0.01);
    }
    .palette-hint-item { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: #475569; }
    .palette-hint-item kbd { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 1px 5px; font-size: 10px; color: #64748b; font-family: inherit; }
  `]
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  isOpen = false;
  query = '';
  isSearching = false;
  activeIndex = 0;

  results: PaletteResult[] = [];
  pageResults: PaletteResult[] = [];
  tickerResults: PaletteResult[] = [];

  private querySubject = new Subject<string>();
  private subs = new Subscription();

  private readonly DEFAULT_PAGES: PaletteResult[] = [
    { type: 'page', label: 'My Wallet', sublabel: 'Portfolio & holdings', icon: '📊', action: () => this.router.navigate(['/portfolio']) },
    { type: 'page', label: 'Market Explorer', sublabel: 'Browse & buy stocks', icon: '🌐', action: () => this.router.navigate(['/market']) },
    { type: 'page', label: 'Compare Stocks', sublabel: 'Side-by-side fundamentals', icon: '⚖️', action: () => this.router.navigate(['/compare']) },
    { type: 'page', label: 'Watchlist', sublabel: 'Price alerts & monitored stocks', icon: '⭐', action: () => this.router.navigate(['/watchlist']) },
    { type: 'page', label: 'Transaction History', sublabel: 'All buy & sell events', icon: '🧾', action: () => this.router.navigate(['/transactions']) },
    { type: 'page', label: 'Trading Journal', sublabel: 'Notes & trade reflection', icon: '📔', action: () => this.router.navigate(['/journal']) },
  ];

  constructor(
    private router: Router,
    private finnhub: FinnhubService,
    private shortcuts: KeyboardShortcutService
  ) {}

  ngOnInit(): void {
    this.subs.add(
      this.shortcuts.openPalette$.subscribe(() => this.open())
    );

    this.subs.add(
      this.querySubject.pipe(debounceTime(280), distinctUntilChanged()).subscribe(q => this.doSearch(q))
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  open(): void {
    this.isOpen = true;
    this.query = '';
    this.results = [];
    this.pageResults = [...this.DEFAULT_PAGES];
    this.tickerResults = [];
    this.activeIndex = 0;
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
  }

  close(): void {
    this.isOpen = false;
    this.query = '';
  }

  onQueryChange(q: string): void {
    this.activeIndex = 0;
    if (!q) {
      this.pageResults = [...this.DEFAULT_PAGES];
      this.tickerResults = [];
      this.results = [...this.DEFAULT_PAGES];
      this.isSearching = false;
      return;
    }
    const lq = q.toLowerCase();
    this.pageResults = this.DEFAULT_PAGES.filter(p =>
      p.label.toLowerCase().includes(lq) || (p.sublabel || '').toLowerCase().includes(lq)
    );
    this.querySubject.next(q);
  }

  private doSearch(q: string): void {
    if (q.length < 1) { this.tickerResults = []; this.isSearching = false; return; }
    this.isSearching = true;
    this.finnhub.searchSymbol(q).subscribe({
      next: (res) => {
        this.tickerResults = (res.result || []).slice(0, 6).map(r => ({
          type: 'ticker' as const,
          label: r.displaySymbol,
          sublabel: r.description,
          icon: r.displaySymbol.slice(0, 4),
          action: () => this.router.navigate(['/stock', r.displaySymbol])
        }));
        this.results = [...this.pageResults, ...this.tickerResults];
        this.isSearching = false;
      },
      error: () => { this.isSearching = false; }
    });
  }

  onKeyDown(e: KeyboardEvent): void {
    const total = this.pageResults.length + this.tickerResults.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.activeIndex = (this.activeIndex + 1) % total; }
    if (e.key === 'ArrowUp') { e.preventDefault(); this.activeIndex = (this.activeIndex - 1 + total) % total; }
    if (e.key === 'Enter') { e.preventDefault(); this.selectActive(); }
    if (e.key === 'Escape') { this.close(); }
  }

  private selectActive(): void {
    const all = [...this.pageResults, ...this.tickerResults];
    if (all[this.activeIndex]) this.execute(all[this.activeIndex]);
  }

  execute(item: PaletteResult): void {
    item.action();
    this.close();
  }
}
