import React, { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { formatINR, formatLakhCrore } from "../../utils/formatters";
import { StatusBadge } from "../../components/common/StatusBadge";
import { formatLeadUid } from "../../utils/leadIds";
import {
  Search,
  Eye,
  PhoneCall,
  X,
  Loader2,
  RefreshCw,
  UserRound,
  Phone,
  Mail,
  MapPin,
  Building2,
  IndianRupee,
} from "lucide-react";

const getLeadCode = (lead) => lead?.leadCode || lead?.id || lead?._id || "";

export const EmployeeLeadsPage = () => {
  const {
    leads = [],
    addLeadNote,
    showToast,
    refreshFromApi,
    apiLoading,
  } = useApp();
  const { user } = useAuth();

  const employeeCode = String(user?.employeeCode || "").trim();
  const employeeName = user?.name || "Employee";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState(null);
  const [callNoteLead, setCallNoteLead] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Backend already scopes GET /leads to the authenticated employee.
  // Keep this UI-side check as an additional guard; never show unassigned leads.
  const myLeads = useMemo(() => {
    if (user?.role !== "employee" || !employeeCode) return [];
    return leads.filter(
      (lead) => String(lead?.assignedEmployeeId || "").trim() === employeeCode,
    );
  }, [leads, user?.role, employeeCode]);

  const filteredLeads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return myLeads.filter((lead) => {
      if (statusFilter !== "ALL" && lead.currentStatus !== statusFilter) {
        return false;
      }
      if (!query) return true;
      return [
        lead.customerName,
        lead.phone,
        getLeadCode(lead),
        lead.email,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [myLeads, searchTerm, statusFilter]);

  const handleRefresh = async () => {
    try {
      await refreshFromApi?.();
    } catch (error) {
      showToast?.(
        error.message || "Unable to refresh assigned leads.",
        "error",
      );
    }
  };

  const handleSaveCallNote = async (event) => {
    event.preventDefault();
    const leadCode = getLeadCode(callNoteLead);
    if (!leadCode || !noteText.trim() || isSavingNote) return;

    setIsSavingNote(true);
    try {
      await addLeadNote(
        leadCode,
        noteText.trim(),
        `${employeeName} (Employee)`,
      );
      setCallNoteLead(null);
      setNoteText("");
    } catch (error) {
      showToast?.(error.message || "Unable to save call note.", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  const statuses = [
    "ALL",
    "New",
    "Pending",
    "Contacted",
    "In Process",
    "Interested",
    "Verified",
    "Follow-up",
    "Approved",
    "Sanctioned",
    "Disbursed",
    "Rejected",
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            My Assigned Loan Portfolio
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Leads assigned to you by the admin. Your portfolio is synced with
            the CRM database.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl">
            Employee: {employeeName}
            {employeeCode ? ` (${employeeCode})` : ""}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={Boolean(apiLoading)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 disabled:opacity-60"
          >
            {apiLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name, phone or lead ID..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-wrap gap-1 text-xs w-full sm:w-auto">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${statusFilter === status ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Applicant Case</th>
                <th className="py-3.5 px-4">Lender / Facility</th>
                <th className="py-3.5 px-4">Loan Amount</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4">Lead Source</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apiLoading && leads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading assigned leads...
                  </td>
                </tr>
              ) : !employeeCode ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-rose-500">
                    Employee code is missing from your authenticated profile.
                    Please contact admin.
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No admin-assigned leads found
                    {searchTerm ? " matching your search" : ""}.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const leadCode = getLeadCode(lead);
                  return (
                    <tr
                      key={leadCode || lead._id}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-brand-navy">
                          {lead.customerName || "—"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatLeadUid(leadCode)} · {lead.phone || "No phone"} ·{" "}
                          {lead.city || "—"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {lead.loanCategory || "—"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {lead.preferredBank || lead.leadType || "—"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-sm text-brand-navy block">
                          {formatINR(Number(lead.loanAmount) || 0)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatLakhCrore(Number(lead.loanAmount) || 0)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={lead.currentStatus || "New"}
                          size="sm"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 font-medium">
                          {lead.source || "Website"}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {lead.createdDate ||
                            (lead.createdAt
                              ? new Date(lead.createdAt).toLocaleDateString(
                                  "en-IN",
                                )
                              : "")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setCallNoteLead(lead)}
                            title="Add call note"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            title="View lead details"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {callNoteLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-brand-navy text-sm">
                Log Call · {callNoteLead.customerName}
              </h3>
              <button
                type="button"
                onClick={() => setCallNoteLead(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleSaveCallNote}
              className="space-y-3 pt-3 text-xs"
            >
              <label className="font-bold text-slate-700 block">
                Call Discussion Notes *
              </label>
              <textarea
                rows="4"
                required
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Enter the actual discussion with the customer..."
                className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCallNoteLead(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl disabled:opacity-60"
                >
                  {isSavingNote ? "Saving..." : "Save Call Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-brand-navy">Lead Details</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {getLeadCode(selectedLead)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 text-xs">
              <div className="flex gap-2">
                <UserRound className="w-4 h-4 text-slate-400" />
                <span>
                  <b>Customer:</b> {selectedLead.customerName || "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>
                  <b>Phone:</b> {selectedLead.phone || "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>
                  <b>Email:</b> {selectedLead.email || "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>
                  <b>City:</b> {selectedLead.city || "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>
                  <b>Loan:</b> {selectedLead.loanCategory || "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <IndianRupee className="w-4 h-4 text-slate-400" />
                <span>
                  <b>Amount:</b>{" "}
                  {formatINR(Number(selectedLead.loanAmount) || 0)}
                </span>
              </div>
              <div>
                <b>Status:</b> {selectedLead.currentStatus || "New"}
              </div>
              <div>
                <b>Source:</b> {selectedLead.source || "Website"}
              </div>
              <div className="sm:col-span-2">
                <b>Property Address:</b> {selectedLead.propertyAddress || "—"}
              </div>
              <div className="sm:col-span-2">
                <b>Assigned Employee:</b>{" "}
                {selectedLead.assignedEmployee || employeeName} (
                {selectedLead.assignedEmployeeId || employeeCode})
              </div>
            </div>
            {selectedLead.notes?.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-800 text-xs mb-2">
                  Notes / History
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedLead.notes.map((note, index) => (
                    <div
                      key={note._id || index}
                      className="bg-slate-50 rounded-xl p-3 text-xs"
                    >
                      <b>{note.author || "User"}</b>
                      <p className="text-slate-600 mt-1">{note.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
