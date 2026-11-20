import Lead from "../models/Lead.js";
import User from "../models/User.js";
import LoanCategory from "../models/LoanCategory.js";
import { removeStoredDocument, resolveRequiredDocumentTypes } from "../services/leadDocumentService.js";
import { storeInitialLeadDocuments } from "./leadDocumentController.js";

const VALID_STATUSES = [
  "New",
  "Pending",
  "Contacted",
  "In Process",
  "Interested",
  "Verified",
  "Follow-up",
  "Approved",
  "Sanctioned",
  "Invoice Generated",
  "Disbursed",
  "Payout Complete",
  "Rejected",
  "Invoice Rejected",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const serializePartnerLead = (lead) => {
  const value = typeof lead.toObject === "function" ? lead.toObject() : { ...lead };
  value.notes = (value.notes || []).filter((note) => note.visibility === "partner");
  value.partnerAssignmentHistory = (value.partnerAssignmentHistory || []).map(({ note: _internalNote, ...entry }) => entry);
  return value;
};

// Common validation and lead creation
const createLeadRecord = async (data) => {
  const { customerName, phone, email, loanCategory, loanAmount, leadType } =
    data;

  if (
    !customerName?.trim() ||
    !phone?.trim() ||
    !loanCategory?.trim() ||
    loanAmount === undefined ||
    loanAmount === null ||
    !Number.isFinite(Number(loanAmount)) ||
    Number(loanAmount) <= 0
  ) {
    const error = new Error(
      "Customer name, phone, loan category and valid loan amount are required.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (leadType && !["SBI", "Non-SBI"].includes(leadType)) {
    const error = new Error("Lead type must be SBI or Non-SBI.");
    error.statusCode = 400;
    throw error;
  }

  return Lead.create({
    ...data,
    customerName: customerName.trim(),
    phone: phone.trim(),
    email: email?.trim().toLowerCase() || "",
    loanCategory: loanCategory.trim(),
    loanAmount: Number(loanAmount),
    monthlyIncome: Number(data.monthlyIncome) || 0,
    tenureYears: Number(data.tenureYears) || 0,
    source: data.source,
    timeline: [
      {
        step: "Lead Created",
        user: data.submittedBy || "System",
        status: "completed",
      },
    ],
  });
};

// PUBLIC WEBSITE - Submit loan application
export const createWebsiteLead = async (req, res) => {
  let storedDocuments = [];
  try {
    const {
      customerName,
      phone,
      email,
      dob,
      gender,
      leadType,
      loanCategory,
      loanAmount,
      monthlyIncome,
      employmentType,
      tenureYears,
      city,
      propertyAddress,
      additionalDetails,
    } = req.body;

    const numericAmount = Number(loanAmount);
    const digits = String(phone || "").replace(/\D/g, "");
    const invalidEmail = email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim()) || String(email).length > 254);
    const optionalNumbersValid = [monthlyIncome, tenureYears].every((value) => value === undefined || value === "" || (Number.isFinite(Number(value)) && Number(value) >= 0));
    const date = dob ? new Date(dob) : null;
    const invalidDob = date && (Number.isNaN(date.getTime()) || date > new Date());
    if (typeof customerName !== "string" || customerName.trim().length < 2 || customerName.trim().length > 100 || !/^[+\d\s().-]+$/.test(String(phone || "").trim()) || digits.length < 7 || digits.length > 15 || invalidEmail || !Number.isFinite(numericAmount) || numericAmount <= 0 || !optionalNumbersValid || invalidDob || String(city || "").length > 100 || String(propertyAddress || "").length > 500 || String(additionalDetails || "").length > 1000) {
      const error = new Error("Check the applicant name, contact details, requested amount, date, and field lengths.");
      error.statusCode = 400;
      throw error;
    }

    const category = await LoanCategory.findOne({
      status: "active",
      $or: [{ name: loanCategory }, { slug: String(loanCategory || "").trim().toLowerCase().replace(/\s+/g, "-") }],
    });
    if (!category) {
      const error = new Error("Select an available loan category.");
      error.statusCode = 400;
      throw error;
    }

    storedDocuments = await storeInitialLeadDocuments(req.files || [], req.body.documentTypes || "[]");
    const requiredDocuments = resolveRequiredDocumentTypes(category, employmentType);

    const lead = await createLeadRecord({
      customerName,
      phone,
      email,
      dob: dob || null,
      gender,
      leadType,
      loanCategory,
      loanAmount,
      monthlyIncome,
      employmentType,
      tenureYears,
      city,
      propertyAddress,
      notes: typeof additionalDetails === "string" && additionalDetails.trim() ? [{ author: "Website applicant", text: additionalDetails.trim().slice(0, 1000) }] : [],
      source: "Website",
      submittedBy: "Website",
      documents: storedDocuments,
      requiredDocuments,
    });

    return res.status(201).json({
      success: true,
      message: "Loan application submitted successfully.",
      lead,
    });
  } catch (error) {
    await Promise.all(storedDocuments.map((document) => removeStoredDocument(document.storageKey)));
    console.error("Website Lead Creation Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to submit loan application.",
    });
  }
};

