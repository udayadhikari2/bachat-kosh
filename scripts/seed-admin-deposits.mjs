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

const opts = {
  bufferCommands: false,
  family: 4, // Force IPv4
};

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL, opts);

    // Get the Admin user and their organization
    const adminUser = await User.findOne({ email: "admin@example.com" });
    if (!adminUser) {
      console.log("admin@example.com not found. Cannot seed deposits.");
      process.exit(1);
    }
    
    console.log("Found admin@example.com layout. Finding their organization members...");
    
    // Find members of the same organization
    const members = await User.find({ 
      organizationId: adminUser.organizationId,
      role: "USER" 
    });

    if (members.length === 0) {
      console.log("No regular users found in this organization to attach deposits to.");
      process.exit(1);
    }

    // Create Deposits
    console.log(`Seeding Deposits for ${members.length} members...`);
    await Deposit.deleteMany({ organizationId: adminUser.organizationId });

    const months = ["माघ 2080", "फागुन 2080", "चैत 2080", "बैशाख 2081"];
    const statuses = ["PENDING", "APPROVED", "REJECTED"];
    
    const deposits = [];
    
    // Mix of deposits
    members.forEach((user, index) => {
      months.forEach((month, mIdx) => {
        // Skip some to make it look realistic
        if (Math.random() > 0.8 && mIdx > 0) return;

        const status = mIdx === 3 ? "PENDING" : (mIdx < 2 ? "APPROVED" : (Math.random() > 0.5 ? "PENDING" : "REJECTED"));
        const amount = 1000;
        const fine = (Math.random() > 0.7) ? 50 : 0;
        
        deposits.push({
          userId: user._id,
          organizationId: adminUser.organizationId,
          amount,
          month,
          status,
          fineApplied: fine,
          proof: "https://placehold.co/600x400/000000/FFFFFF/png?text=Deposit+Transaction",
          depositDate: new Date(Date.now() - (3 - mIdx) * 30 * 24 * 60 * 60 * 1000)
        });
      });
    });

    await Deposit.insertMany(deposits);

    console.log("-----------------------------------------");
    console.log("DEPOSIT DATA SEEDED SUCCESSFULLY FOR admin@example.com");
    console.log(`Deposits Created: ${deposits.length}`);
    console.log("-----------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
