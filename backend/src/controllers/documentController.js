import { createReadStream } from "fs";
import { mkdir, writeFile, unlink, mkdtemp, readFile, rm } from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { promisify } from "util";
import { pipeline } from "stream";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import DocumentTemplate from "../models/DocumentTemplate.js";
import GeneratedDocument from "../models/GeneratedDocument.js";
import Lead from "../models/Lead.js";
import Invoice from "../models/Invoice.js";
import { DOCUMENT_STORAGE_DIR } from "../services/leadDocumentService.js";

const pipe = promisify(pipeline);
const runFile = promisify(execFile);
const MAX_TEMPLATE_SIZE = 10 * 1024 * 1024;
const allowedKeys = new Set(["leadCode", "customerName", "phone", "email", "loanCategory", "loanAmount", "disbursedAmount", "partnerName", "invoiceNumber", "invoiceDate", "invoiceAmount", "bankName", "gstNumber", "annexureNumber"]);
const safeName = (value) => String(value || "document").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);

async function convertDocxToPdf(inputPath, outputDir) {
  const outputPath = path.join(outputDir, "template.pdf");
  const executable = process.env.LIBREOFFICE_PATH || (process.platform === "win32" ? "soffice.exe" : "soffice");
  try {
    await runFile(executable, ["--headless", "--convert-to", "pdf", "--outdir", outputDir, inputPath], { timeout: 60_000, windowsHide: true, maxBuffer: 1024 * 1024 });
    return await readFile(outputPath);
  } catch (error) {
    if (error.code !== "ENOENT" || process.platform !== "win32") throw error;
  }

  // Windows hosts with Microsoft Word can convert DOCX without installing LibreOffice.
  const quotePs = (value) => `'${value.replace(/'/g, "''")}'`;
  const scriptPath = path.join(outputDir, "convert.ps1");
  const script = `$ErrorActionPreference = 'Stop'\n$word = $null\n$doc = $null\ntry {\n  $word = New-Object -ComObject Word.Application\n  $word.Visible = $false\n  $word.DisplayAlerts = 0\n  $doc = $word.Documents.Open(${quotePs(inputPath)}, $false, $true, $false)\n  $doc.ExportAsFixedFormat(${quotePs(outputPath)}, 17)\n} finally {\n  if ($doc -ne $null) { $doc.Close(0) }\n  if ($word -ne $null) { $word.Quit() }\n}\n`;
  await writeFile(scriptPath, script, { flag: "wx", mode: 0o600 });
  await runFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { timeout: 60_000, windowsHide: true, maxBuffer: 1024 * 1024 });
  return readFile(outputPath);
}

function parseFieldSpecs(raw, pageCount) {
  let specs;
  try { specs = JSON.parse(raw || "[]"); } catch { throw Object.assign(new Error("Field positions must be valid JSON."), { statusCode: 400 }); }
  if (!Array.isArray(specs) || specs.length > 100) throw Object.assign(new Error("Provide at most 100 template fields."), { statusCode: 400 });
  const keys = new Set();
  return specs.map((field) => {
    if (!allowedKeys.has(field?.key) || keys.has(field.key)) throw Object.assign(new Error(`Unknown or duplicate template field: ${field?.key || "(blank)"}.`), { statusCode: 400 });
    const page = Number(field.page), x = Number(field.x), y = Number(field.y), size = Number(field.size || 10);
    if (!Number.isInteger(page) || page < 0 || page >= pageCount || ![x, y, size].every(Number.isFinite) || x < 0 || y < 0 || size < 6 || size > 36) throw Object.assign(new Error(`Invalid page or coordinates for template field ${field.key}.`), { statusCode: 400 });
    keys.add(field.key);
    return { key: field.key, page, x, y, size };
  });
}

export async function listTemplates(_req, res) {
  const templates = await DocumentTemplate.find().select("-storageKey").sort({ kind: 1, name: 1, version: -1 });
  return res.json({ success: true, templates, allowedKeys: [...allowedKeys] });
}

