import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  flash?: 'up' | 'down';
}

@Component({
  selector: 'app-ticker-tape',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ticker-wrapper" aria-label="Live Market Quotes Ticker">
      <div class="ticker-track">
        <!-- Render double for seamless infinite scroll -->
        <div class="ticker-content" *ngFor="let repeat of [1, 2]">
          <div 
            class="ticker-item" 
            *ngFor="let item of items" 
            [class.flash-up]="item.flash === 'up'"
            [class.flash-down]="item.flash === 'down'">
            
            <span class="ticker-symbol">{{ item.symbol }}</span>
            <span class="ticker-price">{{ item.symbol.includes('10Y') ? (item.price | number:'1.2-2') + '%' : (item.price | currency:'USD':'symbol':'1.2-2') }}</span>
            
            <span class="ticker-pct" [class.positive]="item.changePct >= 0" [class.negative]="item.changePct < 0">
              <span *ngIf="item.changePct >= 0">▲</span>
              <span *ngIf="item.changePct < 0">▼</span>
              {{ item.changePct >= 0 ? '+' : '' }}{{ item.changePct | number:'1.2-2' }}%
            </span>
            <span class="ticker-sep">/</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ticker-wrapper {
      width: 100%;
      height: 32px;
      background: #07080c;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      overflow: hidden;
      display: flex;
      align-items: center;
      position: relative;
      user-select: none;
      z-index: 10;
    }
    .ticker-track {
      display: flex;
      width: max-content;
      animation: marquee 45s linear infinite;
    }
    .ticker-track:hover {
      animation-play-state: paused;
    }
    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .ticker-content {
      display: flex;
      align-items: center;
      white-space: nowrap;
    }
    .ticker-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 14px;
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      color: #94a3b8;
      transition: background-color 0.4s ease;
      border-radius: 4px;
    }
    .ticker-item.flash-up {
      background: rgba(16, 185, 129, 0.18);
    }
    .ticker-item.flash-down {
      background: rgba(244, 63, 94, 0.18);
    }
    .ticker-symbol {
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: 0.02em;
    }
    .ticker-price {
      font-weight: 600;
      color: #e2e8f0;
    }
    .ticker-pct {
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font-size: 10.5px;
    }
    .ticker-pct.positive {
      color: #10b981;
    }
    .ticker-pct.negative {
      color: #f43f5e;
    }
    .ticker-sep {
      color: rgba(255, 255, 255, 0.12);
      margin-left: 8px;
    }

    /* ─── Light Mode Overrides ─── */
    :host-context(.theme-light) .ticker-wrapper,
    :host-context([data-theme="light"]) .ticker-wrapper {
      background: #f1f5f9;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    :host-context(.theme-light) .ticker-item,
    :host-context([data-theme="light"]) .ticker-item {
      color: #64748b;
    }
    :host-context(.theme-light) .ticker-symbol,
    :host-context([data-theme="light"]) .ticker-symbol {
      color: #0f172a;
    }
    :host-context(.theme-light) .ticker-price,
    :host-context([data-theme="light"]) .ticker-price {
      color: #1e293b;
    }
    :host-context(.theme-light) .ticker-sep,
    :host-context([data-theme="light"]) .ticker-sep {
      color: rgba(0, 0, 0, 0.15);
    }
  `]
})
export class TickerTapeComponent implements OnInit, OnDestroy {
  items: TickerItem[] = [
    { symbol: 'S&P 500', name: 'SPX', price: 5815.20, change: 22.10, changePct: 0.38 },
    { symbol: 'NASDAQ', name: 'NDX', price: 18518.60, change: 103.20, changePct: 0.56 },
    { symbol: 'DOW JONES', name: 'DJI', price: 42114.40, change: -92.80, changePct: -0.22 },
    { symbol: 'RUSSELL 2000', name: 'RUT', price: 2218.90, change: 17.80, changePct: 0.81 },
    { symbol: 'BTC / USD', name: 'Bitcoin', price: 68420.00, change: 1440.00, changePct: 2.15 },
    { symbol: 'ETH / USD', name: 'Ethereum', price: 2540.50, change: 35.10, changePct: 1.40 },
    { symbol: 'US 10Y', name: 'Treasury', price: 4.24, change: -0.01, changePct: -0.24 },
    { symbol: 'CRUDE OIL', name: 'WTI', price: 71.80, change: 0.65, changePct: 0.92 },
    { symbol: 'GOLD', name: 'XAU', price: 2735.60, change: 12.30, changePct: 0.45 },
    { symbol: 'NVDA', name: 'Nvidia', price: 141.54, change: 2.57, changePct: 1.85 },
    { symbol: 'AAPL', name: 'Apple', price: 231.41, change: 0.81, changePct: 0.35 }
  ];

  private tickInterval?: any;

  ngOnInit(): void {
    // Subtle live micro-ticks
    this.tickInterval = setInterval(() => {
      const idx = Math.floor(Math.random() * this.items.length);
      const item = this.items[idx];
      const delta = (Math.random() - 0.48) * (item.price * 0.001);
      item.price = Math.max(0.01, item.price + delta);
      item.changePct += (delta / item.price) * 100;
      item.flash = delta >= 0 ? 'up' : 'down';
      setTimeout(() => {
        item.flash = undefined;
      }, 700);
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
  }
}
