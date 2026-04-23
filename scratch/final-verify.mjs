import mongoose from "mongoose";
import connectDB from "../lib/db";
import AdminAudit from "../lib/models/AdminAudit";
import Organization from "../lib/models/Organization";

async function verify() {
  await connectDB();
  
  const orgId = "69ddbdb61ad63caf75aab8ce";
  
  console.log("--- FINAL VERIFICATION ---");
  
  // 1. Check Audit Log
  const latestAudit = await AdminAudit.findOne({ organizationId: orgId })
    .sort({ createdAt: -1 })
    .lean();
    
  console.log("LATEST AUDIT:", latestAudit ? {
    id: latestAudit._id,
    action: latestAudit.action,
    status: latestAudit.status,
    timestamp: latestAudit.createdAt,
    newValues: latestAudit.newValues
  } : "NONE FOUND");

  // 2. Check Organization State
  const org = await Organization.findById(orgId).lean();
  console.log("DB CURRENT BASELINE:", org.financials?.initialMonthlyCollection);
  
  process.exit();
}

verify();
