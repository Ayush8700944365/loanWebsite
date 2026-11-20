import React, { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Building2, CalendarDays, Percent, Plus, SlidersHorizontal } from "lucide-react";
import { commissionRulesApi } from "../../services/api";
import { useApp } from "../../context/AppContext";

const emptyForm = { name: "", loanCategory: "", partnerCode: "", bankName: "", calculationType: "percentage", value: "", gstPercentage: "", deductionFixed: "0", deductionPercentage: "0", minimumLoanAmount: "0", maximumLoanAmount: "", effectiveFrom: "", effectiveTo: "", status: "inactive" };

export const AdminCommissionRulesPage = () => {
  const { showToast, loanCategories = [], partners = [] } = useApp();
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await commissionRulesApi.getAll(); setRules(result.rules || []); setError(""); }
    catch (err) { setError(err.message || "Commission rules could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try { await commissionRulesApi.save({ ...form, value: Number(form.value), gstPercentage: Number(form.gstPercentage), deductionFixed: Number(form.deductionFixed), deductionPercentage: Number(form.deductionPercentage), minimumLoanAmount: Number(form.minimumLoanAmount), maximumLoanAmount: form.maximumLoanAmount === "" ? null : Number(form.maximumLoanAmount) }); setForm(emptyForm); showToast("Commission rule saved", "success"); await load(); }
    catch (err) { setError(err.message || "Commission rule could not be saved."); }
    finally { setSaving(false); }
  };
  const toggle = async (rule) => {
    try { await commissionRulesApi.setStatus(rule._id, rule.status === "active" ? "inactive" : "active"); await load(); }
    catch (err) { setError(err.message || "Rule status could not be changed."); }
  };

  const inputClass = "mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-normal text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100/70";
  const labelClass = "block text-xs font-semibold text-slate-700";
  const scopeName = (value, fallback) => !value || value === "*" ? fallback : value;
  const prettyDate = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Open";

  return <div className="mx-auto max-w-6xl space-y-7 pb-12">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-royal">Payout configuration</p><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Commission rules</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Set approved commission terms by partner, loan category and lender. Only active rules are used for payout calculations.</p></div>
      <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:self-auto"><BadgeCheck className="h-4 w-4" /> No default rates</div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <form onSubmit={save} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-rose-50/80 to-white px-5 py-5 sm:px-7"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand-royal shadow-sm ring-1 ring-rose-100"><Plus className="h-5 w-5" /></span><div><h2 className="text-base font-bold text-slate-900">Create a commission rule</h2><p className="mt-0.5 text-xs text-slate-500">Set its coverage, calculation and validity.</p></div></div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 p-5 sm:grid-cols-2 sm:p-7 xl:grid-cols-3">
        <div className="sm:col-span-2 xl:col-span-3"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Building2 className="h-4 w-4 text-brand-royal" /> Rule scope</h3><p className="mt-1 text-xs text-slate-500">Choose which partner, category and lender this rule covers.</p></div>
        <label className={labelClass}>Rule name<input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Home loan commission" className={inputClass} /></label>
        <label className={labelClass}>Loan category<select value={form.loanCategory} onChange={(e) => setForm({ ...form, loanCategory: e.target.value })} className={inputClass}><option value="">All categories</option>{loanCategories.filter((category) => category.status === "active").map((category) => <option key={category._id || category.id} value={category.name}>{category.name}</option>)}</select></label>
        <label className={labelClass}>Partner<select value={form.partnerCode} onChange={(e) => setForm({ ...form, partnerCode: e.target.value })} className={inputClass}><option value="">All partners</option>{partners.filter((partner) => partner.status === "Active" || partner.status === "active").map((partner) => <option key={partner.partnerCode || partner._id} value={partner.partnerCode}>{partner.companyName || partner.name} · {partner.partnerCode}</option>)}</select></label>
        <label className={labelClass}>Bank / NBFC<input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="All institutions" className={inputClass} /></label>

        <div className="sm:col-span-2 xl:col-span-3 border-t border-slate-100 pt-6"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Percent className="h-4 w-4 text-brand-royal" /> Commission and tax</h3><p className="mt-1 text-xs text-slate-500">Set the calculation method and applicable GST.</p></div>
        <label className={labelClass}>Calculation method<select value={form.calculationType} onChange={(e) => setForm({ ...form, calculationType: e.target.value })} className={inputClass}><option value="percentage">Percentage of confirmed disbursement</option><option value="fixed">Fixed amount</option></select></label>
        <label className={labelClass}>{form.calculationType === "percentage" ? "Commission percentage" : "Commission amount"}<span className="relative mt-2 block"><input type="number" required min="0.01" max={form.calculationType === "percentage" ? 100 : undefined} step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0.00" className={`${inputClass} mt-0 pr-12`} /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">{form.calculationType === "percentage" ? "%" : "₹"}</span></span></label>
        <label className={labelClass}>GST percentage<span className="relative mt-2 block"><input type="number" required min="0" max="100" step="0.01" value={form.gstPercentage} onChange={(e) => setForm({ ...form, gstPercentage: e.target.value })} placeholder="0" className={`${inputClass} mt-0 pr-12`} /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">%</span></span></label>

        <div className="sm:col-span-2 xl:col-span-3 border-t border-slate-100 pt-6"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><SlidersHorizontal className="h-4 w-4 text-brand-royal" /> Deductions and loan limits</h3><p className="mt-1 text-xs text-slate-500">Optional deductions and the loan amount range this rule can match.</p></div>
        <label className={labelClass}>Fixed deduction<input type="number" min="0" step="0.01" value={form.deductionFixed} onChange={(e) => setForm({ ...form, deductionFixed: e.target.value })} className={inputClass} /></label>
        <label className={labelClass}>Deduction percentage<span className="relative mt-2 block"><input type="number" min="0" max="100" step="0.01" value={form.deductionPercentage} onChange={(e) => setForm({ ...form, deductionPercentage: e.target.value })} className={`${inputClass} mt-0 pr-12`} /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">%</span></span></label>
        <label className={labelClass}>Minimum loan amount<input type="number" min="0" step="0.01" value={form.minimumLoanAmount} onChange={(e) => setForm({ ...form, minimumLoanAmount: e.target.value })} className={inputClass} /></label>
        <label className={labelClass}>Maximum loan amount <span className="font-normal text-slate-400">(optional)</span><input type="number" min="0" step="0.01" value={form.maximumLoanAmount} onChange={(e) => setForm({ ...form, maximumLoanAmount: e.target.value })} placeholder="No maximum" className={inputClass} /></label>

        <div className="sm:col-span-2 xl:col-span-3 border-t border-slate-100 pt-6"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays className="h-4 w-4 text-brand-royal" /> Validity</h3><p className="mt-1 text-xs text-slate-500">Leave dates empty for an open-ended rule.</p></div>
        <label className={labelClass}>Effective from<input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} className={inputClass} /></label>
        <label className={labelClass}>Effective to<input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} className={inputClass} /></label>
        <label className={labelClass}>Initial status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}><option value="inactive">Inactive</option><option value="active">Active</option></select></label>
      </div>
      <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><p className="max-w-2xl text-xs leading-5 text-slate-500">Exact partner and category rules take precedence over broader rules. Enter only owner-approved commission and tax terms.</p><button disabled={saving} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-royal px-6 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"><Plus className="h-4 w-4" />{saving ? "Saving…" : "Save commission rule"}</button></div>
    </form>

    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-slate-900">Configured rules</h2><p className="mt-1 text-sm text-slate-500">Review coverage, rates and active status.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">{rules.length} {rules.length === 1 ? "rule" : "rules"}</span></div>
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading commission rules…</div> : rules.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><p className="font-semibold text-slate-800">No commission rules yet</p><p className="mt-1 text-sm text-slate-500">Add an approved rule above to enable payout calculations.</p></div> : <div className="grid gap-3">{rules.map((rule) => <article key={rule._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2.5"><h3 className="text-base font-bold text-slate-900">{rule.name}</h3><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${rule.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${rule.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />{rule.status}</span></div><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">Partner · {scopeName(rule.partnerCode, "All partners")}</span><span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">Category · {scopeName(rule.loanCategory, "All categories")}</span><span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">Lender · {scopeName(rule.bankName, "All institutions")}</span></div></div><div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end"><div className="text-left sm:text-right"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Commission</p><p className="mt-0.5 text-xl font-extrabold text-slate-900">{rule.calculationType === "percentage" ? `${rule.value}%` : `₹${Number(rule.value).toLocaleString("en-IN")}`}</p></div><button onClick={() => toggle(rule)} className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${rule.status === "active" ? "border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>Set {rule.status === "active" ? "inactive" : "active"}</button></div></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-4"><div><p className="text-slate-400">GST</p><p className="mt-1 font-semibold text-slate-700">{rule.gstPercentage}%</p></div><div><p className="text-slate-400">Deductions</p><p className="mt-1 font-semibold text-slate-700">{rule.deductionPercentage || 0}% + ₹{Number(rule.deductionFixed || 0).toLocaleString("en-IN")}</p></div><div><p className="text-slate-400">Loan amount</p><p className="mt-1 font-semibold text-slate-700">₹{Number(rule.minimumLoanAmount || 0).toLocaleString("en-IN")} – {rule.maximumLoanAmount == null ? "No limit" : `₹${Number(rule.maximumLoanAmount).toLocaleString("en-IN")}`}</p></div><div><p className="text-slate-400">Effective period</p><p className="mt-1 font-semibold text-slate-700">{prettyDate(rule.effectiveFrom)} – {prettyDate(rule.effectiveTo)}</p></div></div></article>)}</div>}
    </section>
    <aside className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-900">Commission values and tax terms must match owner-approved business terms. This screen does not supply legal or commercial terms.</aside>
  </div>;
};
