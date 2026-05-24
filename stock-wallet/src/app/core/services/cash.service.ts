import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CashService {
  private readonly CASH_KEY = 'stock-wallet-cash';
  private readonly DEFAULT_CASH = 50000.00;
  private cashSubject: BehaviorSubject<number>;

  constructor() {
    const initialCash = this.loadCash();
    this.cashSubject = new BehaviorSubject<number>(initialCash);
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
    try {
      const stored = localStorage.getItem(this.CASH_KEY);
      if (stored !== null) {
        const val = parseFloat(stored);
        return isNaN(val) ? this.DEFAULT_CASH : val;
      }
    } catch (e) {
      console.error('Error loading cash balance from localStorage:', e);
    }
    // Set default and save
    this.saveCash(this.DEFAULT_CASH);
    return this.DEFAULT_CASH;
  }

  private saveCash(amount: number): void {
    try {
      const sanitized = Math.max(0, amount);
      localStorage.setItem(this.CASH_KEY, sanitized.toFixed(2));
      this.cashSubject.next(sanitized);
    } catch (e) {
      console.error('Error saving cash balance to localStorage:', e);
    }
  }
}
