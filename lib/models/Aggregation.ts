import mongoose, { Schema, Document } from "mongoose";

export interface IAggregation extends Document {
  organizationId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  type: "NAV" | "MISCELLANEOUS" | "ADVANCE";
  memberId?: mongoose.Types.ObjectId;
  amount: number;
  month: string; // Target Month (e.g., "Baishak 2083")
  date: Date; // Transaction Date
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AggregationSchema: Schema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["NAV", "MISCELLANEOUS", "ADVANCE"],
      required: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    amount: { type: Number, required: true },
    month: { type: String, required: true },
    date: { type: Date, default: Date.now },
    remarks: { type: String },
  },
  { timestamps: true }
);

// Add index for fast aggregation queries
AggregationSchema.index({ organizationId: 1, month: 1, type: 1 });

if (mongoose.models.Aggregation) {
  delete (mongoose.models as any).Aggregation;
}

export default mongoose.model<IAggregation>("Aggregation", AggregationSchema);
