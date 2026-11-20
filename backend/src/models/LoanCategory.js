import mongoose from "mongoose";

const loanCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    tagline: {
      type: String,
      trim: true,
      default: "",
    },

    minInterest: {
      type: String,
      trim: true,
      default: "",
    },

    maxTenure: {
      type: String,
      trim: true,
      default: "",
    },

    maxAmount: {
      type: String,
      trim: true,
      default: "",
    },

    processingTime: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    benefits: {
      type: [String],
      default: [],
    },

    documentRequirements: {
      type: [{
        documentType: { type: String, required: true, trim: true },
        employmentTypes: { type: [String], default: [] },
      }],
      default: [],
    },

    eligibility: {
      type: String,
      trim: true,
      default: "",
    },

    icon: {
      type: String,
      trim: true,
      default: "",
    },

    imageStorageKey: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

const LoanCategory = mongoose.model("LoanCategory", loanCategorySchema);

export default LoanCategory;
