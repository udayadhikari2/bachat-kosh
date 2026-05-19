"use server";

import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Deposit from "@/lib/models/Deposit";
import Loan from "@/lib/models/Loan";
import Notification from "@/lib/models/Notification";
import mongoose from "mongoose";

export async function getMemberActivity(userId: string) {
  try {
    await connectDB();

    // 1. Fetch User Info
    const user = await User.findById(userId).lean();
    if (!user) throw new Error("Member not found");

    // 2. Fetch All Deposits
    const deposits = await Deposit.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();

    // 3. Fetch All Loans
    const loans = await Loan.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();

    // 4. Fetch Notifications
    const notifications = await Notification.find({ recipientId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // 5. Construct Timeline
    const timeline: any[] = [];

    // Add Deposits to timeline
    deposits.forEach((dep: any) => {
      timeline.push({
        id: dep._id.toString(),
        date: dep.depositDate || dep.createdAt,
        type: "DEPOSIT",
        title: `${dep.depositType.replace("_", " ")} Deposit`,
        amount: dep.amount,
        status: dep.status,
        month: dep.month,
        details: dep.remarks,
        advancedPayment: dep.advancedPayment,
        creditUsed: dep.creditUsed,
      });
    });

    // Add Loans and Loan Payments to timeline
    loans.forEach((loan: any) => {
      // The loan request itself
      timeline.push({
        id: loan._id.toString(),
        date: loan.createdAt,
        type: "LOAN_REQUEST",
        title: `Loan Requested`,
        amount: loan.principalAmount,
        status: loan.status,
        details: loan.reason,
      });

      // Individual payments
      if (loan.payments) {
        loan.payments.forEach((pmt: any, idx: number) => {
          timeline.push({
            id: pmt._id ? pmt._id.toString() : `${loan._id}-pmt-${idx}`,
            date: pmt.date,
            type: "LOAN_PAYMENT",
            title: `Loan Repayment (${pmt.type})`,
            amount: pmt.amount,
            status: pmt.verified ? "APPROVED" : "PENDING",
            details: pmt.proof,
            loanId: loan._id.toString(),
          });
        });
      }

      // Renewals
      if (loan.renewalHistory) {
        loan.renewalHistory.forEach((ren: any, idx: number) => {
          timeline.push({
            id: ren._id ? ren._id.toString() : `${loan._id}-ren-${idx}`,
            date: ren.date,
            type: "LOAN_RENEWAL",
            title: `Loan Renewed`,
            amount: ren.renewalAmount,
            status: "APPROVED",
            details: `Extended by ${ren.extensionDays} days`,
            loanId: loan._id.toString(),
          });
        });
      }
    });

    // Add Notifications to timeline
    notifications.forEach((notif: any) => {
       timeline.push({
         id: notif._id.toString(),
         date: notif.createdAt,
         type: "NOTIFICATION",
         title: notif.title,
         amount: 0,
         status: "INFO",
         details: notif.message,
       });
    });

    // Sort timeline by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      success: true,
      data: JSON.parse(JSON.stringify({
        user,
        stats: {
          totalDeposits: deposits.filter(d => d.status === "APPROVED").reduce((sum, d) => sum + d.amount, 0),
          activeLoans: loans.filter(l => l.status === "ACTIVE").length,
          totalLoanPaid: loans.reduce((sum, l) => sum + (l.principalPaid || 0), 0),
          currentAdvanceBalance: user.advanceBalance || 0
        },
        timeline
      }))
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTimelineEvents(userId: string, events: { id: string; type: string; loanId?: string }[]) {
  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) throw new Error("Member not found");

    for (const event of events) {
      if (event.type === "DEPOSIT") {
        const deposit = await Deposit.findById(event.id);
        if (deposit) {
          // Automatic balance adjustment
          let advanceChange = 0;
          if (deposit.advancedPayment > 0) advanceChange -= deposit.advancedPayment;
          if (deposit.creditUsed > 0) advanceChange += deposit.creditUsed;
          
          if (advanceChange !== 0) {
            await User.findByIdAndUpdate(userId, { $inc: { advanceBalance: advanceChange } });
          }
          await Deposit.findByIdAndDelete(event.id);
          await Notification.deleteMany({ relatedId: event.id });
        }
      } else if (event.type === "LOAN_REQUEST") {
        await Loan.findByIdAndDelete(event.id);
      } else if (event.type === "LOAN_PAYMENT" && event.loanId) {
        await Loan.findByIdAndUpdate(event.loanId, {
          $pull: { payments: { _id: event.id } }
        });
      } else if (event.type === "LOAN_RENEWAL" && event.loanId) {
        await Loan.findByIdAndUpdate(event.loanId, {
          $pull: { renewalHistory: { _id: event.id } }
        });
      } else if (event.type === "NOTIFICATION") {
        await Notification.findByIdAndDelete(event.id);
      }
    }
    
    // Cleanup any orphaned notifications if desired, etc.
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
