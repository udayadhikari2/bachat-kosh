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
    const agg = await Aggregation.create({
      ...data,
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
        depositDate: data.date || new Date(),
        status: "APPROVED",
        remarks: `[AGGREGATION CREDIT] ${data.remarks || ""}`,
        verifiedBy: (session.user as any).id
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

    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard");
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

    const updated = await Aggregation.findByIdAndUpdate(id, data, { new: true });

    // Create Audit Log
    await AdminAudit.create({
      adminId: (session.user as any).id,
      organizationId: oldVal.organizationId,
      action: "UPDATE_AGGREGATION",
      oldValues: oldVal.toObject(),
      newValues: updated.toObject(),
      status: "SUCCESS"
    });

    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard");
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
      await Deposit.findOneAndDelete({
        userId: oldVal.memberId,
        organizationId: oldVal.organizationId,
        advancedPayment: oldVal.amount,
        depositType: "ADVANCE",
        remarks: { $regex: `\\[AGGREGATION CREDIT\\].*${oldVal.remarks || ""}`, $options: 'i' }
      });
    }

    // Create Audit Log
    await AdminAudit.create({
      adminId: (session.user as any).id,
      organizationId: oldVal.organizationId,
      action: "DELETE_AGGREGATION",
      oldValues: oldVal.toObject(),
      status: "SUCCESS"
    });

    revalidatePath("/dashboard/deposits/aggregation");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
