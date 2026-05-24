const express = require('express');
const router = express.Router();
const Holding = require('../models/Holding');
const Transaction = require('../models/Transaction');

// GET portfolio analytics/stats
router.get('/', async (req, res) => {
  try {
    const holdings = await Holding.find();
    const transactions = await Transaction.find().sort({ date: -1 }).limit(100);

    const totalInvested = holdings.reduce((sum, h) => sum + (h.quantity * h.avgPurchasePrice), 0);
    const totalBought = transactions.filter(t => t.type === 'buy').reduce((s, t) => s + t.total, 0);
    const totalSold = transactions.filter(t => t.type === 'sell').reduce((s, t) => s + t.total, 0);

    // Most traded stock
    const tickerCounts = {};
    transactions.forEach(t => { tickerCounts[t.ticker] = (tickerCounts[t.ticker] || 0) + 1; });
    const mostTraded = Object.entries(tickerCounts).sort((a, b) => b[1] - a[1])[0];

    // Monthly transaction volume
    const monthlyVolume = {};
    transactions.forEach(t => {
      const month = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
      monthlyVolume[month] = (monthlyVolume[month] || 0) + t.total;
    });

    res.json({
      totalPositions: holdings.length,
      totalInvested,
      totalBought,
      totalSold,
      netFlow: totalBought - totalSold,
      mostTradedTicker: mostTraded ? mostTraded[0] : null,
      mostTradedCount: mostTraded ? mostTraded[1] : 0,
      monthlyVolume,
      recentTransactions: transactions.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
