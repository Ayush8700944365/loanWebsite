import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      trim: true,
    },

    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    leadId: {
      type: String,
      trim: true,
      default: "",
    },

    loanCategory: {
      type: String,
      trim: true,
      default: "",
    },

    leadType: {
      type: String,
      trim: true,
      default: "",
    },

    loanAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    invoiceAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    annexureNumber: {
      type: String,
      trim: true,
      default: "",
    },

    annexureDate: {
      type: Date,
      default: null,
    },

    bankName: {
      type: String,
      trim: true,
      default: "",
    },

    partnerName: {
      type: String,
      trim: true,
      default: "",
    },

    partnerCode: { type: String, trim: true, default: "", index: true },
    payoutId: { type: mongoose.Schema.Types.ObjectId, ref: "Payout", default: null, index: true },
    reconciliationStatus: { type: String, enum: ["unlinked", "matched", "partially_matched", "mismatch", "reconciled"], default: "unlinked", index: true },
    reconciliationSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    reconciliationHistory: [{
      action: { type: String, enum: ["linked", "reconciled", "unlinked"], required: true },
      payoutId: { type: mongoose.Schema.Types.ObjectId, ref: "Payout", default: null },
      status: { type: String, enum: ["unlinked", "matched", "partially_matched", "mismatch", "reconciled"], required: true },
      difference: { type: Number, default: 0 },
      reason: { type: String, trim: true, maxlength: 500, default: "" },
      actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      at: { type: Date, default: Date.now },
    }],

    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },

    utr: {
      type: String,
      trim: true,
      default: "",
    },

    invoiceStatus: {
      type: String,
      enum: [
        "Pending",
        "Invoice Uploaded",
        "Approved",
        "Payment Initiated",
        "Rejected",
        "Payment Failed",
        "Paid",
      ],
      default: "Pending",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
