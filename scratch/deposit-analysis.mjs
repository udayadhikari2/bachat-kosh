import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  await mongoose.connect(MONGO_URL);
  
  const orgId = "69ddbdb61ad63caf75aab8ce";
  
  const deposits = await mongoose.connection.db.collection("deposits").find({ organizationId: new mongoose.Types.ObjectId(orgId), status: "APPROVED" }).toArray();
  
  console.log("DEPOSIT ANALYSIS:");
  const distribution = {};
  deposits.forEach(d => {
    const type = d.depositType || "null";
    distribution[type] = (distribution[type] || 0) + d.amount;
  });
  
  console.log(JSON.stringify(distribution, null, 2));
  
  process.exit(0);
}

run();
