import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  await mongoose.connect(MONGO_URL);
  
  const orgId = "69ddbdb61ad63caf75aab8ce";
  const financials = {
    initialMonthlyCollection: 123456,
    initialDelayedFine: 500,
    initialServiceCharge: 1000,
    initialBankInterest: 0,
    initialLoanInterest: 0,
    initialNav: 0,
    initialMiscellaneous: 0
  };
  
  const res = await mongoose.connection.db.collection("organizations").updateOne(
    { _id: new mongoose.Types.ObjectId(orgId) },
    { $set: { financials } }
  );
  
  console.log("Update result:", res);
  
  const updated = await mongoose.connection.db.collection("organizations").findOne({ _id: new mongoose.Types.ObjectId(orgId) });
  console.log("Updated Org:", JSON.stringify(updated, null, 2));
  
  process.exit(0);
}

run();
