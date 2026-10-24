const express = require('express');
const router = express.Router();
const Holding = require('../models/Holding');
const Transaction = require('../models/Transaction');

function getUserId(req) {
  if (req.headers['x-user-id']) return req.headers['x-user-id'];
  const auth = req.headers.authorization;
  if (auth) {
    try {
      const token = auth.replace(/^Bearer\s+/i, '');
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [userId] = decoded.split(':');
      if (userId) return userId;
    } catch {}
  }
  return req.query.userId || 'guest';
}

// GET user holdings
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    let holdings = await Holding.find({ userId }).sort({ ticker: 1 });

    // If guest portfolio is empty, seed demo sample
    if (holdings.length === 0 && (userId === 'guest' || userId === 'demo-777')) {
      const seedData = [
        { userId, ticker: 'MSFT', company: 'Microsoft', quantity: 20, avgPurchasePrice: 320.00, firstPurchaseDate: new Date('2026-03-01') },
        { userId, ticker: 'TSLA', company: 'Tesla', quantity: 50, avgPurchasePrice: 220.00, firstPurchaseDate: new Date('2026-03-20') }
      ];
      holdings = await Holding.insertMany(seedData);
    }

    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST buy stocks
router.post('/buy', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { ticker, company, quantity, price } = req.body;
    if (!ticker || !company || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qty = Number(quantity);
    const prc = Number(price);
    const total = qty * prc;

    // Upsert holding for this specific user
    let holding = await Holding.findOne({ userId, ticker: ticker.toUpperCase() });
    if (holding) {
      const newTotalQty = holding.quantity + qty;
      const newAvgPrice = ((holding.avgPurchasePrice * holding.quantity) + (prc * qty)) / newTotalQty;
      holding.quantity = newTotalQty;
      holding.avgPurchasePrice = newAvgPrice;
      holding.company = company;
      await holding.save();
    } else {
      holding = await Holding.create({
        userId,
        ticker: ticker.toUpperCase(),
        company,
        quantity: qty,
        avgPurchasePrice: prc,
        firstPurchaseDate: new Date()
      });
    }

    // Log transaction for this specific user
    await Transaction.create({ userId, type: 'buy', ticker: ticker.toUpperCase(), company, quantity: qty, price: prc, total });

    res.json({ message: 'Purchase successful', holding });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST sell stocks
router.post('/sell', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { ticker, company, quantity, price } = req.body;
    if (!ticker || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qty = Number(quantity);
    const prc = Number(price);
    const total = qty * prc;

    const holding = await Holding.findOne({ userId, ticker: ticker.toUpperCase() });
    if (!holding) return res.status(404).json({ error: 'Holding not found' });
    if (holding.quantity < qty) return res.status(400).json({ error: 'Insufficient shares to sell' });

    holding.quantity -= qty;
    if (holding.quantity === 0) {
      await Holding.deleteOne({ _id: holding._id });
    } else {
      await holding.save();
    }

    // Log transaction
    await Transaction.create({ userId, type: 'sell', ticker: ticker.toUpperCase(), company: holding.company, quantity: qty, price: prc, total });

    res.json({ message: 'Sale successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
