import React, { useCallback, useEffect, useState } from "react";
import { leadsApi } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { formatINR } from "../../utils/formatters";
import { formatLeadUid } from "../../utils/leadIds";

const PAGE_SIZE = 20;

export const AdminDisbursementsPage = () => {
  const { showToast } = useApp();
  const [leads, setLeads] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: "", status: "pending_confirmation", bankName: "", from: "", to: "", minAmount: "", maxAmount: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const actionError = (err, action) => err.status === 403 && err.data?.code !== "CSRF_INVALID" ? `Admin authorization failed while ${action}. Sign in with an Admin account and retry.` : `${action}: ${err.message || "request failed."}`;
  const load = useCallback(async (nextPage = 1) => {
    setLoading(true);
    try {
      const response = await leadsApi.getDisbursements({ ...filters, page: nextPage, limit: PAGE_SIZE });
      setLeads(response.leads || []); setPageInfo(response.pagination || { page: nextPage, pages: 1, total: 0 }); setError("");
    } catch (err) { setError(actionError(err, "Unable to load disbursement records")); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { const timer = setTimeout(() => load(1), 250); return () => clearTimeout(timer); }, [load]);
  const decide = async (decision) => {
    if (!review) return;
    setBusy(true); setError("");
    try { await leadsApi.reviewDisbursement(review.leadCode, decision, reason); showToast(decision === "confirm" ? "Disbursement confirmed" : "Submission rejected", "success"); setReview(null); setReason(""); await load(pageInfo.page); }
    catch (err) { setError(actionError(err, "Unable to submit the disbursement review")); }
    finally { setBusy(false); }
  };
  const downloadEvidence = async (lead, index) => {
    setError("");
    try { const blob = await leadsApi.getDisbursementEvidence(lead.leadCode, index); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = lead.disbursementUpdate.evidence[index]?.fileName || "disbursement-evidence"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (err) { setError(actionError(err, "Unable to download disbursement evidence")); }
  };
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  return <div className="space-y-6 pb-12">
    <header><h1 className="text-2xl font-extrabold text-brand-navy">Disbursement Management</h1><p className="mt-1 text-sm text-slate-600">Review partner evidence, search all submissions and record an audited confirmation or rejection.</p></header>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-semibold text-slate-600">Search customer, lead, partner or reference<input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">Status<select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm font-normal"><option value="pending_confirmation">Awaiting review</option><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option><option value="">All submissions</option></select></label>
      <label className="text-xs font-semibold text-slate-600">Bank / NBFC<input value={filters.bankName} onChange={(e) => setFilter("bankName", e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">Minimum amount<input type="number" min="0" value={filters.minAmount} onChange={(e) => setFilter("minAmount", e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">Maximum amount<input type="number" min="0" value={filters.maxAmount} onChange={(e) => setFilter("maxAmount", e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">Submitted from<input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
      <label className="text-xs font-semibold text-slate-600">Submitted to<input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm font-normal" /></label>
    </section>
    {loading ? <p className="rounded-xl bg-white p-8 text-center text-sm">Loading disbursements…</p> : leads.length === 0 ? <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-600">No matching disbursement submissions.</p> : <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{leads.map((lead) => { const item = lead.disbursementUpdate || {}; return <article key={lead.leadCode} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-2"><div><p className="font-mono text-xs text-slate-500">{formatLeadUid(lead.leadCode)}</p><h2 className="font-bold">{lead.customerName}</h2></div><span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${item.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : item.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-100 text-amber-900"}`}>{item.status === "pending_confirmation" ? "Awaiting review" : item.status}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">Partner</dt><dd>{lead.partnerName || "—"} ({lead.partnerId || "—"})</dd></div><div><dt className="text-slate-500">Bank / NBFC</dt><dd>{item.bankName || "Not supplied"}</dd></div><div><dt className="text-slate-500">Submitted</dt><dd>{item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "—"}</dd></div><div><dt className="text-slate-500">Disbursement date</dt><dd>{item.disbursementDate ? new Date(item.disbursementDate).toLocaleDateString() : "—"}</dd></div><div><dt className="text-slate-500">Amount</dt><dd className="font-bold">{formatINR(item.amount)}</dd></div><div><dt className="text-slate-500">Loan reference</dt><dd>{item.reference || "—"}</dd></div></dl>{item.remarks && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">Remarks: {item.remarks}</p>}{item.reviewReason && <p className="mt-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">Admin decision note: {item.reviewReason}</p>}<div className="mt-4 flex flex-wrap gap-2">{(item.evidence || []).map((file, index) => <button key={`${file.fileName}-${index}`} onClick={() => downloadEvidence(lead, index)} className="rounded-lg border px-3 py-2 text-xs font-semibold">Download {file.fileName}</button>)}{item.status === "pending_confirmation" && <button onClick={() => { setError(""); setReview(lead); setReason(""); }} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Review submission</button>}</div>{item.history?.length > 0 && <details className="mt-3 border-t pt-3 text-xs"><summary className="cursor-pointer font-semibold">Submission history ({item.history.length})</summary><ol className="mt-2 space-y-1">{[...item.history].reverse().map((event, index) => <li key={`${event.at}-${index}`}>{event.status} · {event.amount ? formatINR(event.amount) : ""} · {event.at ? new Date(event.at).toLocaleString() : ""}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol></details>}</article>; })}</div>}
    <footer className="flex items-center justify-between rounded-xl bg-white p-3 text-sm"><span>Showing page {pageInfo.page} of {pageInfo.pages} · {pageInfo.total} submissions</span><div className="flex gap-2"><button disabled={loading || pageInfo.page <= 1} onClick={() => load(pageInfo.page - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={loading || pageInfo.page >= pageInfo.pages} onClick={() => load(pageInfo.page + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></footer>
    {review && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="disbursement-review-title" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5"><h2 id="disbursement-review-title" className="font-bold">Review disbursement evidence</h2><p className="text-sm">{review.customerName} · {formatINR(review.disbursementUpdate.amount)} · {review.disbursementUpdate.bankName || "Bank not supplied"}</p><label className="block text-xs font-semibold">Decision note (required for rejection)<textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border p-3" rows={3} /></label><div className="flex justify-end gap-2"><button disabled={busy} onClick={() => setReview(null)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button><button disabled={busy || !reason.trim()} onClick={() => decide("reject")} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700">Reject</button><button disabled={busy} onClick={() => decide("confirm")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white">{busy ? "Submitting…" : "Confirm Disbursed"}</button></div></section></div>}
  </div>;
};
