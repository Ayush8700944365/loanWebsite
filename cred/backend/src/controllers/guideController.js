import { randomUUID } from "crypto";
import Guide from "../models/Guide.js";
import cloudinary from "../config/cloudinary.js";

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const extension = file.originalname
      .slice(file.originalname.lastIndexOf("."))
      .toLowerCase();

    // Cloudinary image resource supports PDF preview.
    // Word documents are stored as raw resources.
    const resourceType = file.mimetype === "application/pdf" ? "image" : "raw";

    const uniqueId = `guide_${randomUUID()}`;

    const publicId =
      resourceType === "raw" ? `${uniqueId}${extension}` : uniqueId;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: "realcred/guides",
        public_id: publicId,
        ...(resourceType === "image" ? { format: "pdf" } : {}),
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          ...result,
          resourceType,
        });
      },
    );

    uploadStream.end(file.buffer);
  });
};

// Upload guide
export const uploadGuide = async (req, res) => {
  let uploadedFile;

  try {
    const { title, description, category } = req.body;

    if (!title?.trim() || !description?.trim() || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, description and category are required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a document to upload.",
      });
    }

    uploadedFile = await uploadToCloudinary(req.file);

    const guide = await Guide.create({
      title: title.trim(),
      description: description.trim(),
      category,
      fileName: req.file.originalname,
      fileUrl: uploadedFile.secure_url,
      publicId: uploadedFile.public_id,
      resourceType: uploadedFile.resourceType,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    return res.status(201).json({
      success: true,
      message: "Guide uploaded successfully.",
      guide,
    });
  } catch (error) {
    if (uploadedFile?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedFile.public_id, {
          resource_type: uploadedFile.resourceType,
        });
      } catch (cleanupError) {
        console.error("Cloudinary cleanup failed:", cleanupError.message);
      }
    }

    console.error("Guide upload error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload guide.",
    });
  }
};

// Get all guides
export const getGuides = async (req, res) => {
  try {
    const guides = await Guide.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: guides.length,
      guides,
    });
  } catch (error) {
    console.error("Get guides error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch guides.",
    });
  }
};

// Generate download URL and increment counter
export const downloadGuide = async (req, res) => {
  try {
    const guide = await Guide.findById(req.params.id);

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found.",
      });
    }

    guide.downloadsCount = (guide.downloadsCount || 0) + 1;
    await guide.save();

    return res.status(200).json({
      success: true,
      message: "Download link generated.",
      fileUrl: guide.fileUrl,
      fileName: guide.fileName,
      mimeType: guide.mimeType,
      downloadsCount: guide.downloadsCount,
    });
  } catch (error) {
    console.error("Download guide error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to download guide.",
    });
  }
};

// Delete guide
export const deleteGuide = async (req, res) => {
  try {
    const guide = await Guide.findById(req.params.id);

    if (!guide) {
      return res.status(404).json({
        success: false,
        message: "Guide not found.",
      });
    }

    const resourceType =
      guide.resourceType ||
      (guide.mimeType === "application/pdf" ? "image" : "raw");

    await cloudinary.uploader.destroy(guide.publicId, {
      resource_type: resourceType,
    });

    await Guide.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Guide deleted successfully.",
    });
  } catch (error) {
    console.error("Delete guide error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete guide.",
    });
  }
};
