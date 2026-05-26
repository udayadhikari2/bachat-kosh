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
import { parseNepaliMonth, getDaysInMonth, bsToAd, getCurrentNepaliDate } from "@/lib/utils/nepali-date";

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
      const lastDay = getDaysInMonth(target.year, target.month);
      finalDate = bsToAd(target.year, target.month, lastDay);
      finalDate.setHours(23, 59, 59, 999);
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
      const lastDay = getDaysInMonth(target.year, target.month);
      finalDate = bsToAd(target.year, target.month, lastDay);
      finalDate.setHours(23, 59, 59, 999);
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
