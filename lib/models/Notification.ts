import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientId?: mongoose.Types.ObjectId; // Optional for directed notification
  targetRole?: "ADMIN" | "USER" | "ALL"; // Role-based broadcasting
  title: string;
  message: string;
  isRead: boolean;
  type: "INFO" | "WARNING" | "SUCCESS";
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User" },
    targetRole: { 
      type: String, 
      enum: ["ADMIN", "USER", "ALL"],
      default: "ALL"
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    type: { 
      type: String, 
      enum: ["INFO", "WARNING", "SUCCESS"],
      default: "INFO"
    },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
