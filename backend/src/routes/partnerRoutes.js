import express from "express";
import {
  createPartner,
  getPartners,
  updatePartnerStatus,
  resetPartnerPassword,
} from "../controllers/partnerController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadPartnerDocuments } from "../middleware/leadDocumentUpload.js";
import { addPartnerInternalNote, adminUpdatePartnerProfile, applyPartnerApplication, createPartnerChangeRequest, createPartnerCorrectionRequest, getEligiblePartners, getPartnerAudit, getPartnerCorrectionForm, getPartnerPayoutDetails, listPartnerApplications, listPartnerChangeRequests, listPartnerCorrectionRequests, listPartnerInternalNotes, reuploadPartnerDocuments, reviewPartnerBankDetails, reviewPartnerChangeRequest, reviewPartnerDocument, servePartnerDocument, submitPartnerCorrection, uploadPartnerDocumentsForAdmin } from "../controllers/partnerOnboardingController.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
const applicationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/apply", applicationLimiter, uploadPartnerDocuments, applyPartnerApplication);
router.get("/corrections/:token", applicationLimiter, getPartnerCorrectionForm);
router.post("/corrections/:token", applicationLimiter, uploadPartnerDocuments, submitPartnerCorrection);

router.get("/eligible", protect, authorizeRoles("admin", "employee"), getEligiblePartners);
router.get("/change-requests", protect, authorizeRoles("admin"), listPartnerChangeRequests);
router.get("/correction-requests", protect, authorizeRoles("admin"), listPartnerCorrectionRequests);
router.patch("/change-requests/:id/review", protect, authorizeRoles("admin"), reviewPartnerChangeRequest);
router.post("/:partnerCode/correction-requests", protect, authorizeRoles("admin"), createPartnerCorrectionRequest);
router.get("/me", protect, authorizeRoles("partner"), listPartnerApplications);
router.post("/me/change-requests", protect, authorizeRoles("partner"), createPartnerChangeRequest);
router.post("/me/documents", protect, authorizeRoles("partner"), uploadPartnerDocuments, reuploadPartnerDocuments);

router.get("/:partnerCode/payout-details", protect, authorizeRoles("admin"), getPartnerPayoutDetails);
router.post("/:partnerCode/password-reset", protect, authorizeRoles("admin"), resetPartnerPassword);
router.patch("/:partnerCode/profile", protect, authorizeRoles("admin"), adminUpdatePartnerProfile);
router.post("/:partnerCode/documents", protect, authorizeRoles("admin"), uploadPartnerDocuments, uploadPartnerDocumentsForAdmin);
router.get("/:partnerCode/internal-notes", protect, authorizeRoles("admin"), listPartnerInternalNotes);
router.post("/:partnerCode/internal-notes", protect, authorizeRoles("admin"), addPartnerInternalNote);
router.patch("/:partnerCode/bank-review", protect, authorizeRoles("admin"), reviewPartnerBankDetails);
router.get("/:partnerCode/audit", protect, authorizeRoles("admin"), getPartnerAudit);
router.get("/:partnerCode/documents/:documentId/preview", protect, authorizeRoles("admin"), servePartnerDocument);
router.get("/:partnerCode/documents/:documentId/download", protect, authorizeRoles("admin"), servePartnerDocument);
router.get("/:partnerCode/documents/:documentId/versions/:version/preview", protect, authorizeRoles("admin"), servePartnerDocument);
router.get("/:partnerCode/documents/:documentId/versions/:version/download", protect, authorizeRoles("admin"), servePartnerDocument);
router.patch("/:partnerCode/documents/:documentId/review", protect, authorizeRoles("admin"), reviewPartnerDocument);

// Only authenticated Admin can create partners
router.post("/", protect, authorizeRoles("admin"), createPartner);

// Only authenticated Admin can fetch partners
router.get("/", protect, authorizeRoles("admin"), getPartners);

router.patch(
  "/:partnerCode/status",
  protect,
  authorizeRoles("admin"),
  updatePartnerStatus,
);

export default router;
