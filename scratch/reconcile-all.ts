import connectDB from "../lib/db";
import { reconcileMonthlyTotals } from "../lib/actions/bank-ledger";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const orgId = "6a129d6ee8fdde87245c9409";
    const result = await reconcileMonthlyTotals(orgId, "Poush 2082");
    console.log("Reconciliation Result:", result);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
