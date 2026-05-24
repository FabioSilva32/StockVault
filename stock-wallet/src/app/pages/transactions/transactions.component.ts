import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PortfolioApiService } from '../../core/services/portfolio-api.service';
import { LogoService } from '../../core/services/logo.service';
import { Transaction } from '../../core/models/models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  loading = true;
  error = '';

  filterType: 'all' | 'buy' | 'sell' = 'all';
  filterTicker = '';
  sortBy: 'date' | 'total' | 'ticker' = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  constructor(
    private portfolioApi: PortfolioApiService,
    private logoService: LogoService
  ) {}

  getLogoUrl(ticker: string): string | null {
    return this.logoService.getLogoUrl(ticker);
  }

  reportBrokenLogo(ticker: string): void {
    this.logoService.reportBrokenLogo(ticker);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.portfolioApi.getTransactions().subscribe({
      next: data => {
        this.transactions = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.loading = false;
      },
      error: () => { this.error = 'Failed to load transactions.'; this.loading = false; }
    });
  }

  get filteredTransactions(): Transaction[] {
    let result = [...this.transactions];
    if (this.filterType !== 'all') result = result.filter(t => t.type === this.filterType);
    if (this.filterTicker.trim()) {
      const q = this.filterTicker.trim().toUpperCase();
      result = result.filter(t => t.ticker.includes(q) || t.company.toUpperCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (this.sortBy === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (this.sortBy === 'total') cmp = a.total - b.total;
      else if (this.sortBy === 'ticker') cmp = a.ticker.localeCompare(b.ticker);
      return this.sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }

  setSort(col: 'date' | 'total' | 'ticker'): void {
    if (this.sortBy === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = col;
      this.sortDir = 'desc';
    }
  }

  totalBought(): number {
    return this.transactions.filter(t => t.type === 'buy').reduce((s, t) => s + t.total, 0);
  }

  totalSold(): number {
    return this.transactions.filter(t => t.type === 'sell').reduce((s, t) => s + t.total, 0);
  }

  get uniqueTickers(): string[] {
    return [...new Set(this.transactions.map(t => t.ticker))].sort();
  }

  trackById(_: number, t: Transaction): string { return t._id || ''; }

  // ── Period P&L ──────────────────────────────────────────
  periodPnl(days: number): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const inPeriod = this.transactions.filter(t => new Date(t.date) >= cutoff);
    const bought = inPeriod.filter(t => t.type === 'buy').reduce((s, t) => s + t.total, 0);
    const sold   = inPeriod.filter(t => t.type === 'sell').reduce((s, t) => s + t.total, 0);
    return sold - bought; // positive = net cash returned
  }

  periodCount(days: number): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.transactions.filter(t => new Date(t.date) >= cutoff).length;
  }

  // ── CSV Export ───────────────────────────────────────────
  exportCsv(): void {
    const header = ['Date', 'Type', 'Ticker', 'Company', 'Quantity', 'Price', 'Total'];
    const rows = this.filteredTransactions.map(t => [
      new Date(t.date).toISOString(),
      t.type.toUpperCase(),
      t.ticker,
      `"${t.company.replace(/"/g, '""')}"`,
      t.quantity,
      t.price.toFixed(2),
      t.total.toFixed(2)
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StockVault_Transactions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
