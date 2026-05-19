import mongoose, { Schema, Document } from "mongoose";

export interface IBankLedger extends Document {
  organizationId: mongoose.Types.ObjectId;
  month: string; // e.g. "Chaitra 2080"
  openingBalance: number;
  closingBalance: number;
  bankInterest: number; // Credit
  bankCharges: number; // Debit
  totalDeposits: number; // Credit
  totalLoanDisbursed: number; // Debit
  totalLoanRepaid: number; // Credit
  totalExpenditure: number; // Debit
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankLedgerSchema: Schema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  month: { type: String, required: true },
  openingBalance: { type: Number, default: 0 },
  closingBalance: { type: Number, default: 0 },
  bankInterest: { type: Number, default: 0 },
  bankCharges: { type: Number, default: 0 },
  totalDeposits: { type: Number, default: 0 },
  totalLoanDisbursed: { type: Number, default: 0 },
  totalLoanRepaid: { type: Number, default: 0 },
  totalExpenditure: { type: Number, default: 0 },
  remarks: { type: String },
}, { timestamps: true });

// Ensure unique month per organization
BankLedgerSchema.index({ organizationId: 1, month: 1 }, { unique: true });

export default mongoose.models.BankLedger || mongoose.model<IBankLedger>("BankLedger", BankLedgerSchema);
