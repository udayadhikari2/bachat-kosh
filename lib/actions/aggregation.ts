"use server";

import connectDB from "@/lib/db";
import Aggregation from "@/lib/models/Aggregation";
import AdminAudit from "@/lib/models/AdminAudit";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import mongoose from "mongoose";
import User from "@/lib/models/User";
import Deposit from "@/lib/models/Deposit";
import Notification from "@/lib/models/Notification";
import { parseNepaliMonth, getDaysInMonth, bsToAd, getCurrentNepaliDate, getNepaliMonthEndAd } from "@/lib/utils/nepali-date";
import { reconcileMonthlyTotals } from "@/lib/actions/bank-ledger";

export async function getAggregations(params: {
  organizationId: string;
  page?: number;
  limit?: number;
  search?: string;
  month?: string;
}) {
  try {
    await connectDB();
    const { organizationId, page = 1, limit = 15, search, month } = params;

    const query: any = { organizationId: new mongoose.Types.ObjectId(organizationId) };
    if (month && month !== "all") query.month = month;
    if (search) {
      query.remarks = { $regex: search, $options: "i" };
    }

    const [data, total] = await Promise.all([
      Aggregation.find(query)
        .populate("memberId", "name accountNumber advanceBalance profileImage")
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Aggregation.countDocuments(query)
    ]);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(data)),
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

export async function createAggregation(data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      throw new Error("Unauthorized: Administrative access required");
    }

    await connectDB();

    const currentNepali = getCurrentNepaliDate();
    const target = parseNepaliMonth(data.month);
    let finalDate = data.date ? new Date(data.date) : new Date();

    const isPastMonth = target.year < currentNepali.year || 
                       (target.year === currentNepali.year && target.month < currentNepali.month);
    if (isPastMonth) {
      finalDate = getNepaliMonthEndAd(target.year, target.month);
    }

    const agg = await Aggregation.create({
      ...data,
      date: finalDate,
      adminId: (session.user as any).id
    });

    // If type is ADVANCE and memberId is provided, update user credit pool and history
    if (data.type === "ADVANCE" && data.memberId) {
      // 1. Update User Advance Balance
      const user = await User.findByIdAndUpdate(data.memberId, {
        $inc: { advanceBalance: data.amount }
      });

      if (!user) {
        // Cleanup if user not found (though UI should prevent this)
        await Aggregation.findByIdAndDelete(agg._id);
        throw new Error("Target member not found");
      }

      // 2. Create a Deposit record for history timeline
      await Deposit.create({
        userId: data.memberId,
        organizationId: data.organizationId,
        amount: 0, // Principal is 0 as this is pure advance credit
        advancedPayment: data.amount,
        month: data.month,
        depositType: "ADVANCE",
        depositDate: finalDate,
        status: "APPROVED",
        remarks: `[AGGREGATION CREDIT] ${data.remarks || ""}`,
        verifiedBy: (session.user as any).id,
        aggregationId: agg._id
      });
    }

    // Create Audit Log
    await AdminAudit.create({
      adminId: (session.user as any).id,
      organizationId: data.organizationId,
      action: "CREATE_AGGREGATION",
      newValues: agg.toObject(),
      status: "SUCCESS"
    });

    await reconcileMonthlyTotals(data.organizationId, data.month).catch(console.error);

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard", "layout");
    return { success: true, data: JSON.parse(JSON.stringify(agg)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAggregation(id: string, data: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      throw new Error("Unauthorized: Administrative access required");
    }

    await connectDB();
    const oldVal = await Aggregation.findById(id);
    if (!oldVal) throw new Error("Aggregation record not found");

    const currentNepali = getCurrentNepaliDate();
    const target = parseNepaliMonth(data.month);
    let finalDate = data.date ? new Date(data.date) : new Date();

    const isPastMonth = target.year < currentNepali.year || 
                       (target.year === currentNepali.year && target.month < currentNepali.month);
    if (isPastMonth) {
      finalDate = getNepaliMonthEndAd(target.year, target.month);
    }

    const updated = await Aggregation.findByIdAndUpdate(id, {
      ...data,
      date: finalDate
    }, { new: true });
    if (!updated) throw new Error("Failed to update aggregation record");

    // Handle user advanceBalance and linked Deposit transitions
    const oldIsAdvance = oldVal.type === "ADVANCE" && oldVal.memberId;
    const newIsAdvance = updated.type === "ADVANCE" && updated.memberId;

    if (!oldIsAdvance && newIsAdvance) {
      // Transition: Not ADVANCE -> ADVANCE
      // 1. Increment target member's advance balance
      await User.findByIdAndUpdate(updated.memberId!, {
        $inc: { advanceBalance: updated.amount }
      });

      // 2. Create linked Deposit record
      await Deposit.create({
        userId: updated.memberId!,
        organizationId: updated.organizationId,
        amount: 0,
        advancedPayment: updated.amount,
        month: updated.month,
        depositType: "ADVANCE",
        depositDate: updated.date,
        status: "APPROVED",
        remarks: `[AGGREGATION CREDIT] ${updated.remarks || ""}`,
        verifiedBy: (session.user as any).id,
        aggregationId: updated._id
      });
    } else if (oldIsAdvance && !newIsAdvance) {
      // Transition: ADVANCE -> Not ADVANCE
      // 1. Decrement old member's advance balance
      await User.findByIdAndUpdate(oldVal.memberId!, {
        $inc: { advanceBalance: -oldVal.amount }
      });

      // 2. Delete linked Deposit record (with legacy fallback)
      let deletedDep = await Deposit.findOneAndDelete({ aggregationId: updated._id });
      if (!deletedDep) {
        await Deposit.findOneAndDelete({
          userId: oldVal.memberId!,
          organizationId: oldVal.organizationId,
          advancedPayment: oldVal.amount,
          depositType: "ADVANCE",
          remarks: { $regex: `\\[AGGREGATION CREDIT\\].*${oldVal.remarks || ""}`, $options: 'i' }
        });
      }
    } else if (oldIsAdvance && newIsAdvance) {
      // Transition: ADVANCE -> ADVANCE
      const memberChanged = oldVal.memberId!.toString() !== updated.memberId!.toString();

      if (memberChanged) {
        // Member changed: Revert old member's balance, increment new member's balance
        await User.findByIdAndUpdate(oldVal.memberId!, {
          $inc: { advanceBalance: -oldVal.amount }
        });
        await User.findByIdAndUpdate(updated.memberId!, {
          $inc: { advanceBalance: updated.amount }
        });
      } else {
        // Same member: Adjust balance by difference
        const diff = updated.amount - oldVal.amount;
        if (diff !== 0) {
          await User.findByIdAndUpdate(updated.memberId!, {
            $inc: { advanceBalance: diff }
          });
        }
      }

      // Update linked Deposit (with legacy fallback)
      let deposit = await Deposit.findOne({ aggregationId: updated._id });
      if (!deposit) {
        // Legacy fallback
        deposit = await Deposit.findOne({
          userId: oldVal.memberId!,
          organizationId: oldVal.organizationId,
          depositType: "ADVANCE",
          remarks: { $regex: `\\[AGGREGATION CREDIT\\].*`, $options: 'i' }
        });
      }

      if (deposit) {
        deposit.userId = updated.memberId!;
        deposit.amount = 0;
        deposit.advancedPayment = updated.amount;
        deposit.month = updated.month;
        deposit.depositType = "ADVANCE";
        deposit.depositDate = updated.date;
        deposit.status = "APPROVED";
        deposit.remarks = `[AGGREGATION CREDIT] ${updated.remarks || ""}`;
        deposit.verifiedBy = (session.user as any).id;
        deposit.aggregationId = updated._id;
        await deposit.save();
      } else {
        // Create if it didn't exist for some reason
        await Deposit.create({
          userId: updated.memberId!,
          organizationId: updated.organizationId,
          amount: 0,
          advancedPayment: updated.amount,
          month: updated.month,
          depositType: "ADVANCE",
          depositDate: updated.date,
          status: "APPROVED",
          remarks: `[AGGREGATION CREDIT] ${updated.remarks || ""}`,
          verifiedBy: (session.user as any).id,
          aggregationId: updated._id
        });
      }
    }

    // Create Audit Log
    await AdminAudit.create({
      adminId: (session.user as any).id,
      organizationId: oldVal.organizationId,
      action: "UPDATE_AGGREGATION",
      oldValues: oldVal.toObject(),
      newValues: updated?.toObject() || {},
      status: "SUCCESS"
    });

    const monthsToReconcile = new Set<string>([oldVal.month]);
    if (updated.month) monthsToReconcile.add(updated.month);
    for (const m of monthsToReconcile) {
      await reconcileMonthlyTotals(oldVal.organizationId.toString(), m).catch(console.error);
    }

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard", "layout");
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAggregation(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      throw new Error("Unauthorized: Administrative access required");
    }

    await connectDB();
    const oldVal = await Aggregation.findById(id);
    if (!oldVal) throw new Error("Aggregation record not found");

    await Aggregation.findByIdAndDelete(id);

    // Reverse member credit if it was an ADVANCE type
    if (oldVal.type === "ADVANCE" && oldVal.memberId) {
      await User.findByIdAndUpdate(oldVal.memberId, {
        $inc: { advanceBalance: -oldVal.amount }
      });
      // Optionally delete the linked Deposit record
      let deletedDep = await Deposit.findOneAndDelete({ aggregationId: oldVal._id });
      if (!deletedDep) {
        // Legacy fallback
        await Deposit.findOneAndDelete({
          userId: oldVal.memberId,
          organizationId: oldVal.organizationId,
          advancedPayment: oldVal.amount,
          depositType: "ADVANCE",
          remarks: { $regex: `\\[AGGREGATION CREDIT\\].*${oldVal.remarks || ""}`, $options: 'i' }
        });
      }
    }

    // Create Audit Log
    await AdminAudit.create({
      adminId: (session.user as any).id,
      organizationId: oldVal.organizationId,
      action: "DELETE_AGGREGATION",
      oldValues: oldVal.toObject(),
      status: "SUCCESS"
    });

    await reconcileMonthlyTotals(oldVal.organizationId.toString(), oldVal.month).catch(console.error);

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

export async function transferAggregationCredit(params: {
  aggregationId: string;
  targetMemberId: string;
  adminId: string;
  amount: number;
}) {
  try {
    await connectDB();

    const agg = await Aggregation.findById(params.aggregationId);
    if (!agg) throw new Error("Aggregation record not found");
    if (agg.type !== "ADVANCE" || !agg.memberId) {
      throw new Error("Only ADVANCE type aggregations can be transferred");
    }

    const enteredAmount = params.amount;
    if (!enteredAmount || enteredAmount <= 0) {
      throw new Error("Transfer amount must be greater than zero");
    }
    if (enteredAmount > agg.amount) {
      throw new Error(`Transfer amount (Rs. ${enteredAmount}) cannot exceed the aggregation's credit amount (Rs. ${agg.amount})`);
    }

    const sourceMemberId = agg.memberId.toString();
    const destinationMemberId = params.targetMemberId;

    if (sourceMemberId === destinationMemberId) {
      throw new Error("Cannot transfer credit to the same member");
    }

    const [sourceMember, destMember] = await Promise.all([
      User.findById(sourceMemberId),
      User.findById(destinationMemberId)
    ]);

    if (!sourceMember) throw new Error("Source member not found");
    if (!destMember) throw new Error("Destination member not found");
    if (!destMember.isActive) throw new Error("Destination member is disabled");
    if (!destMember.organizationId || destMember.organizationId.toString() !== agg.organizationId.toString()) {
      throw new Error("Destination member does not belong to the same organization");
    }

    // Check if source member has enough advance balance
    if ((sourceMember.advanceBalance || 0) < enteredAmount) {
      throw new Error(`Insufficient advance balance. Source member only has Rs. ${sourceMember.advanceBalance || 0} remaining, but you requested to transfer Rs. ${enteredAmount}.`);
    }

    // Update balances
    sourceMember.advanceBalance = (sourceMember.advanceBalance || 0) - enteredAmount;
    destMember.advanceBalance = (destMember.advanceBalance || 0) + enteredAmount;

    const sourceName = sourceMember.name;
    const destName = destMember.name;

    // Save members
    await Promise.all([
      sourceMember.save(),
      destMember.save()
    ]);

    // Check if full or partial transfer
    const isFullTransfer = Math.abs(enteredAmount - agg.amount) < 0.01;

    if (isFullTransfer) {
      // Full transfer: just change ownership of the aggregation and linked deposit
      const oldRemarks = agg.remarks || "";
      agg.memberId = new mongoose.Types.ObjectId(destinationMemberId);
      agg.remarks = `${oldRemarks} (Transferred Rs. ${enteredAmount} from ${sourceName} to ${destName})`.trim();
      await agg.save();

      const linkedDeposit = await Deposit.findOne({ aggregationId: agg._id });
      if (linkedDeposit) {
        linkedDeposit.userId = new mongoose.Types.ObjectId(destinationMemberId);
        const oldDepRemarks = linkedDeposit.remarks || "";
        linkedDeposit.remarks = `${oldDepRemarks} (Transferred Rs. ${enteredAmount} from ${sourceName} to ${destName})`.trim();
        await linkedDeposit.save();
      }
    } else {
      // Partial transfer:
      // 1. Deduct amount from original aggregation
      const oldRemarks = agg.remarks || "";
      agg.amount = agg.amount - enteredAmount;
      agg.remarks = `${oldRemarks} (Transferred Rs. ${enteredAmount} portion to ${destName})`.trim();
      await agg.save();

      // 2. Create a new aggregation for the destination member
      const newAgg = await Aggregation.create({
        organizationId: agg.organizationId,
        adminId: new mongoose.Types.ObjectId(params.adminId),
        type: "ADVANCE",
        memberId: new mongoose.Types.ObjectId(destinationMemberId),
        amount: enteredAmount,
        month: agg.month,
        date: agg.date,
        remarks: `[PARTIAL TRANSFER] Received Rs. ${enteredAmount} of credit from ${sourceName}`
      });

      // 3. Update original Deposit to reflect reduced amount
      const linkedDeposit = await Deposit.findOne({ aggregationId: agg._id });
      if (linkedDeposit) {
        linkedDeposit.advancedPayment = linkedDeposit.advancedPayment - enteredAmount;
        const oldDepRemarks = linkedDeposit.remarks || "";
        linkedDeposit.remarks = `${oldDepRemarks} (Transferred Rs. ${enteredAmount} portion to ${destName})`.trim();
        await linkedDeposit.save();
      }

      // 4. Create a new Deposit history record for the destination member
      await Deposit.create({
        userId: new mongoose.Types.ObjectId(destinationMemberId),
        organizationId: agg.organizationId,
        amount: 0,
        advancedPayment: enteredAmount,
        month: agg.month,
        depositType: "ADVANCE",
        depositDate: agg.date,
        status: "APPROVED",
        remarks: `[AGGREGATION CREDIT] [PARTIAL TRANSFER] Received from ${sourceName}`,
        verifiedBy: new mongoose.Types.ObjectId(params.adminId),
        aggregationId: newAgg._id
      });
    }

    // Revalidate paths
    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard", "layout");

    // Reconcile totals just in case
    await reconcileMonthlyTotals(agg.organizationId.toString(), agg.month).catch(console.error);

    // Create Audit Log
    await AdminAudit.create({
      adminId: params.adminId,
      organizationId: agg.organizationId,
      action: "TRANSFER_CREDIT",
      oldValues: { memberId: sourceMemberId, amount: agg.amount + (isFullTransfer ? 0 : enteredAmount) },
      newValues: { memberId: destinationMemberId, amount: enteredAmount },
      status: "SUCCESS"
    });

    return { success: true };
  } catch (error: any) {
    console.error("[TRANSFER_CREDIT_ERROR]:", error);
    return { success: false, error: error.message };
  }
}

export async function transferMemberCreditDirect(params: {
  senderId: string;
  targetMemberId: string;
  amount: number;
  remarks?: string;
}) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new Error("Unauthorized: Session not found");
    }

    const curUser = session.user as any;
    const sender = await User.findById(params.senderId);
    if (!sender) throw new Error("Sender member not found");
    if (!sender.organizationId) throw new Error("Sender has no organization assigned");

    const isAuthorized = curUser.id === params.senderId || 
                         (sender.guardianId && sender.guardianId.toString() === curUser.id);
    if (!isAuthorized && curUser.role !== "ADMIN" && curUser.role !== "DEVELOPER") {
      throw new Error("Unauthorized: Cannot transfer from this account");
    }

    const amount = params.amount;
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Amount must be greater than zero");
    }

    if ((sender.advanceBalance || 0) < amount) {
      throw new Error(`Insufficient advance balance. Available: Rs. ${sender.advanceBalance || 0}`);
    }

    const receiver = await User.findById(params.targetMemberId);
    if (!receiver) throw new Error("Destination member not found");
    if (!receiver.isActive) throw new Error("Destination member is inactive");
    if (receiver.organizationId?.toString() !== sender.organizationId?.toString()) {
      throw new Error("Destination member belongs to a different organization");
    }

    if (params.senderId === params.targetMemberId) {
      throw new Error("Cannot transfer credit to yourself");
    }

    // Perform atomic balance updates
    sender.advanceBalance = (sender.advanceBalance || 0) - amount;
    receiver.advanceBalance = (receiver.advanceBalance || 0) + amount;

    await Promise.all([sender.save(), receiver.save()]);

    const currentNepali = getCurrentNepaliDate();
    const monthStr = `${currentNepali.monthName} ${currentNepali.year}`;
    const dateNow = new Date();

    // Create Deposit log for sender (deduction)
    const senderDeposit = await Deposit.create({
      userId: sender._id,
      organizationId: sender.organizationId,
      amount: 0,
      advancedPayment: -amount,
      month: monthStr,
      depositType: "ADVANCE",
      depositDate: dateNow,
      status: "APPROVED",
      remarks: params.remarks || `Transferred Rs. ${amount} credit to ${receiver.name} (Acc: #${receiver.accountNumber})`,
    });

    // Create Deposit log for receiver (addition)
    const receiverDeposit = await Deposit.create({
      userId: receiver._id,
      organizationId: receiver.organizationId,
      amount: 0,
      advancedPayment: amount,
      month: monthStr,
      depositType: "ADVANCE",
      depositDate: dateNow,
      status: "APPROVED",
      remarks: `Received Rs. ${amount} credit from ${sender.name} (Acc: #${sender.accountNumber})`,
    });

    // Create Notifications
    await Notification.create([
      {
        senderId: sender._id,
        recipientId: receiver._id,
        relatedId: receiverDeposit._id,
        title: "Credit Received",
        message: `You have received Rs. ${amount} advance credit from ${sender.name}.`,
        type: "SUCCESS",
        isRead: false,
      },
      {
        senderId: sender._id,
        recipientId: sender._id,
        relatedId: senderDeposit._id,
        title: "Credit Sent",
        message: `Successfully transferred Rs. ${amount} advance credit to ${receiver.name}.`,
        type: "INFO",
        isRead: false,
      }
    ]);

    // Reconcile totals
    await reconcileMonthlyTotals(sender.organizationId.toString(), monthStr).catch(console.error);

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard/loans");
    revalidatePath("/dashboard/deposits");
    revalidatePath("/dashboard", "layout");

    return { success: true };
  } catch (error: any) {
    console.error("[MEMBER_TRANSFER_CREDIT_ERROR]:", error);
    return { success: false, error: error.message };
  }
}
