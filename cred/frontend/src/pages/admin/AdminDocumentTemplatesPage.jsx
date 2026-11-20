import React, { useCallback, useEffect, useState } from "react";
import { documentsApi, invoicesApi, leadsApi } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { formatLeadUid } from "../../utils/leadIds";

const fieldKeys = ["leadCode", "customerName", "phone", "email", "loanCategory", "loanAmount", "disbursedAmount", "partnerName", "invoiceNumber", "invoiceDate", "invoiceAmount", "bankName", "gstNumber", "annexureNumber"];
const saveBlob = (blob, name) => { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); };

export const AdminDocumentTemplatesPage = () => {
  const { showToast } = useApp();
  const [templates, setTemplates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [leads, setLeads] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [kind, setKind] = useState("invoice");
  const [selectedLead, setSelectedLead] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [invoiceForm, setInvoiceForm] = useState({ invoiceAmount: "", bankName: "", gstNumber: "", annexureNumber: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [name, setName] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [fieldSpecs, setFieldSpecs] = useState([]);
  const [fieldJson, setFieldJson] = useState("[]");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [templateResult, docResult, leadResult, invoiceResult] = await Promise.all([documentsApi.getTemplates(), documentsApi.getGenerated(), leadsApi.getAll({ limit: 100 }), invoicesApi.getAll()]);
      setTemplates(templateResult.templates || []); setDocuments(docResult.documents || []); setLeads(leadResult.leads || []); setInvoices(invoiceResult.invoices || []); setError("");
    } catch (err) { setError(err.message || "Templates and generated documents could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const upload = async (event) => {
    event.preventDefault(); if (!selectedFile) return setError("Select a PDF or DOCX template.");
    const parsed = fieldSpecs;
    if (!Array.isArray(parsed) || parsed.some((field) => !field.key || !Number.isInteger(Number(field.page)) || !Number.isFinite(Number(field.x)) || !Number.isFinite(Number(field.y))) || new Set(parsed.map((field) => field.key)).size !== parsed.length) return setError("Complete every field position and use each dynamic field only once.");
    const form = new FormData(); form.append("kind", kind); form.append("name", name); form.append("approvalNote", approvalNote); form.append("fieldSpecs", JSON.stringify(parsed)); form.append("template", selectedFile);
    setBusy(true); setError("");
    try { await documentsApi.uploadTemplate(form, setProgress); setName(""); setApprovalNote(""); setFieldSpecs([]); setFieldJson("[]"); setSelectedFile(null); showToast("Template uploaded inactive. Review and activate it to generate documents.", "success"); await load(); }
    catch (err) { setError(err.message || "Template upload failed."); }
    finally { setBusy(false); setProgress(0); }
  };
  const toggle = async (template) => {
    setBusy(true); setError("");
    try { await documentsApi.setTemplateStatus(template._id, template.status === "active" ? "inactive" : "active"); await load(); }
    catch (err) { setError(err.message || "Template status could not be changed."); }
    finally { setBusy(false); }
  };
  const generate = async () => {
    if (!selectedLead) return;
    if (kind === "invoice" && !selectedInvoiceId) return setError("Select or create an invoice for this lead first.");
    setBusy(true); setError("");
    try { await documentsApi.generate({ leadCode: selectedLead, kind, ...(kind === "invoice" ? { invoiceId: selectedInvoiceId } : {}) }); showToast(`${kind.toUpperCase()} PDF generated`, "success"); await load(); }
    catch (err) { setError(err.message || "Document generation failed."); }
    finally { setBusy(false); }
  };
  const createInvoice = async () => {
    if (!selectedLead || !Number(invoiceForm.invoiceAmount) || Number(invoiceForm.invoiceAmount) <= 0) return setError("Enter an invoice amount greater than zero.");
    setBusy(true); setError("");
    try {
      const result = await invoicesApi.create({ leadId: selectedLead, ...invoiceForm });
      setInvoices((current) => [result.invoice, ...current]);
      setSelectedInvoiceId(result.invoice._id);
      showToast("Invoice created and selected.", "success");
    } catch (err) { setError(err.message || "Invoice could not be created."); }
    finally { setBusy(false); }
  };
  const download = async (doc) => { try { saveBlob(await documentsApi.downloadGenerated(doc.documentCode), doc.fileName); } catch (err) { setError(err.message || "Download failed."); } };

  return <div className="mx-auto max-w-6xl space-y-6 pb-12"><header><h1 className="text-2xl font-extrabold text-brand-navy">Invoice & MOU Templates</h1><p className="mt-1 text-sm text-slate-600">Templates are stored as private PDFs. Word files are converted to PDF during upload. Dynamic fields are drawn onto uploaded approved content; no legal or commercial clauses are supplied by this portal.</p></header>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <form onSubmit={upload} className="space-y-4 rounded-2xl border bg-white p-5"><h2 className="font-bold">Upload new template version</h2><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Document type<select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="invoice">Invoice</option><option value="mou">MOU</option></select></label><label className="text-xs font-semibold">Template name<input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-xs font-semibold sm:col-span-2">Owner approval note (required before activation)<input required maxLength={500} value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-xs font-semibold sm:col-span-2">PDF or Word template (.pdf, .docx)<input required type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setError(""); }} className="mt-1 block w-full text-xs" /></label><div className="sm:col-span-2 rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold">Dynamic field placement</p><p className="mt-1 text-[11px] text-slate-500">Use the controls instead of writing JSON. Coordinates are PDF points measured from the bottom-left corner. Leave empty for a static PDF.</p></div><button type="button" onClick={() => setFieldSpecs((current) => [...current, { key: "customerName", page: 0, x: 80, y: 640, size: 11 }])} className="rounded-lg border px-3 py-2 text-xs font-bold">+ Add field</button></div>
          {fieldSpecs.map((field, index) => <div key={`${field.key}-${index}`} className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-6">
            <label className="col-span-2 text-[11px] font-semibold sm:col-span-2">Field<select value={field.key} onChange={(e) => setFieldSpecs((rows) => rows.map((row, i) => i === index ? { ...row, key: e.target.value } : row))} className="mt-1 w-full rounded border bg-white p-2">{fieldKeys.filter((key) => key === field.key || !fieldSpecs.some((other, otherIndex) => otherIndex !== index && other.key === key)).map((key) => <option key={key} value={key}>{key}</option>)}</select></label>
            {[ ["Page", "page"], ["X", "x"], ["Y", "y"], ["Font size", "size"] ].map(([label, key]) => <label key={key} className="text-[11px] font-semibold">{label}<input type="number" min={key === "size" ? 6 : 0} max={key === "size" ? 36 : undefined} step="1" value={field[key]} onChange={(e) => setFieldSpecs((rows) => rows.map((row, i) => i === index ? { ...row, [key]: Number(e.target.value) } : row))} className="mt-1 w-full rounded border p-2" /></label>)}
            <button type="button" onClick={() => setFieldSpecs((rows) => rows.filter((_, i) => i !== index))} className="self-end rounded border border-rose-200 px-2 py-2 text-xs text-rose-700">Remove</button>
          </div>)}
          <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-slate-600">Advanced: import field mapping JSON</summary><textarea value={fieldJson} onChange={(e) => setFieldJson(e.target.value)} rows={4} className="mt-2 w-full rounded-lg border p-2 font-mono text-xs" placeholder='[{"key":"customerName","page":0,"x":80,"y":640,"size":11}]' /><button type="button" onClick={() => { try { const parsed = JSON.parse(fieldJson || "[]"); if (!Array.isArray(parsed)) throw new Error(); setFieldSpecs(parsed); setError(""); } catch { setError("Advanced field mapping must be a valid JSON array."); } }} className="mt-2 rounded-lg border px-3 py-2 text-xs font-bold">Import JSON into fields</button></details>
        </div></div><p className="text-[11px] leading-5 text-slate-500">Available fields: {fieldKeys.join(", ")}. Static content, clauses, terms, taxes, and signatures must be supplied and legally/business approved by the owner. Uploaded template versions start inactive.</p><div className="flex items-center justify-between"><span className="text-xs text-slate-600">{busy && progress > 0 ? `Upload ${progress}%` : "PDF or DOCX up to 10 MB; converted PDF must be 1–30 pages"}</span><button disabled={busy} className="rounded-lg bg-brand-royal px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Upload template</button></div></form>
    <section className="rounded-2xl border bg-white"><h2 className="border-b p-4 font-bold">Template versions</h2>{loading ? <p className="p-5 text-sm text-slate-500">Loading…</p> : templates.length === 0 ? <p className="p-5 text-sm text-slate-500">No templates uploaded.</p> : <div className="divide-y">{templates.map((template) => <div key={template._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{template.name} · v{template.version} <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase">{template.kind} / {template.status}</span></p><p className="mt-1 text-xs text-slate-600">Fields: {template.fieldSpecs.map((field) => field.key).join(", ") || "none"} · {template.approvalNote || "No owner approval note"}</p></div><button disabled={busy} onClick={() => toggle(template)} className="rounded-lg border px-3 py-2 text-xs font-bold">Set {template.status === "active" ? "inactive" : "active"}</button></div>)}</div>}</section>
    <section className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="font-bold">Generate PDF from active template</h2><div className="flex flex-col gap-3 sm:flex-row"><select value={selectedLead} onChange={(e) => { setSelectedLead(e.target.value); setSelectedInvoiceId(""); setInvoiceForm({ invoiceAmount: "", bankName: "", gstNumber: "", annexureNumber: "" }); setError(""); }} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-sm"><option value="">Choose lead</option>{leads.map((lead) => <option key={lead.leadCode} value={lead.leadCode}>{formatLeadUid(lead.leadCode)} · {lead.customerName}</option>)}</select><select value={kind} onChange={(e) => { setKind(e.target.value); setError(""); }} className="rounded-lg border bg-white p-2 text-sm"><option value="invoice">Invoice</option><option value="mou">MOU</option></select><button disabled={busy || !selectedLead} onClick={generate} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Working…" : "Generate PDF"}</button></div>{kind === "invoice" && selectedLead && <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><label className="block text-xs font-semibold">Invoice to use<select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="">Choose invoice</option>{invoices.filter((invoice) => invoice.leadId === selectedLead).map((invoice) => <option key={invoice._id} value={invoice._id}>{invoice.invoiceNumber} · ₹{invoice.invoiceAmount}</option>)}</select></label>{invoices.some((invoice) => invoice.leadId === selectedLead) ? null : <p className="text-xs text-slate-600">This lead has no invoice yet. Create one below to continue.</p>}<div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold">Invoice amount *<input type="number" min="0.01" step="0.01" value={invoiceForm.invoiceAmount} onChange={(e) => setInvoiceForm((form) => ({ ...form, invoiceAmount: e.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" placeholder="Enter amount" /></label><label className="text-xs font-semibold">Bank name<input value={invoiceForm.bankName} onChange={(e) => setInvoiceForm((form) => ({ ...form, bankName: e.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-xs font-semibold">GST number<input value={invoiceForm.gstNumber} onChange={(e) => setInvoiceForm((form) => ({ ...form, gstNumber: e.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label><label className="text-xs font-semibold">Annexure number<input value={invoiceForm.annexureNumber} onChange={(e) => setInvoiceForm((form) => ({ ...form, annexureNumber: e.target.value }))} className="mt-1 w-full rounded-lg border bg-white p-2" /></label></div><button disabled={busy} onClick={createInvoice} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">{busy ? "Working…" : "Create and select invoice"}</button></div>}</section>
    <section className="overflow-x-auto rounded-2xl border bg-white"><h2 className="border-b p-4 font-bold">Generated document history</h2>{documents.length === 0 ? <p className="p-5 text-sm text-slate-500">No generated documents.</p> : <table className="w-full min-w-[640px] text-left text-xs"><thead><tr className="bg-slate-50 text-slate-500"><th className="p-3">Code</th><th className="p-3">Type / Lead</th><th className="p-3">Template version</th><th className="p-3">Generated</th><th className="p-3"></th></tr></thead><tbody className="divide-y">{documents.map((doc) => <tr key={doc._id}><td className="p-3 font-mono">{doc.documentCode}</td><td className="p-3">{doc.kind.toUpperCase()} · {formatLeadUid(doc.leadCode)}</td><td className="p-3">v{doc.templateVersion}</td><td className="p-3">{new Date(doc.generatedAt).toLocaleString()}</td><td className="p-3"><button onClick={() => download(doc)} className="font-bold text-brand-royal underline">Download</button></td></tr>)}</tbody></table>}</section>
  </div>;
};
