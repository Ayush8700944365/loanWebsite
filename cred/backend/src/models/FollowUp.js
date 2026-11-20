import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema({
  leadCode: { type: String, trim: true, default: "" },
  customerName: { type: String, trim: true, required: true },
  phone: { type: String, trim: true, required: true },
  task: { type: String, trim: true, required: true, maxlength: 240 },
  followUpDate: { type: Date, required: true },
  followUpTime: { type: String, trim: true, required: true, maxlength: 40 },
  priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
  notes: { type: String, trim: true, default: "", maxlength: 1000 },
  reminderStatus: { type: String, enum: ["Scheduled", "Completed", "Cancelled"], default: "Scheduled" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ownerEmployeeCode: { type: String, trim: true, default: "" },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });
followUpSchema.index({ ownerEmployeeCode: 1, followUpDate: 1, reminderStatus: 1 });
export default mongoose.model("FollowUp", followUpSchema);
