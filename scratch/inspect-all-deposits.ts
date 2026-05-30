import connectDB from "../lib/db";
import Deposit from "../lib/models/Deposit";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");
    const orgId = "6a129d6ee8fdde87245c9409";

    const deposits = await Deposit.find({ organizationId: orgId, status: "APPROVED" }).lean();
    console.log(`Found ${deposits.length} approved deposits.`);
    
    // Group by month and type
    const groups: any = {};
    for (const d of deposits) {
      const key = `${d.month} - ${d.depositType}`;
      if (!groups[key]) {
        groups[key] = { amount: 0, fineApplied: 0, advancedPayment: 0, creditUsed: 0, count: 0 };
      }
      groups[key].amount += d.amount || 0;
      groups[key].fineApplied += d.fineApplied || 0;
      groups[key].advancedPayment += d.advancedPayment || 0;
      groups[key].creditUsed += d.creditUsed || 0;
      groups[key].count++;
    }

    console.log("Grouped deposits:");
    console.log(groups);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
