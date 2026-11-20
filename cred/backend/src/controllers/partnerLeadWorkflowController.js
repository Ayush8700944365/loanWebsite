import { createReadStream } from "fs";
import path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import Lead from "../models/Lead.js";
import { DOCUMENT_STORAGE_DIR, removeStoredDocument, storeDocument } from "../services/leadDocumentService.js";

const pipe = promisify(pipeline);
const partnerStatuses = new Set(["In Process", "Follow-up", "Approved", "Sanctioned", "Rejected"]);
const finalStatuses = new Set(["Invoice Generated", "Disbursed", "Payout Complete"]);
const actorEvent = (lead, req, toStatus, reason = "") => lead.statusHistory.push({
  fromStatus: lead.currentStatus,
  toStatus,
  reason,
  actorId: req.user._id,
  actorRole: req.user.role,
  actorName: req.user.name,
  at: new Date(),
});

export const updatePartnerLeadStatus = async (req, res) => {
  try {
    if (!req.user.partnerCode) return res.status(403).json({ success: false, message: "Partner account is missing its partner identity." });
    const { status, reason } = req.body || {};
    if (!partnerStatuses.has(status)) return res.status(400).json({ success: false, message: "Partner status must be In Process, Follow-up, Approved, Sanctioned, or Rejected." });
    const normalizedReason = typeof reason === "string" ? reason.trim().slice(0, 1000) : "";
    if (status === "Rejected" && !normalizedReason) return res.status(400).json({ success: false, message: "A rejection reason is required." });
    const lead = await Lead.findOne({ leadCode: req.params.leadCode, partnerId: req.user.partnerCode });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found for this partner." });
    if (finalStatuses.has(lead.currentStatus) || lead.currentStatus === "Rejected") return res.status(409).json({ success: false, message: `Lead status ${lead.currentStatus} cannot be changed by a partner.` });
    if (lead.currentStatus === "Sanctioned") return res.status(409).json({ success: false, message: "A sanctioned lead can only proceed through the disbursement evidence workflow." });
    const transitions = {
      New: ["In Process", "Follow-up", "Rejected"], Pending: ["In Process", "Follow-up", "Rejected"], Contacted: ["In Process", "Follow-up", "Rejected"],
      Verified: ["In Process", "Follow-up", "Rejected"], "In Process": ["In Process", "Follow-up", "Approved", "Rejected"],
      "Follow-up": ["In Process", "Follow-up", "Approved", "Rejected"], Approved: ["Follow-up", "Sanctioned", "Rejected"],
    };
    if (!transitions[lead.currentStatus]?.includes(status)) return res.status(409).json({ success: false, message: `Cannot change partner lead status from ${lead.currentStatus} to ${status}.` });
    if (status === "Sanctioned" && !["Approved", "Sanctioned"].includes(lead.currentStatus)) return res.status(409).json({ success: false, message: "The lead must be Approved before it can be marked Sanctioned." });
    if (["Approved", "Sanctioned"].includes(status) && lead.disbursementUpdate?.status === "pending_confirmation") return res.status(409).json({ success: false, message: "Resolve the pending disbursement update first." });
    lead.currentStatus = status;
    actorEvent(lead, req, status, normalizedReason);
    lead.timeline.push({ step: `Partner status changed to ${status}`, user: req.user.name, status: "completed" });
    await lead.save();
    return res.json({ success: true, lead });
  } catch (error) {
    console.error("Partner lead status update failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to update partner lead status." });
  }
};

export const submitDisbursementUpdate = async (req, res) => {
  const storedFiles = [];
  try {
    if (!req.user.partnerCode) return res.status(403).json({ success: false, message: "Partner account is missing its partner identity." });
    const amount = Number(req.body?.amount);
    const reference = typeof req.body?.reference === "string" ? req.body.reference.trim().slice(0, 120) : "";
    const files = req.files || [];
    const bankName = typeof req.body?.bankName === "string" ? req.body.bankName.trim().slice(0, 120) : "";
    const remarks = typeof req.body?.remarks === "string" ? req.body.remarks.trim().slice(0, 1000) : "";
    const disbursementDate = req.body?.disbursementDate ? new Date(req.body.disbursementDate) : null;
    if (!files.length) return res.status(400).json({ success: false, message: "Upload supporting evidence (PDF or permitted image)." });
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: "A disbursed amount greater than zero is required." });
    if (!reference) return res.status(400).json({ success: false, message: "A transaction or disbursement reference is required." });
    if (req.body?.disbursementDate && (!disbursementDate || Number.isNaN(disbursementDate.getTime()) || disbursementDate > new Date())) return res.status(400).json({ success: false, message: "Enter a valid disbursement date that is not in the future." });
    const lead = await Lead.findOne({ leadCode: req.params.leadCode, partnerId: req.user.partnerCode }).select("+disbursementUpdate.evidence.storageKey");
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found for this partner." });
    if (lead.currentStatus !== "Sanctioned") return res.status(409).json({ success: false, message: "Only a Sanctioned lead can submit a disbursement update." });
    if (lead.disbursementUpdate?.status === "pending_confirmation") return res.status(409).json({ success: false, message: "A disbursement update is already awaiting Admin confirmation." });
    for (const file of files) storedFiles.push(await storeDocument(file));
    const oldEvidence = [...(lead.disbursementUpdate?.evidence || [])].map((entry) => ({ storageKey: entry.storageKey, fileName: entry.fileName, mimeType: entry.mimeType, size: entry.size }));
    lead.disbursementUpdate = {
      status: "pending_confirmation", amount, reference, bankName, disbursementDate, remarks, submittedBy: req.user._id, submittedAt: new Date(),
      evidence: [...oldEvidence, ...storedFiles.map((entry, index) => ({ storageKey: entry.storageKey, fileName: path.basename(files[index].originalname).slice(0, 180), mimeType: entry.mimeType, size: entry.size }))],
      history: [...(lead.disbursementUpdate?.history || []), { status: "submitted", amount, reference, bankName, disbursementDate, remarks, actorId: req.user._id, actorRole: "partner", at: new Date() }],
    };
    await lead.save();
    return res.status(201).json({ success: true, lead });
  } catch (error) {
    await Promise.all(storedFiles.map((entry) => removeStoredDocument(entry.storageKey).catch(() => {})));
    console.error("Disbursement update submission failed:", error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to submit disbursement update." });
  }
};

