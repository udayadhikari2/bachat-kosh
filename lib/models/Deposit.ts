import mongoose, { Schema, Document } from "mongoose";

export interface IDeposit extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  depositType: "MONTHLY" | "SERVICE_CHARGE" | "LOAN_INTEREST";
  amount: number;
  advancedPayment: number; // Extra amount paid above the required deposit
  creditUsed: number; // Amount covered by stored global credits
  month: string;
  depositDate: Date;
  proof: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  fineApplied: number;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepositSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    depositType: { 
      type: String, 
      enum: ["MONTHLY", "SERVICE_CHARGE", "LOAN_INTEREST"],
      default: "MONTHLY"
    },
    amount: { type: Number, required: true },
    advancedPayment: { type: Number, default: 0 }, // Overpayment tracked per deposit
    creditUsed: { type: Number, default: 0 }, // Portion paid via global balance
    month: { type: String, required: true },
    depositDate: { type: Date, default: Date.now },
    proof: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    fineApplied: { type: Number, default: 0 },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Deposit ||
  mongoose.model<IDeposit>("Deposit", DepositSchema);
