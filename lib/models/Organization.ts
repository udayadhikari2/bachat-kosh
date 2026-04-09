import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  bankDetails: {
    accountNo: string;
    accountName: string;
    bankName: string;
  };
  config: {
    monthlyDepositAmount: number;
    lateFee: number;
    interestRate: number; // Annual Rate or Monthly? User said 12% interest rate (calculated daily)
    penaltyRate: number; // 20%
    deadlineDay: number; // Last day of Nepali month
    renewalPeriod: number; // 180 days
    serviceChargeRate: number; // 0.50%
    renewalChargeRate: number; // 0.50%
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    bankDetails: {
      accountNo: { type: String, required: true },
      accountName: { type: String, required: true },
      bankName: { type: String, required: true },
    },
    config: {
      monthlyDepositAmount: { type: Number, default: 1000 },
      lateFee: { type: Number, default: 30 },
      interestRate: { type: Number, default: 12 },
      penaltyRate: { type: Number, default: 20 },
      deadlineDay: { type: Number, default: 30 }, // Simple representation, Nepali months vary
      renewalPeriod: { type: Number, default: 180 },
      serviceChargeRate: { type: Number, default: 0.5 },
      renewalChargeRate: { type: Number, default: 0.5 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
