/**
 * Seed script for Sahabat Bachat Kosh
 *
 * SAFE MODE: This script uses upsert — it NEVER deletes existing data.
 * Running it multiple times is safe. It will only create missing records.
 *
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

// Ensure we connect to bachat-kosh database
const DB_URL = MONGO_URL.replace(
  /mongodb\+srv:\/\/([^@]+)@([^/]+)\/?(\?.*)?$/,
  "mongodb+srv://$1@$2/bachat-kosh$3"
);

// ── Minimal schemas for seeding ───────────────────────────────────────────────
const orgSchema = new mongoose.Schema({
  name: String,
  bankDetails: { bankName: String, accountNo: String, accountName: String },
  bankQr: String,
  config: {
    monthlyDepositAmount: Number,
    lateFee: Number,
    interestRate: Number,
    penaltyRate: Number,
    deadlineDay: Number,
  },
  isActive: Boolean,
});

const userSchema = new mongoose.Schema({
  name: String,
  nickname: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  organizationId: mongoose.Schema.Types.ObjectId,
  accountNumber: String,
  phoneNumber: String,
  gender: String,
  dateOfBirth: Date,
  address: { street: String, city: String, state: String, zip: String },
  committeeRole: String,
  isLoanApprover: { type: Boolean, default: false },
  isSecondaryAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isMinor: { type: Boolean, default: false },
  advanceBalance: { type: Number, default: 0 },
  familyMembers: { type: Array, default: [] },
});

const Organization =
  mongoose.models.Organization || mongoose.model("Organization", orgSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

// ── Excel serial date → JS Date ───────────────────────────────────────────────
function excelDate(serial) {
  if (!serial) return undefined;
  return new Date(Math.floor(serial - 25569) * 86400 * 1000);
}

async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB Atlas (bachat-kosh)...");
    await mongoose.connect(DB_URL);
    console.log("✅ Connected!\n");

    // ── Organization (upsert by name) ─────────────────────────────────────────
    console.log("🏢 Upserting organization...");
    let org = await Organization.findOne({ name: "Sahabat Bachat Kosh" });
    if (!org) {
      org = await Organization.create({
        name: "Sahabat Bachat Kosh",
        bankDetails: {
          bankName: "Laxmi Sunrise Bank Limited",
          accountNo: "11020015299",
          accountName: "Bibek Adhikari / Sajan Gurung",
        },
        bankQr: "",
        config: {
          monthlyDepositAmount: 1000,
          lateFee: 30,
          interestRate: 12,
          penaltyRate: 20,
          deadlineDay: 30,
        },
        isActive: true,
      });
      console.log(`  ✅ Created: ${org.name}`);
    } else {
      console.log(`  ⏭️  Already exists: ${org.name}`);
    }

    // ── Password ──────────────────────────────────────────────────────────────
    const DEFAULT_PASSWORD = "Bachat@123";
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // ── Members (the real 25 + 2 admin accounts) ──────────────────────────────
    const members = [
      // ── Admin accounts ──────────────────────────────────────────────────────
      {
        name: "Super Developer",
        nickname: "Dev",
        email: "dev@bachat.com",
        role: "DEVELOPER",
        accountNumber: "DEV-001",
      },
      {
        name: "Organization Admin",
        nickname: "Admin",
        email: "admin@bachat.com",
        role: "ADMIN",
        accountNumber: "ADMIN-001",
        committeeRole: "Sachib",
        isLoanApprover: true,
      },
      // ── 25 Real Members ─────────────────────────────────────────────────────
      {
        name: "Bikash Adhikari",       nickname: "Bikash",      email: "bikash@temp.com",
        accountNumber: "800401", phoneNumber: "9855051464", gender: "Male",
        dateOfBirth: excelDate(31792),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Sahista Adhikari",      nickname: "Sahista",     email: "sahista@temp.com",
        accountNumber: "800402", phoneNumber: "9855051464", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Samunnat Adhikari",     nickname: "Samunnat",    email: "samunnat@temp.com",
        accountNumber: "800403", phoneNumber: "9855051464", gender: "Male",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Bijay Adhikari",        nickname: "Thulo Bijay", email: "vijay@temp.com",
        accountNumber: "800404", phoneNumber: "9857082309", gender: "Male",
        dateOfBirth: excelDate(32898),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Sumana Dhakal",         nickname: "Sumana",      email: "sumana@temp.com",
        accountNumber: "800405", phoneNumber: "9857082309", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Prinsuvi Adhikari",     nickname: "Prinsuvi",    email: "prinsuvi@temp.com",
        accountNumber: "800406", phoneNumber: "9857082309", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Bishal Adhikari",       nickname: "Bishal",      email: "bishal@temp.com",
        accountNumber: "800407", phoneNumber: "9845541205", gender: "Male",
        dateOfBirth: excelDate(33311),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Jyoti Kafle",           nickname: "Jyoti",       email: "jyoti@temp.com",
        accountNumber: "800408", phoneNumber: "9864442281", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Bishan Adhikari",       nickname: "Bishan",      email: "bishan@temp.com",
        accountNumber: "800409", phoneNumber: "9845541205", gender: "Male",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Sajan Gurung",          nickname: "Sajan",       email: "sajan@temp.com",
        accountNumber: "800410", phoneNumber: "9867427768", gender: "Male",
        dateOfBirth: excelDate(33462),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Hemkala Adhikari",      nickname: "Hemkala",     email: "hemkala@temp.com",
        accountNumber: "800411", phoneNumber: "9867427768", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Bibek Adhikari",        nickname: "Bibek",       email: "vivek@temp.com",
        accountNumber: "800412", phoneNumber: "9844743085", gender: "Male",
        dateOfBirth: excelDate(33730),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Supriya Paudel",        nickname: "Supriya",     email: "supriya@temp.com",
        accountNumber: "800413", phoneNumber: "9844743085", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Binay Adhikari",        nickname: "Binay",       email: "vinay@temp.com",
        accountNumber: "800414", phoneNumber: "9843613966", gender: "Male",
        dateOfBirth: excelDate(34627),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Bhawana Adhikari",      nickname: "Bhawana",     email: "bhawana@temp.com",
        accountNumber: "800415", phoneNumber: "9843613966", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Bijay Adhikari",        nickname: "Sano Bijay",  email: "vijay_s@temp.com",
        accountNumber: "800416", phoneNumber: "9857071761", gender: "Male",
        dateOfBirth: excelDate(35027),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Apsana Paudel",         nickname: "Apsana",      email: "apsana@temp.com",
        accountNumber: "800417", phoneNumber: "9857071761", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Sunil Adhikari",        nickname: "Sunil",       email: "sunil@temp.com",
        accountNumber: "800418", phoneNumber: "9844743080", gender: "Male",
        dateOfBirth: excelDate(35040),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Aarati Kafle",          nickname: "Aarati",      email: "aarati@temp.com",
        accountNumber: "800419", phoneNumber: "9844743080", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Sheyans Adhikari",      nickname: "Sheyans",     email: "sheyans@temp.com",
        accountNumber: "800420", phoneNumber: "9844743080", gender: "Male",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Uday Adhikari",         nickname: "Uday",        email: "uday@temp.com",
        accountNumber: "800421", phoneNumber: "9845634343", gender: "Male",
        dateOfBirth: excelDate(35609),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Kripa Pandit",          nickname: "Kripa",       email: "kripa@temp.com",
        accountNumber: "800422", phoneNumber: "9842277927", gender: "Female",
        dateOfBirth: excelDate(34911),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Madan Paudel",          nickname: "Madan",       email: "madan@temp.com",
        accountNumber: "800423", phoneNumber: "9857082255", gender: "Male",
        dateOfBirth: excelDate(36289),
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Ganga Adhikari",        nickname: "Ganga",       email: "ganga@temp.com",
        accountNumber: "800424", phoneNumber: "9857082255", gender: "Female",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
      {
        name: "Magan Poudel",          nickname: "Magan",       email: "madan_c@temp.com",
        accountNumber: "800425", phoneNumber: "9857082255", gender: "Male",
        address: { street: "Bardaghat-14", city: "Belahani", state: "Nawalparasi", zip: "33000" },
      },
    ];

    console.log("\n👥 Upserting members (safe — no deletes)...");
    let inserted = 0, skipped = 0;

    for (const m of members) {
      const existing = await User.findOne({ email: m.email });
      if (existing) {
        console.log(`  ⏭️  Exists: ${m.name} (${m.accountNumber || m.role})`);
        skipped++;
      } else {
        await User.create({
          ...m,
          password: hashedPassword,
          role: m.role || "USER",
          organizationId: ["DEVELOPER"].includes(m.role) ? undefined : org._id,
          isLoanApprover: m.isLoanApprover ?? false,
          isSecondaryAdmin: false,
          isActive: true,
          isMinor: false,
          advanceBalance: 0,
          familyMembers: [],
        });
        console.log(`  ✅ Created: ${m.name} (${m.accountNumber || m.role})`);
        inserted++;
      }
    }

    // ── Write reference file ──────────────────────────────────────────────────
    const reference = {
      organization: { name: org.name, _id: org._id },
      defaultPassword: DEFAULT_PASSWORD,
      members: members.map(m => ({
        name: m.name,
        email: m.email,
        role: m.role || "USER",
        accountNumber: m.accountNumber || "N/A",
      })),
    };
    fs.writeFileSync("seed_data_reference.json", JSON.stringify(reference, null, 2));

    console.log("\n─────────────────────────────────────────");
    console.log("✅ SEED COMPLETE");
    console.log(`   Inserted : ${inserted}`);
    console.log(`   Skipped  : ${skipped} (already existed)`);
    console.log(`   Password : ${DEFAULT_PASSWORD}`);
    console.log("   Reference: seed_data_reference.json");
    console.log("─────────────────────────────────────────");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
