import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinnhubService } from '../../core/services/finnhub.service';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { LogoService } from '../../core/services/logo.service';
import { MarketStock } from '../../core/models/models';
import { BuySellModalComponent } from '../../shared/buy-sell-modal/buy-sell-modal.component';
import { forkJoin, Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LivePriceService } from '../../core/services/live-price.service';

const POPULAR = [
  { ticker: 'AAPL',  company: 'Apple Inc.',          sector: 'Technology' },
  { ticker: 'MSFT',  company: 'Microsoft Corp.',      sector: 'Technology' },
  { ticker: 'GOOGL', company: 'Alphabet Inc.',        sector: 'Communication' },
  { ticker: 'AMZN',  company: 'Amazon.com Inc.',      sector: 'Consumer' },
  { ticker: 'NVDA',  company: 'NVIDIA Corp.',         sector: 'Technology' },
  { ticker: 'TSLA',  company: 'Tesla Inc.',           sector: 'Consumer' },
  { ticker: 'META',  company: 'Meta Platforms Inc.',  sector: 'Communication' },
  { ticker: 'NFLX',  company: 'Netflix Inc.',         sector: 'Communication' },
  { ticker: 'JPM',   company: 'JPMorgan Chase & Co.', sector: 'Financial' },
  { ticker: 'V',     company: 'Visa Inc.',            sector: 'Financial' },
  { ticker: 'BRK.B', company: 'Berkshire Hathaway',  sector: 'Financial' },
  { ticker: 'JNJ',   company: 'Johnson & Johnson',   sector: 'Healthcare' },
];

@Component({
  selector: 'app-market',
  standalone: true,
  imports: [CommonModule, FormsModule, BuySellModalComponent, RouterModule, TranslatePipe],
  templateUrl: './market.component.html',
  styleUrls: ['./market.component.css']
})
export class MarketComponent implements OnInit, OnDestroy {
  watchlist: string[] = this.readWatchlist();
  popularStocks: MarketStock[] = POPULAR.map(s => ({ ...s, loading: true, watchlisted: this.watchlist.includes(s.ticker) }));
  searchQuery = '';
  searchResults: MarketStock[] = [];
  searchLoading = false;
  searchError = '';

  activeTab: 'explorer' | 'heatmap' | 'calendar' = 'explorer';

  // World Clocks State
  nyseTime = '';
  lseTime = '';
  tseTime = '';
  nyseStatus = 'Closed';
  lseStatus = 'Closed';
  tseStatus = 'Closed';
  countdownText = '';
  countdownTarget = '';
  private clocksInterval?: any;

  // Categorized sectors for Finviz Heatmap
  get heatmapSectors(): Array<{ name: string; stocks: MarketStock[] }> {
    const sectors = ['Technology', 'Consumer', 'Communication', 'Financial', 'Healthcare'];
    
    return sectors.map(secName => {
      const stocks = this.popularStocks.filter(s => {
        const sec = s.sector || '';
        if (secName === 'Technology') {
          return sec === 'Technology' || sec === 'Semiconductors' || sec === 'Software & Cloud';
        }
        if (secName === 'Consumer') {
          return sec === 'Consumer' || sec === 'E-Commerce' || sec === 'Automotive';
        }
        if (secName === 'Communication') {
          return sec === 'Communication';
        }
        if (secName === 'Financial') {
          return sec === 'Financial';
        }
        if (secName === 'Healthcare') {
          return sec === 'Healthcare' || sec === 'Biotech & Pharma';
        }
        return false;
      });
      return {
        name: secName,
        stocks
      };
    });
  }

  earningsEvents = [
    { ticker: 'NVDA', company: 'NVIDIA Corp.', date: 'May 28, 2026', time: 'After Market Close', consensusEps: '5.58', expectedRevenue: '$24.6B', previousEps: '5.16', rating: 'STRONG BUY' },
    { ticker: 'TSLA', company: 'Tesla Inc.', date: 'Jun 04, 2026', time: 'Before Market Open', consensusEps: '0.62', expectedRevenue: '$21.3B', previousEps: '0.71', rating: 'HOLD' },
    { ticker: 'AAPL', company: 'Apple Inc.', date: 'Jun 11, 2026', time: 'After Market Close', consensusEps: '1.51', expectedRevenue: '$90.2B', previousEps: '1.43', rating: 'BUY' },
    { ticker: 'MSFT', company: 'Microsoft Corp.', date: 'Jun 18, 2026', time: 'After Market Close', consensusEps: '2.84', expectedRevenue: '$60.8B', previousEps: '2.77', rating: 'STRONG BUY' },
    { ticker: 'AMZN', company: 'Amazon.com Inc.', date: 'Jun 25, 2026', time: 'After Market Close', consensusEps: '1.04', expectedRevenue: '$142.5B', previousEps: '0.98', rating: 'BUY' },
    { ticker: 'GOOGL', company: 'Alphabet Inc.', date: 'Jul 02, 2026', time: 'Before Market Open', consensusEps: '1.60', expectedRevenue: '$78.4B', previousEps: '1.52', rating: 'BUY' }
  ];

