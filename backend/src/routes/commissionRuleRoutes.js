import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { listCommissionRules, saveCommissionRule, setCommissionRuleStatus } from "../controllers/commissionRuleController.js";

const router = express.Router();
router.use(protect, authorizeRoles("admin"));
router.get("/", listCommissionRules);
router.post("/", saveCommissionRule);
router.patch("/:id/status", setCommissionRuleStatus);
export default router;
