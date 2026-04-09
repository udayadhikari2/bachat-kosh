import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: "DEVELOPER" | "ADMIN" | "USER";
  organizationId?: mongoose.Types.ObjectId;
  committeeRole?: "Adhyaksha" | "Upadhyaksha" | "Sachib" | "Sadasya";
  isLoanApprover: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for now, but required for login
    role: {
      type: String,
      enum: ["DEVELOPER", "ADMIN", "USER"],
      default: "USER",
    },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    accountNumber: { type: String },
    phoneNumber: { type: String },
    committeeRole: {
      type: String,
      enum: ["Adhyaksha", "Upadhyaksha", "Sachib", "Sadasya"],
    },
    isLoanApprover: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
