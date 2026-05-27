import mongoose, { Schema, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  bankDetails: {
    accountNo: string;
    accountName: string;
    bankName: string;
  };
  bankQr?: string; // Base64 or URL
  config: {
    monthlyDepositAmount: number;
    lateFee: number;
    interestRate: number;
    penaltyRate: number;
    deadlineDay: number;
    renewalPeriod: number;
    serviceChargeRate: number;
    renewalChargeRate: number;
    showLiquidityWarning: boolean;
    liquidityReservePercentage: number;
  };
  financials?: {
    initialMonthlyCollection: number;
    initialDelayedFine: number;
    initialServiceCharge: number;
    initialBankInterest: number;
    initialLoanInterest: number;
    initialNav: number;
    initialMiscellaneous: number;
    initialBankCharges?: number;
    initialExpenditure?: number;
    initialOpeningBalance?: number;
    initialOpeningMonth?: string;
    initialOpeningYear?: number;
    isFrameworkLocked?: boolean;
  };
  adminId?: mongoose.Types.ObjectId;
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
    bankQr: { type: String },
    config: {
      monthlyDepositAmount: { type: Number, default: 1000 },
      lateFee: { type: Number, default: 30 },
      interestRate: { type: Number, default: 12 },
      penaltyRate: { type: Number, default: 20 },
      deadlineDay: { type: Number, default: 30 },
      renewalPeriod: { type: Number, default: 180 },
      serviceChargeRate: { type: Number, default: 0.5 },
      renewalChargeRate: { type: Number, default: 0.5 },
      showLiquidityWarning: { type: Boolean, default: false },
      liquidityReservePercentage: { type: Number, default: 10 },
    },
    financials: {
      initialMonthlyCollection: { type: Number, default: 0 },
      initialDelayedFine: { type: Number, default: 0 },
      initialServiceCharge: { type: Number, default: 0 },
      initialBankInterest: { type: Number, default: 0 },
      initialLoanInterest: { type: Number, default: 0 },
      initialNav: { type: Number, default: 0 },
      initialMiscellaneous: { type: Number, default: 0 },
      initialBankCharges: { type: Number, default: 0 },
      initialExpenditure: { type: Number, default: 0 },
      initialOpeningBalance: { type: Number, default: 0 },
      initialOpeningMonth: { type: String, default: "" },
      initialOpeningYear: { type: Number, default: 0 },
      isFrameworkLocked: { type: Boolean, default: false },
    },
    adminId: { type: Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Cache-buster to handle hot-reloading issues in development
if (mongoose.models.Organization && !mongoose.models.Organization.schema.path('financials.initialBankCharges')) {
  delete (mongoose.models as any).Organization;
}

export default mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
