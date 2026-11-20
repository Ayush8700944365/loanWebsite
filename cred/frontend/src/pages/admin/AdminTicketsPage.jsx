import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LifeBuoy, Plus, Send, X, Clock, MessageSquare, Ticket, PhoneCall, StickyNote } from "lucide-react";
import { ticketsApi } from "../../services/api";
import { formatLeadUid } from "../../utils/leadIds";

const initialTicketForm = {
  title: "",
  ticketType: "Lead",
  leadType: "",
  leadId: "",
  customerName: "",
  subcategory: "",
  priority: "Medium",
  description: "",
};

const formatDate = (date) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const AdminTicketsPage = () => {
  const { tickets, leads, employees, addTicket, addTicketMessage, updateTicketStatus, refreshFromApi, showToast } =
    useApp();

  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState(initialTicketForm);

  // Keep selected ticket synchronized with AppContext API state
  const selectedTicket = useMemo(() => {
    if (!tickets.length) return null;

    return (
      tickets.find(
        (ticket) =>
          (ticket._id || ticket.id || ticket.ticketId) === selectedTicketId,
      ) || tickets[0]
    );
  }, [tickets, selectedTicketId]);

  useEffect(() => {
    if (selectedTicket) {
      setSelectedTicketId(
        selectedTicket._id || selectedTicket.id || selectedTicket.ticketId,
      );
    } else {
      setSelectedTicketId(null);
    }
  }, [selectedTicket]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      return statusFilter === "ALL" || ticket.status === statusFilter;
    });
  }, [tickets, statusFilter]);

  const handleSelectTicket = (ticket) => {
    setSelectedTicketId(ticket._id || ticket.id || ticket.ticketId);
    setReplyText("");
  };

  // Create a new ticket in MongoDB
  const handleCreateTicket = async (e) => {
    e.preventDefault();

    if (!newTicketForm.title.trim() || !newTicketForm.description.trim()) {
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = {
        title: newTicketForm.title.trim(),
        ticketType: newTicketForm.ticketType,
        leadType:
          newTicketForm.ticketType === "Lead" ? newTicketForm.leadType : "",
        leadId: newTicketForm.ticketType === "Lead" ? newTicketForm.leadId : "",
        customerName:
          newTicketForm.ticketType === "Lead" ? newTicketForm.customerName : "",
        subcategory: newTicketForm.subcategory,
        priority: newTicketForm.priority,
        description: newTicketForm.description.trim(),
      };

      const createdTicket = await addTicket(payload);

      if (createdTicket) {
        setSelectedTicketId(
          createdTicket._id || createdTicket.id || createdTicket.ticketId,
        );

        setStatusFilter("ALL");
        setShowNewModal(false);
        setNewTicketForm({ ...initialTicketForm });
      }
    } catch (error) {
      console.error("Create Ticket Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send reply and persist it in MongoDB
  const handleSendReply = async (e) => {
    e.preventDefault();

    const message = replyText.trim();

    if (!message || !selectedTicket || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await addTicketMessage(
        selectedTicket.ticketId || selectedTicket._id || selectedTicket.id,
        message,
      );

      setReplyText("");
    } catch (error) {
      console.error("Send Ticket Reply Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update ticket status in MongoDB
  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;

    if (!selectedTicket || newStatus === selectedTicket.status) return;

    try {
      await updateTicketStatus(
        selectedTicket.ticketId || selectedTicket._id || selectedTicket.id,
        newStatus,
      );
    } catch (error) {
      console.error("Ticket Status Update Error:", error);
    }
  };

  const handleCallbackAssignment = async (employeeCode) => {
    if (!selectedTicket || !employeeCode || assigning) return;
    setAssigning(true);
    try {
      await ticketsApi.assignCallback(selectedTicket._id, employeeCode);
      await refreshFromApi();
    } catch (error) { showToast?.(error.message || "Unable to assign callback request.", "error"); }
    finally { setAssigning(false); }
  };

  const handleInternalNote = async (event) => {
    event.preventDefault();
    if (!selectedTicket || !internalNote.trim() || assigning) return;
    setAssigning(true);
    try {
      await ticketsApi.addInternalNote(selectedTicket._id, internalNote.trim());
      setInternalNote("");
      await refreshFromApi();
    } catch (error) { showToast?.(error.message || "Unable to add internal note.", "error"); }
    finally { setAssigning(false); }
  };

  const handleLeadChange = (e) => {
    const selectedLeadId = e.target.value;

    const selectedLead = leads.find(
      (lead) => String(lead.id || lead.leadCode) === selectedLeadId,
    );

    setNewTicketForm((prev) => ({
      ...prev,
      leadId: selectedLeadId,
      customerName: selectedLead?.customerName || "",
      leadType: selectedLead?.leadType || selectedLead?.bankName || "",
    }));
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-rose-50/60 p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><LifeBuoy className="h-5 w-5"/></span><div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">RealCred support</p>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Support Ticketing & Query Resolution Hub
          </h1>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Resolve partner escalation cases, RACPC sanction queries, and
            invoice GST adjustments.
          </p>
        </div></div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 self-start rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 hover:shadow-md sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Support Ticket</span>
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Tickets Queue */}
        <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-4 lg:col-span-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <span className="flex items-center gap-2 text-sm font-bold text-brand-navy"><Ticket className="h-4 w-4 text-rose-600"/>
              Tickets Queue ({filteredTickets.length})
            </span>

            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 text-[10px]">
              {["ALL", "Open", "In Progress", "Resolved"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
                    statusFilter === status
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[68vh] space-y-2.5 overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <LifeBuoy className="w-10 h-10 mx-auto mb-3 opacity-50" />

                <p className="text-xs font-semibold">
                  No support tickets found
                </p>

                <p className="text-[11px] mt-1">
                  Create a new ticket to get started.
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const ticketKey = ticket._id || ticket.id || ticket.ticketId;

                const isSelected = selectedTicketId === ticketKey;

                return (
                  <button
                    type="button"
                    key={ticketKey}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-blue-200 bg-blue-50/60 shadow-sm ring-1 ring-blue-100"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        {ticket.ticketId}
                      </span>

                      <StatusBadge status={ticket.status} size="sm" />
                    </div>

                    <h4 className="font-bold text-xs text-brand-navy line-clamp-1">
                      {ticket.title}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 gap-2">
                      <span className="font-medium text-slate-700 truncate max-w-[150px]">
                        {ticket.customerName || ticket.createdBy || "N/A"}
                      </span>

                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {formatDate(ticket.updatedAt)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Ticket Conversation */}
        <div className="flex min-h-[620px] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-7">
          {selectedTicket ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Ticket Header */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-700">
                      {selectedTicket.ticketId}
                    </span>

                    <span className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                      {selectedTicket.ticketType} Issue
                    </span>

                    {selectedTicket.leadType && (
                      <span className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-[10px] font-bold text-sky-700">
                        {selectedTicket.leadType}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedTicket.status} />

                    <select
                      value={selectedTicket.status}
                      onChange={handleStatusChange}
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700"
                      aria-label="Update ticket status"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <h3 className="text-lg font-bold tracking-tight text-brand-navy">
                  {selectedTicket.title}
                </h3>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Lead Ref:{" "}
                  <strong className="text-brand-royal font-mono">
                    {selectedTicket.leadId ? formatLeadUid(selectedTicket.leadId) : "N/A"}
                  </strong>{" "}
                  • Customer:{" "}
                  <strong>{selectedTicket.customerName || "N/A"}</strong> •
                  Subcategory:{" "}
                  <strong>{selectedTicket.subcategory || "N/A"}</strong>
                </p>

                <p className="text-[11px] text-slate-400 mt-2">
                  Created by: {selectedTicket.createdBy || "N/A"} • Priority:{" "}
                  {selectedTicket.priority || "Medium"}
                </p>
                {selectedTicket.ticketType === "Callback" && <section className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white p-4 text-xs shadow-sm"><div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><PhoneCall className="h-4 w-4"/></span><div><h4 className="font-bold text-slate-900">Website callback request</h4><p className="text-[10px] text-slate-500">{selectedTicket.ticketId}</p></div></div><div className="grid gap-2 sm:grid-cols-2">{[["Customer", selectedTicket.customerName], ["Phone", selectedTicket.customerPhone], ["Email", selectedTicket.customerEmail], ["Loan category", selectedTicket.loanCategory], ["City", selectedTicket.city], ["Loan amount", selectedTicket.loanAmount ? `₹${Number(selectedTicket.loanAmount).toLocaleString("en-IN")}` : ""]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="rounded-xl border border-blue-100/80 bg-white/80 px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 break-words font-semibold text-slate-800">{value}</p></div>)}</div><p className="mt-3 text-[11px] text-slate-600">Current assignee: <strong className="text-slate-800">{selectedTicket.assignedEmployeeName || "Unassigned"}</strong></p><label className="mt-3 block font-semibold text-slate-700">Assign or reassign to active employee<select disabled={assigning} value={selectedTicket.assignedEmployeeId || ""} onChange={(event) => handleCallbackAssignment(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">Select employee</option>{employees.filter((employee) => employee.status === "Active" || employee.status === "active").map((employee) => <option key={employee.employeeCode || employee.id} value={employee.employeeCode || employee.id}>{employee.name} · {employee.employeeCode || employee.id}</option>)}</select></label>{!!selectedTicket.assignmentHistory?.length && <div className="mt-3 border-t border-blue-100 pt-3"><p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">Assignment activity</p><div className="space-y-1.5">{[...selectedTicket.assignmentHistory].reverse().map((item, index) => <p key={`${item.at}-${index}`} className="flex items-center justify-between gap-2 text-[10px] text-slate-600"><span>Assigned to <strong>{item.employeeName}</strong></span><span className="shrink-0 text-slate-400">{formatDate(item.at)}</span></p>)}</div></div>}</section>}
              </div>

              {selectedTicket.ticketType === "Callback" && <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-slate-600 shadow-sm"><StickyNote className="h-4 w-4"/></span><div><h4 className="text-xs font-bold text-slate-900">Internal notes</h4><p className="text-[10px] text-slate-500">Private callback follow-up</p></div></div><div className="mt-3 max-h-36 space-y-2 overflow-y-auto">{(selectedTicket.internalNotes || []).map((note) => <p key={note._id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5"><b className="text-slate-800">{note.author}</b><span className="mx-1.5 text-slate-300">·</span><span className="text-slate-700">{note.text}</span></p>)}{!selectedTicket.internalNotes?.length && <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs text-slate-500">No internal notes yet.</p>}</div><form onSubmit={handleInternalNote} className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={internalNote} onChange={(event) => setInternalNote(event.target.value)} maxLength={2000} placeholder="Add an internal follow-up note" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"/><button disabled={assigning || !internalNote.trim()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">Add note</button></form></section>}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 py-3 max-h-[380px] pr-2">
                {selectedTicket.messages?.length ? (
                  selectedTicket.messages.map((message) => (
                    <div
                      key={message._id || message.id}
                      className={`flex flex-col ${
                        message.isStaff ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center flex-wrap gap-1.5 mb-1 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-700">
                          {message.sender}
                        </span>

                        <span>•</span>

                        <span>{message.role}</span>

                        <span>•</span>

                        <span className="font-mono">
                          {formatDate(message.createdAt || message.timestamp)}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed break-words ${
                          message.isStaff
                            ? "bg-brand-royal text-white rounded-tr-xs"
                            : "bg-slate-100 text-slate-800 rounded-tl-xs"
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No messages available.</p>
                  </div>
                )}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== "Resolved" && selectedTicket.ticketType !== "Callback" && (
                <form
                  onSubmit={handleSendReply}
                  className="pt-3 border-t border-slate-100 flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Type an official response or update..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="flex-1 min-w-0 text-xs border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-royal disabled:bg-slate-100"
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting || !replyText.trim()}
                    className="px-5 py-2.5 bg-brand-navy hover:bg-brand-royal disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? "Sending..." : "Reply"}</span>
                  </button>
                </form>
              )}

              {selectedTicket.status === "Resolved" && selectedTicket.ticketType !== "Callback" && (
                <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                  This ticket is resolved. Change its status to reopen replies.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16 space-y-2">
              <LifeBuoy className="w-12 h-12" />

              <p className="text-xs">
                No ticket selected. Create a ticket or select one from the
                queue.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-navy text-base">
                Create Support Ticket
              </h3>

              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateTicket}
              className="space-y-4 pt-4 text-xs"
            >
              {/* Title */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Ticket Subject / Title *
                </label>

                <input
                  type="text"
                  required
                  maxLength={150}
                  placeholder="Enter ticket subject"
                  value={newTicketForm.title}
                  onChange={(e) =>
                    setNewTicketForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Ticket Type
                  </label>

                  <select
                    value={newTicketForm.ticketType}
                    onChange={(e) => {
                      setNewTicketForm((prev) => ({
                        ...prev,
                        ticketType: e.target.value,
                        leadId: "",
                        leadType: "",
                        customerName: "",
                      }));
                    }}
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                  >
                    <option value="Lead">Lead Processing</option>
                    <option value="Invoice">Invoice / Payout</option>
                    <option value="Other">Other Operational</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Priority
                  </label>

                  <select
                    value={newTicketForm.priority}
                    onChange={(e) =>
                      setNewTicketForm((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Lead Fields */}
              {newTicketForm.ticketType === "Lead" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Lead Type
                      </label>

                      <input
                        type="text"
                        value={newTicketForm.leadType}
                        readOnly
                        placeholder="Auto-filled from lead"
                        className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Link to Lead *
                      </label>

                      <select
                        required
                        value={newTicketForm.leadId}
                        onChange={handleLeadChange}
                        className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white"
                      >
                        <option value="">Select a lead</option>

                        {leads.map((lead) => (
                          <option
                            key={lead._id || lead.id}
                            value={lead.id || lead.leadCode}
                          >
                            {formatLeadUid(lead.id || lead.leadCode)} -{" "}
                            {lead.customerName || "Unnamed"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Customer Name
                    </label>

                    <input
                      type="text"
                      value={newTicketForm.customerName}
                      readOnly
                      placeholder="Select a lead first"
                      className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-slate-50"
                    />
                  </div>
                </>
              )}

              {/* Subcategory */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Subcategory
                </label>

                <input
                  type="text"
                  value={newTicketForm.subcategory}
                  onChange={(e) =>
                    setNewTicketForm((prev) => ({
                      ...prev,
                      subcategory: e.target.value,
                    }))
                  }
                  placeholder="Enter issue category"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Detailed Description *
                </label>

                <textarea
                  rows="4"
                  required
                  maxLength={5000}
                  placeholder="Describe the issue in detail..."
                  value={newTicketForm.description}
                  onChange={(e) =>
                    setNewTicketForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full text-sm border border-slate-300 rounded-xl p-3"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    setNewTicketForm({ ...initialTicketForm });
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-brand-royal hover:bg-brand-navy text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
