import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { leadsApi, partnersApi } from "../../services/api";
import {
  formatINR,
  formatLakhCrore,
  exportToCSV,
} from "../../utils/formatters";
import { StatusBadge } from "../../components/common/StatusBadge";
import { formatLeadUid } from "../../utils/leadIds";
import {
  Search,
  Filter,
  Download,
  Plus,
  UserCheck,
  CheckCircle2,
  Eye,
  Edit,
  ArrowUpDown,
  Building,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
} from "lucide-react";

export const AdminLeadsPage = () => {
  const { user } = useAuth();
  const {
    leads,
    addLead,
    updateLeadStatus,
    assignLead,
    employees,
    setActiveLeadModal,
    showToast,
    refreshFromApi,
  } = useApp();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("ALL"); // 'ALL' | 'SBI' | 'Non-SBI'
  const [scopeFilter, setScopeFilter] = useState("TEAM"); // 'MINE' | 'TEAM'
  const [statusTab, setStatusTab] = useState("ALL");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'cards'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals for Add Lead & Assign
  const [showAddModal, setShowAddModal] = useState(false);
  const [reassignTargetLead, setReassignTargetLead] = useState(null);
  const [partnerAssignmentTarget, setPartnerAssignmentTarget] = useState(null);
  const [eligiblePartners, setEligiblePartners] = useState([]);
  const [partnerCode, setPartnerCode] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [partnerAssigning, setPartnerAssigning] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    leadType: "SBI",
    loanCategory: "Home Loan",
    loanAmount: "",
    monthlyIncome: "",
    city: "",
    assignedEmployeeId: "",
  });

  useEffect(() => {
    let active = true;
    partnersApi.getEligible().then((response) => {
      if (active) setEligiblePartners(Array.isArray(response.partners) ? response.partners : []);
    }).catch((error) => {
      if (active) showToast(error.message || "Unable to load eligible partners.", "error");
    });
    return () => { active = false; };
  }, []);

  const statusTabsList = [
    "ALL",
    "Pending",
    "In Process",
    "Approved",
    "Disbursed",
    "Rejected",
  ];

  // Mine means leads created by the signed-in user or assigned to their employee identity.
  const scopeLeads = useMemo(() => {
    if (scopeFilter === "TEAM") return leads;
    return leads.filter((lead) => {
      const submittedByMe = Boolean(user?.name && lead.submittedBy === user.name);
      const assignedToMe = Boolean(user?.employeeCode && lead.assignedEmployeeId === user.employeeCode);
      return submittedByMe || assignedToMe;
    });
  }, [leads, scopeFilter, user?.name, user?.employeeCode]);

  // Filtering Logic
  const filteredLeads = useMemo(() => {
    return scopeLeads.filter((lead) => {
      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = lead.customerName?.toLowerCase().includes(query);
        const matchesId = lead.id?.toLowerCase().includes(query);
        const matchesCbs = lead.cbsAccountNo?.toLowerCase().includes(query);
        const matchesPhone = lead.phone?.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesCbs && !matchesPhone)
          return false;
      }

      // SBI / Non-SBI toggle
      if (leadTypeFilter !== "ALL" && lead.leadType !== leadTypeFilter) {
        return false;
      }

      // Status tab matching 5 core statuses or direct match
      if (statusTab !== "ALL") {
        if (statusTab === "Pending") {
          if (!["Pending", "New"].includes(lead.currentStatus)) return false;
        } else if (statusTab === "In Process") {
          if (
            ![
              "In Process",
              "Contacted",
              "Verified",
              "Follow-up",
              "Interested",
            ].includes(lead.currentStatus)
          )
            return false;
        } else if (statusTab === "Approved") {
          if (
            !["Approved", "Sanctioned", "Invoice Generated"].includes(
              lead.currentStatus,
            )
          )
            return false;
        } else if (statusTab === "Disbursed") {
          if (!["Disbursed", "Payout Complete"].includes(lead.currentStatus))
            return false;
        } else if (statusTab === "Rejected") {
          if (!["Rejected", "Invoice Rejected"].includes(lead.currentStatus))
            return false;
        } else if (lead.currentStatus !== statusTab) {
          return false;
        }
      }

      return true;
    });
  }, [scopeLeads, searchTerm, leadTypeFilter, statusTab]);

  // Pagination
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleExportCSV = () => {
    const exportData = filteredLeads.map((l) => ({
      "Lead ID": formatLeadUid(l.id),
      "Customer Name": l.customerName,
      "Lead Type": l.leadType,
      "CBS Account": l.cbsAccountNo,
      Category: l.loanCategory,
      "Loan Amount": l.loanAmount,
      "Invoice Amount": l.invoiceAmount,
      "Current Status": l.currentStatus,
      "Assigned Employee": l.assignedEmployee,
      "Created Date": l.createdDate,
      City: l.city,
      Phone: l.phone,
    }));
    exportToCSV(exportData, `realcred_leads_${Date.now()}.csv`);
    showToast("Leads CSV exported successfully!", "success");
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLeadForm.customerName || !newLeadForm.phone) {
      showToast("Please provide customer name and phone", "error");
      return;
    }

    const payload = { ...newLeadForm };
    try {
      await addLead(payload);
      setShowAddModal(false);
    } catch { return; }
    setNewLeadForm({
      customerName: "",
      phone: "",
      email: "",
      leadType: "SBI",
      loanCategory: "Home Loan",
      loanAmount: "",
      monthlyIncome: "",
      city: "",
      assignedEmployeeId: "",
    });
  };

  const openPartnerAssignment = (lead) => {
    setPartnerAssignmentTarget(lead);
    setPartnerCode(lead.partnerId || "");
    setAssignmentNote("");
  };

  const handlePartnerAssignment = async (event) => {
    event.preventDefault();
    if (!partnerAssignmentTarget || !partnerCode) {
      showToast("Select an eligible partner.", "error");
      return;
    }
    if (partnerAssignmentTarget.currentStatus !== "Verified") {
      showToast("Approve the required lead documents and verify the lead before assigning a partner.", "error");
      return;
    }
    setPartnerAssigning(true);
    try {
      const response = await leadsApi.assignPartner(partnerAssignmentTarget.leadCode || partnerAssignmentTarget.id, partnerCode, assignmentNote);
      if (!response?.success) throw new Error(response?.message || "Unable to assign lead to partner.");
      await refreshFromApi();
      showToast(response.message || "Lead assigned to partner successfully.", "success");
      setPartnerAssignmentTarget(null);
      setPartnerCode("");
      setAssignmentNote("");
    } catch (error) {
      showToast(error.message || "Partner assignment failed.", "error");
    } finally {
      setPartnerAssigning(false);
    }
  };

  const handleReassign = (empId) => {
    if (!reassignTargetLead) return;
    const emp = employees.find((x) => x.id === empId);
    if (emp) {
      assignLead(reassignTargetLead.id, emp.name, emp.id);
      setReassignTargetLead(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Main Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Leads Management Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline monitoring, verification queues, and banking
            dispatch.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold shadow-glow flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* Control Filters Bar: Search, SBI Toggle, Mine/Team, View Mode */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box (6 Cols) */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by customer, phone, lead ID, or CBS number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal focus:bg-white transition-all"
            />
          </div>

          {/* SBI / Non-SBI Toggle (3 Cols) */}
          <div className="md:col-span-4 flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => {
                setLeadTypeFilter("ALL");
                setCurrentPage(1);
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                leadTypeFilter === "ALL"
                  ? "bg-white text-brand-navy shadow-xs font-extrabold"
                  : "hover:text-slate-900"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => {
                setLeadTypeFilter("SBI");
                setCurrentPage(1);
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                leadTypeFilter === "SBI"
                  ? "bg-brand-royal text-white shadow-xs font-extrabold"
                  : "hover:text-slate-900"
              }`}
            >
              SBI Leads
            </button>
            <button
              onClick={() => {
                setLeadTypeFilter("Non-SBI");
                setCurrentPage(1);
              }}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                leadTypeFilter === "Non-SBI"
                  ? "bg-brand-royal text-white shadow-xs font-extrabold"
                  : "hover:text-slate-900"
              }`}
            >
              Non-SBI
            </button>
          </div>

          {/* Mine / Team Toggle (3 Cols) */}
          <div className="md:col-span-3 flex items-center justify-end space-x-2">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => { setScopeFilter("TEAM"); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scopeFilter === "TEAM"
                    ? "bg-white text-brand-navy shadow-xs font-extrabold"
                    : ""
                }`}
              >
                Team Leads
              </button>
              <button
                onClick={() => { setScopeFilter("MINE"); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scopeFilter === "MINE"
                    ? "bg-white text-brand-navy shadow-xs font-extrabold"
                    : ""
                }`}
              >
                Mine
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Status Tabs Bar with Live Counts */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs">
          {statusTabsList.map((tab) => {
            const count =
              tab === "ALL"
                ? scopeLeads.length
                : tab === "Pending"
                  ? scopeLeads.filter((l) =>
                      ["Pending", "New"].includes(l.currentStatus),
                    ).length
                  : tab === "In Process"
                    ? scopeLeads.filter((l) =>
                        [
                          "In Process",
                          "Contacted",
                          "Verified",
                          "Follow-up",
                          "Interested",
                        ].includes(l.currentStatus),
                      ).length
                    : tab === "Approved"
                      ? scopeLeads.filter((l) =>
                          [
                            "Approved",
                            "Sanctioned",
                            "Invoice Generated",
                          ].includes(l.currentStatus),
                        ).length
                      : tab === "Disbursed"
                        ? scopeLeads.filter((l) =>
                            ["Disbursed", "Payout Complete"].includes(
                              l.currentStatus,
                            ),
                          ).length
                        : tab === "Rejected"
                          ? scopeLeads.filter((l) =>
                              ["Rejected", "Invoice Rejected"].includes(
                                l.currentStatus,
                              ),
                            ).length
                          : scopeLeads.filter((l) => l.currentStatus === tab).length;
            const isSelected = statusTab === tab;

            return (
              <button
                key={tab}
                onClick={() => {
                  setStatusTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  isSelected
                    ? "bg-brand-royal text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-blue-200"
                      : "bg-slate-200/70 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Leads Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-left text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">CBS Account #</th>
                <th className="py-3.5 px-4">Loan Amount</th>
                <th className="py-3.5 px-4">Invoice / Comm.</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Assigned Officer</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No leads found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-rose-50/35 transition-colors group cursor-pointer"
                    onClick={() => setActiveLeadModal(lead)}
                  >
                    {/* Customer */}
                    <td className="py-4 px-4 font-semibold text-slate-800 align-top">
                      <div className="font-bold text-[13px] text-brand-navy group-hover:text-brand-royal transition-colors">
                        {lead.customerName}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 break-all">
                        <span className="font-mono text-slate-400">
                          {formatLeadUid(lead.id)}
                        </span>
                        <span>•</span>
                        <span>{lead.loanCategory}</span>
                        <span>•</span>
                        <span>{lead.city}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {lead.source === "Partner Referral" ||
                        lead.partnerName ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold">
                            DSA: {lead.partnerName || "Partner"}
                          </span>
                        ) : lead.source === "Employee Sourced" ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                            Officer:{" "}
                            {lead.submittedBy ||
                              lead.assignedEmployee ||
                              "Internal Desk"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold">
                            Direct Web
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Lead Type */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          lead.leadType === "SBI"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {lead.leadType}
                      </span>
                    </td>

                    {/* CBS Account */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      {lead.cbsAccountNo}
                    </td>

                    {/* Loan Amount */}
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-sm text-brand-navy block">
                        {formatINR(lead.loanAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatLakhCrore(lead.loanAmount)}
                      </span>
                    </td>

                    {/* Invoice Amount */}
                    <td className="py-3.5 px-4 font-bold text-slate-700">
                      {formatINR(lead.invoiceAmount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={lead.currentStatus} />
                    </td>

                    {/* Assigned Employee */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {lead.assignedEmployee?.slice(0, 2).toUpperCase() ||
                            "UN"}
                        </div>
                        <span className="font-medium text-slate-800">
                          {lead.assignedEmployee || "Unassigned"}
                        </span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {lead.createdDate}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setActiveLeadModal(lead)}
                          title="View Full Case Modal"
                          className="p-1.5 text-slate-500 hover:text-brand-royal hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setReassignTargetLead(lead)}
                          title="Reassign Officer"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openPartnerAssignment(lead)}
                          title="Assign to Partner"
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Building className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-3">
          <span>
            Showing{" "}
            <strong className="text-slate-800">
              {filteredLeads.length ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </strong>{" "}
            to{" "}
            <strong className="text-slate-800">
              {Math.min(currentPage * itemsPerPage, filteredLeads.length)}
            </strong>{" "}
            of{" "}
            <strong className="text-slate-800">{filteredLeads.length}</strong>{" "}
            total leads
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-brand-navy">
                Add New CRM Lead
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateLead}
              className="space-y-4 pt-4 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={newLeadForm.customerName}
                  onChange={(e) =>
                    setNewLeadForm({
                      ...newLeadForm,
                      customerName: e.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 XXXXX"
                    value={newLeadForm.phone}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, phone: e.target.value })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="ramesh@example.com"
                    value={newLeadForm.email}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, email: e.target.value })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-brand-royal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Lead Type
                  </label>
                  <select
                    value={newLeadForm.leadType}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        leadType: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                  >
                    <option value="SBI">SBI processing route</option>
                    <option value="Non-SBI">Other institution route</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Loan Category
                  </label>
                  <select
                    value={newLeadForm.loanCategory}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        loanCategory: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                  >
                    <option value="Home Loan">Home Loan</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Business Loan">Business Loan</option>
                    <option value="Vehicle Loan">Vehicle Loan</option>
                    <option value="Loan Against Property">
                      Loan Against Property
                    </option>
                    <option value="Education Loan">Education Loan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Required Loan Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={newLeadForm.loanAmount}
                    onChange={(e) =>
                      setNewLeadForm({
                        ...newLeadForm,
                        loanAmount: Number(e.target.value),
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-brand-navy"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newLeadForm.city}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, city: e.target.value })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Assign Loan Officer
                </label>
                <select
                  value={newLeadForm.assignedEmployeeId}
                  onChange={(e) =>
                    setNewLeadForm({
                      ...newLeadForm,
                      assignedEmployeeId: e.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-royal hover:bg-brand-navy text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Officer Quick Modal */}
      {reassignTargetLead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">
              Reassign Officer: {reassignTargetLead.customerName}
            </h4>
            <p className="text-xs text-slate-500">
              Select which loan officer will manage this file:
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleReassign(emp.id)}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-brand-royal text-xs transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {emp.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {emp.role}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-brand-royal">
                    Select
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setReassignTargetLead(null)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {partnerAssignmentTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={handlePartnerAssignment} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Assign lead to partner</h4>
                <p className="mt-1 text-xs text-slate-500">{partnerAssignmentTarget.customerName} · {formatLeadUid(partnerAssignmentTarget.leadCode || partnerAssignmentTarget.id)}</p>
              </div>
              <button type="button" onClick={() => setPartnerAssignmentTarget(null)} className="text-slate-400 hover:text-slate-700" aria-label="Close partner assignment"><X className="w-5 h-5" /></button>
            </div>
            {partnerAssignmentTarget.currentStatus !== "Verified" && <p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Partner assignment is locked until all required lead documents are approved and the lead is verified. Current status: {partnerAssignmentTarget.currentStatus || "Pending"}.</p>}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5" htmlFor="lead-partner-select">Eligible partner</label>
              <select id="lead-partner-select" required value={partnerCode} onChange={(event) => setPartnerCode(event.target.value)} disabled={partnerAssignmentTarget.currentStatus !== "Verified" || partnerAssigning} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100">
                <option value="">Select an approved active partner</option>
                {eligiblePartners.map((partner) => <option key={partner.partnerCode} value={partner.partnerCode}>{partner.companyName || partner.name} ({partner.partnerCode})</option>)}
              </select>
              {!eligiblePartners.length && <p className="mt-1 text-[11px] text-slate-500">No eligible partners are currently available. Partner activation and bank-detail approval must be complete.</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5" htmlFor="partner-assignment-note">Assignment note (optional)</label>
              <textarea id="partner-assignment-note" rows="3" maxLength="1000" value={assignmentNote} onChange={(event) => setAssignmentNote(event.target.value)} disabled={partnerAssignmentTarget.currentStatus !== "Verified" || partnerAssigning} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100" placeholder="Add an internal assignment note" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPartnerAssignmentTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button type="submit" disabled={partnerAssigning || partnerAssignmentTarget.currentStatus !== "Verified" || !partnerCode} className="rounded-lg bg-brand-royal px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{partnerAssigning ? "Assigning..." : "Assign Partner"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
