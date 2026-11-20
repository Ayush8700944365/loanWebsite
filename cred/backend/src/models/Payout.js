import mongoose from "mongoose";

const payoutBankSnapshotSchema = new mongoose.Schema({
  accountHolderName: { type: String, default: "" }, bankName: { type: String, default: "" },
  bankBranch: { type: String, default: "" }, encryptedAccountNumber: { type: String, default: "", select: false },
  maskedAccountNumber: { type: String, default: "" }, ifsc: { type: String, default: "" },
  accountType: { type: String, default: "" }, bankBranchAddress: { type: String, default: "" },
  capturedAt: { type: Date, default: Date.now },
}, { _id: false });
const paymentEvidenceSchema = new mongoose.Schema({
  storageKey: { type: String, trim: true, select: false },
  fileName: { type: String, trim: true, maxlength: 180 },
  mimeType: { type: String, trim: true },
  size: { type: Number, min: 0 },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const payoutSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      unique: true,
      trim: true,
    },

    partnerId: {
      type: String,
      required: true,
      trim: true,
    },

    partnerName: {
      type: String,
      required: true,
      trim: true,
    },

    leadId: {
      type: String,
      required: true,
      trim: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    paymentType: {
      type: String,
      default: "DSA Partner Commission",
      trim: true,
    },

    loanAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    commissionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    gstPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    deductionAmount: { type: Number, default: 0, min: 0 },
    netPayable: { type: Number, default: 0, min: 0 },
    commissionRuleSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    disbursementBankName: { type: String, trim: true, default: "" },
    disbursementReference: { type: String, trim: true, default: "" },
    disbursementDate: { type: Date, default: null },
    loanCategory: { type: String, trim: true, default: "" },
    paymentEvidence: { type: [paymentEvidenceSchema], default: [] },

    calculationType: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    commissionRuleValue: { type: Number, min: 0, default: 0 },
    commissionRuleId: { type: mongoose.Schema.Types.ObjectId, ref: "CommissionRule", default: null },

    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    bankDetails: {
      type: String,
      default: "",
      trim: true,
    },
    bankSnapshot: { type: payoutBankSnapshotSchema, default: null },
    payoutType: { type: String, enum: ["Partner Commission", "Other"], default: "Partner Commission" },
    paymentMethod: { type: String, trim: true, default: "Bank Transfer" },
    payoutPeriod: { type: String, trim: true, default: "" },
    internalRemarks: { type: String, trim: true, maxlength: 1000, default: "" },
    editHistory: [{ actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, fields: [String], at: { type: Date, default: Date.now } }],

    utr: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Correction Requested", "On Hold", "Payment Initiated", "Paid", "Payout Failed"],
      default: "Pending",
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: "", maxlength: 500 },
    statusHistory: [{
      status: { type: String, enum: ["Pending", "Approved", "Rejected", "Correction Requested", "On Hold", "Payment Initiated", "Paid", "Payout Failed"], required: true },
      actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      actorRole: { type: String, enum: ["admin", "system"], default: "admin" },
      reason: { type: String, trim: true, maxlength: 500, default: "" },
      utr: { type: String, trim: true, maxlength: 100, default: "" },
      at: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
  },
);

payoutSchema.set("toJSON", { transform(_doc, ret) {
  if (ret.bankSnapshot) {
    delete ret.bankSnapshot.encryptedAccountNumber;
    ret.bankSnapshot.accountNumber = ret.bankSnapshot.maskedAccountNumber || "";
  }
  return ret;
} });

// Prevent multiple payouts for the same lead and partner
payoutSchema.index({ leadId: 1, partnerId: 1 }, { unique: true });

const Payout = mongoose.model("Payout", payoutSchema);

export default Payout;
