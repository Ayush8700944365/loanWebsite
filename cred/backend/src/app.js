import authRoutes from "./routes/authRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import partnerRoutes from "./routes/partnerRoutes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import leadRoutes from "./routes/leadRoutes.js";
import websiteContentRoutes from "./routes/websiteContentRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import payoutRoutes from "./routes/payoutRoutes.js";
import loanCategoryRoutes from "./routes/loanCategoryRoutes.js";
import bankRoutes from "./routes/bankRoutes.js";
import { getPublicBanks, serveInstitutionLogo } from "./controllers/bankController.js";
import guideRoutes from "./routes/guideRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import commissionRuleRoutes from "./routes/commissionRuleRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { mkdir, access } from "fs/promises";
import { DOCUMENT_STORAGE_DIR } from "./services/leadDocumentService.js";
import workQueueRoutes from "./routes/workQueueRoutes.js";
import interiorReferralRoutes from "./routes/interiorReferralRoutes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  const allowedClientOrigins = new Set([
    ...(process.env.CLIENT_URL || "http://localhost:5173").split(",").map((origin) => origin.trim()).filter(Boolean),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ]);
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedClientOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === "test" ? 5000 : 500, standardHeaders: "draft-8", legacyHeaders: false }));
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => console.info(JSON.stringify({ event: "http_request", method: req.method, status: res.statusCode, durationMs: Date.now() - startedAt })));
    next();
  });
  app.get("/api/health", async (_req, res) => {
    try {
      const databaseReady = mongoose.connection.readyState === 1;
      await mkdir(DOCUMENT_STORAGE_DIR, { recursive: true, mode: 0o700 });
      await access(DOCUMENT_STORAGE_DIR);
      const ready = databaseReady;
      return res.status(ready ? 200 : 503).json({ success: ready, status: ready ? "ready" : "not_ready", checks: { database: databaseReady ? "connected" : "disconnected", privateStorage: "accessible" }, environment: process.env.NODE_ENV, timestamp: new Date().toISOString() });
    } catch {
      return res.status(503).json({ success: false, status: "not_ready", checks: { database: mongoose.connection.readyState === 1 ? "connected" : "disconnected", privateStorage: "unavailable" }, timestamp: new Date().toISOString() });
    }
  });
  app.use("/api/auth", authRoutes);
  app.use("/api/employees", employeeRoutes);
  app.use("/api/partners", partnerRoutes);
  app.use("/api/leads", leadRoutes);
  app.use("/api/website-content", websiteContentRoutes);
  app.use("/api/invoices", invoiceRoutes);
  app.use("/api/payouts", payoutRoutes);
  app.use("/api/commission-rules", commissionRuleRoutes);
  app.use("/api/documents", documentRoutes);
  // Public callback intake must run before the root-mounted protected work queue.
  app.use("/api/tickets", ticketRoutes);
  // Public category lookup must run before the root-mounted authenticated work queue.
  app.use("/api/loan-categories", loanCategoryRoutes);
  // Register before the root-mounted authenticated work queue router.
  app.get("/api/banks/public", getPublicBanks);
  app.get("/api/banks/public/:bankId/logo", serveInstitutionLogo);
  app.use("/api", workQueueRoutes);
  app.use("/api/interior-referrals", interiorReferralRoutes);
  app.use("/api/banks", bankRoutes);
  app.use("/api/guides", guideRoutes);

  app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` }));
  app.use((error, req, res, _next) => {
    const status = error.statusCode || error.status || 500;
    console.error(JSON.stringify({ event: "request_error", method: req.method, status, error: status >= 500 && process.env.NODE_ENV === "production" ? "InternalError" : error.name || "Error" }));
    if (res.headersSent) return;
    return res.status(status).json({ success: false, message: status >= 500 && process.env.NODE_ENV === "production" ? "Internal server error." : error.message || "Request failed." });
  });
  return app;
}

export default createApp();
