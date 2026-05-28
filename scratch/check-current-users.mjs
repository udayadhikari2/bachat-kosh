import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  try {
    console.log("Connecting to:", MONGO_URL?.replace(/:([^@]+)@/, ":****@"));
    await mongoose.connect(MONGO_URL || "");
    console.log("✅ Connected!");

    const db = mongoose.connection.db;
    const usersCol = db.collection("users");
    const users = await usersCol.find({}).toArray();
    
    console.log(`\nFound ${users.length} users in the database:`);
    for (const u of users) {
      console.log(`- Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Active: ${u.isActive} | HashedPwd: ${u.password ? "YES" : "NO"} (${u.password})`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error running script:", error);
    process.exit(1);
  }
}

run();
