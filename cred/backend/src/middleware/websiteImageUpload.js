import multer from "multer";

const maxFileSize = Math.min(Number(process.env.WEBSITE_IMAGE_MAX_SIZE) || 2 * 1024 * 1024, 5 * 1024 * 1024);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 1, fields: 4 },
  fileFilter(_req, file, callback) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) {
      const error = new Error("Only PNG, JPEG, and WebP images are accepted.");
      error.statusCode = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

export function uploadWebsiteImage(req, res, next) {
  upload.single("image")(req, res, (error) => {
    if (!error) return next();
    const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : error.statusCode || 400).json({
      success: false,
      message: tooLarge ? "Image must be no larger than 2 MB." : error.message,
    });
  });
}
