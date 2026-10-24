import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { FinnhubService } from '../../core/services/finnhub.service';
import { CashService } from '../../core/services/cash.service';
import { LivePriceService, LivePriceData } from '../../core/services/live-price.service';
import { LogoService } from '../../core/services/logo.service';
import { Holding } from '../../core/models/models';
import { BuySellModalComponent, ModalMode } from '../../shared/buy-sell-modal/buy-sell-modal.component';
import { RouterModule, Router } from '@angular/router';
import { createChart, IChartApi, ISeriesApi, Time, AreaSeries } from 'lightweight-charts';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AuthService } from '../../core/services/auth.service';

interface EnrichedHolding extends Holding {
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPct: number;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, BuySellModalComponent, RouterModule, TranslatePipe],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css']
})
export class PortfolioComponent implements OnInit, AfterViewInit, OnDestroy {
  holdings: EnrichedHolding[] = [];
  loading = true;
  error = '';

  // Currency state
  cashBalance = 0;
  totalInvested = 0;
  totalValue = 0; // Current stocks value
  netAssets = 0;  // Total wallet value (stocks + cash)
  totalGainLoss = 0;
  totalGainLossPct = 0;
  bestHolder?: EnrichedHolding;
  sectorAllocation: { sector: string; value: number; pct: number; color: string; tickers: string[] }[] = [];
  diversityBackground = '';

  // Dividend Tracker State
  projectedDividends = 0;
  averageYield = 0;
  dividendHoldings: Array<{ ticker: string; yield: number; annualPayout: number }> = [];

  // Risk Audit State
  riskScore = 1.0;
  sectorRiskScore = 1.0;
  volRiskScore = 1.0;
  riskLevel = 'Low';
  riskClass = 'risk-low';
  riskAnalysisText = '';

  // Sparklines
  sparklineData: Map<string, number[]> = new Map();

  // Onboarding
  isFirstVisit = false;

  // Cash Drawer state
  showCashDrawer = false;
  cashDrawerMode: 'deposit' | 'withdraw' = 'deposit';
  cashAmount: number | null = null;
  cashDrawerError = '';
  cashDrawerSuccess = '';

  // Portfolio Chart state
  selectedTimeframe = '1M';
  timeframes = ['1D', '1W', '1M', '3M', '1Y', '5Y'];
  chartLoading = false;
  hoveredValue: number | null = null;
  hoveredChange: number | null = null;
  hoveredChangePct: number | null = null;
  hoveredDate: string | null = null;
  chartTimeframeGainLoss = 0;
  chartTimeframeGainLossPct = 0;

  @ViewChild('portfolioChartContainer') chartContainer!: ElementRef;
  chart?: IChartApi;
  lineSeries?: ISeriesApi<'Area'>;
  resizeObserver?: ResizeObserver;

  portfolioChartPoints: any[] = [];
  private cashSub?: Subscription;
  private priceSubs: Subscription[] = [];

  private readonly SECTOR_COLORS: Record<string, string> = {
    Technology: '#00B0FF',
    'Software & Cloud': '#00E5FF',
    Semiconductors: '#00E676',
    Communication: '#F6C85F',
    Consumer: '#FFC400',
    'E-Commerce': '#FF6D00',
    Automotive: '#FF3D00',
    Financial: '#FF8A65',
    Healthcare: '#E040FB',
    'Biotech & Pharma': '#D500F9',
    Industrial: '#4DB6AC',
    'Aerospace & Defense': '#37474F',
    Energy: '#FF5722',
    Utilities: '#00BCD4',
    Materials: '#FFC107',
    RealEstate: '#E91E63',
    'Indices & ETFs': '#651FFF',
    Other: '#90A4AE'
  };

