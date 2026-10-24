import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CashService {
  private readonly DEFAULT_CASH = 50000.00;
  private cashSubject: BehaviorSubject<number>;

  constructor() {
    const initialCash = this.loadCash();
    this.cashSubject = new BehaviorSubject<number>(initialCash);

    // Listen for auth storage changes across tabs or login events
    window.addEventListener('storage', (e) => {
      if (e.key === 'stockvault_auth_user' || (e.key && e.key.startsWith('stock-wallet-cash-'))) {
        this.reloadForCurrentUser();
      }
    });
  }

  private getCashKey(): string {
    try {
      const userRaw = localStorage.getItem('stockvault_auth_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u && u.id) return `stock-wallet-cash-${u.id}`;
      }
    } catch {}
    return 'stock-wallet-cash-guest';
  }

  private getDefaultCash(): number {
    try {
      const userRaw = localStorage.getItem('stockvault_auth_user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u && (u.id === 'demo-777' || (u.email && u.email.includes('demo')))) {
          return 75000.00;
        }
        if (u && typeof u.cashBalance === 'number') {
          return u.cashBalance;
        }
      }
    } catch {}
    return this.DEFAULT_CASH;
  }

  public reloadForCurrentUser(): void {
    const cash = this.loadCash();
    this.cashSubject.next(cash);
  }

  /**
   * Get the cash balance as an observable stream
   */
  getCashStream(): Observable<number> {
    return this.cashSubject.asObservable();
  }

  /**
   * Get the current cash balance value synchronously
   */
  getBalance(): number {
    return this.cashSubject.value;
  }

  /**
   * Deposit virtual cash into the wallet
   */
  deposit(amount: number): void {
    if (amount <= 0) return;
    const newBalance = this.getBalance() + amount;
    this.saveCash(newBalance);
  }

  /**
   * Withdraw virtual cash from the wallet. Returns true if successful.
   */
  withdraw(amount: number): boolean {
    if (amount <= 0) return false;
    const current = this.getBalance();
    if (current < amount) return false;
    
    const newBalance = current - amount;
    this.saveCash(newBalance);
    return true;
  }

  /**
   * Deduct cash for a stock purchase. Returns true if successful.
   */
  deduct(amount: number): boolean {
    return this.withdraw(amount);
  }

  /**
   * Add cash from a stock sale
   */
  add(amount: number): void {
    this.deposit(amount);
  }

  private loadCash(): number {
    const key = this.getCashKey();
    const defaultAmount = this.getDefaultCash();
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const val = parseFloat(stored);
        return isNaN(val) ? defaultAmount : val;
      }
    } catch (e) {
      console.error('Error loading cash balance from localStorage:', e);
    }
    // Set default and save for this user
    this.saveCash(defaultAmount);
    return defaultAmount;
  }

  private saveCash(amount: number): void {
    const key = this.getCashKey();
    try {
      const sanitized = Math.max(0, amount);
      localStorage.setItem(key, sanitized.toFixed(2));
      this.cashSubject.next(sanitized);
    } catch (e) {
      console.error('Error saving cash balance to localStorage:', e);
    }
  }
}
