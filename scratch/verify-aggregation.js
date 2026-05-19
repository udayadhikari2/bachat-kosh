const mongoose = require('mongoose');
const uri = 'mongodb+srv://udaya:B8S2BwP2SjW7YisK@cluster0.puj19.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function verify() {
  try {
    await mongoose.connect(uri);
    const Deposit = mongoose.model('Deposit', new mongoose.Schema({}, { strict: false }));
    const orgs = await mongoose.model('Organization', new mongoose.Schema({}, { strict: false })).find({});
    
    console.log('--- Organizations ---');
    orgs.forEach(o => console.log(`${o.name}: ${o._id}`));
    
    const navEntries = await Deposit.find({ depositType: 'NAV' });
    console.log('\n--- NAV Entries ---');
    console.log(JSON.stringify(navEntries.map(e => ({
      id: e._id,
      org: e.organizationId,
      month: e.month,
      amount: e.amount,
      status: e.status
    })), null, 2));

    const stats = await Deposit.aggregate([
      { $match: { depositType: 'NAV', status: 'APPROVED' } },
      { $group: { _id: '$organizationId', total: { $sum: '$amount' } } }
    ]);
    console.log('\n--- Aggregated NAV per Org ---');
    console.log(JSON.stringify(stats, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verify();
