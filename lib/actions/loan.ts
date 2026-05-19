"use server";

import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Loan from "@/lib/models/Loan";
import User from "@/lib/models/User";
import Organization from "@/lib/models/Organization";
import Notification from "@/lib/models/Notification";
import Deposit from "@/lib/models/Deposit";
import { revalidatePath } from "next/cache";
import { calculateLoanStats } from "@/lib/utils/loan-calculations";
import BankLedger from "@/lib/models/BankLedger";
import Aggregation from "@/lib/models/Aggregation";
import { parseNepaliMonth, bsToAd, getDaysInMonth } from "@/lib/utils/nepali-date";


export async function getLoans(params: {
  organizationId: string;
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {

  try {
    await connectDB();
    const { organizationId, userId, status, page = 1, limit = 20, search } = params;

    const query: any = {
      organizationId,
      status: { $nin: ["DELETED", "COMPLETED"] }, // Active portfolio excludes history
    };

    if (search) {
      const searchRegex = new RegExp(search, "i");

      // 1. Find users matching the search (name, email, accountNumber)
      const userMatches = await User.find({
        organizationId,
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { accountNumber: searchRegex }
        ]
      }).select("_id").lean();
      const userIds = userMatches.map(u => u._id);

      // 2. Build the OR query for loans
      const orCriteria: any[] = [
        { reason: searchRegex }
      ];
      if (userIds.length > 0) orCriteria.push({ userId: { $in: userIds } });

      // If search is numeric, also search principalAmount
      const numSearch = Number(search);
      if (!isNaN(numSearch)) {
        orCriteria.push({ principalAmount: numSearch });
      }

      query.$or = orCriteria;
    }

    if (userId) query.userId = userId;
    if (status && status !== "ALL") query.status = status;


    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find(query)
        .populate("userId", "name email role isLoanApprover advanceBalance profileImage")
        .sort({ activatedAt: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Loan.countDocuments(query),
    ]);

    // Calculate dynamic fields for portfolio view
    const detailedLoans = loans.map((loan: any) => {
      const stats = calculateLoanStats(loan);
      const totalPaid = (loan.payments || []).reduce((sum: number, p: any) => p.type === "ADVANCE" ? sum : sum + p.amount, 0);
      return {
        ...loan,
        _id: loan._id.toString(),
        stats,
        totalPaid,
      };
    });

    // Sort by days since last activity descending (Highest Activity Days First)
    detailedLoans.sort((a, b) => (b.stats?.daysSinceLastEvent || 0) - (a.stats?.daysSinceLastEvent || 0));

    return {
      success: true,
      data: JSON.parse(JSON.stringify(detailedLoans)),
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLoanHistory(params: {
  organizationId: string;
  page?: number;
  limit?: number;
  asOfDate?: string | Date;
  search?: string;
}) {

  try {
    await connectDB();
    const { organizationId, page = 1, limit = 20, asOfDate, search } = params;
    const forceDate = asOfDate ? new Date(asOfDate) : undefined;

    const query: any = {
      organizationId,
      status: { $in: ["COMPLETED", "DELETED"] },
    };

    if (search) {
      const searchRegex = new RegExp(search, "i");
      const userMatches = await User.find({
        organizationId,
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { accountNumber: searchRegex }
        ]
      }).select("_id").lean();
      const userIds = userMatches.map(u => u._id);

      const orCriteria: any[] = [
        { reason: searchRegex }
      ];
      if (userIds.length > 0) orCriteria.push({ userId: { $in: userIds } });

      const numSearch = Number(search);
      if (!isNaN(numSearch)) {
        orCriteria.push({ principalAmount: numSearch });
      }

      query.$or = orCriteria;
    }


    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find(query)
        .populate("userId", "name email profileImage")
        .populate("deletedById", "name")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Loan.countDocuments(query),
    ]);

    const detailedLoans = loans.map((loan: any) => {
      const stats = calculateLoanStats(loan, forceDate);
      const totalPaid = (loan.payments || []).reduce((sum: number, p: any) => p.type === 'ADVANCE' ? sum : sum + p.amount, 0);
      return {
        ...loan,
        _id: loan._id.toString(),
        stats,
        totalPaid,
      };
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(detailedLoans)),
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserLoanProfile(userId: string) {
  try {
    await connectDB();
    const user = await User.findById(userId).lean();
    if (!user) throw new Error("User not found");

    const activeLoan = await Loan.findOne({
      userId,
      status: { $in: ["PENDING", "APPROVED", "ACTIVE"] }
    }).sort({ createdAt: -1 }).lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify({
        user,
        activeLoan
      }))
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createLoanRequest(data: {
  userId: string;
  organizationId: string;
  principalAmount: number;
  reason: string;
  interestRate?: number;
  adminRequesterId?: string;
  activatedAt?: string;
  takeServiceCharge?: boolean;
  recordOutflow?: boolean;
}) {
  try {
    await connectDB();

    const org = await Organization.findById(data.organizationId);
    if (!org) throw new Error("Organization not found");

    const serviceChargeRate = org.config.serviceChargeRate || 0.5;
    let serviceChargeAmount = (data.principalAmount * serviceChargeRate) / 100;
    let finalServiceChargeRate = serviceChargeRate;

    // Optional service charge control (default true for backward compatibility)
    if (data.takeServiceCharge === false) {
      serviceChargeAmount = 0;
      finalServiceChargeRate = 0;
    }

    let initialStatus = "PENDING";
    let activatedAtDate = undefined;
    let dueDate = undefined;
    let approvedByIds: mongoose.Types.ObjectId[] = [];

    // If admin provides an activatedAt date, it's a historical migration
    if (data.adminRequesterId && data.activatedAt) {
      initialStatus = "ACTIVE";
      activatedAtDate = new Date(data.activatedAt);
      approvedByIds = [new mongoose.Types.ObjectId(data.adminRequesterId)];

      // Set default 180 day deadline for historical loans
      dueDate = new Date(activatedAtDate);
      dueDate.setDate(dueDate.getDate() + 180);
    }

    const newLoan = await Loan.create({
      userId: data.userId,
      organizationId: data.organizationId,
      principalAmount: Math.ceil(data.principalAmount),
      balanceAmount: Math.ceil(data.principalAmount),
      reason: data.reason,
      interestRate: data.interestRate || org.config.interestRate,
      penaltyRate: org.config.penaltyRate || 20,
      serviceCharge: finalServiceChargeRate,
      serviceChargeAmount: Math.ceil(serviceChargeAmount),
      status: initialStatus,
      activatedAt: activatedAtDate,
      dueDate,
      approvedByIds,
      isOutflowRecorded: data.recordOutflow ?? true,
    });

    // Only notify approvers if the loan is actually pending
    if (initialStatus === "PENDING") {
      const approvers = await User.find({
        organizationId: data.organizationId,
        isLoanApprover: true
      });

      let requesterName = "A member";
      if (data.adminRequesterId) {
        const admin = await User.findById(data.adminRequesterId);
        if (admin) requesterName = `Admin ${admin.name} (on behalf of user)`;
      } else {
        const user = await User.findById(data.userId);
        if (user) requesterName = user.name;
      }

      const notifications = approvers.map(approver => ({
        senderId: data.adminRequesterId || data.userId,
        recipientId: approver._id,
        title: "New Loan Request",
        message: `${requesterName} has requested a loan of Rs. ${data.principalAmount}.`,
        type: "INFO",
        isRead: false
      }));
      await Notification.insertMany(notifications);
    }

    revalidatePath("/dashboard/loans");
    return { success: true, data: JSON.parse(JSON.stringify(newLoan)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveLoan(loanId: string, approverId: string) {
  try {
    await connectDB();
    const loan = await Loan.findById(loanId).populate("userId");
    if (!loan) throw new Error("Loan not found");

    const requester = loan.userId as any;

    if (loan.approvedByIds.includes(new mongoose.Types.ObjectId(approverId))) {
      throw new Error("You have already approved this loan");
    }

    loan.approvedByIds.push(new mongoose.Types.ObjectId(approverId));

    const currentApprovers = await User.find({ _id: { $in: loan.approvedByIds } });
    const adminApprovals = currentApprovers.filter(u => u.role === "ADMIN").length;
    const totalApprovals = loan.approvedByIds.length;
    const isRequesterApprover = requester.isLoanApprover || requester.role === "ADMIN";

    let isFullyApproved = false;
    if (isRequesterApprover) {
      if (totalApprovals >= 2 && adminApprovals >= 1) isFullyApproved = true;
    } else {
      if (totalApprovals >= 2) isFullyApproved = true;
    }

    if (isFullyApproved) {
      loan.status = "APPROVED";

      const admins = await User.find({ organizationId: loan.organizationId, role: "ADMIN" });
      const notifications = admins.map(admin => ({
        senderId: approverId,
        recipientId: admin._id,
        title: "Loan Ready for Verification",
        message: `Loan for ${requester.name} (Rs. ${loan.principalAmount}) has been approved by required parties.`,
        type: "SUCCESS",
        isRead: false
      }));
      await Notification.insertMany(notifications);
    }

    await loan.save();
    revalidatePath("/dashboard/loans");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function verifyLoan(loanId: string, adminId: string, recordOutflow: boolean = true) {
  try {
    await connectDB();
    const loan = await Loan.findById(loanId);
    if (!loan) throw new Error("Loan not found");

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "ADMIN") throw new Error("Unauthorized: Only admins can verify loans");

    if (loan.status !== "APPROVED" && loan.status !== "PENDING") {
      throw new Error("Loan must be in PENDING or APPROVED status for activation");
    }

    const now = new Date();
    loan.status = "ACTIVE";
    loan.activatedAt = now;
    loan.verifiedById = new mongoose.Types.ObjectId(adminId);
    loan.isOutflowRecorded = recordOutflow;

    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 180);
    loan.dueDate = dueDate;

    await loan.save();

    await Notification.create({
      senderId: adminId,
      recipientId: loan.userId,
      title: "Loan Activated",
      message: `Your loan of Rs. ${loan.principalAmount} has been verified and activated.`,
      type: "SUCCESS",
      isRead: false
    });

    revalidatePath("/dashboard/loans");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function rejectLoan(loanId: string, adminId: string, reason: string) {
  try {
    await connectDB();
    await Loan.findByIdAndUpdate(loanId, {
      status: "REJECTED",
      rejectionReason: reason
    });

    revalidatePath("/dashboard/loans");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function settleLoan(params: {
  loanId: string;
  adminId: string;
  allocations: {
    type: "INTEREST" | "PRINCIPAL" | "PENALTY" | "RENEWAL" | "SERVICE_CHARGE" | "ADVANCE";
    amount: number;
  }[];
  date?: string | Date;
  note?: string;
  useAdvance?: number; // Amount to deduct from user's global advanceBalance
  renewalParams?: { extensionDays: number; renewalAmount: number };
}) {
  try {
    await connectDB();
    const loan = await Loan.findById(params.loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.status !== "ACTIVE") throw new Error("Only ACTIVE loans can be settled");

    const admin = await User.findById(params.adminId);
    if (!admin || admin.role !== "ADMIN") throw new Error("Unauthorized");

    const member = await User.findById(loan.userId);
    if (!member) throw new Error("Member not found");

    // VALIDATION: If using advance credits, check balance
    if (params.useAdvance && params.useAdvance > (member.advanceBalance || 0)) {
      throw new Error(`Insufficient advance balance. Available: Rs. ${member.advanceBalance || 0}`);
    }

    if (!params.allocations || params.allocations.length === 0) {
      throw new Error("No allocations provided");
    }

    const totalTransactionAmount = params.allocations.reduce((sum, a) => sum + Math.ceil(a.amount), 0);

    if (totalTransactionAmount <= 0) throw new Error("Total payment must be greater than 0");

    const paymentDate = params.date ? new Date(params.date) : new Date();
    // Calculate current stats before processing
    const stats = calculateLoanStats(loan, paymentDate);


    // If renewal is requested, verify that EVERYTHING except principal is cleared in this transaction
    if (params.renewalParams) {
      const currentPrincipalDebt = Math.ceil(loan.principalAmount - (loan.principalPaid || 0));
      const extrasOutstandingBeforeThisPayment = Math.ceil(stats.outstandingAmount - currentPrincipalDebt);

      const allocatedToExtras = params.allocations
        .filter(a => a.type !== "PRINCIPAL")
        .reduce((sum, a) => sum + a.amount, 0);

      const totalRequiredToClearExtras = extrasOutstandingBeforeThisPayment + params.renewalParams.renewalAmount;

      if (Math.ceil(allocatedToExtras) < Math.ceil(totalRequiredToClearExtras)) {
        throw new Error(`Insufficient funds to renew. Must pay at least Rs. ${Math.ceil(totalRequiredToClearExtras)} to cover interest and fees.`);
      }

      // Proceed with renewal logic
      const prevDueDate = loan.dueDate ? new Date(loan.dueDate) : undefined;
      const newDueDate = new Date(paymentDate);
      newDueDate.setDate(newDueDate.getDate() + params.renewalParams.extensionDays);

      loan.renewalHistory = loan.renewalHistory || [];
      loan.renewalHistory.push({
        date: paymentDate,
        renewalAmount: params.renewalParams.renewalAmount,
        extensionDays: params.renewalParams.extensionDays,
        prevDueDate,
        newDueDate,
        adminId: new mongoose.Types.ObjectId(params.adminId),
      });

      if (params.renewalParams.renewalAmount > 0) {
        loan.renewalAmount = (loan.renewalAmount || 0) + params.renewalParams.renewalAmount;
      }

      loan.renewalCount = (loan.renewalCount || 0) + 1;
      loan.dueDate = newDueDate;
    }

    // Exclude ADVANCE entries from the debt-cleared tally — they are stored credits, not debt payments
    const previousTotalPaid = (loan.payments || []).reduce((sum: number, p: any) => p.type === 'ADVANCE' ? sum : sum + p.amount, 0);

    // Process each allocation
    const ceilAllocations = params.allocations.map(alloc => ({
      ...alloc,
      amount: Math.ceil(alloc.amount)
    }));

    // Add to payments history
    ceilAllocations.forEach(alloc => {
      if (alloc.amount <= 0) return;

      // Update individual trackers
      if (alloc.type === "PRINCIPAL") {
        loan.principalPaid = (loan.principalPaid || 0) + alloc.amount;
        loan.balanceAmount = Math.max(0, loan.principalAmount - loan.principalPaid);
      }
      if (alloc.type === "INTEREST") loan.interestPaid = (loan.interestPaid || 0) + alloc.amount;
      if (alloc.type === "PENALTY") loan.penaltyPaid = (loan.penaltyPaid || 0) + alloc.amount;
      if (alloc.type === "RENEWAL") loan.renewalPaid = (loan.renewalPaid || 0) + alloc.amount;
      if (alloc.type === "SERVICE_CHARGE") loan.serviceChargePaid = (loan.serviceChargePaid || 0) + alloc.amount;
      if (alloc.type === "ADVANCE") {
        loan.advancePaid = (loan.advancePaid || 0) + alloc.amount;
      }

      loan.payments.push({
        date: paymentDate,
        amount: alloc.amount,
        type: alloc.type,
        proof: params.note || (params.useAdvance ? `Paid via Advance (Rs. ${params.useAdvance})` : undefined),
        verified: true,
      });
    });

    // CRITICAL: If advance credit was used, record the deduction in the payments history
    // so the global audit aggregation (which sums ADVANCE types) correctly deducts it.
    if (params.useAdvance && params.useAdvance > 0) {
      loan.advancePaid = (loan.advancePaid || 0) - params.useAdvance;
      loan.payments.push({
        date: paymentDate,
        amount: -params.useAdvance,
        type: "ADVANCE",
        proof: `Credit Consumption for Loan Settlement`,
        verified: true,
      });
    }

    // 1. Calculate Advance Dynamics
    const advanceEarned = ceilAllocations
      .filter(a => a.type === "ADVANCE")
      .reduce((sum, a) => sum + a.amount, 0);
    const advanceUsed = params.useAdvance || 0;
    const netAdvanceChange = advanceEarned - advanceUsed;

    // 2. Recalculate full settlement status
    // NOTE: ADVANCE allocations are stored as member credit — they do NOT count
    // toward clearing the loan's own debt. Only debt-clearing types count.
    const debtClearingAmount = totalTransactionAmount - advanceEarned;
    const finalTotalPaid = previousTotalPaid + debtClearingAmount;

    // For renewal cases, the loan is NEVER completed because it is being extended
    const isFullySettled = !params.renewalParams && finalTotalPaid >= stats.totalAmountToPay;

    if (isFullySettled) {
      loan.status = "COMPLETED";
      loan.completedAt = new Date();
    } else if (params.renewalParams) {
      // Ensure status is active for renewed loans
      loan.status = "ACTIVE";
    }

    // 3. Persist Changes (Atomic increment for User balance)
    await Promise.all([
      loan.save(),
      User.findByIdAndUpdate(loan.userId, {
        $inc: { advanceBalance: netAdvanceChange }
      })
    ]);

    // Notify member
    await Notification.create({
      senderId: params.adminId,
      recipientId: loan.userId,
      title: isFullySettled ? "Loan Fully Settled 🎉" : "Loan Payment Recorded",
      message: isFullySettled
        ? `Congratulations! Your loan of Rs. ${loan.principalAmount} has been fully settled.`
        : `A settlement of Rs. ${totalTransactionAmount.toLocaleString()} has been recorded on your loan (${params.allocations.map(a => a.type).join(", ")}).`,
      type: isFullySettled ? "SUCCESS" : "INFO",
      isRead: false,
    });

    revalidatePath("/dashboard/loans");
    return { success: true, isFullySettled };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function undoLastSettlement(params: {
  loanId: string;
  adminId: string;
}) {
  try {
    await connectDB();

    const admin = await User.findById(params.adminId);
    if (!admin || admin.role !== "ADMIN") throw new Error("Unauthorized");

    const loan = await Loan.findById(params.loanId);
    if (!loan) throw new Error("Loan not found");
    if (!loan.payments || loan.payments.length === 0) throw new Error("No payments found to undo");

    const member = await User.findById(loan.userId);
    if (!member) throw new Error("Member not found");

    // Identify the latest batch of payments by shared effective date
    // Sort by date desc to get the most recent one
    const sortedPayments = [...loan.payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestDate = new Date(sortedPayments[0].date);

    // Filter all payments that happened at the exact same effective date (The Batch)
    const toRevert = loan.payments.filter((p: any) => new Date(p.date).getTime() === latestDate.getTime());

    if (toRevert.length === 0) throw new Error("Could not identify the last payment batch");

    // 1. Revert trackable amounts
    toRevert.forEach((p: any) => {
      if (p.type === "PRINCIPAL") {
        loan.principalPaid = Math.max(0, (loan.principalPaid || 0) - p.amount);
      } else if (p.type === "INTEREST") {
        loan.interestPaid = Math.max(0, (loan.interestPaid || 0) - p.amount);
      } else if (p.type === "PENALTY") {
        loan.penaltyPaid = Math.max(0, (loan.penaltyPaid || 0) - p.amount);
      } else if (p.type === "RENEWAL") {
        loan.renewalPaid = Math.max(0, (loan.renewalPaid || 0) - p.amount);
      } else if (p.type === "SERVICE_CHARGE") {
        loan.serviceChargePaid = Math.max(0, (loan.serviceChargePaid || 0) - p.amount);
      } else if (p.type === "ADVANCE") {
        loan.advancePaid = Math.max(0, (loan.advancePaid || 0) - p.amount);
      }
    });

    // 2. Restore core principal balance
    loan.balanceAmount = Math.max(0, loan.principalAmount - (loan.principalPaid || 0));

    // 3. Remove payments from history
    loan.payments = loan.payments.filter((p: any) => new Date(p.date).getTime() !== latestDate.getTime());

    // 4. Calculate Reversal Dynamics
    const advanceToRevert = toRevert
      .filter((p: any) => p.type === "ADVANCE")
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    // 5. Save both (Atomic decrement for User balance)
    await Promise.all([
      loan.save(),
      User.findByIdAndUpdate(loan.userId, {
        $inc: { advanceBalance: -advanceToRevert }
      })
    ]);
    const lastRenewal = loan.renewalHistory && loan.renewalHistory.length > 0
      ? loan.renewalHistory[loan.renewalHistory.length - 1]
      : null;

    if (lastRenewal && new Date(lastRenewal.date).getTime() === latestDate.getTime()) {
      // Revert due date and count
      loan.dueDate = lastRenewal.prevDueDate;
      loan.renewalCount = Math.max(0, (loan.renewalCount || 0) - 1);

      // If the renewal charge was part of this batch, it's already subtracted from loan.renewalPaid above.
      // We also need to subtract from the total renewal target if it added to it
      if (lastRenewal.renewalAmount > 0) {
        loan.renewalAmount = Math.max(0, (loan.renewalAmount || 0) - lastRenewal.renewalAmount);
      }

      // Remove the history entry
      loan.renewalHistory.pop();
    }

    // 5. Reset status
    loan.status = "ACTIVE";
    loan.completedAt = undefined;

    await loan.save();

    // Notify member about the reversal
    await Notification.create({
      senderId: params.adminId,
      recipientId: loan.userId,
      title: "Loan Settlement Revised",
      message: `Your recent loan settlement has been revised by an admin for correction. The loan is now back in ACTIVE status.`,
      type: "WARNING",
      isRead: false,
    });

    revalidatePath("/dashboard/loans");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteLoans(params: {
  loanIds: string[];
  adminId: string;
}) {
  try {
    await connectDB();

    const admin = await User.findById(params.adminId);
    if (!admin || admin.role !== "ADMIN") throw new Error("Unauthorized");

    const loans = await Loan.find({ _id: { $in: params.loanIds } });
    if (!loans.length) throw new Error("No loans found");

    const now = new Date();

    // Categorize loans for removal vs soft-delete
    // COMPLETED or DELETED loans are PERMANENTLY removed from history
    // PENDING, APPROVED, or ACTIVE loans are SOFT-DELETED (audit track)
    const toHardDelete = loans.filter(l => ["COMPLETED", "DELETED"].includes(l.status)).map(l => l._id);
    const toSoftDelete = loans.filter(l => !["COMPLETED", "DELETED"].includes(l.status)).map(l => l._id);

    // 1. Permanent Removal
    let hardCount = 0;
    if (toHardDelete.length > 0) {
      const res = await Loan.deleteMany({ _id: { $in: toHardDelete } });
      hardCount = res.deletedCount;
    }

    // 2. Soft-Delete
    let softCount = 0;
    if (toSoftDelete.length > 0) {
      await Loan.updateMany(
        { _id: { $in: toSoftDelete } },
        {
          $set: {
            status: "DELETED",
            deletedAt: now,
            deletedById: new mongoose.Types.ObjectId(params.adminId),
          },
        }
      );
      softCount = toSoftDelete.length;

      // Notify members only for active/pending soft-deletions
      const notifications = loans
        .filter(l => toSoftDelete.includes(l._id))
        .map(loan => ({
          senderId: params.adminId,
          recipientId: loan.userId,
          title: "Loan Record Cancelled",
          message: `Your loan record of Rs. ${loan.principalAmount} has been removed by an admin.`,
          type: "WARNING",
          isRead: false,
        }));
      if (notifications.length) await Notification.insertMany(notifications);
    }

    revalidatePath("/dashboard/loans");

    let message = "";
    if (hardCount > 0 && softCount > 0) message = `${hardCount} archived record(s) removed and ${softCount} active record(s) soft-deleted.`;
    else if (hardCount > 0) message = `${hardCount} historical record(s) permanently removed.`;
    else message = `${softCount} loan record(s) soft-deleted for audit logging.`;

    return { success: true, count: hardCount + softCount, message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function clearLoanHistory(organizationId: string, adminId: string) {
  try {
    await connectDB();

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== "ADMIN") throw new Error("Unauthorized");

    const result = await Loan.deleteMany({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      status: { $in: ["COMPLETED", "DELETED"] }
    });

    revalidatePath("/dashboard/loans");
    return { success: true, count: result.deletedCount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}



export async function getFinancialHealth(organizationId: string, month?: string, year?: number) {
  try {
    await connectDB();

    // Determine the exact point-in-time date (End of selected Nepali month or Now)
    let calculationDate = new Date();
    if (month && year) {
      const { month: mIdx } = parseNepaliMonth(`${month} ${year}`);
      const lastDay = getDaysInMonth(year, mIdx);
      const endOfMonth = bsToAd(year, mIdx, lastDay);
      endOfMonth.setHours(23, 59, 59, 999);

      const now = new Date();
      // If the selected month is in the future or is the current month, 
      // we cap at 'now' to show live real-time accruals.
      // For past months, we use the end of that month for historical auditing.
      calculationDate = endOfMonth.getTime() > now.getTime() ? now : endOfMonth;
    }

    // 1. Reconstruct Active Loan Portfolio as of calculationDate
    const loansQuery = await Loan.find({
      organizationId,
      activatedAt: { $lte: calculationDate },
      status: { $ne: "DELETED" }
    }).lean();

    let totalActivePrincipalOutstanding = 0;
    let totalAccruedInterestActive = 0;
    let totalOutstandingFeesActive = 0;

    loansQuery.forEach((loan: any) => {
      const stats = calculateLoanStats(loan, calculationDate);
      totalActivePrincipalOutstanding += (stats.principalOutstanding || 0);
      totalAccruedInterestActive += ((stats.unpaidBaseInterest || 0) + (stats.unpaidPenaltyInterest || 0));
      totalOutstandingFeesActive += (stats.unpaidSC + stats.unpaidRenewal);
    });

    // 2. Global Financial Aggregates
    const [loanAgg, depositAgg, manualAgg] = await Promise.all([
      Loan.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), activatedAt: { $lte: calculationDate } } },
        { $unwind: "$payments" },
        { $match: { "payments.date": { $lte: calculationDate }, "payments.verified": true } },
        {
          $group: {
            _id: null,
            totalInterest: { $sum: { $cond: [{ $eq: ["$payments.type", "INTEREST"] }, "$payments.amount", 0] } },
            totalPenalty: { $sum: { $cond: [{ $eq: ["$payments.type", "PENALTY"] }, "$payments.amount", 0] } },
            totalFees: { $sum: { $cond: [{ $or: [{ $eq: ["$payments.type", "SERVICE_CHARGE"] }, { $eq: ["$payments.type", "RENEWAL"] }] }, "$payments.amount", 0] } },
            totalAdvances: { $sum: { $cond: [{ $eq: ["$payments.type", "ADVANCE"] }, "$payments.amount", 0] } }
          }
        }
      ]),
      Deposit.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), depositDate: { $lte: calculationDate }, status: "APPROVED" } },
        {
          $group: {
            _id: null,
            totalAdvancedPayment: { $sum: "$advancedPayment" },
            totalCreditUsed: { $sum: "$creditUsed" }
          }
        }
      ]),
      Aggregation.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), date: { $lte: calculationDate }, type: "ADVANCE" } },
        {
          $group: {
            _id: null,
            totalManualAdvance: { $sum: "$amount" }
          }
        }
      ])
    ]);

    const totalFeesPaidGlobal = loanAgg[0]?.totalFees || 0;
    const totalInterestPaidGlobal = (loanAgg[0]?.totalInterest || 0) + (loanAgg[0]?.totalPenalty || 0);

    // Total Advance Pool = (Loan Advances + Deposit Advances + Manual Aggregation Advances) - (Deposit Credits Used)
    const totalAdvancePool = (loanAgg[0]?.totalAdvances || 0) + (depositAgg[0]?.totalAdvancedPayment || 0) + (manualAgg[0]?.totalManualAdvance || 0) - (depositAgg[0]?.totalCreditUsed || 0);

    const org = await Organization.findById(organizationId);
    if (!org) throw new Error("Organization not found");

    const initialFunds = (
      (org.financials?.initialMonthlyCollection || 0) +
      (org.financials?.initialNav || 0) +
      (org.financials?.initialBankInterest || 0)
    );

    const availableBalance = initialFunds - totalActivePrincipalOutstanding;

    return {
      success: true,
      data: {
        totalActiveLoans: Math.ceil(totalActivePrincipalOutstanding),
        availableBalance: Math.ceil(availableBalance),
        initialFunds: Math.ceil(initialFunds),
        totalCollectedInterestSettled: Math.ceil(totalInterestPaidGlobal),
        totalFeesPaidGlobal: Math.ceil(totalFeesPaidGlobal),
        totalAccruedInterestActive: Math.ceil(totalAccruedInterestActive),
        totalOutstandingFeesActive: Math.ceil(totalOutstandingFeesActive),
        totalAdvancePaidActive: Math.ceil(totalAdvancePool),
        pendingApprovalsCount: loansQuery.filter(l => ["PENDING", "APPROVED"].includes(l.status)).length,
        config: {
          showLiquidityWarning: org.config?.showLiquidityWarning,
          liquidityReservePercentage: org.config?.liquidityReservePercentage
        },
        asOf: calculationDate.toISOString()
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetches chronological audit logs for financial collections
 */
export async function getFinancialAuditLogs(organizationId: string) {
  try {
    await connectDB();

    const [loans, deposits, ledgers] = await Promise.all([
      Loan.find({
        organizationId: new mongoose.Types.ObjectId(organizationId)
      })
        .populate("userId", "name accountNumber profileImage")
        .lean(),
      Deposit.find({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        status: "APPROVED"
      })
        .populate("userId", "name accountNumber profileImage")
        .lean(),
      BankLedger.find({
        organizationId: new mongoose.Types.ObjectId(organizationId)
      }).lean()
    ]);

    const allLogs: any[] = [];

    // Add Loan-based transactions
    loans.forEach((loan: any) => {
      // 1. Inflows: Payments recorded against the loan
      if (loan.payments && loan.payments.length > 0) {
        loan.payments.forEach((payment: any) => {
          const isCreditEarn = payment.type === "ADVANCE";
          const isCreditUse = payment.proof?.includes("Paid via Advance");

          allLogs.push({
            date: payment.date,
            amount: payment.amount,
            type: payment.type,
            isCreditEarn,
            isCreditUse,
            method: payment.proof || "Standard",
            userName: loan.userId?.name || "Unknown",
            userImage: loan.userId?.profileImage,
            accountNumber: loan.userId?.accountNumber || "N/A",
            referenceId: loan._id,
            source: "LOAN_REPAYMENT"
          });
        });
      }

      // 2. Outflows: Principal disbursement (if recorded)
      if (loan.activatedAt && loan.isOutflowRecorded !== false && ["ACTIVE", "COMPLETED", "OVERDUE"].includes(loan.status)) {
        allLogs.push({
          date: loan.activatedAt,
          amount: -loan.principalAmount,
          type: "DISBURSEMENT",
          isCreditEarn: false,
          isCreditUse: false,
          method: "Cash/Bank Transfer",
          userName: loan.userId?.name || "Unknown",
          userImage: loan.userId?.profileImage,
          accountNumber: loan.userId?.accountNumber || "N/A",
          referenceId: loan._id,
          source: "LOAN_OUTFLOW"
        });
      }
    });

    // Add Deposit-based transactions (Total Inflows)
    deposits.forEach((dep: any) => {
      const totalDepositAmount = (dep.amount || 0) + (dep.advancedPayment || 0);
      if (totalDepositAmount > 0) {
        allLogs.push({
          date: dep.depositDate || dep.createdAt,
          amount: totalDepositAmount,
          type: dep.depositType || "DEPOSIT",
          isCreditEarn: dep.advancedPayment > 0,
          isCreditUse: dep.creditUsed > 0,
          method: dep.proof || "Standard",
          userName: dep.userId?.name || "Unknown",
          userImage: dep.userId?.profileImage,
          accountNumber: dep.userId?.accountNumber || "N/A",
          referenceId: dep._id,
          source: "COLLECTION"
        });
      }
    });

    // Add Bank Ledger entries
    ledgers.forEach((ledger: any) => {
      try {
        const target = parseNepaliMonth(ledger.month);
        const days = getDaysInMonth(target.year, target.month);
        const ledgerDate = bsToAd(target.year, target.month, days);

        if (ledger.bankInterest > 0) {
          allLogs.push({
            date: ledgerDate,
            amount: ledger.bankInterest,
            type: "BANK_INTEREST",
            isCreditEarn: false,
            isCreditUse: false,
            method: "Bank Credit",
            userName: "Institutional (Bank)",
            accountNumber: ledger.month,
            referenceId: ledger._id,
            source: "BANK_LEDGER"
          });
        }

        if (ledger.bankCharges > 0) {
          allLogs.push({
            date: ledgerDate,
            amount: -ledger.bankCharges,
            type: "BANK_CHARGES",
            isCreditEarn: false,
            isCreditUse: false,
            method: "Bank Debit",
            userName: "Institutional (Bank)",
            accountNumber: ledger.month,
            referenceId: ledger._id,
            source: "BANK_LEDGER"
          });
        }

        if (ledger.totalExpenditure > 0) {
          allLogs.push({
            date: ledgerDate,
            amount: -ledger.totalExpenditure,
            type: "EXPENDITURE",
            isCreditEarn: false,
            isCreditUse: false,
            method: "Operational Outflow",
            userName: "Organization",
            accountNumber: ledger.month,
            referenceId: ledger._id,
            source: "BANK_LEDGER"
          });
        }
      } catch (e) {
        // Skip invalid months
      }
    });

    // Sort all logs by date descending
    allLogs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Fetch Current Global Advance Balances
    const userBalances = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      advanceBalance: { $gt: 0 },
      isActive: true
    })
      .select("name accountNumber advanceBalance profileImage")
      .lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(allLogs)),
      userBalances: JSON.parse(JSON.stringify(userBalances))
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

