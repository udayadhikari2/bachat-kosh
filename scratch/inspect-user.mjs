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

  const usersColl = mongoose.connection.db.collection("users");
  const depositsColl = mongoose.connection.db.collection("deposits");
  const targetUserId = new mongoose.Types.ObjectId("6a12c740ab71560fa892dcff");

  const user = await usersColl.findOne({ _id: targetUserId });
  console.log("\n=== USER DOCUMENT ===");
  console.log(JSON.stringify(user, null, 2));

  console.log("\n=== DEPOSITS FOR THIS USER ===");
  const deps = await depositsColl.find({ userId: targetUserId }).toArray();
  let calculatedBalance = 0;
  deps.forEach(d => {
    const adv = d.advancedPayment || 0;
    const cr = d.creditUsed || 0;
    console.log(`Deposit: ID: ${d._id} | Type: ${d.depositType} | Status: ${d.status} | advancedPayment: ${adv} | creditUsed: ${cr} | remarks: ${d.remarks}`);
    if (d.status === "APPROVED") {
      calculatedBalance += adv;
      calculatedBalance -= cr;
    }
  });
  console.log(`\nCalculated Balance from Approved Deposits: Rs. ${calculatedBalance}`);
  console.log(`Current User advanceBalance in DB: Rs. ${user?.advanceBalance}`);

  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
