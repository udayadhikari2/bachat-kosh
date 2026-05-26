import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

// Define schema directly in script to avoid cache issues
const BankLedgerSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  month: { type: String, required: true },
  openingBalance: { type: Number, default: 0 },
  closingBalance: { type: Number, default: 0 },
  bankInterest: { type: Number, default: 0 },
  bankCharges: { type: Number, default: 0 },
  manualBankCharges: { type: Number },
  totalDeposits: { type: Number, default: 0 },
  totalLoanDisbursed: { type: Number, default: 0 },
  totalLoanRepaid: { type: Number, default: 0 },
  totalExpenditure: { type: Number, default: 0 },
  remarks: { type: String },
}, { timestamps: true });

const BankLedger = mongoose.models.BankLedgerTest || mongoose.model("BankLedgerTest", BankLedgerSchema, "bankledgers");

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGO_URL);
  console.log("Connected successfully.");

  // Fetch the ledger document for Chaitra 2082
  const ledger = await BankLedger.findOne({ month: "Chaitra 2082" });
  if (!ledger) {
    console.error("Ledger not found.");
    process.exit(1);
  }

  console.log("Original Ledger Document in DB:");
  console.log(JSON.stringify(ledger.toObject(), null, 2));

  // Let's run a simulated reconcile logic
  const totalLoanBankCharges = 20; // from the loan we found
  
  console.log("\n--- SIMULATING FIRST RECONCILE ---");
  const manualBankCharges1 = typeof ledger.manualBankCharges === "number" ? ledger.manualBankCharges : ledger.bankCharges;
  console.log(`manualBankCharges evaluated: ${manualBankCharges1}`);
  
  ledger.manualBankCharges = manualBankCharges1;
  ledger.bankCharges = manualBankCharges1 + totalLoanBankCharges;
  
  console.log(`Setting manualBankCharges = ${ledger.manualBankCharges}, bankCharges = ${ledger.bankCharges}`);
  await ledger.save();
  console.log("Saved.");

  // Fetch again
  const refreshedLedger1 = await BankLedger.findOne({ month: "Chaitra 2082" });
  console.log("\nLedger Document in DB after first reconcile:");
  console.log(JSON.stringify(refreshedLedger1.toObject(), null, 2));

  console.log("\n--- SIMULATING SECOND RECONCILE ---");
  const manualBankCharges2 = typeof refreshedLedger1.manualBankCharges === "number" ? refreshedLedger1.manualBankCharges : refreshedLedger1.bankCharges;
  console.log(`manualBankCharges evaluated: ${manualBankCharges2} (Expected: ${manualBankCharges1})`);
  
  refreshedLedger1.manualBankCharges = manualBankCharges2;
  refreshedLedger1.bankCharges = manualBankCharges2 + totalLoanBankCharges;
  await refreshedLedger1.save();
  console.log("Saved.");

  // Fetch again
  const refreshedLedger2 = await BankLedger.findOne({ month: "Chaitra 2082" });
  console.log("\nLedger Document in DB after second reconcile:");
  console.log(JSON.stringify(refreshedLedger2.toObject(), null, 2));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
