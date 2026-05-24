import { Injectable } from '@angular/core';
import { FinnhubService } from './finnhub.service';

@Injectable({
  providedIn: 'root'
})
export class LogoService {
  // Hardcoded premium logos for top popular stocks and ETFs to ensure instant loading
  private readonly popularLogos: Record<string, string> = {
    'AAPL': 'https://logo.clearbit.com/apple.com',
    'MSFT': 'https://logo.clearbit.com/microsoft.com',
    'GOOGL': 'https://logo.clearbit.com/google.com',
    'GOOG': 'https://logo.clearbit.com/google.com',
    'AMZN': 'https://logo.clearbit.com/amazon.com',
    'NVDA': 'https://logo.clearbit.com/nvidia.com',
    'TSLA': 'https://logo.clearbit.com/tesla.com',
    'META': 'https://logo.clearbit.com/meta.com',
    'NFLX': 'https://logo.clearbit.com/netflix.com',
    'JPM': 'https://logo.clearbit.com/jpmorganchase.com',
    'V': 'https://logo.clearbit.com/visa.com',
    'BRK.B': 'https://logo.clearbit.com/berkshirehathaway.com',
    'BRK.A': 'https://logo.clearbit.com/berkshirehathaway.com',
    'JNJ': 'https://logo.clearbit.com/jnj.com',
    'SPY': 'https://logo.clearbit.com/statestreet.com',
    'QQQ': 'https://logo.clearbit.com/invesco.com',
    'DIA': 'https://logo.clearbit.com/statestreet.com',
    'VOO': 'https://logo.clearbit.com/vanguard.com',
    'IVV': 'https://logo.clearbit.com/ishares.com',
    'IWM': 'https://logo.clearbit.com/ishares.com',
    'AMD': 'https://logo.clearbit.com/amd.com',
    'INTC': 'https://logo.clearbit.com/intel.com',
    'CRM': 'https://logo.clearbit.com/salesforce.com',
    'DIS': 'https://logo.clearbit.com/disney.com',
    'NKE': 'https://logo.clearbit.com/nike.com',
    'WMT': 'https://logo.clearbit.com/walmart.com',
    'HD': 'https://logo.clearbit.com/homedepot.com',
    'KO': 'https://logo.clearbit.com/coca-colacompany.com',
    'PEP': 'https://logo.clearbit.com/pepsico.com',
    'SBUX': 'https://logo.clearbit.com/starbucks.com',
    'MCD': 'https://logo.clearbit.com/mcdonalds.com',
    'XOM': 'https://logo.clearbit.com/exxonmobil.com',
    'CVX': 'https://logo.clearbit.com/chevron.com',
    'GE': 'https://logo.clearbit.com/ge.com',
    'MU': 'https://logo.clearbit.com/micron.com',
    'BAC': 'https://logo.clearbit.com/bankofamerica.com',
    'GS': 'https://logo.clearbit.com/goldmansachs.com',
    'MS': 'https://logo.clearbit.com/morganstanley.com',
    'PYPL': 'https://logo.clearbit.com/paypal.com',
    'SQ': 'https://logo.clearbit.com/block.xyz',
    'SHOP': 'https://logo.clearbit.com/shopify.com',
    'ADBE': 'https://logo.clearbit.com/adobe.com',
    'ORCL': 'https://logo.clearbit.com/oracle.com',
    'CSCO': 'https://logo.clearbit.com/cisco.com',
    'AVGO': 'https://logo.clearbit.com/broadcom.com',
    'QCOM': 'https://logo.clearbit.com/qualcomm.com',
    'TXN': 'https://logo.clearbit.com/ti.com',
    'ASML': 'https://logo.clearbit.com/asml.com',
    'TSM': 'https://logo.clearbit.com/tsmc.com',
    'BABA': 'https://logo.clearbit.com/alibaba.com',
    'JD': 'https://logo.clearbit.com/jd.com',
    'PDD': 'https://logo.clearbit.com/pinduoduo.com',
    'T': 'https://logo.clearbit.com/att.com',
    'VZ': 'https://logo.clearbit.com/verizon.com',
    'TMUS': 'https://logo.clearbit.com/t-mobile.com',
    'CMCSA': 'https://logo.clearbit.com/comcast.com',
    'UNH': 'https://logo.clearbit.com/unitedhealthgroup.com',
    'LLY': 'https://logo.clearbit.com/lilly.com',
    'NVO': 'https://logo.clearbit.com/novonordisk.com',
    'MRK': 'https://logo.clearbit.com/merck.com',
    'ABBV': 'https://logo.clearbit.com/abbvie.com',
    'PFE': 'https://logo.clearbit.com/pfizer.com',
    'TMO': 'https://logo.clearbit.com/thermofisher.com',
    'ABT': 'https://logo.clearbit.com/abbott.com',
    'DHR': 'https://logo.clearbit.com/danaher.com',
    'BMY': 'https://logo.clearbit.com/bms.com',
    'AMGN': 'https://logo.clearbit.com/amgen.com',
    'GILD': 'https://logo.clearbit.com/gilead.com',
    'ISRG': 'https://logo.clearbit.com/intuitive.com',
    'VRTX': 'https://logo.clearbit.com/vrtx.com',
    'REGN': 'https://logo.clearbit.com/regeneron.com',
    'CAT': 'https://logo.clearbit.com/caterpillar.com',
    'DE': 'https://logo.clearbit.com/deere.com',
    'GEV': 'https://logo.clearbit.com/ge.com',
    'HON': 'https://logo.clearbit.com/honeywell.com',
    'LMT': 'https://logo.clearbit.com/lockheedmartin.com',
    'RTX': 'https://logo.clearbit.com/rtx.com',
    'BA': 'https://logo.clearbit.com/boeing.com',
    'UPS': 'https://logo.clearbit.com/ups.com',
    'FDX': 'https://logo.clearbit.com/fedex.com',
    'UNP': 'https://logo.clearbit.com/up.com',
    'ADP': 'https://logo.clearbit.com/adp.com',
    'WM': 'https://logo.clearbit.com/wm.com',
    'RSG': 'https://logo.clearbit.com/republicservices.com',
    'COST': 'https://logo.clearbit.com/costco.com',
    'TGT': 'https://logo.clearbit.com/target.com',
    'LOW': 'https://logo.clearbit.com/lowes.com',
    'TJX': 'https://logo.clearbit.com/tjx.com',
    'EL': 'https://logo.clearbit.com/elcompanies.com',
    'CL': 'https://logo.clearbit.com/colgatepalmolive.com',
    'PG': 'https://logo.clearbit.com/pg.com'
  };

