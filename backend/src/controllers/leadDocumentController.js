import { open } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import { DOCUMENT_STORAGE_DIR } from "../services/leadDocumentService.js";
import Lead from "../models/Lead.js";
import LoanCategory from "../models/LoanCategory.js";
import {
  canAccessLeadDocuments,
  effectiveDocumentStatus,
  getDocumentFromLead,
  isLeadDocumentVerificationReady,
  replaceDocumentVersion,
  reviewDocumentRecord,
  removeStoredDocument,
  resolveRequiredDocumentTypes,
  storeDocument,
} from "../services/leadDocumentService.js";

const pipe = promisify(pipeline);
const categoryQuery = (name) => ({
  $or: [{ name }, { slug: String(name).trim().toLowerCase().replace(/\s+/g, "-") }],
});

async function getRequiredDocumentsForLead(lead) {
  const category = await LoanCategory.findOne(categoryQuery(lead.loanCategory)).select("documentRequirements").lean();
  // Use the live category policy when the category exists so Admin edits take effect immediately.
  // Keep the saved snapshot only for legacy leads whose category was removed.
  return category ? resolveRequiredDocumentTypes(category, lead.employmentType) : (lead.requiredDocuments || []);
}

export function parseDocumentTypes(raw, fileCount) {
  let entries;
  try {
    entries = JSON.parse(raw || "[]");
  } catch {
    const error = new Error("Document type metadata is invalid.");
    error.statusCode = 400;
    throw error;
  }
  if (!Array.isArray(entries) || entries.length !== fileCount || entries.some((item) => !item || typeof item.name !== "string" || !item.name.trim() || item.name.trim().length > 80)) {
    const error = new Error("Each uploaded file must have a valid document name.");
    error.statusCode = 400;
    throw error;
  }
  return entries.map((item) => ({
    name: item.name.trim(),
    type: typeof item.type === "string" ? item.type.trim().slice(0, 80) : "Other",
    description: typeof item.description === "string" ? item.description.trim().slice(0, 500) : "",
  }));
}

async function storeFiles(files, entries, user = null, role = "customer") {
  const stored = [];
  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const saved = await storeDocument(file);
      stored.push({
        documentId: undefined,
        name: entries[index].name,
        type: entries[index].type,
        description: entries[index].description,
        fileName: path.basename(file.originalname).slice(0, 180),
        storageKey: saved.storageKey,
        mimeType: saved.mimeType,
        size: saved.size,
        status: "pending",
        verified: false,
        uploadedBy: user?._id || null,
        uploadedByRole: role,
      });
    }
    return stored;
  } catch (error) {
    await Promise.all(stored.map((doc) => removeStoredDocument(doc.storageKey)));
    throw error;
  }
}

export async function storeInitialLeadDocuments(files = [], rawTypes = "[]") {
  return storeFiles(files, parseDocumentTypes(rawTypes, files.length));
}

export async function findScopedDocumentLead(req, res) {
  if (!canAccessLeadDocuments({ assignedEmployeeId: req.user?.employeeCode }, req.user) && req.user?.role !== "admin") {
    res.status(403).json({ success: false, message: "Only an administrator or the assigned employee may access customer documents." });
    return null;
  }
  const lead = await Lead.findOne({
    leadCode: req.params.leadCode,
    ...(req.user.role === "employee" ? { assignedEmployeeId: req.user.employeeCode } : {}),
  }).select("+documents.storageKey +documents.fileUrl +documents.history.storageKey");
  if (!lead) res.status(404).json({ success: false, message: "Lead not found." });
  return lead;
}

export const listLeadDocuments = async (req, res) => {
  try {
    const lead = await findScopedDocumentLead(req, res);
    if (!lead) return;
    const documents = lead.documents.map((document) => ({
      documentId: document.documentId,
      name: document.name,
      type: document.type,
      description: document.description || "",
      fileName: document.fileName,
      mimeType: document.mimeType,
      hasFile: Boolean(document.storageKey),
      size: document.size,
      version: document.version || 1,
      status: effectiveDocumentStatus(document),
      rejectionReason: document.rejectionReason || "",
      uploadedByRole: document.uploadedByRole,
        createdAt: document.uploadedAt || document.createdAt,
      reviewedAt: document.reviewedAt,
      history: document.history.map((version) => ({ version: version.version, fileName: version.fileName, status: version.status, rejectionReason: version.rejectionReason, uploadedAt: version.uploadedAt, reviewedAt: version.reviewedAt })),
      reviews: document.reviews.map((review) => ({ status: review.status, reason: review.reason, reviewedAt: review.reviewedAt, version: review.version })),
    }));
    const requiredDocuments = await getRequiredDocumentsForLead(lead);
    res.json({ success: true, leadCode: lead.leadCode, requiredDocuments, policyConfigured: requiredDocuments.length > 0, documents });
  } catch (error) {
    console.error("List lead documents failed:", error.message);
    res.status(500).json({ success: false, message: "Unable to load documents." });
  }
};

