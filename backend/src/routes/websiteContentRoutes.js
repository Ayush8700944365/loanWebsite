import express from "express";

import {
  getWebsiteContent,
  getPublicWebsiteStats,
  updateWebsiteContent,
  uploadTeamPhoto,
  serveWebsiteAsset,
  serveAdminWebsiteAsset,
  deleteWebsiteAsset,
} from "../controllers/websiteContentController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { uploadWebsiteImage } from "../middleware/websiteImageUpload.js";

const router = express.Router();

router.get("/assets/:assetKey", serveWebsiteAsset);
router.get("/admin-assets/:assetKey", protect, authorizeRoles("admin"), serveAdminWebsiteAsset);
router.post("/team-assets", protect, authorizeRoles("admin"), uploadWebsiteImage, uploadTeamPhoto);
router.delete("/assets/:assetKey", protect, authorizeRoles("admin"), deleteWebsiteAsset);
router.get("/public-stats", getPublicWebsiteStats);

// Public website can fetch published content
router.get("/", getWebsiteContent);

// Only Admin can update website content
router.put("/", protect, authorizeRoles("admin"), updateWebsiteContent);

export default router;
