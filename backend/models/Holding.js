const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
  userId: { type: String, default: 'guest', index: true },
  ticker: { type: String, required: true, uppercase: true },
  company: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  avgPurchasePrice: { type: Number, required: true },
  firstPurchaseDate: { type: Date, default: Date.now }
}, { timestamps: true });

holdingSchema.index({ userId: 1, ticker: 1 }, { unique: true });

module.exports = mongoose.model('Holding', holdingSchema);
