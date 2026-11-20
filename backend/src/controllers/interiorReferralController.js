import InteriorReferral from "../models/InteriorReferral.js";

const visibleTo = (user) => user.role === "admin" ? {} : { partnerCode: user.partnerCode || "__missing_partner__" };
const view = (item) => ({ ...item.toObject(), id: item.referralCode, createdDate: item.createdAt });

export async function listInteriorReferrals(req, res) {
  const records = await InteriorReferral.find(visibleTo(req.user)).sort({ createdAt: -1 }).limit(500);
  return res.json({ success: true, referrals: records.map(view) });
}

export async function createInteriorReferral(req, res) {
  const body = req.body || {};
  const customerName = String(body.customerName || "").trim();
  const phone = String(body.phone || "").trim();
  if (!customerName || !phone) return res.status(400).json({ success: false, message: "Customer name and phone are required." });
  if (req.user.role === "partner" && !req.user.partnerCode) return res.status(403).json({ success: false, message: "Partner identity is required." });
  const record = await InteriorReferral.create({ customerName, phone, email: String(body.email || "").trim().toLowerCase(), city: String(body.city || "").trim(), propertyDetails: String(body.propertyDetails || "").trim(), possessionTimeline: String(body.possessionTimeline || "").trim(), estimatedBudget: String(body.estimatedBudget || "").trim(), partnerCode: req.user.role === "partner" ? req.user.partnerCode : "", statusHistory: [{ status: "New Lead", actorId: req.user._id, actorRole: req.user.role }] });
  return res.status(201).json({ success: true, referral: view(record) });
}

export async function updateInteriorReferral(req, res) {
  const status = String(req.body?.status || "");
  if (Object.keys(req.body || {}).some((key) => key !== "status") || !["Contacted", "Qualified", "Closed", "Rejected"].includes(status)) return res.status(400).json({ success: false, message: "Invalid referral status update." });
  const record = await InteriorReferral.findOne({ referralCode: req.params.referralCode });
  if (!record) return res.status(404).json({ success: false, message: "Referral not found." });
  record.status = status;
  record.statusHistory.push({ status, actorId: req.user._id, actorRole: req.user.role });
  await record.save();
  return res.json({ success: true, referral: view(record) });
}
