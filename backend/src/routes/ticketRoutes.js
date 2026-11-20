import express from "express";
import rateLimit from "express-rate-limit";

import {
  getTickets,
  createTicket,
  addTicketMessage,
  updateTicketStatus,
  createCallbackRequest,
  assignCallbackRequest,
  addCallbackInternalNote,
} from "../controllers/ticketController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();
const callbackLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: process.env.NODE_ENV === "test" ? 50 : 5, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/callback", callbackLimiter, createCallbackRequest);

// All ticket APIs require authentication
router.use(protect);

// Admin, Partner and Employee can view tickets
// Backend controller automatically filters tickets by owner.
router.get("/", authorizeRoles("admin", "partner", "employee"), getTickets);

// All three roles can create tickets
router.post("/", authorizeRoles("admin", "partner", "employee"), createTicket);

// All three roles can reply to their authorized tickets
router.post(
  "/:id/messages",
  authorizeRoles("admin", "partner", "employee"),
  addTicketMessage,
);
router.patch("/:id/assign", authorizeRoles("admin"), assignCallbackRequest);
router.post("/:id/notes", authorizeRoles("admin", "employee"), addCallbackInternalNote);

// Only Admin can update ticket status
router.patch("/:id/status", authorizeRoles("admin", "employee"), updateTicketStatus);

export default router;
