import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'portfolio', pathMatch: 'full' },
  { path: 'portfolio', loadComponent: () => import('./pages/portfolio/portfolio.component').then(m => m.PortfolioComponent) },
  { path: 'market', loadComponent: () => import('./pages/market/market.component').then(m => m.MarketComponent) },
  { path: 'watchlist', loadComponent: () => import('./pages/watchlist/watchlist.component').then(m => m.WatchlistComponent) },
  { path: 'transactions', loadComponent: () => import('./pages/transactions/transactions.component').then(m => m.TransactionsComponent) },
  { path: 'stock/:ticker', loadComponent: () => import('./pages/stock-detail/stock-detail.component').then(m => m.StockDetailComponent) },
  { path: 'compare', loadComponent: () => import('./pages/compare/compare.component').then(m => m.CompareComponent) },
  { path: 'journal', loadComponent: () => import('./pages/journal/journal.component').then(m => m.JournalComponent) },
  { path: '**', redirectTo: 'portfolio' }
];
