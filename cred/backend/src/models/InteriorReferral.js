import mongoose from "mongoose";

const interiorReferralSchema = new mongoose.Schema({
  referralCode: { type: String, unique: true, index: true, default: () => `IR-${new mongoose.Types.ObjectId().toString()}` },
  customerName: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, required: true, trim: true, maxlength: 40 },
  email: { type: String, trim: true, lowercase: true, default: "", maxlength: 254 },
  city: { type: String, trim: true, default: "", maxlength: 120 },
  propertyDetails: { type: String, trim: true, default: "", maxlength: 300 },
  possessionTimeline: { type: String, trim: true, default: "", maxlength: 120 },
  estimatedBudget: { type: String, trim: true, default: "", maxlength: 120 },
  partnerCode: { type: String, trim: true, default: "", index: true },
  status: { type: String, enum: ["New Lead", "Contacted", "Qualified", "Closed", "Rejected"], default: "New Lead" },
  statusHistory: [{ status: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, actorRole: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true });

export default mongoose.model("InteriorReferral", interiorReferralSchema);
