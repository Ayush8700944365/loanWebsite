import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ReceiptText,
  Wallet,
  CircleDollarSign,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { payoutsApi } from "../../services/api";
import { formatLeadUid } from "../../utils/leadIds";
import { formatINR, exportToCSV } from "../../utils/formatters";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useApp } from "../../context/AppContext";

const STATUS_FILTERS = [
  "All",
  "Pending",
  "Payment Initiated",
  "Paid",
  "Payout Failed",
];

const getPayoutDate = (payout) =>
  payout.paymentDate || payout.createdAt || null;

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString();
};

const normalizeStatus = (status) => status || "Pending";

export const PartnerPayoutsPage = () => {
  const { showToast } = useApp();
  const [payouts, setPayouts] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadPayouts = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);

    try {
      const response = await payoutsApi.getMy();
      if (!response?.success) {
        throw new Error(response?.message || "Unable to load payout records.");
      }

      setPayouts(Array.isArray(response.payments) ? response.payments : []);
    } catch (err) {
      // Do not leave previously loaded payout data visible after an access
      // failure; that can make an expired or mismatched session look current.
      if (err?.status === 403) setPayouts([]);
      setError({
        status: err?.status,
        message: err?.message || "Unable to load your payout records.",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const filteredPayouts = useMemo(() => {
    if (filterStatus === "All") return payouts;
    return payouts.filter(
      (payout) => normalizeStatus(payout.status) === filterStatus,
    );
  }, [payouts, filterStatus]);

  const totals = useMemo(() => {
    return payouts.reduce(
      (summary, payout) => {
        const total = Number(payout.totalAmount) || 0;
        const commission = Number(payout.amount) || 0;

        summary.grossCommission += commission;
        summary.gst += Number(payout.gstAmount) || 0;
        summary.totalPayable += total;

        if (payout.status === "Paid") summary.paid += total;
        else if (payout.status === "Payout Failed" || payout.status === "Rejected") summary.failed += total;
        else if (["Pending", "Approved", "Payment Initiated", "On Hold", "Correction Requested"].includes(payout.status)) summary.pending += total;

        return summary;
      },
      {
        grossCommission: 0,
        gst: 0,
        totalPayable: 0,
        paid: 0,
        pending: 0,
        failed: 0,
      },
    );
  }, [payouts]);

  const handleExport = () => {
    if (!filteredPayouts.length) {
      showToast("No payout records available to export.", "info");
      return;
    }

    const exportRows = filteredPayouts.map((payout) => ({
      paymentNumber: payout.paymentNumber || "",
      date: formatDate(getPayoutDate(payout)),
      leadId: payout.leadId || "",
      customerName: payout.customerName || "",
      loanAmount: payout.loanAmount ?? "",
      commissionPercentage: payout.commissionPercentage ?? "",
      commissionAmount: payout.amount ?? "",
      gstPercentage: payout.gstPercentage ?? "",
      gstAmount: payout.gstAmount ?? "",
      totalAmount: payout.totalAmount ?? "",
      bankDetails: payout.bankDetails || "",
      utr: payout.utr || "",
      status: payout.status || "",
    }));

    exportToCSV(exportRows, `partner-payouts-${Date.now()}.csv`);
    showToast("Payout statement exported.", "success");
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-12">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/70 p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-100 bg-white text-amber-700 shadow-sm"><Banknote className="h-5 w-5"/></span>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">Settlement overview</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy">
            Partner Payouts
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            View your commission payouts, settlement status and payment
            references.
          </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadPayouts(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!filteredPayouts.length}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-amber-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{error.status === 403 ? "Partner access required" : "Payouts could not be loaded"}</p>
            <p className="mt-1 text-xs">{error.status === 403
              ? "This session is not authorized for partner payouts. Sign in with the approved partner account. If this is already the partner login, ask an administrator to verify that the account role is Partner and its partner code is configured."
              : error.message}</p>
          </div>
          {error.status !== 403 && (
            <button
              type="button"
              onClick={() => loadPayouts(true)}
              className="text-xs font-bold underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><CircleDollarSign className="h-4 w-4"/></span>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Total Commission
          </p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy">
            {formatINR(totals.grossCommission)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Before GST</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><CheckCircle2 className="h-4 w-4"/></span>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            Paid
          </p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-emerald-800">
            {formatINR(totals.paid)}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Marked as paid in records
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-sm"><TrendingUp className="h-4 w-4"/></span>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
            Pending / Processing
          </p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-amber-800">
            {formatINR(totals.pending)}
          </p>
          <p className="mt-1 text-xs text-amber-700">Not yet marked as paid</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Wallet className="h-4 w-4"/></span>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Payout Records
          </p>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy">
            {payouts.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            GST recorded: {formatINR(totals.gst)}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/70 p-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-brand-navy"><ReceiptText className="h-4 w-4 text-amber-700"/>
              Payout & Settlement History
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Showing {filteredPayouts.length} of {payouts.length} payout records
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-slate-50 p-1.5">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`rounded-xl px-3 py-2 text-[10px] font-bold transition ${
                  filterStatus === status
                    ? "bg-white text-amber-800 shadow-sm ring-1 ring-slate-200/70"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading payout records...
          </div>
        ) : filteredPayouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <ReceiptText className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">
              {payouts.length
                ? "No payouts match this filter"
                : "No payout records yet"}
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              Payout records will appear here when the admin generates a
              commission payout for one of your eligible leads.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3.5">Payout Reference</th>
                  <th className="px-4 py-3.5">Customer / Lead</th>
                  <th className="px-4 py-3.5">Loan Amount</th>
                  <th className="px-4 py-3.5">Commission</th>
                  <th className="px-4 py-3.5">GST</th>
                  <th className="px-4 py-3.5">Total Amount</th>
                  <th className="px-4 py-3.5">UTR / Bank Details</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayouts.map((payout) => (
                  <tr
                    key={payout._id || payout.paymentNumber}
                    className="transition hover:bg-amber-50/30"
                  >
                    <td className="px-4 py-4 font-mono font-bold text-brand-navy">
                      {payout.paymentNumber || "Not available"}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800">
                        {payout.customerName || "Not available"}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-slate-400">
                        {payout.leadId ? formatLeadUid(payout.leadId) : "No lead reference"}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {formatINR(payout.loanAmount)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-purple-700">
                        {formatINR(payout.amount)}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {Number(payout.commissionPercentage) || 0}% rate
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <p>{formatINR(payout.gstAmount)}</p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {Number(payout.gstPercentage) || 0}% GST
                      </p>
                    </td>
                    <td className="px-4 py-4 font-extrabold text-emerald-700">
                      {formatINR(payout.totalAmount)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-[10px] text-slate-700">
                        {payout.utr || "UTR not available"}
                      </p>
                      {payout.bankDetails ? (
                        <p
                          className="mt-1 max-w-[170px] truncate text-[10px] text-slate-400"
                          title={payout.bankDetails}
                        >
                          {payout.bankDetails}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        status={normalizeStatus(payout.status)}
                        size="sm"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        {payout.status === "Paid" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Clock3 className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        {formatDate(getPayoutDate(payout))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-5 text-slate-600 shadow-sm">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><ShieldCheck className="h-4 w-4" /></span>
        <p>
          Payout figures and settlement references come from your payout records.
          The portal does not estimate TDS, invent UTR references, or infer bank
          account details.
        </p>
      </div>
    </div>
  );
};

export default PartnerPayoutsPage;
