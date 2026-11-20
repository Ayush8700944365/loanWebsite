import mongoose from "mongoose";

const partnerAuditEventSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  actorRole: { type: String, enum: ["admin", "partner", "system"], required: true },
  action: { type: String, required: true, trim: true, maxlength: 80 },
  documentId: { type: String, trim: true, default: "" },
  details: { type: String, trim: true, default: "", maxlength: 240 },
}, { timestamps: true });

export default mongoose.model("PartnerAuditEvent", partnerAuditEventSchema);
