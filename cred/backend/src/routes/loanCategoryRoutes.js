import express from "express";

import {
  getLoanCategories,
  getPublicLoanCategories,
  createLoanCategory,
  updateLoanCategory,
  deleteLoanCategory,
  servePublicLoanCategoryImage,
  uploadLoanCategoryImage,
  deleteLoanCategoryImage,
} from "../controllers/loanCategoryController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadWebsiteImage } from "../middleware/websiteImageUpload.js";

const router = express.Router();

router.get("/public", getPublicLoanCategories);
router.get("/images/:assetKey", servePublicLoanCategoryImage);

// All category routes require authentication
router.use(protect);

// Admin and authenticated partners can view categories
router.get("/", authorizeRoles("admin", "partner"), getLoanCategories);

// Only admin can manage categories
router.post("/", authorizeRoles("admin"), createLoanCategory);
router.post("/:id/image", authorizeRoles("admin"), uploadWebsiteImage, uploadLoanCategoryImage);
router.delete("/:id/image", authorizeRoles("admin"), deleteLoanCategoryImage);

router.patch("/:id", authorizeRoles("admin"), updateLoanCategory);

router.delete("/:id", authorizeRoles("admin"), deleteLoanCategory);

export default router;
