import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

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

  console.log("\n=== ORGANIZATION FINANCIALS ===");
  console.log(JSON.stringify(org.financials, null, 2));

  if (org.financials && org.financials.initialOpeningMonth) {
    const monthStr = `${org.financials.initialOpeningMonth} ${org.financials.initialOpeningYear}`;
    console.log(`\nChecking BankLedger for baseline month: "${monthStr}"`);

    const ledger = await ledgersColl.findOne({ organizationId: org._id, month: monthStr });
    if (ledger) {
      console.log(JSON.stringify(ledger, null, 2));
    } else {
      console.log("No ledger document found in database for baseline month!");
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
