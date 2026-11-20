import { randomUUID } from "crypto";
import mongoose from "mongoose";

import Ticket from "../models/Ticket.js";
import Lead from "../models/Lead.js";
import User from "../models/User.js";
import LoanCategory from "../models/LoanCategory.js";

// Get tickets according to logged-in user's role
export const getTickets = async (req, res) => {
  try {
    const { role, _id } = req.user;

    const filter = {};

    if (role === "employee") {
      filter.$or = [{ createdByUser: _id }, { ticketType: "Callback", assignedEmployeeId: req.user.employeeCode }];
    } else if (role === "partner") {
      filter.createdByUser = _id;
    }

    const tickets = await Ticket.find(filter).sort({ updatedAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error("Get Tickets Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch support tickets.",
    });
  }
};

export const createCallbackRequest = async (req, res) => {
  const { name, phone, email = "", message = "", loanCategory = "", city = "", loanAmount = null, idempotencyKey } = req.body || {};
  const customerName = String(name || "").trim();
  const customerPhone = String(phone || "").trim();
  const customerEmail = String(email || "").trim().toLowerCase();
  const normalizedMessage = String(message || "").trim();
  const digits = customerPhone.replace(/\D/g, "");
  if (customerName.length < 2 || customerName.length > 100) return res.status(400).json({ success: false, message: "Enter a name between 2 and 100 characters." });
  if (!/^[+\d\s().-]+$/.test(customerPhone) || digits.length < 7 || digits.length > 15) return res.status(400).json({ success: false, message: "Enter a valid phone number." });
  if (customerEmail && (customerEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(customerEmail))) return res.status(400).json({ success: false, message: "Enter a valid email address." });
  if (normalizedMessage.length > 1000 || String(loanCategory).length > 100 || String(city).length > 100) return res.status(400).json({ success: false, message: "One or more callback fields exceed their allowed length." });
  if (String(loanCategory || "").trim() && !(await LoanCategory.exists({ name: String(loanCategory).trim(), status: "active" }))) return res.status(400).json({ success: false, message: "Choose an available loan category." });
  const amount = loanAmount === null || loanAmount === "" ? null : Number(loanAmount);
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) return res.status(400).json({ success: false, message: "Loan amount must be greater than zero." });
  if (!/^[0-9a-f-]{36}$/i.test(String(idempotencyKey || ""))) return res.status(400).json({ success: false, message: "A valid submission key is required." });
  try {
    const previous = await Ticket.findOne({ idempotencyKey }).select("+idempotencyKey");
    if (previous) return res.status(200).json({ success: true, duplicate: true, referenceId: previous.ticketId, message: "This callback request was already received." });
    const title = "Website callback request";
    const description = normalizedMessage || `Callback requested${loanCategory ? ` about ${String(loanCategory).trim()}` : ""}.`;
    const ticket = await Ticket.create({
      ticketId: `RC-CB-${randomUUID().slice(0, 8).toUpperCase()}`,
      title, ticketType: "Callback", customerName, customerPhone, customerEmail,
      loanCategory: String(loanCategory).trim(), city: String(city).trim(), loanAmount: amount,
      source: "website", idempotencyKey, description, createdBy: customerName, createdByRole: "public",
      status: "Open", statusHistory: [{ status: "Open", actorRole: "public" }],
      messages: normalizedMessage ? [{ sender: customerName, role: "public", isStaff: false, text: normalizedMessage }] : [],
    });
    return res.status(201).json({ success: true, referenceId: ticket.ticketId, message: "Callback request received." });
  } catch (error) {
    if (error.code === 11000) {
      const previous = await Ticket.findOne({ idempotencyKey }).select("+idempotencyKey");
      if (previous) return res.status(200).json({ success: true, duplicate: true, referenceId: previous.ticketId, message: "This callback request was already received." });
    }
    console.error("Callback request persistence failed:", error.name, error.message);
    return res.status(500).json({ success: false, message: "Unable to save callback request." });
  }
};

export const assignCallbackRequest = async (req, res) => {
  const employee = await User.findOne({ employeeCode: String(req.body.employeeCode || "").trim(), role: "employee", status: "active" }).select("name employeeCode");
  if (!employee) return res.status(404).json({ success: false, message: "Active employee not found." });
  const ticket = await Ticket.findOne({ _id: req.params.id, ticketType: "Callback" });
  if (!ticket) return res.status(404).json({ success: false, message: "Callback request not found." });
  ticket.assignedEmployeeId = employee.employeeCode;
  ticket.assignedEmployeeName = employee.name;
  ticket.assignmentHistory.push({ employeeCode: employee.employeeCode, employeeName: employee.name, actorId: req.user._id });
  await ticket.save();
  return res.json({ success: true, ticket });
};

const canManageCallback = (ticket, user) => user.role === "admin" || (user.role === "employee" && ticket.ticketType === "Callback" && ticket.assignedEmployeeId === user.employeeCode);

