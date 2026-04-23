import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  await mongoose.connect(MONGO_URL);
  
  const targetOrgId = "69ddbdb61ad63caf75aab8ce";
  const oldOrgId = "69d91afca80c196b22411543";
  
  console.log(`Aligning all data to Organization ID: ${targetOrgId}`);
  
  // Update Users
  const userRes = await mongoose.connection.db.collection("users").updateMany(
    { organizationId: { $ne: new mongoose.Types.ObjectId(targetOrgId) } },
    { $set: { organizationId: new mongoose.Types.ObjectId(targetOrgId) } }
  );
  console.log("Users updated:", userRes.modifiedCount);
  
  // Update Deposits
  const depRes = await mongoose.connection.db.collection("deposits").updateMany(
    { organizationId: { $ne: new mongoose.Types.ObjectId(targetOrgId) } },
    { $set: { organizationId: new mongoose.Types.ObjectId(targetOrgId) } }
  );
  console.log("Deposits updated:", depRes.modifiedCount);
  
  process.exit(0);
}

run();
