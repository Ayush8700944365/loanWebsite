import Payout from "../models/Payout.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import { calculatePartnerPayout } from "../services/payoutCalculationService.js";
import { decryptPartnerValue, maskPartnerAccount } from "../services/partnerSensitiveData.js";
import path from "path";
import { createReadStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";
import { DOCUMENT_STORAGE_DIR, removeStoredDocument, storeDocument } from "../services/leadDocumentService.js";

const pipe = promisify(pipeline);

// GET: Fetch payouts belonging only to the logged-in partner
export const getMyPayments = async (req, res) => {
  try {
    if (req.user.role !== "partner" || !req.user.partnerCode) {
      return res.status(403).json({
        success: false,
        message: "Valid partner account is required.",
      });
    }

    const payments = await Payout.find({
      partnerId: req.user.partnerCode,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Get partner payouts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your payout records.",
    });
  }
};

// GET: Fetch all payouts
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payout.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Get payouts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payouts",
    });
  }
};

// GET: Fetch single payout
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payout.findById(req.params.id).select("+bankSnapshot.encryptedAccountNumber");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payout not found",
      });
    }

    const authorizedPayment = payment.toObject();
    if (authorizedPayment.bankSnapshot) {
      delete authorizedPayment.bankSnapshot.encryptedAccountNumber;
      authorizedPayment.bankSnapshot.accountNumber = decryptPartnerValue(payment.bankSnapshot.encryptedAccountNumber) || payment.bankSnapshot.maskedAccountNumber;
    }
    return res.status(200).json({
      success: true,
      payment: authorizedPayment,
    });
  } catch (error) {
    console.error("Get payout error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payout",
    });
  }
};

// POST: Create payout

export const getPayoutQuote = async (req, res) => {
  try {
    const partnerCode = String(req.query.partnerId || "").trim();
    const leadCode = String(req.query.leadId || "").trim();
    if (!partnerCode || !leadCode) return res.status(400).json({ success: false, message: "Select a partner and eligible lead to calculate payout." });

    const partner = await User.findOne({ partnerCode, role: "partner", status: "active" });
    if (!partner) return res.status(404).json({ success: false, message: "Active partner not found." });
    if (partner.bankDetailsReviewStatus !== "approved") return res.status(409).json({ success: false, code: "PARTNER_BANK_REVIEW_REQUIRED", message: "Admin must approve partner bank details before a payout can be created." });
    const lead = await Lead.findOne({ leadCode, partnerId: partner.partnerCode });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found for this partner." });
    if (lead.currentStatus !== "Disbursed" || lead.disbursementUpdate?.status !== "confirmed") return res.status(409).json({ success: false, message: "Commission can only be calculated after Admin confirms the submitted disbursement evidence." });

    const quote = await calculatePartnerPayout(partner, lead);
    if (quote.error) return res.status(409).json({ success: false, code: "COMMISSION_RULE_REQUIRED", message: quote.error });
    return res.json({
      success: true,
      quote: {
        loanAmount: quote.loanAmount,
        commissionAmount: quote.amount,
        gstAmount: quote.gstAmount,
        deductionAmount: quote.deductionAmount,
        netPayable: quote.totalAmount,
        disbursementBankName: quote.bankName,
        rule: { id: quote.rule._id, name: quote.rule.name, calculationType: quote.rule.calculationType, value: quote.rule.value, gstPercentage: quote.rule.gstPercentage },
      },
    });
  } catch (error) {
    console.error("Get payout quote error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to calculate payout quote." });
  }
};

