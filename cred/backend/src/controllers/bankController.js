import Bank from "../models/Bank.js";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { DOCUMENT_STORAGE_DIR, removeStoredDocument, storeDocument } from "../services/leadDocumentService.js";
import LoanCategory from "../models/LoanCategory.js";
import { readWebsiteImage, removeWebsiteImage, storeWebsiteImage } from "../services/websiteAssetService.js";

const validateDirectoryFields = async (body) => {
  if (body.institutionType !== undefined && !["Bank", "NBFC"].includes(body.institutionType)) return "Institution type must be Bank or NBFC.";
  if (body.websiteUrl !== undefined && body.websiteUrl !== "") {
    try { if (!["http:", "https:"].includes(new URL(body.websiteUrl).protocol)) return "Website URL must use HTTP or HTTPS."; }
    catch { return "Enter a valid website URL."; }
  }
  if (body.displayOrder !== undefined && (!Number.isInteger(Number(body.displayOrder)) || Number(body.displayOrder) < 0)) return "Display order must be a non-negative whole number.";
  if (body.isPublicInstitution !== undefined && typeof body.isPublicInstitution !== "boolean") return "Directory visibility must be true or false.";
  if (body.publicDescription !== undefined && (typeof body.publicDescription !== "string" || body.publicDescription.length > 1500)) return "Public description must be 1500 characters or fewer.";
  if (body.availableLoanCategories !== undefined) {
    if (!Array.isArray(body.availableLoanCategories) || body.availableLoanCategories.length > 20 || body.availableLoanCategories.some((id) => typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id))) return "Choose valid published loan categories.";
    const uniqueIds = [...new Set(body.availableLoanCategories)];
    if (uniqueIds.length !== body.availableLoanCategories.length) return "A loan category can only be selected once.";
    const activeCategories = await LoanCategory.countDocuments({ _id: { $in: uniqueIds }, status: "active" });
    if (activeCategories !== uniqueIds.length) return "Institution loan categories must be active published categories.";
  }
  return "";
};

export const getPublicBanks = async (_req, res) => {
  try {
    const banks = await Bank.find({ isPublicInstitution: true, status: "active" })
      .select("name category minRoi maxLtv tat processingFee institutionType websiteUrl publicDescription availableLoanCategories displayOrder logoStorageKey")
      .populate({ path: "availableLoanCategories", match: { status: "active" }, select: "name slug" })
      .sort({ displayOrder: 1, name: 1 }).lean();
    return res.json({ success: true, banks });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load institution directory." });
  }
};

export const serveInstitutionLogo = async (req, res) => {
  try {
    if (!Bank.base.Types.ObjectId.isValid(req.params.bankId)) return res.status(404).end();
    const bank = await Bank.findOne({ _id: req.params.bankId, isPublicInstitution: true, status: "active" }).select("logoStorageKey").lean();
    if (!bank?.logoStorageKey) return res.status(404).end();
    const image = await readWebsiteImage(bank.logoStorageKey);
    if (!image) return res.status(404).end();
    const mimeType = /\.png$/i.test(bank.logoStorageKey) ? "image/png" : /\.webp$/i.test(bank.logoStorageKey) ? "image/webp" : "image/jpeg";
    return res.type(mimeType).set("X-Content-Type-Options", "nosniff").set("Cross-Origin-Resource-Policy", "cross-origin").set("Cache-Control", "public, max-age=300").send(image);
  } catch {
    return res.status(500).end();
  }
};

export const uploadBankLogo = async (req, res) => {
  let stored;
  let saved = false;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a logo image." });
    const bank = await Bank.findById(req.params.id).select("+supportingDocuments.storageKey");
    if (!bank) return res.status(404).json({ success: false, message: "Institution not found." });
    stored = await storeWebsiteImage(req.file);
    const previous = bank.logoStorageKey;
    bank.logoStorageKey = stored.storageKey;
    await bank.save();
    saved = true;
    if (previous) await removeWebsiteImage(previous).catch(() => {});
    const safeBank = bank.toObject();
    safeBank.supportingDocuments = (safeBank.supportingDocuments || []).map(({ storageKey: _storageKey, ...item }) => item);
    return res.json({ success: true, message: "Logo updated.", bank: safeBank });
  } catch (error) {
    if (stored?.storageKey && !saved) await removeWebsiteImage(stored.storageKey).catch(() => {});
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to save institution logo." });
  }
};


export const uploadBankSupportingDocuments = async (req, res) => {
  const storedFiles = [];
  let saved = false;
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: "Choose at least one supporting document." });
    const bank = await Bank.findById(req.params.id).select("+supportingDocuments.storageKey");
    if (!bank) return res.status(404).json({ success: false, message: "Institution not found." });
    if ((bank.supportingDocuments?.length || 0) + req.files.length > 20) return res.status(400).json({ success: false, message: "An institution can have up to 20 supporting documents." });
    for (const file of req.files) {
      const stored = await storeDocument(file);
      storedFiles.push(stored.storageKey);
      const fileName = path.basename(file.originalname || "document").replace(/[\r\n"\\]/g, "_").slice(0, 180);
      bank.supportingDocuments.push({
        documentId: randomUUID(),
        name: fileName,
        fileName,
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        size: stored.size,
      });
    }
    await bank.save();
    saved = true;
    const safeBank = bank.toObject();
    safeBank.supportingDocuments = (safeBank.supportingDocuments || []).map(({ storageKey: _storageKey, ...item }) => item);
    return res.status(201).json({ success: true, message: "Supporting documents uploaded.", bank: safeBank });
  } catch (error) {
    if (!saved) await Promise.all(storedFiles.map((key) => removeStoredDocument(key).catch(() => {})));
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to upload supporting documents." });
  }
};