export const reviewDisbursementUpdate = async (req, res) => {
  try {
    const { decision, reason } = req.body || {};
    const reviewReason = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
    if (!["confirm", "reject"].includes(decision)) return res.status(400).json({ success: false, message: "Decision must be confirm or reject." });
    if (decision === "reject" && !reviewReason) return res.status(400).json({ success: false, message: "A reason is required when rejecting a disbursement update." });
    const lead = await Lead.findOne({ leadCode: req.params.leadCode }).select("+disbursementUpdate.evidence.storageKey");
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found." });
    if (lead.currentStatus !== "Sanctioned" || lead.disbursementUpdate?.status !== "pending_confirmation") return res.status(409).json({ success: false, message: "No pending disbursement update is available for confirmation." });
    const now = new Date();
    const toStatus = decision === "confirm" ? "Disbursed" : "Sanctioned";
    lead.disbursementUpdate.status = decision === "confirm" ? "confirmed" : "rejected";
    lead.disbursementUpdate.reviewedBy = req.user._id;
    lead.disbursementUpdate.reviewedAt = now;
    lead.disbursementUpdate.reviewReason = reviewReason;
    lead.disbursementUpdate.history.push({ status: decision === "confirm" ? "confirmed" : "rejected", amount: lead.disbursementUpdate.amount, reference: lead.disbursementUpdate.reference, actorId: req.user._id, actorRole: "admin", reason: reviewReason, at: now });
    if (decision === "confirm") {
      const previous = lead.currentStatus;
      lead.currentStatus = "Disbursed";
      lead.loanPayoutAmount = lead.disbursementUpdate.amount;
      lead.statusHistory.push({ fromStatus: previous, toStatus: "Disbursed", actorId: req.user._id, actorRole: "admin", actorName: req.user.name, at: now });
      lead.timeline.push({ step: "Disbursement confirmed by Admin", user: req.user.name, status: "completed" });
    }
    await lead.save();
    return res.json({ success: true, lead });
  } catch (error) {
    console.error("Disbursement review failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to review disbursement update." });
  }
};

export const listAdminDisbursements = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const filter = { "disbursementUpdate.status": { $in: ["pending_confirmation", "confirmed", "rejected"] } };
    const status = String(req.query.status || "").trim();
    if (status && ["pending_confirmation", "confirmed", "rejected"].includes(status)) filter["disbursementUpdate.status"] = status;
    const partnerId = String(req.query.partnerId || "").trim();
    if (partnerId) filter.partnerId = partnerId;
    const bankName = String(req.query.bankName || "").trim().slice(0, 120);
    if (bankName) filter["disbursementUpdate.bankName"] = { $regex: bankName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    const minimum = req.query.minAmount === undefined ? null : Number(req.query.minAmount);
    const maximum = req.query.maxAmount === undefined ? null : Number(req.query.maxAmount);
    if ((minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) || (maximum !== null && (!Number.isFinite(maximum) || maximum < 0))) return res.status(400).json({ success: false, message: "Amount filters must be non-negative numbers." });
    if (minimum !== null || maximum !== null) filter["disbursementUpdate.amount"] = { ...(minimum !== null ? { $gte: minimum } : {}), ...(maximum !== null ? { $lte: maximum } : {}) };
    if (req.query.from || req.query.to) {
      const dateRange = {};
      if (req.query.from) { const date = new Date(req.query.from); if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Invalid start date." }); dateRange.$gte = date; }
      if (req.query.to) { const date = new Date(req.query.to); if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Invalid end date." }); date.setHours(23, 59, 59, 999); dateRange.$lte = date; }
      filter["disbursementUpdate.submittedAt"] = dateRange;
    }
    const search = String(req.query.search || "").trim().slice(0, 100);
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["customerName", "leadCode", "partnerName", "partnerId", "disbursementUpdate.reference", "disbursementUpdate.bankName"].map((field) => ({ [field]: { $regex: escaped, $options: "i" } }));
    }
    const [leads, total] = await Promise.all([Lead.find(filter).sort({ "disbursementUpdate.submittedAt": -1 }).skip((page - 1) * limit).limit(limit), Lead.countDocuments(filter)]);
    return res.json({ success: true, leads, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error("Admin disbursement list failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load disbursement records." });
  }
};

export const serveDisbursementEvidence = async (req, res) => {
  try {
    const leadFilter = { leadCode: req.params.leadCode };
    if (req.user.role === "partner") leadFilter.partnerId = req.user.partnerCode;
    const lead = await Lead.findOne(leadFilter).select("+disbursementUpdate.evidence.storageKey");
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found." });
    const file = lead.disbursementUpdate?.evidence?.[Number(req.params.index)];
    if (!file?.storageKey) return res.status(404).json({ success: false, message: "Evidence file not found." });
    res.set({ "Content-Type": file.mimeType, "Content-Disposition": `attachment; filename="${path.basename(file.fileName || "evidence")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    await pipe(createReadStream(path.join(DOCUMENT_STORAGE_DIR, file.storageKey)), res);
  } catch (error) {
    if (!res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: "Unable to retrieve evidence." });
  }
};