  indices: Array<{
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePct: number;
    sparkline: string;
    loading: boolean;
    isUp: boolean;
  }> = [
    { ticker: 'SPY', name: 'S&P 500 ETF', price: 0, change: 0, changePct: 0, sparkline: '', loading: true, isUp: true },
    { ticker: 'QQQ', name: 'NASDAQ 100', price: 0, change: 0, changePct: 0, sparkline: '', loading: true, isUp: true },
    { ticker: 'DIA', name: 'Dow Jones ETF', price: 0, change: 0, changePct: 0, sparkline: '', loading: true, isUp: true }
  ];

  topMovers: MarketStock[] = [];
  topGainers: MarketStock[] = [];
  topLosers: MarketStock[] = [];

  autocompleteSuggestions: any[] = [];
  showSuggestions = false;

  showModal = false;
  modalTicker = '';
  modalCompany = '';

  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  toastTimer: any;

  private priceSubs: Subscription[] = [];

  constructor(
    private finnhub: FinnhubService,
    private portfolioApi: PortfolioApiService,
    private logoService: LogoService,
    private livePrice: LivePriceService
  ) {}

  getLogoUrl(ticker: string): string | null {
    return this.logoService.getLogoUrl(ticker);
  }

  reportBrokenLogo(ticker: string): void {
    this.logoService.reportBrokenLogo(ticker);
  }

