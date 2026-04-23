import mongoose from "mongoose";
import bcrypt from "bcryptjs";
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
const orgSchema = new mongoose.Schema({
  name: String,
  config: { monthlyDepositAmount: Number, lateFee: Number },
  isActive: Boolean,
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: { type: String },
  role: String,
  organizationId: mongoose.Schema.Types.ObjectId,
  isActive: { type: Boolean, default: true },
});

const depositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  amount: Number,
  month: String,
  status: String,
  depositDate: { type: Date, default: Date.now },
  proof: String,
  fineApplied: { type: Number, default: 0 },
}, { timestamps: true });

const Organization = mongoose.models.Organization || mongoose.model("Organization", orgSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);
const Deposit = mongoose.models.Deposit || mongoose.model("Deposit", depositSchema);

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);

    // Get the first organization
    let org = await Organization.findOne();
    if (!org) {
      console.log("Creating default organization...");
      org = await Organization.create({
        name: "Test Savings Org",
        config: { monthlyDepositAmount: 1000, lateFee: 50 },
        isActive: true
      });
    }

    const hashedPassword = await bcrypt.hash("Password@123", 12);

    // Create Test Deposit Admin
    console.log("Creating Test Admin...");
    await User.deleteOne({ email: "test-deposit-admin@example.com" });
    const admin = await User.create({
      name: "Test Deposit Admin",
      email: "test-deposit-admin@example.com",
      password: hashedPassword,
      role: "ADMIN",
      organizationId: org._id,
      isActive: true
    });

    // Create a few members
    console.log("Creating Test Members...");
    const memberNames = ["Arjun Thapa", "Sita Rai", "Babita Gurung", "Dipen Shrestha", "Pooja Magar"];
    const users = [];
    
    for (const name of memberNames) {
      const email = `${name.toLowerCase().replace(" ", ".")}@example.com`;
      await User.deleteOne({ email });
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "USER",
        organizationId: org._id,
        isActive: true
      });
      users.push(user);
    }

    // Create Deposits
    console.log("Seeding Deposits...");
    await Deposit.deleteMany({ organizationId: org._id });

    const months = ["Chaitra 2080", "Baisakh 2081", "Jestha 2081", "Ashadh 2081"];
    const statuses = ["PENDING", "APPROVED", "REJECTED"];
    
    const deposits = [];
    
    // Mix of deposits
    users.forEach((user, index) => {
      months.forEach((month, mIdx) => {
        // Skip some to make it look realistic
        if (Math.random() > 0.8 && mIdx > 0) return;

        const status = mIdx < 2 ? "APPROVED" : (Math.random() > 0.5 ? "PENDING" : "REJECTED");
        const amount = 1000;
        const fine = (Math.random() > 0.7) ? 50 : 0;
        
        deposits.push({
          userId: user._id,
          organizationId: org._id,
          amount,
          month,
          status,
          fineApplied: fine,
          proof: "https://placehold.co/600x400/000000/FFFFFF/png?text=Deposit+Proof",
          depositDate: new Date(Date.now() - (3 - mIdx) * 30 * 24 * 60 * 60 * 1000)
        });
      });
    });

    await Deposit.insertMany(deposits);

    console.log("-----------------------------------------");
    console.log("TEST DATA SEEDED SUCCESSFULLY");
    console.log("Admin Login: test-deposit-admin@example.com");
    console.log("Password: Password@123");
    console.log(`Deposits Created: ${deposits.length}`);
    console.log("-----------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
