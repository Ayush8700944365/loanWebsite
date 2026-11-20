import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatINR, exportToCSV } from "../../utils/formatters";
import { formatLeadUid } from "../../utils/leadIds";
import { StatusBadge } from "../../components/common/StatusBadge";
import { payoutsApi, partnersApi, leadsApi } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { jsPDF } from "jspdf";
import {
  Download,
  Search,
  Plus,
  X,
  Calculator,
  RefreshCw,
  CreditCard,
  CheckCircle,
  XCircle,
  Wallet,
  Clock3,
  BadgeCheck,
  CircleAlert,
  Receipt,
} from "lucide-react";

const payoutStatusActions = (status) => {
  const actions = {
    Pending: [
      ["Approve commission", "Approved", "success"],
      ["Reject commission", "Rejected", "danger"],
      ["Place on hold", "On Hold", "warning"],
      ["Request correction", "Correction Requested", "warning"],
    ],
    Approved: [
      ["Initiate payment", "Payment Initiated", "primary"],
      ["Place on hold", "On Hold", "warning"],
      ["Request correction", "Correction Requested", "warning"],
    ],
    "Payment Initiated": [
      ["Mark as paid", "Paid", "success"],
      ["Mark as failed", "Payout Failed", "danger"],
    ],
    "Correction Requested": [
      ["Reopen as pending", "Pending", "primary"],
      ["Approve corrected payout", "Approved", "success"],
      ["Reject payout", "Rejected", "danger"],
    ],
    "Payout Failed": [["Retry payment", "Payment Initiated", "primary"]],
    "On Hold": [["Resume review", "Approved", "success"]],
  };
  return actions[status] || [];
};

