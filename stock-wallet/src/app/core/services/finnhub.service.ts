import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FinnhubQuote, FinnhubProfile, FinnhubCandles, FinnhubNewsArticle } from '../models/models';

@Injectable({ providedIn: 'root' })
export class FinnhubService {
  private readonly apiKey = 'd885vf1r01qq4341oeegd885vf1r01qq4341oef0';
  private readonly base = 'https://finnhub.io/api/v1';

  constructor(private http: HttpClient) {}

  getQuote(symbol: string): Observable<FinnhubQuote> {
    return this.http.get<FinnhubQuote>(`${this.base}/quote?symbol=${symbol}&token=${this.apiKey}`);
  }

  getProfile(symbol: string): Observable<FinnhubProfile> {
    return this.http.get<FinnhubProfile>(`${this.base}/stock/profile2?symbol=${symbol}&token=${this.apiKey}`);
  }

  getCandles(symbol: string, resolution: string, from: number, to: number): Observable<FinnhubCandles> {
    return this.http.get<FinnhubCandles>(`${this.base}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${this.apiKey}`);
  }

  getNews(symbol: string, from: string, to: string): Observable<FinnhubNewsArticle[]> {
    return this.http.get<FinnhubNewsArticle[]>(`${this.base}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${this.apiKey}`);
  }

  searchSymbol(query: string): Observable<{ count: number; result: { description: string; displaySymbol: string; symbol: string; type: string }[] }> {
    return this.http.get<any>(`${this.base}/search?q=${query}&token=${this.apiKey}`);
  }
}
