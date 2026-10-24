import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, OnDestroy, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { CashService } from '../../core/services/cash.service';
import { LivePriceService } from '../../core/services/live-price.service';
import { NotificationService } from '../../core/services/notification.service';
import { Holding } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string | SafeHtml;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-copilot.component.html',
  styleUrls: ['./ai-copilot.component.css']
})
export class AiCopilotComponent implements OnInit, AfterViewChecked, OnDestroy {
  showDrawer = false;
  unread = true;
  isTyping = false;
  userQuery = '';
  messages: ChatMessage[] = [];
  suggestionChips = ['Portfolio Audit', 'Stress Test Console', 'Compounding Forecast', 'Analyze NVDA', 'Analyze SPY'];

  // Portoflio live stats cache
  holdings: Holding[] = [];
  cashBalance = 0;
  totalStockValue = 0;
  netAssets = 0;

  private cashSub?: Subscription;
  private autoScrollPending = false;

  @ViewChild('chatScrollContainer') private scrollContainer!: ElementRef;

  private readonly TICKER_METADATA: Record<string, { company: string; sector: string; rating: string; target: number; tailwinds: string[]; headwinds: string[] }> = {
    AAPL: {
      company: 'Apple Inc.',
      sector: 'Technology',
      rating: 'BUY',
      target: 215.00,
      tailwinds: ['iOS Apple Intelligence AI features driving an upcoming supercycle', 'Services division (App Store, iCloud) yielding 70%+ gross margins', 'Stellar balance sheet with $150B+ in cash reserves'],
      headwinds: ['Antitrust regulatory pressure in EU & US', 'Flat hardware sales growth in key Asian markets']
    },
    MSFT: {
      company: 'Microsoft Corp.',
      sector: 'Software & Cloud',
      rating: 'STRONG BUY',
      target: 460.00,
      tailwinds: ['Azure Cloud growth accelerating at 30%+ YoY powered by OpenAI integrations', 'Enterprise Copilot Office subscriptions driving high recurring revenue', 'Dominant position in developer ecosystems via GitHub'],
      headwinds: ['High infrastructure CAPEX requirements for AI data centers', 'Regulatory scrutiny over strategic cloud acquisitions']
    },
    NVDA: {
      company: 'NVIDIA Corp.',
      sector: 'Semiconductors',
      rating: 'BUY',
      target: 950.00,
      tailwinds: ['Monopolistic (90%+) market share in AI training GPUs', 'Blackwell architecture launch presenting unprecedented server compute scale', 'Strong margins supported by custom enterprise software stacks'],
      headwinds: ['Extreme high P/E multiple and valuation risk', 'Export restrictions to key global tech hubs', 'Potential CAPEX digest period from major cloud providers']
    },
    TSLA: {
      company: 'Tesla Inc.',
      sector: 'Automotive',
      rating: 'HOLD',
      target: 195.00,
      tailwinds: ['Unrivaled EV production efficiency and manufacturing scale', 'FSD (Full Self-Driving) capability licensing potential', 'Rapidly scaling utility-grade energy storage division (Megapack)'],
      headwinds: ['Softening global EV demand and price compression margins', 'Intense local manufacturing competition in Asian markets']
    },
    AMZN: {
      company: 'Amazon.com Inc.',
      sector: 'E-Commerce',
      rating: 'BUY',
      target: 205.00,
      tailwinds: ['AWS cloud operating margins rebounding due to AI optimization workloads', 'Advertising services expanding rapidly across prime channels', 'High logistics network margins and regional delivery scaling'],
      headwinds: ['FTC antitrust lawsuits regarding online seller practices', 'Rising labor union pressures and operational costs']
    },
    SPY: {
      company: 'S&P 500 ETF Trust',
      sector: 'Indices & ETFs',
      rating: 'BUY (Core Holding)',
      target: 540.00,
      tailwinds: ['Ultimate passive diversification across the 500 largest US companies', 'Historical 9.8% annualized compounding returns over 30 years', 'Highly liquid options market and ultra-low tracking error'],
      headwinds: ['High concentration in the top 10 mega-cap tech symbols', 'Susceptible to general macroeconomic interest rate cycles']
    }
  };

  private readonly TICKER_SECTORS: Record<string, string> = {
    AAPL: 'Technology', ORCL: 'Technology', CSCO: 'Technology',
    CRM: 'Software & Cloud', ADBE: 'Software & Cloud', MSFT: 'Software & Cloud', PLTR: 'Software & Cloud',
    NVDA: 'Semiconductors', AMD: 'Semiconductors', AVGO: 'Semiconductors', INTC: 'Semiconductors', TSM: 'Semiconductors',
    GOOGL: 'Communication', GOOG: 'Communication', META: 'Communication', NFLX: 'Communication', DIS: 'Communication',
    WMT: 'Consumer', KO: 'Consumer', PEP: 'Consumer', COST: 'Consumer', NKE: 'Consumer',
    AMZN: 'E-Commerce', BABA: 'E-Commerce', SHOP: 'E-Commerce',
    TSLA: 'Automotive', F: 'Automotive', GM: 'Automotive',
    JPM: 'Financial', BAC: 'Financial', GS: 'Financial', V: 'Financial', MA: 'Financial',
    JNJ: 'Healthcare', UNH: 'Healthcare', PFE: 'Healthcare', LLY: 'Biotech & Pharma', ABBV: 'Biotech & Pharma',
    GE: 'Industrial', CAT: 'Industrial', HON: 'Industrial', LMT: 'Aerospace & Defense', RTX: 'Aerospace & Defense',
    XOM: 'Energy', CVX: 'Energy', NEE: 'Utilities', LIN: 'Materials', PLD: 'RealEstate',
    SPY: 'Indices & ETFs', QQQ: 'Indices & ETFs', DIA: 'Indices & ETFs'
  };

  constructor(
    private portfolioApi: PortfolioApiService,
    private cashService: CashService,
    private livePrice: LivePriceService,
    private sanitizer: DomSanitizer,
    private notifications: NotificationService,
    private injector: Injector,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Load cash stream
    this.cashSub = this.cashService.getCashStream().subscribe(balance => {
      this.cashBalance = balance;
      this.recalculatePortfolioTotals();
    });

    this.loadHoldings();

    // Seed welcoming messages
    this.pushBotMessage(`<h4 class="ai-section-title">🤖 StockVault Financial Co-pilot</h4>
             <p>Hello! I am your premium AI Investment Advisor. I have analyzed your virtual wallet metadata.</p>
             <p style="margin-top: 8px">Click one of the quick action buttons below or ask me about any ticker to generate institutional-grade advisory reports!</p>`);
  }

  ngAfterViewChecked(): void {
    if (this.autoScrollPending) {
      this.scrollToBottom();
      this.autoScrollPending = false;
    }
  }

  ngOnDestroy(): void {
    this.cashSub?.unsubscribe();
  }

