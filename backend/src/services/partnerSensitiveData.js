import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function deriveKey(source) {
  if (!source || source.length < 32) throw new Error("Partner PII encryption keys must contain at least 32 characters.");
  if (/^[0-9a-f]{64}$/i.test(source)) return Buffer.from(source, "hex");
  return createHash("sha256").update(source).digest();
}

function keyring() {
  const raw = process.env.PARTNER_PII_ENCRYPTION_KEYS;
  if (raw) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error("PARTNER_PII_ENCRYPTION_KEYS must be a JSON object keyed by key ID."); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("PARTNER_PII_ENCRYPTION_KEYS must be a JSON object keyed by key ID.");
    return parsed;
  }
  const legacy = process.env.PARTNER_PII_ENCRYPTION_KEY || (process.env.NODE_ENV === "production" ? "" : process.env.JWT_SECRET);
  if (!legacy) throw new Error("PARTNER_PII_ENCRYPTION_KEY or PARTNER_PII_ENCRYPTION_KEYS is required.");
  return { legacy };
}

function activeKey() {
  const keys = keyring();
  const keyId = process.env.PARTNER_PII_ACTIVE_KEY_ID || (keys.legacy ? "legacy" : "");
  if (!keyId || !/^[A-Za-z0-9_-]{1,40}$/.test(keyId) || !keys[keyId]) throw new Error("PARTNER_PII_ACTIVE_KEY_ID must name a configured encryption key.");
  return { keyId, key: deriveKey(String(keys[keyId])) };
}

export function validatePartnerEncryptionConfig({ production = process.env.NODE_ENV === "production" } = {}) {
  try {
    const active = activeKey();
    if (production && !process.env.PARTNER_PII_ENCRYPTION_KEYS && !process.env.PARTNER_PII_ENCRYPTION_KEY) return { valid: false, message: "Configure an independent partner PII encryption key." };
    for (const value of Object.values(keyring())) deriveKey(String(value));
    return { valid: true, activeKeyId: active.keyId };
  } catch (error) { return { valid: false, message: error.message }; }
}

function encryptPlaintext(text) {
  const { keyId, key } = activeKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `enc:v2:${keyId}:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}

export function encryptPartnerValue(value = "") {
  let text = String(value || "").trim();
  if (!text) return "";
  if (text.startsWith("enc:v2:")) return text;
  if (text.startsWith("enc:v1:")) text = decryptPartnerValue(text);
  return encryptPlaintext(text);
}

export function reencryptPartnerValue(value = "") {
  const plain = decryptPartnerValue(value);
  return plain ? encryptPlaintext(plain) : "";
}

export function decryptPartnerValue(value = "") {
  const text = String(value || "");
  if (text.startsWith("enc:v2:")) {
    const [, , keyId, iv, tag, encrypted] = text.split(":");
    const keyValue = keyring()[keyId];
    if (!keyValue) throw new Error(`Partner PII decryption key '${keyId}' is not configured.`);
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(String(keyValue)), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  }
  if (text.startsWith("enc:v1:")) {
    const [, , iv, tag, encrypted] = text.split(":");
    const oldKey = process.env.PARTNER_PII_ENCRYPTION_KEY || (process.env.NODE_ENV === "production" ? "" : process.env.JWT_SECRET);
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(oldKey), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  }
  return text; // Legacy plaintext is readable by the secure application layer until migrated.
}

export function maskPartnerAccount(value = "") {
  const plain = decryptPartnerValue(value);
  if (!plain) return "";
  const digits = plain.replace(/\s/g, "");
  return `****${digits.slice(-4)}`;
}

export function maskPartnerDocument(document) {
  return {
    documentId: document.documentId,
    documentType: document.documentType,
    fileName: document.fileName,
    mimeType: document.mimeType,
    size: document.size,
    uploadedAt: document.uploadedAt,
    status: document.status,
    rejectionReason: document.rejectionReason || "",
    version: document.version || 1,
    history: (document.history || []).map((item) => ({ version: item.version, fileName: item.fileName, status: item.status, uploadedAt: item.uploadedAt, reviewedAt: item.reviewedAt, rejectionReason: item.rejectionReason || "" })),
    reviews: (document.reviews || []).map((item) => ({ status: item.status, reason: item.reason || "", reviewedBy: item.reviewedBy, reviewedAt: item.reviewedAt, version: item.version })),
  };
}

export function partnerPublicView(user) {
  const source = typeof user.toObject === "function" ? user.toObject() : user;
  const { password, accountNumber, partnerInternalNotes, ...safe } = source;
  return {
    ...safe,
    accountNumber: maskPartnerAccount(accountNumber),
    bankDetailsHistory: (source.bankDetailsHistory || []).map((entry) => ({ ...entry, accountNumber: maskPartnerAccount(entry.accountNumber) })),
    partnerDocuments: (source.partnerDocuments || []).map(maskPartnerDocument),
  };
}
