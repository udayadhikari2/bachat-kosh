/**
 * Seed script for Bachat System
 *
 * Initial state: ONLY the Developer account.
 * Admins are created by the Developer through the Organizations page.
 *
 * SAFE: Uses upsert — never deletes existing data.
 * Usage: node scripts/seed.mjs
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import dns from "dns";
import fs from "fs";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) {
  console.error("❌ MONGO_URL is not defined in .env");
  process.exit(1);
}

const DB_URL = MONGO_URL.replace(
  /mongodb\+srv:\/\/([^@]+)@([^/]+)\/?(\?.*)?$/,
  "mongodb+srv://$1@$2/bachat-kosh$3"
);

const userSchema = new mongoose.Schema({
  name: String, nickname: String,
  email: { type: String, unique: true },
  password: String, role: String,
  organizationId: mongoose.Schema.Types.ObjectId,
  accountNumber: String,
  isLoanApprover: { type: Boolean, default: false },
  isSecondaryAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isMinor: { type: Boolean, default: false },
  advanceBalance: { type: Number, default: 0 },
  familyMembers: { type: Array, default: [] },
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB Atlas (bachat-kosh)...");
    await mongoose.connect(DB_URL);
    console.log("✅ Connected!\n");

    const DEFAULT_PASSWORD = "Bachat@123";
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    console.log("👤 Upserting Developer account...");
    const existing = await User.findOne({ email: "dev@bachat.com" });
    if (existing) {
      console.log("  ⏭️  Developer already exists: dev@bachat.com");
    } else {
      await User.create({
        name: "Super Developer",
        nickname: "Dev",
        email: "dev@bachat.com",
        password: hashedPassword,
        role: "DEVELOPER",
        accountNumber: "DEV-001",
        isLoanApprover: false,
        isSecondaryAdmin: false,
        isActive: true,
        isMinor: false,
        advanceBalance: 0,
        familyMembers: [],
      });
      console.log("  ✅ Developer created: dev@bachat.com");
    }

    fs.writeFileSync(
      "seed_data_reference.json",
      JSON.stringify({
        note: "Only Developer is seeded. Create organizations via dashboard, then assign admins.",
        developer: { email: "dev@bachat.com", password: DEFAULT_PASSWORD, role: "DEVELOPER" },
      }, null, 2)
    );

    console.log("\n─────────────────────────────────────────");
    console.log("✅ SEED COMPLETE");
    console.log("   Developer: dev@bachat.com / Bachat@123");
    console.log("   → Log in as Developer to create organizations");
    console.log("   → Assign admin credentials per organization");
    console.log("─────────────────────────────────────────");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
