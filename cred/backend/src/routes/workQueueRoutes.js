import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { createApplication, getApplications, updateApplication, getCustomers, createCustomer } from "../controllers/workQueueController.js";
import { createFollowUp, listFollowUps, updateFollowUp } from "../controllers/followUpController.js";

const router = express.Router();
router.use(protect);
router.get("/applications", authorizeRoles("admin"), getApplications);
router.post("/applications", authorizeRoles("admin"), createApplication);
router.patch("/applications/:id", authorizeRoles("admin"), updateApplication);
router.get("/customers", authorizeRoles("admin"), getCustomers);
router.post("/customers", authorizeRoles("admin"), createCustomer);
router.get("/followups", authorizeRoles("admin", "employee"), listFollowUps);
router.post("/followups", authorizeRoles("admin", "employee"), createFollowUp);
router.patch("/followups/:id", authorizeRoles("admin", "employee"), updateFollowUp);
export default router;
