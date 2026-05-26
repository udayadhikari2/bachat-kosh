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

  const loansColl = mongoose.connection.db.collection("loans");
  const targetUserId = new mongoose.Types.ObjectId("6a12c740ab71560fa892dcff");

  const loans = await loansColl.find({ userId: targetUserId }).toArray();
  console.log("\n=== LOANS FOR THIS USER ===");
  if (loans.length === 0) {
    console.log("No loans found for this user.");
  } else {
    loans.forEach(l => {
      console.log(`Loan ID: ${l._id} | status: ${l.status} | principalAmount: ${l.principalAmount}`);
      if (l.payments) {
        l.payments.forEach(p => {
          console.log(`  Payment: Type: ${p.type} | Amount: ${p.amount} | Date: ${p.date} | Verified: ${p.verified}`);
        });
      }
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
