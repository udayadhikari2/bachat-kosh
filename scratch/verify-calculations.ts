import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import { calculateLoanStats } from "../lib/utils/loan-calculations";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  await mongoose.connect(MONGO_URL!);

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  const usersColl = db.collection("users");
  const loansColl = db.collection("loans");

  const uday = await usersColl.findOne({ name: /Uday/i });
  const activeLoan = await loansColl.findOne({ userId: uday!._id, status: "ACTIVE" });

  const stats = calculateLoanStats(activeLoan);
  console.log("\n=== Timezone Aligned Stats (Nepal Time) ===");
  console.log("daysSinceLastEvent:", stats.daysSinceLastEvent);
  console.log("totalDays:", stats.totalDays);
  console.log("unpaidBaseInterest (Rs.):", stats.unpaidBaseInterest);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
