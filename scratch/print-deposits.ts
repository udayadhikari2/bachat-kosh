import connectDB from "../lib/db";
import User from "../lib/models/User";
import Deposit from "../lib/models/Deposit";
import Loan from "../lib/models/Loan";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const orgId = "6a129d6ee8fdde87245c9409";
    const rawDeposits = await Deposit.find({ organizationId: orgId, month: /Jestha/i }).lean();
    
    const deposits = [];
    for (const d of rawDeposits) {
      const u = await User.findById(d.userId).select("name").lean();
      deposits.push({
        ...d,
        userName: u ? u.name : "Unknown"
      });
    }
    
    console.log("Deposits in Jestha 2083:");
    console.log(deposits);

    // Also look at active loans or payments made in Jestha 2083
    const loans = await Loan.find({ organizationId: orgId }).lean();
    console.log("Active/repaid loans with payments in Jestha 2083:");
    for (const l of loans) {
      const pmts = l.payments?.filter((p: any) => {
        const d = new Date(p.date);
        return d.getMonth() === 4 && d.getFullYear() === 2026; 
      }) || [];
      if (pmts.length > 0) {
        const u = await User.findById(l.userId).select("name").lean();
        console.log(`Loan for ${u?.name || "Unknown"} (Principal: ${l.principalAmount}):`, pmts);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
