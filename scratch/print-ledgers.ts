import connectDB from "../lib/db";
import BankLedger from "../lib/models/BankLedger";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const orgId = "6a129d6ee8fdde87245c9409";
    const ledgers = await BankLedger.find({ organizationId: orgId }).sort({ month: 1 }).lean();
    console.log("All bank ledger documents in DB:");
    console.log(ledgers);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