export const uploadLeadDocuments = async (req, res) => {
  let uploaded = [];
  try {
    const lead = await findScopedDocumentLead(req, res);
    if (!lead) return;
    if (req.user.role !== "employee") return res.status(403).json({ success: false, message: "Only the assigned employee may upload missing documents." });
    if (!req.files?.length) return res.status(400).json({ success: false, message: "Select at least one document to upload." });
    const entries = parseDocumentTypes(req.body.documentTypes, req.files.length);
    uploaded = await storeFiles(req.files, entries, req.user, "employee");
    for (const newDoc of uploaded) {
      const existing = lead.documents.find((doc) => doc.name.toLowerCase() === newDoc.name.toLowerCase());
      if (existing) {
        const oldStatus = effectiveDocumentStatus(existing);
        replaceDocumentVersion(existing, newDoc, req.user._id);
      } else {
        lead.documents.push(newDoc);
      }
    }
    lead.timeline.push({ step: "Missing documents uploaded", user: req.user.name, status: "completed" });
    await lead.save();
    res.status(201).json({ success: true, message: "Documents uploaded for review.", documents: lead.documents });
  } catch (error) {
    await Promise.all(uploaded.map((doc) => removeStoredDocument(doc.storageKey)));
    console.error("Employee document upload failed:", error.message);
    res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to upload documents." });
  }
};

export const reviewLeadDocument = async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Only an administrator can approve, reject, or request re-upload of lead documents." });
  try {
    const lead = await findScopedDocumentLead(req, res);
    if (!lead) return;
    const document = getDocumentFromLead(lead, req.params.documentId);
    if (!document) return res.status(404).json({ success: false, message: "Document not found." });
    const { status, rejectionReason } = req.body;
    reviewDocumentRecord(document, { status, rejectionReason, userId: req.user._id });
    lead.timeline.push({ step: `Document ${status}: ${document.name} (v${document.version || 1})`, user: req.user.name, status: "completed" });
    await lead.save();
    res.json({ success: true, message: "Document review saved.", document: { documentId: document.documentId, status: document.status, rejectionReason: document.rejectionReason, reviewedAt: document.reviewedAt } });
  } catch (error) {
    console.error("Document review failed:", error.message);
    res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to save document review." });
  }
};

export const verifyLeadDocuments = async (req, res) => {
  try {
    const lead = await findScopedDocumentLead(req, res);
    if (!lead) return;
    if (req.user?.role === "employee" && lead.assignedEmployeeId !== req.user.employeeCode) return res.status(404).json({ success: false, message: "Lead not found." });
    if (req.user?.role !== "admin" && req.user?.role !== "employee") return res.status(403).json({ success: false, message: "Only an administrator or the assigned employee can verify a lead." });
    const required = await getRequiredDocumentsForLead(lead);
    if (!required.length) return res.status(409).json({ success: false, message: "No required-document policy is configured for this loan category and employment type." });
    lead.requiredDocuments = required;
    if (!isLeadDocumentVerificationReady(lead)) {
      const missing = required.filter((name) => !lead.documents.some((doc) => doc.name.toLowerCase() === name.toLowerCase() && effectiveDocumentStatus(doc) === "approved"));
      return res.status(409).json({ success: false, message: "Required documents must all be approved before verification.", missingDocuments: missing });
    }
    if (lead.currentStatus === "Verified") return res.status(409).json({ success: false, message: "Lead is already verified." });
    const verificationFromStatus = lead.currentStatus;
    lead.currentStatus = "Verified";
    lead.verifiedBy = req.user._id;
    lead.verifiedAt = new Date();
    lead.statusHistory.push({ fromStatus: verificationFromStatus, toStatus: "Verified", actorId: req.user._id, actorRole: req.user.role, actorName: req.user.name, at: lead.verifiedAt });
    lead.timeline.push({ step: "Lead verified after required document approval", user: req.user.name, status: "completed" });
    await lead.save();
    res.json({ success: true, message: "Lead verification completed.", lead });
  } catch (error) {
    console.error("Lead verification failed:", error.message);
    res.status(500).json({ success: false, message: "Unable to verify lead." });
  }
};

export const serveLeadDocument = (disposition = "inline") => async (req, res) => {
  let fileHandle;
  try {
    const lead = await findScopedDocumentLead(req, res);
    if (!lead) return;
    const document = getDocumentFromLead(lead, req.params.documentId);
    if (!document || !document.storageKey || !/^[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$/i.test(document.storageKey)) return res.status(404).json({ success: false, message: "Document file not found." });
    const absolutePath = path.resolve(DOCUMENT_STORAGE_DIR, document.storageKey);
    if (!absolutePath.startsWith(path.resolve(DOCUMENT_STORAGE_DIR) + path.sep)) return res.status(404).json({ success: false, message: "Document file not found." });
    // Open the private file before sending headers. If storage has lost the
    // file, pipeline(createReadStream(), res) destroys the response and browsers
    // report a misleading network/CORS failure instead of the actual 404.
    try {
      fileHandle = await open(absolutePath, "r");
    } catch (error) {
      if (error.code === "ENOENT") return res.status(404).json({ success: false, message: "This document is no longer present in private storage. Please upload it again." });
      if (error.code === "EACCES") return res.status(500).json({ success: false, message: "The document is present but the server cannot read its private storage file." });
      throw error;
    }
    const fileInfo = await fileHandle.stat();
    if (!fileInfo.isFile()) return res.status(404).json({ success: false, message: "Document file not found." });
    res.set({ "Content-Type": document.mimeType, "Content-Length": String(fileInfo.size), "Content-Disposition": `${disposition}; filename="${path.basename(document.fileName).replace(/[\r\n"\\]/g, "_")}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Cross-Origin-Resource-Policy": "cross-origin" });
    await pipe(fileHandle.createReadStream({ autoClose: false }), res);
  } catch (error) {
    if (!res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: error.code === "ENOENT" ? "Document file is no longer present in private storage. Please upload it again." : "Unable to read document." });
  } finally {
    await fileHandle?.close().catch(() => {});
  }
};
