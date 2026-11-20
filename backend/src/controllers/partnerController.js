import User from "../models/User.js";
import { partnerPublicView } from "../services/partnerSensitiveData.js";
import PartnerAuditEvent from "../models/PartnerAuditEvent.js";
import { randomBytes } from "crypto";

// CREATE PARTNER - Admin only
export const createPartner = async (req, res) => {
  return res.status(409).json({ success: false, message: "Partners must use the public KYC application and Admin review workflow." });
};

// GET ALL PARTNERS - Admin only
export const getPartners = async (req, res) => {
  try {
    const partners = await User.find({ role: "partner" })
      .select("-password +partnerDocuments.storageKey")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: partners.length,
      partners: partners.map(partnerPublicView),
    });
  } catch (error) {
    console.error("Get Partners Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch partners.",
    });
  }
};

// UPDATE PARTNER STATUS - Admin only
export const updatePartnerStatus = async (req, res) => {
  try {
    const { partnerCode } = req.params;
    const { status } = req.body;

    if (!["active", "inactive", "suspended", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active, inactive or rejected.",
      });
    }

    const partner = await User.findOne({ partnerCode, role: "partner" }).select("+partnerDocuments.storageKey");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found.",
      });
    }

    if (["rejected", "suspended"].includes(status) && !String(req.body.reason || "").trim()) return res.status(400).json({ success: false, message: "A reason is required for rejection or suspension." });
    if (status === "active") {
      const docsApproved = partner.partnerDocuments.length > 0 && partner.partnerDocuments.every((document) => document.status === "approved");
      const bankReady = Boolean(partner.accountHolderName && partner.bankName && partner.bankBranch && partner.accountNumber && partner.ifsc && partner.accountType);
      if (!docsApproved) return res.status(409).json({ success: false, message: "Approve all submitted partner KYC documents before activating this account." });
      if (!bankReady) return res.status(409).json({ success: false, message: "Complete and review partner bank details before activation." });
      if (partner.bankDetailsReviewStatus !== "approved") return res.status(409).json({ success: false, message: "Admin must approve the partner bank details before activation." });
      partner.status = "active"; partner.partnerApprovalStatus = "approved"; partner.partnerApprovedBy = req.user._id; partner.partnerApprovedAt = new Date(); partner.partnerRejectionReason = "";
    } else if (status === "rejected") {
      partner.status = "inactive"; partner.partnerApprovalStatus = "rejected"; partner.partnerApprovedBy = req.user._id; partner.partnerApprovedAt = new Date(); partner.partnerRejectionReason = req.body.reason.trim().slice(0, 500);
    } else if (status === "suspended") {
      partner.status = "suspended"; partner.partnerApprovalStatus = "suspended"; partner.partnerRejectionReason = req.body.reason.trim().slice(0, 500);
    } else {
      partner.status = "inactive"; partner.partnerApprovalStatus = "inactive";
    }
    partner.tokenVersion = (partner.tokenVersion || 0) + 1;
    partner.partnerStatusHistory.push({ status, reason: String(req.body.reason || "").trim().slice(0, 500), actorId: req.user._id, actorRole: "admin", at: new Date() });
    await partner.save();
    await PartnerAuditEvent.create({ partnerId: partner._id, actorId: req.user._id, actorRole: "admin", action: `partner_status_${status}`, details: String(req.body.reason || "").trim().slice(0, 500) });

    return res.status(200).json({
      success: true,
      message: "Partner status updated successfully.",
      partner: partnerPublicView(partner),
    });
  } catch (error) {
    console.error("Update Partner Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update partner status.",
    });
  }
};

// One-time Admin-initiated reset; plaintext is returned only in this response.
export const resetPartnerPassword = async (req, res) => {
  try {
    const partner = await User.findOne({ partnerCode: req.params.partnerCode, role: "partner" }).select("+password");
    if (!partner) return res.status(404).json({ success: false, message: "Partner not found." });
    const temporaryPassword = randomBytes(24).toString("base64url");
    partner.password = temporaryPassword;
    partner.mustChangePassword = true;
    partner.tokenVersion = (partner.tokenVersion || 0) + 1;
    await partner.save();
    await PartnerAuditEvent.create({ partnerId: partner._id, actorId: req.user._id, actorRole: "admin", action: "partner_password_reset", details: "One-time temporary password issued; change required at sign-in." });
    return res.json({ success: true, message: "One-time password created. The partner must change it at next sign-in.", partnerCode: partner.partnerCode, temporaryPassword });
  } catch (error) {
    console.error("Partner password reset failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to reset partner password." });
  }
};
