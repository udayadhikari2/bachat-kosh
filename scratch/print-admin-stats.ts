import connectDB from "../lib/db";
import { getAdminDepositStats } from "../lib/actions/deposit";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const orgId = "6a129d6ee8fdde87245c9409";
    const res = await getAdminDepositStats(orgId, "Jestha 2083");
    console.log("Admin Deposit Stats Jestha 2083:");
    console.log(res.data);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
