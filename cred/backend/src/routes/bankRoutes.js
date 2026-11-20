import express from "express";

import {
  getBanks,
  createBank,
  updateBank,
  deleteBank,
  getPublicBanks,
  uploadBankLogo,
  deleteBankLogo,
  uploadBankSupportingDocuments,
  downloadBankSupportingDocument,
  deleteBankSupportingDocument,
} from "../controllers/bankController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadWebsiteImage } from "../middleware/websiteImageUpload.js";
import { uploadLeadDocuments } from "../middleware/leadDocumentUpload.js";

const router = express.Router();

// Public homepage directory exposes only explicitly published active institutions.
router.get("/public", getPublicBanks);

// Fetch banks - Admin and Partner
router.get("/", protect, authorizeRoles("admin", "partner"), getBanks);

// Create bank - Admin only
router.post("/", protect, authorizeRoles("admin"), createBank);
router.post("/:id/logo", protect, authorizeRoles("admin"), uploadWebsiteImage, uploadBankLogo);
router.post("/:id/documents", protect, authorizeRoles("admin"), uploadLeadDocuments, uploadBankSupportingDocuments);
router.get("/:id/documents/:documentId/preview", protect, authorizeRoles("admin"), downloadBankSupportingDocument);
router.get("/:id/documents/:documentId/download", protect, authorizeRoles("admin"), downloadBankSupportingDocument);
router.delete("/:id/documents/:documentId", protect, authorizeRoles("admin"), deleteBankSupportingDocument);
router.delete("/:id/logo", protect, authorizeRoles("admin"), deleteBankLogo);

// Update bank - Admin only
router.patch("/:id", protect, authorizeRoles("admin"), updateBank);

// Delete bank - Admin only
router.delete("/:id", protect, authorizeRoles("admin"), deleteBank);

export default router;
