import WebsiteContent from "../models/WebsiteContent.js";
import Bank from "../models/Bank.js";
import LoanCategory from "../models/LoanCategory.js";
import Lead from "../models/Lead.js";
import { isWebsiteImageKey, readWebsiteImage, removeWebsiteImage, storeWebsiteImage } from "../services/websiteAssetService.js";

// Public website - fetch published content
export const getWebsiteContent = async (req, res) => {
  try {
    let content = await WebsiteContent.findOne({ key: "main" });

    if (!content) {
      content = await WebsiteContent.create({ key: "main" });
    }

    const published = content.toObject();
    published.team = (published.team || []).filter((member) => member.active).sort((a, b) => a.displayOrder - b.displayOrder);
    published.benefits = (published.benefits || []).sort((a, b) => a.displayOrder - b.displayOrder);
    return res.status(200).json({
      success: true,
      content: published,
    });
  } catch (error) {
    console.error("Get Website Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch website content.",
    });
  }
};

// Public, aggregate-only proof points for the homepage. Never return customer data.
export const getPublicWebsiteStats = async (_req, res) => {
  try {
    const [customerPhones, confirmedDisbursements] = await Promise.all([
      Lead.distinct("phone", { phone: { $type: "string", $ne: "" } }),
      Lead.countDocuments({ currentStatus: "Disbursed", "disbursementUpdate.status": "confirmed" }),
    ]);
    const customersReached = new Set(customerPhones.map((phone) => String(phone).replace(/\D/g, "")).filter(Boolean)).size;
    return res.set("Cache-Control", "public, max-age=60").json({ success: true, stats: { customersReached, confirmedDisbursements } });
  } catch (error) {
    console.error("Get public website stats failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load homepage statistics." });
  }
};

// Admin - update website content
export const updateWebsiteContent = async (req, res) => {
  try {
    const { hero, about, faqs } = req.body;

    if (
      !hero ||
      !about ||
      !Array.isArray(faqs) ||
      typeof hero !== "object" ||
      typeof about !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid hero, about and FAQs content are required.",
      });
    }

    if (req.body.benefits !== undefined && (!Array.isArray(req.body.benefits) || req.body.benefits.length > 20)) {
      return res.status(400).json({ success: false, message: "Benefits must be a list of up to 20 items." });
    }
    if (req.body.team !== undefined && (!Array.isArray(req.body.team) || req.body.team.length > 100)) {
      return res.status(400).json({ success: false, message: "Team must be a list of up to 100 members." });
    }
    if (req.body.homepageGoals !== undefined) {
      const goals = req.body.homepageGoals;
      if (!goals || typeof goals !== "object" || Array.isArray(goals)) return res.status(400).json({ success: false, message: "Homepage goals must be an object." });
      for (const field of ["customersReachedTarget", "disbursementsTarget"]) {
        const value = goals[field];
        if (value !== null && value !== "" && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 1000000000)) {
          return res.status(400).json({ success: false, message: "Homepage goals must be whole numbers between 0 and 1,000,000,000." });
        }
      }
      const amountTarget = goals.disbursementAmountTarget;
      if (amountTarget !== null && amountTarget !== "" && (!Number.isFinite(Number(amountTarget)) || Number(amountTarget) < 0 || Number(amountTarget) > 1000000000)) {
        return res.status(400).json({ success: false, message: "Disbursement amount goal must be between 0 and 1,000,000,000." });
      }
      if (goals.disbursementAmountUnit !== undefined && !["lakh", "crore"].includes(goals.disbursementAmountUnit)) {
        return res.status(400).json({ success: false, message: "Choose Lakh or Crore for the disbursement goal unit." });
      }
    }

    const cleanFaqs = faqs.map((faq) => ({
      question: String(faq.question || "").trim(),
      answer: String(faq.answer || "").trim(),
    }));

    const invalidFaq = cleanFaqs.some((faq) => !faq.question || !faq.answer);

    if (invalidFaq) {
      return res.status(400).json({
        success: false,
        message: "Every FAQ must have a question and answer.",
      });
    }

    const cleanBenefits = (req.body.benefits || []).map((benefit, index) => ({
      title: String(benefit.title || "").trim().slice(0, 100),
      description: String(benefit.description || "").trim().slice(0, 500),
      displayOrder: Number.isInteger(Number(benefit.displayOrder)) && Number(benefit.displayOrder) >= 0 ? Number(benefit.displayOrder) : index,
    }));
    if (cleanBenefits.some((item) => !item.title || !item.description)) {
      return res.status(400).json({ success: false, message: "Each benefit needs a title and description." });
    }

    const cleanTeam = (req.body.team || []).map((member, index) => ({
      name: String(member.name || "").trim().slice(0, 100),
      designation: String(member.designation || "").trim().slice(0, 100),
      biography: String(member.biography || "").trim().slice(0, 500),
      photoStorageKey: isWebsiteImageKey(member.photoStorageKey) ? member.photoStorageKey : "",
      displayOrder: Number.isInteger(Number(member.displayOrder)) && Number(member.displayOrder) >= 0 ? Number(member.displayOrder) : index,
      active: member.active === true,
    }));
    if (cleanTeam.some((member) => !member.name || !member.designation)) {
      return res.status(400).json({ success: false, message: "Each team member needs a name and designation." });
    }

    const set = {
      hero: {
        bannerNotice: String(hero.bannerNotice || "").trim().slice(0, 160),
        headline: String(hero.headline || "").trim().slice(0, 180),
        subheadline: String(hero.subheadline || "").trim().slice(0, 500),
      },
      about: {
        intro: String(about.intro || "").trim().slice(0, 500),
        mission: String(about.mission || "").trim().slice(0, 1000),
        vision: String(about.vision || "").trim().slice(0, 1000),
      },
      faqs: cleanFaqs,
      updatedBy: req.user?.name || "Admin",
    };
    if (req.body.benefits !== undefined) set.benefits = cleanBenefits;
    if (req.body.team !== undefined) set.team = cleanTeam;
    if (req.body.homepageGoals !== undefined) {
      set.homepageGoals = {
        customersReachedTarget: req.body.homepageGoals.customersReachedTarget === "" ? null : req.body.homepageGoals.customersReachedTarget,
        disbursementsTarget: req.body.homepageGoals.disbursementsTarget === "" ? null : req.body.homepageGoals.disbursementsTarget,
        disbursementAmountTarget: req.body.homepageGoals.disbursementAmountTarget === "" ? null : req.body.homepageGoals.disbursementAmountTarget,
        disbursementAmountUnit: req.body.homepageGoals.disbursementAmountUnit || "lakh",
      };
    }

    const previousContent = await WebsiteContent.findOne({ key: "main" }).lean();
    const content = await WebsiteContent.findOneAndUpdate(
      { key: "main" },
      {
        $set: set,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    if (req.body.team !== undefined) {
      const retainedKeys = new Set((content.team || []).map((member) => member.photoStorageKey).filter(Boolean));
      const previousKeys = new Set((previousContent?.team || []).map((member) => member.photoStorageKey).filter(Boolean));
      await Promise.all([...previousKeys].filter((key) => !retainedKeys.has(key)).map(async (key) => {
        const stillUsedByBank = await Bank.exists({ logoStorageKey: key });
        if (!stillUsedByBank) await removeWebsiteImage(key).catch(() => {});
      }));
    }

    return res.status(200).json({
      success: true,
      message: "Website content published successfully.",
      content,
    });
  } catch (error) {
    console.error("Update Website Content Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to publish website content.",
    });
  }
};