export const createAdminLead = async (req, res) => {
  try {
    const data = req.body || {};
    let assignedEmployee = null;
    if (data.assignedEmployeeId) {
      assignedEmployee = await User.findOne({ employeeCode: String(data.assignedEmployeeId).trim(), role: "employee", status: "active" }).select("employeeCode name");
      if (!assignedEmployee) return res.status(400).json({ success: false, message: "Select a valid active employee." });
    }
    const lead = await createLeadRecord({
      customerName: data.customerName, phone: data.phone, email: data.email,
      loanCategory: data.loanCategory, loanAmount: data.loanAmount, leadType: data.leadType,
      preferredBank: data.preferredBank || "", monthlyIncome: data.monthlyIncome,
      employmentType: data.employmentType || "", tenureYears: data.tenureYears,
      city: data.city || "", propertyAddress: data.propertyAddress || "",
      source: "Admin", submittedBy: req.user.name,
      assignedEmployeeId: assignedEmployee?.employeeCode || null,
      assignedEmployee: assignedEmployee?.name || "",
    });
    lead.statusHistory.push({ fromStatus: "", toStatus: lead.currentStatus, actorId: req.user._id, actorRole: "admin", actorName: req.user.name });
    await lead.save();
    return res.status(201).json({ success: true, message: "Lead created successfully.", lead });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Unable to create lead." });
  }
};

// PARTNER - Submit a referral lead
export const createPartnerLead = async (req, res) => {
  try {
    const partner = req.user;

    if (!partner || partner.role !== "partner" || !partner.partnerCode) {
      return res.status(403).json({
        success: false,
        message: "Valid partner account is required.",
      });
    }

    const {
      customerName,
      phone,
      email,
      leadType,
      loanType,
      loanCategory,
      preferredBank,
      loanAmount,
      monthlyIncome,
      tenureYears,
      city,
      branchName,
      additionalDetails,
    } = req.body;

    const lead = await createLeadRecord({
      customerName,
      phone,
      email,
      leadType,
      loanCategory: loanCategory || loanType,
      preferredBank,
      loanAmount,
      monthlyIncome,
      tenureYears,
      city,
      propertyAddress: branchName?.trim() || "",
      source: "Partner Referral",
      partnerId: partner.partnerCode,
      partnerName: partner.companyName || partner.name,
      submittedBy: partner.name,
      submitterContact: partner.phone || partner.email,
      notes: additionalDetails?.trim()
        ? [{ author: partner.name, text: additionalDetails.trim() }]
        : [],
    });

    // Increment only for a successfully created partner referral
    await User.updateOne(
      { _id: partner._id, role: "partner" },
      { $inc: { totalLeads: 1 } },
    );

    return res.status(201).json({
      success: true,
      message: "Referral lead submitted successfully.",
      lead,
    });
  } catch (error) {
    console.error("Partner Lead Creation Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to submit referral lead.",
    });
  }
};

