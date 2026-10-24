const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: String, default: 'guest', index: true },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  ticker: { type: String, required: true, uppercase: true },
  company: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
