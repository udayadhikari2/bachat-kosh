"use server";

import mongoose from "mongoose";
import connectDB from "@/lib/db";
import BankLedger from "@/lib/models/BankLedger";
import Deposit from "@/lib/models/Deposit";
import Aggregation from "@/lib/models/Aggregation";
import Loan from "@/lib/models/Loan";
import Organization from "@/lib/models/Organization";
import { parseNepaliMonth, bsToAd, getDaysInMonth, NEPALI_MONTHS, getPreviousNepaliMonth, getNextNepaliMonth, getCurrentNepaliDate, compareNepaliMonths } from "@/lib/utils/nepali-date";
import { revalidatePath } from "next/cache";

export async function getOrganizationBaseline(organizationId: string) {
  try {
    await connectDB();
    const org = await Organization.findById(organizationId);
    if (!org || !org.financials) return { success: false, error: "No financials config found" };
    
    return {
      success: true,
      baselineMonth: org.financials.initialOpeningMonth || "",
      baselineYear: org.financials.initialOpeningYear || 0,
      baselineBalance: org.financials.initialOpeningBalance || 0,
      initialBankCharges: org.financials.initialBankCharges || 0,
      initialExpenditure: org.financials.initialExpenditure || 0
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBankLedger(organizationId: string, month: string) {
  try {
    await connectDB();

    let ledger = await BankLedger.findOne({ organizationId, month });

    if (!ledger) {
      // Try to get opening balance from previous month
      const prevMonthStr = getPreviousNepaliMonth(month);
      const prevLedger = await BankLedger.findOne({ organizationId, month: prevMonthStr });

      let openingBalance = prevLedger ? prevLedger.closingBalance : 0;

      // If no previous ledger, check if this is the "Initial Opening Month" from Organization config
      if (!prevLedger) {
        const org = await Organization.findById(organizationId);
        if (org && org.financials) {
          const { initialOpeningMonth, initialOpeningYear, initialOpeningBalance: initBal } = org.financials;
          const baselineMonthStr = `${initialOpeningMonth} ${initialOpeningYear}`;

          if (month === baselineMonthStr) {
            openingBalance = initBal || 0;
          }
        }
      }

      ledger = await BankLedger.create({
        organizationId,
        month,
        openingBalance,
        closingBalance: openingBalance, // Initial state
      });
    }

    // Auto-reconcile totals every time we fetch (optional, but keeps it fresh)
    const reconciled = await reconcileMonthlyTotals(organizationId, month);
    if (reconciled.success) {
      ledger = await BankLedger.findOne({ organizationId, month });
    }

    return { success: true, data: JSON.parse(JSON.stringify(ledger)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateBankLedger(id: string, data: {
  bankInterest?: number;
  bankCharges?: number;
  totalExpenditure?: number;
  openingBalance?: number; // Allow manual override for first month
  remarks?: string;
}) {
  try {
    await connectDB();

    const ledger = await BankLedger.findById(id);
    if (!ledger) throw new Error("Ledger not found");

    const org = await Organization.findById(ledger.organizationId);
    const baselineMonthStr = org?.financials ? `${org.financials.initialOpeningMonth} ${org.financials.initialOpeningYear}` : "";
    const isBaseline = baselineMonthStr === ledger.month;

    if (data.bankInterest !== undefined) ledger.bankInterest = data.bankInterest;
    if (data.openingBalance !== undefined) ledger.openingBalance = data.openingBalance;
    if (data.remarks !== undefined) ledger.remarks = data.remarks;

    if (isBaseline) {
      // Force initial values for baseline month
      ledger.manualBankCharges = org?.financials?.initialBankCharges || 0;
      ledger.totalExpenditure = org?.financials?.initialExpenditure || 0;
    } else {
      if (data.bankCharges !== undefined) ledger.manualBankCharges = data.bankCharges;
      if (data.totalExpenditure !== undefined) ledger.totalExpenditure = data.totalExpenditure;
    }

    // Query active loan bank charges for the target month
    const target = parseNepaliMonth(ledger.month);
    const daysInMonth = getDaysInMonth(target.year, target.month);
    const startDate = bsToAd(target.year, target.month, 1);
    const endDate = bsToAd(target.year, target.month, daysInMonth);
    endDate.setHours(23, 59, 59, 999);

    const loanBankCharges = await Loan.aggregate([
      {
        $match: {
          organizationId: ledger.organizationId,
          status: { $in: ["ACTIVE", "COMPLETED", "OVERDUE"] },
          activatedAt: { $gte: startDate, $lte: endDate },
          isOutflowRecorded: { $ne: false }
        }
      },
      { $group: { _id: null, total: { $sum: "$bankCharge" } } }
    ]);
    const totalLoanBankCharges = loanBankCharges[0]?.total || 0;

    const manualBankCharges = typeof ledger.manualBankCharges === "number" ? ledger.manualBankCharges : ledger.bankCharges;
    ledger.manualBankCharges = manualBankCharges;
    ledger.bankCharges = manualBankCharges + totalLoanBankCharges;

    // Recalculate closing balance
    // For baseline month, initial expenditure/charges are shown in the ledger,
    // but they must NOT be subtracted from closingBalance because they are already accounted for in initialOpeningBalance.
    const chargesToSubtract = isBaseline 
      ? (ledger.bankCharges - (org?.financials?.initialBankCharges || 0)) 
      : ledger.bankCharges;
    const expenditureToSubtract = isBaseline 
      ? (ledger.totalExpenditure - (org?.financials?.initialExpenditure || 0)) 
      : ledger.totalExpenditure;

    ledger.closingBalance =
      ledger.openingBalance +
      ledger.totalDeposits +
      ledger.totalLoanRepaid +
      ledger.bankInterest -
      ledger.totalLoanDisbursed -
      chargesToSubtract -
      expenditureToSubtract;

    await ledger.save();

    // Auto-lock the framework config when an active ledger is committed/updated
    if (org && org.financials && !org.financials.isFrameworkLocked) {
      org.financials.isFrameworkLocked = true;
      org.markModified('financials');
      await org.save();
    }

    try {
      revalidatePath("/dashboard/bank-ledger");
    } catch (e: any) {
      console.log(`[revalidatePath Warning] Running outside Next.js context: ${e.message}`);
    }
    return { success: true, data: JSON.parse(JSON.stringify(ledger)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


export async function getLedgerEndMonth(organizationId: string): Promise<string> {
  const current = getCurrentNepaliDate();
  let maxMonthStr = `${current.monthName} ${current.year}`;

  const ledgers = await BankLedger.find({ organizationId }).select("month").lean();
  for (const l of ledgers) {
    if (compareNepaliMonths(l.month, maxMonthStr) > 0) {
      maxMonthStr = l.month;
    }
  }
  return maxMonthStr;
}

async function reconcileSingleMonth(organizationId: string, month: string, org: any) {
  const target = parseNepaliMonth(month);
  const daysInMonth = getDaysInMonth(target.year, target.month);

  const startDate = bsToAd(target.year, target.month, 1);
  const endDate = bsToAd(target.year, target.month, daysInMonth);
  endDate.setHours(23, 59, 59, 999);

  const orgIdObj = new mongoose.Types.ObjectId(organizationId);

  // 1. Total Deposits (Member + Institutional)
  const [deposits, instDeposits] = await Promise.all([
    Deposit.aggregate([
      {
        $match: {
          organizationId: orgIdObj,
          status: "APPROVED",
          month: { $regex: month, $options: "i" }
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $subtract: [
                { 
                  $add: [
                    { $ifNull: ["$amount", 0] }, 
                    { $ifNull: ["$advancedPayment", 0] }, 
                    { $ifNull: ["$fineApplied", 0] }
                  ] 
                },
                { $ifNull: ["$creditUsed", 0] }
              ]
            }
          }
        }
      }
    ]),
    Aggregation.aggregate([
      {
        $match: {
          organizationId: orgIdObj,
          month: { $regex: month, $options: "i" },
          type: { $ne: "ADVANCE" }
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);

  // 2. Total Loan Disbursed (ACTIVATED in this month)
  const loansDisbursed = await Loan.aggregate([
    {
      $match: {
        organizationId: orgIdObj,
        status: { $in: ["ACTIVE", "COMPLETED", "OVERDUE"] },
        activatedAt: { $gte: startDate, $lte: endDate },
        isOutflowRecorded: { $ne: false }
      }
    },
    { $group: { _id: null, total: { $sum: "$principalAmount" } } }
  ]);

  // 3. Total Loan Repaid (verified payments in this month)
  const loansRepaid = await Loan.aggregate([
    { $match: { organizationId: orgIdObj } },
    { $unwind: "$payments" },
    {
      $match: {
        "payments.verified": true,
        "payments.date": { $gte: startDate, $lte: endDate },
        "payments.type": { $ne: "ORGANIZATION" }
      }
    },
    { $group: { _id: null, total: { $sum: "$payments.amount" } } }
  ]);

  // 4. Total Loan Bank Charges (from loans activated in this month)
  const loanBankCharges = await Loan.aggregate([
    {
      $match: {
        organizationId: orgIdObj,
        status: { $in: ["ACTIVE", "COMPLETED", "OVERDUE"] },
        activatedAt: { $gte: startDate, $lte: endDate },
        isOutflowRecorded: { $ne: false }
      }
    },
    { $group: { _id: null, total: { $sum: "$bankCharge" } } }
  ]);
  const totalLoanBankCharges = loanBankCharges[0]?.total || 0;

  const totalDeposits = (deposits[0]?.total || 0) + (instDeposits[0]?.total || 0);
  const totalLoanDisbursed = loansDisbursed[0]?.total || 0;
  const totalLoanRepaid = loansRepaid[0]?.total || 0;

  let ledger = await BankLedger.findOne({ organizationId, month });
  if (!ledger) {
    // Try to get opening balance from previous month
    const prevMonthStr = getPreviousNepaliMonth(month);
    const prevLedger = await BankLedger.findOne({ organizationId, month: prevMonthStr });
    let openingBalance = prevLedger ? prevLedger.closingBalance : 0;

    // If no previous ledger, check if this is the "Initial Opening Month"
    const baselineMonthStr = `${org.financials?.initialOpeningMonth} ${org.financials?.initialOpeningYear}`;
    if (!prevLedger && month === baselineMonthStr) {
      openingBalance = org.financials?.initialOpeningBalance || 0;
    }

    ledger = await BankLedger.create({
      organizationId,
      month,
      openingBalance,
      closingBalance: openingBalance,
    });
  }

  // Force Sync Opening Balance
  const baselineMonthStr = `${org.financials?.initialOpeningMonth} ${org.financials?.initialOpeningYear}`;
  
  if (baselineMonthStr === month) {
    ledger.openingBalance = org.financials?.initialOpeningBalance || 0;
  } else {
    const prevMonthStr = getPreviousNepaliMonth(month);
    const prevLedger = await BankLedger.findOne({ organizationId, month: prevMonthStr });
    ledger.openingBalance = prevLedger ? prevLedger.closingBalance : 0;
  }

  ledger.totalDeposits = totalDeposits;
  ledger.totalLoanDisbursed = totalLoanDisbursed;
  ledger.totalLoanRepaid = totalLoanRepaid;

  const isBaseline = baselineMonthStr === month;

  if (isBaseline) {
    ledger.manualBankCharges = org.financials?.initialBankCharges || 0;
    ledger.totalExpenditure = org.financials?.initialExpenditure || 0;
  }

  // Recalculate bankCharges
  const manualBankCharges = typeof ledger.manualBankCharges === "number" ? ledger.manualBankCharges : ledger.bankCharges;
  ledger.manualBankCharges = manualBankCharges;
  ledger.bankCharges = manualBankCharges + totalLoanBankCharges;

  // Recalculate closing balance
  const chargesToSubtract = isBaseline 
    ? (ledger.bankCharges - (org.financials?.initialBankCharges || 0)) 
    : ledger.bankCharges;
  const expenditureToSubtract = isBaseline 
    ? (ledger.totalExpenditure - (org.financials?.initialExpenditure || 0)) 
    : ledger.totalExpenditure;

  ledger.closingBalance =
    ledger.openingBalance +
    totalDeposits +
    totalLoanRepaid +
    ledger.bankInterest -
    totalLoanDisbursed -
    chargesToSubtract -
    expenditureToSubtract;

  await ledger.save();

  return { totalDeposits, totalLoanDisbursed, totalLoanRepaid };
}

export async function reconcileMonthlyTotals(organizationId: string, month: string) {
  try {
    await connectDB();

    const org = await Organization.findById(organizationId);
    if (!org) return { success: false, error: "Organization not found" };

    const baselineMonth = org.financials?.initialOpeningMonth;
    const baselineYear = org.financials?.initialOpeningYear;
    if (!baselineMonth || !baselineYear) {
      return { success: false, error: "Baseline financials not configured" };
    }
    const baselineMonthStr = `${baselineMonth} ${baselineYear}`;

    // If start month is before baseline month, adjust start month to baseline month
    let currentMonth = month;
    if (compareNepaliMonths(currentMonth, baselineMonthStr) < 0) {
      currentMonth = baselineMonthStr;
    }

    const endMonth = await getLedgerEndMonth(organizationId);
    console.log(`[LEDGER RECONCILE CHAIN] Org ${organizationId} from ${currentMonth} to ${endMonth}`);

    let startMonthTotals = null;

    while (compareNepaliMonths(currentMonth, endMonth) <= 0) {
      const totals = await reconcileSingleMonth(organizationId, currentMonth, org);
      if (currentMonth === month) {
        startMonthTotals = totals;
      }
      currentMonth = getNextNepaliMonth(currentMonth);
    }

    try {
      revalidatePath("/dashboard/bank-ledger");
    } catch (e: any) {
      console.log(`[revalidatePath Warning] Running outside Next.js context: ${e.message}`);
    }

    return {
      success: true,
      totals: startMonthTotals || { totalDeposits: 0, totalLoanDisbursed: 0, totalLoanRepaid: 0 }
    };
  } catch (error: any) {
    console.error("[LEDGER RECONCILE CHAIN ERROR]:", error);
    return { success: false, error: error.message };
  }
}
