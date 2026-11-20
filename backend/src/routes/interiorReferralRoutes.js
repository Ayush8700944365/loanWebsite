import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { createInteriorReferral, listInteriorReferrals, updateInteriorReferral } from "../controllers/interiorReferralController.js";

const router = express.Router();
router.use(protect);
router.get("/", authorizeRoles("admin", "partner"), listInteriorReferrals);
router.post("/", authorizeRoles("admin", "partner"), createInteriorReferral);
router.patch("/:referralCode/status", authorizeRoles("admin"), updateInteriorReferral);
export default router;