export const createPayment = async (req, res) => {
  try {
    const { partnerId, leadId } = req.body;
    if (
      typeof partnerId !== "string" ||
      typeof leadId !== "string" ||
      !partnerId.trim() ||
      !leadId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid partner code and lead code are required",
      });
    }

    const partner = await User.findOne({
      partnerCode: partnerId.trim(),
      role: "partner",
      status: "active",
    }).select("+accountNumber");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Active partner not found",
      });
    }
    if (partner.bankDetailsReviewStatus !== "approved") return res.status(409).json({ success: false, code: "PARTNER_BANK_REVIEW_REQUIRED", message: "Admin must approve partner bank details before a payout can be created." });

    const lead = await Lead.findOne({
      leadCode: leadId.trim(),
      partnerId: partner.partnerCode,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found for this partner",
      });
    }

    if (lead.currentStatus !== "Disbursed" || lead.disbursementUpdate?.status !== "confirmed") {
      return res.status(409).json({
        success: false,
        message: "Commission can only be calculated after Admin confirms the submitted disbursement evidence.",
      });
    }

    // Prevent duplicate payout for the same lead and partner
    const existingPayout = await Payout.findOne({
      leadId: lead.leadCode,
      partnerId: partner.partnerCode,
    });

    if (existingPayout) {
      return res.status(409).json({
        success: false,
        message: "Payout has already been generated for this lead",
        existingPayoutId: existingPayout._id,
        existingStatus: existingPayout.status,
      });
    }

    const quote = await calculatePartnerPayout(partner, lead);
    if (quote.error) return res.status(409).json({ success: false, code: "COMMISSION_RULE_REQUIRED", message: quote.error });
    const { rule, loanAmount, amount, gstAmount, deductionAmount, totalAmount } = quote;

    const payment = await Payout.create({
      paymentNumber: `PAY-${Date.now()}`,
      partnerId: partner.partnerCode,
      partnerName: partner.companyName || partner.name,
      leadId: lead.leadCode,
      customerName: lead.customerName,
      paymentType: "DSA Partner Commission",
      loanAmount,
      calculationType: rule.calculationType,
      commissionRuleValue: rule.value,
      commissionPercentage: rule.calculationType === "percentage" ? rule.value : 0,
      gstPercentage: rule.gstPercentage,
      amount,
      gstAmount,
      totalAmount,
      netPayable: totalAmount,
      deductionAmount,
      disbursementBankName: quote.bankName,
      disbursementReference: lead.disbursementUpdate?.reference || "",
      disbursementDate: lead.disbursementUpdate?.disbursementDate || null,
      loanCategory: lead.loanCategory || "",
      commissionRuleSnapshot: { ruleId: rule._id, ruleKey: rule.ruleKey, name: rule.name, loanCategory: rule.loanCategory, partnerCode: rule.partnerCode, bankName: rule.bankName, calculationBasis: rule.calculationBasis, calculationType: rule.calculationType, value: rule.value, gstPercentage: rule.gstPercentage, deductionFixed: rule.deductionFixed || 0, deductionPercentage: rule.deductionPercentage || 0, minimumLoanAmount: rule.minimumLoanAmount || 0, maximumLoanAmount: rule.maximumLoanAmount ?? null, effectiveFrom: rule.effectiveFrom || null, effectiveTo: rule.effectiveTo || null, capturedAt: new Date() },
      createdBy: req.user?._id,
      commissionRuleId: rule._id,
      bankSnapshot: {
        accountHolderName: partner.accountHolderName,
        bankName: partner.bankName,
        bankBranch: partner.bankBranch,
        encryptedAccountNumber: partner.accountNumber,
        maskedAccountNumber: maskPartnerAccount(partner.accountNumber),
        ifsc: partner.ifsc,
        accountType: partner.accountType,
        bankBranchAddress: partner.bankBranchAddress,
        capturedAt: new Date(),
      },
      statusHistory: [{ status: "Pending", actorId: req.user._id, actorRole: "admin", reason: `Calculated under rule ${rule.name}` }],
    });

    return res.status(201).json({
      success: true,
      message: "Payout calculated and created successfully",
      payment,
    });
  } catch (error) {
    console.error("Create payout error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Payout already exists for this lead and partner",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create payout",
    });
  }
};

// PATCH: Update payout status

