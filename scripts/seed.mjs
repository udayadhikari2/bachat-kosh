import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs";

// Load .env
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error("MONGO_URL is not defined in .env");
  process.exit(1);
}

// Minimal Schemas for Seeding
const orgSchema = new mongoose.Schema({
  name: String,
  bankDetails: {
    bankName: String,
    accountNo: String,
    accountName: String,
  },
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
  email: { type: String, unique: true },
  password: { type: String },
  role: String,
  organizationId: mongoose.Schema.Types.ObjectId,
  accountNumber: String,
  committeeRole: String,
  isLoanApprover: Boolean,
  isActive: { type: Boolean, default: true },
});

const Organization =
  mongoose.models.Organization || mongoose.model("Organization", orgSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);

    // 1. Clear existing data (Optional, handle with care)
    // await Organization.deleteMany({});
    // await User.deleteMany({});

    console.log("Creating Sample Organization...");
    const org = await Organization.create({
      name: "Sahabat Bachat Kosh",
      bankDetails: {
        bankName: "Laxmi Bank",
        accountNo: "11020015299",
        accountName: "Bibek Adhikari / Sajan Gurung",
      },
      config: {
        monthlyDepositAmount: 1000,
        lateFee: 30,
        interestRate: 12,
        penaltyRate: 20,
        deadlineDay: 30,
      },
      isActive: true,
    });

    console.log("Creating Users...");
    const hashedPassword = await bcrypt.hash("a", 12);

    const usersToCreate = [
      {
        name: "Super Developer",
        email: "dev@example.com",
        password: hashedPassword,
        role: "DEVELOPER",
        isActive: true,
      },
      {
        name: "Organization Admin",
        email: "admin@example.com",
        password: hashedPassword,
        role: "ADMIN",
        organizationId: org._id,
        committeeRole: "Sachib",
        isLoanApprover: true,
        isActive: true,
      },
      {
        name: "Member One",
        email: "member1@example.com",
        password: hashedPassword,
        role: "USER",
        organizationId: org._id,
        accountNumber: "KOSH-001",
        committeeRole: "Sadasya",
        isLoanApprover: false,
        isActive: true,
      },
      {
        name: "Member Two",
        email: "member2@example.com",
        password: hashedPassword,
        role: "USER",
        organizationId: org._id,
        accountNumber: "KOSH-002",
        committeeRole: "Sadasya",
        isLoanApprover: false,
        isActive: true,
      },
    ];

    const createdUsers = await User.create(usersToCreate);

    const referenceData = {
      organization: org,
      users: createdUsers.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        password: "User@123",
        accountNumber: u.accountNumber || "N/A",
      })),
    };

    fs.writeFileSync(
      "seed_data_reference.json",
      JSON.stringify(referenceData, null, 2),
    );

    console.log("-----------------------------------------");
    console.log("SEED SUCCESSFUL");
    console.log("Reference file created: seed_data_reference.json");
    console.log("-----------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
