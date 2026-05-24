import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL.replace(
  /mongodb\+srv:\/\/([^@]+)@([^/]+)\/?(\?.*)?$/,
  "mongodb+srv://$1@$2/bachat-kosh$3"
);

async function run() {
  await mongoose.connect(MONGO_URL);
  const db = mongoose.connection.db;

  const deposits = db.collection("deposits");
  const loans = db.collection("loans");
  const users = db.collection("users");

  // Get all current users
  const allUsers = await users.find({}).toArray();
  console.log("\n=== Current Users in DB ===");
  allUsers.forEach(u => {
    console.log(`  _id: ${u._id} | name: ${u.name} | account: ${u.accountNumber || "N/A"}`);
  });

  // Get unique userIds in deposits
  const depositUserIds = await deposits.distinct("userId");
  console.log(`\n=== Deposits: ${await deposits.countDocuments()} total ===`);
  console.log(`  Unique userIds referenced: ${depositUserIds.length}`);
  depositUserIds.forEach(id => {
    const match = allUsers.find(u => u._id.toString() === id.toString());
    console.log(`  - userId: ${id} → User: ${match ? match.name + " (" + match.accountNumber + ")" : "⚠️  NOT FOUND IN USERS"}`);
  });

  // Get unique userIds in loans
  const loanUserIds = await loans.distinct("userId");
  console.log(`\n=== Loans: ${await loans.countDocuments()} total ===`);
  console.log(`  Unique userIds referenced: ${loanUserIds.length}`);
  loanUserIds.forEach(id => {
    const match = allUsers.find(u => u._id.toString() === id.toString());
    console.log(`  - userId: ${id} → User: ${match ? match.name + " (" + match.accountNumber + ")" : "⚠️  NOT FOUND IN USERS"}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
