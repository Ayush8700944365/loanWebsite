import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import { leadDocumentsApi, leadsApi, loanCategoriesApi, partnersApi } from "../../services/api";
import { formatLeadUid } from "../../utils/leadIds";
import { AlertCircle, CheckCircle2, Clock3, Download, Eye, FileText, ShieldCheck, UploadCloud } from "lucide-react";

const statusLabel = (doc) => doc.status || (doc.verified ? "approved" : "pending");
const sizeLabel = (size = 0) => `${(size / 1024 / 1024).toFixed(2)} MB`;

export const LeadDocumentsWorkspace = ({ employee = false }) => {
  const { showToast } = useApp();
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [selectedLeadCode, setSelectedLeadCode] = useState("");
  const [preview, setPreview] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadName, setUploadName] = useState("");
  const [customUploadName, setCustomUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [unavailableDocumentName, setUnavailableDocumentName] = useState("");
  const uploadFileInput = useRef(null);
  const [eligiblePartners, setEligiblePartners] = useState([]);
  const [loanCategories, setLoanCategories] = useState([]);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");
  const [documentList, setDocumentList] = useState({ leadCode: "", documents: [], requiredDocuments: [], policyConfigured: false });
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const documentRequestId = useRef(0);

  const scopedLeads = useMemo(() => leads, [leads]);
  const reloadLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const response = await leadsApi.getAll();
      setLeads((response.leads || []).map((lead) => ({ ...lead, id: lead.leadCode })));
    } finally {
      setLeadsLoading(false);
    }
  }, []);
  const reloadDocuments = useCallback(async (targetLeadCode) => {
    if (!targetLeadCode) return;
    const requestId = ++documentRequestId.current;
    setDocumentsLoading(true);
    try {
      const response = await leadDocumentsApi.getAll(targetLeadCode);
      if (requestId === documentRequestId.current) setDocumentList({ leadCode: targetLeadCode, documents: response.documents || [], requiredDocuments: response.requiredDocuments || [], policyConfigured: response.policyConfigured === true });
    } finally {
      if (requestId === documentRequestId.current) setDocumentsLoading(false);
    }
  }, []);
  useEffect(() => {
    reloadLeads().catch((err) => setError(`Unable to load authorized leads: ${err.message || "request failed."}`));
  }, [reloadLeads]);
  const selectedLead = scopedLeads.find((lead) => lead.leadCode === selectedLeadCode || lead.id === selectedLeadCode) || scopedLeads[0];
  const leadCode = selectedLead?.leadCode || selectedLead?.id;
  useEffect(() => {
    setUploadName("");
    setCustomUploadName("");
    setUploadDescription("");
    setUploadFile(null);
    setUnavailableDocumentName("");
    setPartnerCode("");
    setAssignmentNote("");
    if (uploadFileInput.current) uploadFileInput.current.value = "";
    setPreview((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }, [leadCode]);
  useEffect(() => {
    if (!leadCode) return;
    let cancelled = false;
    reloadDocuments(leadCode).catch((err) => { if (!cancelled) setError(`Unable to load documents for ${formatLeadUid(leadCode)}: ${err.message || "request failed."}`); });
    return () => { cancelled = true; };
  }, [leadCode, reloadDocuments]);
  const docs = documentList.leadCode === leadCode ? documentList.documents : [];
  const existingDocumentNames = [...new Set(docs.map((document) => document.name).filter(Boolean))];
  const requiredDocuments = documentList.leadCode === leadCode ? documentList.requiredDocuments : (selectedLead?.requiredDocuments || []);
  useEffect(() => { partnersApi.getEligible().then((result) => setEligiblePartners(result.partners || [])).catch((err) => setError(`Unable to load eligible partners: ${err.message || "request failed."}`)); }, []);
  useEffect(() => { loanCategoriesApi.getPublic().then((result) => setLoanCategories(result.categories || [])).catch((err) => setError(`Unable to load loan categories: ${err.message || "request failed."}`)); }, []);
  useEffect(() => { setCategoryDraft(selectedLead?.loanCategory || ""); }, [selectedLead?.leadCode, selectedLead?.loanCategory]);
  const missing = requiredDocuments.filter((name) => {
    const document = docs.find((item) => item.name.toLowerCase() === name.toLowerCase());
    return !document || statusLabel(document) !== "approved";
  });
  const pendingReviewDocuments = requiredDocuments.filter((name) => {
    const document = docs.find((item) => item.name.toLowerCase() === name.toLowerCase());
    return document && statusLabel(document) === "pending";
  });
  const notUploadedDocuments = requiredDocuments.filter((name) => !docs.some((item) => item.name.toLowerCase() === name.toLowerCase()));

  const run = async (action, successMessage) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await reloadLeads();
      await reloadDocuments(leadCode);
      showToast(successMessage, "success");
    } catch (err) {
      setError(err.message || "The document action failed.");
      showToast(err.message || "The document action failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const openPreview = async (doc) => {
    setBusy(true);
    setError("");
    try {
      const blob = await leadDocumentsApi.preview(leadCode, doc.documentId || doc._id);
      const url = URL.createObjectURL(blob);
      setPreview((old) => {
        if (old?.url) URL.revokeObjectURL(old.url);
        return { ...doc, url };
      });
    } catch (err) {
      if (/no longer present|not present in private storage/i.test(err.message || "")) {
        setUnavailableDocumentName(doc.name);
        setUploadName(doc.name);
      }
      setError(err.message || "Unable to preview document.");
    } finally {
      setBusy(false);
    }
  };

  const download = async (doc) => {
    setBusy(true);
    try {
      const blob = await leadDocumentsApi.download(leadCode, doc.documentId || doc._id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.fileName || `${doc.name}.${doc.mimeType === "application/pdf" ? "pdf" : doc.mimeType === "image/webp" ? "webp" : "jpg"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      if (/no longer present|not present in private storage/i.test(err.message || "")) {
        setUnavailableDocumentName(doc.name);
        setUploadName(doc.name);
      }
      setError(err.message || "Unable to download document.");
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!reviewing) return;
    await run(() => leadDocumentsApi.review(leadCode, reviewing.documentId || reviewing._id, { status: reviewing.status, rejectionReason: reason }), "Document review saved.");
    setReviewing(null);
    setReason("");
  };

  const uploadMissing = async (name, file, description = "") => {
    if (!file) return;
    const body = new FormData();
    body.append("documents", file, file.name);
    body.append("documentTypes", JSON.stringify([{ name, type: "Employee upload", description }]));
    setBusy(true);
    setError("");
    try {
      await leadDocumentsApi.upload(leadCode, body, setUploadProgress);
      await reloadLeads();
      await reloadDocuments(leadCode);
      setUploadFile(null);
      setUnavailableDocumentName("");
      if (uploadFileInput.current) uploadFileInput.current.value = "";
      setUploadName("");
      setUploadDescription("");
      setCustomUploadName("");
      showToast(`${name} uploaded. It is now waiting for Admin review.`, "success");
    } catch (err) {
      setError(err.message || "Unable to upload document.");
    } finally {
      setBusy(false);
      setUploadProgress(0);
    }
  };

  const saveLeadCategory = async () => {
    if (!leadCode || !categoryDraft || categoryDraft === selectedLead?.loanCategory) return;
    setCategorySaving(true);
    setError("");
    try {
      await leadsApi.update(leadCode, { loanCategory: categoryDraft });
      await reloadLeads();
      await reloadDocuments(leadCode);
      showToast("Loan category corrected. Document requirements have been refreshed.", "success");
    } catch (err) {
      setError(err.message || "Unable to update the loan category.");
    } finally { setCategorySaving(false); }
  };

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-rose-50/60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><FileText className="h-5 w-5" /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">Secure workspace</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">Customer Documents</h1>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">Review, upload and track documents privately. Access is limited to administrators and the employee assigned to the lead.</p>
          </div>
        </div>
        <label className="w-full text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:w-auto">Select lead
          <select className="mt-1.5 block w-full min-w-64 max-w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold normal-case tracking-normal text-slate-800 shadow-sm outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-50 sm:min-w-80" value={leadCode || ""} onChange={(event) => setSelectedLeadCode(event.target.value)}>
            {scopedLeads.map((lead) => <option key={lead.leadCode || lead.id} value={lead.leadCode || lead.id}>{lead.customerName} - {formatLeadUid(lead.leadCode || lead.id)}</option>)}
          </select>
        </label>
      </header>

      {error && <p role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {leadsLoading && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading authorized leads…</p>}
      {!leadsLoading && !selectedLead && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">No authorized leads are available.</p>}
      {selectedLead && <>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-sm shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-slate-900">{selectedLead.customerName}</h2><span className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] font-bold text-slate-600">{formatLeadUid(leadCode)}</span></div><p className="mt-1 text-xs text-slate-500">{selectedLead.loanCategory || "Loan category not set"} <span className="px-1 text-slate-300">·</span> {selectedLead.employmentType || "Employment type not set"}</p>
          <p className="mt-2 text-xs text-slate-500">{requiredDocuments.length ? `${requiredDocuments.length} required document${requiredDocuments.length === 1 ? "" : "s"}` : "No matching required-document policy"}</p>
          {!!requiredDocuments.length && <div aria-label="Required document checklist" className="mt-3 flex flex-wrap gap-2">{requiredDocuments.map((name) => {
            const document = docs.find((item) => item.name.toLowerCase() === name.toLowerCase());
            const status = document ? statusLabel(document) : "not uploaded";
            const style = status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "pending" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-600";
            const Icon = status === "approved" ? CheckCircle2 : status === "pending" ? Clock3 : AlertCircle;
            return <span key={name} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold ${style}`}><Icon className="h-3.5 w-3.5"/>{name}<span className="opacity-70">· {status.replaceAll("_", " ")}</span></span>;
          })}</div>}
          </div>
          <div className="space-y-4 p-4 sm:p-6">
          {!documentsLoading && documentList.leadCode === leadCode && !documentList.policyConfigured && <div role="alert" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"><p>No required-document policy matches <strong>{selectedLead.loanCategory || "this loan category"}</strong> and <strong>{selectedLead.employmentType || "this employment type"}</strong>. Check that the lead category is correct. Required documents are never guessed.</p>{!employee && <a href="/admin/loan-categories" className="mt-2 inline-block font-bold underline">Open Loan Categories to configure this policy</a>}{employee && <p className="mt-2">Ask an Admin to add approved requirements under Loan Categories, then return here. Verification and partner assignment unlock after all requirements are approved.</p>}<div className="mt-3 flex flex-wrap items-end gap-2"><label className="min-w-64 flex-1 font-semibold">Correct lead loan category<select value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} disabled={selectedLead.currentStatus === "Verified"} className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100">{loanCategories.map((category) => <option key={category._id || category.slug} value={category.name}>{category.name}</option>)}</select></label><button type="button" disabled={categorySaving || selectedLead.currentStatus === "Verified" || !categoryDraft || categoryDraft === selectedLead.loanCategory} onClick={saveLeadCategory} className="rounded-lg bg-amber-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{categorySaving ? "Saving…" : "Save category"}</button></div></div>}
          {employee && <div className="mt-3 space-y-3 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 shadow-sm sm:p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><UploadCloud className="h-4 w-4 text-blue-700"/>Upload customer documents</p>
            {unavailableDocumentName && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-800"><strong>{unavailableDocumentName}</strong> ki saved file storage mein nahi mili. Same document select karke replacement upload karein; upload Admin review ke liye pending rahega.</p>}
            <p className="text-[11px] text-slate-600">Employee uploads stay pending until an Admin reviews them in Admin → Document Verification. Employees cannot approve their own uploads.</p>
            {!!pendingReviewDocuments.length && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-900">Waiting for Admin approval: {pendingReviewDocuments.join(", ")}. Open Admin → Document Verification, approve these files, then refresh this page.</p>}
            {!!notUploadedDocuments.length && <p className="text-[11px] text-slate-600">Still needed: {notUploadedDocuments.join(", ")}.</p>}
            {documentList.policyConfigured && missing.length === 0 && <p className="text-xs text-slate-500">All configured required documents are approved.</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">Document name/type<select value={uploadName} onChange={(event) => setUploadName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">Select a document</option>{!!missing.length && <optgroup label="Missing or awaiting approval">{missing.map((name) => <option key={`missing-${name}`} value={name}>{name}</option>)}</optgroup>}{!!existingDocumentNames.length && <optgroup label="Replace an uploaded document">{existingDocumentNames.map((name) => <option key={`replace-${name}`} value={name}>{name}{name === unavailableDocumentName ? " · file missing" : " · replace file"}</option>)}</optgroup>}<option value="Other">Other document</option></select></label>
              {uploadName === "Other" && <label className="text-xs font-semibold text-slate-700">Document name<input maxLength={80} value={customUploadName} onChange={(event) => setCustomUploadName(event.target.value)} placeholder="Enter document name" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" /></label>}
              <label className="text-xs font-semibold text-slate-700">Short note (optional)<input maxLength={500} value={uploadDescription} onChange={(event) => setUploadDescription(event.target.value)} placeholder="Add context for the reviewer" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" /></label>
              <label className="text-xs font-semibold text-slate-700">Document file<span className="mt-1.5 flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-blue-200 bg-white px-3 py-2 text-xs transition hover:border-blue-400 hover:bg-blue-50/50"><UploadCloud className="h-4 w-4 shrink-0 text-blue-600"/><span className="min-w-0 flex-1 truncate text-slate-600">{uploadFile?.name || "Choose a PDF or image"}</span><span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1.5 font-bold text-blue-700">Browse</span><input ref={uploadFileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => setUploadFile(event.target.files?.[0] || null)} className="sr-only" /></span><span className="mt-1 block text-[10px] font-normal text-slate-400">PDF, JPG, PNG or WebP</span></label>
            </div>
            <button type="button" disabled={busy || !uploadName || !uploadFile || (uploadName === "Other" && !customUploadName.trim())} onClick={() => uploadMissing(uploadName === "Other" ? customUploadName.trim() : uploadName, uploadFile, uploadDescription)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"><UploadCloud className="h-4 w-4"/>{busy ? "Uploading…" : existingDocumentNames.includes(uploadName) ? "Upload replacement for review" : "Upload for review"}</button>
            {busy && uploadProgress > 0 && <div><div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-500"><span>Uploading securely</span><span>{uploadProgress}%</span></div><progress value={uploadProgress} max="100" className="h-1.5 w-full accent-blue-700" /></div>}
          </div>}
          {selectedLead.currentStatus !== "Verified" && <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4"><button disabled={busy || documentsLoading || !documentList.policyConfigured || missing.length > 0} onClick={() => run(() => leadDocumentsApi.verifyLead(leadCode), "Lead verification completed.")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"><ShieldCheck className="h-4 w-4"/>Verify lead</button><p className="text-[11px] leading-5 text-slate-600">{!documentList.policyConfigured ? "Blocked: Admin must configure a document policy for this loan category." : missing.length ? pendingReviewDocuments.length ? `Waiting for Admin approval: ${pendingReviewDocuments.join(", ")}.` : `Upload required documents: ${missing.join(", ")}.` : "All required documents are approved. This lead is ready for verification."}</p></div>}
          {<div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[1fr_1fr_auto]"><div className="sm:col-span-3"><p className="text-sm font-bold text-slate-900">Partner assignment</p>{selectedLead.currentStatus !== "Verified" && <p className="mt-1 text-[11px] text-amber-700">Assignment unlocks after required documents are approved and this lead is verified.</p>}{selectedLead.currentStatus === "Verified" && !eligiblePartners.length && <p className="mt-1 text-[11px] text-amber-700">No active, Admin-approved partners with approved bank details are available for assignment.</p>}</div><label className="text-xs font-semibold text-slate-700">Assign to approved partner<select disabled={selectedLead.currentStatus !== "Verified" || !eligiblePartners.length} value={partnerCode} onChange={(event) => setPartnerCode(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 disabled:bg-slate-100"><option value="">Choose partner</option>{eligiblePartners.map((partner) => <option key={partner.partnerCode} value={partner.partnerCode}>{partner.companyName || partner.name} · {partner.partnerCode}</option>)}</select></label><label className="text-xs font-semibold text-slate-700">Internal assignment note (optional)<input disabled={selectedLead.currentStatus !== "Verified" || !eligiblePartners.length} maxLength={1000} value={assignmentNote} onChange={(event) => setAssignmentNote(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 disabled:bg-slate-100" placeholder="Visible to authorized CRM staff" /></label><button disabled={busy || selectedLead.currentStatus !== "Verified" || !partnerCode} onClick={() => run(async () => { await leadsApi.assignPartner(leadCode, partnerCode, assignmentNote); setAssignmentNote(""); }, "Lead assigned to partner.")} className="self-end rounded-xl bg-blue-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40">Assign partner</button>{selectedLead.partnerName && <span className="text-xs text-slate-500 sm:col-span-3">Current partner: {selectedLead.partnerName}</span>}</div>}
          </div>
        </div>

        {documentsLoading && <p className="flex items-center gap-2 rounded-xl bg-white p-4 text-xs text-slate-500"><Clock3 className="h-4 w-4 animate-pulse"/>Loading document records…</p>}
        {!!docs.length && <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => <article key={doc.documentId || doc._id} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">{doc.name}</h2><p className="mt-1 break-all text-xs text-slate-500">{doc.fileName || "Legacy document metadata"}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusLabel(doc) === "approved" ? "bg-emerald-50 text-emerald-700" : statusLabel(doc) === "rejected" || statusLabel(doc) === "reupload_requested" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{statusLabel(doc).replaceAll("_", " ")}</span></div>
            <p className="mt-2 text-[11px] text-slate-500">Version {doc.version || 1} · {sizeLabel(doc.size)} · {doc.uploadedByRole || "legacy"}</p>
            {doc.rejectionReason && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{doc.rejectionReason}</p>}
            {doc.description && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Note: {doc.description}</p>}
            {doc.hasFile && <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3"><button disabled={busy || !(doc.documentId || doc._id)} onClick={() => openPreview(doc)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50"><Eye className="h-3.5 w-3.5"/>Preview</button><button disabled={busy || !(doc.documentId || doc._id)} onClick={() => download(doc)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50"><Download className="h-3.5 w-3.5"/>Download</button></div>}
            {employee && ["rejected", "reupload_requested"].includes(statusLabel(doc)) && <label className="mt-3 block text-xs font-semibold">Upload replacement<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={busy} className="mt-1 block" onChange={(event) => uploadMissing(doc.name, event.target.files?.[0], doc.description || "")} /></label>}
            {!employee && (doc.documentId || doc._id) && <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <button disabled={busy} onClick={() => run(() => leadDocumentsApi.review(leadCode, doc.documentId || doc._id, { status: "approved" }), "Document approved.")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve</button>
              <button disabled={busy} onClick={() => { setReviewing({ ...doc, status: "rejected" }); setReason(""); }} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Reject</button>
              <button disabled={busy} onClick={() => { setReviewing({ ...doc, status: "reupload_requested" }); setReason(""); }} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-50">Request re-upload</button>
            </div>}
            {!!doc.history?.length && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">Version history ({doc.history.length})</summary><ul className="mt-2 space-y-1">{doc.history.map((version) => <li key={version.version}>v{version.version}: {version.fileName} · {version.status}</li>)}</ul></details>}
          </article>)}
        </div>}
        {!documentsLoading && !docs.length && <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500"><FileText className="h-5 w-5"/></span><h2 className="mt-3 text-sm font-bold text-slate-800">No documents uploaded yet</h2><p className="mt-1 text-xs text-slate-500">Uploaded customer files will appear here with their review status.</p></div>}
      </>}

      {reviewing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5"><h2 className="font-bold">{reviewing.status === "rejected" ? "Reject document" : "Request a re-upload"}</h2><label className="mt-3 block text-xs font-semibold">Reason (required)<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label><div className="mt-4 flex justify-end gap-2"><button onClick={() => setReviewing(null)} className="rounded-lg px-3 py-2 text-xs">Cancel</button><button disabled={busy || !reason.trim()} onClick={submitReview} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Save review</button></div></div></div>}
      {preview && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white p-3"><div className="flex items-center justify-between pb-2"><strong>{preview.name} · {preview.fileName}</strong><button onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} className="rounded-lg px-3 py-2 text-sm">Close</button></div>{preview.mimeType?.startsWith("image/") ? <img src={preview.url} alt={preview.name} className="min-h-0 flex-1 object-contain" /> : <iframe title={preview.name} src={preview.url} className="min-h-0 flex-1" />}</div></div>}
    </section>
  );
};
