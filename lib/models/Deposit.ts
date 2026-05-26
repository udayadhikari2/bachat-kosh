import mongoose, { Schema, Document } from "mongoose";

export interface IDeposit extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  depositType: "MONTHLY" | "SERVICE_CHARGE" | "LOAN_INTEREST" | "ADVANCE" | "NAV" | "MISCELLANEOUS";
  amount: number;
  advancedPayment: number;
  creditUsed: number;
  month: string;
  depositDate: Date;
  proof: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  fineApplied: number;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  remarks?: string;
  aggregationId?: mongoose.Types.ObjectId;
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
      enum: ["MONTHLY", "SERVICE_CHARGE", "LOAN_INTEREST", "ADVANCE", "NAV", "MISCELLANEOUS"],
      default: "MONTHLY"
    },
    amount: { type: Number, required: true },
    advancedPayment: { type: Number, default: 0 },
    creditUsed: { type: Number, default: 0 },
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
    remarks: { type: String },
    aggregationId: { type: Schema.Types.ObjectId, ref: "Aggregation" },
  },
  { timestamps: true }
);

const Deposit = mongoose.models.Deposit || mongoose.model<IDeposit>("Deposit", DepositSchema);

// Force sync the schema if remarks or new enums are missing from the compiled model (common in dev HMR)
if (Deposit.schema) {
  if (!Deposit.schema.paths['remarks']) {
    Deposit.schema.add({ remarks: { type: String } });
  }
  // Force update enum validation if it's stale
  const typePath = Deposit.schema.path('depositType') as any;
  if (typePath && typePath.enumValues && !typePath.enumValues.includes('NAV')) {
    typePath.enumValues.push('NAV', 'MISCELLANEOUS');
  }
}

export default Deposit;
