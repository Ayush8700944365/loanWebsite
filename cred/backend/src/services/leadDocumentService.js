import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DOCUMENT_STORAGE_DIR = path.resolve(
  process.env.DOCUMENT_STORAGE_PATH || path.join(backendRoot, "private-documents"),
);
const forbiddenStorageRoots = [
  path.join(backendRoot, "dist"),
  path.join(backendRoot, "public"),
  path.join(backendRoot, "uploads"),
  path.resolve(backendRoot, "../frontend/public"),
];
if (forbiddenStorageRoots.some((root) => DOCUMENT_STORAGE_DIR === root || DOCUMENT_STORAGE_DIR.startsWith(`${root}${path.sep}`))) {
  throw new Error("DOCUMENT_STORAGE_PATH must be outside public and legacy upload directories.");
}

const MAX_SIZE = Number.parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024;
const DOCUMENT_TYPES = {
  ".pdf": { mime: "application/pdf", signature: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
  ".jpg": { mime: "image/jpeg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  ".jpeg": { mime: "image/jpeg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  ".png": { mime: "image/png", signature: (b) => b.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) },
  ".webp": { mime: "image/webp", signature: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
};

export function validateDocumentFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) return { valid: false, reason: "A file is required." };
  if (file.size > MAX_SIZE) return { valid: false, reason: `File exceeds the ${Math.floor(MAX_SIZE / 1024 / 1024)} MB limit.`, tooLarge: true };
  const extension = path.extname(file.originalname || "").toLowerCase();
  const spec = DOCUMENT_TYPES[extension];
  if (!spec || file.mimetype !== spec.mime) return { valid: false, reason: "Only matching PDF, JPG, JPEG, PNG, or WebP files are allowed." };
  if (!spec.signature(file.buffer)) return { valid: false, reason: "File content does not match its declared type." };
  return { valid: true, extension, mimeType: spec.mime };
}

export async function storeDocument(file) {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    const error = new Error(validation.reason);
    error.statusCode = validation.tooLarge ? 413 : 400;
    throw error;
  }
  await mkdir(DOCUMENT_STORAGE_DIR, { recursive: true, mode: 0o700 });
  const storageKey = `${randomUUID()}${validation.extension}`;
  const absolutePath = path.join(DOCUMENT_STORAGE_DIR, storageKey);
  await writeFile(absolutePath, file.buffer, { flag: "wx", mode: 0o600 });
  return { storageKey, mimeType: validation.mimeType, size: file.size, absolutePath };
}

export async function removeStoredDocument(storageKey) {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$/i.test(storageKey || "")) return;
  await unlink(path.join(DOCUMENT_STORAGE_DIR, storageKey)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
}

export function effectiveDocumentStatus(document) {
  if (document.status) return document.status;
  return document.verified ? "approved" : "pending";
}

export function canAccessLeadDocuments(lead, user) {
  if (!lead || !user) return false;
  if (user.role === "admin") return true;
  return user.role === "employee" && Boolean(user.employeeCode) && lead.assignedEmployeeId === user.employeeCode;
}

export function getDocumentFromLead(lead, documentId) {
  if (!lead || !documentId) return null;
  return (lead.documents || []).find((document) =>
    document.documentId === documentId || String(document._id || "") === String(documentId)
  ) || null;
}

export function getMissingRequiredDocuments(lead) {
  const uploaded = new Map((lead.documents || []).map((doc) => [doc.name.toLowerCase(), effectiveDocumentStatus(doc)]));
  return (lead.requiredDocuments || []).filter((name) => uploaded.get(name.toLowerCase()) !== "approved");
}

export function isLeadDocumentVerificationReady(lead) {
  return Boolean(lead.requiredDocuments?.length) && getMissingRequiredDocuments(lead).length === 0;
}

export function reviewDocumentRecord(document, { status, rejectionReason = "", userId, now = new Date() }) {
  if (!["approved", "rejected", "reupload_requested"].includes(status)) {
    const error = new Error("Invalid document review status.");
    error.statusCode = 400;
    throw error;
  }
  const reason = String(rejectionReason).trim().slice(0, 500);
  if (status !== "approved" && !reason) {
    const error = new Error("A reason is required when rejecting or requesting re-upload.");
    error.statusCode = 400;
    throw error;
  }
  document.status = status;
  document.verified = status === "approved";
  document.rejectionReason = status === "approved" ? "" : reason;
  document.reviewedBy = userId;
  document.reviewedAt = now;
  document.reviews ||= [];
  document.reviews.push({ status, reason: document.rejectionReason, reviewedBy: userId, reviewedAt: now, version: document.version || 1 });
  return document;
}

export function replaceDocumentVersion(existing, replacement, userId, now = new Date()) {
  existing.history ||= [];
  existing.history.push({
    version: existing.version || 1,
    storageKey: existing.storageKey || "",
    fileName: existing.fileName,
    mimeType: existing.mimeType,
    size: existing.size,
    uploadedAt: existing.uploadedAt || existing.createdAt,
    uploadedBy: existing.uploadedBy,
    status: effectiveDocumentStatus(existing),
    rejectionReason: existing.rejectionReason || "",
    description: existing.description || "",
    reviewedBy: existing.reviewedBy,
    reviewedAt: existing.reviewedAt,
  });
  existing.version = (existing.version || 1) + 1;
  existing.fileName = replacement.fileName;
  existing.storageKey = replacement.storageKey;
  existing.mimeType = replacement.mimeType;
  existing.description = replacement.description || "";
  existing.size = replacement.size;
  existing.uploadedAt = now;
  existing.status = "pending";
  existing.verified = false;
  existing.rejectionReason = "";
  existing.uploadedBy = userId;
  existing.uploadedByRole = "employee";
  existing.reviewedBy = null;
  existing.reviewedAt = null;
  existing.reviews = [];
  return existing;
}

export function resolveRequiredDocumentTypes(category, employmentType) {
  const normalizedEmployment = String(employmentType || "").trim().toLowerCase();
  return [...new Set((category?.documentRequirements || [])
    .filter((item) => !item.employmentTypes?.length || item.employmentTypes.some((type) => type.trim().toLowerCase() === normalizedEmployment))
    .map((item) => String(item.documentType || "").trim())
    .filter(Boolean))];
}
