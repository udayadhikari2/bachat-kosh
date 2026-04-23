import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

// Fix for Atlas SRV resolution issues - use Google DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Load .env
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("MONGO_URL is not defined in .env");
  process.exit(1);
}

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function cleanup() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);

    console.log("Deleting test-deposit-admin...");
    const result = await User.deleteOne({ email: "test-deposit-admin@example.com" });
    
    if (result.deletedCount > 0) {
      console.log("User successfully removed.");
    } else {
      console.log("User not found.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Cleanup error:", error);
    process.exit(1);
  }
}

cleanup();
