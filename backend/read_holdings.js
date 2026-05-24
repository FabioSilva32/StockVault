const mongoose = require('mongoose');
const Holding = require('./models/Holding');
const Transaction = require('./models/Transaction');

const MONGO_URI = 'mongodb+srv://a35713_db_user:Macaco69@cluster0.brcvrcz.mongodb.net/stockwallet?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const holdings = await Holding.find().lean();
    console.log('\n--- HOLDINGS ---');
    console.log(JSON.stringify(holdings, null, 2));

    const transactions = await Transaction.find().sort({ date: -1 }).limit(10).lean();
    console.log('\n--- TRANSACTIONS (Last 10) ---');
    console.log(JSON.stringify(transactions, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
