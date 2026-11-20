import mongoose from "mongoose";

// Individual conversation messages
const ticketMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["admin", "partner", "employee", "public"],
      required: true,
    },

    isStaff: {
      type: Boolean,
      default: false,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

// Main support ticket
const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    ticketType: {
      type: String,
      enum: ["Lead", "Invoice", "Other", "Callback"],
      required: true,
    },

    leadType: {
      type: String,
      default: "",
      trim: true,
    },

    leadId: {
      type: String,
      default: "",
      trim: true,
    },

    customerName: {
      type: String,
      default: "",
      trim: true,
    },

    customerPhone: { type: String, trim: true, default: "" },
    customerEmail: { type: String, trim: true, lowercase: true, default: "" },
    loanCategory: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    loanAmount: { type: Number, min: 0, default: null },
    source: { type: String, trim: true, default: "crm" },
    idempotencyKey: { type: String, trim: true, unique: true, sparse: true, select: false },
    assignedEmployeeId: { type: String, trim: true, default: "", index: true },
    assignedEmployeeName: { type: String, trim: true, default: "" },
    assignmentHistory: [{ employeeCode: String, employeeName: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, at: { type: Date, default: Date.now } }],
    statusHistory: [{ status: { type: String, required: true }, actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, actorRole: String, at: { type: Date, default: Date.now } }],
    internalNotes: [{ author: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, actorRole: String, text: { type: String, required: true, trim: true, maxlength: 2000 }, createdAt: { type: Date, default: Date.now } }],

    subcategory: {
      type: String,
      default: "",
      trim: true,
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Person who originally created the ticket
    createdBy: {
      type: String,
      required: true,
      trim: true,
    },

    // Actual authenticated MongoDB user
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Role of the ticket creator
    createdByRole: {
      type: String,
      enum: ["admin", "partner", "employee", "public"],
      default: "admin",
      index: true,
    },

    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open",
      index: true,
    },

    messages: {
      type: [ticketMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Efficient ticket listing for each user
ticketSchema.index({ createdByUser: 1, updatedAt: -1 });
ticketSchema.index({ status: 1, updatedAt: -1 });

const Ticket = mongoose.model("Ticket", ticketSchema);

export default Ticket;
