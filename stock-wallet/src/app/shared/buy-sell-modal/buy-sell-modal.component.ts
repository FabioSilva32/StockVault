import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinnhubService } from '../../core/services/finnhub.service';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { CashService } from '../../core/services/cash.service';
import { NotificationService } from '../../core/services/notification.service';
import { Holding } from '../../core/models/models';

export type ModalMode = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop-loss' | 'take-profit';
export type QuantityType = 'shares' | 'cash';

@Component({
  selector: 'app-buy-sell-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <canvas class="confetti-canvas" #confettiCanvas></canvas>
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-box" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="modal-mode-badge" [class.buy]="mode==='buy'" [class.sell]="mode==='sell'">
              {{ mode === 'buy' ? '🛒 BUY' : '💰 SELL' }}
            </div>
            <h2 class="modal-title">{{ ticker }}</h2>
          </div>
          <button class="modal-close" (click)="close.emit()">✕</button>
        </div>

        <p class="modal-company-name">{{ company }}</p>

        <!-- Order Type Selector Segmented Control -->
        <div class="form-group">
          <label class="form-label">Order Type</label>
          <div class="pill-segmented-control">
            <button class="segment-btn" [class.active]="orderType==='market'" (click)="setOrderType('market')">Market</button>
            <button class="segment-btn" [class.active]="orderType==='limit'" (click)="setOrderType('limit')">Limit</button>
            <button class="segment-btn" [class.active]="orderType==='stop-loss'" (click)="setOrderType('stop-loss')">Stop Loss</button>
            <button class="segment-btn" [class.active]="orderType==='take-profit'" (click)="setOrderType('take-profit')">Take Profit</button>
          </div>
        </div>

        <!-- Transaction Mode Selector (Shares vs Cash Dollars) - Market / Limit only -->
        <div class="form-group" *ngIf="orderType==='market' || orderType==='limit'">
          <label class="form-label">Buy By</label>
          <div class="pill-segmented-control buy-by-control">
            <button class="segment-btn" [class.active]="quantityType==='shares'" (click)="quantityType='shares'">Shares (Quantity)</button>
            <button class="segment-btn" [class.active]="quantityType==='cash'" (click)="quantityType='cash'">USD ($ Amount)</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Current Market Price</label>
          <div class="price-display">
            <span *ngIf="loadingPrice" class="skeleton" style="width:120px;height:28px;display:inline-block"></span>
            <span *ngIf="!loadingPrice" class="price-large">\${{ currentPrice | number:'1.2-2' }}</span>
          </div>
        </div>

        <!-- Target Price Input - For Limit/Stop-Loss/Take-Profit Orders -->
        <div class="form-group" *ngIf="orderType !== 'market'">
          <label class="form-label">
            {{ orderType === 'limit' ? 'Limit Trigger Price' : orderType === 'stop-loss' ? 'Stop Trigger Price' : 'Take Profit Trigger Price' }}
          </label>
          <input class="form-control svg-input" type="number" [(ngModel)]="limitPrice" [placeholder]="currentPrice" min="0.01" step="0.01">
          <small class="form-hint">Order executes automatically when price crosses this threshold</small>
        </div>

        <!-- Shares Input Form -->
        <div class="form-group" *ngIf="quantityType === 'shares'">
          <label class="form-label">Quantity (shares)</label>
          <input class="form-control" id="qty-input" type="number" [(ngModel)]="quantity" min="0.0001" step="0.1" placeholder="0.00">
          <small class="form-hint" *ngIf="mode==='sell' && holding">
            You own {{ holding.quantity | number:'1.1-4' }} shares
          </small>
        </div>

        <!-- USD Cash Input Form -->
        <div class="form-group" *ngIf="quantityType === 'cash'">
          <label class="form-label">Amount ($ USD)</label>
          <input class="form-control" id="cash-input" type="number" [(ngModel)]="cashAmount" min="1" step="10" placeholder="0.00">
          <small class="form-hint" *ngIf="mode==='sell' && holding">
            Maximum cash value: \${{ (holding.quantity * effectivePrice) | number:'1.2-2' }}
          </small>
        </div>

        <div class="buying-power-row" style="margin-top: 16px; font-size: 13px; color: var(--text-secondary); display: flex; justify-content: space-between; padding: 4px 0;">
          <span>Available Buying Power:</span>
          <span style="font-weight: 700; color: #f1f5f9;">\${{ availableCash | number:'1.2-2' }}</span>
        </div>

        <!-- Total Details Card -->
        <div class="total-summary">
          <div class="total-row">
            <span>Price per share</span>
            <span class="price">\${{ effectivePrice | number:'1.2-2' }}</span>
          </div>
          <div class="total-row">
            <span>Calculated Quantity</span>
            <span class="price">{{ calculatedQuantity | number:'1.1-4' }} shares</span>
          </div>
          <hr class="sv-divider" style="margin:12px 0">
          <div class="total-row total-bold">
            <span>{{ mode === 'buy' ? 'Total Cost' : 'Total Revenue' }}</span>
            <span class="price" [class.text-positive]="mode==='sell'" [class.text-accent]="mode==='buy'">
              \${{ totalTradeAmount | number:'1.2-2' }}
            </span>
          </div>
        </div>

        <div class="error-msg" *ngIf="errorMsg">⚠️ {{ errorMsg }}</div>

        <div class="modal-footer">
          <button class="btn btn-ghost" (click)="close.emit()">Cancel</button>
          <button
            class="btn"
            [class.btn-buy]="mode==='buy'"
            [class.btn-sell]="mode==='sell'"
            (click)="onConfirm()"
            [disabled]="loading || isConfirmDisabled()">
            {{ loading ? 'Processing...' : getConfirmButtonText() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-box {
      background: rgba(17, 24, 39, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      border-radius: 20px;
      width: 440px;
      padding: 24px;
      animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .modal-mode-badge {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .modal-mode-badge.buy { background: rgba(0, 211, 149, 0.1); color: #00d395; }
    .modal-mode-badge.sell { background: rgba(255, 69, 96, 0.1); color: #ff4560; }
    .modal-title {
      font-size: 20px;
      font-weight: 800;
      color: #f1f5f9;
      margin: 0;
    }
    .modal-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 18px;
      cursor: pointer;
    }
    .modal-company-name { color: #64748b; font-size: 13px; margin-bottom: 20px; margin-top: 4px; }
    
    .form-group {
      margin-bottom: 16px;
    }
    .form-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .price-display { margin-top: 4px; }
    .price-large { font-size: 26px; font-weight: 800; color: #f1f5f9; }
    
    .form-control {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    .form-control:focus {
      border-color: rgba(108, 99, 255, 0.4);
      background: rgba(255, 255, 255, 0.05);
    }
    
    .form-hint { font-size: 11px; color: #64748b; margin-top: 4px; display: block; }
    
    /* Pill Segmented Controls */
    .pill-segmented-control {
      display: flex;
      background: rgba(0, 0, 0, 0.2);
      padding: 3px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      gap: 2px;
    }
    .segment-btn {
      flex: 1;
      border: none;
      background: transparent;
      padding: 8px 6px;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Inter', sans-serif;
    }
    .segment-btn:hover {
      color: #f1f5f9;
    }
    .segment-btn.active {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.15);
    }
    
    .buy-by-control .segment-btn.active {
      color: #a855f7;
      background: rgba(168, 85, 247, 0.08);
      border-color: rgba(168, 85, 247, 0.15);
    }

    .total-summary {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 14px;
      margin-top: 14px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .total-row:last-child { margin-bottom: 0; }
    .total-bold { font-size: 14px; font-weight: 700; color: #f1f5f9; }
    
    .error-msg {
      margin-top: 12px;
      padding: 10px 14px;
      background: rgba(255, 69, 96, 0.08);
      border: 1px solid rgba(255, 69, 96, 0.15);
      color: #ff4560;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }
    .btn-ghost {
      background: transparent;
      color: #94a3b8;
      border-color: rgba(255, 255, 255, 0.08);
    }
    .btn-ghost:hover {
      background: rgba(255, 255, 255, 0.03);
      color: #f1f5f9;
    }
    .btn-buy {
      background: #00d395;
      color: #0d1527;
    }
    .btn-buy:hover:not(:disabled) {
      background: #05e6a3;
      box-shadow: 0 0 15px rgba(0, 211, 149, 0.3);
    }
    .btn-sell {
      background: #ff4560;
      color: #ffffff;
    }
    .btn-sell:hover:not(:disabled) {
      background: #ff5c75;
      box-shadow: 0 0 15px rgba(255, 69, 96, 0.3);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .confetti-canvas {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
    }
  `]
})
export class BuySellModalComponent implements OnInit {
  @Input() mode: ModalMode = 'buy';
  @Input() ticker = '';
  @Input() company = '';
  @Input() holding?: Holding;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  @ViewChild('confettiCanvas') confettiCanvasRef!: ElementRef<HTMLCanvasElement>;

  // Advanced Order State
  orderType: OrderType = 'market';
  quantityType: QuantityType = 'shares';
  
  quantity: number | null = null;
  cashAmount: number | null = null;
  limitPrice: number | null = null;
  
  currentPrice = 0;
  loadingPrice = true;
  loading = false;
  errorMsg = '';

  constructor(
    private finnhub: FinnhubService,
    private portfolioApi: PortfolioApiService,
    private cashService: CashService,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.finnhub.getQuote(this.ticker).subscribe({
      next: q => { 
        this.currentPrice = q.c || q.pc || 0; 
        this.loadingPrice = false; 
        // Pre-fill target price for convenience
        this.limitPrice = Number(this.currentPrice.toFixed(2));
      },
      error: () => { this.loadingPrice = false; }
    });
  }

  setOrderType(type: OrderType): void {
    this.orderType = type;
    this.errorMsg = '';
    // Reset limits and quantities on switch
    this.quantity = null;
    this.cashAmount = null;
    
    if (type === 'stop-loss' || type === 'take-profit') {
      // Trigger orders must watch strictly share quantity to close out positions
      this.quantityType = 'shares';
    }
  }

  get effectivePrice(): number {
    if (this.orderType !== 'market' && this.limitPrice && this.limitPrice > 0) {
      return this.limitPrice;
    }
    return this.currentPrice;
  }

  get availableCash(): number {
    return this.cashService.getBalance();
  }

  get calculatedQuantity(): number {
    if (this.quantityType === 'cash') {
      const amt = this.cashAmount || 0;
      const price = this.effectivePrice;
      return price > 0 ? amt / price : 0;
    }
    return this.quantity || 0;
  }

  get totalTradeAmount(): number {
    if (this.quantityType === 'cash') {
      return this.cashAmount || 0;
    }
    return (this.quantity || 0) * this.effectivePrice;
  }

  isConfirmDisabled(): boolean {
    if (this.loadingPrice) return true;
    
    // Check quantity values
    if (this.quantityType === 'shares') {
      if (!this.quantity || this.quantity <= 0) return true;
    } else {
      if (!this.cashAmount || this.cashAmount <= 0) return true;
    }

    // Check buying power limit for buy orders
    if (this.mode === 'buy' && this.totalTradeAmount > this.availableCash) return true;

    // Check custom trigger price for limit types
    if (this.orderType !== 'market') {
      if (!this.limitPrice || this.limitPrice <= 0) return true;
    }

    return false;
  }

  getConfirmButtonText(): string {
    if (this.orderType !== 'market') {
      const verb = this.mode === 'buy' ? 'Buy' : 'Sell';
      const label = this.orderType === 'limit' ? 'Limit' : this.orderType === 'stop-loss' ? 'Stop' : 'Take Profit';
      return `Set ${label} ${verb}`;
    }
    return this.mode === 'buy' ? 'Confirm Buy' : 'Confirm Sell';
  }

  onConfirm(): void {
    this.errorMsg = '';
    
    const qty = this.calculatedQuantity;
    const price = this.effectivePrice;
    const total = this.totalTradeAmount;

    if (qty <= 0) {
      this.errorMsg = 'Please enter a valid quantity.';
      return;
    }

    // Sell limit constraints
    if (this.mode === 'sell' && this.holding && qty > this.holding.quantity) {
      this.errorMsg = `You only have ${this.holding.quantity.toFixed(4)} shares to sell.`;
      return;
    }

    // Buying cash constraints
    if (this.mode === 'buy' && total > this.availableCash) {
      this.errorMsg = 'Insufficient Buying Power to complete this purchase.';
      return;
    }

    if (this.orderType !== 'market') {
      // Place Advanced Limit / Stop / Take Profit Order
      this.placeAdvancedOrder(qty, price, total);
      return;
    }

    // Direct Market Order Execution
    this.loading = true;
    const payload = {
      ticker: this.ticker,
      company: this.company,
      quantity: qty,
      price: price
    };

    const req$ = this.mode === 'buy' ? this.portfolioApi.buy(payload) : this.portfolioApi.sell(payload);
    req$.subscribe({
      next: () => {
        this.loading = false;
        if (this.mode === 'buy') {
          this.cashService.deduct(total);
        } else {
          this.cashService.add(total);
        }

        // Play standard Trading 212 sound effect
        this.notifications.playPremiumBellChime();
        this.notifications.addNotification({
          id: `order-mkt-${this.ticker}-${Date.now()}`,
          ticker: this.ticker,
          company: this.company,
          currentPrice: price,
          previousPrice: price,
          change: 0,
          changePercent: 0,
          type: this.mode === 'buy' ? 'up' : 'down',
          timestamp: Date.now(),
          isTargetAlert: true,
          message: `💼 Fulfill Market Order: ${this.mode === 'buy' ? 'Bought' : 'Sold'} ${qty.toFixed(4)} shares of ${this.ticker} at $${price.toFixed(2)}!`
        });

        this.recordJournalEntry(qty, price);
        this.launchConfetti(this.mode === 'buy' ? '#00d395' : '#ff4560');
        this.playConfirmSound(this.mode === 'buy' ? 'buy' : 'sell');
        this.success.emit();
        this.close.emit();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.error || 'Something went wrong.';
      }
    });
  }

  private placeAdvancedOrder(qty: number, price: number, total: number): void {
    const targetPrice = this.limitPrice || this.currentPrice;
    
    const newOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ticker: this.ticker.toUpperCase(),
      company: this.company,
      type: this.mode,
      orderType: this.orderType,
      targetPrice,
      quantityType: this.quantityType,
      quantity: this.quantityType === 'cash' ? this.cashAmount : qty,
      status: 'pending',
      date: new Date()
    };

    try {
      const raw = localStorage.getItem('active-orders');
      const orders = raw ? JSON.parse(raw) : [];
      orders.push(newOrder);
      localStorage.setItem('active-orders', JSON.stringify(orders));

      // Trigger high-end electronic alert sound chime
      this.notifications.playPremiumBellChime();
      
      const orderTypeName = this.orderType === 'limit' ? 'Limit Order' : this.orderType === 'stop-loss' ? 'Stop Loss' : 'Take Profit';
      const actionName = this.mode === 'buy' ? 'Buy' : 'Sell';
      const qtyLabel = this.quantityType === 'cash' ? `$` + this.cashAmount : `${qty.toFixed(4)} shares`;

      this.notifications.addNotification({
        id: `order-create-${this.ticker}-${Date.now()}`,
        ticker: this.ticker,
        company: this.company,
        currentPrice: this.currentPrice,
        previousPrice: targetPrice,
        change: 0,
        changePercent: 0,
        type: this.mode === 'buy' ? 'up' : 'down',
        timestamp: Date.now(),
        isTargetAlert: true,
        message: `📝 ${orderTypeName} Created: ${actionName} ${qtyLabel} of ${this.ticker} at target $${targetPrice.toFixed(2)}!`
      });

      this.playConfirmSound('advanced');
      this.success.emit();
      this.close.emit();
    } catch (e) {
      this.errorMsg = 'Failed to record limit order settings in memory.';
    }
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.close.emit();
  }

  playConfirmSound(type: 'buy' | 'sell' | 'advanced'): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'buy') {
        // Ascending two-note ding
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);       // C5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12); // G5
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      } else if (type === 'sell') {
        // Descending two-note
        osc.frequency.setValueAtTime(783.99, ctx.currentTime);
        osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.14, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      } else {
        // Single soft click for advanced orders
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      }

      osc.type = 'sine';
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (_) {
      // AudioContext not available — silently skip
    }
  }

  recordJournalEntry(qty: number, price: number): void {
    try {
      const raw = localStorage.getItem('sv-journal');
      const entries = raw ? JSON.parse(raw) : [];
      entries.unshift({
        id: `jrn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date: new Date().toISOString(),
        ticker: this.ticker,
        company: this.company,
        action: this.mode,
        quantity: qty,
        price,
        total: qty * price,
        note: '',
        mood: 'neutral',
        tags: [],
        editingNote: false
      });
      localStorage.setItem('sv-journal', JSON.stringify(entries.slice(0, 200)));
    } catch { /* ignore */ }
  }

  launchConfetti(primaryColor: string): void {
    const canvas = this.confettiCanvasRef?.nativeElement;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = [primaryColor, '#a5b4fc', '#f59e0b', '#38bdf8', '#ffffff', '#fb7185'];
    const pieces: any[] = [];
    const count = 160;

    for (let i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        vy: Math.random() * 3 + 2,
        vx: (Math.random() - 0.5) * 2,
        opacity: 1
      });
    }

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.rotSpeed;
        p.vy += 0.05;
        if (frame > 80) p.opacity -= 0.015;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      frame++;
      if (frame < 140) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    animate();
  }
}