  private readonly TICKER_SECTORS: Record<string, string> = {
    // Technology
    AAPL: 'Technology',
    ORCL: 'Technology',
    CSCO: 'Technology',
    CRM: 'Software & Cloud',
    ADBE: 'Software & Cloud',
    MSFT: 'Software & Cloud',
    PLTR: 'Software & Cloud',
    SNOW: 'Software & Cloud',
    U: 'Software & Cloud',
    PATH: 'Software & Cloud',
    NET: 'Software & Cloud',
    DDOG: 'Software & Cloud',
    CRWD: 'Software & Cloud',
    
    // Semiconductors
    NVDA: 'Semiconductors',
    AMD: 'Semiconductors',
    AVGO: 'Semiconductors',
    QCOM: 'Semiconductors',
    TXN: 'Semiconductors',
    ASML: 'Semiconductors',
    INTC: 'Semiconductors',
    TSM: 'Semiconductors',
    SAP: 'Software & Cloud',

    // Communication
    GOOGL: 'Communication',
    GOOG: 'Communication',
    META: 'Communication',
    NFLX: 'Communication',
    DIS: 'Communication',
    VZ: 'Communication',
    T: 'Communication',
    CMCSA: 'Communication',
    TMUS: 'Communication',

    // Consumer
    WMT: 'Consumer',
    HD: 'Consumer',
    PG: 'Consumer',
    KO: 'Consumer',
    PEP: 'Consumer',
    COST: 'Consumer',
    NKE: 'Consumer',
    MCD: 'Consumer',
    SBUX: 'Consumer',
    TGT: 'Consumer',
    EL: 'Consumer',
    
    // E-Commerce
    AMZN: 'E-Commerce',
    BABA: 'E-Commerce',
    MELI: 'E-Commerce',
    SHOP: 'E-Commerce',
    EBAY: 'E-Commerce',
    ETSY: 'E-Commerce',

    // Automotive
    TSLA: 'Automotive',
    F: 'Automotive',
    GM: 'Automotive',
    RIVN: 'Automotive',
    LCID: 'Automotive',
    NIO: 'Automotive',
    XPEV: 'Automotive',
    LI: 'Automotive',
    BYDDY: 'Automotive',

    // Financial
    JPM: 'Financial',
    BAC: 'Financial',
    WFC: 'Financial',
    MS: 'Financial',
    GS: 'Financial',
    V: 'Financial',
    MA: 'Financial',
    AXP: 'Financial',
    'BRK.B': 'Financial',
    'BRK.A': 'Financial',
    BLK: 'Financial',
    C: 'Financial',
    PYPL: 'Financial',

    // Healthcare
    JNJ: 'Healthcare',
    UNH: 'Healthcare',
    PFE: 'Healthcare',
    TMO: 'Healthcare',
    ABT: 'Healthcare',
    CVS: 'Healthcare',
    ISRG: 'Healthcare',
    
    // Biotech & Pharma
    LLY: 'Biotech & Pharma',
    ABBV: 'Biotech & Pharma',
    MRK: 'Biotech & Pharma',
    BMY: 'Biotech & Pharma',
    AMGN: 'Biotech & Pharma',

    // Industrial
    GE: 'Industrial',
    CAT: 'Industrial',
    HON: 'Industrial',
    UNP: 'Industrial',
    UPS: 'Industrial',
    DE: 'Industrial',
    ADP: 'Industrial',
    GEV: 'Industrial',
    
    // Aerospace & Defense
    LMT: 'Aerospace & Defense',
    RTX: 'Aerospace & Defense',
    BA: 'Aerospace & Defense',

    // Energy
    XOM: 'Energy',
    CVX: 'Energy',
    SHEL: 'Energy',
    BP: 'Energy',
    COP: 'Energy',
    SLB: 'Energy',
    EOG: 'Energy',

    // Utilities
    NEE: 'Utilities',
    DUK: 'Utilities',
    SO: 'Utilities',
    D: 'Utilities',
    AEP: 'Utilities',

    // Materials
    LIN: 'Materials',
    APD: 'Materials',
    FCX: 'Materials',
    SHW: 'Materials',
    NUE: 'Materials',

    // Real Estate
    PLD: 'RealEstate',
    AMT: 'RealEstate',
    CCI: 'RealEstate',
    SPG: 'RealEstate',
    EQIX: 'RealEstate',

    // Indices & ETFs
    SPY: 'Indices & ETFs',
    QQQ: 'Indices & ETFs',
    DIA: 'Indices & ETFs',
    VOO: 'Indices & ETFs',
    IVV: 'Indices & ETFs',
    IWM: 'Indices & ETFs',
    VTI: 'Indices & ETFs'
  };

  private readonly TICKER_DIVIDENDS: Record<string, number> = {
    AAPL: 0.52,
    MSFT: 0.75,
    GOOGL: 0.44,
    GOOG: 0.44,
    META: 0.50,
    NVDA: 0.02,
    AMD: 0.0,
    TSLA: 0.0,
    AMZN: 0.0,
    NFLX: 0.0,
    JPM: 2.30,
    BAC: 2.45,
    WFC: 2.90,
    MS: 3.20,
    GS: 2.10,
    V: 0.72,
    MA: 0.55,
    PG: 2.40,
    KO: 3.10,
    PEP: 2.70,
    WMT: 1.38,
    COST: 0.50,
    XOM: 3.40,
    CVX: 4.10,
    LLY: 0.60,
    UNH: 1.35,
    PFE: 5.60,
    CAT: 1.70,
    GE: 0.28,
    RTX: 2.40,
    LMT: 2.75,
    SPY: 1.30,
    QQQ: 0.60,
    VOO: 1.32,
    IWM: 1.45,
    VTI: 1.35,
    O: 5.60,
    NEE: 2.20
  };

  private readonly TICKER_VOLATILITY: Record<string, number> = {
    KO: 1.8,
    PG: 1.9,
    PEP: 2.0,
    WMT: 2.2,
    JNJ: 2.1,
    PFE: 2.8,
    O: 2.0,
    NEE: 2.2,
    DUK: 2.3,
    
    AAPL: 5.2,
    MSFT: 4.8,
    GOOGL: 5.5,
    GOOG: 5.5,
    META: 6.2,
    JPM: 4.5,
    BAC: 4.8,
    V: 4.2,
    MA: 4.4,
    DIS: 5.0,
    SPY: 3.0,
    VOO: 3.0,
    VTI: 3.2,
    QQQ: 4.5,
    
    NVDA: 8.5,
    AMD: 8.8,
    TSLA: 9.2,
    PLTR: 8.9,
    AMZN: 6.8,
    NFLX: 7.2,
    AVGO: 7.0,
    QCOM: 7.5,
    ASML: 7.1,
    INTC: 7.4,
    TSM: 7.6,
    SHOP: 8.6,
    BABA: 7.8,
    RIVN: 9.8,
    NIO: 9.9
  };

