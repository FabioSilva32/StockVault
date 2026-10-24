const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://a35713_db_user:Macaco69@cluster0.brcvrcz.mongodb.net/stockwallet?appName=Cluster0';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/stocks', require('./routes/stocks'));

// Welcome route
app.get('/', (req, res) => res.json({ message: 'StockVault API is live and healthy! 🚀', status: 'ok', endpoints: ['/api/health', '/api/portfolio', '/api/transactions', '/api/stats', '/api/stocks/candles'] }));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Connect to MongoDB and start server
async function startServer() {
  let connected = false;
  try {
    console.log('🔄 Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 4000 });
    console.log('✅ Connected to MongoDB Atlas');
    connected = true;
  } catch (err) {
    console.warn('⚠️ Atlas connection failed (cluster may be paused or unreachable):', err.message);
    try {
      console.log('🔄 Starting local in-memory MongoDB instance as fallback...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const localUri = mongod.getUri();
      await mongoose.connect(localUri);
      console.log('✅ Connected to local in-memory MongoDB');
      connected = true;
    } catch (memErr) {
      console.error('❌ Failed to start in-memory MongoDB fallback:', memErr.message);
    }
  }

  if (connected) {
    // Seed initial portfolio if empty
    const Holding = require('./models/Holding');
    const Transaction = require('./models/Transaction');
    const count = await Holding.countDocuments();
    if (count === 0) {
      console.log('📦 Seeding initial portfolio...');
      await Holding.insertMany([
        { ticker: 'MSFT', company: 'Microsoft', quantity: 20, avgPurchasePrice: 320.00, firstPurchaseDate: new Date('2026-03-01') },
        { ticker: 'TSLA', company: 'Tesla', quantity: 50, avgPurchasePrice: 220.00, firstPurchaseDate: new Date('2026-03-20') }
      ]);
      await Transaction.insertMany([
        { type: 'buy', ticker: 'MSFT', company: 'Microsoft', quantity: 20, price: 320.00, total: 6400.00, date: new Date('2026-03-01') },
        { type: 'buy', ticker: 'TSLA', company: 'Tesla', quantity: 50, price: 220.00, total: 11000.00, date: new Date('2026-03-20') }
      ]);
      console.log('✅ Seeded initial data');
    }

    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  } else {
    console.error('❌ Could not start backend server without a database.');
    process.exit(1);
  }
}

startServer();
