const mongoose = require('mongoose');

const passwords = [
  'Macaco69',
  'Macaco69%23',
  '%23Macaco69%23',
  '%3C%23Macaco69%23%3E',
  '%3CMacaco69%3E'
];

async function test() {
  for (const pwd of passwords) {
    const uri = `mongodb+srv://a35713_db_user:${pwd}@cluster0.brcvrcz.mongodb.net/stockwallet?appName=Cluster0`;
    console.log(`Testing password encoding: ${pwd}`);
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✅ Success with password encoding: ${pwd}`);
      process.exit(0);
    } catch (err) {
      console.log(`❌ Failed with password encoding: ${pwd}`);
    }
  }
  console.log('All failed.');
  process.exit(1);
}

test();
