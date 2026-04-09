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

    const newOrg = await Organization.create({
      name,
      bankDetails: {
        bankName,
        accountNo,
        accountName,
      },
      config: {
        monthlyDepositAmount: depositAmount,
        lateFee,
        interestRate,
        penaltyRate,
        deadlineDay: 30, // Default to end of month
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
