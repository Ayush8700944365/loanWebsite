import express from "express";
import multer from "multer";
import path from "path";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { downloadGeneratedDocument, downloadTemplate, generateDocument, listGeneratedDocuments, listTemplates, setTemplateStatus, uploadTemplate } from "../controllers/documentController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10, parts: 12 },
  fileFilter(_req, file, callback) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const accepted = (extension === ".pdf" && file.mimetype === "application/pdf") ||
      (extension === ".docx" && ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"].includes(file.mimetype));
    if (!accepted) return callback(Object.assign(new Error("Upload a PDF or DOCX template file."), { statusCode: 400 }));
    callback(null, true);
  },
});
const handleTemplateUpload = (req, res, next) => upload.single("template")(req, res, (error) => {
  if (!error) return next();
  const status = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? 413 : error.statusCode || 400;
  return res.status(status).json({ success: false, message: error.message || "Template upload failed." });
});

router.use(protect);
router.get("/templates", authorizeRoles("admin"), listTemplates);
router.post("/templates", authorizeRoles("admin"), handleTemplateUpload, uploadTemplate);
router.get("/templates/:id/download", authorizeRoles("admin"), downloadTemplate);
router.patch("/templates/:id/status", authorizeRoles("admin"), setTemplateStatus);
router.post("/generate", authorizeRoles("admin", "employee"), generateDocument);
router.get("/generated", authorizeRoles("admin", "employee", "partner"), listGeneratedDocuments);
router.get("/generated/:documentCode/download", authorizeRoles("admin", "employee", "partner"), downloadGeneratedDocument);

export default router;
