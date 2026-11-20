import React, { useEffect, useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { payoutsApi } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { formatINR, exportToCSV } from "../../utils/formatters";
import { StatusBadge } from "../../components/common/StatusBadge";
import { formatLeadUid } from "../../utils/leadIds";

const inProgressStatuses = ["Pending", "Approved", "Payment Initiated", "On Hold", "Correction Requested"];

export const PartnerCommissionPage = () => {
  const { showToast } = useApp();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    payoutsApi.getMy()
      .then((result) => {
        if (active) setPayments(Array.isArray(result.payments) ? result.payments : []);
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load your commission ledger.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => payments.reduce((acc, payment) => {
    const commission = Number(payment.amount) || 0;
    const total = Number(payment.totalAmount) || commission;
    acc.commission += commission;
    acc.total += total;
    if (payment.status === "Paid") acc.paid += total;
    else if (inProgressStatuses.includes(payment.status)) acc.pending += total;
    return acc;
  }, { commission: 0, total: 0, pending: 0, paid: 0 }), [payments]);

  const handleExport = () => {
    if (!payments.length) return;
    exportToCSV(payments.map((payment) => ({
      PaymentNumber: payment.paymentNumber,
      CustomerName: payment.customerName,
      LeadCode: payment.leadId ? formatLeadUid(payment.leadId) : "",
      LoanAmount: payment.loanAmount,
      CalculationType: payment.calculationType,
      CommissionRuleValue: payment.commissionRuleValue,
      CommissionAmount: payment.amount,
      GSTPercentage: payment.gstPercentage,
      GSTAmount: payment.gstAmount,
      TotalAmount: payment.totalAmount,
      Status: payment.status,
      UTR: payment.utr,
      PaymentDate: payment.paymentDate,
    })), `realcred_partner_commissions_${Date.now()}.csv`);
    showToast("Commission statement exported.", "success");
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">Commission &amp; Payout History</h1>
          <p className="mt-1 text-xs text-slate-500">Commission records calculated for your verified and disbursed leads.</p>
        </div>
        <button type="button" onClick={handleExport} disabled={!payments.length} className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50">
          <Download className="h-4 w-4" /> Download Statement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[["Commission before GST", totals.commission], ["Total including GST", totals.total], ["Pending / processing", totals.pending], ["Paid", totals.paid]].map(([label, amount]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            <span className="block text-2xl font-extrabold text-brand-navy">{formatINR(amount)}</span>
          </div>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><h2 className="text-sm font-extrabold text-brand-navy">Your commission records</h2></div>
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading commission records…</p>
          : payments.length === 0 ? <div className="p-10 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p className="text-sm font-semibold text-slate-700">No commission payouts are available yet.</p><p className="mt-1 text-xs text-slate-500">Payouts appear after an Admin confirms disbursement and creates the commission record.</p></div>
          : <div className="overflow-x-auto"><table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500"><th className="px-4 py-3">Payment / Date</th><th className="px-4 py-3">Customer / Lead</th><th className="px-4 py-3">Loan amount</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">GST</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">UTR</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{payments.map((payment) => <tr key={payment._id}>
              <td className="px-4 py-3 font-mono font-bold">{payment.paymentNumber || "—"}<span className="block text-[10px] font-normal text-slate-400">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("en-IN") : "Not paid"}</span></td>
              <td className="px-4 py-3 font-semibold">{payment.customerName || "—"}<span className="block font-mono text-[10px] font-normal text-slate-400">{payment.leadId ? formatLeadUid(payment.leadId) : "—"}</span></td>
              <td className="px-4 py-3">{formatINR(payment.loanAmount || 0)}</td>
              <td className="px-4 py-3 font-semibold">{formatINR(payment.amount || 0)}<span className="block text-[10px] font-normal text-slate-400">{payment.calculationType === "percentage" ? `${payment.commissionRuleValue || payment.commissionPercentage || 0}%` : "Fixed"}</span></td>
              <td className="px-4 py-3">{formatINR(payment.gstAmount || 0)}<span className="block text-[10px] text-slate-400">{Number(payment.gstPercentage) || 0}%</span></td>
              <td className="px-4 py-3 font-extrabold">{formatINR(payment.totalAmount || 0)}</td>
              <td className="px-4 py-3 font-mono">{payment.utr || "—"}</td>
              <td className="px-4 py-3"><StatusBadge status={payment.status} /></td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </div>
  );
};
