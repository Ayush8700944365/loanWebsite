import { createReadStream } from "fs";
import path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import { randomUUID } from "crypto";
import { createHash, randomBytes } from "crypto";
import User from "../models/User.js";
import PartnerAuditEvent from "../models/PartnerAuditEvent.js";
import PartnerChangeRequest from "../models/PartnerChangeRequest.js";
import PartnerCorrectionRequest from "../models/PartnerCorrectionRequest.js";
import { DOCUMENT_STORAGE_DIR, removeStoredDocument, storeDocument } from "../services/leadDocumentService.js";
import { decryptPartnerValue, encryptPartnerValue, maskPartnerAccount, partnerPublicView } from "../services/partnerSensitiveData.js";

const pipe = promisify(pipeline);
const docTypes = new Set(["PAN Card", "Identity and address proof", "Masked Aadhaar or alternative", "Cancelled cheque", "Bank passbook", "Company registration certificate", "GST certificate", "Business address proof", "Contact person photograph", "Partner agreement", "Other business document"]);
const bankFields = new Set(["accountHolderName", "bankName", "bankBranch", "accountNumber", "ifsc", "accountType", "bankBranchAddress", "upiId"]);
const allowedChanges = new Set(["companyName", "contactPerson", "phone", "alternatePhone", "partnerType", "businessType", "dateOfBirth", "panNo", "gstNo", "city", "state", "pinCode", "address", "communicationAddress", ...bankFields]);
const adminEditableChanges = new Set([...allowedChanges, "email"]);

function parsePartnerDocTypes(raw, count) {
  let types;
  try { types = JSON.parse(raw || "[]"); } catch { const error = new Error("Document type list is invalid."); error.statusCode = 400; throw error; }
  if (!Array.isArray(types) || types.length !== count || types.some((item) => !docTypes.has(String(item?.documentType || "")))) {
    const error = new Error("Select a supported KYC document type for each uploaded file."); error.statusCode = 400; throw error;
  }
  return types;
}

async function storePartnerFiles(files, types, actorId) {
  const stored = [];
  try {
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]; const saved = await storeDocument(file); stored.push({
        documentId: randomUUID(), documentType: types[i].documentType, fileName: path.basename(file.originalname).slice(0, 180),
        mimeType: saved.mimeType, size: saved.size, storageKey: saved.storageKey, uploadedBy: actorId || null, uploadedAt: new Date(), status: "pending", version: 1,
      });
    }
    return stored;
  } catch (error) { await Promise.all(stored.map((doc) => removeStoredDocument(doc.storageKey))); throw error; }
}

const audit = (partnerId, req, action, documentId = "", details = "") => PartnerAuditEvent.create({ partnerId, actorId: req.user?._id || null, actorRole: req.user?.role || "system", action, documentId, details });

function normalizeAccountType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["savings", "saving"].includes(normalized)) return "Savings";
  if (normalized === "current") return "Current";
  return "";
}

function validateBank(data, { required = false } = {}) {
  const accountNumber = String(data.accountNumber || "").replace(/\s/g, "");
  if (required || accountNumber) {
    if (!String(data.accountHolderName || "").trim()) throw Object.assign(new Error("Account holder name is required."), { statusCode: 400 });
    if (!String(data.bankName || "").trim()) throw Object.assign(new Error("Bank name is required."), { statusCode: 400 });
    if (!String(data.bankBranch || "").trim()) throw Object.assign(new Error("Branch name is required."), { statusCode: 400 });
    if (!/^[A-Z0-9]{6,34}$/i.test(accountNumber)) throw Object.assign(new Error("Account number must contain 6 to 34 letters or digits."), { statusCode: 400 });
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(data.ifsc || "").toUpperCase())) throw Object.assign(new Error("Enter a valid IFSC code."), { statusCode: 400 });
    if (!normalizeAccountType(data.accountType)) throw Object.assign(new Error("Select Savings or Current account type."), { statusCode: 400 });
  }
  return accountNumber;
}

