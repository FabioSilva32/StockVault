import { Injectable, OnDestroy, Injector } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { FinnhubService } from './finnhub.service';
import { FinnhubQuote } from '../models/models';
import { PortfolioApiService } from './portfolio-api.service';
import { CashService } from './cash.service';
import { NotificationService } from './notification.service';

export interface LivePriceData {
  ticker: string;
  currentPrice: number;
  priceChange: number;
  percentChange: number;
  quote: FinnhubQuote;
  lastUpdated?: number; // unix ms timestamp of last real fetch
}

@Injectable({
  providedIn: 'root'
})
export class LivePriceService implements OnDestroy {
  private streams = new Map<string, BehaviorSubject<LivePriceData | null>>();
  private activeTickers = new Set<string>();
  private lastKnownPrices = new Map<string, LivePriceData>();

  /** How often (ms) to re-poll Finnhub during market hours */
  private readonly POLL_INTERVAL_MS = 30_000; // 30 seconds
  /** Delay between individual ticker requests to avoid rate-limit bursts */
  private readonly REQUEST_STAGGER_MS = 800; // 0.8s between each ticker

  private pollInterval: any;
  private isPolling = false;

  constructor(
    private finnhub: FinnhubService,
    private portfolioApi: PortfolioApiService,
    private cashService: CashService,
    private injector: Injector
  ) {
    this.startPolling();
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  getCurrentPrice(ticker: string): number {
    const symbol = ticker.toUpperCase();
    const data = this.lastKnownPrices.get(symbol);
    if (data) return data.currentPrice;

    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`quote-cache-${symbol}`);
      if (cached) {
        const val = parseFloat(cached);
        if (!isNaN(val)) return val;
      }
    }
    return this.getFallbackPrice(symbol);
  }

  getPriceStream(ticker: string): Observable<LivePriceData | null> {
    const symbol = ticker.toUpperCase();
    if (!this.streams.has(symbol)) {
      const subject = new BehaviorSubject<LivePriceData | null>(null);
      this.streams.set(symbol, subject);
      this.activeTickers.add(symbol);
      // Fetch immediately so the UI has data right away
      this.fetchQuote(symbol);
    }
    return this.streams.get(symbol)!.asObservable();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  // ─────────────────────────────────────────────────────────────
  // Polling
  // ─────────────────────────────────────────────────────────────

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      if (this.activeTickers.size === 0) return;
      if (this.isPolling) return; // skip if previous round is still in flight

      if (this.isMarketOpen()) {
        // Market is open → fetch fresh real prices for all active tickers
        this.pollAllTickers();
      } else {
        // Market is closed → still run order-check logic against last known prices
        // (limit/stop orders could have been placed before close)
        this.activeTickers.forEach(symbol => {
          const data = this.lastKnownPrices.get(symbol);
          if (data) this.checkAndExecuteOrders(symbol, data.currentPrice);
        });
      }
    }, this.POLL_INTERVAL_MS);
  }

  /** Sequentially fetch all active tickers with a stagger to avoid rate-limit spikes */
  private async pollAllTickers(): Promise<void> {
    this.isPolling = true;
    const tickers = Array.from(this.activeTickers);
    for (const symbol of tickers) {
      await this.fetchQuote(symbol);
      await this.delay(this.REQUEST_STAGGER_MS);
    }
    this.isPolling = false;
  }

  /** Fetch a single real quote from Finnhub and push to the stream */
  private fetchQuote(symbol: string): Promise<void> {
    return new Promise(resolve => {
      this.finnhub.getQuote(symbol).subscribe({
        next: (quote) => {
          const c  = quote.c  || quote.pc || this.getCurrentPrice(symbol);
          const pc = quote.pc || c;
          const d  = quote.d  || (c - pc);
          const dp = quote.dp || (pc > 0 ? ((c - pc) / pc) * 100 : 0);

          const data: LivePriceData = {
            ticker: symbol,
            currentPrice: c,
            priceChange: d,
            percentChange: dp,
            quote: { ...quote, c, pc, d, dp },
            lastUpdated: Date.now()
          };

          this.lastKnownPrices.set(symbol, data);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`quote-cache-${symbol}`, c.toString());
          }

          const subject = this.streams.get(symbol);
          if (subject) subject.next(data);

          this.checkAndExecuteOrders(symbol, c);
          resolve();
        },
        error: () => {
          // Keep whatever we had — do NOT fabricate a new price
          const existing = this.lastKnownPrices.get(symbol);
          if (!existing) {
            // First-ever load and API failed → use cache or hardcoded fallback
            let fallbackPrice = this.getFallbackPrice(symbol);
            if (typeof localStorage !== 'undefined') {
              const cached = localStorage.getItem(`quote-cache-${symbol}`);
              if (cached) fallbackPrice = parseFloat(cached);
            }
            const data: LivePriceData = {
              ticker: symbol,
              currentPrice: fallbackPrice,
              priceChange: 0,
              percentChange: 0,
              quote: { c: fallbackPrice, pc: fallbackPrice, d: 0, dp: 0, o: fallbackPrice, h: fallbackPrice, l: fallbackPrice },
              lastUpdated: Date.now()
            };
            this.lastKnownPrices.set(symbol, data);
            const subject = this.streams.get(symbol);
            if (subject) subject.next(data);
          }
          // If we already had a price, just leave it as-is (no noise added)
          resolve();
        }
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─────────────────────────────────────────────────────────────
  // Market Hours
  // ─────────────────────────────────────────────────────────────

  /** Returns true only during NYSE regular session (Mon–Fri, 9:30–16:00 ET) */
  isMarketOpen(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMin  = now.getUTCMinutes();

    const year     = now.getUTCFullYear();
    const dstStart = this.getNthSundayOfMonth(year, 3, 2);  // 2nd Sunday of March
    const dstEnd   = this.getNthSundayOfMonth(year, 11, 1); // 1st Sunday of November
    const isDST    = now >= dstStart && now < dstEnd;
    const etOffset = isDST ? -4 : -5;

    const etTotalMinutes = utcHour * 60 + utcMin + etOffset * 60;
    const etDay = new Date(now.getTime() + etOffset * 3600 * 1000).getUTCDay();

    if (etDay === 0 || etDay === 6) return false;

    const normalized = ((etTotalMinutes % 1440) + 1440) % 1440;
    return normalized >= 570 && normalized < 960; // 9:30 – 16:00
  }

  private getNthSundayOfMonth(year: number, month: number, nth: number): Date {
    const d = new Date(Date.UTC(year, month - 1, 1));
    let count = 0;
    while (d.getUTCMonth() === month - 1) {
      if (d.getUTCDay() === 0) { count++; if (count === nth) return d; }
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return d;
  }

  // ─────────────────────────────────────────────────────────────
  // Order Execution (unchanged)
  // ─────────────────────────────────────────────────────────────

  checkAndExecuteOrders(symbol: string, currentPrice: number): void {
    if (typeof localStorage === 'undefined') return;

    const rawOrders = localStorage.getItem('active-orders');
    if (!rawOrders) return;

    try {
      const orders = JSON.parse(rawOrders);
      let updated = false;

      const pendingOrders = orders.filter((o: any) => o.ticker.toUpperCase() === symbol.toUpperCase() && o.status === 'pending');

      for (const order of pendingOrders) {
        let trigger = false;

        if (order.type === 'buy') {
          if (order.orderType === 'limit' && currentPrice <= order.targetPrice) trigger = true;
        } else {
          if (order.orderType === 'limit'       && currentPrice >= order.targetPrice) trigger = true;
          else if (order.orderType === 'stop-loss'    && currentPrice <= order.targetPrice) trigger = true;
          else if (order.orderType === 'take-profit'  && currentPrice >= order.targetPrice) trigger = true;
        }

        if (trigger) {
          order.status = 'filled';
          updated = true;
          this.executeOrder(order, currentPrice);
        }
      }

      if (updated) localStorage.setItem('active-orders', JSON.stringify(orders));
    } catch (e) {
      console.error('[LivePriceService] Failed to process active orders:', e);
    }
  }

  private executeOrder(order: any, filledPrice: number): void {
    const qty   = order.quantityType === 'cash' ? (order.quantity / filledPrice) : order.quantity;
    const total = qty * filledPrice;

    if (order.type === 'buy') {
      const balance = this.cashService.getBalance();
      if (total > balance) {
        order.status = 'failed';
        try {
          const notifications = this.injector.get(NotificationService);
          notifications.playPremiumBellChime();
          notifications.addNotification({
            id: `order-fail-${order.ticker}-${Date.now()}`,
            ticker: order.ticker, company: order.company,
            currentPrice: filledPrice, previousPrice: order.targetPrice,
            change: filledPrice - order.targetPrice, changePercent: 0,
            type: 'down', timestamp: Date.now(), isTargetAlert: true,
            message: `⚠️ Limit order failed: Insufficient buying power to buy ${qty.toFixed(4)} shares of ${order.ticker}.`
          });
        } catch (e) { console.error(e); }
        return;
      }
    }

    const payload = { ticker: order.ticker, company: order.company, quantity: qty, price: filledPrice };
    const req$ = order.type === 'buy' ? this.portfolioApi.buy(payload) : this.portfolioApi.sell(payload);

    req$.subscribe({
      next: () => {
        if (order.type === 'buy') this.cashService.deduct(total);
        else this.cashService.add(total);

        try {
          const notifications = this.injector.get(NotificationService);
          const orderTypeName = order.orderType === 'limit' ? 'Limit Order' : order.orderType === 'stop-loss' ? 'Stop Loss' : 'Take Profit';
          const actionName    = order.type === 'buy' ? 'Bought' : 'Sold';

          notifications.playPremiumBellChime();
          notifications.addNotification({
            id: `order-fill-${order.ticker}-${Date.now()}`,
            ticker: order.ticker, company: order.company,
            currentPrice: filledPrice, previousPrice: order.targetPrice,
            change: filledPrice - order.targetPrice,
            changePercent: order.targetPrice > 0 ? ((filledPrice - order.targetPrice) / order.targetPrice) * 100 : 0,
            type: order.type === 'buy' ? 'up' : 'down',
            timestamp: Date.now(), isTargetAlert: true,
            message: `💼 ${orderTypeName} Filled: ${actionName} ${qty.toFixed(4)} shares of ${order.ticker} at $${filledPrice.toFixed(2)}!`
          });
        } catch (e) { console.error(e); }
      },
      error: (err) => {
        order.status = 'failed';
        try {
          const notifications = this.injector.get(NotificationService);
          notifications.playPremiumBellChime();
          notifications.addNotification({
            id: `order-fail-${order.ticker}-${Date.now()}`,
            ticker: order.ticker, company: order.company,
            currentPrice: filledPrice, previousPrice: order.targetPrice,
            change: 0, changePercent: 0, type: 'down',
            timestamp: Date.now(), isTargetAlert: true,
            message: `⚠️ Limit order failed for ${order.ticker}: ${err?.error?.error || 'Database error'}.`
          });
        } catch (e) { console.error(e); }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Fallbacks
  // ─────────────────────────────────────────────────────────────

  private getFallbackPrice(symbol: string): number {
    const fallbacks: Record<string, number> = {
      AAPL: 175.50, MSFT: 418.50, GOOGL: 150.10, AMZN: 178.40,
      NVDA: 215.30, TSLA: 426.00, META: 490.80, NFLX: 610.20,
      JPM: 195.40, V: 275.60, 'BRK.B': 405.30, JNJ: 155.20,
      GEV: 1038.70, SPY: 745.60, AMD: 467.50, MU: 751.00,
      CVX: 191.40, CRWV: 105.50
    };
    return fallbacks[symbol] || 100.0;
  }
}