  get filteredPopularStocks(): MarketStock[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return this.popularStocks;
    }
    return this.popularStocks.filter(s => 
      s.ticker.toLowerCase().includes(q) || 
      (s.company && s.company.toLowerCase().includes(q))
    );
  }

  ngOnInit(): void {
    // 1. Clocks and Countdown loop
    this.updateClocks();
    this.clocksInterval = setInterval(() => this.updateClocks(), 1000);

    // 2. Fetch ETF Index updates
    this.indices.forEach(idx => {
      this.finnhub.getQuote(idx.ticker).subscribe({
        next: q => {
          idx.price = q.c || q.pc || 0;
          idx.change = q.d || 0;
          idx.changePct = q.dp || 0;
          idx.isUp = idx.change >= 0;
          
          this.portfolioApi.getRealStockCandles(idx.ticker, '1D').subscribe({
            next: candles => {
              if (candles && candles.length > 1) {
                const closes = candles.map(c => c.close);
                const min = Math.min(...closes);
                const max = Math.max(...closes);
                const range = max - min || 1;
                
                const points = closes.map((c, i) => {
                  const x = (i / (closes.length - 1)) * 100;
                  const y = 30 - ((c - min) / range) * 24 - 3;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                }).join(' ');
                
                idx.sparkline = points;
              } else {
                idx.sparkline = '0,15 50,15 100,15';
              }
              idx.loading = false;
            },
            error: () => {
              idx.sparkline = '0,15 50,15 100,15';
              idx.loading = false;
            }
          });
        },
        error: () => {
          idx.loading = false;
        }
      });
    });

    // 3. Fetch Popular stocks & evaluate Movers
    const quotes$ = POPULAR.map(s => this.finnhub.getQuote(s.ticker));
    forkJoin(quotes$).subscribe({
      next: quotes => {
        this.popularStocks = POPULAR.map((s, i) => ({
          ...s,
          quote: quotes[i],
          loading: false,
          watchlisted: this.watchlist.includes(s.ticker)
        }));

        this.calcMovers();
        this.subscribeToPopularPrices();
      },
      error: () => {
        this.popularStocks = this.popularStocks.map(s => ({ ...s, loading: false }));
      }
    });
  }

  ngOnDestroy(): void {
    if (this.clocksInterval) {
      clearInterval(this.clocksInterval);
    }
    this.unsubscribeFromPopularPrices();
  }

  updateClocks(): void {
    const now = new Date();
    
    // Format times
    try {
      this.nyseTime = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.lseTime = now.toLocaleTimeString('en-US', { timeZone: 'Europe/London', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.tseTime = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      this.nyseTime = now.toLocaleTimeString();
      this.lseTime = now.toLocaleTimeString();
      this.tseTime = now.toLocaleTimeString();
    }

    // NYSE status (America/New_York)
    const nyDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const nyDay = nyDate.getDay();
    const nyHour = nyDate.getHours();
    const nyMin = nyDate.getMinutes();
    const nyTotalMin = nyHour * 60 + nyMin;
    const nyOpen = 9 * 60 + 30; // 9:30 AM
    const nyClose = 16 * 60;    // 4:00 PM
    
    const isNyWeekday = nyDay >= 1 && nyDay <= 5;
    if (isNyWeekday && nyTotalMin >= nyOpen && nyTotalMin < nyClose) {
      this.nyseStatus = 'Open';
    } else if (isNyWeekday && nyTotalMin >= nyOpen - 30 && nyTotalMin < nyOpen) {
      this.nyseStatus = 'Pre-Market';
    } else {
      this.nyseStatus = 'Closed';
    }

    // LSE status (Europe/London)
    const lonDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const lonDay = lonDate.getDay();
    const lonHour = lonDate.getHours();
    const lonMin = lonDate.getMinutes();
    const lonTotalMin = lonHour * 60 + lonMin;
    
    if (lonDay >= 1 && lonDay <= 5 && lonTotalMin >= 8 * 60 && lonTotalMin < 16 * 60 + 30) {
      this.lseStatus = 'Open';
    } else {
      this.lseStatus = 'Closed';
    }

    // TSE status (Asia/Tokyo)
    const tokDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const tokDay = tokDate.getDay();
    const tokHour = tokDate.getHours();
    const tokMin = tokDate.getMinutes();
    const tokTotalMin = tokHour * 60 + tokMin;
    
    if (tokDay >= 1 && tokDay <= 5 && ((tokTotalMin >= 9 * 60 && tokTotalMin < 11 * 60 + 30) || (tokTotalMin >= 12 * 60 + 30 && tokTotalMin < 15 * 60))) {
      this.tseStatus = 'Open';
    } else if (tokDay >= 1 && tokDay <= 5 && tokTotalMin >= 11 * 60 + 30 && tokTotalMin < 12 * 60 + 30) {
      this.tseStatus = 'Lunch Break';
    } else {
      this.tseStatus = 'Closed';
    }

    // Countdown calculation
    let targetTime = new Date(nyDate);
    let targetMsg = '';
    
    if (!isNyWeekday) {
      const daysToMon = (8 - nyDay) % 7 || 7;
      targetTime.setDate(nyDate.getDate() + daysToMon);
      targetTime.setHours(9, 30, 0, 0);
      targetMsg = 'until Mon Open';
    } else if (nyTotalMin < nyOpen) {
      targetTime.setHours(9, 30, 0, 0);
      targetMsg = 'until NYSE Open';
    } else if (nyTotalMin >= nyOpen && nyTotalMin < nyClose) {
      targetTime.setHours(16, 0, 0, 0);
      targetMsg = 'until NYSE Close';
    } else {
      const daysToNext = nyDay === 5 ? 3 : 1;
      targetTime.setDate(nyDate.getDate() + daysToNext);
      targetTime.setHours(9, 30, 0, 0);
      targetMsg = 'until NYSE Open';
    }

    const diffMs = targetTime.getTime() - nyDate.getTime();
    if (diffMs > 0) {
      const diffSecs = Math.floor(diffMs / 1000);
      const h = Math.floor(diffSecs / 3600);
      const m = Math.floor((diffSecs % 3600) / 60);
      const s = diffSecs % 60;
      this.countdownText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      this.countdownTarget = targetMsg;
    } else {
      this.countdownText = '00:00:00';
      this.countdownTarget = 'Market Event';
    }
  }

  unsubscribeFromPopularPrices(): void {
    this.priceSubs.forEach(sub => sub.unsubscribe());
    this.priceSubs = [];
  }

  subscribeToPopularPrices(): void {
    this.unsubscribeFromPopularPrices();
    
    this.popularStocks.forEach(s => {
      const sub = this.livePrice.getPriceStream(s.ticker).subscribe(data => {
        if (data && s.quote) {
          const oldPrice = s.quote.c;
          const newPrice = data.currentPrice;
          
          if (newPrice > oldPrice) {
            (s as any).flashState = 'up';
            setTimeout(() => (s as any).flashState = null, 600);
          } else if (newPrice < oldPrice) {
            (s as any).flashState = 'down';
            setTimeout(() => (s as any).flashState = null, 600);
          }
          
          s.quote.c = newPrice;
          s.quote.d = data.priceChange;
          s.quote.dp = data.percentChange;
          
          this.calcMovers();
        }
      });
      this.priceSubs.push(sub);
    });
  }

  calcMovers(): void {
    const valid = this.popularStocks.filter(s => !s.loading && s.quote);
    
    this.topGainers = [...valid]
      .sort((a, b) => (b.quote?.dp || 0) - (a.quote?.dp || 0))
      .slice(0, 4);

    this.topLosers = [...valid]
      .sort((a, b) => (a.quote?.dp || 0) - (b.quote?.dp || 0))
      .slice(0, 4);
  }

  onSearchInput(): void {
    const q = this.searchQuery.trim();
    if (!q || q.length < 1) {
      this.autocompleteSuggestions = [];
      this.showSuggestions = false;
      return;
    }
    
    this.finnhub.searchSymbol(q).subscribe({
      next: data => {
        this.autocompleteSuggestions = (data.result || [])
          .filter((r: any) => {
            const type = (r.type || '').toUpperCase();
            const symbol = (r.symbol || '').toUpperCase();
            return (type.includes('STOCK') || type.includes('EQUITY') || type.includes('EQS') || type === '') && r.symbol && !symbol.includes('.');
          })
          .slice(0, 5);
        this.showSuggestions = this.autocompleteSuggestions.length > 0;
      },
      error: () => {
        this.autocompleteSuggestions = [];
        this.showSuggestions = false;
      }
    });
  }

  selectSuggestion(ticker: string): void {
    this.searchQuery = ticker;
    this.showSuggestions = false;
    this.search();
  }

  hideSuggestions(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  search(): void {
    if (!this.searchQuery.trim()) return;
    this.searchLoading = true;
    this.searchError = '';
    this.searchResults = [];
    this.showSuggestions = false;

    this.finnhub.searchSymbol(this.searchQuery.trim()).subscribe({
      next: data => {
        const top = (data.result || [])
          .filter((r: any) => {
            const type = (r.type || '').toUpperCase();
            const symbol = (r.symbol || '').toUpperCase();
            return (type.includes('STOCK') || type.includes('EQUITY') || type.includes('EQS') || type === '') && r.symbol && !symbol.includes('.');
          })
          .slice(0, 6)
          .map((r: any) => ({
            ticker: r.symbol,
            company: r.description || r.symbol,
            loading: true,
            watchlisted: this.watchlist.includes(r.symbol)
          }));
        if (top.length === 0) {
          this.searchError = 'No results found.';
          this.searchLoading = false;
          return;
        }
        this.searchResults = top;
        const quotes$ = this.searchResults.map((s: MarketStock) => this.finnhub.getQuote(s.ticker));
        forkJoin(quotes$).subscribe({
          next: quotes => {
            this.searchResults = top.map((s: MarketStock, i: number) => ({ ...s, quote: quotes[i], loading: false }));
            this.searchLoading = false;
          },
          error: () => { this.searchLoading = false; }
        });
      },
      error: () => { this.searchError = 'Search failed. Try again.'; this.searchLoading = false; }
    });
  }

  openBuy(stock: MarketStock): void {
    this.modalTicker = stock.ticker;
    this.modalCompany = stock.company;
    this.showModal = true;
  }

  toggleWatchlist(stock: MarketStock, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const index = this.watchlist.indexOf(stock.ticker);
    if (index >= 0) {
      this.watchlist.splice(index, 1);
      stock.watchlisted = false;
    } else {
      this.watchlist.unshift(stock.ticker);
      stock.watchlisted = true;
    }
    localStorage.setItem('stock-watchlist', JSON.stringify(this.watchlist));
    this.showToast(`${stock.ticker} ${stock.watchlisted ? 'added to' : 'removed from'} watchlist`, 'success');
  }

  isWatchlisted(ticker: string): boolean {
    return this.watchlist.includes(ticker);
  }

  readWatchlist(): string[] {
    try {
      const raw = localStorage.getItem('stock-watchlist');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  onBuySuccess(): void {
    this.showToast(`${this.modalTicker} added to portfolio!`, 'success');
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMsg = '', 4000);
  }

  varClass(dp: number): string {
    return dp > 0 ? 'text-positive' : dp < 0 ? 'text-negative' : 'text-neutral';
  }
  sign(v: number): string { return v > 0 ? '+' : ''; }
}
