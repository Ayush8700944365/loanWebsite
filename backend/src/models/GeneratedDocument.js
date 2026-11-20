import mongoose from "mongoose";

const generatedDocumentSchema = new mongoose.Schema({
  documentCode: { type: String, required: true, unique: true },
  kind: { type: String, enum: ["invoice", "mou"], required: true },
  leadCode: { type: String, required: true, index: true },
  partnerCode: { type: String, default: "", index: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: "DocumentTemplate", required: true },
  templateVersion: { type: Number, required: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", default: null },
  storageKey: { type: String, required: true, select: false },
  fileName: { type: String, required: true },
  size: { type: Number, min: 0, required: true },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

generatedDocumentSchema.set("toJSON", { transform(_doc, ret) { delete ret.storageKey; return ret; } });

generatedDocumentSchema.index({ leadCode: 1, generatedAt: -1 });
generatedDocumentSchema.index({ partnerCode: 1, generatedAt: -1 });
export default mongoose.model("GeneratedDocument", generatedDocumentSchema);
