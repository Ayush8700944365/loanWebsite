import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  page: { type: Number, min: 0, required: true },
  x: { type: Number, min: 0, required: true },
  y: { type: Number, min: 0, required: true },
  size: { type: Number, min: 6, max: 36, default: 10 },
}, { _id: false });

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  kind: { type: String, enum: ["invoice", "mou"], required: true },
  version: { type: Number, min: 1, required: true },
  storageKey: { type: String, required: true, select: false },
  fieldSpecs: { type: [fieldSchema], default: [] },
  status: { type: String, enum: ["active", "inactive"], default: "inactive" },
  approvalNote: { type: String, trim: true, maxlength: 500, default: "" },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  activatedAt: { type: Date, default: null },
}, { timestamps: true });

templateSchema.set("toJSON", { transform(_doc, ret) { delete ret.storageKey; return ret; } });

templateSchema.index({ kind: 1, name: 1, version: 1 }, { unique: true });
templateSchema.index({ kind: 1, status: 1 });
export default mongoose.model("DocumentTemplate", templateSchema);
