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
  const loansColl = mongoose.connection.db.collection("loans");

  console.log("\n=== LEDGER FOR CHAITRA 2082 ===");
  const ledger = await ledgerColl.findOne({ month: "Chaitra 2082" });
  console.log(JSON.stringify(ledger, null, 2));

  if (ledger) {
    // Let's parse target dates
    // Chaitra is month 12. Let's find dates for Chaitra 2082.
    // Wait, let's search all loans activated around that month
    console.log("\n=== ALL LOANS WITH BANK CHARGES OR ACTIVATED IN 2082/2083 ===");
    const loans = await loansColl.find({
      $or: [
        { bankCharge: { $gt: 0 } },
        { status: { $in: ["ACTIVE", "COMPLETED", "OVERDUE"] } }
      ]
    }).toArray();

    loans.forEach(l => {
      console.log(`Loan ID: ${l._id} | User: ${l.userId} | status: ${l.status} | principal: ${l.principalAmount} | bankCharge: ${l.bankCharge} | activatedAt: ${l.activatedAt}`);
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
