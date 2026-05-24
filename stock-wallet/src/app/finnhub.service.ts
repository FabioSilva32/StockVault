import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
}

@Injectable({
  providedIn: 'root'
})
export class FinnhubService {
  private readonly apiKey = 'd885vf1r01qq4341oeegd885vf1r01qq4341oef0';
  private readonly apiUrl = 'https://finnhub.io/api/v1';

  constructor(private http: HttpClient) { }

  getQuote(symbol: string): Observable<FinnhubQuote> {
    return this.http.get<FinnhubQuote>(`${this.apiUrl}/quote?symbol=${symbol}&token=${this.apiKey}`);
  }
}