export const downloadBankSupportingDocument = async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id).select("+supportingDocuments.storageKey");
    const document = bank?.supportingDocuments?.find((item) => item.documentId === req.params.documentId);
    if (!document || !/^[0-9a-f-]{36}\.(pdf|jpg|jpeg|png|webp)$/i.test(document.storageKey || "")) return res.status(404).json({ success: false, message: "Supporting document not found." });
    const absolutePath = path.resolve(DOCUMENT_STORAGE_DIR, document.storageKey);
    if (!absolutePath.startsWith(path.resolve(DOCUMENT_STORAGE_DIR) + path.sep)) return res.status(404).end();
    const bytes = await readFile(absolutePath);
    const disposition = req.path.endsWith("/preview") ? "inline" : "attachment";
    const safeName = path.basename(document.fileName || document.name || "document").replace(/[\r\n"\\]/g, "_");
    return res.set({ "Content-Type": document.mimeType, "Content-Disposition": `${disposition}; filename="${safeName}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Cross-Origin-Resource-Policy": "cross-origin" }).send(bytes);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ success: false, message: "Supporting document file not found." });
    return res.status(500).json({ success: false, message: "Unable to retrieve supporting document." });
  }
};

export const deleteBankSupportingDocument = async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id).select("+supportingDocuments.storageKey");
    if (!bank) return res.status(404).json({ success: false, message: "Institution not found." });
    const document = bank.supportingDocuments.find((item) => item.documentId === req.params.documentId);
    if (!document) return res.status(404).json({ success: false, message: "Supporting document not found." });
    const storageKey = document.storageKey;
    bank.supportingDocuments = bank.supportingDocuments.filter((item) => item.documentId !== req.params.documentId);
    await bank.save();
    await removeStoredDocument(storageKey);
    return res.json({ success: true, message: "Supporting document removed." });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to remove supporting document." });
  }
};

export const deleteBankLogo = async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id).select("+supportingDocuments.storageKey");
    if (!bank) return res.status(404).json({ success: false, message: "Institution not found." });
    const previous = bank.logoStorageKey;
    bank.logoStorageKey = "";
    await bank.save();
    if (previous) await removeWebsiteImage(previous);
    return res.json({ success: true, message: "Logo removed." });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to remove institution logo." });
  }
};

// GET operational bank records for authenticated CRM pages.
export const getBanks = async (req, res) => {
  try {
    const banks = await Bank.find().sort({ createdAt: -1 });
    if (req.user?.role !== "admin") {
      const partnerSafeBanks = banks.map((bank) => {
        const value = bank.toObject();
        delete value.supportingDocuments;
        return value;
      });
      return res.status(200).json({ success: true, count: partnerSafeBanks.length, banks: partnerSafeBanks });
    }
    return res.status(200).json({ success: true, count: banks.length, banks });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to fetch banks." });
  }
};

export const createBank = async (req, res) => {
  try {
    const { name, category } = req.body;
    const directoryError = await validateDirectoryFields(req.body);
    if (directoryError) return res.status(400).json({ success: false, message: directoryError });
    if (!name?.trim() || !category?.trim()) return res.status(400).json({ success: false, message: "Bank name and category are required." });
    const bank = await Bank.create({
      name: name.trim(), category: category.trim(), minRoi: req.body.minRoi,
      maxLtv: req.body.maxLtv, tat: req.body.tat, processingFee: req.body.processingFee,
      relationshipManager: req.body.relationshipManager, contactPhone: req.body.contactPhone,
      activeFiles: req.body.activeFiles, status: req.body.status,
      institutionType: req.body.institutionType, websiteUrl: req.body.websiteUrl,
      publicDescription: req.body.publicDescription, availableLoanCategories: req.body.availableLoanCategories,
      displayOrder: req.body.displayOrder, isPublicInstitution: true,
    });
    return res.status(201).json({ success: true, message: "Bank added successfully.", bank });
  } catch (error) {
    return res.status(error.name === "ValidationError" ? 400 : 500).json({ success: false, message: error.name === "ValidationError" ? "Bank details are invalid." : "Failed to create bank." });
  }
};

export const updateBank = async (req, res) => {
  try {
    const directoryError = await validateDirectoryFields(req.body);
    if (directoryError) return res.status(400).json({ success: false, message: directoryError });
    const allowedFields = ["name", "category", "minRoi", "maxLtv", "tat", "processingFee", "relationshipManager", "contactPhone", "activeFiles", "status", "institutionType", "websiteUrl", "publicDescription", "availableLoanCategories", "displayOrder", "isPublicInstitution"];
    const updates = Object.fromEntries(allowedFields.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
    updates.isPublicInstitution = true;
    if (updates.status !== undefined && !["active", "inactive"].includes(updates.status)) return res.status(400).json({ success: false, message: "Invalid bank status." });
    const bank = await Bank.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!bank) return res.status(404).json({ success: false, message: "Bank not found." });
    return res.json({ success: true, message: "Bank updated successfully.", bank });
  } catch (error) {
    return res.status(error.name === "ValidationError" ? 400 : 500).json({ success: false, message: error.name === "ValidationError" ? "Bank details are invalid." : "Failed to update bank." });
  }
};

export const deleteBank = async (req, res) => {
  try {
    const bank = await Bank.findById(req.params.id).select("+supportingDocuments.storageKey");
    if (bank) await Bank.deleteOne({ _id: bank._id });
    if (!bank) return res.status(404).json({ success: false, message: "Bank not found." });
    if (bank.logoStorageKey) await removeWebsiteImage(bank.logoStorageKey);
    await Promise.all((bank.supportingDocuments || []).map((document) => removeStoredDocument(document.storageKey)));
    return res.json({ success: true, message: "Bank deleted successfully." });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to delete bank." });
  }
};
