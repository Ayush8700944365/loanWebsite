import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { leadsApi } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { formatINR } from "../../utils/formatters";
import { formatLeadUid } from "../../utils/leadIds";
import { StatusBadge } from "../../components/common/StatusBadge";
import { ArrowUpRight, Clock3, FileCheck2, HandCoins, UserRound } from "lucide-react";

const allowedStages = ["In Process", "Follow-up", "Approved", "Sanctioned", "Rejected"];
export const PartnerLeadsPage = () => {
  const { showToast } = useApp();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [rejection, setRejection] = useState(null);
  const [reason, setReason] = useState("");
  const [disbursement, setDisbursement] = useState(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [disbursementDate, setDisbursementDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [evidence, setEvidence] = useState(null);
  const [progress, setProgress] = useState(0);
  const leadSummary = leads.reduce((summary, lead) => {
    summary.total += 1;
    if (lead.currentStatus === "Sanctioned") summary.sanctioned += 1;
    if (lead.currentStatus === "Disbursed") summary.disbursed += 1;
    return summary;
  }, { total: 0, sanctioned: 0, disbursed: 0 });
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await leadsApi.getAll({ limit: 100 }); setLeads(response.leads || []); setError(""); }
    catch (err) { setError(err.message || "Your referral leads could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const changeStage = async (leadCode, status, rejectionReason = "") => {
    setBusy(leadCode);
    try { await leadsApi.updatePartnerStatus(leadCode, status, rejectionReason); showToast(`Lead updated to ${status}`, "success"); setRejection(null); setReason(""); await load(); }
    catch (err) { showToast(err.message || "Lead status could not be changed.", "error"); }
    finally { setBusy(""); }
  };
  const submitDisbursement = async (event) => {
    event.preventDefault();
    if (!evidence?.length) return setError("Choose supporting evidence to continue.");
    const data = new FormData(); data.append("amount", amount); data.append("reference", reference); data.append("bankName", bankName); data.append("disbursementDate", disbursementDate); data.append("remarks", remarks); [...evidence].forEach((file) => data.append("documents", file));
    setBusy(disbursement.leadCode); setError("");
    try { await leadsApi.submitDisbursement(disbursement.leadCode, data, setProgress); showToast("Disbursement submitted for Admin confirmation", "success"); setDisbursement(null); setEvidence(null); await load(); }
    catch (err) { setError(err.message || "Disbursement could not be submitted."); }
    finally { setBusy(""); setProgress(0); }
  };

  return <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-12">
    <header className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-amber-50/70 p-5 shadow-sm sm:flex-row sm:items-center sm:p-6"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"><FileCheck2 className="h-5 w-5"/></span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">Partner workspace</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-navy">My Sourced Leads</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Track referral progress and submit disbursement evidence. Final disbursement requires Admin confirmation.</p></div></div><Link to="/partner/submit-lead" className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-amber-700 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-amber-800 hover:shadow-md sm:self-auto">Submit customer<ArrowUpRight className="h-4 w-4"/></Link></header>
    {!!leads.length && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><UserRound className="h-4 w-4"/></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total referrals</p><p className="mt-0.5 text-xl font-extrabold text-slate-900">{leadSummary.total}</p></div></div><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Clock3 className="h-4 w-4"/></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Sanctioned</p><p className="mt-0.5 text-xl font-extrabold text-slate-900">{leadSummary.sanctioned}</p></div></div><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><HandCoins className="h-4 w-4"/></span><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Disbursed</p><p className="mt-0.5 text-xl font-extrabold text-slate-900">{leadSummary.disbursed}</p></div></div></div>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading your leads...</p> : leads.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><FileCheck2 className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-700">No sourced leads yet</p><p className="mt-1 text-xs text-slate-500">Customers you refer will appear here with their latest progress.</p><Link to="/partner/submit-lead" className="mt-4 inline-flex rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-bold text-white">Submit your first customer</Link></div> : <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{leads.map((lead) => <article key={lead.leadCode} className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-amber-200 hover:shadow-md"><div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><span className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-slate-600">{formatLeadUid(lead.leadCode)}</span><h2 className="mt-2 truncate text-base font-bold text-brand-navy">{lead.customerName}</h2></div><StatusBadge status={lead.currentStatus} size="sm" /></div></div><div className="p-5"><div className="grid grid-cols-2 gap-2.5 text-xs">{[["Loan type", lead.loanCategory], ["Requested amount", formatINR(lead.loanAmount || 0)], ["Current stage", lead.currentStatus], ["Assigned officer", lead.assignedEmployee || "Pending assignment"]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"><span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</span><span className="mt-1 block truncate font-semibold text-slate-800">{value}</span></div>)}</div>
      {lead.disbursementUpdate?.status === "pending_confirmation" && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Disbursement submitted; awaiting Admin confirmation.</p>}
      {lead.disbursementUpdate?.status === "rejected" && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-800">Previous submission rejected: {lead.disbursementUpdate.reviewReason || "Please review and submit corrected details."}</p>}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{allowedStages.map((stage) => <button key={stage} type="button" disabled={busy === lead.leadCode || lead.currentStatus === "Disbursed" || lead.currentStatus === "Payout Complete" || lead.currentStatus === "Invoice Generated"} onClick={() => stage === "Rejected" ? (setRejection(lead), setReason("")) : changeStage(lead.leadCode, stage)} className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${lead.currentStatus === stage ? "border-blue-200 bg-blue-50 text-blue-800" : stage === "Rejected" ? "border-rose-100 bg-rose-50/50 text-rose-700 hover:bg-rose-50" : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/50"}`}>{stage}</button>)}{lead.currentStatus === "Sanctioned" && lead.disbursementUpdate?.status !== "pending_confirmation" && <button type="button" onClick={() => { setDisbursement(lead); setAmount(""); setReference(""); setBankName(""); setDisbursementDate(""); setRemarks(""); setEvidence(null); }} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-800"><HandCoins className="h-3.5 w-3.5"/>{lead.disbursementUpdate?.status === "rejected" ? "Resubmit disbursement" : "Submit disbursement"}</button>}</div>
      {lead.statusHistory?.length > 0 && <details className="mt-4 border-t border-slate-100 pt-4 text-xs"><summary className="flex cursor-pointer list-none items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 font-semibold text-slate-700"><span>Status history</span><span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500">{lead.statusHistory.length}</span></summary><ol className="relative mt-3 space-y-3 border-l border-slate-200 pl-4">{[...lead.statusHistory].reverse().map((entry, index) => <li key={`${entry.at}-${index}`} className="relative rounded-xl bg-slate-50/70 p-3"><span className="absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500 ring-1 ring-amber-200"/><p className="font-semibold text-slate-800">{entry.fromStatus || "Created"} <span className="text-slate-400">to</span> {entry.toStatus}</p><p className="mt-1 text-[10px] text-slate-500">{entry.actorName || entry.actorRole} <span className="px-1 text-slate-300">·</span> {entry.at ? new Date(entry.at).toLocaleString() : "Date unavailable"}</p>{entry.reason && <p className="mt-2 text-[11px] text-slate-600">{entry.reason}</p>}</li>)}</ol></details>}
    </div></article>)}</div>}

    {rejection && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={(e) => { e.preventDefault(); changeStage(rejection.leadCode, "Rejected", reason); }} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5"><h2 className="font-bold">Reject {rejection.customerName}</h2><label className="block text-xs font-semibold">Reason<textarea required minLength={1} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border p-3" rows={4} /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setRejection(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={Boolean(busy)} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white">Confirm rejection</button></div></form></div>}
    {disbursement && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"><form onSubmit={submitDisbursement} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-5"><h2 className="font-bold">Submit disbursement update</h2><p className="text-xs text-slate-600">Admin reviews the evidence before the lead becomes Disbursed.</p><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold">Confirmed amount<input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-xs font-semibold">Bank / NBFC<input required maxLength={120} value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-xs font-semibold">Disbursement date<input required type="date" max={new Date().toISOString().slice(0, 10)} value={disbursementDate} onChange={(e) => setDisbursementDate(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-xs font-semibold">Loan account / transaction reference<input required maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label></div><label className="block text-xs font-semibold">Remarks<textarea maxLength={1000} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="mt-1 w-full rounded-lg border p-2" rows={2} /></label><label className="block text-xs font-semibold">Evidence PDF or image (you may select multiple)<input required type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setEvidence(e.target.files || null)} className="mt-1 block w-full text-xs" /></label>{busy && <p className="text-xs text-slate-600">Uploading {progress}%</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setDisbursement(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={Boolean(busy)} className="rounded-lg bg-brand-royal px-4 py-2 text-sm font-bold text-white">Submit for review</button></div></form></div>}
  </div>;
};
