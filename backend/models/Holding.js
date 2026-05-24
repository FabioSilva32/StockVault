const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
  ticker: { type: String, required: true, unique: true, uppercase: true },
  company: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  avgPurchasePrice: { type: Number, required: true },
  firstPurchaseDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Holding', holdingSchema);