export const updatePaymentStatus = async (req, res) => {
  try {
    const { status, utr, reason } = req.body;
    const normalizedReason = typeof reason === "string" ? reason.trim().slice(0, 500) : "";

    if (utr !== undefined && typeof utr !== "string") {
      return res.status(400).json({
        success: false,
        message: "UTR number must be valid text",
      });
    }

    if (typeof utr === "string" && utr.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "UTR number cannot exceed 100 characters",
      });
    }

    const allowedStatuses = ["Pending", "Approved", "Rejected", "Correction Requested", "On Hold", "Payment Initiated", "Paid", "Payout Failed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payout status",
      });
    }

    const payment = await Payout.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payout not found",
      });
    }

    if (["Paid", "Rejected"].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: "Paid payout cannot be modified",
      });
    }

    const allowedTransitions = {
      Pending: ["Approved", "Rejected", "On Hold", "Correction Requested"],
      Approved: ["Payment Initiated", "Rejected", "On Hold", "Correction Requested"],
      "Payment Initiated": ["Paid", "Payout Failed", "On Hold"],
      "Payout Failed": ["Payment Initiated", "On Hold"],
      "On Hold": ["Pending", "Approved", "Rejected", "Correction Requested"],
      "Correction Requested": ["Pending", "Approved", "Rejected", "On Hold"],
      Paid: [],
    };

    if (!allowedTransitions[payment.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change payout status from ${payment.status} to ${status}`,
      });
    }

    if (status === "Rejected" && !normalizedReason) return res.status(400).json({ success: false, message: "A reason is required when rejecting a payout." });
    if (["On Hold", "Correction Requested", "Payout Failed"].includes(status) && !normalizedReason) return res.status(400).json({ success: false, message: `A reason is required when changing payout to ${status}.` });
    if (status === "Approved" && !["Pending", "On Hold", "Correction Requested"].includes(payment.status)) return res.status(409).json({ success: false, message: "Only pending or reviewed payouts can be approved." });

    if (status === "Paid" && !String(utr || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "UTR number is required to mark payout as Paid",
      });
    }
    if (status === "Paid" && !payment.paymentEvidence?.length) return res.status(400).json({ success: false, message: "Upload payment proof before confirming a payout as Paid." });

    payment.status = status;
    payment.statusHistory.push({ status, actorId: req.user._id, actorRole: "admin", reason: normalizedReason, utr: typeof utr === "string" ? utr.trim() : "", at: new Date() });
    if (["Approved", "Rejected"].includes(status)) {
      payment.reviewedBy = req.user._id;
      payment.reviewedAt = new Date();
      payment.rejectionReason = status === "Rejected" ? normalizedReason : "";
    }

    if (utr !== undefined) {
      payment.utr = String(utr).trim();
    }

    if (status === "Paid") {
      payment.paymentDate = new Date();
      const lead = await Lead.findOne({ leadCode: payment.leadId, partnerId: payment.partnerId });
      if (lead && lead.currentStatus === "Disbursed") {
        lead.currentStatus = "Payout Complete";
        lead.statusHistory.push({ fromStatus: "Disbursed", toStatus: "Payout Complete", actorId: req.user._id, actorRole: "admin", actorName: req.user.name, at: new Date() });
        lead.timeline.push({ step: "Partner payout completed", user: req.user.name, status: "completed" });
        await lead.save();
      }
    }

    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Payout status updated successfully",
      payment,
    });
  } catch (error) {
    console.error("Update payout status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update payout status",
    });
  }
};

export const uploadPaymentEvidence = async (req, res) => {
  let stored;
  try {
    const file = req.files?.[0];
    if (!file) return res.status(400).json({ success: false, message: "Choose a payment confirmation file." });
    const payout = await Payout.findById(req.params.id).select("+paymentEvidence.storageKey");
    if (!payout) return res.status(404).json({ success: false, message: "Payout not found." });
    if (payout.status !== "Payment Initiated") return res.status(409).json({ success: false, message: "Payment evidence can be attached after payment initiation." });
    stored = await storeDocument(file);
    payout.paymentEvidence.push({ storageKey: stored.storageKey, fileName: path.basename(file.originalname).slice(0, 180), mimeType: stored.mimeType, size: stored.size, uploaderId: req.user._id, uploadedAt: new Date() });
    await payout.save();
    return res.status(201).json({ success: true, payment: payout });
  } catch (error) {
    if (stored?.storageKey) await removeStoredDocument(stored.storageKey).catch(() => {});
    console.error("Upload payment evidence error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to save payment evidence." });
  }
};

export const servePaymentEvidence = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === "partner") filter.partnerId = req.user.partnerCode;
    const payout = await Payout.findOne(filter).select("+paymentEvidence.storageKey");
    if (!payout) return res.status(404).json({ success: false, message: "Payout not found." });
    const file = payout.paymentEvidence?.[Number(req.params.index)];
    if (!file?.storageKey) return res.status(404).json({ success: false, message: "Payment evidence not found." });
    res.set({ "Content-Type": file.mimeType, "Content-Disposition": `attachment; filename="${path.basename(file.fileName || "payment-evidence")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    await pipe(createReadStream(path.join(DOCUMENT_STORAGE_DIR, file.storageKey)), res);
  } catch (error) {
    if (!res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: "Unable to retrieve payment evidence." });
  }
};

export const editPendingPayout = async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ success: false, message: "Payout not found." });
    if (payout.status !== "Pending") return res.status(409).json({ success: false, message: "Only pending payouts can be edited." });
    const allowed = ["paymentType", "paymentMethod", "payoutPeriod", "internalRemarks"];
    const fields = Object.keys(req.body || {});
    if (!fields.length || fields.some((field) => !allowed.includes(field))) return res.status(400).json({ success: false, message: "Only payout description, method, period and internal remarks can be edited." });
    for (const field of fields) payout[field] = String(req.body[field] || "").trim().slice(0, field === "internalRemarks" ? 1000 : 120);
    payout.editHistory.push({ actorId: req.user._id, fields, at: new Date() });
    await payout.save();
    return res.json({ success: true, payment: payout });
  } catch (error) { console.error("Edit payout error:", error.message); return res.status(500).json({ success: false, message: "Unable to edit payout." }); }
};
