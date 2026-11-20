import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LifeBuoy, Plus, Send, X, MessageSquare } from "lucide-react";
import { ticketsApi } from "../../services/api";
import { formatLeadUid } from "../../utils/leadIds";

export const SupportTicketsPage = () => {
  const {
    tickets = [],
    leads = [],
    addTicket,
    addTicketMessage,
    showToast,
    ticketError,
    apiLoading,
    refreshFromApi,
  } = useApp();

  const { user, role } = useAuth();

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketPage, setTicketPage] = useState(1);
  const ticketPageSize = 8;
  const ticketPageCount = Math.max(1, Math.ceil(tickets.length / ticketPageSize));
  const visibleTickets = tickets.slice((ticketPage - 1) * ticketPageSize, ticketPage * ticketPageSize);

  useEffect(() => {
    setTicketPage((page) => Math.min(page, ticketPageCount));
  }, [ticketPageCount]);

  const [newForm, setNewForm] = useState({
    title: "",
    leadCode: "",
    subcategory: "",
    priority: "Medium",
    description: "",
  });

  // Identify the authenticated user's leads using database ownership codes.
  const myLeads = useMemo(() => {
    if (!user) return [];

    if (role === "partner" && user.partnerCode) {
      return leads.filter((lead) => lead.partnerId === user.partnerCode);
    }

    if (role === "employee" && user.employeeCode) {
      return leads.filter(
        (lead) => lead.assignedEmployeeId === user.employeeCode,
      );
    }

    return [];
  }, [leads, user, role]);

  // Select the first available ticket when API data loads.
  useEffect(() => {
    if (!tickets.length) {
      setSelectedTicketId(null);
      return;
    }

    const selectedExists = tickets.some(
      (ticket) =>
        (ticket.ticketId || ticket._id || ticket.id) === selectedTicketId,
    );

    if (!selectedExists) {
      setSelectedTicketId(
        tickets[0].ticketId || tickets[0]._id || tickets[0].id,
      );
    }
  }, [tickets, selectedTicketId]);

  // Always read the selected ticket from the latest context state.
  const selectedTicket = useMemo(
    () =>
      tickets.find(
        (ticket) =>
          (ticket.ticketId || ticket._id || ticket.id) === selectedTicketId,
      ) || null,
    [tickets, selectedTicketId],
  );

  const isPartner = role === "partner";

  const theme = isPartner
    ? {
        title: "Partner Support Desk",
        subtitle:
          "Raise support requests and track responses from the RealCred team.",
        accent: "amber",
        button:
          "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800",
        selected: "bg-amber-50/70 border-amber-500",
        message: "bg-amber-600 text-white",
        focus: "focus:ring-amber-500",
      }
    : {
        title: "Employee Support Desk",
        subtitle:
          "Raise operational queries and track responses from the RealCred team.",
        accent: "emerald",
        button: "bg-emerald-600 hover:bg-emerald-700",
        selected: "bg-emerald-50/70 border-emerald-500",
        message: "bg-emerald-600 text-white",
        focus: "focus:ring-emerald-500",
      };

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!newForm.title.trim() || !newForm.description.trim()) {
      showToast?.("Please enter the subject and description.", "error");
      return;
    }

    const selectedLead = myLeads.find(
      (lead) => lead.leadCode === newForm.leadCode,
    );

    if (newForm.leadCode && !selectedLead) {
      showToast?.("Please select a valid lead.", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: newForm.title.trim(),
        ticketType: selectedLead ? "Lead" : "Other",
        priority: newForm.priority,
        subcategory: newForm.subcategory.trim(),
        description: newForm.description.trim(),
        ...(selectedLead
          ? {
              leadId: selectedLead.leadCode,
              leadType: selectedLead.leadType,
            }
          : {}),
      };

      const createdTicket = await addTicket(payload);

      if (createdTicket) {
        setSelectedTicketId(
          createdTicket.ticketId || createdTicket._id || createdTicket.id,
        );
      }

      setNewForm({
        title: "",
        leadCode: "",
        subcategory: "",
        priority: "Medium",
        description: "",
      });

      setShowNewModal(false);
    } catch (error) {
      showToast?.(error.message || "Unable to create ticket.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (event) => {
    event.preventDefault();

    if (!replyText.trim() || !selectedTicket || submitting) return;

    const message = replyText.trim();

    setSubmitting(true);

    try {
      await addTicketMessage(selectedTicket.ticketId, message);
      setReplyText("");
    } catch (error) {
      showToast?.(error.message || "Unable to send reply.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInternalNote = async (event) => {
    event.preventDefault();
    if (!selectedTicket || !internalNote.trim() || submitting) return;
    setSubmitting(true);
    try {
      await ticketsApi.addInternalNote(selectedTicket._id, internalNote.trim());
      setInternalNote("");
      await refreshFromApi();
    } catch (error) {
      showToast?.(error.message || "Unable to save follow-up note.", "error");
    } finally { setSubmitting(false); }
  };

  const handleCallbackStatus = async (event) => {
    if (!selectedTicket) return;
    setSubmitting(true);
    try {
      await ticketsApi.updateStatus(selectedTicket._id, event.target.value);
      await refreshFromApi();
    } catch (error) {
      showToast?.(error.message || "Unable to update callback status.", "error");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-brand-navy" />
            <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
              {theme.title}
            </h1>
          </div>

          <p className="text-xs text-slate-500 mt-1">{theme.subtitle}</p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-2 self-start ${theme.button}`}
        >
          <Plus className="w-4 h-4" />
          Open Ticket
        </button>
      </div>

      {ticketError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"><span>{ticketError}</span><button type="button" onClick={refreshFromApi} disabled={apiLoading} className="rounded-lg border border-red-300 px-3 py-1.5 font-bold disabled:opacity-60">{apiLoading ? "Retrying..." : "Retry"}</button></div>}

      {/* Ticket List and Conversation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-premium space-y-3">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="font-bold text-xs text-brand-navy">
              My Support Tickets
            </h3>

            <span className="text-[10px] font-bold text-slate-400">
              {tickets.length} Total
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="w-9 h-9 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-600">No tickets yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Open a ticket to contact the RealCred support team.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleTickets.map((ticket) => {
                const ticketKey = ticket.ticketId || ticket._id || ticket.id;

                return (
                  <button
                    type="button"
                    key={ticketKey}
                    onClick={() => setSelectedTicketId(ticketKey)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      selectedTicketId === ticketKey
                        ? theme.selected
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        {ticket.ticketId}
                      </span>
                      <StatusBadge status={ticket.status} size="sm" />
                    </div>

                    <h4 className="font-bold text-xs text-brand-navy line-clamp-1">
                      {ticket.title}
                    </h4>

                    <div className="flex justify-between gap-2 text-[11px] text-slate-400 mt-2">
                      <span className="truncate">
                        {ticket.customerName ||
                          ticket.subcategory ||
                          "Support Request"}
                      </span>
                      <span className="shrink-0">
                        {formatDate(ticket.updatedAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {tickets.length > ticketPageSize && <div className="flex items-center justify-between border-t pt-3 text-xs"><span className="text-slate-500">Page {ticketPage} of {ticketPageCount}</span><div className="flex gap-2"><button type="button" disabled={ticketPage <= 1} onClick={() => setTicketPage((page) => Math.max(1, page - 1))} className="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={ticketPage >= ticketPageCount} onClick={() => setTicketPage((page) => Math.min(ticketPageCount, page + 1))} className="rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></div></div>}
        </div>

        {/* Conversation Panel */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-premium flex flex-col min-h-[500px]">
          {selectedTicket ? (
            <>
              <div className="pb-3 border-b">
                <div className="flex justify-between items-center mb-1 gap-2">
                  <span className="font-mono text-xs font-bold text-slate-600">
                    {selectedTicket.ticketId}
                  </span>
                  <StatusBadge status={selectedTicket.status} />
                  {selectedTicket.ticketType === "Callback" && role === "employee" && <select aria-label="Update callback status" value={selectedTicket.status} onChange={handleCallbackStatus} disabled={submitting} className="rounded-lg border px-2 py-1 text-xs"><option>Open</option><option>In Progress</option><option>Resolved</option></select>}
                </div>

                <h3 className="text-base font-bold text-brand-navy">
                  {selectedTicket.title}
                </h3>

                {selectedTicket.ticketType === "Callback" && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-slate-700"><p><strong>Callback details:</strong> {selectedTicket.customerPhone}{selectedTicket.customerEmail ? ` · ${selectedTicket.customerEmail}` : ""}</p><p className="mt-1">{selectedTicket.loanCategory || "Loan interest not supplied"}{selectedTicket.city ? ` · ${selectedTicket.city}` : ""}{selectedTicket.loanAmount ? ` · ₹${Number(selectedTicket.loanAmount).toLocaleString("en-IN")}` : ""}</p><p className="mt-1">Assigned to: {selectedTicket.assignedEmployeeName || "Awaiting Admin assignment"}</p></div>}

                <p className="text-xs text-slate-500 mt-1">
                  {selectedTicket.leadId
                    ? `Lead: ${formatLeadUid(selectedTicket.leadId)}`
                    : selectedTicket.subcategory || "General Support"}
                  {selectedTicket.customerName
                    ? ` • ${selectedTicket.customerName}`
                    : ""}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 max-h-[350px] py-4 pr-1">
                {(selectedTicket.messages || []).map((message) => (
                  <div
                    key={message._id || message.id}
                    className={`flex flex-col ${
                      message.isStaff ? "items-start" : "items-end"
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 mb-0.5">
                      {message.sender} •{" "}
                      {formatDate(message.createdAt || message.timestamp)}
                    </div>

                    <div
                      className={`p-3 rounded-2xl max-w-md text-xs ${
                        message.isStaff
                          ? "bg-slate-100 text-slate-800"
                          : theme.message
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              {selectedTicket.ticketType === "Callback" && role === "employee" && <section className="border-t pt-3"><h4 className="text-xs font-bold">Internal follow-up notes</h4><div className="mt-2 space-y-1">{(selectedTicket.internalNotes || []).map((note) => <p key={note._id} className="rounded-lg bg-amber-50 p-2 text-xs"><b>{note.author}</b> · {note.text}</p>)}</div><form onSubmit={handleInternalNote} className="mt-2 flex gap-2"><input value={internalNote} onChange={(event) => setInternalNote(event.target.value)} maxLength={2000} placeholder="Record callback or follow-up activity" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs"/><button disabled={submitting || !internalNote.trim()} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Add note</button></form><p className="mt-2 text-[11px] text-slate-500">Use the status control below to record progress and completion.</p></section>}

              {selectedTicket.ticketType !== "Callback" && selectedTicket.status !== "Resolved" ? (
                <form
                  onSubmit={handleReply}
                  className="pt-3 border-t flex gap-2"
                >
                  <input
                    type="text"
                    required
                    placeholder="Type your message to RealCred support..."
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    className={`flex-1 min-w-0 text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 ${theme.focus}`}
                  />

                  <button
                    type="submit"
                    disabled={submitting || !replyText.trim()}
                    className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs disabled:opacity-50 ${theme.button}`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </form>
              ) : selectedTicket.ticketType !== "Callback" ? (
                <div className="pt-3 border-t text-center text-xs text-slate-500">
                  This ticket has been resolved. Replies are disabled.
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <LifeBuoy className="w-10 h-10 text-slate-300 mb-3" />
              <p className="font-bold text-sm text-slate-600">
                Select a support ticket
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Your ticket conversation will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-brand-navy text-base">
                Raise Support Ticket
              </h3>

              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  placeholder="Enter ticket subject"
                  value={newForm.title}
                  onChange={(event) =>
                    setNewForm({
                      ...newForm,
                      title: event.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Related Lead (Optional)
                </label>

                <select
                  value={newForm.leadCode}
                  onChange={(event) =>
                    setNewForm({
                      ...newForm,
                      leadCode: event.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="">General Support (No Lead)</option>

                  {myLeads.map((lead) => (
                    <option key={lead.leadCode} value={lead.leadCode}>
                      {formatLeadUid(lead.leadCode)} - {lead.customerName}
                    </option>
                  ))}
                </select>

                <p className="text-[10px] text-slate-400 mt-1">
                  Only leads assigned or linked to your account are shown.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Subcategory
                </label>
                <input
                  type="text"
                  placeholder="e.g. Disbursement, Documents, Technical"
                  value={newForm.subcategory}
                  onChange={(event) =>
                    setNewForm({
                      ...newForm,
                      subcategory: event.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Priority
                </label>
                <select
                  value={newForm.priority}
                  onChange={(event) =>
                    setNewForm({
                      ...newForm,
                      priority: event.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Message Description *
                </label>
                <textarea
                  rows="4"
                  required
                  maxLength={5000}
                  placeholder="Describe your issue or request..."
                  value={newForm.description}
                  onChange={(event) =>
                    setNewForm({
                      ...newForm,
                      description: event.target.value,
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl p-3"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-white font-bold rounded-xl shadow-xs disabled:opacity-50 ${theme.button}`}
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
