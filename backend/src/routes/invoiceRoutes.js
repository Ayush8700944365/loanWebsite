import express from "express";

import {
  getAllInvoices,
  getMyInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  reconcileInvoice,
} from "../controllers/invoiceController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/my", authorizeRoles("partner"), getMyInvoices);
router.get("/", authorizeRoles("admin"), getAllInvoices);
router.get("/:id", authorizeRoles("admin"), getInvoiceById);
router.post("/", authorizeRoles("admin"), createInvoice);
router.patch("/:id/status", authorizeRoles("admin"), updateInvoiceStatus);
router.post("/:id/reconcile", authorizeRoles("admin"), reconcileInvoice);
router.delete("/:id", authorizeRoles("admin"), deleteInvoice);

export default router;
