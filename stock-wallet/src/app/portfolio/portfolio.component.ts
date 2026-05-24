import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FinnhubService } from '../finnhub.service';
import { PortfolioItem } from '../portfolio-item.model';
import { forkJoin } from 'rxjs';

export interface PortfolioDisplayItem extends PortfolioItem {
  currentQuote: number;
  totalPurchaseValue: number;
  currentValue: number;
  variationPercentage: number;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css']
})
export class PortfolioComponent implements OnInit {
  portfolio: PortfolioDisplayItem[] = [];
  
  totalAcquisitionValue = 0;
  totalCurrentValue = 0;
  overallVariation = 0;

  constructor(
    private http: HttpClient,
    private finnhubService: FinnhubService
  ) {}

  ngOnInit(): void {
    this.loadPortfolio();
  }

  loadPortfolio(): void {
    this.http.get<PortfolioItem[]>('assets/portfolio.json').subscribe(items => {
      // Map basic items to display items, initializing calculated fields
      const displayItems: PortfolioDisplayItem[] = items.map(item => ({
        ...item,
        currentQuote: 0,
        totalPurchaseValue: item.quantity * item.purchasePrice,
        currentValue: 0,
        variationPercentage: 0
      }));
      
      this.portfolio = displayItems;

      // Fetch quotes for each item
      const quoteRequests = displayItems.map(item => this.finnhubService.getQuote(item.ticker));
      
      forkJoin(quoteRequests).subscribe(quotes => {
        quotes.forEach((quote, index) => {
          const item = this.portfolio[index];
          item.currentQuote = quote.c;
          item.currentValue = item.quantity * item.currentQuote;
          item.variationPercentage = ((item.currentValue - item.totalPurchaseValue) / item.totalPurchaseValue) * 100;
        });
        
        this.calculateTotals();
      });
    });
  }

  calculateTotals(): void {
    this.totalAcquisitionValue = this.portfolio.reduce((sum, item) => sum + item.totalPurchaseValue, 0);
    this.totalCurrentValue = this.portfolio.reduce((sum, item) => sum + item.currentValue, 0);
    this.overallVariation = ((this.totalCurrentValue - this.totalAcquisitionValue) / this.totalAcquisitionValue) * 100;
  }

  getVariationColor(variation: number): string {
    if (variation > 0) return 'text-success'; // Green
    if (variation < 0) return 'text-danger'; // Red
    return 'text-dark'; // Black
  }
}
