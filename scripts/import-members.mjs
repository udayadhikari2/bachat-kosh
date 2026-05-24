/**
 * Import members from CSV into bachat-kosh database
 *
 * USAGE:
 *   1. Export your Excel as CSV (File → Save As → CSV UTF-8) named "members.csv"
 *   2. Place members.csv in: D:\Projects\bachat\hamro-bachat\
 *   3. Run: node scripts/import-members.mjs
 *
 * Expected CSV columns (in any order):
 *   Full Name, Nickname, Email, Account Number, Phone Number,
 *   Role, Gender, Date of Birth, Street, City, State, Zip
 */

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import dotenv from "dotenv";
import dns from "dns";
import bcrypt from "bcryptjs";

dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "members.csv");

// ─── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = content.split("\n").filter(l => l.trim());
  
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  console.log("📋 Detected columns:", headers.join(", "));
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.every(v => !v.trim())) continue; // skip empty rows
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || "").trim().replace(/^"|"$/g, "");
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current); current = ""; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

// ─── Column Mapping (flexible — matches your Excel headers) ──────────────────
function mapRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(h => h.toLowerCase().trim() === k.toLowerCase());
      if (found && row[found]) return row[found].trim();
    }
    return "";
  };

  const name       = get("full name", "name", "fullname");
  const nickname   = get("nickname", "nick name");
  const email      = get("email", "email address");
  const account    = get("account number", "accountnumber", "account");
  const phone      = get("phone number", "phonenumber", "phone", "mobile");
  const role       = get("role") || "USER";
  const gender     = get("gender");
  const dob        = get("date of birth", "dateofbirth", "dob", "birth date");
  const street     = get("street", "street address");
  const city       = get("city");
  const state      = get("state");
  const zip        = get("zip", "zip code", "postal code");

  return { name, nickname, email, account, phone, role, gender, dob, street, city, state, zip };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Check CSV exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`\n❌ CSV file not found at: ${CSV_PATH}`);
    console.error("   → Export your Excel as CSV and name it 'members.csv'");
    console.error("   → Place it in: D:\\Projects\\bachat\\hamro-bachat\\");
    process.exit(1);
  }

  console.log(`\n📂 Reading CSV from: ${CSV_PATH}`);
  const rows = parseCSV(CSV_PATH);
  console.log(`✅ Found ${rows.length} rows in CSV\n`);

  // Preview first 3 rows
  console.log("=== Preview (first 3 rows) ===");
  rows.slice(0, 3).forEach((r, i) => {
    const m = mapRow(r);
    console.log(`  [${i + 1}] ${m.name} | ${m.email} | Account: ${m.account} | Role: ${m.role}`);
  });

  // Confirm before importing
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => {
    rl.question(`\n⚠️  Import ${rows.length} members into bachat-kosh? (yes/no): `, resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== "yes") {
    console.log("❌ Import cancelled.");
    process.exit(0);
  }

  // Connect DB
  const MONGO_URL = process.env.MONGO_URL;
  if (!MONGO_URL) {
    console.error("❌ MONGO_URL not found in .env");
    process.exit(1);
  }

  const dbUrl = MONGO_URL.includes("bachat-kosh")
    ? MONGO_URL
    : MONGO_URL.replace(/(mongodb\+srv:\/\/[^/]+\/)([^?]*)/, "$1bachat-kosh$2") ||
      MONGO_URL + (MONGO_URL.includes("?") ? "&" : "?");

  // Fix: ensure we connect to bachat-kosh database
  const finalUrl = MONGO_URL.replace(
    /mongodb\+srv:\/\/([^@]+)@([^/]+)\/?(\?.*)?$/,
    "mongodb+srv://$1@$2/bachat-kosh$3"
  );

  console.log("\n🔌 Connecting to MongoDB Atlas (bachat-kosh)...");
  await mongoose.connect(finalUrl);
  console.log("✅ Connected!\n");

  // Get the Organization ID
  const orgCol = mongoose.connection.db.collection("organizations");
  const org = await orgCol.findOne({});
  if (!org) {
    console.error("❌ No organization found in bachat-kosh database.");
    console.error("   → Please create an organization first through the app.");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`🏢 Organization: ${org.name} (${org._id})\n`);

  // Default password hash (password: "Bachat@123")
  const DEFAULT_PASSWORD = "Bachat@123";
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const usersCol = mongoose.connection.db.collection("users");

  let imported = 0;
  let skipped  = 0;
  let errors   = 0;

  console.log("=== Importing Members ===");

  for (let i = 0; i < rows.length; i++) {
    const m = mapRow(rows[i]);

    if (!m.name || !m.email) {
      console.log(`  [${i + 1}] ⚠️  Skipped — missing name or email: ${JSON.stringify(rows[i])}`);
      skipped++;
      continue;
    }

    // Normalize role
    const roleMap = { user: "USER", admin: "ADMIN", developer: "DEVELOPER" };
    const role = roleMap[m.role.toLowerCase()] || "USER";

    // Normalize gender
    const genderMap = { male: "Male", female: "Female", other: "Other" };
    const gender = genderMap[m.gender.toLowerCase()] || undefined;

    // Parse date of birth
    let dateOfBirth = undefined;
    if (m.dob) {
      const d = new Date(m.dob);
      if (!isNaN(d.getTime())) dateOfBirth = d;
    }

    const doc = {
      name: m.name,
      email: m.email.toLowerCase(),
      password: hashedPassword,
      role,
      organizationId: org._id,
      accountNumber: m.account || undefined,
      phoneNumber: m.phone || undefined,
      nickname: m.nickname || undefined,
      gender,
      dateOfBirth,
      address: {
        street: m.street || undefined,
        city: m.city || undefined,
        state: m.state || undefined,
        zip: m.zip || undefined,
      },
      isLoanApprover: false,
      isSecondaryAdmin: false,
      isActive: true,
      isMinor: false,
      advanceBalance: 0,
      familyMembers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      // Upsert by email (safe — won't duplicate if run twice)
      await usersCol.updateOne(
        { email: doc.email },
        { $setOnInsert: doc },
        { upsert: true }
      );
      console.log(`  [${i + 1}] ✅ ${m.name} | ${m.email} | ${m.account || "no account"}`);
      imported++;
    } catch (err) {
      console.log(`  [${i + 1}] ❌ Error for ${m.name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`  ✅ Imported : ${imported}`);
  console.log(`  ⚠️  Skipped  : ${skipped}`);
  console.log(`  ❌ Errors   : ${errors}`);
  console.log(`\n🔑 Default password for all new members: ${DEFAULT_PASSWORD}`);
  console.log("   → Members can change it after first login.\n");

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