function validatePartnerFields(data) {
  if (data.email !== undefined && !/^\S+@\S+\.\S+$/.test(String(data.email).trim())) throw Object.assign(new Error("Please provide a valid email address."), { statusCode: 400 });
  const ifsc = String(data.ifsc || "").trim().toUpperCase();
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw Object.assign(new Error("Enter a valid IFSC code."), { statusCode: 400 });
  const pan = String(data.panNo || "").trim().toUpperCase();
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) throw Object.assign(new Error("Enter a valid PAN number."), { statusCode: 400 });
  const gst = String(data.gstNo || "").trim().toUpperCase();
  if (gst && !/^[0-9A-Z]{15}$/.test(gst)) throw Object.assign(new Error("Enter a valid GSTIN."), { statusCode: 400 });
}

export async function applyPartnerApplication(req, res) {
  let stored = [];
  try {
    const body = req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (![body.companyName, body.contactPerson, email, body.phone, body.partnerType, body.businessType, body.city, body.state, body.pinCode, body.address, body.communicationAddress].every((value) => typeof value === "string" && value.trim())) return res.status(400).json({ success: false, message: "Complete the required business and contact fields." });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ success: false, message: "Use a password of at least 12 characters with upper/lowercase letters, a number, and a symbol." });
    if (body.partnerKycConsent !== "true" && body.partnerKycConsent !== true) return res.status(400).json({ success: false, message: "Consent is required before uploading partner KYC documents." });
    validatePartnerFields(body);
    const accountNumber = validateBank(body, { required: true });
    if (!req.files?.length) return res.status(400).json({ success: false, message: "Upload at least one applicable partner KYC or bank proof document." });
    const types = parsePartnerDocTypes(body.documentTypes, req.files.length);
    const existing = await User.findOne({ $or: [{ email }, { username: email }] }).select("_id");
    if (existing) return res.status(409).json({ success: false, message: "Email is already registered." });
    stored = await storePartnerFiles(req.files, types, null);
    const partner = await User.create({
      name: String(body.contactPerson).trim(), contactPerson: String(body.contactPerson).trim(), companyName: String(body.companyName).trim(),
      email, username: email, password, role: "partner", status: "pending", partnerApprovalStatus: "pending", partnerCode: `PTR-${randomUUID().slice(0, 12).toUpperCase()}`,
      phone: String(body.phone).trim(), alternatePhone: String(body.alternatePhone || "").trim(), partnerType: body.partnerType,
      businessType: String(body.businessType).trim(), dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
      panNo: String(body.panNo || "").trim().toUpperCase(), gstNo: String(body.gstNo || "").trim().toUpperCase(), address: String(body.address).trim(),
      communicationAddress: String(body.communicationAddress).trim(), city: String(body.city).trim(), state: String(body.state).trim(), pinCode: String(body.pinCode).trim(),
      accountHolderName: String(body.accountHolderName).trim(), bankName: String(body.bankName).trim(), bankBranch: String(body.bankBranch).trim(),
      accountNumber: encryptPartnerValue(accountNumber), ifsc: String(body.ifsc).trim().toUpperCase(), accountType: body.accountType,
      bankBranchAddress: String(body.bankBranchAddress || "").trim(), upiId: String(body.upiId || "").trim(), partnerDocuments: stored,
    });
    await audit(partner._id, req, "application_submitted", "", `documents=${stored.length}`);
    return res.status(201).json({ success: true, message: "Application submitted for Admin KYC and bank review.", applicationId: partner.partnerCode, status: "pending" });
  } catch (error) {
    await Promise.all(stored.map((document) => removeStoredDocument(document.storageKey)));
    if (error.code === 11000) return res.status(409).json({ success: false, message: "Email is already registered." });
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to submit partner application." });
  }
}

export async function listPartnerApplications(req, res) {
  const filter = req.user.role === "admin" ? { role: "partner" } : { _id: req.user._id, role: "partner" };
  const partners = await User.find(filter).select("-password +partnerDocuments.storageKey").sort({ createdAt: -1 });
  const safePartners = partners.map((partner) => partnerPublicView(partner));
  await Promise.all(partners.map((partner) => audit(partner._id, req, "application_profile_viewed")));
  return res.json({ success: true, count: safePartners.length, partners: safePartners });
}

export async function getEligiblePartners(_req, res) {
  const partners = await User.find({ role: "partner", status: "active", partnerApprovalStatus: "approved", bankDetailsReviewStatus: "approved" }).select("partnerCode companyName name contactPerson email phone").sort({ companyName: 1 });
  return res.json({ success: true, partners: partners.map((item) => ({ partnerCode: item.partnerCode, companyName: item.companyName, name: item.name, contactPerson: item.contactPerson, email: item.email, phone: item.phone })) });
}

