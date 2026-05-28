"use server";

import mongoose from "mongoose";

import connectDB from "@/lib/db";
import Deposit from "@/lib/models/Deposit";
import Aggregation from "@/lib/models/Aggregation";
import User from "@/lib/models/User";
import Notification from "@/lib/models/Notification";
import Organization from "@/lib/models/Organization";
import AdminAudit from "@/lib/models/AdminAudit";
import BankLedger from "@/lib/models/BankLedger";
import Loan from "@/lib/models/Loan";
import { parseNepaliMonth, getDaysInMonth, bsToAd, NEPALI_MONTHS, adToBs } from "@/lib/utils/nepali-date";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { reconcileMonthlyTotals } from "@/lib/actions/bank-ledger";

export async function getDeposits(params: {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  month?: string;
  depositTypes?: string[];
}) {
  try {
    await connectDB();
    noStore();
    const { organizationId, page = 1, limit = 10, search, fromDate, toDate, status, month, depositTypes } = params;

    if (status === "NOT_DEPOSITED") {
      // 1. Get all active general members
      const userQuery: any = {
        organizationId,
        role: "USER",
        isActive: true,
      };

      if (search) {
        userQuery.name = { $regex: search, $options: "i" };
      }

      const activeUsers = await User.find(userQuery).select(
        "name email profileImage nickname accountNumber phoneNumber committeeRole isActive role advanceBalance dateOfBirth gender address"
      );

      // 2. Parse target month, fallback if all/empty
      let targetMonth = month;
      if (!targetMonth || targetMonth === "all") {
        const currentNepali = adToBs(new Date());
        targetMonth = `${NEPALI_MONTHS[currentNepali.month - 1]} ${currentNepali.year}`;
      }

      // 3. Find monthly deposits that are APPROVED or PENDING
      const depositedRecords = await Deposit.find({
        organizationId,
        depositType: "MONTHLY",
        month: { $regex: targetMonth, $options: "i" },
        status: { $in: ["APPROVED", "PENDING"] }
      }).select("userId");

      const depositedUserIds = new Set(depositedRecords.map(d => d.userId.toString()));

      // 4. Filter users who have NOT deposited
      const notDepositedUsers = activeUsers.filter(u => !depositedUserIds.has(u._id.toString()));

      // 5. Get organization default monthly saving amount
      const org = await Organization.findById(organizationId).select("config.monthlyDepositAmount");
      const defaultAmount = org?.config?.monthlyDepositAmount || 1000;

      // 6. Check for existing REJECTED records or generate virtual ones
      const virtualDeposits = [];
      for (const user of notDepositedUsers) {
        const rejectedDeposit = await Deposit.findOne({
          organizationId,
          userId: user._id,
          depositType: "MONTHLY",
          month: { $regex: targetMonth, $options: "i" },
          status: "REJECTED"
        }).populate("userId", "name email profileImage nickname accountNumber phoneNumber committeeRole isActive role advanceBalance dateOfBirth gender address");

        if (rejectedDeposit) {
          virtualDeposits.push(rejectedDeposit);
        } else {
          virtualDeposits.push({
            _id: `virtual-${user._id}-${targetMonth.replace(/\s+/g, "-")}`,
            userId: user,
            organizationId,
            depositType: "MONTHLY",
            amount: defaultAmount,
            advancedPayment: 0,
            creditUsed: 0,
            month: targetMonth,
            depositDate: new Date(),
            proof: "",
            status: "REJECTED",
            fineApplied: 0,
            remarks: "Not Deposited (Unpaid)",
            isVirtual: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }

      // Sort alphabetically by user name
      virtualDeposits.sort((a: any, b: any) => {
        const nameA = a.userId?.name || "";
        const nameB = b.userId?.name || "";
        return nameA.localeCompare(nameB);
      });

      // 7. Paginate the virtual results
      const total = virtualDeposits.length;
      const skip = (page - 1) * limit;
      const paginatedData = virtualDeposits.slice(skip, skip + limit);

      return {
        success: true,
        data: JSON.parse(JSON.stringify(paginatedData)),
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          currentPage: page
        }
      };
    }

    const query: any = { organizationId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (month && month !== "all") {
      query.month = { $regex: month, $options: "i" };
    }

    if (depositTypes && depositTypes.length > 0) {
      query.depositType = { $in: depositTypes };
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
        .populate("userId", "name email profileImage nickname accountNumber phoneNumber committeeRole isActive role advanceBalance dateOfBirth gender address")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Deposit.countDocuments(query)
    ]);

    console.log(`[DEBUG] getDeposits: Found ${deposits.length} records. First record remarks: ${deposits[0]?.remarks}`);
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
    const existing = await Deposit.findById(id);
    if (!existing) throw new Error("Deposit not found");

    // If already approved, reverse previous balance changes before resetting to pending
    if (existing.status === "APPROVED") {
      if (existing.advancedPayment && existing.advancedPayment > 0) {
        await User.findByIdAndUpdate(existing.userId, {
          $inc: { advanceBalance: -existing.advancedPayment }
        });
      }
      if (existing.creditUsed && existing.creditUsed > 0) {
        await User.findByIdAndUpdate(existing.userId, {
          $inc: { advanceBalance: existing.creditUsed }
        });
      }
    }

    await Deposit.findByIdAndUpdate(id, {
      ...data,
      status: ["NAV", "MISCELLANEOUS"].includes(data.depositType) ? (data.status || "APPROVED") : "PENDING",
      isModified: true
    });

    const updated = await Deposit.findById(id);
    if (updated && (existing.status === "APPROVED" || updated.status === "APPROVED")) {
      const monthsToReconcile = new Set<string>([existing.month]);
      if (updated.month) monthsToReconcile.add(updated.month);
      for (const m of monthsToReconcile) {
        await reconcileMonthlyTotals(existing.organizationId.toString(), m).catch(console.error);
      }
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard", "layout");
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
  depositType: "MONTHLY" | "SERVICE_CHARGE" | "LOAN_INTEREST" | "ADVANCE" | "NAV" | "MISCELLANEOUS";
  depositDate: string;
  proof: string;
  creditUsed?: number;
  remarks?: string;
  status?: string;
}) {
  try {
    await connectDB();

    const org = await Organization.findById(data.organizationId);
    if (!org) throw new Error("Organization not found");

    let fineApplied = 0;
    let finalAdvancedPayment = data.advancedPayment || 0;
    let finalAmount = data.amount;

    if (data.depositType === "MONTHLY") {
      const { monthlyDepositAmount, lateFee } = org.config;

      // 1. Calculate Late Fine
      const target = parseNepaliMonth(data.month);
      const daysInMonth = getDaysInMonth(target.year, target.month);
      const lastDayAd = bsToAd(target.year, target.month, daysInMonth);

      const paymentDate = new Date(data.depositDate);
      // Set time to end of day for fair comparison
      lastDayAd.setHours(23, 59, 59, 999);

      if (paymentDate > lastDayAd) {
        fineApplied = lateFee;
      }

      const requiredAmount = monthlyDepositAmount + fineApplied;
      const totalProvided = data.amount + (data.creditUsed || 0);

      if (totalProvided < requiredAmount) {
        if (data.amount <= 0 && (data.creditUsed || 0) <= 0) {
          throw new Error(`Insufficient amount. Monthly deposit for ${data.month} requires Rs. ${requiredAmount}${fineApplied > 0 ? ` (including Rs. ${fineApplied} late fine)` : ""}.`);
        }
        // Convert to ADVANCE funding because it's insufficient for a monthly deposit
        data.depositType = "ADVANCE";
        finalAmount = data.amount;
        finalAdvancedPayment = data.amount; // The cash paid goes to advance pool
        data.creditUsed = 0; // Credit isn't consumed if the monthly deposit fails
        data.remarks = `Insufficient for monthly deposit. Rs. ${data.amount} added to advance pool.`;
      } else {
        // Valid or Surplus Payment
        // The 'amount' field should ONLY store the principal deposit (monthlyDepositAmount)
        // The 'fineApplied' field stores the penalty.
        finalAmount = monthlyDepositAmount;
        finalAdvancedPayment = totalProvided - requiredAmount;

        // Generate automatic remarks for credit usage
        const creditPart = data.creditUsed && data.creditUsed > 0 ? `${data.creditUsed} credit used` : "";
        const cashPart = data.amount > 0 ? `${data.amount} paid` : "";
        const autoRemarks = [creditPart, cashPart].filter(Boolean).join(", ");

        if (autoRemarks) {
          data.remarks = data.remarks ? `${data.remarks} (${autoRemarks})` : autoRemarks;
        }
      }
    }

    console.log(`[DEBUG] createDeposit: Incoming remarks="${data.remarks}"`);
    const newDeposit = await Deposit.create({
      userId: data.userId,
      organizationId: data.organizationId,
      amount: finalAmount,
      advancedPayment: finalAdvancedPayment,
      month: data.month,
      depositDate: data.depositDate,
      depositType: data.depositType,
      proof: data.proof,
      remarks: data.remarks,
      fineApplied,
      creditUsed: data.creditUsed || 0,
      status: data.status || "PENDING",
    });
    console.log(`[DEBUG] createDeposit: Saved deposit ID=${newDeposit._id}, remarks="${newDeposit.remarks}"`);

    // Create notification for admin
    await Notification.create({
      senderId: data.userId,
      recipientId: data.organizationId,
      relatedId: newDeposit._id,
      title: "New Transaction Submission",
      message: `A new ${data.depositType} entry of Rs. ${data.amount} for ${data.month} has been logged. ${fineApplied > 0 ? `(Fine Applied: Rs. ${fineApplied})` : ""}`,
      type: "INFO",
      isRead: false
    });

    if (newDeposit.status === "APPROVED") {
      await reconcileMonthlyTotals(data.organizationId, data.month).catch(console.error);
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard", "layout");
    return { success: true, data: JSON.parse(JSON.stringify(newDeposit)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMultipleDeposits(payloads: Array<{
  userId: string;
  organizationId: string;
  amount: number;
  advancedPayment?: number;
  month: string;
  depositType: "MONTHLY" | "SERVICE_CHARGE" | "LOAN_INTEREST" | "ADVANCE" | "NAV" | "MISCELLANEOUS";
  depositDate: string;
  proof: string;
  creditUsed?: number;
  remarks?: string;
}>) {
  try {
    if (!payloads || payloads.length === 0) return { success: true, count: 0 };
    await connectDB();

    let successCount = 0;
    const errors: any[] = [];
    const approvedMonths = new Set<string>();

    // We process sequentially to ensure proper calculations and avoid race conditions,
    // especially with the organization config and user states if they overlap.
    for (const data of payloads) {
      try {
        const org = await Organization.findById(data.organizationId);
        if (!org) throw new Error("Organization not found");

        let fineApplied = 0;
        let finalAdvancedPayment = data.advancedPayment || 0;
        let finalAmount = data.amount;

        if (data.depositType === "MONTHLY") {
          const { monthlyDepositAmount, lateFee } = org.config;
          const target = parseNepaliMonth(data.month);
          const daysInMonth = getDaysInMonth(target.year, target.month);
          const lastDayAd = bsToAd(target.year, target.month, daysInMonth);

          const paymentDate = new Date(data.depositDate);
          lastDayAd.setHours(23, 59, 59, 999);

          if (paymentDate > lastDayAd) {
            fineApplied = lateFee;
          }

          const requiredAmount = monthlyDepositAmount + fineApplied;
          const totalProvided = data.amount + (data.creditUsed || 0);

          if (totalProvided < requiredAmount) {
            if (data.amount <= 0) {
              throw new Error(`Insufficient amount. Monthly deposit for ${data.month} requires Rs. ${requiredAmount}${fineApplied > 0 ? ` (including Rs. ${fineApplied} late fine)` : ""}.`);
            }
            // Insufficient - treat as advance
            finalAmount = data.amount;
            finalAdvancedPayment = data.amount;
            data.depositType = "ADVANCE";
            data.creditUsed = 0;
            data.remarks = `Insufficient for monthly. Rs. ${data.amount} as advance.`;
          } else {
            // Successful - Separate principal from fine
            finalAmount = monthlyDepositAmount;
            finalAdvancedPayment = totalProvided - requiredAmount;

            const creditPart = data.creditUsed && data.creditUsed > 0 ? `${data.creditUsed} credit used` : "";
            const cashPart = data.amount > 0 ? `${data.amount} paid` : "";
            const autoRemarks = [creditPart, cashPart].filter(Boolean).join(", ");

            if (autoRemarks) {
              data.remarks = data.remarks ? `${data.remarks} (${autoRemarks})` : autoRemarks;
            }
          }
        }

        const newDeposit = await Deposit.create({
          userId: data.userId,
          organizationId: data.organizationId,
          amount: finalAmount,
          advancedPayment: finalAdvancedPayment,
          month: data.month,
          depositDate: data.depositDate,
          depositType: data.depositType,
          proof: data.proof,
          remarks: data.remarks,
          fineApplied,
          creditUsed: data.creditUsed || 0,
        });

        if (newDeposit.status === "APPROVED") {
          approvedMonths.add(data.month);
        }

        await Notification.create({
          senderId: data.userId,
          recipientId: data.organizationId,
          title: "New Transaction Submission",
          message: `A new ${data.depositType} entry of Rs. ${data.amount} for ${data.month} has been logged. ${fineApplied > 0 ? `(Fine Applied: Rs. ${fineApplied})` : ""}`,
          type: "INFO",
          isRead: false
        });

        successCount++;
      } catch (err: any) {
        errors.push({ userId: data.userId, error: err.message });
      }
    }

    if (payloads.length > 0 && approvedMonths.size > 0) {
      for (const m of approvedMonths) {
        await reconcileMonthlyTotals(payloads[0].organizationId, m).catch(console.error);
      }
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard", "layout");
    return { success: true, count: successCount, errors };
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

    // NEW: Sync User Advance Balances
    for (const dep of deposits) {
      if (action === "APPROVED" && dep.status !== "APPROVED") {
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
      } else if (action === "REJECTED" && dep.status === "APPROVED") {
        // REVERSE previously approved balances
        if (dep.advancedPayment && dep.advancedPayment > 0) {
          await User.findByIdAndUpdate(dep.userId, {
            $inc: { advanceBalance: -dep.advancedPayment }
          });
        }
        if (dep.creditUsed && dep.creditUsed > 0) {
          await User.findByIdAndUpdate(dep.userId, {
            $inc: { advanceBalance: dep.creditUsed }
          });
        }
      }
    }

    await Notification.insertMany(notifications);

    const monthsToReconcile = new Set<string>();
    for (const dep of deposits) {
      monthsToReconcile.add(dep.month);
    }
    if (deposits.length > 0) {
      for (const m of monthsToReconcile) {
        await reconcileMonthlyTotals(deposits[0].organizationId.toString(), m).catch(console.error);
      }
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard", "layout");
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
    const org = await Organization.findById(targetIdObj).select("financials config bankDetails name").lean();
    const bankDetails = org?.bankDetails || { accountNo: "N/A", accountName: "N/A", bankName: "N/A" };

    const financials = org?.financials || {
      initialMonthlyCollection: 0,
      initialDelayedFine: 0,
      initialServiceCharge: 0,
      initialBankInterest: 0,
      initialLoanInterest: 0,
      initialNav: 0,
      initialMiscellaneous: 0,
      initialAdvancedPayment: 0,
      initialBankCharges: 0,
      initialExpenditure: 0,
    };

    const matchQuery: any = { organizationId: targetIdObj };
    let loanMatchQuery: any = { organizationId: targetIdObj };
    let uptoMatchQuery: any = { organizationId: targetIdObj };
    let loanUptoMatchQuery: any = { organizationId: targetIdObj };
    let prevUptoMatchQuery: any = { organizationId: targetIdObj };
    let loanPrevUptoMatchQuery: any = { organizationId: targetIdObj };
    let startAd: Date | null = null;
    let endAd: Date | null = null;
    const isAllTime = !targetMonth || targetMonth === "all";

    if (!isAllTime) {
      matchQuery.month = { $regex: targetMonth, $options: "i" };

      try {
        const parts = targetMonth.split(" ");
        if (parts.length === 2) {
          const monthName = parts[0];
          const year = parseInt(parts[1]);
          const monthIdx = NEPALI_MONTHS.indexOf(monthName) + 1;

          if (monthIdx > 0 && !isNaN(year)) {
            const daysInMonth = getDaysInMonth(year, monthIdx);
            startAd = bsToAd(year, monthIdx, 1);
            endAd = bsToAd(year, monthIdx, daysInMonth);

            startAd.setHours(0, 0, 0, 0);
            endAd.setHours(23, 59, 59, 999);

            loanMatchQuery = {
              organizationId: targetIdObj,
              "payments.date": { $gte: startAd, $lte: endAd }
            };

            loanUptoMatchQuery = {
              organizationId: targetIdObj,
              "payments.date": { $lte: endAd }
            };

            // Calculate 'PrevUpto' boundaries (End of previous month)
            const prevAd = new Date(startAd.getTime() - 1);
            loanPrevUptoMatchQuery = {
              organizationId: targetIdObj,
              "payments.date": { $lte: prevAd }
            };

            const monthList: string[] = [];
            const prevMonthList: string[] = [];
            let currentY = org?.financials?.initialOpeningYear || 2080;
            let currentMIdx = NEPALI_MONTHS.indexOf(org?.financials?.initialOpeningMonth || "Baisakh");

            if (currentMIdx === -1) currentMIdx = 0;

            const targetY = year;
            const targetMIdx = NEPALI_MONTHS.indexOf(monthName);

            let loopY = currentY;
            let loopM = currentMIdx;

            while (loopY < targetY || (loopY === targetY && loopM <= targetMIdx)) {
              const mStr = `${NEPALI_MONTHS[loopM]} ${loopY}`;
              monthList.push(mStr);
              if (!(loopY === targetY && loopM === targetMIdx)) {
                prevMonthList.push(mStr);
              }

              loopM++;
              if (loopM > 11) {
                loopM = 0;
                loopY++;
              }
              if (monthList.length > 240) break;
            }

            uptoMatchQuery.month = { $in: monthList };
            prevUptoMatchQuery.month = { $in: prevMonthList };
          }
        }
      } catch (err) {
        console.error("[ERROR] Failed to calculate AD range:", err);
      }
    }

    // Parallel aggregation for both Deposit (member) and Aggregation (institutional) tables
    const results = await Promise.all([
      // 1. Monthly Stats (Selected Month Only)
      Deposit.aggregate([
        { $match: matchQuery },
        {
          $facet: {
            allRecords: [{ $limit: 100 }],
            totals: [
              {
                $group: {
                  _id: null,
                  totalTransaction: { $sum: 1 },
                  totalApprovedAmount: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $in: ["$depositType", ["MONTHLY", null]] }] }, "$amount", 0] } },
                  totalServiceChargePaid: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "SERVICE_CHARGE"] }] }, "$amount", 0] } },
                  totalLoanInterestPaid: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "LOAN_INTEREST"] }] }, "$amount", 0] } },
                  totalDelayedFinePaid: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, "$fineApplied", 0] } },
                  totalAdvancedPayment: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, { $subtract: ["$advancedPayment", "$creditUsed"] }, 0] } },
                  totalLegacyNav: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "NAV"] }] }, "$amount", 0] } },
                  totalLegacyMisc: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "MISCELLANEOUS"] }] }, "$amount", 0] } },
                  approvedCount: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] } },
                  rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] } },
                  pendingCount: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
                  delayedCount: { $sum: { $cond: [{ $gt: ["$fineApplied", 0] }, 1, 0] } },
                  modifiedCount: { $sum: { $cond: [{ $gt: ["$updatedAt", "$createdAt"] }, 1, 0] } },
                }
              }
            ]
          }
        }
      ]),
      Aggregation.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalNav: { $sum: { $cond: [{ $eq: ["$type", "NAV"] }, "$amount", 0] } },
            totalMisc: { $sum: { $cond: [{ $eq: ["$type", "MISCELLANEOUS"] }, "$amount", 0] } },
            totalAdvance: { $sum: { $cond: [{ $eq: ["$type", "ADVANCE"] }, "$amount", 0] } }
          }
        }
      ]),
      BankLedger.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalExpenditure: { $sum: "$totalExpenditure" },
            totalBankCharges: { $sum: "$bankCharges" },
            totalLoanDisbursed: { $sum: "$totalLoanDisbursed" },
            totalLoanRepaid: { $sum: "$totalLoanRepaid" },
            totalBankInterest: { $sum: "$bankInterest" }
          }
        }
      ]),
      Loan.aggregate([
        { $match: { organizationId: targetIdObj } },
        { $unwind: "$payments" },
        { $match: isAllTime ? {} : { "payments.date": loanMatchQuery["payments.date"] } },
        {
          $group: {
            _id: null,
            interest: { $sum: { $cond: [{ $eq: ["$payments.type", "INTEREST"] }, "$payments.amount", 0] } },
            penalty: { $sum: { $cond: [{ $eq: ["$payments.type", "PENALTY"] }, "$payments.amount", 0] } },
            renewal: { $sum: { $cond: [{ $eq: ["$payments.type", "RENEWAL"] }, "$payments.amount", 0] } },
            service: { $sum: { $cond: [{ $eq: ["$payments.type", "SERVICE_CHARGE"] }, "$payments.amount", 0] } },
            principal: { $sum: { $cond: [{ $eq: ["$payments.type", "PRINCIPAL"] }, "$payments.amount", 0] } },
            advance: { $sum: { $cond: [{ $eq: ["$payments.type", "ADVANCE"] }, "$payments.amount", 0] } },
          }
        }
      ]),
      // 2. Cumulative 'Upto' Stats (Start until Selected Month)
      Deposit.aggregate([
        { $match: isAllTime ? matchQuery : uptoMatchQuery },
        {
          $group: {
            _id: null,
            totalApprovedAmount: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $in: ["$depositType", ["MONTHLY", null]] }] }, "$amount", 0] } },
            totalDelayedFinePaid: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, "$fineApplied", 0] } },
            totalServiceChargePaid: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "SERVICE_CHARGE"] }] }, "$amount", 0] } },
            totalLoanInterestPaid: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "LOAN_INTEREST"] }] }, "$amount", 0] } },
            totalAdvancedPayment: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, { $subtract: ["$advancedPayment", "$creditUsed"] }, 0] } },
            totalLegacyNav: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "NAV"] }] }, "$amount", 0] } },
            totalLegacyMisc: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "MISCELLANEOUS"] }] }, "$amount", 0] } },
          }
        }
      ]),
      Aggregation.aggregate([
        { $match: isAllTime ? matchQuery : uptoMatchQuery },
        {
          $group: {
            _id: null,
            totalNav: { $sum: { $cond: [{ $eq: ["$type", "NAV"] }, "$amount", 0] } },
            totalMisc: { $sum: { $cond: [{ $eq: ["$type", "MISCELLANEOUS"] }, "$amount", 0] } },
            totalAdvance: { $sum: { $cond: [{ $eq: ["$type", "ADVANCE"] }, "$amount", 0] } }
          }
        }
      ]),
      BankLedger.aggregate([
        { $match: isAllTime ? matchQuery : uptoMatchQuery },
        {
          $group: {
            _id: null,
            totalExpenditure: { $sum: "$totalExpenditure" },
            totalBankCharges: { $sum: "$bankCharges" },
            totalLoanDisbursed: { $sum: "$totalLoanDisbursed" },
            totalLoanRepaid: { $sum: "$totalLoanRepaid" },
            totalBankInterest: { $sum: "$bankInterest" }
          }
        }
      ]),
      Loan.aggregate([
        { $match: { organizationId: targetIdObj } },
        { $unwind: "$payments" },
        { $match: isAllTime ? {} : { "payments.date": loanUptoMatchQuery["payments.date"] } },
        {
          $group: {
            _id: null,
            interest: { $sum: { $cond: [{ $eq: ["$payments.type", "INTEREST"] }, "$payments.amount", 0] } },
            penalty: { $sum: { $cond: [{ $eq: ["$payments.type", "PENALTY"] }, "$payments.amount", 0] } },
            renewal: { $sum: { $cond: [{ $eq: ["$payments.type", "RENEWAL"] }, "$payments.amount", 0] } },
            service: { $sum: { $cond: [{ $eq: ["$payments.type", "SERVICE_CHARGE"] }, "$payments.amount", 0] } },
            principal: { $sum: { $cond: [{ $eq: ["$payments.type", "PRINCIPAL"] }, "$payments.amount", 0] } },
            advance: { $sum: { $cond: [{ $eq: ["$payments.type", "ADVANCE"] }, "$payments.amount", 0] } },
          }
        }
      ]),
      // 3. PrevUpto Stats (Cumulative up to month-1)
      Deposit.aggregate([
        { $match: isAllTime ? matchQuery : prevUptoMatchQuery },
        {
          $group: {
            _id: null,
            totalApprovedAmount: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $in: ["$depositType", ["MONTHLY", null]] }] }, "$amount", 0] } },
            totalDelayedFinePaid: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, "$fineApplied", 0] } },
            totalServiceChargePaid: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "SERVICE_CHARGE"] }] }, "$amount", 0] } },
            totalLoanInterestPaid: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "LOAN_INTEREST"] }] }, "$amount", 0] } },
            totalAdvancedPayment: { $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, { $subtract: ["$advancedPayment", "$creditUsed"] }, 0] } },
            totalLegacyNav: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "NAV"] }] }, "$amount", 0] } },
            totalLegacyMisc: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "APPROVED"] }, { $eq: ["$depositType", "MISCELLANEOUS"] }] }, "$amount", 0] } },
          }
        }
      ]),
      Aggregation.aggregate([
        { $match: isAllTime ? matchQuery : prevUptoMatchQuery },
        {
          $group: {
            _id: null,
            totalNav: { $sum: { $cond: [{ $eq: ["$type", "NAV"] }, "$amount", 0] } },
            totalMisc: { $sum: { $cond: [{ $eq: ["$type", "MISCELLANEOUS"] }, "$amount", 0] } },
            totalAdvance: { $sum: { $cond: [{ $eq: ["$type", "ADVANCE"] }, "$amount", 0] } }
          }
        }
      ]),
      BankLedger.aggregate([
        { $match: isAllTime ? matchQuery : prevUptoMatchQuery },
        {
          $group: {
            _id: null,
            totalBankInterest: { $sum: "$bankInterest" }
          }
        }
      ]),
      Loan.aggregate([
        { $match: { organizationId: targetIdObj } },
        { $unwind: "$payments" },
        { $match: isAllTime ? {} : { "payments.date": loanPrevUptoMatchQuery["payments.date"] } },
        {
          $group: {
            _id: null,
            interest: { $sum: { $cond: [{ $eq: ["$payments.type", "INTEREST"] }, "$payments.amount", 0] } },
            penalty: { $sum: { $cond: [{ $eq: ["$payments.type", "PENALTY"] }, "$payments.amount", 0] } },
            renewal: { $sum: { $cond: [{ $eq: ["$payments.type", "RENEWAL"] }, "$payments.amount", 0] } },
            service: { $sum: { $cond: [{ $eq: ["$payments.type", "SERVICE_CHARGE"] }, "$payments.amount", 0] } },
            principal: { $sum: { $cond: [{ $eq: ["$payments.type", "PRINCIPAL"] }, "$payments.amount", 0] } },
            advance: { $sum: { $cond: [{ $eq: ["$payments.type", "ADVANCE"] }, "$payments.amount", 0] } },
          }
        }
      ]),
      // 5. Detailed Advance Inflow Logs (Selected Month)
      Deposit.find({ ...matchQuery, advancedPayment: { $gt: 0 } })
        .populate("userId", "name accountNumber profileImage")
        .sort({ depositDate: -1 })
        .lean(),
      Loan.find({
        organizationId: targetIdObj,
        "payments.type": "ADVANCE",
        ...(isAllTime ? {} : { "payments.date": loanMatchQuery["payments.date"] })
      })
        .populate("userId", "name accountNumber profileImage")
        .lean(),
      Aggregation.find({ ...matchQuery, type: "ADVANCE" })
        .populate("memberId", "name accountNumber profileImage")
        .sort({ date: -1 })
        .lean(),
      Deposit.find({ ...matchQuery, creditUsed: { $gt: 0 } })
        .populate("userId", "name accountNumber profileImage")
        .sort({ depositDate: -1 })
        .lean(),
      User.find({ organizationId: targetIdObj, advanceBalance: { $gt: 0 } })
        .select("name accountNumber advanceBalance profileImage")
        .lean()
    ]);

    const [stats, aggStats, bankLedgerStats, loanStats, uptoDepStats, uptoAggStats, uptoBankStats, uptoLoanStats, prevDepStats, prevAggStats, prevBankStats, prevLoanStats, depAdvanceLogs, loanAdvanceLogs, aggAdvanceLogs, usageLogs, outstandingUsers] = results;

    const facet = stats[0] || { totals: [], allRecords: [] };
    const baseAgg = facet.totals[0] || {
      totalTransaction: 0,
      totalApprovedAmount: 0,
      totalDelayedFinePaid: 0,
      totalServiceChargePaid: 0,
      totalLoanInterestPaid: 0,
      totalLegacyNav: 0,
      totalLegacyMisc: 0,
      approvedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
      delayedCount: 0,
      modifiedCount: 0
    };

    const uptoBaseAgg = uptoDepStats[0] || {
      totalApprovedAmount: 0,
      totalDelayedFinePaid: 0,
      totalServiceChargePaid: 0,
      totalLoanInterestPaid: 0,
      totalAdvancedPayment: 0,
      totalLegacyNav: 0,
      totalLegacyMisc: 0,
    };

    const instAgg = aggStats[0] || { totalNav: 0, totalMisc: 0, totalAdvance: 0 };
    const uptoInstAgg = uptoAggStats[0] || { totalNav: 0, totalMisc: 0, totalAdvance: 0 };
    const bankAgg = bankLedgerStats[0] || { totalExpenditure: 0, totalBankCharges: 0, totalLoanDisbursed: 0, totalLoanRepaid: 0, totalBankInterest: 0 };
    const uptoBankAgg = uptoBankStats[0] || { totalBankInterest: 0 };
    const loanAgg = loanStats[0] || { interest: 0, penalty: 0, renewal: 0, service: 0, principal: 0, advance: 0 };
    const uptoLoanAgg = uptoLoanStats[0] || { interest: 0, penalty: 0, renewal: 0, service: 0, principal: 0, advance: 0 };

    const prevBaseAgg = prevDepStats[0] || {
      totalApprovedAmount: 0,
      totalDelayedFinePaid: 0,
      totalServiceChargePaid: 0,
      totalLoanInterestPaid: 0,
      totalAdvancedPayment: 0,
      totalLegacyNav: 0,
      totalLegacyMisc: 0,
    };
    const prevInstAgg = prevAggStats[0] || { totalNav: 0, totalMisc: 0, totalAdvance: 0 };
    const prevBankAgg = prevBankStats[0] || { totalBankInterest: 0 };
    const prevLoanAgg = prevLoanStats[0] || { interest: 0, penalty: 0, renewal: 0, service: 0, principal: 0, advance: 0 };

    // Combine legacy and new aggregation data
    const agg = {
      ...baseAgg,
      totalNavCollection: (baseAgg.totalLegacyNav || 0) + instAgg.totalNav,
      totalMiscRevenue: (baseAgg.totalLegacyMisc || 0) + instAgg.totalMisc
    };

    if (facet.allRecords.length > 0) {
      console.log(`[DEBUG] Found ${facet.allRecords.length} records. Types:`, facet.allRecords.map((r: any) => r.depositType));
    }

    console.log(`[DEBUG] Aggregation result for ${targetMonth}:`, JSON.stringify(agg));

    const mergeVault = !targetMonth || targetMonth === "all";

    const baselineMonthStr = org?.financials ? `${org.financials.initialOpeningMonth} ${org.financials.initialOpeningYear}` : "";
    const hasBaselineLedger = !!(await BankLedger.exists({ organizationId: targetIdObj, month: baselineMonthStr }));

    const initialBankCharges = Number(financials.initialBankCharges) || 0;
    const initialExpenditure = Number(financials.initialExpenditure) || 0;

    const shouldAddInitialsToCurrent = !hasBaselineLedger && (isAllTime || targetMonth === baselineMonthStr);

    const mergedTotals = {
      totalApprovedAmount: (agg.totalApprovedAmount || 0) + (mergeVault ? (financials.initialMonthlyCollection || 0) : 0),
      totalDelayedFinePaid: (agg.totalDelayedFinePaid || 0) + (loanAgg.penalty || 0) + (mergeVault ? (financials.initialDelayedFine || 0) : 0),
      totalServiceChargePaid: (agg.totalServiceChargePaid || 0) + (loanAgg.service || 0) + (loanAgg.renewal || 0) + (mergeVault ? (financials.initialServiceCharge || 0) : 0),
      totalLoanInterestPaid: (agg.totalLoanInterestPaid || 0) + (loanAgg.interest || 0) + (mergeVault ? (financials.initialLoanInterest || 0) : 0),
      totalAdvancedPayment: (agg.totalAdvancedPayment || 0) + (loanAgg.advance || 0) + (mergeVault ? (financials.initialAdvancedPayment || 0) : 0),
      totalCreditUsed: (agg.totalCreditUsed || 0),
      bankInterest: (bankAgg.totalBankInterest || 0) + (mergeVault ? (financials.initialBankInterest || 0) : 0),
      navCollection: (agg.totalNavCollection || 0) + (mergeVault ? (financials.initialNav || 0) : 0),
      miscellaneous: (agg.totalMiscRevenue || 0) + (mergeVault ? (financials.initialMiscellaneous || 0) : 0),
      totalExpenditure: (bankAgg.totalExpenditure || 0) + (shouldAddInitialsToCurrent ? initialExpenditure : 0),
      bankCharges: (bankAgg.totalBankCharges || 0) + (shouldAddInitialsToCurrent ? initialBankCharges : 0),
      totalLoanDisbursed: (bankAgg.totalLoanDisbursed || 0),
      totalLoanRepaid: (loanAgg.principal || 0), // Use only the principal portion for this specific row
      // Upto Stats (Cumulative up to Target Month - includes everything)
      upto: {
        totalApprovedAmount: (uptoBaseAgg.totalApprovedAmount || 0) + (financials.initialMonthlyCollection || 0),
        totalDelayedFinePaid: (uptoBaseAgg.totalDelayedFinePaid || 0) + (uptoLoanAgg.penalty || 0) + (financials.initialDelayedFine || 0),
        totalServiceChargePaid: (uptoBaseAgg.totalServiceChargePaid || 0) + (uptoLoanAgg.service || 0) + (uptoLoanAgg.renewal || 0) + (financials.initialServiceCharge || 0),
        totalLoanInterestPaid: (uptoBaseAgg.totalLoanInterestPaid || 0) + (uptoLoanAgg.interest || 0) + (financials.initialLoanInterest || 0),
        totalAdvancedPayment: (uptoBaseAgg.totalAdvancedPayment || 0) + (uptoLoanAgg.advance || 0) + (financials.initialAdvancedPayment || 0),
        bankInterest: (uptoBankAgg.totalBankInterest || 0) + (financials.initialBankInterest || 0),
        navCollection: (uptoBaseAgg.totalLegacyNav || 0) + (uptoInstAgg.totalNav || 0) + (financials.initialNav || 0),
        miscellaneous: (uptoBaseAgg.totalLegacyMisc || 0) + (uptoInstAgg.totalMisc || 0) + (financials.initialMiscellaneous || 0),
        totalLoanRepaid: (uptoLoanAgg.principal || 0),
        grandTotalCollection: (
          ((uptoBaseAgg.totalApprovedAmount || 0) + (financials.initialMonthlyCollection || 0)) +
          ((uptoBaseAgg.totalDelayedFinePaid || 0) + (uptoLoanAgg.penalty || 0) + (financials.initialDelayedFine || 0)) +
          ((uptoBaseAgg.totalServiceChargePaid || 0) + (uptoLoanAgg.service || 0) + (uptoLoanAgg.renewal || 0) + (financials.initialServiceCharge || 0)) +
          ((uptoBaseAgg.totalLoanInterestPaid || 0) + (uptoLoanAgg.interest || 0) + (financials.initialLoanInterest || 0)) +
          ((uptoBankAgg.totalBankInterest || 0) + (financials.initialBankInterest || 0)) +
          ((uptoBaseAgg.totalLegacyNav || 0) + (uptoInstAgg.totalNav || 0) + (financials.initialNav || 0)) +
          ((uptoBaseAgg.totalLegacyMisc || 0) + (uptoInstAgg.totalMisc || 0) + (financials.initialMiscellaneous || 0)) +
          ((uptoBaseAgg.totalAdvancedPayment || 0) + (uptoLoanAgg.advance || 0) + (financials.initialAdvancedPayment || 0))
        ) - (uptoBaseAgg.totalCreditUsed || 0),
        totalExpenditure: (uptoBankAgg.totalExpenditure || 0) + (hasBaselineLedger ? 0 : initialExpenditure),
        bankCharges: (uptoBankAgg.totalBankCharges || 0) + (hasBaselineLedger ? 0 : initialBankCharges),
      },
      // Prev Stats (Cumulative up to Month-1 - includes initial collections)
      prev: {
        totalApprovedAmount: (prevBaseAgg.totalApprovedAmount || 0) + (financials.initialMonthlyCollection || 0),
        totalDelayedFinePaid: (prevBaseAgg.totalDelayedFinePaid || 0) + (prevLoanAgg.penalty || 0) + (financials.initialDelayedFine || 0),
        totalServiceChargePaid: (prevBaseAgg.totalServiceChargePaid || 0) + (prevLoanAgg.service || 0) + (prevLoanAgg.renewal || 0) + (financials.initialServiceCharge || 0),
        totalLoanInterestPaid: (prevBaseAgg.totalLoanInterestPaid || 0) + (prevLoanAgg.interest || 0) + (financials.initialLoanInterest || 0),
        totalAdvancedPayment: (prevBaseAgg.totalAdvancedPayment || 0) + (prevLoanAgg.advance || 0) + (financials.initialAdvancedPayment || 0),
        bankInterest: (prevBankAgg.totalBankInterest || 0) + (financials.initialBankInterest || 0),
        navCollection: (prevBaseAgg.totalLegacyNav || 0) + (prevInstAgg.totalNav || 0) + (financials.initialNav || 0),
        miscellaneous: (prevBaseAgg.totalLegacyMisc || 0) + (prevInstAgg.totalMisc || 0) + (financials.initialMiscellaneous || 0),
        totalLoanRepaid: (prevLoanAgg.principal || 0),
        grandTotalCollection: (
          ((prevBaseAgg.totalApprovedAmount || 0) + (financials.initialMonthlyCollection || 0)) +
          ((prevBaseAgg.totalDelayedFinePaid || 0) + (prevLoanAgg.penalty || 0) + (financials.initialDelayedFine || 0)) +
          ((prevBaseAgg.totalServiceChargePaid || 0) + (prevLoanAgg.service || 0) + (prevLoanAgg.renewal || 0) + (financials.initialServiceCharge || 0)) +
          ((prevBaseAgg.totalLoanInterestPaid || 0) + (prevLoanAgg.interest || 0) + (financials.initialLoanInterest || 0)) +
          ((prevBankAgg.totalBankInterest || 0) + (financials.initialBankInterest || 0)) +
          ((prevBaseAgg.totalLegacyNav || 0) + (prevInstAgg.totalNav || 0) + (financials.initialNav || 0)) +
          ((prevBaseAgg.totalLegacyMisc || 0) + (prevInstAgg.totalMisc || 0) + (financials.initialMiscellaneous || 0)) +
          ((prevBaseAgg.totalAdvancedPayment || 0) + (prevLoanAgg.advance || 0) + (financials.initialAdvancedPayment || 0))
        ) - (prevBaseAgg.totalCreditUsed || 0),
        totalExpenditure: (prevBankAgg.totalExpenditure || 0) + ((!hasBaselineLedger && targetMonth !== baselineMonthStr) ? initialExpenditure : 0),
        bankCharges: (prevBankAgg.totalBankCharges || 0) + ((!hasBaselineLedger && targetMonth !== baselineMonthStr) ? initialBankCharges : 0),
      }
    };

    // Construct Detailed Advance Inflow Logs
    const advanceInflowLogs: any[] = [];

    (depAdvanceLogs as any[]).forEach(d => {
      const isManualAgg = d.remarks?.startsWith("[AGGREGATION CREDIT]");
      advanceInflowLogs.push({
        memberName: d.userId?.name || "Unknown",
        accountNo: d.userId?.accountNumber || "N/A",
        profileImage: d.userId?.profileImage,
        date: d.depositDate,
        amount: d.advancedPayment,
        source: isManualAgg ? "Manual Aggregation" : (d.depositType === "ADVANCE" ? "Direct Advance" : "Deposit Overpayment"),
        remarks: isManualAgg ? d.remarks.replace("[AGGREGATION CREDIT] ", "") : d.remarks
      });
    });

    (loanAdvanceLogs as any[]).forEach(l => {
      l.payments.forEach((p: any) => {
        if (p.type === "ADVANCE" && (!isAllTime ? (new Date(p.date) >= loanMatchQuery["payments.date"].$gte && new Date(p.date) <= loanMatchQuery["payments.date"].$lte) : true)) {
          advanceInflowLogs.push({
            memberName: l.userId?.name || "Unknown",
            accountNo: l.userId?.accountNumber || "N/A",
            profileImage: l.userId?.profileImage,
            date: p.date,
            amount: p.amount,
            source: "Loan Settlement",
            remarks: "Advance during loan payment"
          });
        }
      });
    });

    // 5. HISTORICAL OUTSTANDING BALANCES (Cumulative up to Target Month)
    // To show members who had credit during the audited month, we must reconstruct history.
    const historicalEndRef = endAd || new Date();
    const [histDepBalances, histLoanBalances] = await Promise.all([
      Deposit.aggregate([
        { $match: { organizationId: targetIdObj, depositDate: { $lte: historicalEndRef }, status: "APPROVED" } },
        { $group: { _id: "$userId", inflow: { $sum: "$advancedPayment" }, usage: { $sum: "$creditUsed" } } }
      ]),
      Loan.aggregate([
        { $match: { organizationId: targetIdObj } },
        { $unwind: "$payments" },
        { $match: { "payments.date": { $lte: historicalEndRef }, "payments.type": "ADVANCE" } },
        { $group: { _id: "$userId", inflow: { $sum: "$payments.amount" } } }
      ])
    ]);

    const memberMap = new Map<string, { inflow: number; usage: number; name?: string; accountNo?: string }>();

    // Helper to merge results
    const merge = (results: any[], isUsage = false) => {
      results.forEach(r => {
        if (!r._id) return;
        const id = r._id.toString();
        const existing = memberMap.get(id) || { inflow: 0, usage: 0 };
        if (isUsage) {
          existing.usage += (r.usage || 0);
          existing.inflow += (r.inflow || 0);
        } else {
          existing.inflow += (r.inflow || 0);
        }
        memberMap.set(id, existing);
      });
    };

    merge(histDepBalances, true);
    merge(histLoanBalances);

    // Fetch user details for those with balance
    const activeMemberIds = Array.from(memberMap.entries())
      .filter(([_, val]) => (val.inflow - val.usage) > 0.01)
      .map(([id]) => id);

    const activeUsers = await User.find({ _id: { $in: activeMemberIds } }).select("name accountNumber profileImage").lean();
    const outstandingCredits = activeUsers.map(u => {
      const bal = memberMap.get(u._id.toString());
      return {
        memberName: u.name,
        accountNo: u.accountNumber,
        profileImage: u.profileImage,
        amount: (bal?.inflow || 0) - (bal?.usage || 0),
        isOutstanding: true
      };
    });

    console.log(`[AUDIT] Reconstructed ${outstandingCredits.length} historical balances for ${targetMonth}`);

    advanceInflowLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const principalRepaymentLogs: any[] = [];
    if (loanMatchQuery["payments.date"]) {
      const repaymentLoans = await Loan.find({
        organizationId: targetIdObj,
        "payments.date": loanMatchQuery["payments.date"]
      }).populate("userId", "name accountNumber profileImage").lean();

      repaymentLoans.forEach((loan: any) => {
        loan.payments.forEach((p: any) => {
          const pDate = new Date(p.date);
          if (pDate >= loanMatchQuery["payments.date"].$gte && pDate <= loanMatchQuery["payments.date"].$lte && p.type === "PRINCIPAL" && (p.amount || 0) > 0) {
            principalRepaymentLogs.push({
              memberName: loan.userId?.name || "Unknown",
              accountNo: loan.userId?.accountNumber || "N/A",
              profileImage: loan.userId?.profileImage,
              date: p.date,
              amount: p.amount,
              loanId: loan._id.toString()
            });
          }
        });
      });
    }
    principalRepaymentLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Construct Detailed Advance Usage Logs
    const advanceUsageLogs: any[] = [];
    (usageLogs as any[]).forEach(u => {
      advanceUsageLogs.push({
        memberName: u.userId?.name || "Unknown",
        accountNo: u.userId?.accountNumber || "N/A",
        profileImage: u.userId?.profileImage,
        date: u.depositDate,
        amount: u.creditUsed,
        source: u.depositType ? `Used for ${u.depositType.toLowerCase().replace('_', ' ')}` : "Used for Payment",
        isUsage: true
      });
    });

    // Construct Outstanding Credit Logs
    // (Already constructed above via historical reconstruction)

    console.log(`[DEBUG] Merged Totals for ${targetMonth}:`, JSON.stringify(mergedTotals));

    const currentAdvancePool = mergedTotals.totalAdvancedPayment - mergedTotals.totalCreditUsed;

    const grandTotalCollection =
      (mergedTotals.totalApprovedAmount +
        mergedTotals.totalDelayedFinePaid +
        mergedTotals.totalServiceChargePaid +
        mergedTotals.totalLoanInterestPaid +
        mergedTotals.bankInterest +
        mergedTotals.navCollection +
        mergedTotals.miscellaneous +
        mergedTotals.totalAdvancedPayment) -
      (mergedTotals.totalCreditUsed);

    // Fetch Latest Audit for transparency
    const latestAudit = await AdminAudit.findOne({ organizationId: targetIdObj, status: "SUCCESS" })
      .sort({ createdAt: -1 })
      .lean();

    const result = {
      ...agg,
      ...mergedTotals,
      bankDetails,
      officialName: org?.name,
      currentAdvancePool,
      financials,
      config: org?.config,
      grandTotalCollection,
      advanceInflowLogs,
      advanceUsageLogs,
      outstandingCredits,
      principalRepaymentLogs,
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
      initialBankCharges: Number(financials.initialBankCharges) || 0,
      initialExpenditure: Number(financials.initialExpenditure) || 0,
      initialOpeningBalance: Number(financials.initialOpeningBalance) || 0,
      initialOpeningMonth: financials.initialOpeningMonth || "",
      initialOpeningYear: Number(financials.initialOpeningYear) || 0,
      isFrameworkLocked: !!financials.isFrameworkLocked,
    };

    org.markModified('financials');
    await org.save();

    // Trigger reconciliation on the baseline month so the bank ledger reflects the new baseline values immediately
    if (financials.initialOpeningMonth && financials.initialOpeningYear) {
      const baselineMonthStr = `${financials.initialOpeningMonth} ${financials.initialOpeningYear}`;
      await reconcileMonthlyTotals(organizationId, baselineMonthStr).catch(console.error);
    }

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