  // Modal state
  showModal = false;
  modalMode: ModalMode = 'buy';
  modalTicker = '';
  modalCompany = '';
  modalHolding?: Holding;

  // Toast
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  toastTimer: any;
  private authSub?: Subscription;

  constructor(
    private portfolioApi: PortfolioApiService,
    private finnhub: FinnhubService,
    private cashService: CashService,
    private livePrice: LivePriceService,
    private logoService: LogoService,
    private router: Router,
    private authService: AuthService
  ) {}

  getLogoUrl(ticker: string): string | null {
    return this.logoService.getLogoUrl(ticker);
  }

  reportBrokenLogo(ticker: string): void {
    this.logoService.reportBrokenLogo(ticker);
  }

  compareStock(ticker: string): void {
    this.router.navigate(['/compare'], { queryParams: { add: ticker } });
  }

  get leaderboardHoldings(): EnrichedHolding[] {
    return [...this.holdings].sort((a, b) => b.gainLossPct - a.gainLossPct);
  }

  ngOnInit(): void {
    // Check first visit for onboarding
    if (!localStorage.getItem('sv_visited')) {
      this.isFirstVisit = true;
    }
    // Subscribe to live cash balance updates
    this.cashSub = this.cashService.getCashStream().subscribe(balance => {
      this.cashBalance = balance;
      this.calcTotals();
      // Only reload history if data has finished loading originally
      if (!this.loading && !this.error) {
        this.loadPortfolioHistory(this.selectedTimeframe);
      }
    });
    this.authSub = this.authService.currentUser$.subscribe(() => {
      this.loadData();
    });
    this.loadData();
  }

