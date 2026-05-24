/**
 * Restore 25 original members with their exact original MongoDB _id values
 * so that all existing deposits and loans automatically reconnect.
 *
 * Strategy:
 *  - Read deposits to find the original 25 userIds
 *  - Sort them chronologically (ObjectId encodes creation time)
 *  - Read Member.xlsx for member data (sorted by Account Number)
 *  - Match by position: earliest userId → lowest account number (800401)
 *  - Insert each user with their original _id
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Import xlsx ───────────────────────────────────────────────────────────────
const xlsx = await import(path.join(__dirname, "node_modules/xlsx/xlsx.mjs")).catch(async () => {
  // fallback: CJS require
  const { createRequire } = await import("module");
  const require = createRequire(import.meta.url);
  return require("xlsx");
});

// ── Read Excel ────────────────────────────────────────────────────────────────
const XLSX_PATH = path.join(__dirname, "..", "Member.xlsx");
const wb = xlsx.readFile ? xlsx.readFile(XLSX_PATH) : xlsx.default.readFile(XLSX_PATH);
const utils = xlsx.utils || xlsx.default.utils;
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws);

// Excel serial date → JS Date
function excelDateToJS(serial) {
  if (!serial || isNaN(serial)) return undefined;
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

// Sort members by Account Number ascending (800401, 800402, ...)
rows.sort((a, b) => Number(a["Account Number"]) - Number(b["Account Number"]));
console.log(`\n📋 Excel members loaded: ${rows.length}`);
rows.forEach((r, i) => console.log(`  [${i + 1}] ${r["Full Name"]} | Account: ${r["Account Number"]}`));

// ── Connect to DB ─────────────────────────────────────────────────────────────
const MONGO_URL = process.env.MONGO_URL.replace(
  /mongodb\+srv:\/\/([^@]+)@([^/]+)\/?(\?.*)?$/,
  "mongodb+srv://$1@$2/bachat-kosh$3"
);

console.log("\n🔌 Connecting to bachat-kosh...");
await mongoose.connect(MONGO_URL);
console.log("✅ Connected!");

const db = mongoose.connection.db;
const depositsCol = db.collection("deposits");
const usersCol    = db.collection("users");

// ── Get the 25 original userIds from deposits ─────────────────────────────────
const depositUserIds = await depositsCol.distinct("userId");
console.log(`\n🔍 Found ${depositUserIds.length} unique userIds in deposits`);

// Sort ObjectIds chronologically (ObjectId first 4 bytes = Unix timestamp)
// ObjectId.getTimestamp() works on mongoose ObjectId
const sorted = depositUserIds
  .map(id => ({ id, ts: id.toString().substring(0, 8) }))
  .sort((a, b) => a.ts.localeCompare(b.ts))
  .map(x => x.id);

console.log("\n📅 UserIds sorted chronologically (oldest → newest):");
sorted.forEach((id, i) => {
  const ts = new Date(parseInt(id.toString().substring(0, 8), 16) * 1000);
  console.log(`  [${i + 1}] ${id} — created: ${ts.toISOString().split("T")[0]}`);
});

// ── Validate counts match ─────────────────────────────────────────────────────
if (sorted.length !== rows.length) {
  console.error(`\n❌ Mismatch! DB has ${sorted.length} original users but Excel has ${rows.length} rows.`);
  console.error("   Please ensure Excel has exactly the same number of members.");
  await mongoose.disconnect();
  process.exit(1);
}

// ── Get Organization ──────────────────────────────────────────────────────────
const org = await db.collection("organizations").findOne({});
if (!org) {
  console.error("\n❌ No organization found. Cannot import.");
  await mongoose.disconnect();
  process.exit(1);
}
console.log(`\n🏢 Organization: ${org.name}`);

// ── Build the mapping ─────────────────────────────────────────────────────────
console.log("\n=== Member → Original _id Mapping ===");
const mapping = rows.map((row, i) => {
  const originalId = sorted[i];
  return {
    _id: originalId,
    name: row["Full Name"],
    accountNumber: String(row["Account Number"]),
    email: row["Email"]?.toLowerCase(),
  };
});
mapping.forEach(m => {
  console.log(`  ${m.accountNumber} | ${m.name.padEnd(20)} → _id: ${m._id}`);
});

// ── Confirm ───────────────────────────────────────────────────────────────────
const readline = await import("readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise(resolve => {
  rl.question(`\n⚠️  Restore ${rows.length} members with original _ids? (yes/no): `, resolve);
});
rl.close();

if (answer.toLowerCase() !== "yes") {
  console.log("❌ Cancelled.");
  await mongoose.disconnect();
  process.exit(0);
}

// ── Hash default password ─────────────────────────────────────────────────────
const DEFAULT_PASSWORD = "Bachat@123";
const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

// ── Delete existing seed users (not the original 25) ─────────────────────────
const seedIds = ["6a0f52f355c261f7e3305a28","6a0f52f355c261f7e3305a29","6a0f52f355c261f7e3305a2a","6a0f52f355c261f7e3305a2b"];
await usersCol.deleteMany({ _id: { $in: seedIds.map(id => new mongoose.Types.ObjectId(id)) } });
console.log("\n🗑️  Removed 4 seed placeholder users.");

// ── Insert members with original _ids ────────────────────────────────────────
let inserted = 0, skipped = 0, errors = 0;

for (let i = 0; i < rows.length; i++) {
  const row  = rows[i];
  const orig = sorted[i];

  const genderRaw = (row["Gender"] || "").toLowerCase();
  const genderMap = { male: "Male", female: "Female", other: "Other" };
  const gender = genderMap[genderRaw];

  const dobSerial = row["Date of Birth"];
  const dateOfBirth = excelDateToJS(dobSerial);

  const doc = {
    _id: orig,
    name: row["Full Name"],
    nickname: row["Nickname"] || undefined,
    email: row["Email"]?.toLowerCase()?.trim(),
    password: hashedPassword,
    role: (row["Role"] || "USER").toUpperCase(),
    organizationId: org._id,
    accountNumber: String(row["Account Number"]),
    phoneNumber: String(row["Phone Number"] || ""),
    gender,
    dateOfBirth,
    address: {
      street: row["Street"] || undefined,
      city:   row["City"]   || undefined,
      state:  row["State"]  || undefined,
      zip:    String(row["Zip"] || ""),
    },
    isLoanApprover: false,
    isSecondaryAdmin: false,
    isActive: true,
    isMinor: false,
    advanceBalance: 0,
    familyMembers: [],
    createdAt: new Date(parseInt(orig.toString().substring(0, 8), 16) * 1000),
    updatedAt: new Date(),
  };

  try {
    const existing = await usersCol.findOne({ _id: orig });
    if (existing) {
      console.log(`  [${i + 1}] ⏭️  Already exists: ${doc.name} (${doc.accountNumber})`);
      skipped++;
    } else {
      await usersCol.insertOne(doc);
      console.log(`  [${i + 1}] ✅ Restored: ${doc.name} | ${doc.accountNumber} | _id: ${orig}`);
      inserted++;
    }
  } catch (err) {
    console.log(`  [${i + 1}] ❌ Error for ${doc.name}: ${err.message}`);
    errors++;
  }
}

// ── Also restore DEVELOPER + ADMIN users ─────────────────────────────────────
console.log("\n📥 Restoring DEVELOPER and ADMIN accounts...");
const adminUsers = [
  {
    name: "Super Developer",
    email: "dev@bachat.com",
    password: hashedPassword,
    role: "DEVELOPER",
    organizationId: org._id,
    accountNumber: "DEV-001",
    isLoanApprover: false, isSecondaryAdmin: false, isActive: true,
    isMinor: false, advanceBalance: 0, familyMembers: [],
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    name: "Organization Admin",
    email: "admin@bachat.com",
    password: hashedPassword,
    role: "ADMIN",
    organizationId: org._id,
    accountNumber: "ADMIN-001",
    isLoanApprover: false, isSecondaryAdmin: false, isActive: true,
    isMinor: false, advanceBalance: 0, familyMembers: [],
    createdAt: new Date(), updatedAt: new Date(),
  },
];

for (const u of adminUsers) {
  try {
    await usersCol.updateOne({ email: u.email }, { $setOnInsert: u }, { upsert: true });
    console.log(`  ✅ ${u.role}: ${u.name} (${u.email})`);
  } catch (err) {
    console.log(`  ❌ ${u.name}: ${err.message}`);
  }
}

// ── Final verification ────────────────────────────────────────────────────────
const totalUsers = await usersCol.countDocuments();
const totalDeposits = await depositsCol.countDocuments();

// Verify all deposit userIds now resolve
const depositUserIdsAfter = await depositsCol.distinct("userId");
let resolved = 0;
for (const uid of depositUserIdsAfter) {
  const u = await usersCol.findOne({ _id: uid });
  if (u) resolved++;
}

console.log("\n=== Restore Complete ===");
console.log(`  ✅ Inserted  : ${inserted}`);
console.log(`  ⏭️  Skipped   : ${skipped}`);
console.log(`  ❌ Errors    : ${errors}`);
console.log(`  👥 Total users in DB : ${totalUsers}`);
console.log(`  💰 Total deposits    : ${totalDeposits}`);
console.log(`  🔗 Deposits resolved : ${resolved}/${depositUserIdsAfter.length} userIds linked to real users`);
console.log(`\n🔑 Default password for all members: ${DEFAULT_PASSWORD}`);

await mongoose.disconnect();
