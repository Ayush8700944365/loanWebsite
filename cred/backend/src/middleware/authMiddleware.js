import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { timingSafeEqual } from "crypto";

// Verify JWT and identify logged-in user
export const protect = async (req, res, next) => {
  try {
    let token;
    let cookieSession = false;
    if (req.cookies?.realcred_session) { token = req.cookies.realcred_session; cookieSession = true; }

    const authHeader = req.headers.authorization;

    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (cookieSession && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const cookieCsrf = String(req.cookies?.realcred_csrf || "");
      const headerCsrf = String(req.headers["x-csrf-token"] || "");
      const left = Buffer.from(cookieCsrf);
      const right = Buffer.from(headerCsrf);
      if (!cookieCsrf || left.length !== right.length || !timingSafeEqual(left, right)) return res.status(403).json({ success: false, code: "CSRF_INVALID", message: "Request verification failed. Refresh and try again." });
    }

    const user = await User.findById(decoded.userId).select("+accountNumber");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    // Normalize legacy role casing/whitespace before role-scoped controllers and
    // authorization checks run (some older accounts were imported inconsistently).
    user.role = String(user.role || "").trim().toLowerCase();

    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: "Session has ended. Please log in again.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive or suspended.",
      });
    }

    const pathWithoutQuery = req.originalUrl.split("?")[0];
    const passwordSetupAllowed = ["/api/auth/me", "/api/auth/logout", "/api/auth/change-password"].includes(pathWithoutQuery);
    if (user.mustChangePassword && !passwordSetupAllowed) {
      return res.status(403).json({ success: false, code: "PASSWORD_CHANGE_REQUIRED", message: "Change your temporary password before using the portal." });
    }

    req.user = user;

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }

    console.error("Authentication Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authentication service error.",
    });
  }
};

// Restrict API access based on user roles
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const userRole = String(req.user.role || "").trim().toLowerCase();
    const allowedRoles = roles.map((role) => String(role).trim().toLowerCase());
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    next();
  };
};
