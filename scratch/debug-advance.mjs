import mongoose from "mongoose";
import connectDB from "../lib/db";
import Loan from "../lib/models/Loan";

async function debugAdvancedPayments() {
  await connectDB();
  const orgId = "679ddbdb61ad63caf75aab8ce"; // I don't know the exact orgId, I'll fetch one
  
  const loans = await Loan.find({ advancePaid: { $gt: 0 } }).lean();
  console.log("Loans with advancePaid > 0:", JSON.stringify(loans, null, 2));
  
  const activeLoans = await Loan.find({ status: "ACTIVE" }).limit(5).lean();
  console.log("Sample ACTIVE loans:", JSON.stringify(activeLoans.map(l => ({ id: l._id, status: l.status, advancePaid: l.advancePaid })), null, 2));

  process.exit(0);
}

debugAdvancedPayments();
