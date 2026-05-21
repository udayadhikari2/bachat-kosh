import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

// Fix DNS resolution issues
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
    console.log("Current Database Name:", db?.databaseName);

    // List collections in the current database
    const collections = await db?.listCollections().toArray();
    console.log("Collections in current database:");
    if (collections) {
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(` - ${col.name} (${count} documents)`);
      }
    }

    // List all databases if authorized
    try {
      const adminDb = db?.admin();
      const dbList = await adminDb?.listDatabases();
      console.log("\nAll Databases in cluster:");
      if (dbList && dbList.databases) {
        for (const d of dbList.databases) {
          console.log(` - ${d.name} (size: ${d.sizeOnDisk} bytes, empty: ${d.empty})`);
        }
      }
    } catch (err) {
      console.log("\nCould not list all databases (insufficient permissions or not supported):", err.message);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error running script:", error);
    process.exit(1);
  }
}

run();
