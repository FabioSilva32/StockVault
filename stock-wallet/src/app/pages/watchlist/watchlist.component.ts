import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LivePriceService, LivePriceData } from '../../core/services/live-price.service';
import { LogoService } from '../../core/services/logo.service';
import { NotificationService } from '../../core/services/notification.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface WatchlistItem {
  ticker: string;
  company: string;
  price: number;
  prevPrice: number;
  change: number;
  changePct: number;
  loading: boolean;
  showAlertPanel: boolean;
  alertPrice: number | null;
  alertCondition: 'above' | 'below';
  activeAlerts: { price: number; condition: string; triggered: boolean }[];
  priceDirection: 'up' | 'down' | 'flat';
  priceFlash: boolean;
}

const COMPANY_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.', MSFT: 'Microsoft Corp.', GOOGL: 'Alphabet Inc.',
  AMZN: 'Amazon.com Inc.', NVDA: 'NVIDIA Corp.', TSLA: 'Tesla Inc.',
  META: 'Meta Platforms', NFLX: 'Netflix Inc.', JPM: 'JPMorgan Chase',
  V: 'Visa Inc.', JNJ: 'Johnson & Johnson', SPY: 'S&P 500 ETF',
  QQQ: 'NASDAQ 100 ETF', DIA: 'Dow Jones ETF', AMD: 'Advanced Micro Devices',
  INTC: 'Intel Corp.', BABA: 'Alibaba Group', BRK: 'Berkshire Hathaway',
  COST: 'Costco Wholesale', WMT: 'Walmart Inc.', GS: 'Goldman Sachs',
  BA: 'Boeing Co.', DIS: 'Walt Disney Co.', PLTR: 'Palantir Technologies'
};

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css']
})
export class WatchlistComponent implements OnInit, OnDestroy {
  watchlistItems: WatchlistItem[] = [];
  loading = false;
  private priceSubs: Map<string, Subscription> = new Map();

  constructor(
    private livePrice: LivePriceService,
    private logoService: LogoService,
    private notifications: NotificationService,
    private router: Router
  ) {}

  getLogoUrl(ticker: string): string | null {
    return this.logoService.getLogoUrl(ticker);
  }

  reportBrokenLogo(ticker: string): void {
    this.logoService.reportBrokenLogo(ticker);
  }

  ngOnInit(): void {
    this.loadWatchlist();
  }

  ngOnDestroy(): void {
    this.priceSubs.forEach(s => s.unsubscribe());
  }

  loadWatchlist(): void {
    const tickers = this.readWatchlist();
    if (tickers.length === 0) {
      this.watchlistItems = [];
      return;
    }

    this.loading = true;
    this.watchlistItems = tickers.map(ticker => ({
      ticker,
      company: COMPANY_NAMES[ticker] || ticker + ' Inc.',
      price: 0,
      prevPrice: 0,
      change: 0,
      changePct: 0,
      loading: true,
      showAlertPanel: false,
      alertPrice: null,
      alertCondition: 'above' as 'above' | 'below',
      activeAlerts: this.loadAlertsForTicker(ticker),
      priceDirection: 'flat' as 'up' | 'down' | 'flat',
      priceFlash: false
    }));

    tickers.forEach(ticker => this.subscribeToLivePrice(ticker));
    this.loading = false;
  }

  private subscribeToLivePrice(ticker: string): void {
    if (this.priceSubs.has(ticker)) return;

    const sub = this.livePrice.getPriceStream(ticker).subscribe(data => {
      if (!data) return;
      const item = this.watchlistItems.find(w => w.ticker === ticker);
      if (!item) return;

      const oldPrice = item.price;
      item.prevPrice = oldPrice;
      item.price = data.currentPrice;
      item.change = data.priceChange;
      item.changePct = data.percentChange;
      item.loading = false;

      if (oldPrice > 0 && Math.abs(data.currentPrice - oldPrice) > 0.001) {
        item.priceDirection = data.currentPrice > oldPrice ? 'up' : 'down';
        item.priceFlash = true;
        setTimeout(() => { item.priceFlash = false; }, 600);
      }
    });

    this.priceSubs.set(ticker, sub);
  }

  toggleAlertPanel(item: WatchlistItem): void {
    item.showAlertPanel = !item.showAlertPanel;
    if (item.showAlertPanel && item.price > 0) {
      item.alertPrice = parseFloat(item.price.toFixed(2));
    }
  }

  saveAlert(item: WatchlistItem): void {
    if (!item.alertPrice || item.alertPrice <= 0) return;

    const key = `alerts-${item.ticker}`;
    const raw = localStorage.getItem(key);
    const alerts = raw ? JSON.parse(raw) : [];
    alerts.push({ price: item.alertPrice, condition: item.alertCondition, triggered: false });
    localStorage.setItem(key, JSON.stringify(alerts));

    item.activeAlerts = this.loadAlertsForTicker(item.ticker);
    item.showAlertPanel = false;
    item.alertPrice = null;

    this.notifications.refreshAllMonitoredTickers();
    this.notifications.playPremiumBellChime();
  }

  removeAlert(item: WatchlistItem, index: number): void {
    const key = `alerts-${item.ticker}`;
    const raw = localStorage.getItem(key);
    const alerts = raw ? JSON.parse(raw) : [];
    alerts.splice(index, 1);
    localStorage.setItem(key, JSON.stringify(alerts));
    item.activeAlerts = this.loadAlertsForTicker(item.ticker);
    this.notifications.refreshAllMonitoredTickers();
  }

  private loadAlertsForTicker(ticker: string): { price: number; condition: string; triggered: boolean }[] {
    try {
      const raw = localStorage.getItem(`alerts-${ticker}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  removeFromWatchlist(ticker: string): void {
    const list = this.readWatchlist();
    const index = list.indexOf(ticker);
    if (index >= 0) {
      list.splice(index, 1);
      localStorage.setItem('stock-watchlist', JSON.stringify(list));
      const sub = this.priceSubs.get(ticker);
      sub?.unsubscribe();
      this.priceSubs.delete(ticker);
      this.watchlistItems = this.watchlistItems.filter(item => item.ticker !== ticker);
    }
  }

  compareWith(ticker: string): void {
    this.router.navigate(['/compare'], { queryParams: { add: ticker } });
  }

  private readWatchlist(): string[] {
    try {
      const raw = localStorage.getItem('stock-watchlist');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  varClass(v: number): string {
    return v > 0 ? 'text-positive' : v < 0 ? 'text-negative' : 'text-neutral';
  }

  sign(v: number): string { return v > 0 ? '+' : ''; }
}