export async function uploadTemplate(req, res) {
  let storageKey;
  let conversionDir;
  try {
    const file = req.file;
    const kind = req.body?.kind;
    const name = String(req.body?.name || "").trim();
    const approvalNote = String(req.body?.approvalNote || "").trim().slice(0, 500);
    if (!file || !["invoice", "mou"].includes(kind) || !name || name.length > 120) return res.status(400).json({ success: false, message: "Template PDF or DOCX, kind and a name of up to 120 characters are required." });
    if (file.size > MAX_TEMPLATE_SIZE) return res.status(413).json({ success: false, message: "Template files cannot exceed 10 MB." });
    const extension = path.extname(file.originalname || "").toLowerCase();
    let pdfBytes = file.buffer;
    if (extension === ".docx") {
      if (file.buffer.subarray(0, 2).toString("ascii") !== "PK" || !["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"].includes(file.mimetype)) return res.status(400).json({ success: false, message: "Upload a valid DOCX Word template." });
      conversionDir = await mkdtemp(path.join(os.tmpdir(), "cred-template-"));
      const inputPath = path.join(conversionDir, "template.docx");
      await writeFile(inputPath, file.buffer, { flag: "wx", mode: 0o600 });
      try {
        pdfBytes = await convertDocxToPdf(inputPath, conversionDir);
      } catch (error) {
        const unavailable = error.code === "ENOENT";
        return res.status(unavailable ? 503 : 400).json({ success: false, message: unavailable ? "DOCX conversion is unavailable. Install LibreOffice or Microsoft Word on the server, or configure LIBREOFFICE_PATH." : "The DOCX file could not be converted. Check that it is a valid, unprotected Word document." });
      }
      if (pdfBytes.length > MAX_TEMPLATE_SIZE) return res.status(413).json({ success: false, message: "Converted PDF cannot exceed 10 MB." });
    } else if (extension !== ".pdf" || file.mimetype !== "application/pdf" || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return res.status(400).json({ success: false, message: "Upload a valid PDF or DOCX template." });
    }
    let pdf;
    try { pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false }); } catch { return res.status(400).json({ success: false, message: "PDF template is invalid, encrypted, or unsupported." }); }
    if (!pdf.getPageCount() || pdf.getPageCount() > 30) return res.status(400).json({ success: false, message: "PDF templates must contain 1 to 30 pages." });
    const fieldSpecs = parseFieldSpecs(req.body.fieldSpecs, pdf.getPageCount());
    for (const field of fieldSpecs) {
      const page = pdf.getPage(field.page);
      if (field.x >= page.getWidth() || field.y >= page.getHeight()) return res.status(400).json({ success: false, message: `Field ${field.key} is outside page bounds.` });
    }
    const version = (await DocumentTemplate.find({ kind, name }).sort({ version: -1 }).select("version").limit(1))[0]?.version + 1 || 1;
    storageKey = `${randomUUID()}.pdf`;
    await mkdir(DOCUMENT_STORAGE_DIR, { recursive: true, mode: 0o700 });
    await writeFile(path.join(DOCUMENT_STORAGE_DIR, storageKey), pdfBytes, { flag: "wx", mode: 0o600 });
    const template = await DocumentTemplate.create({ name, kind, version, storageKey, fieldSpecs, status: "inactive", approvalNote, uploadedBy: req.user._id });
    return res.status(201).json({ success: true, message: "Template uploaded as inactive. Review it before activation.", template: template.toJSON() });
  } catch (error) {
    if (storageKey) await unlink(path.join(DOCUMENT_STORAGE_DIR, storageKey)).catch(() => {});
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to upload template." });
  } finally {
    if (conversionDir) await rm(conversionDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function setTemplateStatus(req, res) {
  const template = await DocumentTemplate.findById(req.params.id).select("+storageKey");
  if (!template) return res.status(404).json({ success: false, message: "Template not found." });
  if (!["active", "inactive"].includes(req.body?.status)) return res.status(400).json({ success: false, message: "Status must be active or inactive." });
  if (req.body.status === "active") {
    if (!template.approvalNote.trim()) return res.status(409).json({ success: false, message: "Add an owner approval note confirming the uploaded template content is approved before activation." });
    await DocumentTemplate.updateMany({ kind: template.kind, status: "active" }, { $set: { status: "inactive" } });
    template.activatedBy = req.user._id;
    template.activatedAt = new Date();
  }
  template.status = req.body.status;
  await template.save();
  return res.json({ success: true, template: template.toJSON() });
}

const scopedLead = async (leadCode, user) => {
  const filter = { leadCode };
  if (user.role === "employee") {
    if (!user.employeeCode) return null;
    filter.assignedEmployeeId = user.employeeCode;
  } else if (user.role === "partner") {
    if (!user.partnerCode) return null;
    filter.partnerId = user.partnerCode;
  } else if (user.role !== "admin") return null;
  return Lead.findOne(filter);
};

export async function generateDocument(req, res) {
  let storageKey;
  try {
    const { leadCode, kind, invoiceId } = req.body || {};
    if (!leadCode || !["invoice", "mou"].includes(kind)) return res.status(400).json({ success: false, message: "Lead code and document kind (invoice or mou) are required." });
    if (req.user.role === "partner") return res.status(403).json({ success: false, message: "Partners may download generated documents for their own leads but cannot generate documents." });
    const lead = await scopedLead(leadCode, req.user);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found or access denied." });
    const template = await DocumentTemplate.findOne({ kind, status: "active" }).select("+storageKey");
    if (!template) return res.status(409).json({ success: false, code: "ACTIVE_TEMPLATE_REQUIRED", message: `No active ${kind.toUpperCase()} template. Upload and activate an owner-approved template first.` });
    let invoice = null;
    if (kind === "invoice") {
      const invoiceFilter = { leadId: lead.leadCode };
      invoice = invoiceId
        ? await Invoice.findOne({ _id: invoiceId, ...invoiceFilter })
        : await Invoice.findOne(invoiceFilter).sort({ createdAt: -1 });
      if (!invoice) return res.status(409).json({ success: false, message: "Create or select an invoice for this lead before generating the invoice PDF." });
    }
    const templateBytes = await PDFDocument.load(await import("fs/promises").then(({ readFile }) => readFile(path.join(DOCUMENT_STORAGE_DIR, template.storageKey))));
    const font = await templateBytes.embedFont(StandardFonts.Helvetica);
    const values = {
      leadCode: lead.leadCode, customerName: lead.customerName, phone: lead.phone, email: lead.email,
      loanCategory: lead.loanCategory, loanAmount: String(lead.loanAmount || ""), disbursedAmount: String(lead.loanPayoutAmount || lead.disbursementUpdate?.amount || ""),
      partnerName: lead.partnerName, invoiceNumber: invoice?.invoiceNumber || "", invoiceDate: invoice?.invoiceDate ? new Date(invoice.invoiceDate).toISOString().slice(0, 10) : "",
      invoiceAmount: invoice ? String(invoice.invoiceAmount) : "", bankName: invoice?.bankName || "", gstNumber: invoice?.gstNumber || "", annexureNumber: invoice?.annexureNumber || "",
    };
    for (const field of template.fieldSpecs) {
      const page = templateBytes.getPage(field.page);
      page.drawText(String(values[field.key] ?? ""), { x: field.x, y: field.y, size: field.size, font, color: rgb(0.08, 0.12, 0.2), maxWidth: page.getWidth() - field.x });
    }
    const bytes = Buffer.from(await templateBytes.save());
    storageKey = `${randomUUID()}.pdf`;
    await mkdir(DOCUMENT_STORAGE_DIR, { recursive: true, mode: 0o700 });
    await writeFile(path.join(DOCUMENT_STORAGE_DIR, storageKey), bytes, { flag: "wx", mode: 0o600 });
    const doc = await GeneratedDocument.create({
      documentCode: `DOC-${randomUUID()}`, kind, leadCode, partnerCode: lead.partnerId || "", templateId: template._id, templateVersion: template.version,
      invoiceId: invoice?._id || null, storageKey, fileName: `${safeName(kind)}_${safeName(lead.leadCode)}.pdf`, size: bytes.length, generatedBy: req.user._id,
    });
    return res.status(201).json({ success: true, document: doc.toJSON() });
  } catch (error) {
    if (storageKey) await unlink(path.join(DOCUMENT_STORAGE_DIR, storageKey)).catch(() => {});
    console.error("PDF generation failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to generate document from the active template." });
  }
}

export async function listGeneratedDocuments(req, res) {
  try {
    const { leadCode } = req.query;
    let filter = {};
    if (req.user.role === "partner") filter.partnerCode = req.user.partnerCode;
    else if (req.user.role === "employee") filter.leadCode = { $in: await Lead.find({ assignedEmployeeId: req.user.employeeCode }).distinct("leadCode") };
    else if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Not authorized." });
    if (leadCode) {
      const lead = await scopedLead(leadCode, req.user);
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found or access denied." });
      filter.leadCode = leadCode;
    }
    const documents = await GeneratedDocument.find(filter).select("-storageKey").sort({ generatedAt: -1 }).limit(250);
    return res.json({ success: true, documents });
  } catch (error) { return res.status(500).json({ success: false, message: "Unable to list generated documents." }); }
}

export async function downloadGeneratedDocument(req, res) {
  try {
    const doc = await GeneratedDocument.findOne({ documentCode: req.params.documentCode }).select("+storageKey");
    if (!doc) return res.status(404).json({ success: false, message: "Generated document not found." });
    if (req.user.role === "partner" && (!req.user.partnerCode || doc.partnerCode !== req.user.partnerCode)) return res.status(404).json({ success: false, message: "Generated document not found." });
    if (req.user.role === "employee") {
      const ownsLead = await Lead.exists({ leadCode: doc.leadCode, assignedEmployeeId: req.user.employeeCode });
      if (!ownsLead) return res.status(404).json({ success: false, message: "Generated document not found." });
    } else if (!['admin', 'partner'].includes(req.user.role)) return res.status(403).json({ success: false, message: "Not authorized." });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${safeName(doc.fileName)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    await pipe(createReadStream(path.join(DOCUMENT_STORAGE_DIR, doc.storageKey)), res);
  } catch (error) { if (!res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: "Unable to download generated document." }); }
}

export async function downloadTemplate(req, res) {
  try {
    const template = await DocumentTemplate.findById(req.params.id).select("+storageKey");
    if (!template) return res.status(404).json({ success: false, message: "Template not found." });
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${safeName(template.name)}_v${template.version}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    await pipe(createReadStream(path.join(DOCUMENT_STORAGE_DIR, template.storageKey)), res);
  } catch (error) { if (!res.headersSent) res.status(error.code === "ENOENT" ? 404 : 500).json({ success: false, message: "Unable to download template." }); }
}
