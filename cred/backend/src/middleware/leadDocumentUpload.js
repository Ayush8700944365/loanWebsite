import multer from "multer";
import path from "path";

const maxFileSize = Number.parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024;
const allowed = new Map([
  [".pdf", "application/pdf"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 12, fields: 30, parts: 50 },
  fileFilter(_req, file, callback) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (allowed.get(extension) !== file.mimetype) {
      const error = new Error("Only matching PDF, JPG, JPEG, PNG, or WebP files are allowed.");
      error.statusCode = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

export function uploadLeadDocuments(req, res, next) {
  handleUpload(upload.array("documents", 10), req, res, next);
}

export function uploadPartnerDocuments(req, res, next) {
  handleUpload(upload.array("partnerDocuments", 12), req, res, next);
}

function handleUpload(handler, req, res, next) {
  handler(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ success: false, message: `Each file must be no larger than ${Math.floor(maxFileSize / 1024 / 1024)} MB.` });
    }
    const status = error.statusCode || 400;
    return res.status(status).json({ success: false, message: error.message || "Invalid document upload." });
  });
}
