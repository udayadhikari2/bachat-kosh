"use server";

import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { uploadFile } from "@/lib/utils/upload";

export async function createUser(formData: FormData) {
  try {
    await connectDB();
    
    const name = formData.get("name") as string;
    const nickname = formData.get("nickname") as string;
    const email = formData.get("email") as string;
    const password = (formData.get("password") as string) || "User@123";
    const role = (formData.get("role") as string) || "USER";
    const organizationId = formData.get("organizationId") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const committeeRole = formData.get("committeeRole") as string;
    const isLoanApprover = formData.get("isLoanApprover") === "true";
    const isSecondaryAdmin = formData.get("isSecondaryAdmin") === "true";
    const phoneNumber = formData.get("phoneNumber") as string;
    const gender = formData.get("gender") as string;
    
    // New Fields
    const dobStr = formData.get("dateOfBirth") as string;
    const dateOfBirth = dobStr ? new Date(dobStr) : undefined;
    
    // Minor Logic
    let isMinor = false;
    if (dateOfBirth) {
      const age = new Date().getFullYear() - dateOfBirth.getFullYear();
      if (age < 16) isMinor = true;
    }
    
    const guardianId = formData.get("guardianId") as string;
    const familyMembersStr = formData.get("familyMembers") as string;
    let familyMembers = [];
    try {
      familyMembers = familyMembersStr ? JSON.parse(familyMembersStr) : [];
    } catch (e) {
      console.error("Failed to parse familyMembers:", familyMembersStr);
      familyMembers = [];
    }
    console.log("Parsed familyMembers:", familyMembers);
    
    const address = {
      street: formData.get("street") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zip: formData.get("zip") as string,
    };

    // File Uploads
    const profileImageFile = formData.get("profileImage") as File;
    const identityDocumentFile = formData.get("identityDocument") as File;
    
    const profileImage = await uploadFile(profileImageFile);
    const identityDocument = await uploadFile(identityDocumentFile);

    if (role === "DEVELOPER") {
      const existingDev = await User.findOne({ role: "DEVELOPER" });
      if (existingDev) {
        return { success: false, error: "Only one Developer account is allowed." };
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const newUser = await User.create({
      name,
      nickname,
      email,
      password: hashedPassword,
      role,
      organizationId,
      accountNumber,
      committeeRole,
      isLoanApprover,
      isSecondaryAdmin,
      isActive: true,
      dateOfBirth,
      isMinor,
      guardianId: guardianId || undefined,
      profileImage: profileImage || undefined,
      identityDocument: identityDocument || undefined,
      address,
      familyMembers,
      phoneNumber,
      gender,
    });
    
    revalidatePath("/dashboard/users");
    return { success: true, data: JSON.parse(JSON.stringify(newUser)) };
  } catch (error: any) {
    if (error.code === 11000) {
      if (error.keyValue?.email) return { success: false, error: "Email already exists" };
      if (error.keyValue?.accountNumber) return { success: false, error: "Account Number already exists" };
      return { success: false, error: "Duplicate entry detected" };
    }
    return { success: false, error: error.message };
  }
}

export async function updateUser(id: string, formData: FormData) {
  try {
    await connectDB();
    
    const updates: any = {};

    const fields = ["name", "nickname", "email", "role", "accountNumber", "committeeRole", "phoneNumber", "gender"];
    fields.forEach((field) => {
      if (formData.has(field)) {
        updates[field] = formData.get(field);
      }
    });

    if (formData.has("isLoanApprover")) {
      updates.isLoanApprover = formData.get("isLoanApprover") === "true";
    }
    if (formData.has("isSecondaryAdmin")) {
      updates.isSecondaryAdmin = formData.get("isSecondaryAdmin") === "true";
    }

    const dobStr = formData.get("dateOfBirth") as string;
    if (dobStr) {
      const dateOfBirth = new Date(dobStr);
      updates.dateOfBirth = dateOfBirth;
      const age = new Date().getFullYear() - dateOfBirth.getFullYear();
      updates.isMinor = age < 16;
    }

    if (formData.has("guardianId")) {
      const gId = formData.get("guardianId");
      updates.guardianId = gId ? gId : null;
    }
    if (formData.has("organizationId")) {
      updates.organizationId = formData.get("organizationId");
    }
    
    const familyMembersStr = formData.get("familyMembers") as string;
    if (familyMembersStr !== null) {
      try {
        updates.familyMembers = familyMembersStr ? JSON.parse(familyMembersStr) : [];
      } catch (e) {
        console.error("Failed to parse familyMembers in update:", familyMembersStr);
        updates.familyMembers = [];
      }
      console.log("Parsed familyMembers for update:", updates.familyMembers);
    }

    const addressFields = ["street", "city", "state", "zip"];
    addressFields.forEach((field) => {
      if (formData.has(field)) {
        updates[`address.${field}`] = formData.get(field);
      }
    });

    // File Uploads (Optional in Update)
    const profileImageFile = formData.get("profileImage") as File;
    const identityDocumentFile = formData.get("identityDocument") as File;
    
    if (profileImageFile && profileImageFile.size > 0) {
      const profileImage = await uploadFile(profileImageFile);
      if (profileImage) updates.profileImage = profileImage;
    }
    
    if (identityDocumentFile && identityDocumentFile.size > 0) {
      const identityDocument = await uploadFile(identityDocumentFile);
      if (identityDocument) updates.identityDocument = identityDocument;
    }

    const password = formData.get("password") as string;
    if (password) updates.password = await bcrypt.hash(password, 12);
    
    await User.findByIdAndUpdate(id, updates);
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: any) {
    if (error.code === 11000) {
      if (error.keyValue?.email) return { success: false, error: "Email already exists" };
      if (error.keyValue?.accountNumber) return { success: false, error: "Account Number already exists" };
      return { success: false, error: "Duplicate entry detected" };
    }
    return { success: false, error: error.message };
  }
}

export async function getUsersByOrg(organizationId: string) {
  try {
    await connectDB();
    const query = organizationId ? { organizationId } : {};
    const users = await User.find(query)
      .populate("organizationId")
      .populate("familyMembers.memberId")
      .sort({ name: 1 });
    return { success: true, data: JSON.parse(JSON.stringify(users)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllUsers() {
  try {
    await connectDB();
    const users = await User.find({})
      .populate("organizationId")
      .populate("familyMembers.memberId")
      .sort({ createdAt: -1 });
    return { success: true, data: JSON.parse(JSON.stringify(users)) };
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
    console.log("User deleted successfully from DB:", id);
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
    if (!user || !user.password) return { success: false, error: "User or password hash not found" };
    const isValid = await bcrypt.compare(targetPass, user.password);
    console.log("Password verification for", userId, "result:", isValid);
    return { success: isValid, error: isValid ? null : "Invalid Admin Verification" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserAdvanceBalance(targetUserId: string, newAmount: number, adminId: string, adminPassword: string) {
  try {
    const authCheck = await verifyAdminPassword(adminId, adminPassword);
    if (!authCheck.success) {
      return { success: false, error: "Invalid administrator password" };
    }
    
    await connectDB();
    await User.findByIdAndUpdate(targetUserId, { advanceBalance: newAmount });
    
    // Add audit notification or trace if desired
    console.log(`[AUDIT] Admin ${adminId} updated advance balance for user ${targetUserId} to ${newAmount}`);
    
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

export async function removeFamilyMemberLink(userId: string, targetMemberId: string) {
  try {
    await connectDB();
    await User.findByIdAndUpdate(userId, {
      $pull: { familyMembers: { memberId: targetMemberId } }
    });
    revalidatePath("/dashboard/users");
    return { success: true };
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

export async function bulkImportUsers(usersData: any[], organizationId: string) {
  try {
    await connectDB();
    
    const defaultPassword = "User@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    const usersToInsert = usersData.map(u => {
      // Calculate isMinor
      let isMinor = false;
      if (u.dateOfBirth) {
        const dob = new Date(u.dateOfBirth);
        const age = new Date().getFullYear() - dob.getFullYear();
        if (age < 16) isMinor = true;
      }

      return {
        ...u,
        password: hashedPassword,
        organizationId,
        isActive: true,
        isMinor,
        role: u.role || "USER",
        address: {
          street: u.street,
          city: u.city,
          state: u.state,
          zip: u.zip
        }
      };
    });

    // Use insertMany with ordered: false to allow partial success
    const result = await User.insertMany(usersToInsert, { ordered: false });
    
    revalidatePath("/dashboard/users");
    return { success: true, count: result.length };
  } catch (error: any) {
    console.error("Bulk Import Error:", error);
    
    if (error.name === 'BulkWriteError' || error.code === 11000) {
      // If some succeeded, we still want to report success but maybe mention errors
      const insertedCount = error.result?.nInserted || 0;
      if (insertedCount > 0) {
         revalidatePath("/dashboard/users");
         return { 
           success: true, 
           count: insertedCount, 
           warning: "Some records were skipped due to duplicate email or account numbers." 
         };
      }
      return { success: false, error: "Bulk import failed. Possible duplicate emails or account numbers." };
    }
    
    return { success: false, error: error.message || "Failed to import users" };
  }
}

export async function getLinkedAccounts(userId: string) {
  try {
    await connectDB();
    const user = await User.findById(userId)
      .populate("familyMembers.memberId", "name accountNumber profileImage isMinor advanceBalance email phoneNumber")
      .lean();

    return { 
      success: true, 
      familyMembers: user ? JSON.parse(JSON.stringify(user.familyMembers)) : [] 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
