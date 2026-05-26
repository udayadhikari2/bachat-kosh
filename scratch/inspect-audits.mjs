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

  const auditsColl = mongoose.connection.db.collection("adminaudits");
  
  console.log("\n=== RECENT AUDITS FOR USER ===");
  const audits = await auditsColl.find({
    $or: [
      { "newValues._id": "6a12c740ab71560fa892dcff" },
      { "oldValues._id": "6a12c740ab71560fa892dcff" },
      { "newValues.memberId": "6a12c740ab71560fa892dcff" },
      { "oldValues.memberId": "6a12c740ab71560fa892dcff" },
      { "newValues.userId": "6a12c740ab71560fa892dcff" },
      { "oldValues.userId": "6a12c740ab71560fa892dcff" },
    ]
  }).sort({ createdAt: -1 }).limit(10).toArray();

  audits.forEach(a => {
    console.log(`Audit: ID: ${a._id} | Action: ${a.action} | Time: ${a.createdAt}`);
    console.log(`Old:`, JSON.stringify(a.oldValues));
    console.log(`New:`, JSON.stringify(a.newValues));
    console.log("---");
  });

  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
