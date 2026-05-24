import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config();

const MONGO_URL = process.env.MONGO_URL.replace(
  /mongodb\+srv:\/\/([^@]+)@([^/]+)\/?(\?.*)?$/,
  "mongodb+srv://$1@$2/bachat-kosh$3"
);

const orgSchema = new mongoose.Schema({
  name: String,
  bankDetails: { bankName: String, accountNo: String, accountName: String },
  bankQr: String,
  config: { monthlyDepositAmount: Number, lateFee: Number, interestRate: Number, penaltyRate: Number, deadlineDay: Number },
  isActive: Boolean,
});

const userSchema = new mongoose.Schema({
  name: String, nickname: String,
  email: { type: String, unique: true },
  password: String, role: String,
  organizationId: mongoose.Schema.Types.ObjectId,
  accountNumber: String, phoneNumber: String,
  committeeRole: String,
  isLoanApprover: { type: Boolean, default: false },
  isSecondaryAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isMinor: { type: Boolean, default: false },
  advanceBalance: { type: Number, default: 0 },
  familyMembers: { type: Array, default: [] },
});

const Organization = mongoose.models.Organization || mongoose.model("Organization", orgSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

async function reset() {
  console.log("🔌 Connecting to bachat-kosh...");
  await mongoose.connect(MONGO_URL);
  console.log("✅ Connected!\n");

  const db = mongoose.connection.db;

  // ── Wipe all collections ──────────────────────────────────────────────────
  console.log("🗑️  Clearing all collections...");
  const cols = await db.listCollections().toArray();
  for (const c of cols) {
    const result = await db.collection(c.name).deleteMany({});
    console.log(`   Cleared ${c.name}: ${result.deletedCount} documents`);
  }

  // ── Create fresh organization ─────────────────────────────────────────────
  console.log("\n🏢 Creating organization...");
  const org = await Organization.create({
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
  console.log(`   ✅ ${org.name} (${org._id})`);

  // ── Create 3 initial users ────────────────────────────────────────────────
  const password = await bcrypt.hash("Bachat@123", 10);

  console.log("\n👥 Creating initial users...");
  const users = await User.create([
    {
      name: "Super Developer",
      nickname: "Dev",
      email: "dev@bachat.com",
      password,
      role: "DEVELOPER",
      accountNumber: "DEV-001",
      isLoanApprover: false,
      isActive: true,
    },
    {
      name: "Organization Admin",
      nickname: "Admin",
      email: "admin@bachat.com",
      password,
      role: "ADMIN",
      organizationId: org._id,
      accountNumber: "ADMIN-001",
      committeeRole: "Sachib",
      isLoanApprover: true,
      isActive: true,
    },
    {
      name: "Member One",
      nickname: "Member",
      email: "member@bachat.com",
      password,
      role: "USER",
      organizationId: org._id,
      accountNumber: "800401",
      isLoanApprover: false,
      isActive: true,
    },
  ]);

  users.forEach(u => {
    console.log(`   ✅ ${u.role}: ${u.name} | ${u.email} | ${u.accountNumber}`);
  });

  console.log("\n─────────────────────────────────────────");
  console.log("✅ DATABASE RESET COMPLETE");
  console.log("   Password for all accounts: Bachat@123");
  console.log("   dev@bachat.com     → DEVELOPER");
  console.log("   admin@bachat.com   → ADMIN");
  console.log("   member@bachat.com  → USER (account: 800401)");
  console.log("─────────────────────────────────────────");

  await mongoose.disconnect();
}

reset().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
