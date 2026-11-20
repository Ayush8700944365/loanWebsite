import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { formatINR } from "../../utils/formatters";
import { formatLeadUid } from "../../utils/leadIds";
import { invoicesApi } from "../../services/api";
import { jsPDF } from "jspdf";
import { StatusBadge } from "../../components/common/StatusBadge";
import {
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  LifeBuoy,
  Plus,
  X,
  CreditCard,
  Building,
} from "lucide-react";
import { Link } from "react-router-dom";

export const AdminInvoicesPage = () => {
  const { leads, payouts = [], showToast } = useApp();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await invoicesApi.getAll();

        if (!response?.success) {
          throw new Error(response?.message || "Failed to fetch invoices");
        }

        setInvoices(response.invoices || []);
      } catch (error) {
        console.error("Fetch invoices error:", error);
        showToast(error.message || "Unable to load invoices", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewInvoiceModal, setViewInvoiceModal] = useState(null);
  const [selectedPayoutId, setSelectedPayoutId] = useState("");
  const [reconciliationNote, setReconciliationNote] = useState("");

  const [newInvForm, setNewInvForm] = useState({
    customerName: "",
    leadId: "",
    loanCategory: "",
    leadType: "",
    loanAmount: "",
    invoiceAmount: "",
    annexureNumber: "",
    annexureDate: "",
    bankName: "",
    partnerName: "",
    gstNumber: "",
  });

  const invoiceStatuses = [
    "ALL",
    "Pending",
    "Invoice Uploaded",
    "Approved",
    "Payment Initiated",
    "Rejected",
    "Payment Failed",
    "Paid",
  ];

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "ALL" && inv.invoiceStatus !== statusFilter)
      return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchInv = inv.invoiceNumber?.toLowerCase().includes(q);
      const matchCust = inv.customerName?.toLowerCase().includes(q);
      const matchAnx = inv.annexureNumber?.toLowerCase().includes(q);
      const matchUtr = inv.utr?.toLowerCase().includes(q);
      if (!matchInv && !matchCust && !matchAnx && !matchUtr) return false;
    }
    return true;
  });

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!newInvForm.leadId || !newInvForm.invoiceAmount) {
      showToast("Customer name and invoice amount are required", "error");
      return;
    }

    try {
      const response = await invoicesApi.create({
        leadId: newInvForm.leadId,
        invoiceAmount: Number(newInvForm.invoiceAmount),
        annexureNumber: newInvForm.annexureNumber,
        annexureDate: newInvForm.annexureDate || null,
        bankName: newInvForm.bankName,
        gstNumber: newInvForm.gstNumber,
      });

      if (!response?.success || !response?.invoice) {
        throw new Error(response?.message || "Invoice creation failed");
      }

      setInvoices((prev) => [response.invoice, ...prev]);

      showToast(response.message || "Invoice created successfully", "success");

      setShowAddModal(false);

      setNewInvForm({
        customerName: "",
        leadId: "",
        loanCategory: "",
        leadType: "",
        loanAmount: "",
        invoiceAmount: "",
        annexureNumber: "",
        annexureDate: "",
        bankName: "",
        partnerName: "",
        gstNumber: "",
      });
    } catch (error) {
      console.error("Create invoice error:", error);
      showToast(error.message || "Unable to create invoice", "error");
    }
  };
  const handleDownloadInvoice = (invoice) => {
    const doc = new jsPDF();

    const formatDate = (date) => {
      if (!date) return "—";
      const parsed = new Date(date);
      return Number.isNaN(parsed.getTime())
        ? "—"
        : parsed.toLocaleDateString("en-IN");
    };

    const formatAmount = (amount) =>
      `INR ${Number(amount || 0).toLocaleString("en-IN")}`;

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("REALCRED", 15, 17);

    doc.setFontSize(9);
    doc.text("TECHNOLOGY PRIVATE LIMITED", 15, 24);

    doc.setFontSize(16);
    doc.text("INVOICE", 195, 19, { align: "right" });

    // Invoice details
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.text("Invoice Information", 15, 52);

    const details = [
      ["Invoice Number", invoice.invoiceNumber],
      ["Invoice Date", formatDate(invoice.invoiceDate)],
      ["Invoice Status", invoice.invoiceStatus],
      ["Customer Name", invoice.customerName],
      ["Lead Reference", formatLeadUid(invoice.leadId)],
      ["Loan Category", invoice.loanCategory],
      ["Lead Type", invoice.leadType],
      ["Loan Amount", formatAmount(invoice.loanAmount)],
      ["Bank Name", invoice.bankName],
      ["Partner Name", invoice.partnerName],
      ["Annexure Number", invoice.annexureNumber],
      ["Annexure Date", formatDate(invoice.annexureDate)],
      ["GST Number", invoice.gstNumber],
      ["UTR Reference", invoice.utr],
    ];

    let y = 65;

    details.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${label}:`, 15, y);

      doc.setFont("helvetica", "normal");
      doc.text(String(value || "—"), 75, y);

      y += 10;
    });

    y += 5;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, y, 180, 22, 3, 3, "F");

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("TOTAL INVOICE AMOUNT", 22, y + 14);

    doc.setTextColor(37, 99, 235);
    doc.text(formatAmount(invoice.invoiceAmount), 188, y + 14, {
      align: "right",
    });

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Generated electronically by RealCred CRM.", 105, 285, {
      align: "center",
    });

    doc.save(`${invoice.invoiceNumber || "Invoice"}.pdf`);
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-royal">Finance operations</p>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Commission Invoices & Payout Annexures
          </h1>
          <p className="text-sm leading-6 text-slate-500 mt-1.5">
            Reconcile bank annexures, UTR payments, GST invoices and partner
            payout authorizations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 rounded-xl bg-brand-royal hover:brightness-95 text-white text-sm font-bold shadow-sm flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Invoice</span>
        </button>
      </div>

      {/* Filter and Status Tabs */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by Invoice #, Customer, Annexure or UTR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-3 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-royal/20"
            />
          </div>

          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            Showing invoices
            <strong className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-800">
              {filteredInvoices.length}
            </strong>
          </span>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-4 pb-1 text-xs">
          {invoiceStatuses.map((st) => {
            const count =
              st === "ALL"
                ? invoices.length
                : invoices.filter((i) => i.invoiceStatus === st).length;
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-brand-royal text-white shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                <span>{st}</span>
                <span
                  className={`min-w-5 rounded-full px-1.5 py-0.5 text-[10px] text-center ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Invoice # & Date</th>
                <th className="py-3.5 px-4">Customer & Lead</th>
                <th className="py-3.5 px-4">Bank & Scheme</th>
                <th className="py-3.5 px-4">Invoice Amount</th>
                <th className="py-3.5 px-4">Annexure # & Date</th>
                <th className="py-3.5 px-4">Banking UTR</th>
                <th className="py-3.5 px-4">Invoice Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    No invoices available.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.invoiceNumber}
                    className="hover:bg-rose-50/35 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      <div>{inv.invoiceNumber}</div>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {inv.invoiceDate}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-800">
                      <div>{inv.customerName}</div>
                      <span className="mt-1 inline-flex rounded-md bg-rose-50 px-2 py-1 text-[10px] text-brand-royal font-mono">
                        {formatLeadUid(inv.leadId)}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-600">
                      <div className="font-medium text-slate-800">
                        {inv.bankName}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {inv.leadType} • {inv.loanCategory}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-extrabold text-sm text-slate-900 whitespace-nowrap">
                      {formatINR(inv.invoiceAmount)}
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-700">
                      <div>{inv.annexureNumber}</div>
                      <span className="text-[10px] text-slate-400">
                        {inv.annexureDate}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-xs">
                      {inv.utr !== "—" && inv.utr !== "PENDING-UTR" ? (
                        <span className="text-emerald-700 font-bold">
                          {inv.utr}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">
                          Pending Bank Transfer
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge status={inv.invoiceStatus} />
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => { setViewInvoiceModal(inv); setSelectedPayoutId(inv.payoutId || ""); setReconciliationNote(""); }}
                          title="View Invoice Modal"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-brand-royal"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          title="Download Invoice PDF"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Invoice Modal */}
      {viewInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-brand-navy text-base">
                  Invoice Details: {viewInvoiceModal.invoiceNumber}
                </h3>
                <span className="text-xs text-slate-400">
                  Issued on {viewInvoiceModal.invoiceDate}
                </span>
              </div>
              <button
                onClick={() => setViewInvoiceModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">
                  Customer Name
                </span>
                <span className="font-bold text-slate-800">
                  {viewInvoiceModal.customerName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">
                  Lead Reference
                </span>
                <span className="font-mono font-bold text-brand-royal">
                  {formatLeadUid(viewInvoiceModal.leadId)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">
                  Invoice Amount
                </span>
                <span className="font-extrabold text-brand-navy text-base">
                  {formatINR(viewInvoiceModal.invoiceAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">
                  Invoice Status
                </span>
                <StatusBadge status={viewInvoiceModal.invoiceStatus} />
              </div>
              <div><span className="text-slate-400 block mb-0.5">Reconciliation</span><strong className="capitalize">{String(viewInvoiceModal.reconciliationStatus || "unlinked").replaceAll("_", " ")}</strong></div>
              <div>
                <span className="text-slate-400 block mb-0.5">
                  Bank Annexure #
                </span>
                <span className="font-mono text-slate-800">
                  {viewInvoiceModal.annexureNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">
                  NEFT / UTR Ref
                </span>
                <span className="font-mono text-slate-800">
                  {viewInvoiceModal.utr}
                </span>
              </div>
            </div>

            <section className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <h3 className="font-bold text-slate-800">Link and reconcile a payout</h3>
              <p className="text-slate-600">Invoice and payout remain separate records. Reconciliation compares the invoice total with the payout net amount and does not change invoice payment status.</p>
              <select value={selectedPayoutId || viewInvoiceModal.payoutId || ""} onChange={(event) => setSelectedPayoutId(event.target.value)} className="w-full rounded-lg border bg-white p-2"><option value="">Choose payout for this lead</option>{payouts.filter((payout) => payout.leadId === viewInvoiceModal.leadId && (!viewInvoiceModal.partnerCode || payout.partnerId === viewInvoiceModal.partnerCode)).map((payout) => <option key={payout._id} value={payout._id}>{payout.paymentNumber} · {payout.status} · {formatINR(payout.totalAmount)}</option>)}</select>
              <input value={reconciliationNote} onChange={(event) => setReconciliationNote(event.target.value)} maxLength={500} placeholder="Admin note (required to finalize a match)" className="w-full rounded-lg border bg-white p-2" />
              {viewInvoiceModal.reconciliationSnapshot && <p>Invoice {formatINR(viewInvoiceModal.reconciliationSnapshot.invoiceAmount)} · payout {formatINR(viewInvoiceModal.reconciliationSnapshot.payoutAmount)} · difference {formatINR(viewInvoiceModal.reconciliationSnapshot.difference)}</p>}
              <div className="flex flex-wrap gap-2"><button type="button" disabled={!selectedPayoutId && !viewInvoiceModal.payoutId} onClick={async () => { try { const result = await invoicesApi.reconcile(viewInvoiceModal._id, selectedPayoutId || viewInvoiceModal.payoutId, reconciliationNote, false); setViewInvoiceModal(result.invoice); setInvoices((current) => current.map((item) => item._id === result.invoice._id ? result.invoice : item)); showToast(result.message, "success"); } catch (error) { showToast(error.message || "Reconciliation failed", "error"); } }} className="rounded-lg border bg-white px-3 py-2 font-bold disabled:opacity-50">Compare amounts</button><button type="button" disabled={!selectedPayoutId && !viewInvoiceModal.payoutId} onClick={async () => { try { const result = await invoicesApi.reconcile(viewInvoiceModal._id, selectedPayoutId || viewInvoiceModal.payoutId, reconciliationNote, true); setViewInvoiceModal(result.invoice); setInvoices((current) => current.map((item) => item._id === result.invoice._id ? result.invoice : item)); showToast(result.message, "success"); } catch (error) { showToast(error.message || "Could not finalize reconciliation", "error"); } }} className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white disabled:opacity-50">Finalize reconciliation</button></div>
            </section>

            {/* Quick Status Override */}
            <div className="pt-2 text-xs">
              <label className="font-bold text-slate-700 block mb-1">
                Update Status:
              </label>
              <div className="flex gap-2">
                <select
                  value={viewInvoiceModal.invoiceStatus}
                  onChange={async (e) => {
                    const newStatus = e.target.value;

                    try {
                      const response = await invoicesApi.updateStatus(
                        viewInvoiceModal._id,
                        newStatus,
                      );

                      if (!response?.success) {
                        throw new Error(
                          response?.message || "Status update failed",
                        );
                      }

                      setInvoices((prev) =>
                        prev.map((inv) =>
                          inv._id === viewInvoiceModal._id
                            ? { ...inv, invoiceStatus: newStatus }
                            : inv,
                        ),
                      );

                      setViewInvoiceModal((prev) => ({
                        ...prev,
                        invoiceStatus: newStatus,
                      }));

                      showToast(
                        "Invoice status updated successfully",
                        "success",
                      );
                    } catch (error) {
                      console.error("Invoice status update error:", error);
                      showToast(
                        error.message || "Unable to update invoice status",
                        "error",
                      );
                    }
                  }}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                >
                  {invoiceStatuses
                    .filter((s) => s !== "ALL")
                    .map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <Link
                to="/admin/tickets"
                className="text-xs font-bold text-brand-royal flex items-center space-x-1"
              >
                <LifeBuoy className="w-4 h-4" />
                <span>Open Support Ticket</span>
              </Link>
              <button
                onClick={() => setViewInvoiceModal(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-brand-navy text-base">
                Register Commission Invoice
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Select Existing Lead *
                </label>

                <select
                  required
                  value={newInvForm.leadId}
                  onChange={(e) => {
                    const selectedLead = leads.find(
                      (lead) => lead.leadCode === e.target.value,
                    );

                    if (!selectedLead) return;

                    setNewInvForm((prev) => ({
                      ...prev,
                      customerName: selectedLead.customerName || "",
                      leadId: selectedLead.leadCode || "",
                      loanCategory: selectedLead.loanCategory || "",
                      leadType: selectedLead.leadType || "",
                      loanAmount: selectedLead.loanAmount ?? "",
                      partnerName: selectedLead.partnerName || "",
                    }));
                  }}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white"
                >
                  <option value="">Select a customer</option>

                  {leads.map((lead) => (
                    <option
                      key={lead._id || lead.leadCode}
                      value={lead.leadCode}
                    >
                      {lead.customerName} — {formatLeadUid(lead.leadCode)}
                    </option>
                  ))}
                </select>

                {leads.length === 0 && (
                  <p className="text-amber-600 text-[11px] mt-1">
                    No existing leads available.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Invoice Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newInvForm.invoiceAmount}
                    onChange={(e) =>
                      setNewInvForm({
                        ...newInvForm,
                        invoiceAmount: Number(e.target.value),
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={newInvForm.bankName}
                    onChange={(e) =>
                      setNewInvForm({ ...newInvForm, bankName: e.target.value })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Annexure Number
                  </label>
                  <input
                    type="text"
                    value={newInvForm.annexureNumber}
                    onChange={(e) =>
                      setNewInvForm({
                        ...newInvForm,
                        annexureNumber: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Annexure Date
                  </label>
                  <input
                    type="date"
                    value={newInvForm.annexureDate}
                    onChange={(e) =>
                      setNewInvForm({
                        ...newInvForm,
                        annexureDate: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-royal hover:bg-brand-navy text-white font-bold rounded-xl shadow-xs"
                >
                  Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
