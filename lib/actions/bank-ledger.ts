"use server";

import mongoose from "mongoose";
import connectDB from "@/lib/db";
import BankLedger from "@/lib/models/BankLedger";
import Deposit from "@/lib/models/Deposit";
import Aggregation from "@/lib/models/Aggregation";
import Loan from "@/lib/models/Loan";
import Organization from "@/lib/models/Organization";
import { parseNepaliMonth, bsToAd, getDaysInMonth, NEPALI_MONTHS, getPreviousNepaliMonth, getNextNepaliMonth } from "@/lib/utils/nepali-date";
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
      baselineBalance: org.financials.initialOpeningBalance || 0
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

    if (data.bankInterest !== undefined) ledger.bankInterest = data.bankInterest;
    if (data.bankCharges !== undefined) ledger.bankCharges = data.bankCharges;
    if (data.totalExpenditure !== undefined) ledger.totalExpenditure = data.totalExpenditure;
    if (data.openingBalance !== undefined) ledger.openingBalance = data.openingBalance;
    if (data.remarks !== undefined) ledger.remarks = data.remarks;

    // Recalculate closing balance
    // Closing = Opening + (Deposits + Repayments + Interest) - (Disbursements + Charges + Expenditure)
    ledger.closingBalance =
      ledger.openingBalance +
      ledger.totalDeposits +
      ledger.totalLoanRepaid +
      ledger.bankInterest -
      ledger.totalLoanDisbursed -
      ledger.bankCharges -
      ledger.totalExpenditure;

    await ledger.save();

    // Auto-lock the framework config when an active ledger is committed/updated
    const org = await Organization.findById(ledger.organizationId);
    if (org && org.financials && !org.financials.isFrameworkLocked) {
      org.financials.isFrameworkLocked = true;
      org.markModified('financials');
      await org.save();
    }

    revalidatePath("/dashboard/bank-ledger");
    return { success: true, data: JSON.parse(JSON.stringify(ledger)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reconcileMonthlyTotals(organizationId: string, month: string) {
  try {
    await connectDB();

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
            month: { $regex: month, $options: "i" }
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
          isOutflowRecorded: { $ne: false } // Default is true, so we match true or undefined
        }
      },
      { $group: { _id: null, total: { $sum: "$principalAmount" } } }
    ]);

    // 3. Total Loan Repaid (verified payments in this month)
    // We need to unwind the payments array
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

    const totalDeposits = (deposits[0]?.total || 0) + (instDeposits[0]?.total || 0);
    const totalLoanDisbursed = loansDisbursed[0]?.total || 0;
    const totalLoanRepaid = loansRepaid[0]?.total || 0;

    const ledger = await BankLedger.findOne({ organizationId, month });
    if (!ledger) return { success: false, error: "Ledger not found" };

    // Force Sync Opening Balance
    const org = await Organization.findById(organizationId);
    const baselineMonthStr = `${org?.financials?.initialOpeningMonth} ${org?.financials?.initialOpeningYear}`;
    
    if (baselineMonthStr === month) {
      ledger.openingBalance = org?.financials?.initialOpeningBalance || 0;
    } else {
      const prevMonthStr = getPreviousNepaliMonth(month);
      const prevLedger = await BankLedger.findOne({ organizationId, month: prevMonthStr });
      ledger.openingBalance = prevLedger ? prevLedger.closingBalance : 0;
    }

    ledger.totalDeposits = totalDeposits;
    ledger.totalLoanDisbursed = totalLoanDisbursed;
    ledger.totalLoanRepaid = totalLoanRepaid;

    // Recalculate closing balance
    ledger.closingBalance =
      ledger.openingBalance +
      totalDeposits +
      totalLoanRepaid +
      ledger.bankInterest -
      totalLoanDisbursed -
      ledger.bankCharges -
      ledger.totalExpenditure;

    await ledger.save();

    // Propagate to next month if it exists
    const nextMonthStr = getNextNepaliMonth(month);
    const nextLedger = await BankLedger.findOne({ organizationId, month: nextMonthStr });
    if (nextLedger) {
      // Reconcile next month but do not wait for it to finish to avoid long response times
      reconcileMonthlyTotals(organizationId, nextMonthStr).catch(console.error);
    }


    return {
      success: true,
      totals: { totalDeposits, totalLoanDisbursed, totalLoanRepaid }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
