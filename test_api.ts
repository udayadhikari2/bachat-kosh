import mongoose from 'mongoose';
import connectDB from './lib/db';
import Organization from './lib/models/Organization';
import Deposit from './lib/models/Deposit';
import { getAdminDepositStats } from './lib/actions/deposit';

async function run() {
  try {
    await connectDB();
    const org = await Organization.findOne().lean();
    console.log("Org ID:", org._id.toString());
    const res = await getAdminDepositStats(org._id.toString(), "all");
    console.log("Stats Success:", res.success);
    if (!res.success) {
      console.error(res.error);
    }
  } catch (err) {
    console.error("Crash:", err);
  }
  process.exit();
}
run();
