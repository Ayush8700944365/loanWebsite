import mongoose from "mongoose";

const commissionRuleSchema = new mongoose.Schema({
  ruleKey: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  loanCategory: { type: String, trim: true, default: "*" },
  partnerCode: { type: String, trim: true, default: "*" },
  bankName: { type: String, trim: true, default: "*" },
  calculationBasis: { type: String, enum: ["disbursed_amount"], default: "disbursed_amount" },
  calculationType: { type: String, enum: ["percentage", "fixed"], required: true },
  value: { type: Number, min: 0, required: true },
  gstPercentage: { type: Number, min: 0, max: 100, required: true },
  deductionFixed: { type: Number, min: 0, default: 0 },
  deductionPercentage: { type: Number, min: 0, max: 100, default: 0 },
  minimumLoanAmount: { type: Number, min: 0, default: 0 },
  maximumLoanAmount: { type: Number, min: 0, default: null },
  effectiveFrom: { type: Date, default: null },
  effectiveTo: { type: Date, default: null },
  status: { type: String, enum: ["active", "inactive"], default: "inactive" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  history: [{
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
    snapshot: { type: mongoose.Schema.Types.Mixed },
  }],
}, { timestamps: true });

export default mongoose.model("CommissionRule", commissionRuleSchema);