  ngAfterViewInit(): void {
    // Chart will be initialized after layout loads in loadData
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.remove();
    this.cashSub?.unsubscribe();
    this.authSub?.unsubscribe();
    this.unsubscribeFromLivePrices();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    this.portfolioApi.getHoldings().subscribe({
      next: holdings => {
        if (holdings.length === 0) {
          this.holdings = [];
          this.calcTotals();
          this.loading = false;
          this.unsubscribeFromLivePrices();
          // Trigger portfolio chart layout even if empty
          setTimeout(() => this.initPortfolioChart(), 100);
          return;
        }

        // Fetch quotes for all holdings, with custom rate limit fallback caching
        const quotes$ = holdings.map(h => 
          this.finnhub.getQuote(h.ticker).pipe(
            catchError(() => {
              const cachedPriceStr = localStorage.getItem(`quote-cache-${h.ticker}`);
              const fallbackPrice = cachedPriceStr ? parseFloat(cachedPriceStr) : h.avgPurchasePrice;
              return of({
                c: fallbackPrice,
                pc: fallbackPrice,
                d: 0,
                dp: 0,
                o: fallbackPrice,
                h: fallbackPrice,
                l: fallbackPrice
              });
            })
          )
        );

        // Find tickers whose sectors are not mapped and not cached in localStorage
        const missingTickers = holdings.map(h => h.ticker).filter(ticker => {
          return !this.TICKER_SECTORS[ticker] && !localStorage.getItem(`sector-cache-${ticker}`);
        });

        // Fetch profiles for missing tickers, piping catchError to return of(null)
        // so that a single stock's profile error won't crash the entire portfolio load.
        const profileRequests$ = missingTickers.map(ticker =>
          this.finnhub.getProfile(ticker).pipe(
            catchError(() => of(null))
          )
        );

        forkJoin({
          quotes: forkJoin(quotes$),
          profiles: profileRequests$.length > 0 ? forkJoin(profileRequests$) : of([])
        }).subscribe({
          next: ({ quotes, profiles }) => {
            // Cache successfully resolved profile industries
            missingTickers.forEach((ticker, idx) => {
              const prof = profiles[idx] as any;
              if (prof && prof.finnhubIndustry) {
                const sector = this.mapFinnhubIndustry(prof.finnhubIndustry);
                localStorage.setItem(`sector-cache-${ticker}`, sector);
              }
            });

            this.holdings = holdings.map((h, i) => {
              const price = quotes[i].c || quotes[i].pc || 0;
              if (price > 0) {
                localStorage.setItem(`quote-cache-${h.ticker}`, price.toString());
              }
              const totalCost = h.quantity * h.avgPurchasePrice;
              const currentValue = h.quantity * price;
              const gainLoss = currentValue - totalCost;
              const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
              return { ...h, currentPrice: price, currentValue, totalCost, gainLoss, gainLossPct };
            });

            this.calcTotals();
            this.loading = false;
            this.loadSparklines();
            
            // Build the portfolio chart container once DOM resolves
            setTimeout(() => {
              this.initPortfolioChart();
              this.loadPortfolioHistory(this.selectedTimeframe);
              this.subscribeToLivePrices();
            }, 100);
          },
          error: () => {
            this.error = 'Failed to fetch live stock prices.';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.error = 'Failed to load portfolio from server.';
        this.loading = false;
      }
    });
  }

  calcTotals(): void {
    this.totalInvested = this.holdings.reduce((s, h) => s + h.totalCost, 0);
    this.totalValue    = this.holdings.reduce((s, h) => s + h.currentValue, 0);
    this.netAssets     = this.totalValue + this.cashBalance;
    this.totalGainLoss = this.totalValue - this.totalInvested;
    this.totalGainLossPct = this.totalInvested > 0 ? (this.totalGainLoss / this.totalInvested) * 100 : 0;
    
    if (this.holdings.length > 0) {
      this.bestHolder = this.holdings.reduce((best, h) => h.gainLossPct > best.gainLossPct ? h : best, this.holdings[0]);
    } else {
      this.bestHolder = undefined;
    }

    this.buildDiversity();
    this.calculateDividendTracker();
    this.calculateRiskAudit();
  }

  private calculateDividendTracker(): void {
    let totalDividends = 0;
    this.dividendHoldings = [];
    
    this.holdings.forEach(h => {
      const yieldPct = this.TICKER_DIVIDENDS[h.ticker] !== undefined ? this.TICKER_DIVIDENDS[h.ticker] : 0.5;
      const annualPayout = h.quantity * h.currentPrice * (yieldPct / 100);
      totalDividends += annualPayout;
      this.dividendHoldings.push({
        ticker: h.ticker,
        yield: yieldPct,
        annualPayout
      });
    });
    
    this.projectedDividends = totalDividends;
    this.averageYield = this.totalValue > 0 ? (totalDividends / this.totalValue) * 100 : 0.0;
  }

  private calculateRiskAudit(): void {
    if (this.holdings.length === 0) {
      this.riskScore = 1.0;
      this.sectorRiskScore = 1.0;
      this.volRiskScore = 1.0;
      this.riskLevel = 'Low';
      this.riskClass = 'risk-low';
      this.riskAnalysisText = 'No active holdings to analyze.';
      return;
    }

    // 1. Sector Concentration (HHI)
    let sumSqWeights = 0;
    this.sectorAllocation.forEach(sector => {
      const weight = sector.pct / 100;
      sumSqWeights += weight * weight;
    });
    
    this.sectorRiskScore = Math.max(1, Math.min(10, 1 + 9 * sumSqWeights));

    // 2. Weighted Volatility Score
    let weightedVolSum = 0;
    this.holdings.forEach(h => {
      const vol = this.TICKER_VOLATILITY[h.ticker] !== undefined ? this.TICKER_VOLATILITY[h.ticker] : 5.0;
      weightedVolSum += h.currentValue * vol;
    });
    
    this.volRiskScore = this.totalValue > 0 ? weightedVolSum / this.totalValue : 5.0;

    // 3. Combined Risk Score
    const combined = 0.4 * this.sectorRiskScore + 0.6 * this.volRiskScore;
    this.riskScore = Math.max(1, Math.min(10, combined));

    // Set level and class
    if (this.riskScore < 4.0) {
      this.riskLevel = 'Low';
      this.riskClass = 'risk-low';
    } else if (this.riskScore < 7.0) {
      this.riskLevel = 'Moderate';
      this.riskClass = 'risk-med';
    } else {
      this.riskLevel = 'High';
      this.riskClass = 'risk-high';
    }

    // Customized description
    if (this.riskScore >= 7.0) {
      if (this.sectorRiskScore > 7.0) {
        this.riskAnalysisText = 'Your portfolio is heavily concentrated in a single sector and dominated by high-beta assets. You are highly exposed to systemic selloffs in this industry. Diversifying into defensive sectors is strongly recommended.';
      } else {
        this.riskAnalysisText = 'Your portfolio has standard diversification, but is comprised of highly volatile growth assets (e.g. tech, semiconductors). Be prepared for high daily swings and potential macro drawdowns.';
      }
    } else if (this.riskScore >= 4.0) {
      this.riskAnalysisText = 'Your portfolio presents a balanced risk-return profile. You have moderate exposure to growth tech sectors balanced with some sector distribution. Volatility remains controlled.';
    } else {
      this.riskAnalysisText = 'Excellent allocation! Your portfolio is beautifully diversified across defensive sectors and stable assets. This indicates a high level of shock resistance and a steady growth curve.';
    }
  }

  dismissOnboarding(): void {
    this.isFirstVisit = false;
    localStorage.setItem('sv_visited', '1');
  }

  calcBreakEven(h: EnrichedHolding): number {
    // Break-even = avg price + 0.1% spread approximation
    return h.avgPurchasePrice * 1.001;
  }

  costBasisPct(h: EnrichedHolding): number {
    if (h.totalCost === 0) return 100;
    return Math.min(200, (h.currentValue / h.totalCost) * 100);
  }

  getSparklinePath(ticker: string): string {
    const prices = this.sparklineData.get(ticker);
    if (!prices || prices.length < 2) return '';
    const w = 80, h = 28;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const step = w / (prices.length - 1);
    return prices.map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  getSparklineColor(ticker: string): string {
    const prices = this.sparklineData.get(ticker);
    if (!prices || prices.length < 2) return '#0ea5e9';
    return prices[prices.length - 1] >= prices[0] ? '#10b981' : '#f43f5e';
  }

  private loadSparklines(): void {
    this.holdings.forEach(h => {
      this.portfolioApi.getRealStockCandles(h.ticker, '1M').subscribe({
        next: (candles) => {
          if (candles && candles.length > 0) {
            // Get the close prices of the last 7 trading days
            const closes = candles.map(c => c.close).slice(-7);
            this.sparklineData.set(h.ticker, closes);
          }
        },
        error: () => {} // silently ignore
      });
    });
  }

  exportPortfolioCard(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw premium background gradient
    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, '#0b0f19');
    grad.addColorStop(1, '#1b233a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);
    
    // Draw glassmorphic border/glowing ring
    ctx.strokeStyle = 'rgba(108,99,255,0.2)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 596, 396);
    
    // Draw a premium purple accent glow on top right
    const glow = ctx.createRadialGradient(500, 50, 10, 500, 50, 200);
    glow.addColorStop(0, 'rgba(108, 99, 255, 0.15)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 600, 400);

    // Draw brand title
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('StockVault', 40, 50);
    
    // Draw a small icon next to it
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(30, 42, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw subtitle / Date
    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    const dateStr = new Date().toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    ctx.fillText(`Official Portfolio Report · ${dateStr}`, 40, 75);
    
    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 95);
    ctx.lineTo(560, 95);
    ctx.stroke();
    
    // Draw Net Assets label
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('PORTFOLIO VALUE', 40, 130);
    
    // Draw Net Assets value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    const netAssetsStr = `$${this.netAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    ctx.fillText(netAssetsStr, 40, 175);
    
    // Draw Cash & Invested side info
    ctx.fillStyle = '#64748b';
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Stocks: $${this.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 40, 205);
    ctx.fillText(`Buying Power: $${this.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 40, 225);

    // Draw total Return
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('TOTAL INVESTMENT RETURN', 320, 130);
    
    const pnlColor = this.totalGainLoss >= 0 ? '#00d395' : '#ff4560';
    ctx.fillStyle = pnlColor;
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    const signStr = this.totalGainLoss >= 0 ? '+' : '';
    const pnlStr = `${signStr}$${this.totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    ctx.fillText(pnlStr, 320, 170);
    
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    const pctStr = `${signStr}${this.totalGainLossPct.toFixed(2)}%`;
    ctx.fillText(pctStr, 320, 195);
    
    // Draw Second Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(40, 245);
    ctx.lineTo(560, 245);
    ctx.stroke();
    
    // Draw Top Holdings Section
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('TOP HOLDINGS', 40, 275);
    
    ctx.font = '13px system-ui, -apple-system, sans-serif';
    const topHoldings = [...this.holdings]
      .sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 3);
      
    if (topHoldings.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.fillText('No active stock holdings yet.', 40, 305);
    } else {
      topHoldings.forEach((h, idx) => {
        const yPos = 305 + idx * 25;
        // Dot indicator
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.arc(45, yPos - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
        ctx.fillText(h.ticker, 60, yPos);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${h.quantity.toFixed(4)} shares`, 130, yPos);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        const valStr = `$${h.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        ctx.fillText(valStr, 230, yPos);
        
        // Pnl for this holding
        const holdPnlColor = h.gainLoss >= 0 ? '#00d395' : '#ff4560';
        ctx.fillStyle = holdPnlColor;
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        const holdPnlSign = h.gainLoss >= 0 ? '+' : '';
        ctx.fillText(`${holdPnlSign}${h.gainLossPct.toFixed(2)}%`, 340, yPos);
      });
    }
    
    // Draw footer signature
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = 'italic 10px system-ui, -apple-system, sans-serif';
    ctx.fillText('Generated on stockvault.premium.web', 380, 375);
    
    // Download logic
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `StockVault_Portfolio_${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    link.click();
    
    this.showToast('Portfolio Share Card downloaded successfully!', 'success');
  }

  // ── Portfolio Chart Handlers ──
  private initPortfolioChart(): void {
    if (!this.chartContainer) return;
    
    // Clean up old chart
    this.resizeObserver?.disconnect();
    this.chart?.remove();

    const initialWidth = this.chartContainer.nativeElement.clientWidth || 800;
    this.chart = createChart(this.chartContainer.nativeElement, {
      width: initialWidth,
      height: 380,
      layout: {
        background: { color: 'transparent' },
        textColor: '#64748b'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' }
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        lockVisibleTimeRangeOnResize: true,
        rightOffset: 3,
        fixLeftEdge: true,
        fixRightEdge: true
      },
      handleScroll: {
        mouseWheel: false, // Prevents page scrolling with wheel from distorting the chart
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: false,
        pinch: true
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(14,165,233,0.3)', width: 1, style: 3 },
        horzLine: { color: 'rgba(14,165,233,0.3)', width: 1, style: 3 }
      }
    });

    this.lineSeries = this.chart.addSeries(AreaSeries, {
      lineColor: '#10b981',
      topColor: 'rgba(16, 185, 129, 0.22)',
      bottomColor: 'rgba(16, 185, 129, 0.02)',
      lineWidth: 2
    });

    // Resize observer
    this.resizeObserver = new ResizeObserver(entries => {
      if (!entries.length || entries[0].target !== this.chartContainer.nativeElement) return;
      const width = entries[0].contentRect.width;
      if (width > 0 && this.chart) {
        this.chart.applyOptions({ width });
        this.chart.timeScale().fitContent();
      }
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  loadPortfolioHistory(tf: string): void {
    this.selectedTimeframe = tf;
    if (!this.chart) return;

    this.chartLoading = true;
    const now = Math.floor(Date.now() / 1000);

    // If portfolio is empty, just render a flat cash balance line
    if (this.holdings.length === 0) {
      const dummyPoints = [];
      let pointsCount = 30;
      let interval = 24 * 60 * 60;
      if (tf === '1D') { pointsCount = 20; interval = 20 * 60; }
      else if (tf === '1W') { pointsCount = 24; interval = 4 * 60 * 60; }
      
      for (let i = 0; i < pointsCount; i++) {
        dummyPoints.push({
          time: (now - (pointsCount - i) * interval) as Time,
          value: this.cashBalance
        });
      }
      
      this.portfolioChartPoints = dummyPoints;
      this.lineSeries?.setData(dummyPoints);
      this.chartTimeframeGainLoss = 0;
      this.chartTimeframeGainLossPct = 0;
      
      this.lineSeries?.applyOptions({
        lineColor: '#64748b',
        topColor: 'rgba(148, 163, 184, 0.15)',
        bottomColor: 'rgba(148, 163, 184, 0.02)'
      });

      this.chart?.timeScale().fitContent();
      this.chartLoading = false;
      return;
    }

    // Fetch history for all stock holdings in parallel
    const historicalRequests = this.holdings.map(h => 
      this.portfolioApi.getRealStockCandles(h.ticker, tf)
    );

    forkJoin(historicalRequests).subscribe({
      next: (stockHistoryList) => {
        const timeMap = new Map<number, { [ticker: string]: number }>();
        const allTimestamps = new Set<number>();

        // Build mappings of timestamp -> stock closes
        stockHistoryList.forEach((candles, idx) => {
          const ticker = this.holdings[idx].ticker;
          candles.forEach(candle => {
            const time = typeof candle.time === 'number' ? candle.time : (candle.time as any).timestamp || candle.time;
            allTimestamps.add(time);
            if (!timeMap.has(time)) {
              timeMap.set(time, {});
            }
            timeMap.get(time)![ticker] = candle.close;
          });
        });

        // Chronologically sort all timestamps
        const sortedTimes = Array.from(allTimestamps).sort((a, b) => a - b);
        const lastPrices: Record<string, number> = {};
        
        // Seed initial known prices
        this.holdings.forEach(h => {
          lastPrices[h.ticker] = h.currentPrice;
        });

        // Merge price points by timestamp
        const chartPoints = sortedTimes.map(t => {
          const pricesAtTime = timeMap.get(t)!;
          let stocksTotal = 0;
          
          this.holdings.forEach(h => {
            if (pricesAtTime[h.ticker] !== undefined) {
              lastPrices[h.ticker] = pricesAtTime[h.ticker];
            }
            stocksTotal += h.quantity * lastPrices[h.ticker];
          });

          return {
            time: t as Time,
            value: this.cashBalance + stocksTotal
          };
        });

        if (chartPoints.length < 2) {
          this.chartLoading = false;
          return;
        }

        // Apply data to lightweight-charts
        this.portfolioChartPoints = chartPoints;
        this.lineSeries?.setData(chartPoints);

        // Compute performance metrics for this specific timeframe
        const firstPointVal = chartPoints[0].value;
        const lastPointVal = chartPoints[chartPoints.length - 1].value;
        this.chartTimeframeGainLoss = lastPointVal - firstPointVal;
        this.chartTimeframeGainLossPct = firstPointVal > 0 ? (this.chartTimeframeGainLoss / firstPointVal) * 100 : 0;

        // Apply color based on timeframe direction
        const isUp = this.chartTimeframeGainLoss >= 0;
        this.lineSeries?.applyOptions({
          lineColor: isUp ? '#00d395' : '#ff4560',
          topColor: isUp ? 'rgba(0, 211, 149, 0.22)' : 'rgba(255, 69, 96, 0.22)',
          bottomColor: isUp ? 'rgba(0, 211, 149, 0.02)' : 'rgba(255, 69, 96, 0.02)'
        });

        // Subscribe to crosshair events to display interactive tooltip updates
        this.chart?.subscribeCrosshairMove(param => {
          if (!param.time || param.point === undefined || !param.seriesData) {
            this.hoveredValue = null;
            this.hoveredChange = null;
            this.hoveredChangePct = null;
            this.hoveredDate = null;
            return;
          }

          const hoverPoint = param.seriesData.get(this.lineSeries!) as any;
          if (hoverPoint && hoverPoint.value !== undefined) {
            this.hoveredValue = hoverPoint.value;
            this.hoveredChange = hoverPoint.value - firstPointVal;
            this.hoveredChangePct = firstPointVal > 0 ? (this.hoveredChange / firstPointVal) * 100 : 0;

            const tVal = param.time;
            if (typeof tVal === 'number') {
              const d = new Date(tVal * 1000);
              const hasTime = tf === '1D' || tf === '1W';
              this.hoveredDate = d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: hasTime ? '2-digit' : undefined,
                minute: hasTime ? '2-digit' : undefined
              });
            } else {
              this.hoveredDate = String(tVal);
            }
          }
        });

        setTimeout(() => {
          this.chart?.timeScale().fitContent();
        }, 80);

        this.chartLoading = false;
      },
      error: (err) => {
        console.error('Failed to query portfolio history points:', err);
        this.chartLoading = false;
      }
    });
  }

  // ── Cash Balance Drawer Controls ──
  openCashDrawer(mode: 'deposit' | 'withdraw'): void {
    if (!this.authService.isLoggedIn()) {
      this.authService.openAuthModal('login', `Sign in or create an account to ${mode} funds to your portfolio.`);
      return;
    }
    this.cashDrawerMode = mode;
    this.cashAmount = null;
    this.cashDrawerError = '';
    this.cashDrawerSuccess = '';
    this.showCashDrawer = true;
  }

  submitCashTransaction(): void {
    this.cashDrawerError = '';
    this.cashDrawerSuccess = '';

    if (this.cashAmount === null || this.cashAmount <= 0) {
      this.cashDrawerError = 'Please enter a valid positive amount.';
      return;
    }

    if (this.cashDrawerMode === 'deposit') {
      this.cashService.deposit(this.cashAmount);
      this.cashDrawerSuccess = `Successfully deposited $${this.cashAmount.toFixed(2)} to Buying Power!`;
      setTimeout(() => {
        this.showCashDrawer = false;
        this.loadPortfolioHistory(this.selectedTimeframe);
      }, 1500);
    } else {
      const ok = this.cashService.withdraw(this.cashAmount);
      if (ok) {
        this.cashDrawerSuccess = `Successfully withdrew $${this.cashAmount.toFixed(2)} from Buying Power!`;
        setTimeout(() => {
          this.showCashDrawer = false;
          this.loadPortfolioHistory(this.selectedTimeframe);
        }, 1500);
      } else {
        this.cashDrawerError = 'Insufficient cash balance for this withdrawal.';
      }
    }
  }

  private getSector(ticker: string): string {
    if (this.TICKER_SECTORS[ticker]) {
      return this.TICKER_SECTORS[ticker];
    }
    const cached = localStorage.getItem(`sector-cache-${ticker}`);
    if (cached) {
      return cached;
    }
    return 'Other';
  }

  private mapFinnhubIndustry(ind: string): string {
    if (!ind) return 'Other';
    const lower = ind.toLowerCase();
    
    // Index ETFs / Funds
    if (lower.includes('etf') || lower.includes('fund') || lower.includes('index') || lower.includes('trust')) {
      return 'Indices & ETFs';
    }
    
    // Semiconductors
    if (lower.includes('semiconductor')) {
      return 'Semiconductors';
    }
    
    // Software & Cloud
    if (lower.includes('software') || lower.includes('cloud') || lower.includes('internet services')) {
      return 'Software & Cloud';
    }
    
    // Technology / Hardware
    if (lower.includes('technology') || lower.includes('hardware') || lower.includes('electronics') || lower.includes('computer')) {
      return 'Technology';
    }
    
    // Communication / Media / Telecom
    if (lower.includes('telecommunication') || lower.includes('media') || lower.includes('broadcasting') || lower.includes('communication') || lower.includes('entertainment')) {
      return 'Communication';
    }
    
    // Automotive
    if (lower.includes('automobile') || lower.includes('car') || lower.includes('vehicle') || lower.includes('automotive')) {
      return 'Automotive';
    }
    
    // E-Commerce
    if (lower.includes('e-commerce') || lower.includes('online retail') || lower.includes('internet retail')) {
      return 'E-Commerce';
    }
    
    // Consumer Products / Services / Food
    if (lower.includes('retail') || lower.includes('consumer') || lower.includes('food') || lower.includes('beverage') || lower.includes('restaurant') || lower.includes('leisure') || lower.includes('apparel') || lower.includes('household') || lower.includes('personal')) {
      return 'Consumer';
    }
    
    // Financial / Banking / Insurance
    if (lower.includes('financial') || lower.includes('banking') || lower.includes('bank') || lower.includes('insurance') || lower.includes('diversified financials') || lower.includes('capital markets')) {
      return 'Financial';
    }
    
    // Biotech & Pharma
    if (lower.includes('pharmaceutical') || lower.includes('biotechnology') || lower.includes('biotech')) {
      return 'Biotech & Pharma';
    }
    
    // Healthcare Providers / Equipment
    if (lower.includes('health') || lower.includes('medical') || lower.includes('life sciences')) {
      return 'Healthcare';
    }
    
    // Aerospace & Defense
    if (lower.includes('aerospace') || lower.includes('defense') || lower.includes('military')) {
      return 'Aerospace & Defense';
    }
    
    // Industrial / Machinery / Logistics
    if (lower.includes('industrial') || lower.includes('machinery') || lower.includes('construction') || lower.includes('logistics') || lower.includes('transportation') || lower.includes('conglomerates')) {
      return 'Industrial';
    }
    
    // Energy / Oil / Gas
    if (lower.includes('energy') || lower.includes('oil') || lower.includes('gas') || lower.includes('petroleum') || lower.includes('coal')) {
      return 'Energy';
    }
    
    // Utilities
    if (lower.includes('utility') || lower.includes('utilities') || lower.includes('water') || lower.includes('electricity')) {
      return 'Utilities';
    }
    
    // Materials / Chemicals / Mining
    if (lower.includes('material') || lower.includes('chemical') || lower.includes('metal') || lower.includes('mining') || lower.includes('steel') || lower.includes('paper') || lower.includes('forest')) {
      return 'Materials';
    }
    
    // Real Estate
    if (lower.includes('real estate') || lower.includes('reit') || lower.includes('property')) {
      return 'RealEstate';
    }
    
    return 'Other';
  }

  private buildDiversity(): void {
    const totals = this.holdings.reduce((acc, h) => {
      const sector = this.getSector(h.ticker);
      acc[sector] = (acc[sector] || 0) + h.currentValue;
      return acc;
    }, {} as Record<string, number>);

    const sectorTickers = this.holdings.reduce((acc, h) => {
      const sector = this.getSector(h.ticker);
      if (!acc[sector]) {
        acc[sector] = [];
      }
      if (!acc[sector].includes(h.ticker)) {
        acc[sector].push(h.ticker);
      }
      return acc;
    }, {} as Record<string, string[]>);

    this.sectorAllocation = Object.entries(totals)
      .map(([sector, value]) => ({
        sector,
        value,
        pct: this.totalValue > 0 ? (value / this.totalValue) * 100 : 0,
        color: this.SECTOR_COLORS[sector] || this.SECTOR_COLORS['Other'],
        tickers: sectorTickers[sector] || []
      }))
      .sort((a, b) => b.value - a.value);

    let cursor = 0;
    const segments = this.sectorAllocation
      .filter(item => item.pct > 0)
      .map((item, idx, arr) => {
        const start = cursor;
        const end = (idx === arr.length - 1) ? 100 : cursor + item.pct;
        cursor = end;
        return `${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      });

    this.diversityBackground = segments.length
      ? `conic-gradient(${segments.join(', ')})`
      : 'rgba(255,255,255,0.05)';
  }

  openModal(mode: ModalMode, h: EnrichedHolding): void {
    if (!this.authService.isLoggedIn()) {
      this.authService.openAuthModal('login', `Sign in or create an account to ${mode === 'buy' ? 'purchase' : 'sell'} shares of ${h.ticker}.`);
      return;
    }
    this.modalMode = mode;
    this.modalTicker = h.ticker;
    this.modalCompany = h.company;
    this.modalHolding = h;
    this.showModal = true;
  }

  onModalSuccess(): void {
    this.showToast(`${this.modalMode === 'buy' ? 'Purchase' : 'Sale'} successful!`, 'success');
    this.loadData();
  }

  showToast(msg: string, type: 'success' | 'error'): void {
    this.toastMsg = msg;
    this.toastType = type;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMsg = '', 4000);
  }

  varClass(v: number): string {
    return v > 0 ? 'text-positive' : v < 0 ? 'text-negative' : 'text-neutral';
  }

  sign(v: number): string { return v > 0 ? '+' : ''; }

  trackById(_: number, h: Holding): string { return h._id || h.ticker; }

  unsubscribeFromLivePrices(): void {
    this.priceSubs.forEach(sub => sub.unsubscribe());
    this.priceSubs = [];
  }

  subscribeToLivePrices(): void {
    this.unsubscribeFromLivePrices();

    if (this.holdings.length === 0) return;

    this.holdings.forEach(h => {
      const sub = this.livePrice.getPriceStream(h.ticker).subscribe({
        next: (data) => {
          if (data) {
            h.currentPrice = data.currentPrice;
            h.currentValue = h.quantity * data.currentPrice;
            h.gainLoss = h.currentValue - h.totalCost;
            h.gainLossPct = h.totalCost > 0 ? (h.gainLoss / h.totalCost) * 100 : 0;

            this.calcTotals();
            this.updateLiveChartPoint(this.netAssets);
          }
        }
      });
      this.priceSubs.push(sub);
    });
  }

  updateLiveChartPoint(latestNetAssets: number): void {
    if (this.portfolioChartPoints && this.portfolioChartPoints.length > 0 && this.lineSeries) {
      const lastIndex = this.portfolioChartPoints.length - 1;
      this.portfolioChartPoints[lastIndex].value = latestNetAssets;
      
      // Perform single-point update instead of drawing the entire data set again
      this.lineSeries.update(this.portfolioChartPoints[lastIndex]);

      // Recompute timeframe stats dynamically relative to the first point of the timeframe
      const firstPointVal = this.portfolioChartPoints[0].value;
      const lastPointVal = latestNetAssets;
      this.chartTimeframeGainLoss = lastPointVal - firstPointVal;
      this.chartTimeframeGainLossPct = firstPointVal > 0 ? (this.chartTimeframeGainLoss / firstPointVal) * 100 : 0;

      // Apply dynamic green/red styling in real-time
      const isUp = this.chartTimeframeGainLoss >= 0;
      this.lineSeries.applyOptions({
        lineColor: isUp ? '#00d395' : '#ff4560',
        topColor: isUp ? 'rgba(0, 211, 149, 0.22)' : 'rgba(255, 69, 96, 0.22)',
        bottomColor: isUp ? 'rgba(0, 211, 149, 0.02)' : 'rgba(255, 69, 96, 0.02)'
      });
    }
  }
}
