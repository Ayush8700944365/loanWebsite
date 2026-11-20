import mongoose from "mongoose";

const websiteAssetSchema = new mongoose.Schema({
  storageKey: { type: String, required: true, unique: true },
  mimeType: { type: String, required: true, enum: ["image/png", "image/jpeg", "image/webp"] },
  size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  data: { type: Buffer, required: true, select: false },
}, { timestamps: true, collection: "website_assets" });

export default mongoose.models.WebsiteAsset || mongoose.model("WebsiteAsset", websiteAssetSchema);
