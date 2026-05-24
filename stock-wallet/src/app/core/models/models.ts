export interface Holding {
  _id?: string;
  ticker: string;
  company: string;
  quantity: number;
  avgPurchasePrice: number;
  firstPurchaseDate: string;
  // Enriched on frontend
  currentPrice?: number;
  currentValue?: number;
  totalCost?: number;
  gainLoss?: number;
  gainLossPct?: number;
}

export interface Transaction {
  _id?: string;
  type: 'buy' | 'sell';
  ticker: string;
  company: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
}

export interface FinnhubQuote {
  c: number;   // Current price
  d: number;   // Change
  dp: number;  // Percent change
  h: number;   // High
  l: number;   // Low
  o: number;   // Open
  pc: number;  // Previous close
  v?: number;  // Volume
}

export interface FinnhubProfile {
  name: string;
  ticker: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  shareOutstanding: number;
  currency: string;
  logo: string;
  weburl: string;
  finnhubIndustry: string;
}

export interface FinnhubCandles {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  v: number[];
  t: number[];
  s: string;
}

export interface FinnhubNewsArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface BuySellRequest {
  ticker: string;
  company: string;
  quantity: number;
  price: number;
}

export interface MarketStock {
  ticker: string;
  company: string;
  sector?: string;
  quote?: FinnhubQuote;
  loading?: boolean;
  watchlisted?: boolean;
  flashState?: 'up' | 'down' | null;
}

