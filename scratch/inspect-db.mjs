import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGO_URL);
  console.log("Connected successfully.");

  const usersColl = mongoose.connection.db.collection("users");
  const depositsColl = mongoose.connection.db.collection("deposits");
  const aggregationsColl = mongoose.connection.db.collection("aggregations");

  console.log("\n=== USERS WITH ADVANCE BALANCE ===");
  const users = await usersColl.find({ advanceBalance: { $gt: 0 } }).toArray();
  if (users.length === 0) {
    console.log("No users with advanceBalance > 0");
  } else {
    users.forEach(u => {
      console.log(`User: ${u.name} | Acc: ${u.accountNumber} | ID: ${u._id} | advanceBalance: ${u.advanceBalance}`);
    });
  }

  console.log("\n=== ADVANCE TYPE AGGREGATIONS ===");
  const aggs = await aggregationsColl.find({ type: "ADVANCE" }).toArray();
  if (aggs.length === 0) {
    console.log("No aggregations of type ADVANCE");
  } else {
    aggs.forEach(a => {
      console.log(`Agg: ID: ${a._id} | memberId: ${a.memberId} | amount: ${a.amount} | month: ${a.month} | date: ${a.date} | remarks: ${a.remarks}`);
    });
  }

  console.log("\n=== ADVANCE TYPE DEPOSITS ===");
  const deps = await depositsColl.find({ depositType: "ADVANCE" }).toArray();
  if (deps.length === 0) {
    console.log("No deposits of type ADVANCE");
  } else {
    deps.forEach(d => {
      console.log(`Deposit: ID: ${d._id} | userId: ${d.userId} | advancedPayment: ${d.advancedPayment} | month: ${d.month} | status: ${d.status} | aggregationId: ${d.aggregationId} | remarks: ${d.remarks}`);
    });
  }

  console.log("\n=== ALL DEPOSITS WITH advancedPayment > 0 ===");
  const depsPay = await depositsColl.find({ advancedPayment: { $gt: 0 } }).toArray();
  if (depsPay.length === 0) {
    console.log("No deposits with advancedPayment > 0");
  } else {
    depsPay.forEach(d => {
      console.log(`Deposit: ID: ${d._id} | userId: ${d.userId} | advancedPayment: ${d.advancedPayment} | depositType: ${d.depositType} | month: ${d.month} | status: ${d.status} | remarks: ${d.remarks}`);
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
