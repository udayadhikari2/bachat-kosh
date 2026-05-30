import connectDB from "../lib/db";
import User from "../lib/models/User";
import Deposit from "../lib/models/Deposit";
import Loan from "../lib/models/Loan";
import Aggregation from "../lib/models/Aggregation";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const orgId = "6a129d6ee8fdde87245c9409";

    // Sum of all approved deposits
    const deposits = await Deposit.find({ organizationId: orgId, status: "APPROVED" }).lean();
    let depTotal = 0;
    for (const d of deposits) {
      depTotal += (d.amount || 0) + (d.advancedPayment || 0) + (d.fineApplied || 0) - (d.creditUsed || 0);
    }
    console.log("Approved Deposits Total:", depTotal);

    // Sum of all aggregations (NAV & MISC)
    const aggs = await Aggregation.find({ organizationId: orgId, type: { $ne: "ADVANCE" } }).lean();
    let aggTotal = 0;
    for (const a of aggs) {
      aggTotal += a.amount;
    }
    console.log("Aggregations Total:", aggTotal);

    // Sum of all loan payments (interest, penalty, renewal, service, principal, advance)
    const loans = await Loan.find({ organizationId: orgId }).lean();
    let loanPaymentsTotal = 0;
    const paymentTypes = new Map();
    for (const l of loans) {
      if (l.payments) {
        for (const p of l.payments) {
          if (p.verified) {
            loanPaymentsTotal += p.amount;
            paymentTypes.set(p.type, (paymentTypes.get(p.type) || 0) + p.amount);
          }
        }
      }
    }
    console.log("Verified Loan Payments Total:", loanPaymentsTotal);
    console.log("Loan Payments by Type:", paymentTypes);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
