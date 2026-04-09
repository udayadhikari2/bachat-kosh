import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const username = encodeURIComponent(process.env.MONGO_DB_USERNAME || "");
const password = encodeURIComponent(process.env.MONGO_DB_PASSWORD || "");
const cluster = "hamro-bachat.25mfjtn.mongodb.net";
const dbName = "hamro_bachat";

const uri = `mongodb+srv://${username}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority`;

async function testConnection() {
  try {
    console.log("Attempting constructed URI connection...");
    await mongoose.connect(uri);
    console.log("✅ SUCCESS: Connected to MongoDB!");
    process.exit(0);
  } catch (error) {
    console.error("❌ FAILED:", error.message);
    process.exit(1);
  }
}

testConnection();
