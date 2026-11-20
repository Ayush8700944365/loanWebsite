import FollowUp from "../models/FollowUp.js";
import Lead from "../models/Lead.js";

const scope = (user) => user.role === "employee" ? { ownerEmployeeCode: user.employeeCode || "__missing_employee__" } : {};
const shape = (item) => ({ ...item.toObject(), id: item._id.toString(), timeDisplay: `${new Date(item.followUpDate).toLocaleDateString()} ${item.followUpTime}` });

export async function listFollowUps(req, res) {
  const followUps = await FollowUp.find(scope(req.user)).sort({ followUpDate: 1 }).limit(500);
  return res.json({ success: true, data: followUps.map(shape) });
}

export async function createFollowUp(req, res) {
  try {
    const body = req.body || {};
    const customerName = String(body.customerName || "").trim();
    const phone = String(body.phone || "").trim();
    const task = String(body.task || "").trim();
    const date = new Date(body.followUpDate);
    const time = String(body.followUpTime || "").trim();
    if (!customerName || !phone || !task || !time || Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Customer, phone, task, valid date and time are required." });
    if (req.user.role === "employee" && !req.user.employeeCode) return res.status(403).json({ success: false, message: "Employee account is missing its assignment identity." });
    const priority = ["Low", "Medium", "High"].includes(body.priority) ? body.priority : "Medium";
    let leadCode = "";
    if (body.leadCode) {
      const lead = await Lead.findOne({ leadCode: body.leadCode, ...(req.user.role === "employee" ? { assignedEmployeeId: req.user.employeeCode } : {}) }).select("leadCode");
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found or access denied." });
      leadCode = lead.leadCode;
    }
    const followUp = await FollowUp.create({ leadCode, customerName, phone, task, followUpDate: date, followUpTime: time, priority, notes: String(body.notes || "").trim().slice(0, 1000), createdBy: req.user._id, ownerEmployeeCode: req.user.role === "employee" ? req.user.employeeCode : String(body.ownerEmployeeCode || "") });
    return res.status(201).json({ success: true, followUp: shape(followUp) });
  } catch { return res.status(500).json({ success: false, message: "Unable to create follow-up." }); }
}

export async function updateFollowUp(req, res) {
  try {
    if (Object.keys(req.body || {}).some((key) => key !== "reminderStatus")) return res.status(400).json({ success: false, message: "Only reminder status can be changed here." });
    const { reminderStatus } = req.body;
    if (!["Scheduled", "Completed", "Cancelled"].includes(reminderStatus)) return res.status(400).json({ success: false, message: "Invalid reminder status." });
    const followUp = await FollowUp.findOne({ _id: req.params.id, ...scope(req.user) });
    if (!followUp) return res.status(404).json({ success: false, message: "Follow-up not found." });
    followUp.reminderStatus = reminderStatus;
    followUp.completedBy = reminderStatus === "Completed" ? req.user._id : null;
    followUp.completedAt = reminderStatus === "Completed" ? new Date() : null;
    await followUp.save();
    return res.json({ success: true, followUp: shape(followUp) });
  } catch { return res.status(500).json({ success: false, message: "Unable to update follow-up." }); }
}
