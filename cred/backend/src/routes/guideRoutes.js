import express from "express";

import {
  uploadGuide,
  getGuides,
  downloadGuide,
  deleteGuide,
} from "../controllers/guideController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import guideUpload from "../middleware/guideUpload.js";

const router = express.Router();

// All guide routes require authentication
router.use(protect);

// Fetch guides - Admin, Partner and Employee
router.get("/", authorizeRoles("admin", "partner", "employee"), getGuides);

// Upload guide - Admin only
router.post(
  "/",
  authorizeRoles("admin"),
  guideUpload.single("file"),
  uploadGuide,
);

// Download guide - Admin, Partner and Employee
router.get(
  "/:id/download",
  authorizeRoles("admin", "partner", "employee"),
  downloadGuide,
);

// Delete guide - Admin only
router.delete("/:id", authorizeRoles("admin"), deleteGuide);

export default router;
