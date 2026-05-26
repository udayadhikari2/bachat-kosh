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

  const ledgerColl = mongoose.connection.db.collection("bankledgers");

  console.log("\n--- REPAIRING CHAITRA 2082 LEDGER ---");
  const result = await ledgerColl.updateOne(
    { month: "Chaitra 2082" },
    { 
      $set: { 
        manualBankCharges: 60,
        bankCharges: 80,
        updatedAt: new Date()
      } 
    }
  );

  console.log(`Update result:`, result);

  const updatedLedger = await ledgerColl.findOne({ month: "Chaitra 2082" });
  console.log("\nUpdated Ledger in DB:");
  console.log(JSON.stringify(updatedLedger, null, 2));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
