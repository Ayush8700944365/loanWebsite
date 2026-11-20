import express from "express";

import {
  createWebsiteLead,
  createAdminLead,
  createPartnerLead,
  getLeads,
  getLeadById,
  assignLead,
  assignLeadToPartner,
  updateLead,
  deleteLead,
} from "../controllers/leadController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadLeadDocuments } from "../middleware/leadDocumentUpload.js";
import rateLimit from "express-rate-limit";
import { updatePartnerLeadStatus, submitDisbursementUpdate, reviewDisbursementUpdate, serveDisbursementEvidence, listAdminDisbursements } from "../controllers/partnerLeadWorkflowController.js";
import {
  listLeadDocuments,
  uploadLeadDocuments as uploadMissingLeadDocuments,
  reviewLeadDocument,
  verifyLeadDocuments,
  serveLeadDocument,
} from "../controllers/leadDocumentController.js";

const router = express.Router();
const websiteApplicationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });

// Public website loan application
router.post("/website", websiteApplicationLimiter, uploadLeadDocuments, createWebsiteLead);
router.post("/admin", protect, authorizeRoles("admin"), createAdminLead);

router.get("/:leadCode/documents", protect, authorizeRoles("admin", "employee"), listLeadDocuments);
router.post("/:leadCode/documents", protect, authorizeRoles("employee"), uploadLeadDocuments, uploadMissingLeadDocuments);
router.patch("/:leadCode/documents/:documentId/review", protect, authorizeRoles("admin"), reviewLeadDocument);
router.post("/:leadCode/verify", protect, authorizeRoles("admin", "employee"), verifyLeadDocuments);
router.get("/:leadCode/documents/:documentId/preview", protect, authorizeRoles("admin", "employee"), serveLeadDocument("inline"));
router.get("/:leadCode/documents/:documentId/download", protect, authorizeRoles("admin", "employee"), serveLeadDocument("attachment"));

// Partner submits a referral lead
router.post("/partner", protect, authorizeRoles("partner"), createPartnerLead);
router.patch("/:leadCode/partner-status", protect, authorizeRoles("partner"), updatePartnerLeadStatus);
router.post("/:leadCode/disbursement", protect, authorizeRoles("partner"), uploadLeadDocuments, submitDisbursementUpdate);
router.get("/disbursements", protect, authorizeRoles("admin"), listAdminDisbursements);
router.post("/:leadCode/disbursement/review", protect, authorizeRoles("admin"), reviewDisbursementUpdate);
router.get("/:leadCode/disbursement/evidence/:index", protect, authorizeRoles("admin", "partner"), serveDisbursementEvidence);

// Admin, Employee and Partner can fetch their permitted leads
router.get(
  "/",
  protect,
  authorizeRoles("admin", "employee", "partner"),
  getLeads,
);

// Fetch one lead (controller checks ownership)
router.get(
  "/:leadCode",
  protect,
  authorizeRoles("admin", "employee", "partner"),
  getLeadById,
);

// Admin assigns lead to an employee
router.patch("/:leadCode/assign", protect, authorizeRoles("admin"), assignLead);
router.patch("/:leadCode/partner-assignment", protect, authorizeRoles("admin", "employee"), assignLeadToPartner);

// Admin or assigned employee updates lead
router.patch(
  "/:leadCode",
  protect,
  authorizeRoles("admin", "employee"),
  updateLead,
);

// Admin deletes a lead
router.delete("/:leadCode", protect, authorizeRoles("admin"), deleteLead);

export default router;
