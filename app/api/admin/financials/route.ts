import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Organization from "@/lib/models/Organization";
import AdminAudit from "@/lib/models/AdminAudit";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth-config";
import { reconcileMonthlyTotals } from "@/lib/actions/bank-ledger";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, financials } = await req.json();
    const adminId = (session.user as any).id || "admin-system";

    if (!organizationId) {
      return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
    }

    await connectDB();

    const org = await Organization.findById(new mongoose.Types.ObjectId(String(organizationId)));
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Log previous values for audit
    const previousValues = { ...org.financials };

    // Atomic write — explicitly cast all values to numbers
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

    org.markModified("financials");
    await org.save();

    // Audit log
    await AdminAudit.create({
      adminId,
      organizationId,
      action: "API_FINANCIAL_UPDATE",
      previousValues,
      newValues: org.financials,
      status: "SUCCESS"
    });

    // Reconcile baseline month immediately
    if (financials.initialOpeningMonth && financials.initialOpeningYear) {
      const baselineMonthStr = `${financials.initialOpeningMonth} ${financials.initialOpeningYear}`;
      await reconcileMonthlyTotals(organizationId, baselineMonthStr).catch(console.error);
    }

    // Bust caches
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/external-funds", "layout");

    return NextResponse.json({
      success: true,
      message: "Ledger baseline committed.",
      saved: org.financials,
    });

  } catch (error: any) {
    console.error("[API_FINANCIALS_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
