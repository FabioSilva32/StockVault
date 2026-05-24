import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LogoService } from '../../core/services/logo.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface JournalEntry {
  id: string;
  date: string;
  ticker: string;
  company: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  note: string;
  mood: 'bullish' | 'bearish' | 'neutral';
  tags: string[];
  editingNote: boolean;
}

const MOODS = ['bullish', 'bearish', 'neutral'] as const;
const MOOD_ICONS: Record<string, string> = {
  bullish: '🚀', bearish: '🐻', neutral: '😐'
};
const MOOD_COLORS: Record<string, string> = {
  bullish: '#00d395', bearish: '#ff4560', neutral: '#f59e0b'
};

@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslatePipe],
  templateUrl: './journal.component.html',
  styleUrls: ['./journal.component.css']
})
export class JournalComponent implements OnInit {
  entries: JournalEntry[] = [];
  filteredEntries: JournalEntry[] = [];
  filterAction: 'all' | 'buy' | 'sell' = 'all';
  filterMood: string = 'all';
  sortBy: 'date' | 'total' | 'ticker' = 'date';
  searchQuery = '';

  newTagInput: Record<string, string> = {};

  // Stats
  totalTrades = 0;
  buyCount = 0;
  sellCount = 0;
  totalVolume = 0;
  mostTradedTicker = '';
  avgTradeSize = 0;

  moods = MOODS;
  moodIcons = MOOD_ICONS;
  moodColors = MOOD_COLORS;

  constructor(private logoService: LogoService) {}

  getLogoUrl(ticker: string): string | null {
    return this.logoService.getLogoUrl(ticker);
  }

  reportBrokenLogo(ticker: string): void {
    this.logoService.reportBrokenLogo(ticker);
  }

  ngOnInit(): void {
    this.loadEntries();
    // On first visit, synthesize entries from transaction localStorage if any
    if (this.entries.length === 0) {
      this.synthesizeFromTransactions();
    }
    this.applyFilters();
    this.calcStats();
  }

  private loadEntries(): void {
    try {
      const raw = localStorage.getItem('sv-journal');
      this.entries = raw ? JSON.parse(raw) : [];
    } catch {
      this.entries = [];
    }
  }

  private saveEntries(): void {
    localStorage.setItem('sv-journal', JSON.stringify(this.entries));
  }

  private synthesizeFromTransactions(): void {
    // Try to build initial journal entries from any stored transactions
    try {
      const raw = localStorage.getItem('sv-transactions');
      if (!raw) return;
      const txns = JSON.parse(raw);
      this.entries = txns.slice(0, 20).map((t: any) => ({
        id: t.id || `jrn-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
        date: t.date || new Date().toISOString(),
        ticker: t.ticker || '',
        company: t.company || '',
        action: t.type || 'buy',
        quantity: t.quantity || 0,
        price: t.price || 0,
        total: (t.quantity || 0) * (t.price || 0),
        note: '',
        mood: 'neutral',
        tags: [],
        editingNote: false
      }));
      this.saveEntries();
    } catch { /* ignore */ }
  }

  applyFilters(): void {
    let result = [...this.entries];

    if (this.filterAction !== 'all') {
      result = result.filter(e => e.action === this.filterAction);
    }
    if (this.filterMood !== 'all') {
      result = result.filter(e => e.mood === this.filterMood);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(e =>
        e.ticker.toLowerCase().includes(q) ||
        e.company.toLowerCase().includes(q) ||
        e.note.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (this.sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (this.sortBy === 'total') return b.total - a.total;
      return a.ticker.localeCompare(b.ticker);
    });

    this.filteredEntries = result;
  }

  calcStats(): void {
    this.totalTrades = this.entries.length;
    this.buyCount = this.entries.filter(e => e.action === 'buy').length;
    this.sellCount = this.entries.filter(e => e.action === 'sell').length;
    this.totalVolume = this.entries.reduce((s, e) => s + e.total, 0);
    this.avgTradeSize = this.totalTrades > 0 ? this.totalVolume / this.totalTrades : 0;

    // Most traded ticker
    const freq: Record<string, number> = {};
    this.entries.forEach(e => freq[e.ticker] = (freq[e.ticker] || 0) + 1);
    const top = Object.entries(freq).sort((a,b) => b[1]-a[1])[0];
    this.mostTradedTicker = top ? top[0] : '—';
  }

  saveNote(entry: JournalEntry): void {
    entry.editingNote = false;
    this.saveEntries();
  }

  setMood(entry: JournalEntry, mood: 'bullish' | 'bearish' | 'neutral'): void {
    entry.mood = mood;
    this.saveEntries();
    this.applyFilters();
  }

  addTag(entry: JournalEntry): void {
    const tag = (this.newTagInput[entry.id] || '').trim().toLowerCase();
    if (tag && !entry.tags.includes(tag)) {
      entry.tags.push(tag);
      this.saveEntries();
    }
    this.newTagInput[entry.id] = '';
  }

  removeTag(entry: JournalEntry, tag: string): void {
    entry.tags = entry.tags.filter(t => t !== tag);
    this.saveEntries();
  }

  deleteEntry(id: string): void {
    this.entries = this.entries.filter(e => e.id !== id);
    this.saveEntries();
    this.applyFilters();
    this.calcStats();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  trackById(_: number, e: JournalEntry): string { return e.id; }
}
