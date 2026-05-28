import "dotenv/config";
import mongoose from "mongoose";
import dns from "dns";
import connectDB from "../lib/db";
import Organization from "../lib/models/Organization";
import BankLedger from "../lib/models/BankLedger";
import { reconcileMonthlyTotals } from "../lib/actions/bank-ledger";
import { compareNepaliMonths } from "../lib/utils/nepali-date";

dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  console.log("Connecting to DB...");
  await connectDB();
  console.log("Connected successfully.");

  // Get first organization in DB
  const org = await Organization.findOne({});
  if (!org) {
    console.error("No organizations found in database.");
    process.exit(1);
  }
  const orgId = (org._id as mongoose.Types.ObjectId).toString();
  console.log(`Using Organization: ${org.name} (${orgId})`);

  const baselineMonth = org.financials?.initialOpeningMonth;
  const baselineYear = org.financials?.initialOpeningYear;
  if (!baselineMonth || !baselineYear) {
    console.error("Baseline financials not configured for org.");
    process.exit(1);
  }
  const baselineMonthStr = `${baselineMonth} ${baselineYear}`;
  console.log(`Baseline Month: ${baselineMonthStr}`);

  // Fetch all ledgers before reconcile
  const ledgersBefore = await BankLedger.find({ organizationId: orgId }).lean();
  console.log(`\nExisting ledgers count before reconcile: ${ledgersBefore.length}`);
  ledgersBefore.forEach((l: any) => {
    console.log(`- Month: ${l.month} | Closing: Rs. ${l.closingBalance}`);
  });

  console.log(`\n--- RUNNING RECONCILE CHAIN FROM BASELINE MONTH: ${baselineMonthStr} ---`);
  const result = await reconcileMonthlyTotals(orgId, baselineMonthStr);
  console.log("Reconciliation result:", result);

  if (result.success) {
    const ledgersAfter = await BankLedger.find({ organizationId: orgId }).lean();
    console.log(`\nExisting ledgers count after reconcile: ${ledgersAfter.length}`);
    ledgersAfter.sort((a: any, b: any) => compareNepaliMonths(a.month, b.month));
    ledgersAfter.forEach((l: any) => {
      console.log(`- Month: ${l.month} | Opening: Rs. ${l.openingBalance} | Deposits: Rs. ${l.totalDeposits} | Repaid: Rs. ${l.totalLoanRepaid} | Disbursed: Rs. ${l.totalLoanDisbursed} | Closing: Rs. ${l.closingBalance}`);
    });
  } else {
    console.error("Reconciliation failed:", result.error);
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Execution error:", err);
  process.exit(1);
});
