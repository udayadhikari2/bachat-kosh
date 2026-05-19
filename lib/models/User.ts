import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  nickname?: string;
  email: string;
  password?: string;
  role: "DEVELOPER" | "ADMIN" | "USER";
  organizationId?: mongoose.Types.ObjectId;
  accountNumber?: string;
  phoneNumber?: string;
  committeeRole?: "Adhyaksha" | "Upadhyaksha" | "Sachib" | "Sadasya";
  isLoanApprover: boolean;
  isSecondaryAdmin: boolean;
  isActive: boolean;
  advanceBalance: number;
  
  // New Fields
  dateOfBirth?: Date;
  isMinor: boolean;
  guardianId?: mongoose.Types.ObjectId;
  profileImage?: string;
  identityDocument?: string;
  gender?: "Male" | "Female" | "Other";
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  familyMembers: { 
    memberId: mongoose.Types.ObjectId; 
    relationship: string; 
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    nickname: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    role: {
      type: String,
      enum: ["DEVELOPER", "ADMIN", "USER"],
      default: "USER",
    },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    accountNumber: { type: String, required: true, unique: true, trim: true },
    phoneNumber: { type: String },
    committeeRole: {
      type: String,
      enum: ["Adhyaksha", "Upadhyaksha", "Sachib", "Sadasya"],
    },
    isLoanApprover: { type: Boolean, default: false },
    isSecondaryAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    advanceBalance: { type: Number, default: 0 },

    // New Fields Implementation
    dateOfBirth: { type: Date },
    isMinor: { type: Boolean, default: false },
    guardianId: { type: Schema.Types.ObjectId, ref: "User" },
    profileImage: { type: String },
    identityDocument: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
    },
    familyMembers: [
      {
        memberId: { type: Schema.Types.ObjectId, ref: "User" },
        relationship: { type: String },
      },
    ],
  },
  { timestamps: true }
);

if (mongoose.models.User) {
  delete (mongoose.models as any).User;
}

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
