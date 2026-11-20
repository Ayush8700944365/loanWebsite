import mongoose from "mongoose";

const partnerChangeRequestSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  partnerCode: { type: String, required: true, trim: true, index: true },
  changes: { type: mongoose.Schema.Types.Mixed, required: true, select: false },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  requestedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, trim: true, default: "", maxlength: 500 },
}, { timestamps: true });

export default mongoose.model("PartnerChangeRequest", partnerChangeRequestSchema);