// ADMIN / EMPLOYEE / PARTNER - Get relevant leads
export const getLeads = async (req, res) => {
  try {
    const { role, employeeCode, partnerCode } = req.user;
    const { status, search, partnerId, employeeId, loanCategory, disbursementStatus, from, to } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));

    const filter = {};

    if (role === "employee") {
      if (!employeeCode) return res.status(403).json({ success: false, message: "Employee account is missing its assignment identity." });
      filter.assignedEmployeeId = employeeCode;
    } else if (role === "partner") {
      if (!partnerCode) return res.status(403).json({ success: false, message: "Partner account is missing its partner identity." });
      filter.partnerId = partnerCode;
    } else if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view leads.",
      });
    }

    if (role === "admin") {
      if (partnerId?.trim()) filter.partnerId = partnerId.trim();
      if (employeeId?.trim()) filter.assignedEmployeeId = employeeId.trim();
    }
    if (loanCategory?.trim()) filter.loanCategory = loanCategory.trim();
    if (disbursementStatus?.trim()) filter["disbursementUpdate.status"] = disbursementStatus.trim();
    if (from || to) {
      const createdAt = {};
      if (from) { const date = new Date(from); if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Invalid start date filter." }); createdAt.$gte = date; }
      if (to) { const date = new Date(to); if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Invalid end date filter." }); date.setHours(23, 59, 59, 999); createdAt.$lte = date; }
      filter.createdAt = createdAt;
    }

    if (status && VALID_STATUSES.includes(status)) {
      filter.currentStatus = status;
    }

    if (search?.trim()) {
      const searchTerm = escapeRegex(search.trim().slice(0, 100));
      filter.$or = [
        { customerName: { $regex: searchTerm, $options: "i" } },
        { phone: { $regex: searchTerm, $options: "i" } },
        { leadCode: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Lead.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: leads.length,
      leads: role === "partner" ? leads.map(serializePartnerLead) : leads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get Leads Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch leads.",
    });
  }
};

// Get one lead - access is scoped by logged-in user's role
export const getLeadById = async (req, res) => {
  try {
    const { role, employeeCode, partnerCode } = req.user;

    const filter = { leadCode: req.params.leadCode };

    if (role === "employee") {
      if (!employeeCode) return res.status(403).json({ success: false, message: "Employee account is missing its assignment identity." });
      filter.assignedEmployeeId = employeeCode;
    } else if (role === "partner") {
      if (!partnerCode) return res.status(403).json({ success: false, message: "Partner account is missing its partner identity." });
      filter.partnerId = partnerCode;
    } else if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this lead.",
      });
    }

    const lead = await Lead.findOne(filter);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    return res.status(200).json({
      success: true,
      lead: role === "partner" ? serializePartnerLead(lead) : lead,
    });
  } catch (error) {
    console.error("Get Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch lead.",
    });
  }
};

// ADMIN - Assign or reassign lead to an employee
export const assignLead = async (req, res) => {
  try {
    const { employeeCode } = req.body;
    const { leadCode } = req.params;

    if (!employeeCode?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee code is required.",
      });
    }

    const employee = await User.findOne({
      employeeCode: employeeCode.trim(),
      role: "employee",
      status: "active",
    }).select("name employeeCode");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Active employee not found.",
      });
    }

    const lead = await Lead.findOne({ leadCode });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    lead.assignedEmployeeId = employee.employeeCode;
    lead.assignedEmployee = employee.name;

    lead.timeline.push({
      step: "Lead Assigned",
      user: req.user.name,
      status: "completed",
    });

    await lead.save();

    return res.status(200).json({
      success: true,
      message: "Lead assigned successfully.",
      lead,
    });
  } catch (error) {
    console.error("Assign Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to assign lead.",
    });
  }
};

export const assignLeadToPartner = async (req, res) => {
  try {
    const assignmentNote = typeof req.body.note === "string" ? req.body.note.trim() : "";
    if (assignmentNote.length > 1000) return res.status(400).json({ success: false, message: "Assignment note must be 1000 characters or fewer." });
    const lead = await Lead.findOne({ leadCode: req.params.leadCode });
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found." });
    if (req.user.role === "employee" && lead.assignedEmployeeId !== req.user.employeeCode) return res.status(404).json({ success: false, message: "Lead not found." });
    if (lead.currentStatus !== "Verified") return res.status(409).json({ success: false, message: "Only a lead with approved required documents can be assigned to a partner." });
    const partner = await User.findOne({ partnerCode: String(req.body.partnerCode || "").trim(), role: "partner", status: "active", partnerApprovalStatus: "approved", bankDetailsReviewStatus: "approved" }).select("partnerCode companyName name");
    if (!partner) return res.status(404).json({ success: false, message: "Select an active, approved partner." });
    const previousPartnerId = lead.partnerId || "";
    const previousPartnerName = lead.partnerName || "";
    lead.partnerId = partner.partnerCode;
    lead.partnerName = partner.companyName || partner.name;
    lead.partnerAssignmentHistory.push({ partnerId: partner.partnerCode, partnerName: lead.partnerName, previousPartnerId, previousPartnerName, note: assignmentNote, actorId: req.user._id, actorRole: req.user.role, at: new Date() });
    lead.timeline.push({ step: `Lead assigned to partner ${lead.partnerName}`, user: req.user.name, status: "completed" });
    await lead.save();
    return res.json({ success: true, message: "Verified lead assigned to partner.", lead });
  } catch (error) {
    console.error("Assign partner error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to assign lead to partner." });
  }
};

