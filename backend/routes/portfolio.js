const express = require('express');
const router = express.Router();
const Holding = require('../models/Holding');
const Transaction = require('../models/Transaction');

// GET all holdings
router.get('/', async (req, res) => {
  try {
    const holdings = await Holding.find().sort({ ticker: 1 });
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST buy stocks
router.post('/buy', async (req, res) => {
  try {
    const { ticker, company, quantity, price } = req.body;
    if (!ticker || !company || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qty = Number(quantity);
    const prc = Number(price);
    const total = qty * prc;

    // Upsert holding with weighted average price
    let holding = await Holding.findOne({ ticker: ticker.toUpperCase() });
    if (holding) {
      const newTotalQty = holding.quantity + qty;
      const newAvgPrice = ((holding.avgPurchasePrice * holding.quantity) + (prc * qty)) / newTotalQty;
      holding.quantity = newTotalQty;
      holding.avgPurchasePrice = newAvgPrice;
      holding.company = company;
      await holding.save();
    } else {
      holding = await Holding.create({
        ticker: ticker.toUpperCase(),
        company,
        quantity: qty,
        avgPurchasePrice: prc,
        firstPurchaseDate: new Date()
      });
    }

    // Log transaction
    await Transaction.create({ type: 'buy', ticker: ticker.toUpperCase(), company, quantity: qty, price: prc, total });

    res.json({ message: 'Purchase successful', holding });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST sell stocks
router.post('/sell', async (req, res) => {
  try {
    const { ticker, company, quantity, price } = req.body;
    if (!ticker || !quantity || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const qty = Number(quantity);
    const prc = Number(price);
    const total = qty * prc;

    const holding = await Holding.findOne({ ticker: ticker.toUpperCase() });
    if (!holding) return res.status(404).json({ error: 'Holding not found' });
    if (holding.quantity < qty) return res.status(400).json({ error: 'Insufficient shares to sell' });

    holding.quantity -= qty;
    if (holding.quantity === 0) {
      await Holding.deleteOne({ _id: holding._id });
    } else {
      await holding.save();
    }

    // Log transaction
    await Transaction.create({ type: 'sell', ticker: ticker.toUpperCase(), company: holding.company, quantity: qty, price: prc, total });

    res.json({ message: 'Sale successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
