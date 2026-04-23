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
    const password = formData.get("password") || "User@123";
    const role = formData.get("role") || "USER";
    if (role === "DEVELOPER") {
      const existingDev = await User.findOne({ role: "DEVELOPER" });
      if (existingDev) {
        return { success: false, error: "Only one Developer account is allowed." };
      }
    }
    const organizationId = formData.get("organizationId");
    const accountNumber = formData.get("accountNumber");
    const committeeRole = formData.get("committeeRole");
    const isLoanApprover = formData.get("isLoanApprover") === "true";
    const isSecondaryAdmin = formData.get("isSecondaryAdmin") === "true";
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
      isSecondaryAdmin,
      isActive: true,
    });
    revalidatePath("/dashboard/users");
    return { success: true, data: JSON.parse(JSON.stringify(newUser)) };
  } catch (error: any) {
    if (error.code === 11000) return { success: false, error: "Email already exists" };
    return { success: false, error: error.message };
  }
}

export async function getUsersByOrg(organizationId: string) {
  try {
    await connectDB();
    const query = organizationId ? { organizationId } : {};
    const users = await User.find(query).populate("organizationId").sort({ name: 1 });
    return { success: true, data: JSON.parse(JSON.stringify(users)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllUsers() {
  try {
    await connectDB();
    const users = await User.find({}).populate("organizationId").sort({ createdAt: -1 });
    return { success: true, data: JSON.parse(JSON.stringify(users)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUser(id: string, formData: any) {
  try {
    await connectDB();
    const updates: any = {
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
      accountNumber: formData.get("accountNumber"),
      committeeRole: formData.get("committeeRole"),
      isLoanApprover: formData.get("isLoanApprover") === "true",
      isSecondaryAdmin: formData.get("isSecondaryAdmin") === "true",
    };
    if (formData.get("organizationId")) updates.organizationId = formData.get("organizationId");
    const password = formData.get("password");
    if (password) updates.password = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(id, updates);
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleUserStatus(id: string, currentStatus: boolean) {
  try {
    await connectDB();
    const targetUser = await User.findById(id);
    if (targetUser?.role === "DEVELOPER") return { success: false, error: "The Developer account cannot be disabled." };
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
    const targetUser = await User.findById(id);
    if (targetUser?.role === "DEVELOPER") return { success: false, error: "The Developer account is protected and cannot be deleted." };
    await User.findByIdAndDelete(id);
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function verifyAdminPassword(userId: string, targetPass: string) {
  try {
    await connectDB();
    const user = await User.findById(userId).select("+password");
    if (!user) return { success: false, error: "User not found" };
    const isValid = await bcrypt.compare(targetPass, user.password);
    return { success: isValid, error: isValid ? null : "Invalid Admin Verification" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUserBalance(userId: string) {
  try {
    await connectDB();
    const user = await User.findById(userId).select("advanceBalance");
    return { success: true, balance: user?.advanceBalance || 0 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
