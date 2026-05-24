import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  try {
    // Connect to the 'test' database to check if original data is there
    const testUrl = MONGO_URL.replace("/bachat-kosh", "/test");
    console.log("Checking test database for old user data...");
    await mongoose.connect(testUrl);
    
    const db = mongoose.connection.db;
    const usersCol = db.collection("users");
    const userCount = await usersCol.countDocuments();
    console.log(`\nUsers in 'test' database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await usersCol.find({ role: "USER" }).toArray();
      console.log(`Members (role=USER) in 'test': ${users.length}`);
      users.forEach(u => {
        console.log(`  - ${u.name} | ${u.email} | Account: ${u.accountNumber || "N/A"}`);
      });
    } else {
      console.log("No users found in 'test' database.");
    }
    
    // Also check other collections
    const cols = await db.listCollections().toArray();
    console.log("\nAll collections in 'test' database:");
    for (const col of cols) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
