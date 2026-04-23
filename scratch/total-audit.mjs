import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  await mongoose.connect(MONGO_URL);
  
  console.log("--- SYSTEM AUDIT ---");
  
  const orgs = await mongoose.connection.db.collection("organizations").find({}).toArray();
  console.log("Total Organizations in DB:", orgs.length);
  orgs.forEach(o => {
    console.log(`- Org: ${o.name} (${o._id})`);
    console.log(`  Financials:`, JSON.stringify(o.financials, null, 2));
  });
  
  const users = await mongoose.connection.db.collection("users").find({ role: "ADMIN" }).toArray();
  console.log("\nADMIN USERS:");
  users.forEach(u => {
    console.log(`- ${u.email}: OrgID=${u.organizationId}`);
  });
  
  const depositStats = await mongoose.connection.db.collection("deposits").aggregate([
    { $group: { _id: "$organizationId", count: { $sum: 1 }, approvedCount: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] } } } }
  ]).toArray();
  console.log("\nDEPOSIT DISTRIBUTION:");
  depositStats.forEach(s => {
    console.log(`- OrgID ${s._id}: Total=${s.count}, Approved=${s.approvedCount}`);
  });
  
  process.exit(0);
}

run();