export const AdminPayoutsPage = () => {
  const { partners = [], showToast } = useApp();

  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [payoutRecords, setPayoutRecords] = useState([]);
  const [eligibleLeads, setEligibleLeads] = useState([]);
  const [eligibleLeadsLoading, setEligibleLeadsLoading] = useState(false);
  const [eligibleLeadsError, setEligibleLeadsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [nextPayoutStatus, setNextPayoutStatus] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [paymentEvidence, setPaymentEvidence] = useState(null);
  const [partnerBankDetails, setPartnerBankDetails] = useState(null);
  const [bankDetailsLoading, setBankDetailsLoading] = useState(false);
  const [payoutQuote, setPayoutQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [formData, setFormData] = useState({
    partnerId: "",
    leadId: "",
  });

  const openPayoutUpdate = (payout, nextStatus) => {
    setSelectedPayout(payout);
    setNextPayoutStatus(nextStatus);
    setUtrNumber("");
    setStatusReason("");
    if (nextStatus === "Paid") setPaymentEvidence(null);
  };

  const downloadPaymentEvidence = async (payout, index, file) => {
    try {
      const blob = await payoutsApi.getEvidence(payout._id, index);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.fileName || "payment-evidence";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      showToast(error.message || "Evidence download failed", "error");
    }
  };

  // Fetch payouts from database
  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await payoutsApi.getAll();

      if (response.success) {
        setPayoutRecords(response.payments || []);
      } else {
        showToast("Failed to fetch payouts", "error");
      }
    } catch (error) {
      console.error("Fetch payouts error:", error);
      showToast(error.message || "Failed to load payouts", "error");
    } finally {
      setLoading(false);
    }
  };
  const handleStatusUpdate = async () => {
    if (!selectedPayout || !nextPayoutStatus) return;

    if (nextPayoutStatus === "Paid" && !utrNumber.trim()) {
      showToast("UTR number is required", "error");
      return;
    }

    try {
      setSaving(true);
      if (nextPayoutStatus === "Paid" && paymentEvidence) {
        const formData = new FormData();
        formData.append("documents", paymentEvidence);
        await payoutsApi.uploadEvidence(selectedPayout._id, formData);
      }

      const response = await payoutsApi.updateStatus(
        selectedPayout._id,
        nextPayoutStatus,
      utrNumber.trim(),
      statusReason.trim(),
      );

      if (response.success) {
        showToast("Payout status updated successfully", "success");
        setSelectedPayout(null);
        setNextPayoutStatus("");
        setUtrNumber("");
        setStatusReason("");
        setPaymentEvidence(null);
        await fetchPayouts();
      }
    } catch (error) {
      showToast(error.message || "Failed to update payout status", "error");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  useEffect(() => {
    if (!formData.partnerId) { setPartnerBankDetails(null); return; }
    let active = true; setBankDetailsLoading(true);
    partnersApi.getPayoutDetails(formData.partnerId).then((response) => { if (active) setPartnerBankDetails(response.partner); }).catch((error) => { if (active) { setPartnerBankDetails(null); showToast(error.message || "Unable to load partner bank details.", "error"); } }).finally(() => { if (active) setBankDetailsLoading(false); });
    return () => { active = false; };
  }, [formData.partnerId]);

  // Find selected partner
  const selectedPartner = partners.find(
    (partner) => partner.partnerCode === formData.partnerId,
  );

  // Load all eligible leads for the selected partner from the backend.
  // The shared AppContext intentionally loads a bounded first page for dashboards;
  // payout creation must not silently omit eligible records beyond that page.
  useEffect(() => {
    if (!formData.partnerId) {
      setEligibleLeads([]);
      setEligibleLeadsError("");
      setEligibleLeadsLoading(false);
      return undefined;
    }

    let active = true;
    setEligibleLeads([]);
    setEligibleLeadsError("");
    setEligibleLeadsLoading(true);

    const loadEligibleLeads = async () => {
      try {
        const first = await leadsApi.getAll({
          partnerId: formData.partnerId,
          status: "Disbursed",
          page: 1,
          limit: 100,
        });
        if (!first?.success) throw new Error(first?.message || "Unable to load eligible disbursed leads.");
        const all = [...(first.leads || [])];
        const pages = Math.max(1, Number(first.pagination?.pages) || 1);
        for (let page = 2; page <= pages; page += 1) {
          const response = await leadsApi.getAll({
            partnerId: formData.partnerId,
            status: "Disbursed",
            page,
            limit: 100,
          });
          if (!response?.success) throw new Error(response?.message || `Unable to load eligible leads page ${page}.`);
          all.push(...(response.leads || []));
        }
        if (active) {
          setEligibleLeads(all.filter((lead) =>
            lead.partnerId === formData.partnerId &&
            lead.currentStatus === "Disbursed" &&
            lead.disbursementUpdate?.status === "confirmed" &&
            Number(lead.disbursementUpdate?.amount) > 0
          ));
        }
      } catch (error) {
        if (active) setEligibleLeadsError(error.message || "Unable to load eligible leads.");
      } finally {
        if (active) setEligibleLeadsLoading(false);
      }
    };

    loadEligibleLeads();
    return () => { active = false; };
  }, [formData.partnerId]);

  const selectedLead = eligibleLeads.find(
    (lead) => lead.leadCode === formData.leadId,
  );

  useEffect(() => {
    if (!formData.partnerId || !formData.leadId) {
      setPayoutQuote(null);
      setQuoteError("");
      setQuoteLoading(false);
      return undefined;
    }
    let active = true;
    setQuoteLoading(true);
    setPayoutQuote(null);
    setQuoteError("");
    payoutsApi.quote(formData.partnerId, formData.leadId)
      .then((response) => {
        if (!active) return;
        if (!response?.success || !response.quote) throw new Error(response?.message || "Unable to calculate payout.");
        setPayoutQuote(response.quote);
      })
      .catch((error) => { if (active) setQuoteError(error.message || "Unable to calculate payout."); })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [formData.partnerId, formData.leadId]);

  const loanAmount = Number(selectedLead?.loanPayoutAmount || selectedLead?.disbursementUpdate?.amount || 0);
  const updateForm = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      partnerId: "",
      leadId: "",
    });
    setShowForm(false);
  };

  // Create payout
  const handleCreatePayout = async (e) => {
    e.preventDefault();

    if (!formData.partnerId || !formData.leadId) {
      showToast("Please select a partner and lead", "error");
      return;
    }

    if (!loanAmount || loanAmount <= 0) {
      showToast("Valid disbursed loan amount is unavailable", "error");
      return;
    }

    try {
      setSaving(true);

      const response = await payoutsApi.create({
        partnerId: formData.partnerId,
        leadId: formData.leadId,
      });

      if (response.success) {
        showToast("Payout created successfully", "success");
        resetForm();
        await fetchPayouts();
      } else {
        showToast(response.message || "Failed to create payout", "error");
      }
    } catch (error) {
      console.error("Create payout error:", error);
      showToast(error.message || "Failed to create payout", "error");
    } finally {
      setSaving(false);
    }
  };

  // Filter payout records
  const filteredPayouts = payoutRecords.filter((payout) => {
    if (
      activeTab === "pending" &&
      !["Pending", "Approved", "Payment Initiated", "On Hold", "Correction Requested"].includes(payout.status)
    ) {
      return false;
    }

    if (activeTab === "completed" && payout.status !== "Paid") {
      return false;
    }

    if (activeTab === "failed" && payout.status !== "Payout Failed") {
      return false;
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();

      const fields = [
        payout.partnerName,
        payout.paymentNumber,
        payout.leadId,
        payout.customerName,
        payout.utr,
        payout.status,
      ];

      if (
        !fields.some((field) =>
          String(field || "")
            .toLowerCase()
            .includes(query),
        )
      ) {
        return false;
      }
    }

    return true;
  });

  // Database-based metrics
  const totalSettled = payoutRecords
    .filter((p) => p.status === "Paid")
    .reduce((total, p) => total + Number(p.amount || 0), 0);

  const pendingCommission = payoutRecords
    .filter((p) => ["Pending", "Approved", "Payment Initiated", "On Hold", "Correction Requested"].includes(p.status))
    .reduce((total, p) => total + Number(p.amount || 0), 0);

  const approvedCommission = payoutRecords
    .filter((p) => p.status === "Approved")
    .reduce((total, p) => total + Number(p.amount || 0), 0);

  const failedAmount = payoutRecords
    .filter((p) => p.status === "Payout Failed")
    .reduce((total, p) => total + Number(p.amount || 0), 0);

  const totalGST = payoutRecords.reduce(
    (total, p) => total + Number(p.gstAmount || 0),
    0,
  );

  // Export CSV
  const handleExport = () => {
    if (!filteredPayouts.length) {
      showToast("No payout records available to export", "error");
      return;
    }

    const exportData = filteredPayouts.map((p) => ({
      "Payout Reference": p.paymentNumber || "",
      "Partner Name": p.partnerName || "",
      "Payment Type": p.paymentType || "",
      "Loan Amount": p.loanAmount || 0,
      "Commission Rule Type": p.calculationType || "percentage",
      "Commission Rule Value": p.commissionRuleValue ?? p.commissionPercentage ?? 0,
      "Commission Amount": p.amount || 0,
      "GST Percentage": p.gstPercentage || 0,
      "GST Amount": p.gstAmount || 0,
      "Total Amount": p.totalAmount || 0,
      "Lead ID": p.leadId ? formatLeadUid(p.leadId) : "",
      "Customer Name": p.customerName || "",
      "Bank Details": p.bankDetails || "",
      UTR: p.utr || "",
      Status: p.status || "",
      "Created Date": p.createdAt
        ? new Date(p.createdAt).toLocaleDateString("en-IN")
        : "",
    }));

    exportToCSV(exportData, `realcred_payout_ledger_${Date.now()}.csv`);

    showToast("Payout ledger CSV exported", "success");
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleReceipt = (payment) => {
    try {
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(20, 42, 80);
      doc.rect(0, 0, pageWidth, 38, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("REALCRED", 15, 17);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("PAYOUT RECEIPT", 15, 27);

      // Receipt details
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Payout Information", 15, 52);

      const details = [
        ["Payout Reference", payment.paymentNumber || "—"],
        ["Partner Name", payment.partnerName || "—"],
        ["Partner Code", payment.partnerId || "—"],
        ["Customer Name", payment.customerName || "—"],
        ["Lead Reference", payment.leadId ? formatLeadUid(payment.leadId) : "—"],
        ["Payment Type", payment.paymentType || "—"],
        ["Bank Details", payment.bankDetails || "—"],
        ["Commission Rule", payment.calculationType === "fixed" ? `Fixed ${formatINR(payment.commissionRuleValue ?? payment.amount)}` : `${payment.commissionRuleValue ?? payment.commissionPercentage ?? 0}%`],
        ["GST Percentage", `${payment.gstPercentage ?? 0}%`],
        ["UTR Number", payment.utr || "—"],
        ["Payment Status", payment.status || "—"],
        [
          "Payment Date",
          payment.paymentDate
            ? new Date(payment.paymentDate).toLocaleDateString("en-IN")
            : "—",
        ],
      ];

      let y = 64;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 15, y);

        doc.setFont("helvetica", "normal");
        doc.text(String(value), 75, y);

        y += 10;
      });

      // Amount summary
      y += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, pageWidth - 15, y);

      y += 12;
      doc.setFont("helvetica", "bold");
      doc.text("PAYOUT SUMMARY", 15, y);

      y += 12;
      doc.setFont("helvetica", "normal");
      doc.text("Actual Disbursed Loan Amount", 15, y);
      doc.text(formatINR(payment.loanAmount || 0), pageWidth - 15, y, {
        align: "right",
      });

      y += 10;
      doc.text("Commission Amount", 15, y);
      doc.text(formatINR(payment.amount || 0), pageWidth - 15, y, {
        align: "right",
      });

      y += 10;
      doc.text("GST Amount", 15, y);
      doc.text(formatINR(payment.gstAmount || 0), pageWidth - 15, y, {
        align: "right",
      });

      y += 12;
      doc.setDrawColor(20, 42, 80);
      doc.line(15, y, pageWidth - 15, y);

      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Total Payout", 15, y);
      doc.text(formatINR(payment.totalAmount || 0), pageWidth - 15, y, {
        align: "right",
      });

      // Footer
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(
        "This is a system-generated payout receipt.",
        pageWidth / 2,
        280,
        { align: "center" },
      );

      const fileName = `Payout_Receipt_${payment.paymentNumber || payment._id}.pdf`;
      doc.save(fileName);

      showToast("Payout receipt downloaded successfully", "success");
    } catch (error) {
      console.error("Receipt generation error:", error);
      showToast("Failed to generate payout receipt", "error");
    }
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Payout Management
          </h1>

          <p className="text-sm text-slate-500 mt-1.5">
            Partner DSA commission ledger, banking NEFT dispatches and GST
            reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchPayouts}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold flex items-center gap-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={handleExport}
            disabled={loading || filteredPayouts.length === 0}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold flex items-center gap-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export Payout Ledger
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 rounded-xl bg-brand-royal text-white text-sm font-bold flex items-center gap-2 shadow-sm transition hover:brightness-95"
          >
            {showForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showForm ? "Close Form" : "Create Payout"}
          </button>
        </div>
      </div>

      {/* Create Payout Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-premium p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-brand-navy">
              Create Partner Payout
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a lead with confirmed disbursement. The backend applies the configured active rule.
            </p>
          </div>

          <form onSubmit={handleCreatePayout} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Partner */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Select Partner *
                </label>

                <select
                  required
                  value={formData.partnerId}
                  onChange={(e) => {
                    setFormData((previous) => ({
                      ...previous,
                      partnerId: e.target.value,
                      leadId: "",
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Choose partner</option>

                  {partners
                    .filter((p) => p.status === "Active")
                    .map((partner) => (
                      <option
                        key={partner._id || partner.partnerCode}
                        value={partner.partnerCode}
                      >
                        {partner.companyName || partner.name} (
                        {partner.partnerCode})
                      </option>
                    ))}
                </select>
              </div>

              {/* Lead */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Select Eligible Lead *
                </label>

                <select
                  required
                  value={formData.leadId}
                  disabled={!formData.partnerId}
                  onChange={(e) => updateForm("leadId", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Choose lead</option>

                  {eligibleLeads.map((lead) => (
                    <option key={lead._id} value={lead.leadCode}>
                      {formatLeadUid(lead.leadCode)} — {lead.customerName}
                    </option>
                  ))}
                </select>

                {eligibleLeadsLoading && <p className="mt-2 text-[11px] text-slate-500">Loading all confirmed disbursements for this partner…</p>}
                {eligibleLeadsError && <p role="alert" className="mt-2 text-[11px] text-rose-700">{eligibleLeadsError}</p>}
                {formData.partnerId && !eligibleLeadsLoading && !eligibleLeadsError && eligibleLeads.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-2">
                    No Admin-confirmed disbursements are available for payout for this partner.
                  </p>
                )}
              </div>

              {/* Customer */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Customer Name
                </label>

                <input
                  readOnly
                  value={selectedLead?.customerName || ""}
                  placeholder="Auto-filled from lead"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm"
                />
              </div>

              {/* Loan Category */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Loan Category
                </label>

                <input
                  readOnly
                  value={selectedLead?.loanCategory || ""}
                  placeholder="Auto-filled from lead"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm"
                />
              </div>

              {/* Loan Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Actual Disbursed Loan Amount
                </label>

                <input
                  readOnly
                  value={selectedLead ? formatINR(loanAmount) : ""}
                  placeholder="Auto-filled from database"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Disbursement Bank / NBFC
                </label>
                <input
                  readOnly
                  value={selectedLead?.disbursementUpdate?.bankName || "Not recorded"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm"
                />
              </div>

              {/* Partner Code */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  Partner Code
                </label>

                <input
                  readOnly
                  value={selectedPartner?.partnerCode || ""}
                  placeholder="Auto-filled"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm"
                />
              </div>

            </div>

            {formData.partnerId && <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="text-sm font-bold">Payout beneficiary bank details</h3>{bankDetailsLoading ? <p className="mt-2 text-xs text-slate-500">Loading authorized bank details…</p> : partnerBankDetails ? <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><p>Account holder: <strong>{partnerBankDetails.accountHolderName}</strong></p><p>Bank: <strong>{partnerBankDetails.bankName} · {partnerBankDetails.bankBranch}</strong></p><p>Account: <strong>{partnerBankDetails.accountNumber}</strong></p><p>IFSC: <strong>{partnerBankDetails.ifsc}</strong></p><p>Type: <strong>{partnerBankDetails.accountType}</strong></p></div> : <p className="mt-2 text-xs text-rose-700">Verified bank details are unavailable. Payout creation should wait until partner bank details are reviewed.</p>}</section>}

            {/* Calculation Preview */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-brand-navy">
                  Automatic Payout Calculation
                </h3>
              </div>

              <p className="text-sm leading-6 text-slate-700">Commission and tax amounts are calculated by the backend from an active approved rule. The Bank / NBFC rule must match the lead’s confirmed disbursement bank shown above; the partner beneficiary bank is separate.</p>
              {!formData.leadId && <p className="mt-3 text-sm text-slate-600">Select a partner and an eligible lead to load the backend calculation.</p>}
              {quoteLoading && <p className="mt-3 text-sm text-blue-700">Checking active rules and calculating payout…</p>}
              {quoteError && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{quoteError}</p>}
              {payoutQuote && <div className="mt-4 grid gap-2 rounded-xl border border-blue-100 bg-white p-4 text-sm sm:grid-cols-2"><p>Matched rule: <strong>{payoutQuote.rule.name}</strong></p><p>Confirmed disbursement: <strong>{formatINR(payoutQuote.loanAmount)}</strong></p><p>Commission: <strong>{formatINR(payoutQuote.commissionAmount)}</strong></p><p>GST: <strong>{formatINR(payoutQuote.gstAmount)}</strong></p><p>Deductions: <strong>{formatINR(payoutQuote.deductionAmount)}</strong></p><p>Net payable: <strong className="text-emerald-700">{formatINR(payoutQuote.netPayable)}</strong></p></div>}
              <Link to="/admin/commission-rules" className="mt-3 inline-flex rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50">Review Payout Rules</Link>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving ||
                  eligibleLeadsLoading ||
                  !selectedLead || quoteLoading || !payoutQuote
                }
                className="px-6 py-2.5 rounded-xl bg-brand-navy text-white text-xs font-bold disabled:opacity-50"
              >
                {saving ? "Creating Payout..." : "Create Payout"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" /><div className="mb-5 flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Commission Settled
          </span><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Wallet className="h-4 w-4" /></span></div>
          <span className="text-2xl font-extrabold text-slate-900 block">
            {formatINR(totalSettled)}
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">
            Total Paid Payouts
          </span>
        </div>

        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="absolute inset-x-0 top-0 h-1 bg-amber-400" /><div className="mb-5 flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Pending Commission Queue
          </span><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="h-4 w-4" /></span></div>
          <span className="text-2xl font-extrabold text-slate-900 block">
            {formatINR(pendingCommission)}
          </span>
          <span className="text-[10px] text-amber-600 font-semibold">
            Pending / Payment Initiated
          </span>
        </div>

        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="absolute inset-x-0 top-0 h-1 bg-blue-500" /><div className="mb-5 flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approved Commission</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><BadgeCheck className="h-4 w-4" /></span></div>
          <span className="text-2xl font-extrabold text-slate-900 block">{formatINR(approvedCommission)}</span>
          <span className="text-[10px] text-slate-500 font-semibold">Awaiting payment initiation</span>
        </div>

        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="absolute inset-x-0 top-0 h-1 bg-rose-500" /><div className="mb-5 flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Failed Reversals
          </span><span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-700"><CircleAlert className="h-4 w-4" /></span></div>
          <span className="text-2xl font-extrabold text-slate-900 block">
            {formatINR(failedAmount)}
          </span>
          <span className="text-[10px] text-rose-600 font-semibold">
            Failed Payout Amount
          </span>
        </div>

        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="absolute inset-x-0 top-0 h-1 bg-violet-500" /><div className="mb-5 flex items-center justify-between"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total GST
          </span><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><Receipt className="h-4 w-4" /></span></div>
          <span className="text-2xl font-extrabold text-slate-900 block">
            {formatINR(totalGST)}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">
            GST Across All Payouts
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <label className="sr-only" htmlFor="payout-status-filter">Filter transactions by status</label>
        <select
          id="payout-status-filter"
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value)}
          className="w-full sm:w-60 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-royal/20"
        >
          <option value="all">All Transactions</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search partner, lead, payout or UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-3 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-royal/15"
          />
        </div>
      </div>

      {/* Payout Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Payout Ref #</th>
                <th className="py-3.5 px-4">Beneficiary Partner</th>
                <th className="py-3.5 px-4">Net Amount</th>
                <th className="py-3.5 px-4">GST</th>
                <th className="py-3.5 px-4">Lead Reference</th>
                <th className="py-3.5 px-4">Bank Account</th>
                <th className="py-3.5 px-4">Banking UTR</th>
                <th className="py-3.5 px-4">Payout Status</th>
                <th className="py-3.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    Loading payout records...
                  </td>
                </tr>
              ) : filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No payout records available.
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((row) => (
                  <tr
                    key={row._id}
                    className="hover:bg-rose-50/35 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-navy">
                      <div>{row.paymentNumber || "—"}</div>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {formatDate(row.createdAt)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div>{row.partnerName || "—"}</div>
                      <span className="text-[10px] text-brand-royal font-normal">
                        {row.paymentType || "DSA Partner Commission"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-extrabold text-sm text-brand-navy">
                      {formatINR(row.amount || 0)}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-600">
                      {formatINR(row.gstAmount || 0)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <div>{row.leadId ? formatLeadUid(row.leadId) : "—"}</div>
                      <span className="text-[10px] text-slate-400">
                        {row.customerName || ""}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                      {row.bankDetails || "—"}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs">
                      <span
                        className={
                          row.status === "Paid"
                            ? "text-emerald-700 font-bold"
                            : "text-slate-400"
                        }
                      >
                        {row.utr || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex min-w-[190px] items-center gap-2.5">
                        <StatusBadge status={row.status} />
                        {(payoutStatusActions(row.status).length > 0 || ((row.status === "Payment Initiated" || row.status === "Payout Failed") && row.paymentEvidence?.length > 0)) && (
                          <select
                            aria-label={`Actions for ${row.paymentNumber || "payout"}`}
                            value=""
                            onChange={(event) => {
                              const selectedAction = event.target.value;
                              if (selectedAction.startsWith("evidence:")) {
                                const index = Number(selectedAction.split(":")[1]);
                                downloadPaymentEvidence(row, index, row.paymentEvidence[index]);
                                return;
                              }
                              if (selectedAction.startsWith("status:")) {
                                openPayoutUpdate(row, selectedAction.slice("status:".length));
                              }
                            }}
                            className="max-w-[128px] cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 shadow-sm outline-none transition hover:border-slate-300 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                          >
                            <option value="">Actions</option>
                            {payoutStatusActions(row.status).map(([label, nextStatus]) => (
                              <option key={nextStatus} value={`status:${nextStatus}`}>{label}</option>
                            ))}
                            {(row.status === "Payment Initiated" || row.status === "Payout Failed") && (row.paymentEvidence || []).map((file, index) => (
                              <option key={`evidence-${index}`} value={`evidence:${index}`}>Download: {file.fileName}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleReceipt(row)}
                        title="Download receipt"
                        className="p-1.5 text-slate-500 hover:text-brand-royal rounded-lg hover:bg-slate-100"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Update Payout Status
              </h2>

              <button
                type="button"
                onClick={() => {
                  setSelectedPayout(null);
                  setNextPayoutStatus("");
                  setUtrNumber("");
                  setStatusReason("");
                }}
                className="text-gray-500 hover:text-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-2 text-sm text-gray-600">
              Payout: {selectedPayout.paymentNumber}
            </p>

            <p className="mb-4 text-sm text-gray-600">
              New Status: <strong>{nextPayoutStatus}</strong>
            </p>

            {nextPayoutStatus === "Paid" && (
              <div className="mb-5">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  UTR Number *
                </label>

                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="Enter transaction UTR number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                  required
                />
                <label className="mt-3 block text-sm font-medium text-gray-700">Payment proof *<input type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setPaymentEvidence(event.target.files?.[0] || null)} className="mt-2 block w-full text-xs" /></label>
              </div>
            )}

            {["Rejected", "On Hold", "Payout Failed", "Correction Requested"].includes(nextPayoutStatus) && <div className="mb-5"><label className="mb-2 block text-sm font-medium text-gray-700">{nextPayoutStatus} reason *</label><textarea value={statusReason} onChange={(e) => setStatusReason(e.target.value)} maxLength={500} required className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={3} /></div>}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedPayout(null);
                  setNextPayoutStatus("");
                  setUtrNumber("");
                  setStatusReason("");
                }}
                className="rounded-lg border px-4 py-2 text-sm"
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={
                  saving || (nextPayoutStatus === "Paid" && (!utrNumber.trim() || !paymentEvidence)) || (["Rejected", "On Hold", "Payout Failed", "Correction Requested"].includes(nextPayoutStatus) && !statusReason.trim())
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Updating..." : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
