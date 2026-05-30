import connectDB from "../lib/db";
import Loan from "../lib/models/Loan";
import { getNepaliMonthStartAd, getNepaliMonthEndAd } from "../lib/utils/nepali-date";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const orgId = "6a129d6ee8fdde87245c9409";
    
    // Baisakh 2083
    const startBaisakh = getNepaliMonthStartAd(2083, 1);
    const endBaisakh = getNepaliMonthEndAd(2083, 1);
    
    // Jestha 2083
    const startJestha = getNepaliMonthStartAd(2083, 2);
    const endJestha = getNepaliMonthEndAd(2083, 2);

    console.log("Baisakh 2083 Range:", startBaisakh.toISOString(), "to", endBaisakh.toISOString());
    console.log("Jestha 2083 Range:", startJestha.toISOString(), "to", endJestha.toISOString());

    const loans = await Loan.find({ organizationId: orgId }).lean();
    let baisakhPmts = [];
    let jesthaPmts = [];

    for (const l of loans) {
      if (l.payments) {
        for (const p of l.payments) {
          if (p.verified) {
            if (p.date >= startBaisakh && p.date <= endBaisakh) {
              baisakhPmts.push({
                loanId: l._id.toString(),
                amount: p.amount,
                type: p.type,
                date: p.date.toISOString()
              });
            }
            if (p.date >= startJestha && p.date <= endJestha) {
              jesthaPmts.push({
                loanId: l._id.toString(),
                amount: p.amount,
                type: p.type,
                date: p.date.toISOString()
              });
            }
          }
        }
      }
    }

    console.log("\n--- BAISAKH 2083 PAYMENTS ---");
    console.log(baisakhPmts);
    console.log("Total:", baisakhPmts.reduce((sum, p) => sum + p.amount, 0));

    console.log("\n--- JESTHA 2083 PAYMENTS ---");
    console.log(jesthaPmts);
    console.log("Total:", jesthaPmts.reduce((sum, p) => sum + p.amount, 0));

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
