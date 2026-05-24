import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Holding, Transaction, BuySellRequest } from '../models/models';

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
  private readonly base = '/api';

  constructor(private http: HttpClient) {}

  getHoldings(): Observable<Holding[]> {
    return this.http.get<Holding[]>(`${this.base}/portfolio`);
  }

  buy(payload: BuySellRequest): Observable<any> {
    return this.http.post(`${this.base}/portfolio/buy`, payload);
  }

  sell(payload: BuySellRequest): Observable<any> {
    return this.http.post(`${this.base}/portfolio/sell`, payload);
  }

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.base}/transactions`);
  }

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.base}/stats`);
  }

  getRealStockCandles(ticker: string, tf: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/stocks/candles?ticker=${ticker}&tf=${tf}`);
  }
}