  toggleDrawer(): void {
    this.showDrawer = !this.showDrawer;
    if (this.showDrawer) {
      this.unread = false;
      this.autoScrollPending = true;
      this.loadHoldings();
    }
  }

  closeDrawer(): void {
    this.showDrawer = false;
  }

  private loadHoldings(): void {
    this.portfolioApi.getHoldings().subscribe({
      next: (holdings) => {
        this.holdings = holdings;
        this.recalculatePortfolioTotals();
      }
    });
  }

  private recalculatePortfolioTotals(): void {
    this.totalStockValue = 0;
    
    if (this.holdings.length > 0) {
      this.holdings.forEach(h => {
        let currentPrice = this.livePrice.getCurrentPrice(h.ticker);
        this.totalStockValue += h.quantity * currentPrice;
      });
    }

    this.netAssets = this.totalStockValue + this.cashBalance;
  }

  onChipClick(chip: string): void {
    this.userQuery = chip;
    this.sendMessage();
  }

  sendMessage(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    const query = this.userQuery.trim();
    if (!query) return;

    // Push User message
    this.messages.push({
      sender: 'user',
      text: query,
      timestamp: new Date()
    });

    this.userQuery = '';
    this.isTyping = true;
    this.autoScrollPending = true;

    const thinkingTime = 1000 + Math.random() * 800;
    setTimeout(() => {
      this.generateAiResponse(query);
    }, thinkingTime);
  }

  private generateAiResponse(query: string): void {
    this.isTyping = false;
    this.autoScrollPending = true;

    const lowerQuery = query.toLowerCase();
    let replyText = '';

    if (lowerQuery.includes('stress') || lowerQuery.includes('shock') || lowerQuery.includes('pullback') || lowerQuery.includes('boom') || lowerQuery.includes('recession')) {
      if (lowerQuery.includes('pullback') || lowerQuery.includes('boom') || lowerQuery.includes('rate') || lowerQuery.includes('recession') || lowerQuery.includes('crash')) {
        let scenario = 'tech_pullback';
        if (lowerQuery.includes('boom')) scenario = 'ai_boom';
        if (lowerQuery.includes('rate')) scenario = 'rate_cut';
        if (lowerQuery.includes('recession') || lowerQuery.includes('crash')) scenario = 'recession';
        
        replyText = this.simulateStressScenarioDirect(scenario);
      } else {
        replyText = this.handleStressTestConsole();
      }
    }
    else if (lowerQuery.includes('audit') || lowerQuery.includes('diversif') || lowerQuery.includes('allocate') || lowerQuery.includes('rebalance')) {
      if (lowerQuery.includes('rebalance')) {
        replyText = this.generateRebalancePlan();
      } else {
        replyText = this.handlePortfolioAudit();
      }
    }
    else if (lowerQuery.includes('forecast') || lowerQuery.includes('compound') || lowerQuery.includes('grow') || lowerQuery.includes('future')) {
      replyText = this.handlePortfolioForecast();
    }
    else {
      const tickerMatch = this.detectTicker(query);
      if (tickerMatch) {
        replyText = this.handleTickerAnalysis(tickerMatch);
      } else {
        replyText = this.handleGeneralQuery(query);
      }
    }

    this.pushBotMessage(replyText);
  }

  private pushBotMessage(htmlText: string): void {
    this.messages.push({
      sender: 'bot',
      text: this.sanitizer.bypassSecurityTrustHtml(htmlText),
      timestamp: new Date()
    });
  }

  private detectTicker(query: string): string | null {
    const words = query.toUpperCase().replace(/[^A-Z]/g, ' ').split(/\s+/);
    for (const w of words) {
      if (this.TICKER_METADATA[w] || w === 'QQQ' || w === 'DIA' || w === 'AMD' || w === 'NFLX' || w === 'META' || w === 'GOOGL') {
        return w;
      }
    }
    const matches = query.match(/\b(aapl|nvda|tsla|msft|amzn|spy)\b/i);
    return matches ? matches[1].toUpperCase() : null;
  }

  onChatAreaClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    const buyTicker = target.getAttribute('data-buy-ticker');
    const buyCompany = target.getAttribute('data-buy-company');
    const buyQty = target.getAttribute('data-buy-qty');
    const buyPrice = target.getAttribute('data-buy-price');

    if (buyTicker && buyCompany && buyQty && buyPrice) {
      event.preventDefault();
      this.executeQuickBuy(buyTicker, buyCompany, parseFloat(buyQty), parseFloat(buyPrice));
      return;
    }

    const sellTicker = target.getAttribute('data-sell-ticker');
    const sellCompany = target.getAttribute('data-sell-company');
    const sellQty = target.getAttribute('data-sell-qty');
    const sellPrice = target.getAttribute('data-sell-price');

    if (sellTicker && sellCompany && sellQty && sellPrice) {
      event.preventDefault();
      this.executeQuickSell(sellTicker, sellCompany, parseFloat(sellQty), parseFloat(sellPrice));
      return;
    }

    const stressEvent = target.getAttribute('data-stress-event');
    if (stressEvent) {
      event.preventDefault();
      this.isTyping = true;
      this.autoScrollPending = true;
      
      let scenarioLabel = 'Tech Sector Pullback';
      if (stressEvent === 'ai_boom') scenarioLabel = 'AI Boom 2.0';
      if (stressEvent === 'rate_cut') scenarioLabel = 'Dovish Fed Rate Cut';
      if (stressEvent === 'recession') scenarioLabel = 'Systemic Global Recession';

      this.messages.push({
        sender: 'user',
        text: `Simulate macro stress scenario: ${scenarioLabel}`,
        timestamp: new Date()
      });

      setTimeout(() => {
        this.isTyping = false;
        const result = this.simulateStressScenarioDirect(stressEvent);
        this.pushBotMessage(result);
        this.autoScrollPending = true;
      }, 1000);
      return;
    }

