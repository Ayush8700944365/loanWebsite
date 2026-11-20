import express from "express";

import {
  login,
  getMe,
  updateMe,
  logout,
  changePassword,
  getCsrfToken,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 5000 : 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Try again later." },
});

// POST /api/auth/login
router.post("/login", loginLimiter, login);
router.get("/csrf", getCsrfToken);

// GET /api/auth/me
router.get("/me", protect, getMe);

// PUT /api/auth/me - Update logged-in user's profile
router.put("/me", protect, updateMe);

router.post("/change-password", protect, changePassword);

// POST /api/auth/logout
router.post("/logout", protect, logout);

export default router;