// ADMIN / ASSIGNED EMPLOYEE - Update lead details or status
export const updateLead = async (req, res) => {
  try {
    const { role, employeeCode } = req.user;
    const { leadCode } = req.params;

    const filter = { leadCode };

    if (role === "employee") {
      if (!employeeCode) return res.status(403).json({ success: false, message: "Employee account is missing its assignment identity." });
      filter.assignedEmployeeId = employeeCode;
    } else if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this lead.",
      });
    }

    const lead = await Lead.findOne(filter);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    if (req.body.loanCategory !== undefined) {
      const requestedCategory = String(req.body.loanCategory || "").trim();
      const category = await LoanCategory.findOne({ status: "active", $or: [{ name: requestedCategory }, { slug: requestedCategory.toLowerCase().replace(/\s+/g, "-") }] }).select("name");
      if (!category) return res.status(400).json({ success: false, message: "Choose an active loan category from the configured list." });
      if (lead.currentStatus === "Verified" && category.name !== lead.loanCategory) return res.status(409).json({ success: false, message: "A verified lead cannot change loan category. Ask an Admin to review the verification first." });
      req.body.loanCategory = category.name;
    }

    const adminFields = [
      "customerName",
      "phone",
      "email",
      "loanCategory",
      "loanAmount",
      "monthlyIncome",
      "applicantIncome",
      "employmentType",
      "tenureYears",
      "sanctionedAmount",
      "propertyValuation",
      "ltv",
      "cibilScore",
      "city",
      "propertyAddress",
      "cbsAccountNo",
      "rinnrakshaAmount",
      "loanPayoutAmount",
      "invoiceAmount",
      "interestRate",
    ];
    const employeeFields = ["customerName", "phone", "email", "loanCategory", "loanAmount", "monthlyIncome", "employmentType", "tenureYears", "city", "propertyAddress"];
    const allowedFields = role === "admin" ? adminFields : employeeFields;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        lead[field] = req.body[field];
      }
    }

    if (req.body.currentStatus !== undefined) {
      if (!VALID_STATUSES.includes(req.body.currentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead status.",
        });
      }

      // Verification is a document workflow decision and must never be set
      // through the general lead patch endpoint.
      if (req.body.currentStatus === "Verified") {
        return res.status(409).json({
          success: false,
          message: "Lead verification requires all required documents to be approved.",
        });
      }
      if (req.body.currentStatus === "Disbursed") {
        return res.status(409).json({ success: false, message: "Disbursed status requires a partner evidence submission and Admin confirmation." });
      }

      const employeeStatuses = ["Pending", "Contacted", "In Process", "Interested", "Follow-up", "Rejected"];
      if (role === "employee" && !employeeStatuses.includes(req.body.currentStatus)) {
        return res.status(403).json({ success: false, message: "Employees cannot set this lead status." });
      }

      const previousStatus = lead.currentStatus;
      lead.currentStatus = req.body.currentStatus;
      lead.statusHistory.push({ fromStatus: previousStatus, toStatus: req.body.currentStatus, actorId: req.user._id, actorRole: req.user.role, actorName: req.user.name, at: new Date() });

      lead.timeline.push({
        step: `Status changed to ${req.body.currentStatus}`,
        user: req.user.name,
        status: "completed",
      });
    }

    if (req.body.note?.trim()) {
      lead.notes.push({
        author: req.user.name,
        actorId: req.user._id,
        actorRole: req.user.role,
        text: req.body.note.trim(),
      });
    }

    await lead.save();

    return res.status(200).json({
      success: true,
      message: "Lead updated successfully.",
      lead,
    });
  } catch (error) {
    console.error("Update Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update lead.",
    });
  }
};

// ADMIN - Delete a lead
export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({
      leadCode: req.params.leadCode,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
      });
    }

    // Keep partner referral count in sync
    if (lead.source === "Partner Referral" && lead.partnerId) {
      await User.updateOne(
        { partnerCode: lead.partnerId, role: "partner" },
        { $inc: { totalLeads: -1 } },
      );
    }

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete lead.",
    });
  }
};
