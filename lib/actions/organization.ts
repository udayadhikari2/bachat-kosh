"use server";

import connectDB from "@/lib/db";
import Organization from "@/lib/models/Organization";
import { revalidatePath } from "next/cache";

export async function createOrganization(formData: any) {
  try {
    await connectDB();
    
    const name = formData.get("name");
    const bankName = formData.get("bankName");
    const accountNo = formData.get("accountNo");
    const accountName = formData.get("accountName");
    const depositAmount = Number(formData.get("depositAmount") || 1000);
    const lateFee = Number(formData.get("lateFee") || 30);
    const interestRate = Number(formData.get("interestRate") || 12);
    const penaltyRate = Number(formData.get("penaltyRate") || 20);
    
    // Handle Bank QR
    const bankQrFile = formData.get("bankQr");
    let bankQr = "";
    if (bankQrFile && bankQrFile.size > 0) {
      const bytes = await bankQrFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      bankQr = `data:${bankQrFile.type};base64,${buffer.toString("base64")}`;
    }

    const newOrg = await Organization.create({
      name,
      bankDetails: {
        bankName,
        accountNo,
        accountName,
      },
      bankQr,
      config: {
        monthlyDepositAmount: depositAmount,
        lateFee,
        interestRate,
        penaltyRate,
        deadlineDay: 30, // Default to end of month
        showLiquidityWarning: formData.get("showLiquidityWarning") === "on",
        liquidityReservePercentage: Number(formData.get("liquidityReservePercentage") || 10),
      },
      isActive: true,
    });

    revalidatePath("/dashboard/organizations");
    return { success: true, data: JSON.parse(JSON.stringify(newOrg)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOrganizations() {
  try {
    await connectDB();
    const orgs = await Organization.find({}).sort({ createdAt: -1 });
    return { success: true, data: JSON.parse(JSON.stringify(orgs)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateOrganization(id: string, formData: any) {
  try {
    await connectDB();
    
    const updates: any = {
      name: formData.get("name"),
      bankDetails: {
        bankName: formData.get("bankName"),
        accountNo: formData.get("accountNo"),
        accountName: formData.get("accountName"),
      },
      config: {
        monthlyDepositAmount: Number(formData.get("depositAmount") || 1000),
        lateFee: Number(formData.get("lateFee") || 30),
        interestRate: Number(formData.get("interestRate") || 12),
        penaltyRate: Number(formData.get("penaltyRate") || 20),
        deadlineDay: 30,
        showLiquidityWarning: formData.get("showLiquidityWarning") === "on",
        liquidityReservePercentage: Number(formData.get("liquidityReservePercentage") || 10),
      }
    };

    const bankQrFile = formData.get("bankQr");
    if (bankQrFile && bankQrFile.size > 0) {
      const bytes = await bankQrFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      updates.bankQr = `data:${bankQrFile.type};base64,${buffer.toString("base64")}`;
    }

    await Organization.findByIdAndUpdate(id, updates);
    revalidatePath("/dashboard/organizations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteOrganization(id: string) {
  try {
    await connectDB();
    await Organization.findByIdAndDelete(id);
    revalidatePath("/dashboard/organizations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleOrganizationStatus(id: string, currentStatus: boolean) {
  try {
    await connectDB();
    await Organization.findByIdAndUpdate(id, { isActive: !currentStatus });
    revalidatePath("/dashboard/organizations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOrganization(id: string) {
  try {
    await connectDB();
    const org = await Organization.findById(id);
    if (!org) throw new Error("Organization not found");
    return { success: true, data: JSON.parse(JSON.stringify(org)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

