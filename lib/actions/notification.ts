"use server";

import connectDB from "@/lib/db";
import Notification from "@/lib/models/Notification";
import { revalidatePath } from "next/cache";

export async function sendNotification(data: {
  senderId: string;
  recipientIds?: string[]; // Array of IDs for multi-send
  targetRole?: "ADMIN" | "USER" | "ALL";
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS";
}) {
  try {
    await connectDB();
    
    if (data.recipientIds && data.recipientIds.length > 0) {
      // Send to multiple specific people
      const notifications = data.recipientIds.map(id => ({
        ...data,
        recipientId: id,
        isRead: false
      }));
      await Notification.insertMany(notifications);
    } else {
      // Send based on role or to All
      await Notification.create({
        ...data,
        isRead: false
      });
    }
    
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getNotifications(userId: string, role: string) {
  try {
    await connectDB();
    
    // Get notifications directed specifically to user or to their role
    const notifications = await Notification.find({
      $or: [
        { recipientId: userId },
        { targetRole: role },
        { targetRole: "ALL" }
      ]
    }).sort({ createdAt: -1 }).limit(20);
    
    return { success: true, data: JSON.parse(JSON.stringify(notifications)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markAsRead(notificationId: string) {
  try {
    await connectDB();
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteNotification(id: string) {
  try {
    await connectDB();
    await Notification.findByIdAndDelete(id);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
