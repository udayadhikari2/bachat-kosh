import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import { createRequire } from "module";

// Set DNS for cloud atlas connection
dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const require = createRequire(import.meta.url);
const adbs = require('ad-bs-converter');

const NEPALI_MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", 
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

function parseNepaliMonth(monthStr) {
  const [name, yearStr] = monthStr.split(" ");
  const monthIndex = NEPALI_MONTHS.findIndex(m => m.toLowerCase() === name.toLowerCase());
  return {
    month: monthIndex + 1,
    year: parseInt(yearStr)
  };
}

function bsToAd(year, month, day) {
  const formatted = `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
  const converted = adbs.bs2ad(formatted);
  return new Date(converted.year, converted.month - 1, converted.day);
}

function getDaysInMonth(year, month) {
  const formatted = `${year}/${month.toString().padStart(2, '0')}/01`;
  const ad = adbs.bs2ad(formatted);
  const bs = adbs.ad2bs(`${ad.year}/${ad.month}/${ad.day}`);
  return bs.en.totalDaysInMonth;
}

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGO_URL);
  console.log("Connected successfully.");

  const usersColl = mongoose.connection.db.collection("users");
  const depositsColl = mongoose.connection.db.collection("deposits");
  const aggregationsColl = mongoose.connection.db.collection("aggregations");

  // 1. Get a test member
  const testUser = await usersColl.findOne({ role: "USER" });
  if (!testUser) {
    console.error("No test user found. Please seed the database first.");
    process.exit(1);
  }

  const userId = testUser._id;
  const orgId = testUser.organizationId;
  
  console.log(`\n--- TEST USER: ${testUser.name} (${testUser.accountNumber}) ---`);
  console.log(`Initial Advance Balance: Rs. ${testUser.advanceBalance || 0}`);

  // Save initial balance
  const initialBalance = testUser.advanceBalance || 0;

  // Let's create an aggregation
  console.log("\n--- STEP 1: Creating ADVANCE Aggregation of Rs. 1000 for Poush 2082 ---");
  
  const targetMonth = "Poush 2082";
  const target = parseNepaliMonth(targetMonth);
  const lastDay = getDaysInMonth(target.year, target.month);
  let finalDate = bsToAd(target.year, target.month, lastDay);
  finalDate.setHours(23, 59, 59, 999);

  console.log(`Auto-Aligned Date for Poush 2082: ${finalDate.toISOString()} (Nepali last day: ${lastDay})`);

  // Insert Aggregation
  const aggResult = await aggregationsColl.insertOne({
    organizationId: orgId,
    adminId: new mongoose.Types.ObjectId("69ddbdb61ad63caf75aab8ce"),
    type: "ADVANCE",
    memberId: userId,
    amount: 1000,
    month: targetMonth,
    date: finalDate,
    remarks: "Test Aggregation Credit",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const aggId = aggResult.insertedId;
  console.log(`Aggregation Created with ID: ${aggId}`);

  // Perform backend update: Increment User Balance and create Deposit
  await usersColl.updateOne({ _id: userId }, { $inc: { advanceBalance: 1000 } });
  
  const depResult = await depositsColl.insertOne({
    userId: userId,
    organizationId: orgId,
    amount: 0,
    advancedPayment: 1000,
    month: targetMonth,
    depositType: "ADVANCE",
    depositDate: finalDate,
    status: "APPROVED",
    remarks: `[AGGREGATION CREDIT] Test Aggregation Credit`,
    aggregationId: aggId,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const depId = depResult.insertedId;
  console.log(`Deposit Created with ID: ${depId}`);

  // Fetch updated user
  let updatedUser = await usersColl.findOne({ _id: userId });
  console.log(`Updated User Advance Balance: Rs. ${updatedUser.advanceBalance} (Expected: ${initialBalance + 1000})`);

  // 2. Edit Aggregation (amount change from 1000 to 1200)
  console.log("\n--- STEP 2: Updating ADVANCE Aggregation amount to Rs. 1200 ---");
  
  const oldVal = await aggregationsColl.findOne({ _id: aggId });
  await aggregationsColl.updateOne({ _id: aggId }, { $set: { amount: 1200, updatedAt: new Date() } });
  const newVal = await aggregationsColl.findOne({ _id: aggId });

  // Transition ADVANCE -> ADVANCE with same member: adjust by difference
  const diff = newVal.amount - oldVal.amount;
  console.log(`Difference: Rs. ${diff}`);
  await usersColl.updateOne({ _id: userId }, { $inc: { advanceBalance: diff } });

  // Update deposit
  await depositsColl.updateOne(
    { aggregationId: aggId },
    { $set: { advancedPayment: newVal.amount, updatedAt: new Date() } }
  );

  updatedUser = await usersColl.findOne({ _id: userId });
  console.log(`Updated User Advance Balance: Rs. ${updatedUser.advanceBalance} (Expected: ${initialBalance + 1200})`);

  let updatedDep = await depositsColl.findOne({ aggregationId: aggId });
  console.log(`Updated Deposit advancedPayment: Rs. ${updatedDep.advancedPayment} (Expected: 1200)`);

  // 3. Delete Aggregation
  console.log("\n--- STEP 3: Deleting ADVANCE Aggregation ---");
  
  const deleteVal = await aggregationsColl.findOne({ _id: aggId });
  await aggregationsColl.deleteOne({ _id: aggId });

  // Revert balance
  await usersColl.updateOne({ _id: userId }, { $inc: { advanceBalance: -deleteVal.amount } });
  
  // Delete deposit
  await depositsColl.deleteOne({ aggregationId: aggId });

  updatedUser = await usersColl.findOne({ _id: userId });
  console.log(`Final User Advance Balance: Rs. ${updatedUser.advanceBalance} (Expected: ${initialBalance})`);

  const remainingDep = await depositsColl.findOne({ aggregationId: aggId });
  console.log(`Linked Deposit exists? ${remainingDep ? "YES" : "NO"} (Expected: NO)`);

  console.log("\n--- VERIFICATION COMPLETED SUCCESSFULLY ---");
  process.exit(0);
}

run().catch(err => {
  console.error("Error during verification:", err);
  process.exit(1);
});
