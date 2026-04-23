import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  await mongoose.connect(MONGO_URL);
  
  const audits = await mongoose.connection.db.collection("adminaudits").find({}).sort({ createdAt: -1 }).limit(5).toArray();
  
  console.log("RECENT AUDIT LOGS:");
  console.log(JSON.stringify(audits, null, 2));
  
  process.exit(0);
}

run();