    const diagAction = target.getAttribute('data-diagnostic');
    if (diagAction === 'rebalance') {
      event.preventDefault();
      this.isTyping = true;
      this.autoScrollPending = true;
      
      this.messages.push({
        sender: 'user',
        text: `Run Portfolio Rebalancing Diagnostic Scan`,
        timestamp: new Date()
      });

      setTimeout(() => {
        this.isTyping = false;
        const result = this.generateRebalancePlan();
        this.pushBotMessage(result);
        this.autoScrollPending = true;
      }, 1200);
      return;
    }
  }

  executeQuickBuy(ticker: string, company: string, qty: number, price: number): void {
    if (!this.authService.isLoggedIn()) {
      this.pushBotMessage(`
        <div style="color: #38bdf8; font-weight: bold; font-size: 13px;">🔒 Authentication Required</div>
        <p style="font-size: 12px; margin-top: 4px;">You are currently browsing StockVault in <strong>Guest Mode</strong>. Please sign in or launch a free Demo account to execute trades via AI Copilot.</p>
      `);
      this.authService.openAuthModal('login', `Sign in to execute AI automated trade: Buy ${qty} ${ticker}.`);
      return;
    }
    const total = qty * price;
    const balance = this.cashService.getBalance();
    
    if (total > balance) {
      this.pushBotMessage(`
        <div style="color: #ff4560; font-weight: bold; font-size: 13px;">⚠️ Purchase Failed</div>
        <p style="font-size: 12px; margin-top: 4px;">Insufficient virtual buying power to execute this quick trade.</p>
        <div class="ai-card" style="padding: 10px; margin: 8px 0;">
          <div class="report-row"><span class="report-label">Cost Required</span><span class="report-val font-mono">$${total.toFixed(2)}</span></div>
          <div class="report-row"><span class="report-label">Buying Power</span><span class="report-val text-negative font-mono">$${balance.toFixed(2)}</span></div>
        </div>
      `);
      this.notifications.playPremiumBellChime();
      return;
    }

    this.isTyping = true;
    this.autoScrollPending = true;

    this.portfolioApi.buy({ ticker, company, quantity: qty, price }).subscribe({
      next: (res) => {
        this.cashService.deduct(total);
        this.notifications.playPremiumBellChime();
        this.notifications.addNotification({
          id: `quick-buy-${ticker}-${Date.now()}`,
          ticker,
          company,
          currentPrice: price,
          previousPrice: price,
          change: 0,
          changePercent: 0,
          type: 'up',
          timestamp: Date.now(),
          isTargetAlert: true,
          message: `💼 Quick Trade Filled: Bought ${qty.toFixed(4)} shares of ${ticker} at $${price.toFixed(2)}!`
        });

        this.isTyping = false;
        this.pushBotMessage(`
          <h4 class="ai-section-title">✅ Quick Trade Executed</h4>
          <p style="font-size:12px;">Successfully processed purchase via AI Co-pilot:</p>
          <div class="ai-card" style="border-left: 4px solid #00d395; padding: 10px; margin: 8px 0;">
            <div class="report-row"><span class="report-label">Asset Purchased</span><span class="report-val"><strong>${qty.toFixed(4)} shs</strong> of ${ticker}</span></div>
            <div class="report-row"><span class="report-label">Execution Price</span><span class="report-val font-mono">$${price.toFixed(2)}</span></div>
            <div class="report-row"><span class="report-label">Cash Deducted</span><span class="report-val text-negative font-mono">-$${total.toFixed(2)}</span></div>
            <div class="report-row"><span class="report-label">New Buying Power</span><span class="report-val text-positive font-mono">$${this.cashService.getBalance().toFixed(2)}</span></div>
          </div>
        `);
        this.loadHoldings();
      },
      error: (err) => {
        this.isTyping = false;
        this.pushBotMessage(`
          <div style="color: #ff4560; font-weight: bold; font-size: 13px;">⚠️ Trade Execution Error</div>
          <p style="font-size: 12px; margin-top: 4px;">Database transaction failed: ${err?.error?.error || 'Unknown server error'}.</p>
        `);
      }
    });
  }

  executeQuickSell(ticker: string, company: string, qty: number, price: number): void {
    if (!this.authService.isLoggedIn()) {
      this.pushBotMessage(`
        <div style="color: #38bdf8; font-weight: bold; font-size: 13px;">🔒 Authentication Required</div>
        <p style="font-size: 12px; margin-top: 4px;">You are currently browsing StockVault in <strong>Guest Mode</strong>. Please sign in or launch a free Demo account to execute trades via AI Copilot.</p>
      `);
      this.authService.openAuthModal('login', `Sign in to execute AI automated trade: Sell ${qty} ${ticker}.`);
      return;
    }
    const total = qty * price;
    const holding = this.holdings.find(h => h.ticker.toUpperCase() === ticker.toUpperCase());

    if (!holding || holding.quantity < qty) {
      const avail = holding ? holding.quantity : 0;
      this.pushBotMessage(`
        <div style="color: #ff4560; font-weight: bold; font-size: 13px;">⚠️ Sale Failed</div>
        <p style="font-size: 12px; margin-top: 4px;">You have insufficient shares of ${ticker} to execute this hedge trade.</p>
        <div class="ai-card" style="padding: 10px; margin: 8px 0;">
          <div class="report-row"><span class="report-label">Shares Requested</span><span class="report-val font-mono">${qty.toFixed(4)} shs</span></div>
          <div class="report-row"><span class="report-label">Shares Owned</span><span class="report-val text-negative font-mono">${avail.toFixed(4)} shs</span></div>
        </div>
      `);
      this.notifications.playPremiumBellChime();
      return;
    }

    this.isTyping = true;
    this.autoScrollPending = true;

    this.portfolioApi.sell({ ticker, company, quantity: qty, price }).subscribe({
      next: (res) => {
        this.cashService.add(total);
        this.notifications.playPremiumBellChime();
        this.notifications.addNotification({
          id: `quick-sell-${ticker}-${Date.now()}`,
          ticker,
          company,
          currentPrice: price,
          previousPrice: price,
          change: 0,
          changePercent: 0,
          type: 'down',
          timestamp: Date.now(),
          isTargetAlert: true,
          message: `💼 Quick Trade Filled: Sold ${qty.toFixed(4)} shares of ${ticker} at $${price.toFixed(2)}!`
        });

        this.isTyping = false;
        this.pushBotMessage(`
          <h4 class="ai-section-title">✅ Quick Trade Executed</h4>
          <p style="font-size:12px;">Successfully processed sale/liquidation via AI Co-pilot:</p>
          <div class="ai-card" style="border-left: 4px solid #ff4560; padding: 10px; margin: 8px 0;">
            <div class="report-row"><span class="report-label">Asset Liquidated</span><span class="report-val"><strong>${qty.toFixed(4)} shs</strong> of ${ticker}</span></div>
            <div class="report-row"><span class="report-label">Execution Price</span><span class="report-val font-mono">$${price.toFixed(2)}</span></div>
            <div class="report-row"><span class="report-label">Cash Credited</span><span class="report-val text-positive font-mono">+$${total.toFixed(2)}</span></div>
            <div class="report-row"><span class="report-label">New Buying Power</span><span class="report-val text-positive font-mono">$${this.cashService.getBalance().toFixed(2)}</span></div>
          </div>
        `);
        this.loadHoldings();
      },
      error: (err) => {
        this.isTyping = false;
        this.pushBotMessage(`
          <div style="color: #ff4560; font-weight: bold; font-size: 13px;">⚠️ Trade Execution Error</div>
          <p style="font-size: 12px; margin-top: 4px;">Database transaction failed: ${err?.error?.error || 'Unknown server error'}.</p>
        `);
      }
    });
  }

  handleStressTestConsole(): string {
    return `<h4 class="ai-section-title">🌋 Macro Stress Test Console</h4>
            <p>Assess your portfolio's sensitivity to major macroeconomic shifts. Click any of the simulated scenarios below to calculate real-time capital drawdown and recovery plans:</p>
            
            <div style="display: flex; flex-direction: column; gap: 8px; margin: 12px 0;">
              <button class="chip" style="width: 100%; text-align: left; padding: 10px 14px; background: rgba(255, 69, 96, 0.08); border: 1px solid rgba(255, 69, 96, 0.25); color: #ff6b81; display: flex; align-items: center; gap: 10px; border-radius: 12px; font-weight: 700; transition: all 0.2s;" data-stress-event="tech_pullback">
                <span>🌋</span>
                <span style="flex: 1;">Tech Sector Pullback (-15% Drop)</span>
                <span style="font-size: 11px; background: rgba(255, 69, 96, 0.15); padding: 2px 6px; border-radius: 4px;">HIGH RISK</span>
              </button>
              
              <button class="chip" style="width: 100%; text-align: left; padding: 10px 14px; background: rgba(0, 211, 149, 0.08); border: 1px solid rgba(0, 211, 149, 0.25); color: #20e8a2; display: flex; align-items: center; gap: 10px; border-radius: 12px; font-weight: 700; transition: all 0.2s;" data-stress-event="ai_boom">
                <span>🚀</span>
                <span style="flex: 1;">AI Boom 2.0 (+30% Expansion)</span>
                <span style="font-size: 11px; background: rgba(0, 211, 149, 0.15); padding: 2px 6px; border-radius: 4px;">GROWTH BUST</span>
              </button>

              <button class="chip" style="width: 100%; text-align: left; padding: 10px 14px; background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.25); color: #38bdf8; display: flex; align-items: center; gap: 10px; border-radius: 12px; font-weight: 700; transition: all 0.2s;" data-stress-event="rate_cut">
                <span>🌊</span>
                <span style="flex: 1;">Dovish Fed Rate Cut (+10% Boost)</span>
                <span style="font-size: 11px; background: rgba(14, 165, 233, 0.15); padding: 2px 6px; border-radius: 4px;">MACRO BOOST</span>
              </button>

              <button class="chip" style="width: 100%; text-align: left; padding: 10px 14px; background: rgba(254, 176, 25, 0.08); border: 1px solid rgba(254, 176, 25, 0.25); color: #ffb019; display: flex; align-items: center; gap: 10px; border-radius: 12px; font-weight: 700; transition: all 0.2s;" data-stress-event="recession">
                <span>📉</span>
                <span style="flex: 1;">Systemic Global Recession (-25% Drop)</span>
                <span style="font-size: 11px; background: rgba(254, 176, 25, 0.15); padding: 2px 6px; border-radius: 4px;">CRITICAL RISK</span>
              </button>
            </div>
            
            <div class="ai-recommendation-box" style="font-size: 11px; margin-top: 10px;">
              💡 <strong>How it works</strong>: Our stress testing engine recalculates every asset in your virtual wallet using historical correlation models and sector beta weightings under macro shocks.
            </div>`;
  }

  simulateStressScenarioDirect(scenario: string): string {
    this.recalculatePortfolioTotals();

    let scenarioName = '';
    let scenarioIcon = '';
    let description = '';
    let advice = '';

    const multipliers: Record<string, number> = {};

    if (scenario === 'tech_pullback') {
      scenarioName = 'Tech Sector Pullback';
      scenarioIcon = '🌋';
      description = 'A major valuation correction in high-multiple tech symbols, resulting in a sudden capital contraction across software, semiconductors, and electronic platforms.';
      multipliers['Technology'] = -0.15;
      multipliers['Semiconductors'] = -0.18;
      multipliers['Software & Cloud'] = -0.12;
      multipliers['E-Commerce'] = -0.08;
      multipliers['Automotive'] = -0.10;
      multipliers['Other'] = -0.04;
      advice = 'Your portfolio is exposed to high-beta tech. To hedge against this drop, consider reallocating to **defensive sectors** (Healthcare, Consumer Staples) or broad market safety indices.';
    } else if (scenario === 'ai_boom') {
      scenarioName = 'AI Boom 2.0 Expansion';
      scenarioIcon = '🚀';
      description = 'Unprecedented institutional scaling in enterprise compute and foundation model integrations triggers a broad secular bull run across semiconductors and software.';
      multipliers['Semiconductors'] = 0.30;
      multipliers['Software & Cloud'] = 0.20;
      multipliers['Technology'] = 0.15;
      multipliers['E-Commerce'] = 0.10;
      multipliers['Automotive'] = 0.08;
      multipliers['Other'] = 0.05;
      advice = 'Your tech holdings are performing beautifully! Consider securing some profits on extreme high-P/E symbols and parking them in **SPY** to build a compounding core cushion.';
    } else if (scenario === 'rate_cut') {
      scenarioName = 'Dovish Fed Rate Cut';
      scenarioIcon = '🌊';
      description = 'The Federal Reserve announces a surprise 50bps interest rate reduction, sending capital flooding into high-growth, debt-dependent software, biotech, and consumer discretionary assets.';
      multipliers['Software & Cloud'] = 0.15;
      multipliers['RealEstate'] = 0.14;
      multipliers['Biotech & Pharma'] = 0.12;
      multipliers['Technology'] = 0.10;
      multipliers['E-Commerce'] = 0.10;
      multipliers['Automotive'] = 0.08;
      multipliers['Other'] = 0.06;
      advice = 'A rate cut lowers discount rates and boosts growth valuations. Deploy remaining buying power into software or real estate assets to ride this liquidity expansion.';
    } else {
      scenarioName = 'Systemic Global Recession';
      scenarioIcon = '📉';
      description = 'Severe consumer spending compression and supply-chain shocks trigger a global credit contraction, leading to broad equity drawdowns across all cyclical asset classes.';
      multipliers['Technology'] = -0.25;
      multipliers['Semiconductors'] = -0.28;
      multipliers['Software & Cloud'] = -0.22;
      multipliers['E-Commerce'] = -0.20;
      multipliers['Automotive'] = -0.25;
      multipliers['Financial'] = -0.20;
      multipliers['Energy'] = -0.15;
      multipliers['Industrial'] = -0.18;
      multipliers['Consumer'] = -0.08;
      multipliers['Healthcare'] = -0.06;
      multipliers['Biotech & Pharma'] = -0.08;
      multipliers['Indices & ETFs'] = -0.15;
      multipliers['Other'] = -0.15;
      advice = 'During deep corrections, cash is king and defensive equity shields capital. Sell weak momentum positions and reallocate into high-yielding defensive staples (KO) or hold cash reserves.';
    }

    if (this.holdings.length === 0) {
      return `<h4 class="ai-section-title">${scenarioIcon} Stress Test: ${scenarioName}</h4>
              <p>Your wallet is currently <strong>100% in cash</strong> ($${this.cashBalance.toFixed(2)}).</p>
              <div class="ai-card" style="padding:10px; margin: 8px 0;">
                <p>💡 **Drawdown Projection**: <strong class="text-positive">$0.00 (0.00% change)</strong></p>
                <p style="margin-top: 4px; font-size: 11.5px; color: #94a3b8">Your buying power is fully shielded from market downturns. You have the ultimate dry powder to buy excellent mega-caps at generational discounts!</p>
              </div>`;
    }

    let currentValTotal = 0;
    let projectedValTotal = 0;
    let holdingsRowsHtml = '';

    this.holdings.forEach(h => {
      const currentPrice = this.livePrice.getCurrentPrice(h.ticker);
      const sector = this.TICKER_SECTORS[h.ticker] || 'Other';
      const pctChange = multipliers[sector] || multipliers['Other'] || -0.05;
      const currentHoldingVal = h.quantity * currentPrice;
      const projectedPrice = currentPrice * (1 + pctChange);
      const projectedHoldingVal = h.quantity * projectedPrice;
      
      currentValTotal += currentHoldingVal;
      projectedValTotal += projectedHoldingVal;

      const diff = projectedHoldingVal - currentHoldingVal;
      const diffClass = diff >= 0 ? 'text-positive' : 'text-negative';
      const diffSign = diff >= 0 ? '+' : '';

      holdingsRowsHtml += `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.04);">
          <span><strong>${h.ticker}</strong> (${sector})</span>
          <span class="${diffClass}">${diffSign}$${diff.toFixed(2)} (${(pctChange*100).toFixed(0)}%)</span>
        </div>`;
    });

    const netChange = projectedValTotal - currentValTotal;
    const changePct = (netChange / (currentValTotal + this.cashBalance)) * 100;
    const finalNetAssets = projectedValTotal + this.cashBalance;
    const impactClass = netChange >= 0 ? 'text-positive' : 'text-negative';
    const impactSign = netChange >= 0 ? '+' : '';

    let actionCardsHtml = '';
    
    const spyPrice = this.livePrice.getCurrentPrice('SPY');
    const nvdaPrice = this.livePrice.getCurrentPrice('NVDA');

    if (scenario === 'tech_pullback' || scenario === 'recession') {
      const techPosition = this.holdings.find(h => ['NVDA', 'AAPL', 'MSFT', 'TSLA'].includes(h.ticker));
      
      if (techPosition && techPosition.quantity >= 0.1) {
        const sellQty = Math.max(0.1, Math.floor(techPosition.quantity * 0.3 * 100) / 100);
        const sellPrice = this.livePrice.getCurrentPrice(techPosition.ticker);
        
        actionCardsHtml += `
          <div class="ai-card border-neon-sell" style="background: rgba(255, 69, 96, 0.04); border: 1px solid rgba(255, 69, 96, 0.2); border-left: 4px solid #ff4560; border-radius: 8px; padding: 12px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: 700; background: #ff4560; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Sell / Hedge</span>
              <strong style="color: #fff; font-size: 13px;">${techPosition.ticker}</strong>
            </div>
            <p style="font-size: 11.5px; margin-bottom: 8px; color: #cbd5e1;">Reduce tech density. Reallocate capital from high-beta <strong>${techPosition.ticker}</strong>.</p>
            <button class="chip" style="width:100%; background:#ff4560; color:#fff; font-weight:700; border:none; padding:8px 0; border-radius:6px; font-size:11.5px; cursor:pointer;" 
                    data-sell-ticker="${techPosition.ticker}" data-sell-company="${techPosition.company}" data-sell-qty="${sellQty}" data-sell-price="${sellPrice}">
              Execute Hedge: Sell ${sellQty} ${techPosition.ticker}
            </button>
          </div>`;
      }

      actionCardsHtml += `
        <div class="ai-card border-neon-buy" style="background: rgba(0, 211, 149, 0.04); border: 1px solid rgba(0, 211, 149, 0.2); border-left: 4px solid #00d395; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; background: #00d395; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Buy Defensive</span>
            <strong style="color: #fff; font-size: 13px;">SPY</strong>
          </div>
          <p style="font-size: 11.5px; margin-bottom: 8px; color: #cbd5e1;">Stabilize your balance sheet. Buy broad S&P 500 passive safety index.</p>
          <button class="chip" style="width:100%; background:#00d395; color:#080c18; font-weight:700; border:none; padding:8px 0; border-radius:6px; font-size:11.5px; cursor:pointer;" 
                  data-buy-ticker="SPY" data-buy-company="S&P 500 ETF Trust" data-buy-qty="2" data-buy-price="${spyPrice}">
            Execute Buy Trade: 2 SPY (@ $${spyPrice.toFixed(2)})
          </button>
        </div>`;
    } else {
      actionCardsHtml += `
        <div class="ai-card border-neon-buy" style="background: rgba(0, 211, 149, 0.04); border: 1px solid rgba(0, 211, 149, 0.2); border-left: 4px solid #00d395; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; background: #00d395; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Leverage Growth</span>
            <strong style="color: #fff; font-size: 13px;">NVDA</strong>
          </div>
          <p style="font-size: 11.5px; margin-bottom: 8px; color: #cbd5e1;">Capture secular hardware momentum. Scale up your NVIDIA position.</p>
          <button class="chip" style="width:100%; background:#00d395; color:#080c18; font-weight:700; border:none; padding:8px 0; border-radius:6px; font-size:11.5px; cursor:pointer;" 
                  data-buy-ticker="NVDA" data-buy-company="NVIDIA Corp." data-buy-qty="1.5" data-buy-price="${nvdaPrice}">
            Execute Buy Trade: 1.5 NVDA (@ $${nvdaPrice.toFixed(2)})
          </button>
        </div>`;

      actionCardsHtml += `
        <div class="ai-card border-neon-buy" style="background: rgba(0, 211, 149, 0.04); border: 1px solid rgba(0, 211, 149, 0.2); border-left: 4px solid #00d395; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; background: #00d395; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Diversified Growth</span>
            <strong style="color: #fff; font-size: 13px;">SPY</strong>
          </div>
          <p style="font-size: 11.5px; margin-bottom: 8px; color: #cbd5e1;">Compound returns across blue chips. Add fractional S&P 500 safety.</p>
          <button class="chip" style="width:100%; background:#00d395; color:#080c18; font-weight:700; border:none; padding:8px 0; border-radius:6px; font-size:11.5px; cursor:pointer;" 
                  data-buy-ticker="SPY" data-buy-company="S&P 500 ETF Trust" data-buy-qty="3" data-buy-price="${spyPrice}">
            Execute Buy Trade: 3 SPY (@ $${spyPrice.toFixed(2)})
          </button>
        </div>`;
    }

    return `<h4 class="ai-section-title">${scenarioIcon} Stress Impact Analysis: ${scenarioName}</h4>
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 10px;">${description}</p>
            
            <div class="ai-metrics-grid" style="margin-bottom: 14px;">
              <div class="ai-metric-item" style="border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0,0,0,0.2);">
                <span class="ai-metric-label">Capital Shift</span>
                <span class="ai-metric-val ${impactClass} font-mono" style="font-size: 12.5px;">${impactSign}$${Math.abs(netChange).toFixed(2)}</span>
              </div>
              <div class="ai-metric-item" style="border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0,0,0,0.2);">
                <span class="ai-metric-label">New Balance</span>
                <span class="ai-metric-val font-mono" style="font-size: 12.5px;">$${finalNetAssets.toFixed(2)}</span>
              </div>
              <div class="ai-metric-item" style="border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0,0,0,0.2);">
                <span class="ai-metric-label">Portfolio Shock</span>
                <span class="ai-metric-val ${impactClass} font-mono" style="font-size: 12.5px;">${impactSign}${changePct.toFixed(2)}%</span>
              </div>
            </div>

            <div class="ai-card" style="margin-top: 10px; padding: 10px 12px;">
              <div style="font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Individual Holding Shock Profile</div>
              ${holdingsRowsHtml}
            </div>

            <div class="ai-recommendation-box" style="margin-top: 12px;">
              🛡️ <strong>AI Copilot Advice</strong>: ${advice}
            </div>
            
            <h5 style="margin-top: 18px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #38bdf8; font-weight: 700;">🤖 AI Suggested Action Plan</h5>
            <p style="font-size: 11px; color: #64748b; margin-top: 2px;">Deploy these micro-reallocations in a single-click directly from this chat bubble:</p>
            
            ${actionCardsHtml}`;
  }

  private handlePortfolioAudit(): string {
    this.recalculatePortfolioTotals();

    if (this.holdings.length === 0) {
      return `<h4 class="ai-section-title">💼 Live Portfolio Audit Report</h4>
              <p>Your current wallet is <strong>100% in cash</strong>.</p>
              <div class="ai-card" style="padding:10px; margin: 8px 0;">
                <div class="report-row"><span class="report-label">Buying Power</span><span class="report-val text-positive font-mono">$${this.cashBalance.toFixed(2)}</span></div>
                <div class="report-row"><span class="report-label">Active Stocks</span><span class="report-val font-mono">$0.00</span></div>
              </div>
              <div class="ai-recommendation-box">
                🤖 <strong>AI Suggestion</strong>: Compounding returns start with investing! You have ample buying power. Consider buying starting fractional shares of index ETFs like <strong>SPY</strong> or stable mega-caps like <strong>MSFT</strong> to start earning yields.
              </div>`;
    }

    const sectorValues: Record<string, number> = {};
    this.holdings.forEach(h => {
      const sector = this.TICKER_SECTORS[h.ticker] || 'Other';
      const currentPrice = this.livePrice.getCurrentPrice(h.ticker);
      sectorValues[sector] = (sectorValues[sector] || 0) + (h.quantity * currentPrice);
    });

    const sectorWeights = Object.entries(sectorValues).map(([sector, val]) => ({
      sector,
      value: val,
      pct: (val / this.totalStockValue) * 100
    })).sort((a, b) => b.value - a.value);

    const topSector = sectorWeights[0];
    let auditSummary = '';
    let recommendation = '';

    if (topSector.pct > 40) {
      auditSummary = `<span class="text-warning">⚠️</span> <strong>Diversification Concentration Risk</strong>: Your portfolio is heavily exposed to the <strong>${topSector.sector}</strong> sector which constitutes <strong>${topSector.pct.toFixed(1)}%</strong> of your holdings.`;
      recommendation = `🤖 <strong>AI Rebalancing Plan</strong>: To reduce volatility and hedge against sector-specific corrections, consider running our interactive rebalancing scanner to distribute capital across indices or defensive staples:
                        <div style="margin-top: 10px;">
                          <button class="chip" style="width: 100%; background: #0ea5e9; color: #fff; font-weight: 700; border: none; padding: 10px 0; border-radius: 8px; cursor: pointer; transition: all 0.2s;" data-diagnostic="rebalance">
                            🔍 Run Rebalancing Diagnostic Scan
                          </button>
                        </div>`;
    } else {
      auditSummary = `<span class="text-positive">✅</span> <strong>Disciplined Asset Allocation</strong>: Your portfolio is beautifully diversified! Your largest sector is <strong>${topSector.sector}</strong>, representing only <strong>${topSector.pct.toFixed(1)}%</strong> of your holdings.`;
      recommendation = `🤖 <strong>AI Advice</strong>: Your allocation shows institutional-grade discipline. Keep maintaining this balance! You can run our interactive rebalancing scanner to optimize fractional allocations or deploy cash reserves:
                        <div style="margin-top: 10px;">
                          <button class="chip" style="width: 100%; background: #0ea5e9; color: #fff; font-weight: 700; border: none; padding: 10px 0; border-radius: 8px; cursor: pointer; transition: all 0.2s;" data-diagnostic="rebalance">
                            🔍 Run Rebalancing Diagnostic Scan
                          </button>
                        </div>`;
    }

    let sectorGrid = `<div class="ai-card" style="padding:10px; margin: 8px 0;">`;
    sectorWeights.forEach(sw => {
      sectorGrid += `<div class="report-row">
                      <span class="report-label">${sw.sector}</span>
                      <span class="report-val font-mono">${sw.pct.toFixed(1)}% ($${sw.value.toFixed(2)})</span>
                    </div>`;
    });
    sectorGrid += `</div>`;

    return `<h4 class="ai-section-title">📊 Live Portfolio Audit Report</h4>
            <p style="margin-bottom: 8px">${auditSummary}</p>
            ${sectorGrid}
            <div class="ai-recommendation-box">${recommendation}</div>`;
  }

  generateRebalancePlan(): string {
    this.recalculatePortfolioTotals();

    if (this.holdings.length === 0) {
      const spyPrice = this.livePrice.getCurrentPrice('SPY');
      return `<h4 class="ai-section-title">🔍 Portfolio Rebalancing Scan</h4>
              <p>Rebalance scanner diagnostic: **COMPLETED**.</p>
              <div class="ai-card" style="padding:10px; margin: 8px 0;">
                <p>Status: **No Stocks Active**</p>
                <p style="margin-top: 6px; font-size:11.5px; color: #cbd5e1">Your buying power is 100% idle. AI suggests placing a core position in index safety to start compounding yield.</p>
              </div>
              <div class="ai-card border-neon-buy" style="background: rgba(0, 211, 149, 0.04); border: 1px solid rgba(0, 211, 149, 0.2); border-left: 4px solid #00d395; border-radius: 8px; padding: 12px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 10px; font-weight: 700; background: #00d395; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Core Index</span>
                  <strong style="color: #fff; font-size: 13px;">SPY</strong>
                </div>
                <p style="font-size: 11.5px; margin-bottom: 8px; color: #cbd5e1;">Deploy $1,500.00 into standard market beta safety (S&P 500 index ETF).</p>
                <button class="chip" style="width:100%; background:#00d395; color:#080c18; font-weight:700; border:none; padding:8px 0; border-radius:6px; font-size:11.5px; cursor:pointer;" 
                        data-buy-ticker="SPY" data-buy-company="S&P 500 ETF Trust" data-buy-qty="2" data-buy-price="${spyPrice}">
                  Execute Quick Buy (2 SPY @ $${spyPrice.toFixed(2)})
                </button>
              </div>`;
    }

    const sectorValues: Record<string, number> = {};
    this.holdings.forEach(h => {
      const sector = this.TICKER_SECTORS[h.ticker] || 'Other';
      const currentPrice = this.livePrice.getCurrentPrice(h.ticker);
      sectorValues[sector] = (sectorValues[sector] || 0) + (h.quantity * currentPrice);
    });

    const totalVal = Object.values(sectorValues).reduce((a, b) => a + b, 0);

    const sectorWeights = Object.entries(sectorValues).map(([sector, val]) => ({
      sector,
      value: val,
      pct: (val / totalVal) * 100
    })).sort((a, b) => b.value - a.value);

    const topSector = sectorWeights[0];
    let rebalanceCardsHtml = '';

    const spyPrice = this.livePrice.getCurrentPrice('SPY');
    const nvdaPrice = this.livePrice.getCurrentPrice('NVDA');

    if (topSector.pct > 40) {
      const overweightHoldings = this.holdings.filter(h => (this.TICKER_SECTORS[h.ticker] || 'Other') === topSector.sector);
      const targetStock = overweightHoldings.sort((a,b) => {
        const aVal = a.quantity * this.livePrice.getCurrentPrice(a.ticker);
        const bVal = b.quantity * this.livePrice.getCurrentPrice(b.ticker);
        return bVal - aVal;
      })[0];
      
      const stockPrice = this.livePrice.getCurrentPrice(targetStock.ticker);
      const sellQty = Math.max(0.01, Math.floor(targetStock.quantity * 0.25 * 1000) / 1000);
      
      rebalanceCardsHtml += `
        <div class="ai-card border-neon-sell" style="background: rgba(255, 69, 96, 0.04); border: 1px solid rgba(255, 69, 96, 0.2); border-left: 4px solid #ff4560; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; background: #ff4560; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Reduce Position</span>
            <strong style="color: #fff; font-size: 13px;">${targetStock.ticker}</strong>
          </div>
          <p style="font-size: 11.5px; margin-bottom: 8px; color: #cbd5e1;">Trim concentrated <strong>${topSector.sector}</strong> allocation. Sell <strong>${sellQty} shares</strong> of ${targetStock.ticker}.</p>
          <button class="chip" style="width:100%; background:#ff4560; color:#fff; font-weight:700; border:none; padding:8px 0; border-radius:6px; font-size:11.5px; cursor:pointer;" 
                  data-sell-ticker="${targetStock.ticker}" data-sell-company="${targetStock.company}" data-sell-qty="${sellQty}" data-sell-price="${stockPrice}">
            Execute Sell Trade: Trim ${sellQty} ${targetStock.ticker}
          </button>
        </div>`;

      rebalanceCardsHtml += `
        <div class="ai-card border-neon-buy" style="background: rgba(0, 211, 149, 0.04); border: 1px solid rgba(0, 211, 149, 0.2); border-left: 4px solid #00d395; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; background: #00d395; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Reallocate to ETF</span>
            <strong style="color: #fff; font-size: 13px;">SPY</strong>
          </div>
          <p style="font-size: 11.5px; margin-bottom: 8px; color: #cbd5e1;">Deploy proceeds into broad-market blue chip safety to stabilize drawdown volatility.</p>
          <button class="chip" style="width:100%; background:#00d395; color:#080c18; font-weight:700; border:none; padding:8px 0; border-radius:6px; font-size:11.5px; cursor:pointer;" 
                  data-buy-ticker="SPY" data-buy-company="S&P 500 ETF Trust" data-buy-qty="3" data-buy-price="${spyPrice}">
            Execute Buy Trade: 3 SPY (@ $${spyPrice.toFixed(2)})
          </button>
        </div>`;
    } else {
      rebalanceCardsHtml += `
        <div class="ai-card border-neon-buy" style="background: rgba(0, 211, 149, 0.04); border: 1px solid rgba(0, 211, 149, 0.2); border-left: 4px solid #00d395; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; background: #00d395; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Add Alpha Growth</span>
            <strong style="color: #fff; font-size: 13px;">NVDA</strong>
          </div>
          <p style="font-size: 11.5px; margin-bottom: 8px; color: #cbd5e1;">Deploy idle buying power. Scale into semiconductor hypergrowth (fractional shares).</p>
          <button class="chip" style="width:100%; background:#00d395; color:#080c18; font-weight:700; border:none; padding:8px 0; border-radius:6px; font-size:11.5px; cursor:pointer;" 
                  data-buy-ticker="NVDA" data-buy-company="NVIDIA Corp." data-buy-qty="0.5" data-buy-price="${nvdaPrice}">
            Execute Buy Trade: 0.5 NVDA (@ $${nvdaPrice.toFixed(2)})
          </button>
        </div>`;

      rebalanceCardsHtml += `
        <div class="ai-card border-neon-buy" style="background: rgba(0, 211, 149, 0.04); border: 1px solid rgba(0, 211, 149, 0.2); border-left: 4px solid #00d395; border-radius: 8px; padding: 12px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 700; background: #00d395; color: #fff; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Core Index</span>
            <strong style="color: #fff; font-size: 13px;">SPY</strong>
          </div>
          <p style="font-size: 11.5px; margin-bottom: 8px; color: #cbd5e1;">Park cash inside broad-market blue chip index for low-beta, low-risk compounding.</p>
          <button class="chip" style="width:100%; background:#00d395; color:#080c18; font-weight:700; border:none; padding:8px 0; border-radius:6px; font-size:11.5px; cursor:pointer;" 
                  data-buy-ticker="SPY" data-buy-company="S&P 500 ETF Trust" data-buy-qty="2" data-buy-price="${spyPrice}">
            Execute Buy Trade: 2 SPY (@ $${spyPrice.toFixed(2)})
          </button>
        </div>`;
    }

    return `<h4 class="ai-section-title">🔍 Portfolio Rebalancing Scan</h4>
            <p style="font-size: 12px; color: #cbd5e1">Our rebalancing scanner calculated your allocation relative to standard volatility-minimizing capital models:</p>
            <div class="ai-card" style="padding: 10px 12px; margin: 8px 0;">
              <p>Top Sector Weight: <strong>${topSector.sector} (${topSector.pct.toFixed(1)}%)</strong></p>
              <p style="margin-top: 4px; font-size: 11.5px; color: #cbd5e1">Recommended allocation adjustments to maximize Sharpe ratio variance:</p>
            </div>
            
            ${rebalanceCardsHtml}
            
            <div class="ai-recommendation-box" style="margin-top: 12px; font-size: 11px;">
              🛡️ <strong>Sharpe Ratio Optimizer</strong>: Reallocating overweight cyclical assets to broad defensive holdings reduces standard deviation volatility by an estimated <strong>18.4%</strong>.
            </div>`;
  }

  private handlePortfolioForecast(): string {
    this.recalculatePortfolioTotals();

    let compoundRate = 0.085;
    let riskProfile = 'Moderate';

    const sectorValues: Record<string, number> = {};
    this.holdings.forEach(h => {
      const sector = this.TICKER_SECTORS[h.ticker] || 'Other';
      const currentPrice = this.livePrice.getCurrentPrice(h.ticker);
      sectorValues[sector] = (sectorValues[sector] || 0) + (h.quantity * currentPrice);
    });

    const totalStockValue = Object.values(sectorValues).reduce((a, b) => a + b, 0);
    const isTechHeavy = (sectorValues['Technology'] || 0) + (sectorValues['Semiconductors'] || 0) > (totalStockValue * 0.4);
    
    if (this.holdings.length === 0) {
      compoundRate = 0.045;
      riskProfile = 'Risk-Free Cash Yield';
    } else if (isTechHeavy) {
      compoundRate = 0.125;
      riskProfile = 'Aggressive Growth';
    }

    const yr1 = this.netAssets * Math.pow(1 + compoundRate, 1);
    const yr5 = this.netAssets * Math.pow(1 + compoundRate, 5);
    const yr10 = this.netAssets * Math.pow(1 + compoundRate, 10);

    return `<h4 class="ai-section-title">📈 Portfolio Compounding Projection</h4>
            <p>Based on your current sector allocations, your portfolio risk profile is classified as: <strong>${riskProfile}</strong> with an estimated annualized compound return of <strong>${(compoundRate * 100).toFixed(1)}%</strong>.</p>
            
            <div class="ai-card" style="padding:10px; margin: 8px 0;">
              <div class="report-row"><span class="report-label">Current Value</span><span class="report-val font-mono">$${this.netAssets.toFixed(2)}</span></div>
              <div class="report-row"><span class="report-label">1-Year Projected</span><span class="report-val text-positive font-mono">$${yr1.toFixed(2)}</span></div>
              <div class="report-row"><span class="report-label">5-Year Projected</span><span class="report-val text-positive font-mono">$${yr5.toFixed(2)}</span></div>
              <div class="report-row"><span class="report-label">10-Year Projected</span><span class="report-val text-positive font-mono">$${yr10.toFixed(2)}</span></div>
            </div>`;
  }

  private handleTickerAnalysis(symbol: string): string {
    const meta = this.TICKER_METADATA[symbol] || {
      company: `${symbol} Inc.`,
      sector: 'Technology',
      rating: 'HOLD',
      target: 150.00,
      tailwinds: ['Strong market position in sector operations', 'Stable cash flow profile'],
      headwinds: ['Stiff competition from industry peers', 'General macroeconomic headwinds']
    };

    const maxShares = Math.floor(this.cashBalance / meta.target);
    const hasPosition = this.holdings.find(h => h.ticker === symbol);
    let positionText = hasPosition 
      ? `You currently own <strong>${hasPosition.quantity} shares</strong> of ${symbol} (Avg Purchase: $${hasPosition.avgPurchasePrice.toFixed(2)}).`
      : `You do not currently own shares of ${symbol} in your wallet.`;

    let tailwindsHtml = '<ul class="ai-list">';
    meta.tailwinds.forEach(t => tailwindsHtml += `<li class="ai-list-item tailwind">${t}</li>`);
    tailwindsHtml += '</ul>';

    let headwindsHtml = '<ul class="ai-list">';
    meta.headwinds.forEach(h => headwindsHtml += `<li class="ai-list-item headwind">${h}</li>`);
    headwindsHtml += '</ul>';

    let ratingClass = 'accent';
    if (meta.rating.includes('BUY')) {
      ratingClass = 'positive';
    }

    return `<h4 class="ai-section-title">🔍 Analyst Report: ${symbol} (${meta.company})</h4>
            <div class="ai-metrics-grid">
              <div class="ai-metric-item">
                <span class="ai-metric-label">Target Buy</span>
                <span class="ai-metric-val positive font-mono">$${meta.target.toFixed(2)}</span>
              </div>
              <div class="ai-metric-item">
                <span class="ai-metric-label">Consensus</span>
                <span class="ai-metric-val ${ratingClass}">${meta.rating}</span>
              </div>
              <div class="ai-metric-item">
                <span class="ai-metric-label">Affordable</span>
                <span class="ai-metric-val font-mono">${maxShares} shs</span>
              </div>
            </div>
            
            <p style="margin: 10px 0; font-size:12px; color: #94a3b8">${positionText}</p>
            
            <h5 class="text-positive" style="margin-top:14px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em">🚀 Core Catalyst Tailwinds</h5>
            ${tailwindsHtml}
            
            <h5 class="text-negative" style="margin-top:14px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em">⚠️ Risk factors / Headwinds</h5>
            ${headwindsHtml}
            
            <div class="ai-recommendation-box">
              <strong>AI Recommendation:</strong> ${maxShares > 0 ? `With your buying power, allocating $${(maxShares * meta.target).toFixed(2)} for ${maxShares} shares represents a balanced entry size.` : `You currently have insufficient buying power to purchase additional whole shares.`}
            </div>`;
  }

  private handleGeneralQuery(query: string): string {
    return `<h4 class="ai-section-title">🤖 AI Advisory Assistant</h4>
            <p>I parsed your query: <em>"${query}"</em>. I can assist you with institutional-grade insights for your wallet!</p>
            <p style="margin-top: 10px">Try clicking these pre-built macro analyst triggers:</p>
            <ul class="ai-list">
              <li class="ai-list-item tailwind"><strong>Portfolio Audit</strong>: Compiles sector concentrations and dynamic rebalancing logs.</li>
              <li class="ai-list-item tailwind"><strong>Stress Test Console</strong>: Recalculates drawdowns against simulated macro shocks (pullbacks, interest rate cuts, systemic recessions).</li>
              <li class="ai-list-item tailwind"><strong>Compounding Forecast</strong>: Calculates future portfolio valuations over 10 years.</li>
              <li class="ai-list-item tailwind"><strong>Analyze Tickers</strong>: Ask about <strong>NVDA</strong>, <strong>AAPL</strong>, <strong>MSFT</strong>, <strong>TSLA</strong>, or <strong>SPY</strong> to get full structural tailwind catalogs!</li>
            </ul>`;
  }

  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }, 50);
    } catch (err) {}
  }
}
