import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { formatINR, formatLakhCrore } from "../../utils/formatters";
import { formatLeadUid } from "../../utils/leadIds";
import { StatusBadge } from "../common/StatusBadge";
import { apiBlob } from "../../services/api";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Percent,
  Layers,
  Send,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  ExternalLink,
  Copy,
} from "lucide-react";

export const LeadDetailsModal = () => {
  const { role } = useAuth();
  const {
    activeLeadModal,
    setActiveLeadModal,
    updateLeadStatus,
    assignLead,
    addLeadNote,
    employees,
    showToast,
  } = useApp();

  const [expandedSection, setExpandedSection] = useState({
    basic: true,
    financial: true,
    additional: true,
    timeline: true,
    documents: true,
    notes: true,
  });

  const [newRemark, setNewRemark] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [documentBusy, setDocumentBusy] = useState(null);

  if (!activeLeadModal) return null;
  const lead = activeLeadModal;

  const toggleSection = (key) => {
    setExpandedSection((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const accessDocument = async (doc, disposition) => {
    const documentId = doc.documentId || doc._id;
    const leadCode = lead.leadCode || lead.id;
    if (!leadCode || !documentId) {
      showToast("This document is missing its lead or document reference. Refresh the lead and try again.", "error");
      return;
    }
    setDocumentBusy(documentId);
    try {
      const blob = await apiBlob(`/leads/${encodeURIComponent(leadCode)}/documents/${encodeURIComponent(documentId)}/${disposition}`);
      const url = URL.createObjectURL(blob);
      if (disposition === "preview") setPreviewDoc({ ...doc, previewUrl: url });
      else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = doc.fileName || doc.name || "customer-document";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (error) { showToast(error.message || "Document could not be opened.", "error"); }
    finally { setDocumentBusy(null); }
  };

  const handleStatusChange = (e) => {
    const val = e.target.value;
    setSelectedStatus(val);
    if (val) {
      updateLeadStatus(lead.id, val);
      lead.currentStatus = val;
    }
  };

  const handleAssignEmployee = (e) => {
    const empId = e.target.value;
    setSelectedEmployeeId(empId);
    const emp = employees.find((x) => x.id === empId);
    if (emp) {
      assignLead(lead.id, emp.name, emp.id);
      lead.assignedEmployee = emp.name;
    }
  };

  const handleAddRemark = async (e) => {
    e.preventDefault();

    if (!newRemark.trim()) return;

    await addLeadNote(lead.id, newRemark.trim(), "CRM Manager");
    setNewRemark("");
  };

  const copyFullLeadUid = async () => {
    try {
      await navigator.clipboard.writeText(lead.leadCode || lead.id);
      showToast("Full lead ID copied.", "success");
    } catch {
      showToast("Could not copy the full lead ID.", "error");
    }
  };

  const shortLeadUid = formatLeadUid(lead.leadCode || lead.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="relative flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-4 py-3.5 text-slate-800 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-orange-50 text-xs font-bold text-brand-royal">
              {lead.leadType === "SBI" ? "SBI" : "P-BK"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-tight text-brand-navy">
                  {lead.customerName}
                </h3>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-50 text-slate-600 border border-slate-200">
                  {shortLeadUid}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    lead.leadType === "SBI"
                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                      : "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}
                >
                  {lead.leadType}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <span>{lead.loanCategory}</span>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <span>Created {lead.createdDate}</span>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <span>CBS A/C: {lead.cbsAccountNo}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <StatusBadge status={lead.currentStatus} size="lg" />
            <button
              onClick={() => setActiveLeadModal(null)}
              aria-label="Close lead details"
              className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-navy"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Control Bar */}
        <div className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 text-xs sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600">
              Quick Status Update:
            </span>
            <select
              value={selectedStatus || lead.currentStatus}
              onChange={handleStatusChange}
              className="min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="New">Pending (New)</option>
              <option value="In Process">In Process</option>
              <option value="Contacted">Contacted</option>
              <option value="Verified">Verified</option>
              <option value="Approved">Approved</option>
              <option value="Disbursed">Disbursed</option>
              <option value="Invoice Generated">Invoice Generated</option>
              <option value="Invoice Rejected">Invoice Rejected</option>
              <option value="Hold">Hold</option>
              <option value="Rejected">Rejected</option>
              <option value="Payout Complete">Payout Complete</option>
              <option value="Payout Failed">Payout Failed</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600">
              Assigned Officer:
            </span>
            <select
              value={selectedEmployeeId || lead.assignedEmployeeId || ""}
              onChange={handleAssignEmployee}
              className="min-w-52 rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-100"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-3 sm:p-5">
          {/* SECTION 1: Basic Information */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => toggleSection("basic")}
              className="flex w-full items-center justify-between bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5"
            >
              <div className="flex items-center space-x-2.5">
                <User className="w-4 h-4 text-brand-royal" />
                <span className="font-bold text-brand-navy text-sm">
                  1. Basic Information
                </span>
              </div>
              {expandedSection.basic ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {expandedSection.basic && (
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-white p-4 text-xs sm:grid-cols-2 sm:p-5 md:grid-cols-3">
                <div>
                  <span className="text-slate-400 block mb-1">
                    Customer Full Name
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {lead.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    Mobile Contact
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.phone}</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    Email Address
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.email}</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    City / Region
                  </span>
                  <span className="font-semibold text-slate-800 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lead.city}</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    Employment Type
                  </span>
                  <span className="font-semibold text-slate-800">
                    {lead.employmentType || "Salaried"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    Monthly Verified Income
                  </span>
                  <span className="font-semibold text-emerald-600 text-sm">
                    {formatINR(lead.monthlyIncome)} / month
                  </span>
                </div>
                <div className="md:col-span-3">
                  <span className="text-slate-400 block mb-1">
                    Residential / Property Location
                  </span>
                  <span className="font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 block">
                    {lead.propertyAddress ||
                      "Address on file verified via utility bill verification."}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Financial Details */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => toggleSection("financial")}
              className="flex w-full items-center justify-between bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5"
            >
              <div className="flex items-center space-x-2.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-brand-navy text-sm">
                  2. Financial Details (CBS & Payout Metrics)
                </span>
              </div>
              {expandedSection.financial ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {expandedSection.financial && (
              <div className="space-y-4 border-t border-slate-100 bg-white p-4 sm:p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                    <span className="text-[11px] font-semibold text-brand-royal uppercase tracking-wider block mb-1">
                      Sanction Loan Amount
                    </span>
                    <span className="text-lg font-extrabold text-brand-navy block">
                      {formatINR(lead.loanAmount)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {formatLakhCrore(lead.loanAmount)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
                    <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">
                      Rinnraksha (Insurance)
                    </span>
                    <span className="text-lg font-extrabold text-amber-900 block">
                      {formatINR(lead.rinnrakshaAmount)}
                    </span>
                    <span className="text-[10px] text-amber-600">
                      Funded / Single Premium
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
                      Net Loan Payout
                    </span>
                    <span className="text-lg font-extrabold text-emerald-900 block">
                      {formatINR(lead.loanPayoutAmount)}
                    </span>
                    <span className="text-[10px] text-emerald-600">
                      Net Disbursed to Builder/Client
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
                    <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block mb-1">
                      Partner Invoice Amount
                    </span>
                    <span className="text-lg font-extrabold text-purple-900 block">
                      {formatINR(lead.invoiceAmount)}
                    </span>
                    <span className="text-[10px] text-purple-600">
                      Amount based on recorded invoice data
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block mb-1">
                      Applicable Interest Rate
                    </span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {lead.interestRate ? `${lead.interestRate}% p.a.` : "Not recorded"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">
                      Loan Tenure
                    </span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {lead.tenureYears
                        ? `${lead.tenureYears} Years (${lead.tenureYears * 12} Months)`
                        : "Not recorded"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">
                      Estimated Monthly EMI
                    </span>
                    <span className="font-semibold text-brand-navy text-sm">
                      {lead.interestRate > 0 && lead.tenureYears > 0 ? `${formatINR(Math.round(lead.loanAmount * (lead.interestRate / 1200) / (1 - Math.pow(1 + lead.interestRate / 1200, -lead.tenureYears * 12))))} / mo (estimate)` : "Not available"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Additional Information */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => toggleSection("additional")}
              className="flex w-full items-center justify-between bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5"
            >
              <div className="flex items-center space-x-2.5">
                <Layers className="w-4 h-4 text-brand-teal" />
                <span className="font-bold text-brand-navy text-sm">
                  3. Sourcing Channel & Submitter Attribution
                </span>
              </div>
              {expandedSection.additional ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {expandedSection.additional && (
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-white p-4 text-xs sm:grid-cols-2 sm:p-5 md:grid-cols-3">
                <div>
                  <span className="text-slate-400 block mb-1">
                    Sourcing Channel / Submitter
                  </span>
                  <span className="font-semibold text-slate-800 text-sm block">
                    {lead.partnerName ||
                      lead.submittedBy ||
                      "Direct Web Ingestion"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Source:{" "}
                    <strong className="text-brand-navy">
                      {lead.source ||
                        (lead.partnerName ? "Partner Referral" : "Direct")}
                    </strong>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    Submitter Identification & Contact
                  </span>
                  <span className="font-semibold text-slate-800 text-sm block">
                    {lead.submittedBy ||
                      lead.assignedEmployee ||
                      "Online Intake"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {lead.submitterContact
                      ? `Contact: ${lead.submitterContact}`
                      : `ID: ${lead.partnerId || lead.assignedEmployeeId || "SYS-01"}`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    Assigned Loan Officer
                  </span>
                  <span className="font-semibold text-slate-800 text-sm block">
                    {lead.assignedEmployee || "Unassigned"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Officer ID: {lead.assignedEmployeeId || "EMP-N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    CBS Loan Account Number
                  </span>
                  <span className="font-mono font-semibold text-slate-800 text-sm block">
                    {lead.cbsAccountNo || "Pending Creation"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Linked Core Banking System
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    Property / processing detail
                  </span>
                  <span className="font-semibold text-slate-800 text-sm block">
                    {lead.propertyAddress || "Not recorded"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Processing Location
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">
                    File Intake Date
                  </span>
                  <span className="font-semibold text-slate-800 text-sm block">
                    {lead.createdDate || lead.addedOn || "Not recorded"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    CRM Timestamp
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Status Timeline */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => toggleSection("timeline")}
              className="flex w-full items-center justify-between bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5"
            >
              <div className="flex items-center space-x-2.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-brand-navy text-sm">
                  4. Workflow Status Timeline
                </span>
              </div>
              {expandedSection.timeline ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {expandedSection.timeline && (
              <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
                {(lead.partnerAssignmentHistory || []).length > 0 && (
                  <section aria-label="Partner assignment history" className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-blue-950">Partner assignment history</h3>
                    <div className="mt-3 space-y-3">
                      {[...lead.partnerAssignmentHistory].reverse().map((assignment, idx) => (
                        <article key={`${assignment.at || "assignment"}-${idx}`} className="rounded-lg border border-blue-100 bg-white p-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="text-slate-800">{assignment.partnerName || assignment.partnerId || "Partner"}</strong>
                            <time className="text-slate-500">{assignment.at ? new Date(assignment.at).toLocaleString() : "Date unavailable"}</time>
                          </div>
                          <p className="mt-1 text-slate-600">Partner ID: {assignment.partnerId || "Not recorded"}{assignment.actorRole ? ` · Assigned by ${assignment.actorRole}` : ""}</p>
                          {assignment.previousPartnerId && <p className="mt-1 text-slate-600">Previous partner: {assignment.previousPartnerName || assignment.previousPartnerId} ({assignment.previousPartnerId})</p>}
                          {role !== "partner" && assignment.note && <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 text-slate-700">Assignment note: {assignment.note}</p>}
                        </article>
                      ))}
                    </div>
                  </section>
                )}
                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {(lead.timeline || []).map((ev, idx) => {
                    const isDone = ev.status === "completed";
                    const isCurrent = ev.status === "current";
                    return (
                      <div key={idx} className="relative group">
                        <div
                          className={`absolute -left-[29px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white transition-all ${
                            isDone
                              ? "border-emerald-500 text-emerald-600"
                              : isCurrent
                                ? "border-brand-royal text-brand-royal animate-pulse ring-4 ring-blue-100"
                                : "border-slate-300 text-slate-400"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">
                              {ev.step}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              Handled by: {ev.user}
                            </span>
                          </div>
                          <span className="text-slate-400 font-mono text-[11px] mt-1 sm:mt-0">
                            {ev.date}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: Documents */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => toggleSection("documents")}
              className="flex w-full items-center justify-between bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-brand-navy text-sm">
                  5. Uploaded Customer Documents ({lead.documents?.length || 0})
                </span>
              </div>
              {expandedSection.documents ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {expandedSection.documents && (
              <div className="border-t border-slate-100 bg-white p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(lead.documents || []).map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-200 transition-all group"
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          PDF
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {doc.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">
                            {doc.fileName}
                          </p>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">
                              {doc.type}
                            </span>
                            {doc.status === "approved" || doc.verified ? (
                              <span className="text-[10px] font-semibold text-emerald-600 flex items-center">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />{" "}
                                Verified
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-600">
                                {doc.status === "rejected" ? "Rejected" : "Pending Review"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          onClick={() => accessDocument(doc, "preview")}
                          title="View Document"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-royal hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                        >
                          {documentBusy === (doc.documentId || doc._id) ? <span className="text-[9px]">Loading</span> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => accessDocument(doc, "download")}
                          title="Download File"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: Notes & Call Remarks */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => toggleSection("notes")}
              className="flex w-full items-center justify-between bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5"
            >
              <div className="flex items-center space-x-2.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-brand-navy text-sm">
                  6. Case Notes & Communication History
                </span>
              </div>
              {expandedSection.notes ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {expandedSection.notes && (
              <div className="space-y-4 border-t border-slate-100 bg-white p-4 sm:p-5">
                <form onSubmit={handleAddRemark} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    placeholder="Add an officer remark or telephonic follow-up note..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-3 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="submit"
                    className="bg-brand-royal hover:bg-brand-navy text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Add Note</span>
                  </button>
                </form>

                <div className="space-y-2.5">
                  {(lead.notes || []).map((n, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-brand-navy">
                          {n.author}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {n.date}
                        </span>
                      </div>
                      <p className="text-slate-600">{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
          <span className="text-xs text-slate-500">
            RealCred CRM - Lead ID:{" "}
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono font-bold text-brand-navy">{shortLeadUid}</span>
            <button type="button" onClick={copyFullLeadUid} title="Copy full lead ID" className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-600 hover:border-rose-200 hover:text-brand-royal"><Copy className="h-3.5 w-3.5" />Copy full ID</button>
          </span>
          <button
            onClick={() => setActiveLeadModal(null)}
            className="px-5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Close Modal
          </button>
        </div>
      </div>

      {/* Keep the preview outside the scroll-clipped lead modal. */}
      {previewDoc && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h4 className="font-bold text-base text-slate-800">
                {previewDoc.name}
              </h4>
              <button
                onClick={() => { URL.revokeObjectURL(previewDoc.previewUrl); setPreviewDoc(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 rounded-xl bg-slate-50 p-2">
              {previewDoc.mimeType === "application/pdf" ? <iframe title={previewDoc.fileName || previewDoc.name} src={previewDoc.previewUrl} className="h-[72vh] w-full rounded-lg border border-slate-200 bg-white" /> : <div className="grid h-full min-h-64 place-items-center"><img src={previewDoc.previewUrl} alt={previewDoc.name} className="max-h-[72vh] max-w-full rounded-lg object-contain" /></div>}
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => accessDocument(previewDoc, "download")}
                className="px-4 py-2 bg-brand-royal text-white text-xs font-semibold rounded-lg hover:bg-brand-navy transition-colors flex items-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>Download Copy</span>
              </button>
              <button
                onClick={() => { URL.revokeObjectURL(previewDoc.previewUrl); setPreviewDoc(null); }}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
