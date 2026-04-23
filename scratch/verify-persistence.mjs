import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  await mongoose.connect(MONGO_URL);
  
  const targetOrgId = "69ddbdb61ad63caf75aab8ce";
  const newValue = 1060500;
  
  console.log(`[VERIFY] Setting initialMonthlyCollection to ${newValue} for Org: ${targetOrgId}`);
  
  const res = await mongoose.connection.db.collection("organizations").updateOne(
    { _id: new mongoose.Types.ObjectId(targetOrgId) },
    { $set: { "financials.initialMonthlyCollection": newValue } }
  );
  
  console.log(`[VERIFY] Update Result:`, res.modifiedCount);
  
  const org = await mongoose.connection.db.collection("organizations").findOne({ _id: new mongoose.Types.ObjectId(targetOrgId) });
  console.log(`[VERIFY] New Value in DB:`, org.financials.initialMonthlyCollection);
  
  process.exit(0);
}

run();
