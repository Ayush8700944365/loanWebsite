import mongoose from "mongoose";
import { randomUUID } from "crypto";

const bankSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    minRoi: {
      type: String,
      default: "",
      trim: true,
    },
    maxLtv: {
      type: String,
      default: "",
      trim: true,
    },
    tat: {
      type: String,
      default: "",
      trim: true,
    },
    processingFee: {
      type: String,
      default: "",
      trim: true,
    },
    relationshipManager: {
      type: String,
      default: "",
      trim: true,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },
    institutionType: { type: String, enum: ["Bank", "NBFC"], default: "Bank" },
    websiteUrl: { type: String, trim: true, maxlength: 500, default: "" },
    publicDescription: { type: String, trim: true, maxlength: 1500, default: "" },
    availableLoanCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "LoanCategory" }],
    displayOrder: { type: Number, min: 0, default: 0 },
    isPublicInstitution: { type: Boolean, default: false, index: true },
    logoStorageKey: { type: String, default: "" },
    supportingDocuments: [{
      documentId: { type: String, required: true, default: () => randomUUID() },
      name: { type: String, trim: true, required: true },
      fileName: { type: String, trim: true, required: true },
      storageKey: { type: String, trim: true, required: true, select: false },
      mimeType: { type: String, trim: true, required: true },
      size: { type: Number, min: 0, default: 0 },
      uploadedAt: { type: Date, default: Date.now },
    }],
    activeFiles: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

bankSchema.index({ isPublicInstitution: 1, status: 1, displayOrder: 1, name: 1 });

const Bank = mongoose.model("Bank", bankSchema);

export default Bank;
