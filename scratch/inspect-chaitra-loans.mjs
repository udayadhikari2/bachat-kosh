import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import { createRequire } from "module";

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const require = createRequire(import.meta.url);
const adbs = require('ad-bs-converter');

const NEPALI_MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", 
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
];

function parseNepaliMonth(monthStr) {
  const [name, yearStr] = monthStr.split(" ");
  const monthIndex = NEPALI_MONTHS.findIndex(m => m.toLowerCase() === name.toLowerCase());
  return {
    month: monthIndex + 1,
    year: parseInt(yearStr)
  };
}

function bsToAd(year, month, day) {
  const formatted = `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
  const converted = adbs.bs2ad(formatted);
  return new Date(converted.year, converted.month - 1, converted.day);
}

function getDaysInMonth(year, month) {
  const formatted = `${year}/${month.toString().padStart(2, '0')}/01`;
  const ad = adbs.bs2ad(formatted);
  const bs = adbs.ad2bs(`${ad.year}/${ad.month}/${ad.day}`);
  return bs.en.totalDaysInMonth;
}

const MONGO_URL = process.env.MONGO_URL;

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGO_URL);
  console.log("Connected successfully.");

  const loansColl = mongoose.connection.db.collection("loans");
  
  const targetMonth = "Chaitra 2082";
  const target = parseNepaliMonth(targetMonth);
  const daysInMonth = getDaysInMonth(target.year, target.month);
  const startDate = bsToAd(target.year, target.month, 1);
  const endDate = bsToAd(target.year, target.month, daysInMonth);
  endDate.setHours(23, 59, 59, 999);

  console.log(`Chaitra 2082 Start Date: ${startDate.toISOString()}`);
  console.log(`Chaitra 2082 End Date: ${endDate.toISOString()}`);

  const loans = await loansColl.find({
    status: { $in: ["ACTIVE", "COMPLETED", "OVERDUE"] },
    activatedAt: { $gte: startDate, $lte: endDate }
  }).toArray();

  console.log(`\nFound ${loans.length} loans activated in Chaitra 2082:`);
  loans.forEach(l => {
    console.log(`- ID: ${l._id} | principal: ${l.principalAmount} | bankCharge: ${l.bankCharge} | activatedAt: ${l.activatedAt}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