export async function getPartnerPayoutDetails(req, res) {
  const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" });
  if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
  await audit(partner._id, req, "payout_bank_details_viewed");
  return res.json({ success: true, partner: { partnerCode: partner.partnerCode, name: partner.name, contactPerson: partner.contactPerson, companyName: partner.companyName, email: partner.email, phone: partner.phone, accountHolderName: partner.accountHolderName, bankName: partner.bankName, bankBranch: partner.bankBranch, accountNumber: decryptPartnerValue(partner.accountNumber), maskedAccountNumber: maskPartnerAccount(partner.accountNumber), ifsc: partner.ifsc, accountType: partner.accountType, bankBranchAddress: partner.bankBranchAddress, upiId: partner.upiId, bankDetailsReviewStatus: partner.bankDetailsReviewStatus, bankDetailsReviewedAt: partner.bankDetailsReviewedAt, bankDetailsReviewReason: partner.bankDetailsReviewReason } });
}

export async function reviewPartnerBankDetails(req, res) {
  const { status, reason = "" } = req.body || {};
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ success: false, message: "Choose approved or rejected." });
  if (status === "rejected" && !String(reason).trim()) return res.status(400).json({ success: false, message: "A reason is required when rejecting bank details." });
  const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" });
  if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
  if (status === "approved" && !(partner.accountHolderName && partner.bankName && partner.bankBranch && partner.accountNumber && partner.ifsc && partner.accountType)) return res.status(409).json({ success: false, message: "Complete all required bank fields before approving them." });
  partner.bankDetailsReviewStatus = status; partner.bankDetailsReviewedBy = req.user._id; partner.bankDetailsReviewedAt = new Date(); partner.bankDetailsReviewReason = status === "rejected" ? String(reason).trim().slice(0, 500) : "";
  if (status === "rejected" && partner.status === "active") { partner.status = "inactive"; partner.partnerApprovalStatus = "inactive"; partner.tokenVersion = (partner.tokenVersion || 0) + 1; }
  await partner.save();
  await audit(partner._id, req, `bank_details_${status}`, "", partner.bankDetailsReviewReason);
  return res.json({ success: true, bankDetailsReviewStatus: partner.bankDetailsReviewStatus, reviewedAt: partner.bankDetailsReviewedAt, reason: partner.bankDetailsReviewReason });
}

