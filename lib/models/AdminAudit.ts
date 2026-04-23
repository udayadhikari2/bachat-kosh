import mongoose, { Schema, Document } from "mongoose";

export interface IAdminAudit extends Document {
  adminId: string;
  organizationId: string;
  action: string;
  previousValues: any;
  newValues: any;
  status: string;
  ip?: string;
  createdAt: Date;
}

const AdminAuditSchema: Schema = new Schema(
  {
    adminId: { type: String, required: true },
    organizationId: { type: String, required: true },
    action: { type: String, required: true },
    previousValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    status: { type: String, enum: ["PENDING", "SUCCESS", "FAILED"], default: "PENDING" },
    ip: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.AdminAudit ||
  mongoose.model<IAdminAudit>("AdminAudit", AdminAuditSchema);
