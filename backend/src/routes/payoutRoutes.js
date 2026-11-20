import express from "express";

import {
  getAllPayments,
  getMyPayments,
  getPaymentById,
  getPayoutQuote,
  createPayment,
  updatePaymentStatus,
  editPendingPayout,
  uploadPaymentEvidence,
  servePaymentEvidence,
} from "../controllers/payoutController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadLeadDocuments } from "../middleware/leadDocumentUpload.js";

const router = express.Router();

router.use(protect);

// Partner: only their own payout records
router.get("/my", authorizeRoles("partner"), getMyPayments);
router.get("/:id/evidence/:index", authorizeRoles("admin", "partner"), servePaymentEvidence);

// Admin: all payout management operations
router.get("/quote", authorizeRoles("admin"), getPayoutQuote);
router.get("/", authorizeRoles("admin"), getAllPayments);
router.get("/:id", authorizeRoles("admin"), getPaymentById);
router.post("/", authorizeRoles("admin"), createPayment);
router.patch("/:id/status", authorizeRoles("admin"), updatePaymentStatus);
router.post("/:id/evidence", authorizeRoles("admin"), uploadLeadDocuments, uploadPaymentEvidence);
router.patch("/:id", authorizeRoles("admin"), editPendingPayout);

export default router;