  private logoCache: Record<string, string> = {};
  private pendingFetches = new Set<string>();
  private failedTickers = new Set<string>();

  constructor(private finnhub: FinnhubService) {
    this.convertPopularLogosToGoogleFavicon();
    this.loadCacheFromStorage();
  }

  private convertPopularLogosToGoogleFavicon(): void {
    for (const key in this.popularLogos) {
      if (this.popularLogos.hasOwnProperty(key)) {
        this.popularLogos[key] = this.popularLogos[key].replace(
          'https://logo.clearbit.com/',
          'https://www.google.com/s2/favicons?sz=128&domain='
        );
      }
    }
  }

  private loadCacheFromStorage(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('logo-url-')) {
          const ticker = key.replace('logo-url-', '').toUpperCase();
          let url = localStorage.getItem(key);
          if (url) {
            // Migrating old Clearbit URLs to Google Favicon API
            if (url.includes('logo.clearbit.com')) {
              url = url.replace('https://logo.clearbit.com/', 'https://www.google.com/s2/favicons?sz=128&domain=');
              localStorage.setItem(key, url);
            }
            this.logoCache[ticker] = url;
          }
        }
      }
    } catch (e) {
      console.error('[LogoService] Failed to load logo cache from localStorage:', e);
    }
  }

  /**
   * Returns a company logo URL if cached. If not cached, starts a background fetch
   * from Finnhub's profile2 API and returns null until loaded.
   */
  getLogoUrl(ticker: string): string | null {
    if (!ticker) return null;
    const symbol = ticker.toUpperCase().trim();

    // 1. Check if ticker previously failed to fetch to avoid redundant requests/infinite loops
    if (this.failedTickers.has(symbol)) {
      return null;
    }

    // 2. Check popular stocks dictionary
    if (this.popularLogos[symbol]) {
      return this.popularLogos[symbol];
    }

    // 3. Check memory cache (loaded from localStorage on start)
    if (this.logoCache[symbol]) {
      return this.logoCache[symbol];
    }

    // 4. If not pending, trigger an asynchronous background fetch
    if (!this.pendingFetches.has(symbol)) {
      this.fetchLogoFromApi(symbol);
    }

    return null;
  }

  /**
   * Reports a broken image URL. Clears it from cache and localStorage,
   * adding the ticker to failedTickers to fall back to initials immediately.
   */
  reportBrokenLogo(ticker: string): void {
    if (!ticker) return;
    const symbol = ticker.toUpperCase().trim();
    console.warn(`[LogoService] Logo failed to load for ${symbol}. Cleaning and falling back to initials.`);
    
    delete this.logoCache[symbol];
    this.failedTickers.add(symbol);

    try {
      localStorage.removeItem(`logo-url-${symbol}`);
    } catch (e) {
      // Ignored
    }
  }

  private fetchLogoFromApi(symbol: string): void {
    this.pendingFetches.add(symbol);
    console.log(`[LogoService] Fetching profile background logo for: ${symbol}`);

    this.finnhub.getProfile(symbol).subscribe({
      next: profile => {
        this.pendingFetches.delete(symbol);
        
        let logoUrl = '';
        if (profile && profile.logo) {
          logoUrl = profile.logo;
        } else if (profile && profile.weburl) {
          // Fallback: extract domain and use Google Favicon API
          try {
            const domain = new URL(profile.weburl).hostname.replace('www.', '');
            logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
          } catch {
            // Ignored
          }
        }

        // If Finnhub returned a logoUrl, save it. Otherwise, guess using Google Favicon as a fallback!
        if (!logoUrl) {
          logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${symbol.toLowerCase()}.com`;
          console.log(`[LogoService] Finnhub returned no logo for ${symbol}. Tentatively guessing Google Favicon URL: ${logoUrl}`);
        }

        if (logoUrl) {
          console.log(`[LogoService] Logo mapped for ${symbol}: ${logoUrl}`);
          this.logoCache[symbol] = logoUrl;
          try {
            localStorage.setItem(`logo-url-${symbol}`, logoUrl);
          } catch (e) {
            console.error('[LogoService] Failed to write cache to localStorage:', e);
          }
        } else {
          console.log(`[LogoService] No logo could be guessed for ${symbol}. Using text initials fallback.`);
          this.failedTickers.add(symbol);
        }
      },
      error: err => {
        this.pendingFetches.delete(symbol);
        console.warn(`[LogoService] Failed to load profile for logo: ${symbol}.`, err);
        // Fallback to Google Favicon directly as a quick guess before giving up entirely!
        const guessUrl = `https://www.google.com/s2/favicons?sz=128&domain=${symbol.toLowerCase()}.com`;
        this.logoCache[symbol] = guessUrl;
        
        // Save the guess as a tentative cache so we don't repeat API calls
        try {
          localStorage.setItem(`logo-url-${symbol}`, guessUrl);
        } catch (e) {
          // Ignored
        }
      }
    });
  }
}

