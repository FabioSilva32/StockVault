import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription, Subject } from 'rxjs';
import { LivePriceService } from './live-price.service';
import { Router, NavigationEnd } from '@angular/router';
import { PortfolioApiService } from './portfolio-api.service';

export interface PriceNotification {
  id: string;
  ticker: string;
  company: string;
  currentPrice: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  type: 'up' | 'down';
  timestamp: number;
  isTargetAlert?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<PriceNotification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  // Subject to notify active components (like StockDetail) when any alert state changes in localStorage
  public alertsChanged$ = new Subject<void>();

  // Global alerts tracking
  private alertSubscriptions = new Map<string, Subscription>();

  // Tracks the last known price for each stock ticker to skip the first emission on reload and prevent spam
  private lastKnownPrices = new Map<string, number>();

  // Safeguard to prevent playing the chime sound multiple times in rapid succession
  private lastChimeTime = 0;

  constructor(
    private livePriceService: LivePriceService,
    private router: Router,
    private portfolioApi: PortfolioApiService
  ) {
    console.log('[NotificationService] Constructor: Initializing active alerts monitoring...');
    this.refreshAllMonitoredTickers();

    // Re-verify and sync active background subscriptions on page navigation
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        console.log(`[NotificationService] Router transition to: ${event.url}. Synchronizing active alerts...`);
        this.refreshAllMonitoredTickers();
      }
    });
  }

  /**
   * Scans target alerts in localStorage to establish background price watchers.
   * Optimizes background subscriptions by strictly watching tickers that have pending target alerts.
   */
  refreshAllMonitoredTickers(): void {
    const tickersWithAlerts: string[] = [];
    
    // Scan all keys in localStorage for active stock price alerts
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('alerts-')) {
        const ticker = key.replace('alerts-', '').toUpperCase();
        try {
          const raw = localStorage.getItem(key);
          const alerts = raw ? JSON.parse(raw) : [];
          const hasPending = alerts.some((a: any) => !a.triggered);
          if (hasPending) {
            tickersWithAlerts.push(ticker);
          }
        } catch (e) {
          console.error(`[NotificationService] Failed to scan active alerts for ${ticker}:`, e);
        }
      }
    }

    const tickersToWatch = new Set<string>(tickersWithAlerts);
    this.syncSubscriptions(tickersToWatch);
  }

  /**
   * Compatibility wrapper for stock-detail component or other local triggers.
   */
  refreshActiveAlerts(): void {
    this.refreshAllMonitoredTickers();
  }

  private syncSubscriptions(tickersToWatch: Set<string>): void {
    // Unsubscribe from tickers we no longer need to watch
    this.alertSubscriptions.forEach((sub, ticker) => {
      if (!tickersToWatch.has(ticker)) {
        console.log(`[NotificationService] Unsubscribing from price ticks for ${ticker}`);
        sub.unsubscribe();
        this.alertSubscriptions.delete(ticker);
        this.lastKnownPrices.delete(ticker); // Reset price tracking for this ticker
      }
    });

    // Subscribe to tickers with pending alerts
    tickersToWatch.forEach(ticker => {
      if (!this.alertSubscriptions.has(ticker)) {
        console.log(`[NotificationService] Establishing global background watcher for ticker with target alert: ${ticker}`);
        const sub = this.livePriceService.getPriceStream(ticker).subscribe(priceData => {
          if (priceData) {
            this.checkGlobalAlerts(ticker, priceData.currentPrice);
          }
        });
        this.alertSubscriptions.set(ticker, sub);
      }
    });
  }

  private checkGlobalAlerts(ticker: string, price: number): void {
    // First-emission skip: If we don't have a last known price, record it and return.
    // This absolutely prevents false alert triggers upon page reload or route transition!
    const lastPrice = this.lastKnownPrices.get(ticker);
    this.lastKnownPrices.set(ticker, price);

    if (lastPrice === undefined) {
      console.log(`[NotificationService] Seeded initial session price for ${ticker}: $${price.toFixed(2)}. Monitoring subsequent ticks...`);
      return;
    }

    const key = `alerts-${ticker}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const alerts = JSON.parse(raw);
      let changed = false;

      alerts.forEach((alert: any) => {
        if (!alert.triggered) {
          // Precise crossing logic or threshold check
          const hitAbove = alert.condition === 'above' && price >= alert.price;
          const hitBelow = alert.condition === 'below' && price <= alert.price;
          
          if (hitAbove || hitBelow) {
            console.log(`[NotificationService] 🚨 TARGET ALERT BREACHED for ${ticker}! Current price: $${price.toFixed(2)}, Target: $${alert.price.toFixed(2)} (${alert.condition})`);
            alert.triggered = true;
            changed = true;

            const alertNotif: PriceNotification = {
              id: `alert-${ticker}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              ticker: ticker,
              company: this.getCompanyName(ticker),
              currentPrice: price,
              previousPrice: alert.price,
              change: price - alert.price,
              changePercent: alert.price > 0 ? ((price - alert.price) / alert.price) * 100 : 0,
              type: alert.condition === 'above' ? 'up' : 'down',
              timestamp: Date.now(),
              isTargetAlert: true,
              message: `Went ${alert.condition === 'above' ? 'above' : 'below'} your target of $${alert.price.toFixed(2)}`
            };

            // Trigger the Trading 212 sound effect
            this.playPremiumBellChime();

            this.addNotification(alertNotif);
          }
        }
      });

      if (changed) {
        localStorage.setItem(key, JSON.stringify(alerts));
        console.log(`[NotificationService] Updated trigger state stored for ${ticker}`);
        
        // Notify any active components to reload alerts from localStorage
        this.alertsChanged$.next();

        // Refresh watchers to clean up completed/triggered alerts
        this.refreshAllMonitoredTickers();
      }
    } catch (e) {
      console.error(`[NotificationService] Error processing global alerts for ${ticker}:`, e);
    }
  }

  addNotification(notification: PriceNotification): void {
    const current = this.notificationsSubject.value;
    // Deduplicate rapid triggers
    const isDuplicate = current.some(n => 
      n.ticker === notification.ticker && 
      n.isTargetAlert === notification.isTargetAlert && 
      Math.abs(n.currentPrice - notification.currentPrice) < 0.01 && 
      (Date.now() - n.timestamp) < 3000
    );
    if (isDuplicate) return;

    // Toast will stay on the screen longer (12 seconds) or until dismissed manually
    const updated = [notification, ...current];
    this.notificationsSubject.next(updated);

    setTimeout(() => {
      this.dismiss(notification.id);
    }, 12000);
  }

  dismiss(id: string): void {
    const updated = this.notificationsSubject.value.filter(n => n.id !== id);
    this.notificationsSubject.next(updated);
  }

  /**
   * Plays a synthesized double-tone premium electronic bell chime (recreating the Trading 212 alert sound)
   * using the native Web Audio API (completely offline, high-performance, and responsive).
   */
  public playPremiumBellChime(): void {
    const nowMs = Date.now();
    // Cooldown of 3 seconds to avoid speaker distortion if multiple alerts fire simultaneously
    if (nowMs - this.lastChimeTime < 3000) {
      return;
    }
    this.lastChimeTime = nowMs;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // 1st Tone - Crisp High Bell (Sine wave)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5 note
      osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.15); // pitch slide up
      
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.02); // attack
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6); // decay

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // 2nd Tone - Warm Harmonic Support (Triangle wave, slightly delayed)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now + 0.08); // A4 note
      
      gain2.gain.setValueAtTime(0.001, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.12, now + 0.1); // attack
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8); // decay

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      // Play and clean up
      osc1.start(now);
      osc1.stop(now + 0.6);

      osc2.start(now + 0.08);
      osc2.stop(now + 0.8);
      
    } catch (e) {
      console.warn('[NotificationService] Web Audio chime blocked or unsupported:', e);
    }
  }

  /**
   * @deprecated Standard price drift notifications are disabled by default to prevent spam and match Trading 212 standards.
   */
  notifyPriceChange(ticker: string, company: string, currentPrice: number, changePercent: number): void {
    // No-op stub to prevent compile errors across other parts of the application
  }

  private getCompanyName(ticker: string): string {
    const map: any = {
      'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp.', 'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.', 'NVDA': 'NVIDIA Corp.', 'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.', 'NFLX': 'Netflix Inc.', 'JPM': 'JPMorgan Chase & Co.',
      'V': 'Visa Inc.', 'BRK.B': 'Berkshire Hathaway Inc.', 'JNJ': 'Johnson & Johnson'
    };
    return map[ticker.toUpperCase()] || ticker + ' Inc.';
  }
}

