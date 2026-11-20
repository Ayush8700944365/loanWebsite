import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const partnerDocumentSchema = new mongoose.Schema({
  documentId: { type: String, default: () => randomUUID(), required: true },
  documentType: { type: String, required: true, trim: true, maxlength: 80 },
  fileName: { type: String, required: true, trim: true, maxlength: 180 },
  mimeType: { type: String, required: true },
  size: { type: Number, min: 0, required: true },
  storageKey: { type: String, required: true, select: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  uploadedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "approved", "rejected", "reupload_requested"], default: "pending" },
  rejectionReason: { type: String, trim: true, default: "", maxlength: 500 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  reviews: [{ status: { type: String, enum: ["approved", "rejected", "reupload_requested"], required: true }, reason: { type: String, default: "", maxlength: 500 }, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, reviewedAt: { type: Date, default: Date.now }, version: Number }],
  version: { type: Number, min: 1, default: 1 },
  history: [{ version: Number, fileName: String, storageKey: { type: String, select: false }, mimeType: String, size: Number, status: String, uploadedAt: Date, reviewedAt: Date, rejectionReason: String, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } }],
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "employee", "partner"],
      required: true,
    },

    designation: {
      type: String,
      trim: true,
      default: "",
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending"],
      default: "active",
    },

    partnerApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended", "inactive"],
      default: "approved",
    },
    partnerApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    partnerApprovedAt: { type: Date, default: null },
    partnerRejectionReason: { type: String, trim: true, default: "" },
    partnerStatusHistory: [{ status: { type: String, required: true }, reason: { type: String, default: "", maxlength: 500 }, actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, actorRole: { type: String, default: "system" }, at: { type: Date, default: Date.now } }],

    profileImage: {
      type: String,
      default: "",
    },

    employeeCode: {
      type: String,
      sparse: true,
      unique: true,
    },

    partnerCode: {
      type: String,
      sparse: true,
      unique: true,
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },

    alternatePhone: { type: String, trim: true, default: "" },
    partnerType: { type: String, enum: ["DSA", "Builder", "Property Broker", "Referral Partner", "Corporate Partner", "Other"], default: "Other" },
    dateOfBirth: { type: Date, default: null },
    state: { type: String, trim: true, default: "" },
    pinCode: { type: String, trim: true, default: "" },
    communicationAddress: { type: String, trim: true, default: "" },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    bankName: {
      type: String,
      trim: true,
      default: "",
    },

    bankBranch: {
      type: String,
      trim: true,
      default: "",
    },

    accountNumber: {
      type: String,
      trim: true,
      default: "",
    },

    accountHolderName: { type: String, trim: true, default: "" },
    accountType: { type: String, enum: ["", "Savings", "Current"], default: "" },
    bankDetailsReviewStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    bankDetailsReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bankDetailsReviewedAt: { type: Date, default: null },
    bankDetailsReviewReason: { type: String, trim: true, maxlength: 500, default: "" },
    bankBranchAddress: { type: String, trim: true, default: "" },
    upiId: { type: String, trim: true, default: "" },
    partnerDocuments: { type: [partnerDocumentSchema], default: [] },
    bankDetailsHistory: [{
      accountHolderName: String, bankName: String, bankBranch: String, accountNumber: String,
      ifsc: String, accountType: String, bankBranchAddress: String, changedAt: Date,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    }],
    partnerProfileHistory: [{
      fields: [String], changedAt: Date, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    }],
    partnerInternalNotes: { type: [{ author: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, text: { type: String, required: true, trim: true, maxlength: 2000 }, createdAt: { type: Date, default: Date.now } }], default: [], select: false },

    ifsc: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    businessType: {
      type: String,
      trim: true,
      default: "",
    },

    gstNo: {
      type: String,
      trim: true,
      default: "",
    },

    panNo: {
      type: String,
      trim: true,
      default: "",
    },

    totalLeads: {
      type: Number,
      default: 0,
    },

    approvedLeads: {
      type: Number,
      default: 0,
    },

    totalCommission: {
      type: Number,
      default: 0,
    },

    pendingCommission: {
      type: Number,
      default: 0,
    },

    paidCommission: {
      type: Number,
      default: 0,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    // Incremented on logout or credential reset to invalidate issued JWTs.
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with stored hash
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
