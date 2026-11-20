import mongoose from "mongoose";

const partnerCorrectionRequestSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  partnerCode: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  reason: { type: String, required: true, trim: true, maxlength: 1000 },
  fields: { type: [String], default: [] },
  documentTypes: { type: [String], default: [] },
  status: { type: String, enum: ["open", "processing", "submitted", "revoked", "expired"], default: "open", index: true },
  expiresAt: { type: Date, required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  submittedAt: { type: Date, default: null },
  submittedFields: { type: [String], default: [] },
  submittedDocuments: { type: [String], default: [] },
}, { timestamps: true });

export default mongoose.model("PartnerCorrectionRequest", partnerCorrectionRequestSchema);
