import mongoose, { Schema, Document } from "mongoose";

export interface ILoan extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  principalAmount: number;
  balanceAmount: number;
  reason: string;
  interestRate: number; // Annual Rate (e.g., 12)
  penaltyRate: number; // Rate applied after deadline (e.g., 20)
  serviceCharge: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ACTIVE" | "COMPLETED" | "OVERDUE";
  activatedAt?: Date;
  dueDate?: Date;
  interestPaid: number;
  principalPaid: number;
  penaltyPaid: number;
  renewalCount: number;
  payments: {
    date: Date;
    amount: number;
    type: "INTEREST" | "PRINCIPAL" | "PENALTY" | "RENEWAL";
    proof?: string;
    verified: boolean;
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
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "ACTIVE", "COMPLETED", "OVERDUE"],
      default: "PENDING",
    },
    activatedAt: { type: Date },
    dueDate: { type: Date },
    interestPaid: { type: Number, default: 0 },
    principalPaid: { type: Number, default: 0 },
    penaltyPaid: { type: Number, default: 0 },
    renewalCount: { type: Number, default: 0 },
    payments: [
      {
        date: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        type: {
          type: String,
          enum: ["INTEREST", "PRINCIPAL", "PENALTY", "RENEWAL"],
          required: true,
        },
        proof: { type: String },
        verified: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Loan ||
  mongoose.model<ILoan>("Loan", LoanSchema);
