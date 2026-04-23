import mongoose, { Schema, Document } from "mongoose";

export interface ILoan extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  principalAmount: number;
  balanceAmount: number;
  reason: string;
  interestRate: number; // Annual Rate (e.g., 12)
  penaltyRate: number; // Rate applied after deadline (e.g., 20)
  serviceCharge: number; // Percentage initially
  serviceChargeAmount: number; // Calculated flat amount
  renewalAmount: number;
  status: "PENDING" | "APPROVED" | "VERIFIED" | "ACTIVE" | "COMPLETED" | "REJECTED" | "OVERDUE" | "DELETED";
  approvedByIds: mongoose.Types.ObjectId[];
  verifiedById?: mongoose.Types.ObjectId;
  activatedAt?: Date;
  dueDate?: Date;
  completedAt?: Date;
  deletedAt?: Date;
  deletedById?: mongoose.Types.ObjectId;
  serviceChargeReversed: boolean;
  serviceChargePaid: number;
  renewalPaid: number;
  advancePaid: number;
  renewalCount: number;
  payments: {
    date: Date;
    amount: number;
    type: "INTEREST" | "PRINCIPAL" | "PENALTY" | "RENEWAL" | "SERVICE_CHARGE" | "ADVANCE";
    proof?: string;
    verified: boolean;
  }[];
  renewalHistory: {
    date: Date;
    renewalAmount: number;
    extensionDays: number;
    prevDueDate?: Date;
    newDueDate: Date;
    adminId: mongoose.Types.ObjectId;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    principalAmount: { type: Number, required: true },
    balanceAmount: { type: Number, required: true },
    reason: { type: String, required: true },
    interestRate: { type: Number, default: 12 },
    penaltyRate: { type: Number, default: 20 },
    serviceCharge: { type: Number, default: 0.5 },
    serviceChargeAmount: { type: Number, default: 0 },
    renewalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "VERIFIED", "ACTIVE", "COMPLETED", "REJECTED", "OVERDUE", "DELETED"],
      default: "PENDING",
    },
    approvedByIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    verifiedById: { type: Schema.Types.ObjectId, ref: "User" },
    activatedAt: { type: Date },
    dueDate: { type: Date },
    completedAt: { type: Date },
    deletedAt: { type: Date },
    deletedById: { type: Schema.Types.ObjectId, ref: "User" },
    serviceChargeReversed: { type: Boolean, default: false },
    interestPaid: { type: Number, default: 0 },
    principalPaid: { type: Number, default: 0 },
    penaltyPaid: { type: Number, default: 0 },
    serviceChargePaid: { type: Number, default: 0 },
    renewalPaid: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    renewalCount: { type: Number, default: 0 },
    payments: [
      {
        date: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        type: {
          type: String,
          enum: ["INTEREST", "PRINCIPAL", "PENALTY", "RENEWAL", "SERVICE_CHARGE", "ADVANCE"],
          required: true,
        },
        proof: { type: String },
        verified: { type: Boolean, default: false },
      },
    ],
    renewalHistory: [
      {
        date: { type: Date, default: Date.now },
        renewalAmount: { type: Number, required: true },
        extensionDays: { type: Number, required: true },
        prevDueDate: { type: Date },
        newDueDate: { type: Date, required: true },
        adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
  },
  { timestamps: true }
);

// Dev-safe model export: ensure schema updates are picked up
if (process.env.NODE_ENV === "development" && mongoose.models.Loan) {
  delete mongoose.models.Loan;
}

export default mongoose.models.Loan ||
  mongoose.model<ILoan>("Loan", LoanSchema);
