import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

async function testConnection() {
  try {
    console.log("Attempting to connect to:", MONGO_URL?.replace(/:([^@]+)@/, ":****@"));
    await mongoose.connect(MONGO_URL || "");
    console.log("✅ SUCCESS: Connected to MongoDB!");
    
    // Check if we can access the database
    const db = mongoose.connection.db;
    const collections = await db?.listCollections().toArray();
    console.log("Collections found:", collections?.map(c => c.name));
    
    process.exit(0);
  } catch (error) {
    console.error("❌ FAILED: Connection error details:");
    console.error(error);
    process.exit(1);
  }
}

testConnection();
