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
    await mongoose.connect(MONGO_URL || "");
    const db = mongoose.connection.db;

    console.log("--- Sample User ---");
    const user = await db.collection("users").findOne();
    console.log(JSON.stringify(user, null, 2));

    console.log("\n--- Sample Deposit ---");
    const deposit = await db.collection("deposits").findOne();
    console.log(JSON.stringify(deposit, null, 2));

    console.log("\n--- Deposit Months ---");
    const months = await db.collection("deposits").distinct("month");
    console.log(months);

    console.log("\n--- Deposit Types ---");
    const types = await db.collection("deposits").distinct("depositType");
    console.log(types);

    console.log("\n--- Users Roles & Count ---");
    const roles = await db.collection("users").aggregate([
      { $group: { _id: "$role", count: { $sum: 1 }, activeCount: { $sum: { $cond: ["$isActive", 1, 0] } } } }
    ]).toArray();
    console.log(roles);

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}

run();
