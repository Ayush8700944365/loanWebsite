import mongoose from "mongoose";
import { randomUUID } from "crypto";

const leadNoteSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      trim: true,
      default: "System",
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, enum: ["admin", "employee", "partner", "system", "public"], default: "system" },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

const leadDocumentSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, default: () => randomUUID() },
    name: { type: String, trim: true, required: true },
    fileName: { type: String, trim: true, default: "" },
    type: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "", maxlength: 500 },
    // Kept only for legacy compatibility; never serialized to API responses.
    fileUrl: { type: String, trim: true, default: "", select: false },
    storageKey: { type: String, trim: true, default: "", select: false },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, min: 0, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    version: { type: Number, min: 1, default: 1 },
    status: { type: String, enum: ["pending", "approved", "rejected", "reupload_requested"], default: undefined },
    rejectionReason: { type: String, trim: true, default: "" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    uploadedByRole: { type: String, enum: ["customer", "admin", "employee", "legacy"], default: "legacy" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviews: [{
      status: { type: String, enum: ["approved", "rejected", "reupload_requested"], required: true },
      reason: { type: String, trim: true, default: "" },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      reviewedAt: { type: Date, required: true },
      version: { type: Number, required: true },
    }],
    history: [{
      version: Number,
      storageKey: String,
      fileName: String,
      mimeType: String,
      size: Number,
      uploadedAt: Date,
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      status: { type: String, enum: ["pending", "approved", "rejected", "reupload_requested"] },
      rejectionReason: String,
      description: String,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reviewedAt: Date,
    }],
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const leadTimelineSchema = new mongoose.Schema(
  {
    step: { type: String, required: true, trim: true },
    user: { type: String, trim: true, default: "System" },
    status: {
      type: String,
      enum: ["completed", "current", "upcoming"],
      default: "completed",
    },
  },
  { timestamps: true },
);

const leadSchema = new mongoose.Schema(
  {
    leadCode: {
      type: String,
      unique: true,
      index: true,
      default: () => `RC-LD-${randomUUID()}`,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    dob: { type: Date, default: null },
    gender: { type: String, trim: true, default: "" },

    leadType: {
      type: String,
      enum: ["SBI", "Non-SBI"],
      default: "SBI",
    },

    preferredBank: {
      type: String,
      trim: true,
      default: "",
    },

    loanCategory: {
      type: String,
      required: true,
      trim: true,
    },

    loanAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    monthlyIncome: { type: Number, default: 0, min: 0 },
    applicantIncome: { type: Number, default: 0, min: 0 },
    employmentType: { type: String, trim: true, default: "" },
    tenureYears: { type: Number, default: 0, min: 0 },
    sanctionedAmount: { type: Number, default: 0, min: 0 },
    propertyValuation: { type: Number, default: 0, min: 0 },
    ltv: { type: Number, default: 0, min: 0, max: 100 },
    cibilScore: { type: Number, default: 0, min: 0, max: 900 },
    city: { type: String, trim: true, default: "" },
    propertyAddress: { type: String, trim: true, default: "" },

    currentStatus: {
      type: String,
      enum: [
        "New",
        "Pending",
        "Contacted",
        "In Process",
        "Interested",
        "Verified",
        "Follow-up",
        "Approved",
        "Sanctioned",
        "Invoice Generated",
        "Disbursed",
        "Payout Complete",
        "Rejected",
        "Invoice Rejected",
      ],
      default: "New",
    },

    statusHistory: [{
      fromStatus: { type: String, default: "" },
      toStatus: { type: String, required: true },
      reason: { type: String, default: "", trim: true, maxlength: 1000 },
      actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      actorRole: { type: String, enum: ["admin", "employee", "partner", "system"], default: "system" },
      actorName: { type: String, default: "", trim: true },
      at: { type: Date, default: Date.now },
    }],
    disbursementUpdate: {
      status: { type: String, enum: ["none", "pending_confirmation", "confirmed", "rejected"], default: "none" },
      amount: { type: Number, min: 0, default: 0 },
      reference: { type: String, trim: true, default: "", maxlength: 120 },
      bankName: { type: String, trim: true, default: "", maxlength: 120 },
      disbursementDate: { type: Date, default: null },
      remarks: { type: String, trim: true, default: "", maxlength: 1000 },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      submittedAt: { type: Date, default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reviewedAt: { type: Date, default: null },
      reviewReason: { type: String, trim: true, default: "", maxlength: 500 },
      evidence: [{
        storageKey: { type: String, trim: true, select: false },
        fileName: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, min: 0 },
      }],
      history: [{
        status: { type: String, enum: ["submitted", "confirmed", "rejected"], required: true },
        amount: { type: Number, min: 0 },
        reference: { type: String, trim: true, maxlength: 120 },
        bankName: { type: String, trim: true, maxlength: 120, default: "" },
        disbursementDate: { type: Date, default: null },
        remarks: { type: String, trim: true, maxlength: 1000, default: "" },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        actorRole: { type: String, enum: ["admin", "partner", "system"], default: "system" },
        reason: { type: String, trim: true, maxlength: 500, default: "" },
        at: { type: Date, default: Date.now },
      }],
    },

    assignedEmployeeId: {
      type: String,
      trim: true,
      default: null,
    },

    assignedEmployee: {
      type: String,
      trim: true,
      default: "",
    },

    partnerId: {
      type: String,
      trim: true,
      default: null,
    },

    partnerName: {
      type: String,
      trim: true,
      default: "",
    },
    partnerAssignmentHistory: [{ partnerId: String, partnerName: String, previousPartnerId: { type: String, default: "" }, previousPartnerName: { type: String, default: "" }, note: { type: String, trim: true, default: "", maxlength: 1000 }, actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, actorRole: { type: String, enum: ["admin", "employee"] }, at: { type: Date, default: Date.now } }],

    source: {
      type: String,
      enum: ["Website", "Partner Referral", "Admin", "Employee", "Other"],
      default: "Website",
    },

    submittedBy: { type: String, trim: true, default: "" },
    submitterContact: { type: String, trim: true, default: "" },

    cbsAccountNo: {
      type: String,
      trim: true,
      default: "",
    },

    rinnrakshaAmount: { type: Number, default: 0, min: 0 },
    loanPayoutAmount: { type: Number, default: 0, min: 0 },
    invoiceAmount: { type: Number, default: 0, min: 0 },
    interestRate: { type: Number, default: 0, min: 0 },

    documents: {
      type: [leadDocumentSchema],
      default: [],
    },

    // Snapshot of the category/employment policy when the application is submitted.
    requiredDocuments: { type: [String], default: [] },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },

    notes: {
      type: [leadNoteSchema],
      default: [],
    },

    timeline: {
      type: [leadTimelineSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

leadSchema.set("toJSON", {
  transform(_doc, ret) {
    for (const document of ret.documents || []) {
      delete document.storageKey;
      delete document.fileUrl;
      for (const version of document.history || []) {
        delete version.storageKey;
      }
    }
    for (const evidence of ret.disbursementUpdate?.evidence || []) delete evidence.storageKey;
    return ret;
  },
});

leadSchema.index({ phone: 1 });
leadSchema.index({ assignedEmployeeId: 1, currentStatus: 1 });
leadSchema.index({ partnerId: 1, createdAt: -1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
