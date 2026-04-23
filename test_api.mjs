import mongoose from 'mongoose';
import connectDB from './lib/db.js';
import Organization from './lib/models/Organization.js';
import Deposit from './lib/models/Deposit.js';

async function run() {
  try {
    await connectDB();
    const org = await Organization.findOne().lean();
    console.log("Org ID:", org._id.toString());
    const matchQuery = { organizationId: new mongoose.Types.ObjectId(org._id.toString()) };
    const stats = await Deposit.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, totalTransaction: { $sum: 1 } } }
    ]);
    console.log("Stats:", stats);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