export async function servePartnerDocument(req, res) {
  const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" }).select("+partnerDocuments.storageKey +partnerDocuments.history.storageKey");
  const doc = partner?.partnerDocuments.find((item) => item.documentId === req.params.documentId);
  if (!partner || !doc) return res.status(404).json({ success: false, message: "Partner document not found." });
  const storageKey = req.params.version ? doc.history.find((item) => String(item.version) === req.params.version)?.storageKey : doc.storageKey;
  const fileName = req.params.version ? doc.history.find((item) => String(item.version) === req.params.version)?.fileName : doc.fileName;
  if (!storageKey || !/^[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$/i.test(storageKey)) return res.status(404).json({ success: false, message: "Document file not found." });
  const absolutePath = path.resolve(DOCUMENT_STORAGE_DIR, storageKey);
  if (!absolutePath.startsWith(path.resolve(DOCUMENT_STORAGE_DIR) + path.sep)) return res.status(404).json({ success: false, message: "Document file not found." });
  const action = req.path.endsWith("/download") ? "download" : "preview";
  await audit(partner._id, req, action === "download" ? "kyc_document_downloaded" : "kyc_document_previewed", doc.documentId, req.params.version ? `version=${req.params.version}` : "current");
  res.set({ "Content-Type": req.params.version ? doc.history.find((item) => String(item.version) === req.params.version)?.mimeType || doc.mimeType : doc.mimeType, "Content-Disposition": `${action === "download" ? "attachment" : "inline"}; filename="${path.basename(fileName || doc.fileName).replace(/[\r\n"\\]/g, "_")}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Cross-Origin-Resource-Policy": "same-origin" });
  try { await pipe(createReadStream(absolutePath), res); } catch { if (!res.headersSent) res.status(404).json({ success: false, message: "Document file is unavailable." }); }
}

export async function reviewPartnerDocument(req, res) {
  const { status, reason = "" } = req.body || {};
  if (!["approved", "rejected", "reupload_requested"].includes(status)) return res.status(400).json({ success: false, message: "Invalid document review status." });
  if (status !== "approved" && !String(reason).trim()) return res.status(400).json({ success: false, message: "A reason is required for rejection or correction request." });
  const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" }).select("+partnerDocuments.storageKey +partnerDocuments.history.storageKey");
  const doc = partner?.partnerDocuments.find((item) => item.documentId === req.params.documentId);
  if (!partner || !doc) return res.status(404).json({ success: false, message: "Partner document not found." });
  doc.status = status; doc.rejectionReason = status === "approved" ? "" : String(reason).trim().slice(0, 500); doc.reviewedBy = req.user._id; doc.reviewedAt = new Date();
  doc.reviews.push({ status, reason: doc.rejectionReason, reviewedBy: req.user._id, reviewedAt: doc.reviewedAt, version: doc.version });
  await partner.save(); await audit(partner._id, req, `kyc_document_${status}`, doc.documentId, doc.rejectionReason);
  return res.json({ success: true, document: { documentId: doc.documentId, status: doc.status, rejectionReason: doc.rejectionReason, reviewedAt: doc.reviewedAt } });
}

export async function adminUpdatePartnerProfile(req, res) {
  try {
    const body = req.body || {};
    const keys = Object.keys(body);
    if (!keys.length || keys.some((key) => !adminEditableChanges.has(key))) return res.status(400).json({ success: false, message: "Submit only supported partner profile fields." });
    validatePartnerFields(body);
    const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" }).select("+accountNumber");
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      const existing = await User.findOne({ _id: { $ne: partner._id }, $or: [{ email }, { username: email }] }).select("_id");
      if (existing) return res.status(409).json({ success: false, message: "That email address is already in use." });
      if (email !== partner.email) {
        if (partner.username === partner.email) partner.username = email;
        partner.tokenVersion = (partner.tokenVersion || 0) + 1;
      }
    }
    const hasBankChanges = keys.some((key) => bankFields.has(key));
    if (hasBankChanges) {
      const currentAccountNumber = decryptPartnerValue(partner.accountNumber);
      validateBank({
        accountHolderName: body.accountHolderName ?? partner.accountHolderName,
        bankName: body.bankName ?? partner.bankName,
        bankBranch: body.bankBranch ?? partner.bankBranch,
        accountNumber: body.accountNumber ?? currentAccountNumber,
        ifsc: body.ifsc ?? partner.ifsc,
        accountType: body.accountType ?? partner.accountType,
      }, { required: true });
      partner.accountType = normalizeAccountType(body.accountType ?? partner.accountType);
      partner.bankDetailsHistory.push({ accountHolderName: partner.accountHolderName, bankName: partner.bankName, bankBranch: partner.bankBranch, accountNumber: partner.accountNumber, ifsc: partner.ifsc, accountType: partner.accountType, bankBranchAddress: partner.bankBranchAddress, changedAt: new Date(), changedBy: req.user._id });
    }
    for (const [key, raw] of Object.entries(body)) {
      const value = typeof raw === "string" ? raw.trim() : raw;
      if (key === "accountNumber") partner.accountNumber = encryptPartnerValue(value);
      else if (key === "email") partner.email = String(value).toLowerCase();
      else if (key === "accountType") partner.accountType = normalizeAccountType(value);
      else if (key === "dateOfBirth") partner.dateOfBirth = value ? new Date(value) : null;
      else partner[key] = ["ifsc", "panNo", "gstNo"].includes(key) ? String(value || "").toUpperCase() : value;
    }
    if (hasBankChanges) {
      partner.bankDetailsReviewStatus = "pending"; partner.bankDetailsReviewedBy = null; partner.bankDetailsReviewedAt = null; partner.bankDetailsReviewReason = "";
    }
    partner.partnerProfileHistory.push({ fields: keys, changedAt: new Date(), changedBy: req.user._id });
    await partner.save();
    await audit(partner._id, req, "admin_partner_profile_updated", "", `fields=${keys.sort().join(",")}`);
    return res.json({ success: true, partner: partnerPublicView(partner) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "That email address is already in use." });
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to update partner profile." });
  }
}

export async function uploadPartnerDocumentsForAdmin(req, res) {
  let uploaded = [];
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: "Select at least one KYC document." });
    const types = parsePartnerDocTypes(req.body.documentTypes, req.files.length);
    const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" }).select("+partnerDocuments.storageKey +partnerDocuments.history.storageKey");
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
    uploaded = await storePartnerFiles(req.files, types, req.user._id);
    for (const replacement of uploaded) {
      const existing = partner.partnerDocuments.find((item) => item.documentType === replacement.documentType);
      if (!existing) { partner.partnerDocuments.push(replacement); continue; }
      existing.history.push({ version: existing.version, fileName: existing.fileName, storageKey: existing.storageKey, mimeType: existing.mimeType, size: existing.size, status: existing.status, uploadedAt: existing.uploadedAt, reviewedAt: existing.reviewedAt, rejectionReason: existing.rejectionReason, reviewedBy: existing.reviewedBy });
      existing.version += 1; existing.fileName = replacement.fileName; existing.storageKey = replacement.storageKey; existing.mimeType = replacement.mimeType; existing.size = replacement.size; existing.uploadedAt = new Date(); existing.uploadedBy = req.user._id; existing.status = "pending"; existing.rejectionReason = ""; existing.reviewedBy = null; existing.reviewedAt = null;
    }
    await partner.save();
    await audit(partner._id, req, "admin_partner_documents_uploaded", "", `documents=${uploaded.length}`);
    return res.status(201).json({ success: true, partner: partnerPublicView(partner) });
  } catch (error) {
    await Promise.all(uploaded.map((document) => removeStoredDocument(document.storageKey)));
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to upload partner documents." });
  }
}

export async function listPartnerInternalNotes(req, res) {
  const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" }).select("+partnerInternalNotes");
  if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
  return res.json({ success: true, notes: partner.partnerInternalNotes });
}

export async function addPartnerInternalNote(req, res) {
  const text = String(req.body.text || "").trim();
  if (!text || text.length > 2000) return res.status(400).json({ success: false, message: "Internal note must contain 1 to 2,000 characters." });
  const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" }).select("+partnerInternalNotes");
  if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
  partner.partnerInternalNotes.push({ author: req.user.name, actorId: req.user._id, text });
  await partner.save();
  await audit(partner._id, req, "internal_review_note_added");
  return res.status(201).json({ success: true, notes: partner.partnerInternalNotes });
}

export async function reuploadPartnerDocuments(req, res) {
  if (!req.files?.length) return res.status(400).json({ success: false, message: "Select at least one document." });
  let uploaded = [];
  try {
    const partner = await User.findById(req.user._id).select("+partnerDocuments.storageKey +partnerDocuments.history.storageKey");
    const types = parsePartnerDocTypes(req.body.documentTypes, req.files.length);
    uploaded = await storePartnerFiles(req.files, types, req.user._id);
    for (const replacement of uploaded) {
      const existing = partner.partnerDocuments.find((item) => item.documentType === replacement.documentType);
      if (existing) {
        existing.history.push({ version: existing.version, fileName: existing.fileName, storageKey: existing.storageKey, mimeType: existing.mimeType, size: existing.size, status: existing.status, uploadedAt: existing.uploadedAt, reviewedAt: existing.reviewedAt, rejectionReason: existing.rejectionReason, reviewedBy: existing.reviewedBy });
        existing.version += 1; existing.fileName = replacement.fileName; existing.storageKey = replacement.storageKey; existing.mimeType = replacement.mimeType; existing.size = replacement.size; existing.uploadedAt = new Date(); existing.uploadedBy = req.user._id; existing.status = "pending"; existing.rejectionReason = ""; existing.reviewedBy = null; existing.reviewedAt = null;
      } else partner.partnerDocuments.push(replacement);
    }
    await partner.save(); await audit(partner._id, req, "kyc_documents_reuploaded", "", `documents=${uploaded.length}`);
    return res.status(201).json({ success: true, partner: partnerPublicView(partner) });
  } catch (error) { await Promise.all(uploaded.map((item) => removeStoredDocument(item.storageKey))); return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to upload partner documents." }); }
}

export async function createPartnerChangeRequest(req, res) {
  try {
    const body = req.body || {}; const keys = Object.keys(body).filter((key) => allowedChanges.has(key));
    if (!keys.length || Object.keys(body).some((key) => !allowedChanges.has(key))) return res.status(400).json({ success: false, message: "Submit only editable profile or bank fields." });
    validatePartnerFields(body);
    const partner = await User.findById(req.user._id).select("partnerCode accountHolderName bankName bankBranch +accountNumber ifsc accountType bankBranchAddress");
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
    if (keys.some((key) => bankFields.has(key))) {
      validateBank({
        accountHolderName: body.accountHolderName ?? partner.accountHolderName,
        bankName: body.bankName ?? partner.bankName,
        bankBranch: body.bankBranch ?? partner.bankBranch,
        accountNumber: body.accountNumber ?? decryptPartnerValue(partner.accountNumber),
        ifsc: body.ifsc ?? partner.ifsc,
        accountType: body.accountType ?? partner.accountType,
      }, { required: true });
    }
    const changes = {};
    for (const key of keys) {
      let value = String(body[key] ?? "").trim();
      if (key === "ifsc") value = value.toUpperCase();
      if (key === "panNo" || key === "gstNo") value = value.toUpperCase();
      if (key === "accountNumber") { if (value) { if (!/^[A-Z0-9]{6,34}$/i.test(value)) return res.status(400).json({ success: false, message: "Account number must contain 6 to 34 letters or digits." }); value = encryptPartnerValue(value); } }
      changes[key] = value;
    }
    const existing = await PartnerChangeRequest.findOne({ partnerId: req.user._id, status: "pending" });
    if (existing) return res.status(409).json({ success: false, message: "Resolve your existing pending profile change request before submitting another." });
    const request = await PartnerChangeRequest.create({ partnerId: partner._id, partnerCode: partner.partnerCode, changes });
    await audit(partner._id, req, "profile_change_requested", "", `fields=${keys.sort().join(",")}`);
    return res.status(201).json({ success: true, message: "Profile changes are pending Admin review.", request: { id: request._id, status: request.status, requestedAt: request.requestedAt, fields: keys } });
  } catch (error) { return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to save profile change request." }); }
}

export async function listPartnerChangeRequests(req, res) {
  const rows = await PartnerChangeRequest.find().select("+changes").sort({ createdAt: -1 }).limit(500);
  await Promise.all(rows.map((row) => audit(row.partnerId, req, "profile_change_request_viewed", "", `request=${row._id}`)));
  const requests = rows.map((row) => {
    const data = row.toObject();
    if (data.changes?.accountNumber) data.changes.accountNumber = decryptPartnerValue(data.changes.accountNumber);
    return data;
  });
  return res.json({ success: true, requests });
}

const correctionFieldSet = new Set([...allowedChanges]);
const correctionDigest = (token) => createHash("sha256").update(String(token)).digest("hex");

export async function createPartnerCorrectionRequest(req, res) {
  const { reason, fields = [], documentTypes = [], expiresInHours = 48 } = req.body || {};
  if (typeof reason !== "string" || !reason.trim()) return res.status(400).json({ success: false, message: "A correction reason is required." });
  if (!Array.isArray(fields) || !Array.isArray(documentTypes) || (!fields.length && !documentTypes.length)) return res.status(400).json({ success: false, message: "Select at least one field or document type that requires correction." });
  if (fields.some((field) => !correctionFieldSet.has(field)) || new Set(fields).size !== fields.length) return res.status(400).json({ success: false, message: "One or more requested correction fields are invalid." });
  if (documentTypes.some((type) => !docTypes.has(type)) || new Set(documentTypes).size !== documentTypes.length) return res.status(400).json({ success: false, message: "One or more requested document types are invalid." });
  const hours = Number(expiresInHours);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) return res.status(400).json({ success: false, message: "Correction links must expire within 1 to 168 hours." });
  const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" }).select("_id partnerCode");
  if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
  await PartnerCorrectionRequest.updateMany({ partnerId: partner._id, status: "open" }, { $set: { status: "revoked" } });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const correction = await PartnerCorrectionRequest.create({ partnerId: partner._id, partnerCode: partner.partnerCode, tokenHash: correctionDigest(token), reason: reason.trim().slice(0, 1000), fields, documentTypes, expiresAt, createdBy: req.user._id });
  await audit(partner._id, req, "correction_link_created", "", `request=${correction._id};fields=${fields.length};documents=${documentTypes.length}`);
  return res.status(201).json({ success: true, correction: { id: correction._id, status: correction.status, reason: correction.reason, fields, documentTypes, expiresAt, url: `/partner-correction/${token}`, token } });
}

export async function listPartnerCorrectionRequests(req, res) {
  const corrections = await PartnerCorrectionRequest.find().sort({ createdAt: -1 }).limit(500).select("partnerId partnerCode reason fields documentTypes status expiresAt createdBy submittedAt submittedFields submittedDocuments createdAt");
  await Promise.all(corrections.map((item) => audit(item.partnerId, req, "correction_request_viewed", "", `request=${item._id}`)));
  return res.json({ success: true, corrections });
}

async function getOpenCorrection(token) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(String(token || ""))) return null;
  const correction = await PartnerCorrectionRequest.findOne({ tokenHash: correctionDigest(token) });
  if (!correction || correction.status !== "open") return null;
  if (correction.expiresAt <= new Date()) {
    correction.status = "expired";
    await correction.save();
    return null;
  }
  return correction;
}

export async function getPartnerCorrectionForm(req, res) {
  const correction = await getOpenCorrection(req.params.token);
  if (!correction) return res.status(404).json({ success: false, message: "This correction link is invalid, expired, or already used." });
  const partner = await User.findById(correction.partnerId).select("companyName contactPerson email phone alternatePhone partnerType businessType panNo gstNo city state pinCode address communicationAddress accountHolderName bankName bankBranch ifsc accountType bankBranchAddress upiId partnerDocuments");
  if (!partner) return res.status(404).json({ success: false, message: "Partner application not found." });
  const fields = {};
  for (const field of correction.fields) fields[field] = field === "accountNumber" ? "" : partner[field] || "";
  return res.json({ success: true, correction: { reason: correction.reason, fields, requestedFields: correction.fields, requestedDocumentTypes: correction.documentTypes, expiresAt: correction.expiresAt, companyName: partner.companyName, contactPerson: partner.contactPerson, email: partner.email } });
}

export async function submitPartnerCorrection(req, res) {
  let stored = [];
  let correction;
  let partnerSaved = false;
  try {
    correction = await PartnerCorrectionRequest.findOneAndUpdate({ tokenHash: correctionDigest(req.params.token), status: "open", expiresAt: { $gt: new Date() } }, { $set: { status: "processing" } }, { returnDocument: "after" });
    if (!correction) return res.status(404).json({ success: false, message: "This correction link is invalid, expired, or already used." });
    const correctionError = async (status, message) => { correction.status = "open"; await correction.save(); return res.status(status).json({ success: false, message }); };
    let fields;
    try { fields = JSON.parse(req.body.correctionFields || "{}"); } catch { return correctionError(400, "Correction fields are invalid."); }
    if (!fields || typeof fields !== "object" || Array.isArray(fields) || Object.keys(fields).some((key) => !correction.fields.includes(key))) return correctionError(400, "Only the fields requested by Admin can be changed.");
    if (correction.fields.some((key) => fields[key] === undefined)) return correctionError(400, "Complete every requested correction field.");
    validatePartnerFields(fields);
    const partner = await User.findById(correction.partnerId).select("+accountNumber +partnerDocuments.storageKey +partnerDocuments.history.storageKey");
    if (!partner) return correctionError(404, "Partner application not found.");
    if (Object.keys(fields).some((field) => bankFields.has(field))) {
      validateBank({ accountHolderName: fields.accountHolderName ?? partner.accountHolderName, bankName: fields.bankName ?? partner.bankName, bankBranch: fields.bankBranch ?? partner.bankBranch, accountNumber: fields.accountNumber ?? decryptPartnerValue(partner.accountNumber), ifsc: fields.ifsc ?? partner.ifsc, accountType: fields.accountType ?? partner.accountType }, { required: true });
    }
    if (req.files?.length !== correction.documentTypes.length) return correctionError(400, "Upload every document type requested by Admin.");
    const types = parsePartnerDocTypes(req.body.documentTypes, req.files?.length || 0);
    if (types.some((entry) => !correction.documentTypes.includes(entry.documentType)) || correction.documentTypes.some((type) => !types.some((entry) => entry.documentType === type))) return correctionError(400, "Upload only the document types requested by Admin.");
    stored = await storePartnerFiles(req.files || [], types, partner._id);
    for (const [key, raw] of Object.entries(fields)) {
      const value = String(raw ?? "").trim();
      partner[key] = key === "accountNumber" ? encryptPartnerValue(value) : ["ifsc", "panNo", "gstNo"].includes(key) ? value.toUpperCase() : value;
    }
    for (const replacement of stored) {
      const current = partner.partnerDocuments.find((item) => item.documentType === replacement.documentType);
      if (!current) { partner.partnerDocuments.push(replacement); continue; }
      current.history.push({ version: current.version, fileName: current.fileName, storageKey: current.storageKey, mimeType: current.mimeType, size: current.size, status: current.status, uploadedAt: current.uploadedAt, reviewedAt: current.reviewedAt, rejectionReason: current.rejectionReason, reviewedBy: current.reviewedBy });
      current.version += 1; current.fileName = replacement.fileName; current.mimeType = replacement.mimeType; current.size = replacement.size; current.storageKey = replacement.storageKey; current.uploadedAt = new Date(); current.uploadedBy = partner._id; current.status = "pending"; current.rejectionReason = ""; current.reviewedBy = null; current.reviewedAt = null;
    }
    if (Object.keys(fields).some((field) => bankFields.has(field))) { partner.bankDetailsReviewStatus = "pending"; partner.bankDetailsReviewedBy = null; partner.bankDetailsReviewedAt = null; partner.bankDetailsReviewReason = ""; }
    await partner.save();
    partnerSaved = true;
    correction.status = "submitted"; correction.submittedAt = new Date(); correction.submittedFields = Object.keys(fields); correction.submittedDocuments = stored.map((item) => item.documentType); await correction.save();
    await PartnerAuditEvent.create({ partnerId: partner._id, actorId: partner._id, actorRole: "partner", action: "correction_resubmitted", details: `request=${correction._id};fields=${Object.keys(fields).join(",")};documents=${stored.length}` });
    return res.status(201).json({ success: true, message: "Corrections submitted for Admin review.", status: "pending_review" });
  } catch (error) {
    if (!partnerSaved) await Promise.all(stored.map((item) => removeStoredDocument(item.storageKey)));
    if (correction && !partnerSaved && correction.status === "processing") { correction.status = "open"; await correction.save().catch(() => {}); }
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to submit partner corrections." });
  }
}

export async function reviewPartnerChangeRequest(req, res) {
  const { status, reason = "" } = req.body || {};
  if (!["approved", "rejected"].includes(status)) return res.status(400).json({ success: false, message: "Choose approved or rejected." });
  if (status === "rejected" && !String(reason).trim()) return res.status(400).json({ success: false, message: "A rejection reason is required." });
  const request = await PartnerChangeRequest.findById(req.params.id).select("+changes");
  if (!request || request.status !== "pending") return res.status(404).json({ success: false, message: "Pending change request not found." });
  if (status === "approved") {
    const partner = await User.findById(request.partnerId);
    const changes = request.changes || {};
    if ([...bankFields].some((field) => changes[field] !== undefined)) {
      partner.bankDetailsHistory.push({ accountHolderName: partner.accountHolderName, bankName: partner.bankName, bankBranch: partner.bankBranch, accountNumber: partner.accountNumber, ifsc: partner.ifsc, accountType: partner.accountType, bankBranchAddress: partner.bankBranchAddress, changedAt: new Date(), changedBy: req.user._id });
    }
    for (const [key, value] of Object.entries(changes)) if (allowedChanges.has(key)) partner[key] = value;
    if ([...bankFields].some((field) => changes[field] !== undefined)) { partner.bankDetailsReviewStatus = "pending"; partner.bankDetailsReviewedBy = null; partner.bankDetailsReviewedAt = null; partner.bankDetailsReviewReason = ""; }
    partner.partnerProfileHistory.push({ fields: Object.keys(changes), changedAt: new Date(), changedBy: req.user._id });
    await partner.save(); await audit(partner._id, req, "profile_change_approved", "", `request=${request._id}`);
  }
  request.status = status; request.reviewedBy = req.user._id; request.reviewedAt = new Date(); request.rejectionReason = status === "rejected" ? String(reason).trim().slice(0, 500) : ""; await request.save();
  return res.json({ success: true, request: { id: request._id, status: request.status, reviewedAt: request.reviewedAt, rejectionReason: request.rejectionReason } });
}

export async function getPartnerAudit(req, res) {
  const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" }).select("_id");
  if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
  const events = await PartnerAuditEvent.find({ partnerId: partner._id }).sort({ createdAt: -1 }).limit(500).select("actorId actorRole action documentId details createdAt");
  return res.json({ success: true, events });
}