export async function deleteDeposits(ids: string[]) {
  try {
    await connectDB();
    const deposits = await Deposit.find({ _id: { $in: ids } });

    for (const dep of deposits) {
      if (dep.status === "APPROVED") {
        if (dep.advancedPayment && dep.advancedPayment > 0) {
          await User.findByIdAndUpdate(dep.userId, {
            $inc: { advanceBalance: -dep.advancedPayment }
          });
        }
        if (dep.creditUsed && dep.creditUsed > 0) {
          await User.findByIdAndUpdate(dep.userId, {
            $inc: { advanceBalance: dep.creditUsed }
          });
        }
      }
    }

    await Deposit.deleteMany({ _id: { $in: ids } });
    await Notification.deleteMany({ relatedId: { $in: ids } });

    const monthsToReconcile = new Set<string>();
    for (const dep of deposits) {
      if (dep.status === "APPROVED") {
        monthsToReconcile.add(dep.month);
      }
    }
    if (deposits.length > 0) {
      for (const m of monthsToReconcile) {
        await reconcileMonthlyTotals(deposits[0].organizationId.toString(), m).catch(console.error);
      }
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDeposit(depositId: string, orgId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      throw new Error("Unauthorized: Administrative privileges required");
    }

    await connectDB();

    const dep = await Deposit.findOne({ _id: depositId, organizationId: orgId });
    if (!dep) throw new Error("Deposit record not found or already purged");

    // Reverse any advanceBalance changes if the deposit was approved
    if (dep.status === "APPROVED") {
      if (dep.advancedPayment && dep.advancedPayment > 0) {
        await User.findByIdAndUpdate(dep.userId, {
          $inc: { advanceBalance: -dep.advancedPayment }
        });
      }
      if (dep.creditUsed && dep.creditUsed > 0) {
        await User.findByIdAndUpdate(dep.userId, {
          $inc: { advanceBalance: dep.creditUsed }
        });
      }
    }

    const result = await Deposit.findOneAndDelete({
      _id: depositId,
      organizationId: orgId
    });
    if (result) {
      await Notification.deleteMany({ relatedId: depositId });
    }

    if (dep && dep.status === "APPROVED") {
      await reconcileMonthlyTotals(orgId, dep.month).catch(console.error);
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("[ERROR] deleteDeposit:", error);
    return { success: false, error: error.message };
  }
}

export async function getPendingDepositCount(organizationId: string) {
  try {
    await connectDB();
    const count = await Deposit.countDocuments({
      organizationId,
      status: "PENDING"
    });
    return { success: true, count };
  } catch (error: any) {
    return { success: false, count: 0 };
  }
}
