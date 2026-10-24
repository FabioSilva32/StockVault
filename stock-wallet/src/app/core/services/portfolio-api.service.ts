import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Holding, Transaction, BuySellRequest } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
  private readonly base = '/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): { headers: { [header: string]: string } } {
    const token = localStorage.getItem('stockvault_auth_token');
    const userRaw = localStorage.getItem('stockvault_auth_user');
    let userId = 'guest';
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u && u.id) userId = u.id;
      } catch {}
    }
    const headers: { [header: string]: string } = {
      'X-User-Id': userId
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return { headers };
  }

  getHoldings(): Observable<Holding[]> {
    return this.http.get<Holding[]>(`${this.base}/portfolio`, this.getHeaders());
  }

  buy(payload: BuySellRequest): Observable<any> {
    return this.http.post(`${this.base}/portfolio/buy`, payload, this.getHeaders());
  }

  sell(payload: BuySellRequest): Observable<any> {
    return this.http.post(`${this.base}/portfolio/sell`, payload, this.getHeaders());
  }

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.base}/transactions`, this.getHeaders());
  }

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/stats`, this.getHeaders());
  }

  getRealStockCandles(ticker: string, tf: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/stocks/candles?ticker=${ticker}&tf=${tf}`);
  }
}
