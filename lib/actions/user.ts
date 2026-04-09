"use server";

import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUser(formData: any) {
  try {
    await connectDB();

    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password") || "User@123"; // Default password
    const role = formData.get("role") || "USER";
    const organizationId = formData.get("organizationId");
    const accountNumber = formData.get("accountNumber");
    const committeeRole = formData.get("committeeRole");
    const isLoanApprover = formData.get("isLoanApprover") === "true";

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      organizationId,
      accountNumber,
      committeeRole,
      isLoanApprover,
      isActive: true,
    });

    revalidatePath("/dashboard/users");
    return { success: true, data: JSON.parse(JSON.stringify(newUser)) };
  } catch (error: any) {
    if (error.code === 11000) {
      return { success: false, error: "Email already exists" };
    }
    return { success: false, error: error.message };
  }
}

export async function getUsersByOrg(organizationId: string) {
  try {
    await connectDB();
    const users = await User.find({ organizationId }).sort({ name: 1 });
    return { success: true, data: JSON.parse(JSON.stringify(users)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleUserStatus(id: string, currentStatus: boolean) {
  try {
    await connectDB();
    await User.findByIdAndUpdate(id, { isActive: !currentStatus });
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUser(id: string) {
  try {
    await connectDB();
    await User.findByIdAndDelete(id);
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
