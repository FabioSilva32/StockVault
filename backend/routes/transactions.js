const express = require('express');
const router = express.Router();
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

// GET all transactions for this user (newest first)
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    let transactions = await Transaction.find({ userId }).sort({ date: -1 });

    if (transactions.length === 0 && (userId === 'guest' || userId === 'demo-777')) {
      transactions = await Transaction.insertMany([
        { userId, type: 'buy', ticker: 'MSFT', company: 'Microsoft', quantity: 20, price: 320.00, total: 6400.00, date: new Date('2026-03-01') },
        { userId, type: 'buy', ticker: 'TSLA', company: 'Tesla', quantity: 50, price: 220.00, total: 11000.00, date: new Date('2026-03-20') }
      ]);
    }

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
