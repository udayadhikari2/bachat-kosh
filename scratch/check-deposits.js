const mongoose = require('mongoose');
const uri = 'mongodb+srv://udaya:B8S2BwP2SjW7YisK@cluster0.puj19.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(uri);
    const Deposit = mongoose.model('Deposit', new mongoose.Schema({}, { strict: false }));
    const deposits = await Deposit.find({ depositType: { $in: ['NAV', 'MISCELLANEOUS'] } }).limit(10);
    console.log('Found deposits:', deposits.length);
    console.log(JSON.stringify(deposits, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
