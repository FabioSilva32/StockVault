const express = require('express');
const router = express.Router();

// GET real stock candles from Yahoo Finance
router.get('/candles', async (req, res) => {
  const { ticker, tf } = req.query;
  console.log(`[Backend API] Request received for candles: ticker=${ticker}, tf=${tf}`);
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  const symbol = ticker.toUpperCase();
  const timeframe = tf || '1M';

  // Map timeframe to Yahoo Finance range and interval
  let range = '1mo';
  let interval = '1d';

  switch (timeframe) {
    case '1D':
      range = '1d';
      interval = '5m';
      break;
    case '1W':
      range = '5d';
      interval = '15m';
      break;
    case '1M':
      range = '1mo';
      interval = '1d';
      break;
    case '3M':
      range = '3mo';
      interval = '1d';
      break;
    case '1Y':
      range = '1y';
      interval = '1d';
      break;
    case '5Y':
      range = '5y';
      interval = '1wk';
      break;
    default:
      range = '1mo';
      interval = '1d';
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
    console.log(`[Backend API] Fetching real candles from: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://finance.yahoo.com',
        'Referer': 'https://finance.yahoo.com/'
      }
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Yahoo Finance responded with status ${response.status}: ${errText.substring(0, 150)}`);
    }

    const json = await response.json();
    const result = json.chart?.result?.[0];
    if (!result) {
      return res.status(404).json({ error: 'No data found for this symbol' });
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      const time = timestamps[i];
      const open = opens[i];
      const high = highs[i];
      const low = lows[i];
      const close = closes[i];

      // Skip invalid/null values (often occurs outside trading hours or halts)
      if (
        time === undefined ||
        open === null || open === undefined ||
        high === null || high === undefined ||
        low === null || low === undefined ||
        close === null || close === undefined
      ) {
        continue;
      }

      candles.push({
        time, // Unix timestamp in seconds
        open,
        high,
        low,
        close
      });
    }

    res.json(candles);
  } catch (error) {
    console.error(`Error fetching candles for ${symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch historical stock data' });
  }
});

module.exports = router;
