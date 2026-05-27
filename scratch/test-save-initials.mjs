import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import { reconcileMonthlyTotals } from "../lib/actions/bank-ledger";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGO_URL);
  console.log("Connected successfully.");

  const orgsColl = mongoose.connection.db.collection("organizations");
  const ledgersColl = mongoose.connection.db.collection("bankledgers");

  const org = await orgsColl.findOne({});
  if (!org) {
    console.error("No organization found");
    process.exit(1);
  }

  console.log("\n--- STEP 1: Updating Organization Financials ---");
  const updateResult = await orgsColl.updateOne(
    { _id: org._id },
    { 
      $set: { 
        "financials.initialBankCharges": 60,
        "financials.initialExpenditure": 100,
        "financials.initialOpeningBalance": 251422.55,
        "financials.initialOpeningMonth": "Poush",
        "financials.initialOpeningYear": 2082
      } 
    }
  );
  console.log("Update organization result:", updateResult);

  console.log("\n--- STEP 2: Running Reconcile for Poush 2082 ---");
  // We call reconcileMonthlyTotals
  const reconcileRes = await reconcileMonthlyTotals(org._id.toString(), "Poush 2082");
  console.log("Reconcile result:", reconcileRes);

  console.log("\n--- STEP 3: Checking Bank Ledger in DB ---");
  const ledger = await ledgersColl.findOne({ organizationId: org._id, month: "Poush 2082" });
  console.log(JSON.stringify(ledger, null, 2));

  // Let's check math
  console.log("\n--- STEP 4: Verifying Closing Balance Math ---");
  const expectedClosing = ledger.openingBalance + ledger.totalDeposits + ledger.totalLoanRepaid + ledger.bankInterest - ledger.totalLoanDisbursed;
  console.log(`openingBalance: ${ledger.openingBalance}`);
  console.log(`totalDeposits: ${ledger.totalDeposits}`);
  console.log(`closingBalance in DB: ${ledger.closingBalance}`);
  console.log(`Expected closing balance (excluding initial charges/expenditure): ${expectedClosing}`);

  if (ledger.closingBalance === expectedClosing) {
    console.log("SUCCESS: Closing balance matches expected closing balance (initial bank charges & expenditures were NOT subtracted as outflows).");
  } else {
    console.error("FAILURE: Closing balance does not match expected closing balance!");
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
