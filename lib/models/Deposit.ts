import mongoose, { Schema, Document } from "mongoose";

export interface IDeposit extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  amount: number;
  month: string; // e.g., "2080-05" (Nepali Month)
  depositDate: Date;
  proof: string; // Base64 or Image URL
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
    amount: { type: Number, required: true },
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
