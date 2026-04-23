import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function check() {
  await mongoose.connect(MONGO_URL);
  
  const orgs = await mongoose.connection.db.collection("organizations").find().toArray();
  console.log("ORGANIZATIONS:");
  console.log(JSON.stringify(orgs, null, 2));
  
  const users = await mongoose.connection.db.collection("users").find().toArray();
  console.log("USERS:");
  users.forEach(u => console.log(`${u.email}: ${u.organizationId}`));
  
  const deposits = await mongoose.connection.db.collection("deposits").find({ status: "APPROVED", organizationId: new mongoose.Types.ObjectId("69ddbdb61ad63caf75aab8ce") }).toArray();
  console.log("MATCHING APPROVED DEPOSITS COUNT:", deposits.length);
  
  process.exit(0);
}

check();