export const addCallbackInternalNote = async (req, res) => {
  const note = String(req.body.note || "").trim();
  if (!note || note.length > 2000) return res.status(400).json({ success: false, message: "Internal note must contain 1 to 2,000 characters." });
  const ticket = await Ticket.findOne({ _id: req.params.id, ticketType: "Callback" });
  if (!ticket || !canManageCallback(ticket, req.user)) return res.status(404).json({ success: false, message: "Callback request not found or access denied." });
  ticket.internalNotes.push({ author: req.user.name || req.user.email, actorId: req.user._id, actorRole: req.user.role, text: note });
  await ticket.save();
  return res.json({ success: true, internalNotes: ticket.internalNotes });
};

// Verify whether the logged-in user can access a linked lead
const verifyLeadAccess = async (leadCode, user) => {
  const lead = await Lead.findOne({ leadCode });

  if (!lead) return null;

  if (user.role === "admin") {
    return lead;
  }

  if (user.role === "partner" && lead.partnerId === user.partnerCode) {
    return lead;
  }

  if (
    user.role === "employee" &&
    lead.assignedEmployeeId === user.employeeCode
  ) {
    return lead;
  }

  return false;
};

// Create a support ticket
export const createTicket = async (req, res) => {
  try {
    const { title, ticketType, leadId, subcategory, priority, description } =
      req.body;

    const user = req.user;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Ticket title and description are required.",
      });
    }

    if (!["Lead", "Invoice", "Other"].includes(ticketType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket type.",
      });
    }

    const validPriorities = ["Low", "Medium", "High", "Critical"];
    const ticketPriority = priority || "Medium";

    if (!validPriorities.includes(ticketPriority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket priority.",
      });
    }

    let linkedLead = null;

    if (ticketType === "Lead") {
      if (!leadId?.trim()) {
        return res.status(400).json({
          success: false,
          message: "A lead must be selected for this ticket type.",
        });
      }

      linkedLead = await verifyLeadAccess(leadId.trim(), user);

      if (linkedLead === false) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to create a ticket for this lead.",
        });
      }

      if (!linkedLead) {
        return res.status(404).json({
          success: false,
          message: "Linked lead not found.",
        });
      }
    }

    const senderName = user.name || user.username || user.email;

    const ticket = await Ticket.create({
      ticketId: `RC-TKT-${randomUUID().slice(0, 8).toUpperCase()}`,

      title: title.trim(),
      ticketType,

      // Linked lead details are taken from MongoDB,
      // never trusted from frontend input.
      leadType: linkedLead?.leadType || "",
      leadId: linkedLead?.leadCode || "",
      customerName: linkedLead?.customerName || "",

      subcategory: subcategory?.trim() || "",
      priority: ticketPriority,
      description: description.trim(),

      createdBy: senderName,
      createdByUser: user._id,
      createdByRole: user.role,

      status: "Open",

      messages: [
        {
          sender: senderName,
          role: user.role,
          isStaff: user.role === "admin",
          text: description.trim(),
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Create Ticket Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create support ticket.",
    });
  }
};

// Add a reply to an existing ticket
export const addTicketMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const user = req.user;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message cannot be empty.",
      });
    }

    const filter = { _id: id };

    // Non-admin users can reply only to their own tickets.
    if (user.role !== "admin") {
      filter.$or = [{ createdByUser: user._id }, ...(user.role === "employee" ? [{ ticketType: "Callback", assignedEmployeeId: user.employeeCode }] : [])];
    }

    const ticket = await Ticket.findOne(filter);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found or access denied.",
      });
    }

    if (ticket.status === "Resolved") {
      return res.status(400).json({
        success: false,
        message: "This ticket is resolved. Reopen it before replying.",
      });
    }

    ticket.messages.push({
      sender: user.name || user.username || user.email,
      role: user.role,
      isStaff: user.role === "admin",
      text: message.trim(),
    });

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Reply added successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Add Ticket Message Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add ticket reply.",
    });
  }
};

// Update ticket status - Admin only
export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Open", "In Progress", "Resolved"];

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket ID.",
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket status.",
      });
    }

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    if (req.user.role !== "admin" && !canManageCallback(ticket, req.user)) return res.status(404).json({ success: false, message: "Ticket not found or access denied." });
    const allowedTransition = ticket.status === status || ticket.status === "Open" && status === "In Progress" || ticket.status === "In Progress" && ["Open", "Resolved"].includes(status) || ticket.status === "Resolved" && status === "In Progress";
    const allowed = ticket.ticketType !== "Callback" || allowedTransition;
    if (!allowed) return res.status(409).json({ success: false, message: "This status transition is not allowed." });
    if (ticket.status !== status) {
      ticket.status = status;
      ticket.statusHistory.push({ status, actorId: req.user._id, actorRole: req.user.role });
      await ticket.save();
    }

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Update Ticket Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update ticket status.",
    });
  }
};
