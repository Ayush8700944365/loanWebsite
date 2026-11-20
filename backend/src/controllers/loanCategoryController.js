import LoanCategory from "../models/LoanCategory.js";
import { readWebsiteImage, removeWebsiteImage, storeWebsiteImage } from "../services/websiteAssetService.js";

// Public form needs active category requirements; no private category data is returned.
export const getPublicLoanCategories = async (_req, res) => {
  try {
    const categories = await LoanCategory.find({ status: "active" })
      .select("name slug documentRequirements tagline minInterest maxTenure maxAmount processingTime description benefits eligibility icon imageStorageKey")
      .sort({ name: 1 });
    return res.status(200).json({ success: true, categories });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to fetch loan categories." });
  }
};


export const servePublicLoanCategoryImage = async (req, res) => {
  try {
    const key = req.params.assetKey;
    const visible = await LoanCategory.exists({ imageStorageKey: key, status: "active" });
    if (!visible) return res.status(404).end();
    const image = await readWebsiteImage(key);
    if (!image) return res.status(404).end();
    const mimeType = /\.png$/i.test(key) ? "image/png" : /\.webp$/i.test(key) ? "image/webp" : "image/jpeg";
    return res.type(mimeType).set("X-Content-Type-Options", "nosniff").set("Cache-Control", "public, max-age=3600").send(image);
  } catch {
    return res.status(500).end();
  }
};

export const uploadLoanCategoryImage = async (req, res) => {
  let stored;
  let saved = false;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a category image." });
    const category = await LoanCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Loan category not found." });
    stored = await storeWebsiteImage(req.file);
    const previous = category.imageStorageKey;
    category.imageStorageKey = stored.storageKey;
    await category.save();
    saved = true;
    if (previous) await removeWebsiteImage(previous).catch(() => {});
    return res.json({ success: true, message: "Loan category image updated.", category });
  } catch (error) {
    if (stored?.storageKey && !saved) await removeWebsiteImage(stored.storageKey).catch(() => {});
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to save loan category image." });
  }
};

export const deleteLoanCategoryImage = async (req, res) => {
  try {
    const category = await LoanCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Loan category not found." });
    const previous = category.imageStorageKey;
    category.imageStorageKey = "";
    await category.save();
    if (previous) await removeWebsiteImage(previous);
    return res.json({ success: true, message: "Loan category image removed." });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to remove loan category image." });
  }
};

// ADMIN - Get all categories
export const getLoanCategories = async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { status: "active" };

    const categories = await LoanCategory.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get Loan Categories Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch loan categories.",
    });
  }
};

// ADMIN - Create category
export const createLoanCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      tagline,
      minInterest,
      maxTenure,
      maxAmount,
      processingTime,
      description,
      benefits,
      documentRequirements,
      eligibility,
      icon,
    } = req.body;

    if (!name?.trim() || !slug?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name and slug are required.",
      });
    }

    if (benefits !== undefined && !Array.isArray(benefits)) {
      return res.status(400).json({
        success: false,
        message: "Benefits must be an array.",
      });
    }
    if (documentRequirements !== undefined && !isValidDocumentRequirements(documentRequirements)) {
      return res.status(400).json({ success: false, message: "Document requirements must contain documentType and optional employmentTypes arrays." });
    }
    if (!Array.isArray(documentRequirements) || documentRequirements.length === 0) {
      return res.status(400).json({ success: false, message: "Add at least one required document before creating a loan category." });
    }

    const normalizedSlug = slug.trim().toLowerCase();

    const existing = await LoanCategory.findOne({
      slug: normalizedSlug,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A category with this slug already exists.",
      });
    }

    const category = await LoanCategory.create({
      name: name.trim(),
      slug: normalizedSlug,
      tagline,
      minInterest,
      maxTenure,
      maxAmount,
      processingTime,
      description,
      benefits,
      documentRequirements,
      eligibility,
      icon,
    });

    return res.status(201).json({
      success: true,
      message: "Loan category created successfully.",
      category,
    });
  } catch (error) {
    console.error("Create Loan Category Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create loan category.",
    });
  }
};

// ADMIN - Update category
export const updateLoanCategory = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "slug",
      "tagline",
      "minInterest",
      "maxTenure",
      "maxAmount",
      "processingTime",
      "description",
      "benefits",
      "documentRequirements",
      "eligibility",
      "icon",
      "status",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] =
          field === "slug" && typeof req.body[field] === "string"
            ? req.body[field].trim().toLowerCase()
            : req.body[field];
      }
    }

    if (updates.benefits !== undefined && !Array.isArray(updates.benefits)) {
      return res.status(400).json({
        success: false,
        message: "Benefits must be an array.",
      });
    }
    if (updates.documentRequirements !== undefined && !isValidDocumentRequirements(updates.documentRequirements)) {
      return res.status(400).json({ success: false, message: "Document requirements must contain documentType and optional employmentTypes arrays." });
    }

    if (
      updates.status !== undefined &&
      !["active", "inactive"].includes(updates.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid category status.",
      });
    }

    const category = await LoanCategory.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Loan category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Loan category updated successfully.",
      category,
    });
  } catch (error) {
    console.error("Update Loan Category Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update loan category.",
    });
  }
};

function isValidDocumentRequirements(value) {
  return Array.isArray(value) && value.every((item) => item && typeof item.documentType === "string" && item.documentType.trim().length <= 80 && (item.employmentTypes === undefined || (Array.isArray(item.employmentTypes) && item.employmentTypes.every((type) => typeof type === "string" && type.trim().length > 0 && type.trim().length <= 80))));
}

// ADMIN - Delete category
export const deleteLoanCategory = async (req, res) => {
  try {
    const category = await LoanCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Loan category not found.",
      });
    }

    if (category.imageStorageKey) await removeWebsiteImage(category.imageStorageKey);
    return res.status(200).json({
      success: true,
      message: "Loan category deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Loan Category Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete loan category.",
    });
  }
};
