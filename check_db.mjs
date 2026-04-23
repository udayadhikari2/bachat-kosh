import connectDB from './lib/db.js';
import mongoose from 'mongoose';
import { OrganizationSchema } from './lib/models/Organization.js';

async function check() {
  await connectDB();
  const Org = mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
  const org = await Org.findOne().lean();
  console.log("Financials in DB:", org.financials);
  process.exit(0);
}
check();
