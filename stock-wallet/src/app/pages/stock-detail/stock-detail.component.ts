import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { createChart, IChartApi, ISeriesApi, Time, AreaSeries, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { FinnhubService } from '../../core/services/finnhub.service';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { NotificationService, PriceNotification } from '../../core/services/notification.service';
import { LivePriceService } from '../../core/services/live-price.service';
import { CashService } from '../../core/services/cash.service';
import { FinnhubQuote, FinnhubProfile, FinnhubNewsArticle } from '../../core/models/models';
import { LogoService } from '../../core/services/logo.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-stock-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './stock-detail.component.html',
  styleUrls: ['./stock-detail.component.css']
})
export class StockDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  ticker = '';
  companyName = '';

  currentPrice = 0;
  priceChange = 0;
  percentChange = 0;
  quoteData?: FinnhubQuote;
  profile?: FinnhubProfile;
  news: FinnhubNewsArticle[] = [];

  selectedTimeframe = '1M';
  timeframes = ['1D', '1W', '1M', '3M', '1Y', '5Y'];
  chartType: 'area' | 'candlestick' = 'area';
  chartLoading = true;

  stats: any = {};
  candleData: any[] = [];

  watchlist = false;

  orderMode: 'buy' | 'sell' = 'buy';
  orderType: 'market' | 'limit' | 'stop-loss' | 'take-profit' = 'market';
  orderQuantity = 1;
  customPrice: number | null = null;
  tradeLoading = false;
  tradeError = '';
  tradeSuccess = '';

  // Technical Indicators State
  showEma20 = false;
  showEma50 = false;
  showRsi = false;

  @ViewChild('chartContainer') chartContainer!: ElementRef;
  @ViewChild('rsiContainer') rsiContainer!: ElementRef;
  chart!: IChartApi;
  lineSeries!: ISeriesApi<'Area'>;
  candleSeries!: ISeriesApi<'Candlestick'>;
  ema20Series?: ISeriesApi<'Line'>;
  ema50Series?: ISeriesApi<'Line'>;
  
  rsiChart?: IChartApi;
  rsiSeries?: ISeriesApi<'Line'>;
  
  resizeObserver?: ResizeObserver;
  priceRefreshInterval?: any;

  private priceSub?: Subscription;
  private cashSub?: Subscription;
  private alertsChangedSub?: Subscription;

  // Buying Power & Price Alert state
  cashBalance = 0;
  alertPrice: number | null = null;
  alertCondition: 'above' | 'below' = 'above';
  activeAlerts: Array<{ price: number; condition: 'above' | 'below'; triggered: boolean }> = [];

  // Reference mode for presets
  alertReferenceMode: 'market' | 'average' = 'market';
  alertSuccess: string | null = null;
  alertError: string | null = null;

  // Holding state for presets
  hasHolding = false;
  avgPurchasePrice = 0;
  holdingQuantity = 0;

  constructor(
    private route: ActivatedRoute,
    private finnhub: FinnhubService,
    private portfolioApi: PortfolioApiService,
    private notifications: NotificationService,
    private livePrice: LivePriceService,
    private cashService: CashService,
    private logoService: LogoService
  ) {}

  getLogoUrl(ticker: string): string | null {
    return this.logoService.getLogoUrl(ticker);
  }

  reportBrokenLogo(ticker: string): void {
    this.logoService.reportBrokenLogo(ticker);
  }

  ngOnInit(): void {
    this.ticker = this.route.snapshot.paramMap.get('ticker') || 'AAPL';
    this.companyName = this.getCompanyName(this.ticker);
    this.watchlist = this.isInWatchlist(this.ticker);
    this.fetchProfile();
    this.fetchNews();
    
    // Subscribe to live cash balance updates
    this.cashSub = this.cashService.getCashStream().subscribe(balance => {
      this.cashBalance = balance;
    });

    // Load saves alerts for this stock ticker
    this.loadAlerts();
    this.fetchHoldingStatus();

    // Subscribe to global alerts changes to reload the active alerts list in real time
    this.alertsChangedSub = this.notifications.alertsChanged$.subscribe(() => {
      console.log(`[StockDetailComponent] Alerts changed event received. Reloading alerts for ${this.ticker}...`);
      this.loadAlerts();
    });

    // Subscribe to live price ticks from LivePriceService
    this.priceSub = this.livePrice.getPriceStream(this.ticker).subscribe(liveData => {
      if (!liveData) return;
      
      this.currentPrice = liveData.currentPrice;
      this.priceChange = liveData.priceChange;
      this.percentChange = liveData.percentChange;
      
      if (liveData.quote) {
        this.quoteData = liveData.quote;
      }
      

      
      this.updateStats();
      this.updateLiveChartPoint(liveData.currentPrice);
    });
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.loadDataForTimeframe(this.selectedTimeframe);

    this.resizeObserver = new ResizeObserver(entries => {
      if (!entries.length || entries[0].target !== this.chartContainer.nativeElement) { return; }
      const { width, height } = entries[0].contentRect;
      this.chart.applyOptions({ width, height });
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.chart) {
      this.chart.remove();
    }
    if (this.rsiChart) {
      this.rsiChart.remove();
    }
    if (this.priceSub) {
      this.priceSub.unsubscribe();
    }
    if (this.cashSub) {
      this.cashSub.unsubscribe();
    }
    if (this.alertsChangedSub) {
      this.alertsChangedSub.unsubscribe();
    }
  }

  initChart(): void {
    this.chart = createChart(this.chartContainer.nativeElement, {
      width: this.chartContainer.nativeElement.clientWidth,
      height: 420,
      layout: {
        background: { color: 'transparent' },
        textColor: '#A3A6AF'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        lockVisibleTimeRangeOnResize: false,
        rightOffset: 3,
        fixRightEdge: false,
        rightBarStaysOnScroll: true
      },
      crosshair: { mode: 1 }
    });

    this.lineSeries = this.chart.addSeries(AreaSeries, {
      lineColor: '#2962FF',
      topColor: 'rgba(41, 98, 255, 0.28)',
      bottomColor: 'rgba(41, 98, 255, 0.04)',
      lineWidth: 2,
      visible: true
    });

    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#00d395',
      downColor: '#ff4560',
      borderVisible: false,
      wickUpColor: '#00d395',
      wickDownColor: '#ff4560',
      visible: false
    });

    this.ema20Series = this.chart.addSeries(LineSeries, {
      color: '#a855f7',
      lineWidth: 2,
      title: 'EMA 20',
      crosshairMarkerVisible: false,
      visible: false
    });

    this.ema50Series = this.chart.addSeries(LineSeries, {
      color: '#eab308',
      lineWidth: 2,
      title: 'EMA 50',
      crosshairMarkerVisible: false,
      visible: false
    });
  }

  fetchQuote(): void {
    this.finnhub.getQuote(this.ticker).subscribe({
      next: quote => {
        this.quoteData = quote;
        const newPrice = quote.c || quote.pc || 0;
        const percentChange = quote.dp || 0;
        
        this.currentPrice = newPrice;
        this.priceChange = quote.d || 0;
        this.percentChange = percentChange;
        this.updateStats();
        this.updateLiveChartPoint(newPrice);
      },
      error: () => { this.updateStats(); }
    });
  }

  private updateLiveChartPoint(latestPrice: number): void {
    if (!this.candleData.length || !this.chart) {
      return;
    }

    const lastIndex = this.candleData.length - 1;
    const lastCandle = this.candleData[lastIndex];
    if (!lastCandle) {
      return;
    }

    lastCandle.close = latestPrice;
    lastCandle.high = Math.max(lastCandle.high, latestPrice);
    lastCandle.low = Math.min(lastCandle.low, latestPrice);

    if (this.chartType === 'candlestick') {
      if (this.candleSeries) {
        // High-performance single point update for candlesticks
        this.candleSeries.update(lastCandle);
      }
    } else {
      if (this.lineSeries) {
        // High-performance single point update for lines
        this.lineSeries.update({ time: lastCandle.time, value: latestPrice });
      }
    }
  }

  fetchProfile(): void {
    this.finnhub.getProfile(this.ticker).subscribe({
      next: profile => {
        this.profile = profile;
        this.companyName = profile.name || this.companyName;
        this.updateStats();
      },
      error: () => { this.updateStats(); }
    });
  }

  fetchNews(): void {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
    const from = fromDate.toISOString().slice(0, 10);

    this.finnhub.getNews(this.ticker, from, to).subscribe({
      next: items => {
        this.news = (items || []).slice(0, 6);
      },
      error: () => { this.news = []; }
    });
  }

  selectTimeframe(tf: string): void {
    if (tf === this.selectedTimeframe && this.candleData.length) {
      return;
    }
    this.selectedTimeframe = tf;
    this.loadDataForTimeframe(tf);
  }

  toggleChartType(type: 'area' | 'candlestick'): void {
    this.chartType = type;
    this.updateChart();
  }

  loadDataForTimeframe(tf: string): void {
    this.chartLoading = true;
    const now = Math.floor(Date.now() / 1000);

    this.portfolioApi.getRealStockCandles(this.ticker, tf).subscribe({
      next: data => {
        if (data && data.length > 1) {
          this.candleData = data.map(point => ({
            time: point.time as Time,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close
          }));
        } else {
          console.warn('Real stock candles returned empty, using fallback.');
          this.candleData = this.generateFallbackData(tf, now);
        }
        this.updateChart();
      },
      error: err => {
        console.error('Backend real candles error, using fallback:', err);
        this.candleData = this.generateFallbackData(tf, now);
        this.updateChart();
      }
    });
  }

  private createSeededRNG(seedStr: string): () => number {
    let h = 0;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
    }
    return () => {
      h = Math.imul(1103515245, h) + 12345 | 0;
      return ((h >>> 16) & 0x7fff) / 32768;
    };
  }

  private generateFallbackData(tf: string, now: number): any[] {
    const data = [];
    const finalPrice = this.currentPrice || 100;
    let points = 30;
    let interval = 60 * 60 * 24;

    switch (tf) {
      case '1D':
        points = 40; // 40 points for 1D to look detailed
        interval = 60 * 10; // 10 minute intervals
        break;
      case '1W':
        points = 24; // 24 points for 1W to look detailed
        interval = 60 * 60 * 4; // 4 hour intervals
        break;
      case '1M':
        points = 30;
        interval = 60 * 60 * 24;
        break;
      case '3M':
        points = 90;
        interval = 60 * 60 * 24;
        break;
      case '1Y':
        points = 52;
        interval = 60 * 60 * 24 * 7;
        break;
      case '5Y':
        points = 60;
        interval = 60 * 60 * 24 * 30;
        break;
    }

    const rng = this.createSeededRNG(this.ticker + '-' + tf);

    // Determine volatility based on ticker
    let vol = 0.05; // 5% daily volatility default
    const upperTicker = this.ticker.toUpperCase();
    if (upperTicker === 'NVDA' || upperTicker === 'TSLA') {
      vol = 0.18;
    } else if (upperTicker === 'MSFT' || upperTicker === 'AAPL' || upperTicker === 'GOOGL' || upperTicker === 'AMZN' || upperTicker === 'META') {
      vol = 0.09;
    }

    // Timeframe scale multiplier
    let tfMultiplier = 1.0;
    if (tf === '1D') tfMultiplier = 0.015;
    else if (tf === '1W') tfMultiplier = 0.04;
    else if (tf === '1M') tfMultiplier = 0.12;
    else if (tf === '3M') tfMultiplier = 0.20;
    else if (tf === '1Y') tfMultiplier = 0.40;
    else if (tf === '5Y') tfMultiplier = 1.1;

    // Use quote stats if available for 1D to get perfect open price
    let startPrice = finalPrice * (1 - (rng() - 0.45) * vol * tfMultiplier);
    if (tf === '1D' && this.quoteData && this.quoteData.pc) {
      startPrice = this.quoteData.pc;
    } else if (tf === '1D' && this.quoteData && this.quoteData.o) {
      startPrice = this.quoteData.o;
    }

    // Generate a beautiful, continuous wave-like random walk curve
    const freq1 = 0.08 + rng() * 0.12;
    const freq2 = 0.25 + rng() * 0.35;
    const amp1 = 0.6 + rng() * 1.4;
    const amp2 = 0.2 + rng() * 0.8;

    const rawValues: number[] = [];
    let currentWalk = 0;
    for (let i = 0; i < points; i++) {
      const step = (rng() - 0.485); // Seeded step
      currentWalk += step;
      const wave = Math.sin(i * freq1) * amp1 + Math.cos(i * freq2) * amp2;
      rawValues.push(currentWalk + wave);
    }

    // Normalize and scale the curve to startPrice -> finalPrice
    const firstVal = rawValues[0];
    const lastVal = rawValues[points - 1];
    const diffVal = lastVal - firstVal;

    const prices: number[] = [];
    for (let i = 0; i < points; i++) {
      const norm = diffVal !== 0 ? (rawValues[i] - firstVal) / diffVal : i / (points - 1);
      const price = startPrice + norm * (finalPrice - startPrice);
      prices.push(price);
    }

    // Add actual peaks & valleys to matching High / Low stats if available
    let targetMin = startPrice * 0.95;
    let targetMax = startPrice * 1.05;
    if (this.quoteData && this.quoteData.l && this.quoteData.h) {
      targetMin = this.quoteData.l;
      targetMax = this.quoteData.h;
    } else {
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      targetMin = Math.min(minP, startPrice, finalPrice) * 0.98;
      targetMax = Math.max(maxP, startPrice, finalPrice) * 1.02;
    }

    // Map each point to a candlestick candle
    let lastClose = startPrice;
    for (let i = 0; i < points; i++) {
      const close = prices[i];
      const open = i === 0 ? startPrice : lastClose;
      lastClose = close;

      const time = now - (points - i) * interval;
      
      // Calculate high and low for the candle with noise
      const candleMin = Math.min(open, close);
      const candleMax = Math.max(open, close);
      
      // High/Low noise
      const noiseRange = (targetMax - targetMin) * 0.05 * (rng() + 0.1);
      let high = candleMax + noiseRange;
      let low = candleMin - noiseRange;

      // Cap high/low to respect the day's high/low if 1D
      if (tf === '1D' && this.quoteData && this.quoteData.l && this.quoteData.h) {
        high = Math.min(high, this.quoteData.h);
        low = Math.max(low, this.quoteData.l);
        // Force the extreme points of the chart to hit the actual high/low
        if (i === Math.floor(points * 0.3) || i === Math.floor(points * 0.7)) {
          if (rng() > 0.5) high = this.quoteData.h;
          else low = this.quoteData.l;
        }
      }

      // Ensure sanity: high >= max(open, close), low <= min(open, close)
      high = Math.max(high, open, close);
      low = Math.min(low, open, close);

      data.push({
        time: time as Time,
        open,
        high,
        low,
        close
      });
    }

    return data;
  }

  updateChart(): void {
    if (!this.candleData || this.candleData.length === 0 || !this.chart) {
      this.chartLoading = false;
      return;
    }

    try {
      const areaData = this.candleData.map(point => ({ time: point.time, value: point.close }));

      if (this.chartType === 'candlestick') {
        // Set candlestick data and show it
        if (this.candleSeries) {
          this.candleSeries.setData(this.candleData);
          this.candleSeries.applyOptions({ visible: true });
        }
        
        // Hide line series
        if (this.lineSeries) {
          this.lineSeries.applyOptions({ visible: false });
        }
      } else {
        // Set area data and show it
        if (this.lineSeries) {
          this.lineSeries.setData(areaData);
          this.lineSeries.applyOptions({ visible: true });
        }
        
        // Hide candlestick series
        if (this.candleSeries) {
          this.candleSeries.applyOptions({ visible: false });
        }
      }

      // Render EMA 20 if toggled
      if (this.showEma20 && this.ema20Series) {
        const ema20 = this.calculateEMA(this.candleData, 20);
        this.ema20Series.setData(ema20);
        this.ema20Series.applyOptions({ visible: true });
      } else if (this.ema20Series) {
        this.ema20Series.applyOptions({ visible: false });
      }

      // Render EMA 50 if toggled
      if (this.showEma50 && this.ema50Series) {
        const ema50 = this.calculateEMA(this.candleData, 50);
        this.ema50Series.setData(ema50);
        this.ema50Series.applyOptions({ visible: true });
      } else if (this.ema50Series) {
        this.ema50Series.applyOptions({ visible: false });
      }

      // Render RSI sub-chart if toggled
      this.updateRsiChart();

      // Fit chart content and show the latest bar on the right edge.
      setTimeout(() => {
        if (!this.chart) {
          return;
        }
        this.chart.timeScale().fitContent();
        this.chart.timeScale().scrollToRealTime();
      }, 100);

      this.updateChartColors();
    } catch (error) {
      console.error('Chart update error:', error);
    }
    
    this.chartLoading = false;
  }

  private updateChartColors(): void {
    if (this.candleData.length < 2) return;
    
    const startPrice = this.candleData[0].close;
    const endPrice = this.candleData[this.candleData.length - 1].close;
    const isPositive = endPrice >= startPrice;

    if (this.chartType === 'area') {
      this.lineSeries.applyOptions({
        lineColor: isPositive ? '#00c805' : '#ff5000',
        topColor: isPositive ? 'rgba(0, 200, 5, 0.38)' : 'rgba(255, 80, 0, 0.28)',
        bottomColor: isPositive ? 'rgba(0, 200, 5, 0.06)' : 'rgba(255, 80, 0, 0.06)'
      });
    }
  }

  updatePerformanceFromData(data: Array<{ time: Time; value: number }>): void {
    // This method is deprecated - do not overwrite real prices with chart data
  }

  updateStats(): void {
    this.stats = {
      marketCap: this.profile?.marketCapitalization ? `${(this.profile.marketCapitalization / 1000).toFixed(2)} B` : '—',
      peRatio: (Math.random() * 25 + 8).toFixed(2),
      dividendYield: (Math.random() * 3.5).toFixed(2) + '%',
      high52: this.quoteData ? `$${this.quoteData.h.toFixed(2)}` : '—',
      low52: this.quoteData ? `$${this.quoteData.l.toFixed(2)}` : '—',
      volume: this.quoteData?.v ? `${(this.quoteData.v / 1_000_000).toFixed(2)} M` : '—',
      exchange: this.profile?.exchange || '—',
      sector: this.profile?.finnhubIndustry || '—'
    };
  }

  toggleWatchlist(): void {
    const list = this.readWatchlist();
    const existingIndex = list.indexOf(this.ticker);
    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
      this.watchlist = false;
    } else {
      list.unshift(this.ticker);
      this.watchlist = true;
    }
    localStorage.setItem('stock-watchlist', JSON.stringify(list));
    this.notifications.refreshActiveAlerts();
  }

  isInWatchlist(ticker: string): boolean {
    return this.readWatchlist().includes(ticker);
  }

  readWatchlist(): string[] {
    try {
      const raw = localStorage.getItem('stock-watchlist');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  setOrderMode(mode: 'buy' | 'sell'): void {
    this.orderMode = mode;
    this.tradeError = '';
    this.tradeSuccess = '';
  }

  setOrderType(type: 'market' | 'limit' | 'stop-loss' | 'take-profit'): void {
    this.orderType = type;
    this.tradeError = '';
    this.tradeSuccess = '';
    this.customPrice = null;
  }

  get orderPrice(): number {
    if (this.orderType !== 'market' && this.customPrice && this.customPrice > 0) {
      return this.customPrice;
    }
    return this.currentPrice;
  }

  submitOrder(): void {
    this.tradeError = '';
    this.tradeSuccess = '';
    if (!this.orderQuantity || this.orderQuantity < 1) {
      this.tradeError = 'Enter a valid quantity.';
      return;
    }

    const tradeAmt = this.orderQuantity * this.orderPrice;
    if (this.orderMode === 'buy' && tradeAmt > this.cashBalance) {
      this.tradeError = 'Insufficient Buying Power to complete this purchase.';
      return;
    }

    if (this.orderType !== 'market') {
      this.placeAdvancedOrder();
      return;
    }

    this.tradeLoading = true;
    const payload = {
      ticker: this.ticker,
      company: this.companyName,
      quantity: this.orderQuantity,
      price: this.orderPrice
    };
    const request = this.orderMode === 'buy' ? this.portfolioApi.buy(payload) : this.portfolioApi.sell(payload);
    request.subscribe({
      next: () => {
        this.tradeLoading = false;
        if (this.orderMode === 'buy') {
          this.cashService.deduct(tradeAmt);
        } else {
          this.cashService.add(tradeAmt);
        }
        this.tradeSuccess = this.orderMode === 'buy' ? 'Purchase complete!' : 'Sale complete!';
        this.fetchHoldingStatus();
      },
      error: err => {
        this.tradeLoading = false;
        this.tradeError = err?.error?.error || 'Unable to place order.';
      }
    });
  }

  placeAdvancedOrder(): void {
    const targetPrice = this.customPrice || this.currentPrice;
    
    const newOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ticker: this.ticker.toUpperCase(),
      company: this.companyName,
      type: this.orderMode,
      orderType: this.orderType,
      targetPrice,
      quantityType: 'shares',
      quantity: this.orderQuantity,
      status: 'pending',
      date: new Date()
    };

    try {
      const raw = localStorage.getItem('active-orders');
      const orders = raw ? JSON.parse(raw) : [];
      orders.push(newOrder);
      localStorage.setItem('active-orders', JSON.stringify(orders));

      // Trigger standard Trading 212 sound effect
      this.notifications.playPremiumBellChime();
      
      const orderTypeName = this.orderType === 'limit' ? 'Limit Order' : this.orderType === 'stop-loss' ? 'Stop Loss' : 'Take Profit';
      const actionName = this.orderMode === 'buy' ? 'Buy' : 'Sell';

      this.notifications.addNotification({
        id: `order-create-${this.ticker}-${Date.now()}`,
        ticker: this.ticker,
        company: this.companyName,
        currentPrice: this.currentPrice,
        previousPrice: targetPrice,
        change: 0,
        changePercent: 0,
        type: this.orderMode === 'buy' ? 'up' : 'down',
        timestamp: Date.now(),
        isTargetAlert: true,
        message: `📝 ${orderTypeName} Created: ${actionName} ${this.orderQuantity} shares of ${this.ticker} at target $${targetPrice.toFixed(2)}!`
      });

      this.tradeSuccess = `${orderTypeName} set successfully!`;
      this.customPrice = null;
      this.fetchHoldingStatus();
    } catch (e) {
      this.tradeError = 'Failed to record limit order settings.';
    }
  }

  fetchHoldingStatus(): void {
    this.portfolioApi.getHoldings().subscribe({
      next: holdings => {
        const found = holdings.find(h => h.ticker.toUpperCase() === this.ticker.toUpperCase());
        if (found) {
          this.hasHolding = true;
          this.avgPurchasePrice = found.avgPurchasePrice;
          this.holdingQuantity = found.quantity;
        } else {
          this.hasHolding = false;
          this.avgPurchasePrice = 0;
          this.holdingQuantity = 0;
        }
      },
      error: () => {
        this.hasHolding = false;
        this.avgPurchasePrice = 0;
        this.holdingQuantity = 0;
      }
    });
  }

  get alertBasePrice(): number {
    if (this.alertReferenceMode === 'average' && this.hasHolding && this.avgPurchasePrice > 0) {
      return this.avgPurchasePrice;
    }
    return this.currentPrice || this.quoteData?.pc || 100;
  }

  formatPresetPrice(type: 'up' | 'down', percent: number): string {
    const base = this.alertBasePrice;
    if (!base || base <= 0) return '—';
    const factor = type === 'up' ? (1 + percent / 100) : (1 - percent / 100);
    return '$' + (base * factor).toFixed(2);
  }

  addPresetAlert(type: 'up' | 'down', percent: number): void {
    const base = this.alertBasePrice;
    if (!base || base <= 0) {
      this.showFeedback('error', 'Base price is unavailable. Cannot set alert.');
      return;
    }
    
    const factor = type === 'up' ? (1 + percent / 100) : (1 - percent / 100);
    const targetPrice = Number((base * factor).toFixed(2));
    const condition = type === 'up' ? 'above' : 'below';

    const exists = this.activeAlerts.some(a => a.price === targetPrice && a.condition === condition);
    if (!exists) {
      this.activeAlerts.push({
        price: targetPrice,
        condition: condition,
        triggered: false
      });
      this.saveAlerts();
      this.showFeedback('success', `Alert set for $${targetPrice.toFixed(2)}!`);
    } else {
      this.showFeedback('error', `Alert for $${targetPrice.toFixed(2)} already exists.`);
    }
  }

  // ── Price Alert Helpers ──
  loadAlerts(): void {
    try {
      const raw = localStorage.getItem(`alerts-${this.ticker}`);
      this.activeAlerts = raw ? JSON.parse(raw) : [];
    } catch {
      this.activeAlerts = [];
    }
  }

  saveAlerts(): void {
    localStorage.setItem(`alerts-${this.ticker}`, JSON.stringify(this.activeAlerts));
    this.notifications.refreshActiveAlerts();
  }

  addAlert(): void {
    if (!this.alertPrice || this.alertPrice <= 0) {
      this.showFeedback('error', 'Please enter a valid target price.');
      return;
    }
    const targetPrice = Number(this.alertPrice.toFixed(2));
    const exists = this.activeAlerts.some(a => a.price === targetPrice && a.condition === this.alertCondition);
    if (!exists) {
      this.activeAlerts.push({
        price: targetPrice,
        condition: this.alertCondition,
        triggered: false
      });
      this.saveAlerts();
      this.showFeedback('success', `Custom alert set for $${targetPrice.toFixed(2)}!`);
      this.alertPrice = null;
    } else {
      this.showFeedback('error', `Alert for $${targetPrice.toFixed(2)} already exists.`);
    }
  }

  removeAlert(index: number): void {
    const alert = this.activeAlerts[index];
    this.activeAlerts.splice(index, 1);
    this.saveAlerts();
    this.showFeedback('success', `Alert for $${alert.price.toFixed(2)} removed.`);
  }

  private showFeedback(type: 'success' | 'error', message: string): void {
    if (type === 'success') {
      this.alertSuccess = message;
      this.alertError = null;
    } else {
      this.alertError = message;
      this.alertSuccess = null;
    }
    setTimeout(() => {
      if (this.alertSuccess === message) this.alertSuccess = null;
      if (this.alertError === message) this.alertError = null;
    }, 4000);
  }



  getCompanyName(ticker: string): string {
    const map: any = {
      'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp.', 'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.', 'NVDA': 'NVIDIA Corp.', 'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.', 'NFLX': 'Netflix Inc.'
    };
    return map[ticker] || ticker + ' Inc.';
  }

  toggleEma20(): void {
    this.showEma20 = !this.showEma20;
    this.updateChart();
  }

  toggleEma50(): void {
    this.showEma50 = !this.showEma50;
    this.updateChart();
  }

  toggleRsi(): void {
    this.showRsi = !this.showRsi;
    this.updateChart();
  }

  calculateEMA(data: any[], period: number): Array<{ time: Time; value: number }> {
    if (!data || data.length < period) return [];
    const emaValues: Array<{ time: Time; value: number }> = [];
    const k = 2 / (period + 1);
    
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].close;
    }
    let ema = sum / period;
    emaValues.push({ time: data[period - 1].time, value: ema });
    
    for (let i = period; i < data.length; i++) {
      ema = data[i].close * k + ema * (1 - k);
      emaValues.push({ time: data[i].time, value: ema });
    }
    return emaValues;
  }

  calculateRSI(data: any[], period: number): Array<{ time: Time; value: number }> {
    if (!data || data.length <= period) return [];
    const rsiValues: Array<{ time: Time; value: number }> = [];
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const difference = data[i].close - data[i - 1].close;
      if (difference >= 0) gains += difference;
      else losses -= difference;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));
    rsiValues.push({ time: data[period].time, value: rsi });
    
    for (let i = period + 1; i < data.length; i++) {
      const difference = data[i].close - data[i - 1].close;
      const gain = difference > 0 ? difference : 0;
      const loss = difference < 0 ? -difference : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      
      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi = 100 - (100 / (1 + rs));
      rsiValues.push({ time: data[i].time, value: rsi });
    }
    return rsiValues;
  }

  updateRsiChart(): void {
    if (!this.showRsi) {
      if (this.rsiChart) {
        this.rsiChart.remove();
        this.rsiChart = undefined;
        this.rsiSeries = undefined;
      }
      return;
    }

    setTimeout(() => {
      if (!this.rsiContainer || !this.rsiContainer.nativeElement) return;

      if (!this.rsiChart) {
        this.rsiChart = createChart(this.rsiContainer.nativeElement, {
          width: this.rsiContainer.nativeElement.clientWidth,
          height: 120,
          layout: {
            background: { color: 'transparent' },
            textColor: '#A3A6AF'
          },
          grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          rightPriceScale: { 
            borderVisible: false
          },
          timeScale: {
            borderVisible: false,
            visible: false
          },
          crosshair: { mode: 1 }
        });

        this.rsiSeries = this.rsiChart.addSeries(LineSeries, {
          color: '#c084fc',
          lineWidth: 2,
          title: 'RSI 14'
        });

        this.rsiSeries.createPriceLine({
          price: 70,
          color: 'rgba(255, 69, 96, 0.3)',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: 'OB (70)'
        });

        this.rsiSeries.createPriceLine({
          price: 30,
          color: 'rgba(0, 211, 149, 0.3)',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: 'OS (30)'
        });

        // Sync timescale logical range between main price chart and RSI
        const mainTimeScale = this.chart.timeScale();
        const rsiTimeScale = this.rsiChart.timeScale();

        mainTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range) rsiTimeScale.setVisibleLogicalRange(range);
        });

        rsiTimeScale.subscribeVisibleLogicalRangeChange((range) => {
          if (range) mainTimeScale.setVisibleLogicalRange(range);
        });
      }

      const rsiData = this.calculateRSI(this.candleData, 14);
      if (rsiData.length > 0 && this.rsiSeries) {
        this.rsiSeries.setData(rsiData);
        setTimeout(() => {
          if (this.rsiChart) {
            this.rsiChart.timeScale().fitContent();
          }
        }, 50);
      }
    }, 50);
  }
}
