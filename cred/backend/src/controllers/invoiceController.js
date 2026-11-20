import Invoice from "../models/Invoice.js";
import Lead from "../models/Lead.js";
import Payout from "../models/Payout.js";

// GET: Fetch all invoices
export const getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error("Get invoices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
    });
  }
};

// Partner read access is limited to invoices attached to their own referral leads.
export const getMyInvoices = async (req, res) => {
  try {
    if (!req.user?.partnerCode) return res.status(403).json({ success: false, message: "Partner account is missing its partner identity." });
    const ownedLeadCodes = await Lead.find({ partnerId: req.user.partnerCode }).distinct("leadCode");
    const invoices = await Invoice.find({ $or: [
      { partnerCode: req.user.partnerCode },
      { partnerCode: { $in: [null, ""] }, leadId: { $in: ownedLeadCodes } },
    ] }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    console.error("Get partner invoices error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch partner invoices." });
  }
};

// GET: Fetch single invoice
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error("Get invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
    });
  }
};

// POST: Create invoice
// POST: Create invoice against an existing lead
export const createInvoice = async (req, res) => {
  try {
    const {
      leadId,
      invoiceAmount,
      annexureNumber,
      annexureDate,
      bankName,
      gstNumber,
    } = req.body;

    if (!leadId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please select an existing lead",
      });
    }

    const amount = Number(invoiceAmount);

    if (
      invoiceAmount === undefined ||
      invoiceAmount === null ||
      invoiceAmount === "" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invoice amount must be greater than zero",
      });
    }

    // Fetch actual lead from MongoDB
    const lead = await Lead.findOne({
      leadCode: leadId.trim(),
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Selected lead does not exist",
      });
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(
      Math.random() * 1000,
    )}`;

    const invoice = await Invoice.create({
      invoiceNumber,

      // Details come from actual Lead record
      customerName: lead.customerName,
      leadId: lead.leadCode,
      loanCategory: lead.loanCategory,
      leadType: lead.leadType,
      loanAmount: lead.loanAmount,
      partnerName: lead.partnerName || "",
      partnerCode: lead.partnerId || "",

      // Invoice-specific details
      invoiceAmount: amount,
      annexureNumber: annexureNumber || "",
      annexureDate: annexureDate || null,
      bankName: bankName || "",
      gstNumber: gstNumber || "",

      createdBy: req.user?._id,
    });

    return res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      invoice,
    });
  } catch (error) {
    console.error("Create invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create invoice",
    });
  }
};

// PATCH: Update invoice status
export const updateInvoiceStatus = async (req, res) => {
  try {
    const { invoiceStatus } = req.body;

    const allowedStatuses = [
      "Pending",
      "Invoice Uploaded",
      "Approved",
      "Payment Initiated",
      "Rejected",
      "Payment Failed",
      "Paid",
    ];

    if (!allowedStatuses.includes(invoiceStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice status",
      });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { invoiceStatus },
      { new: true, runValidators: true },
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice status updated successfully",
      invoice,
    });
  } catch (error) {
    console.error("Update invoice status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update invoice status",
    });
  }
};

export const reconcileInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found." });
    const payoutId = String(req.body?.payoutId || "").trim();
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    const finalReview = req.body?.reconciled === true;
    if (!payoutId) return res.status(400).json({ success: false, message: "Select a payout to reconcile this invoice." });
    const payout = await Payout.findById(payoutId);
    if (!payout) return res.status(404).json({ success: false, message: "Payout not found." });
    if (invoice.leadId !== payout.leadId || (invoice.partnerCode && invoice.partnerCode !== payout.partnerId)) return res.status(409).json({ success: false, message: "Invoice and payout must belong to the same lead and partner." });
    if (finalReview && !reason) return res.status(400).json({ success: false, message: "Add a reconciliation note before finalizing the match." });
    const invoiceAmount = Number(invoice.invoiceAmount || 0);
    const payoutAmount = Number(payout.totalAmount || payout.netPayable || 0);
    const difference = Number((invoiceAmount - payoutAmount).toFixed(2));
    const matched = Math.abs(difference) < 0.01;
    const nextStatus = finalReview && matched ? "reconciled" : matched ? "matched" : difference < 0 ? "partially_matched" : "mismatch";
    invoice.payoutId = payout._id;
    invoice.reconciliationStatus = nextStatus;
    invoice.reconciliationSnapshot = { invoiceAmount, payoutCommission: Number(payout.amount || 0), payoutTax: Number(payout.gstAmount || 0), payoutDeductions: Number(payout.deductionAmount || 0), payoutAmount, difference, paymentReference: payout.utr || "", payoutStatus: payout.status, matchedAt: new Date() };
    invoice.reconciliationHistory.push({ action: finalReview && matched ? "reconciled" : "linked", payoutId: payout._id, status: nextStatus, difference, reason, actorId: req.user._id, at: new Date() });
    await invoice.save();
    return res.json({ success: true, invoice, message: matched ? (finalReview ? "Invoice reconciliation completed." : "Invoice and payout amounts match; Admin may finalize reconciliation.") : "Invoice and payout are linked with an amount mismatch for review." });
  } catch (error) {
    console.error("Invoice reconciliation failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to reconcile invoice and payout." });
  }
};

// DELETE: Delete invoice
export const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    console.error("Delete invoice error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
    });
  }
};
