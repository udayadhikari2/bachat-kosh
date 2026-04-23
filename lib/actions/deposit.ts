"use server";

import mongoose from "mongoose";

import connectDB from "@/lib/db";
import Deposit from "@/lib/models/Deposit";
import User from "@/lib/models/User";
import Notification from "@/lib/models/Notification";
import Organization from "@/lib/models/Organization";
import AdminAudit from "@/lib/models/AdminAudit";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export async function getDeposits(params: {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}) {
  try {
    await connectDB();
    const { organizationId, page = 1, limit = 10, search, fromDate, toDate, status } = params;

    const query: any = { organizationId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      const matchingUsers = await User.find({
        organizationId,
        name: { $regex: search, $options: "i" }
      }).select("_id");
      query.userId = { $in: matchingUsers.map(u => u._id) };
    }

    if (fromDate || toDate) {
      query.depositDate = {};
      if (fromDate) query.depositDate.$gte = new Date(fromDate);
      if (toDate) query.depositDate.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;

    const [deposits, total] = await Promise.all([
      Deposit.find(query)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Deposit.countDocuments(query)
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(deposits)),
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDeposit(id: string, data: any) {
  try {
    await connectDB();
    await Deposit.findByIdAndUpdate(id, {
      ...data,
      isModified: true
    });
    revalidatePath("/dashboard/deposits");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createDeposit(data: {
  userId: string;
  organizationId: string;
  amount: number;
  advancedPayment?: number;
  month: string;
  depositType: "MONTHLY" | "SERVICE_CHARGE" | "LOAN_INTEREST";
  depositDate: string;
  proof: string;
  creditUsed?: number;
}) {
  try {
    await connectDB();
    const newDeposit = await Deposit.create({
      ...data,
      advancedPayment: data.advancedPayment || 0,
      creditUsed: data.creditUsed || 0,
    });
    
    // Create notification for admin
    await Notification.create({
      senderId: data.userId,
      recipientId: data.organizationId,
      title: "New Transaction Submission",
      message: `A new ${data.depositType} entry of Rs. ${data.amount}${data.advancedPayment ? ` (Advanced: Rs. ${data.advancedPayment})` : ""} has been logged.`,
      type: "INFO",
      isRead: false
    });

    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard");
    return { success: true, data: JSON.parse(JSON.stringify(newDeposit)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function processDeposits(
  ids: string[], 
  action: "APPROVED" | "REJECTED", 
  adminId: string,
  reason?: string
) {
  try {
    await connectDB();
    
    const deposits = await Deposit.find({ _id: { $in: ids } });
    
    await Deposit.updateMany(
      { _id: { $in: ids } },
      { 
        status: action, 
        verifiedBy: adminId,
        rejectionReason: reason 
      }
    );

    // Notifications
    const notifications = deposits.map(dep => ({
      senderId: adminId,
      recipientId: dep.userId,
      title: action === "APPROVED" ? "Deposit Verified" : "Deposit Rejected",
      message: action === "APPROVED" 
        ? `Your deposit of Rs. ${dep.amount} for ${dep.month} has been approved.`
        : `Your deposit of Rs. ${dep.amount} for ${dep.month} was rejected. Reason: ${reason || "N/A"}`,
      type: action === "APPROVED" ? "SUCCESS" : "WARNING",
      isRead: false
    }));

    // NEW: Sync User Advance Balances for APPROVED deposits
    if (action === "APPROVED") {
      for (const dep of deposits) {
        // Increment balance if they paid Extra (Advanced Payment)
        if (dep.advancedPayment && dep.advancedPayment > 0) {
          await User.findByIdAndUpdate(dep.userId, {
            $inc: { advanceBalance: dep.advancedPayment }
          });
        }
        
        // Decrement balance if they Used Credits
        if (dep.creditUsed && dep.creditUsed > 0) {
          await User.findByIdAndUpdate(dep.userId, {
            $inc: { advanceBalance: -dep.creditUsed }
          });
        }
      }
    }

    await Notification.insertMany(notifications);

    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAdminDepositStats(organizationId: string, targetMonth?: string) {
  noStore();
  try {
    await connectDB();
    
    // Fetch Organization's Static Financials
    console.log(`[DEBUG] Fetching stats for Org: ${organizationId}, TargetMonth: ${targetMonth}`);
    const targetIdObj = new mongoose.Types.ObjectId(String(organizationId));
    const org = await Organization.findById(targetIdObj).select("financials").lean();
    
    const financials = org?.financials || {
      initialMonthlyCollection: 0,
      initialDelayedFine: 0,
      initialServiceCharge: 0,
      initialBankInterest: 0,
      initialLoanInterest: 0,
      initialNav: 0,
      initialMiscellaneous: 0,
      initialAdvancedPayment: 0,
    };
    
    const matchQuery: any = { organizationId: targetIdObj };
    if (targetMonth && targetMonth !== "all") {
      // Create a regex to match either "Month Year" or just "Year" at the end
      matchQuery.month = { $regex: targetMonth, $options: "i" };
    }

    const stats = await Deposit.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTransaction: { $sum: 1 },
          
          // Only Approved portions count towards actual organizational held-assets
          totalApprovedAmount: { 
            $sum: { 
              $cond: [
                { $and: [{ $eq: ["$status", "APPROVED"] }, { $in: ["$depositType", ["MONTHLY", null]] }] }, 
                "$amount", 
                0
              ] 
            } 
          },
          totalServiceChargePaid: {
            $sum: { 
              $cond: [
                { $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "SERVICE_CHARGE"] }] }, 
                "$amount", 
                0
              ] 
            }
          },
          totalLoanInterestPaid: {
            $sum: { 
              $cond: [
                { $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "LOAN_INTEREST"] }] }, 
                "$amount", 
                0
              ] 
            }
          },
          totalDelayedFinePaid: { 
            $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, "$fineApplied", 0] } 
          },

          approvedCount: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
          delayedCount: { $sum: { $cond: [{ $gt: ["$fineApplied", 0] }, 1, 0] } },
          modifiedCount: { 
            $sum: { 
              $cond: [
                { $gt: ["$updatedAt", "$createdAt"] }, 
                1, 0
              ] 
            } 
          },
        }
      }
    ]);

    const agg = stats[0] || {
      totalTransaction: 0,
      totalApprovedAmount: 0,
      totalDelayedFinePaid: 0,
      totalServiceChargePaid: 0,
      totalLoanInterestPaid: 0,
      approvedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
      delayedCount: 0,
      modifiedCount: 0
    };

    const mergeVault = !targetMonth || targetMonth === "all";

    const mergedTotals = {
      totalApprovedAmount: (agg.totalApprovedAmount || 0) + (mergeVault ? (financials.initialMonthlyCollection || 0) : 0),
      totalDelayedFinePaid: (agg.totalDelayedFinePaid || 0) + (mergeVault ? (financials.initialDelayedFine || 0) : 0),
      totalServiceChargePaid: (agg.totalServiceChargePaid || 0) + (mergeVault ? (financials.initialServiceCharge || 0) : 0),
      totalLoanInterestPaid: (agg.totalLoanInterestPaid || 0) + (mergeVault ? (financials.initialLoanInterest || 0) : 0),
      bankInterest: mergeVault ? (financials.initialBankInterest || 0) : 0,
      navCollection: mergeVault ? (financials.initialNav || 0) : 0,
      miscellaneous: mergeVault ? (financials.initialMiscellaneous || 0) : 0,
    };

    const grandTotalCollection = 
      mergedTotals.totalApprovedAmount + 
      mergedTotals.totalDelayedFinePaid + 
      mergedTotals.totalServiceChargePaid +
      mergedTotals.totalLoanInterestPaid +
      mergedTotals.bankInterest + 
      mergedTotals.navCollection +
      mergedTotals.miscellaneous;

    // Fetch Latest Audit for transparency
    const latestAudit = await AdminAudit.findOne({ organizationId: targetIdObj, status: "SUCCESS" })
      .sort({ createdAt: -1 })
      .lean();

    const result = {
      ...agg,
      ...mergedTotals,
      financials,
      grandTotalCollection,
      fetchedAt: new Date().toISOString(),
      latestAudit: latestAudit ? {
        id: latestAudit._id.toString(),
        timestamp: latestAudit.createdAt,
        action: latestAudit.action
      } : null
    };

    console.log(`[DEBUG] Result for ${targetMonth}: Total=${grandTotalCollection}, Base=${financials.initialMonthlyCollection}`);

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


export async function updateOrganizationFinancials(organizationId: string, financials: any, adminId: string = "system") {
  console.log(`[DEBUG] RPC_INVOKE: Org=${organizationId}, Admin=${adminId}`);
  
  if (!organizationId || organizationId === "undefined" || organizationId === "null") {
    console.error("[ERROR] RPC_ABORT: Missing or invalid Organization ID");
    return { success: false, error: "ERR_ID_MISSING", details: "Your session may have expired. Please refresh the page." };
  }

  try {
    await connectDB();
    
    // Create INITIAL Audit Log (CRITICAL: Do this BEFORE looking up the Org to see if the ID even reaches the DB)
    let audit;
    try {
      audit = await AdminAudit.create({
        adminId,
        organizationId,
        action: "UPDATE_FINANCIALS_TRY",
        newValues: financials,
        status: "PENDING"
      });
    } catch (auditErr: any) {
      console.error("[ERROR] AUDIT_CREATE_FAIL:", auditErr.message);
    }
    
    const org = await Organization.findById(new mongoose.Types.ObjectId(String(organizationId)));
    
    if (!org) {
      console.error(`[ERROR] RPC_ABORT: Org ${organizationId} not found in DB.`);
      if (audit) await AdminAudit.findByIdAndUpdate(audit._id, { status: "FAILED", action: "ORG_NOT_FOUND" });
      return { success: false, error: "ERR_ORG_NOT_FOUND" };
    }

    // Explicit Type Conversion
    org.financials = {
      initialMonthlyCollection: Number(financials.initialMonthlyCollection) || 0,
      initialDelayedFine: Number(financials.initialDelayedFine) || 0,
      initialServiceCharge: Number(financials.initialServiceCharge) || 0,
      initialBankInterest: Number(financials.initialBankInterest) || 0,
      initialLoanInterest: Number(financials.initialLoanInterest) || 0,
      initialNav: Number(financials.initialNav) || 0,
      initialMiscellaneous: Number(financials.initialMiscellaneous) || 0,
    };

    org.markModified('financials');
    await org.save();
    
    if (audit) {
      audit.status = "SUCCESS";
      audit.action = "UPDATE_FINANCIALS_SUCCESS";
      await audit.save();
    }

    console.log(`[DEBUG] RPC_SUCCESS: Org ${organizationId} baseline updated.`);
    
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/external-funds", "layout");
    
    return { success: true, auditId: audit?._id.toString() };
  } catch (error: any) {
    console.error(`[ERROR] RPC_EXCEPTION:`, error);
    return { success: false, error: "ERR_SERVER_EXCEPTION", details: error.message };
  }
}
