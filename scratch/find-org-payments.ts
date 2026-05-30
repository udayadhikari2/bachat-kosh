import connectDB from "../lib/db";
import Loan from "../lib/models/Loan";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const orgId = "6a129d6ee8fdde87245c9409";
    const loans = await Loan.find({ organizationId: orgId }).lean();
    console.log("ORGANIZATION type payments in all loans:");
    let count = 0;
    let totalAmount = 0;
    for (const l of loans) {
      const pmts = l.payments?.filter((p: any) => p.type === "ORGANIZATION") || [];
      for (const p of pmts) {
        console.log(`Loan for ${l.userId} (Principal: ${l.principalAmount}):`, p);
        count++;
        totalAmount += p.amount;
      }
    }
    console.log(`Total ORGANIZATION type payments found: ${count}, Total Amount: ${totalAmount}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
