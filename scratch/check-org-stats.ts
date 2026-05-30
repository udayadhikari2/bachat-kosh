import connectDB from "../lib/db";
import { getOrganizationFinancialStats } from "../lib/actions/member";

async function run() {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    const orgId = "6a129d6ee8fdde87245c9409";
    const month = "Jestha";
    const year = 2083;
    const currentMonthStr = `${month} ${year}`;

    const res = await getOrganizationFinancialStats(orgId, currentMonthStr);

    console.log("--- getOrganizationFinancialStats RESPONSE ---");
    console.log(res);

    if (res.success && res.data) {
      console.log("\n✅ VERIFICATION SUCCESSFUL!");
      console.log("Total Collection:", res.data.totalCollection);
      console.log("Closing Balance (Available Funds):", res.data.closingBalance);
      console.log("Per Member Wealth:", res.data.perMemberNetAssets);
    } else {
      console.log("\n❌ VERIFICATION FAILED:", res.error);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
