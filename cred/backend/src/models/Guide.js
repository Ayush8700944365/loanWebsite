import mongoose from "mongoose";

const guideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Policy & Guidelines",
        "Rate Cards & Commissions",
        "Standard Operating Procedures",
        "KYC & Compliance",
        "Bank Specific Checklists",
      ],
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      enum: ["raw", "image"],
      default: "raw",
    },
    downloadsCount: {
      type: Number,
      default: 0,
    },
    badge: {
      type: String,
      default: "Verified",
    },
  },
  { timestamps: true },
);

const Guide = mongoose.model("Guide", guideSchema);

export default Guide;
