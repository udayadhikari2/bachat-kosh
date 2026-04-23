import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function test() {
  await mongoose.connect(MONGO_URL);
  
  const orgId = "69ddbdb61ad63caf75aab8ce";
  
  // We can't easily run the server action from node if it uses next/cache, 
  // but we can check the data directly.
  
  const org = await mongoose.connection.db.collection("organizations").findOne({ _id: new mongoose.Types.ObjectId(orgId) });
  console.log("ORG FINANCIALS:", org.financials);
  
  const deposits = await mongoose.connection.db.collection("deposits").find({ organizationId: new mongoose.Types.ObjectId(orgId), status: "APPROVED" }).toArray();
  console.log("MATCHING DEPOSITS COUNT:", deposits.length);
  
  process.exit(0);
}

test();