export const uploadTeamPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a profile photo." });
    const photo = await storeWebsiteImage(req.file);
    return res.status(201).json({ success: true, photoStorageKey: photo.storageKey });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to upload profile photo." });
  }
};

export const serveWebsiteAsset = async (req, res) => {
  try {
    const key = req.params.assetKey;
    const [bank, category, content] = await Promise.all([
      Bank.exists({ logoStorageKey: key, isPublicInstitution: true, status: "active" }),
      LoanCategory.exists({ imageStorageKey: key }),
      WebsiteContent.exists({ team: { $elemMatch: { photoStorageKey: key, active: true } } }),
    ]);
    if (!bank && !category && !content) return res.status(404).end();
    const image = await readWebsiteImage(key);
    if (!image) return res.status(404).end();
    const mimeType = /\.png$/i.test(key) ? "image/png" : /\.webp$/i.test(key) ? "image/webp" : "image/jpeg";
    return res.type(mimeType).set("X-Content-Type-Options", "nosniff").set("Cross-Origin-Resource-Policy", "cross-origin").set("Cache-Control", "public, max-age=3600").send(image);
  } catch {
    return res.status(500).end();
  }
};

// Admin CMS needs to preview newly uploaded or inactive draft images before
// they are published. Keep this separate from the public asset route so draft
// photos and internal bank logos are never exposed publicly.
export const serveAdminWebsiteAsset = async (req, res) => {
  try {
    const key = req.params.assetKey;
    if (!isWebsiteImageKey(key)) return res.status(404).end();
    const image = await readWebsiteImage(key);
    if (!image) return res.status(404).end();
    const mimeType = /\.png$/i.test(key) ? "image/png" : /\.webp$/i.test(key) ? "image/webp" : "image/jpeg";
    return res.type(mimeType)
      .set("X-Content-Type-Options", "nosniff")
      .set("Cross-Origin-Resource-Policy", "cross-origin")
      .set("Cache-Control", "private, no-store")
      .send(image);
  } catch {
    return res.status(500).end();
  }
};

export const deleteWebsiteAsset = async (req, res) => {
  try {
    const key = req.params.assetKey;
    if (!isWebsiteImageKey(key)) return res.status(400).json({ success: false, message: "Invalid image key." });
    const [bank, category, content] = await Promise.all([
      Bank.exists({ logoStorageKey: key }),
      LoanCategory.exists({ imageStorageKey: key }),
      WebsiteContent.exists({ "team.photoStorageKey": key }),
    ]);
    if (bank || category || content) return res.status(409).json({ success: false, message: "Remove the image reference from published content before deleting it." });
    await removeWebsiteImage(key);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to remove image." });
  }
};
