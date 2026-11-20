import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";

let tempRoot;
let service;
let parseDocumentTypes;

before(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "realcred-docs-test-"));
  process.env.DOCUMENT_STORAGE_PATH = tempRoot;
  process.env.MAX_FILE_SIZE = String(5 * 1024 * 1024);
  service = await import("../src/services/leadDocumentService.js");
  ({ parseDocumentTypes } = await import("../src/controllers/leadDocumentController.js"));
});

after(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("private document upload validation", () => {
  it("accepts and privately stores a PDF using a randomized filename", async () => {
    const file = { originalname: "customer.pdf", mimetype: "application/pdf", size: 9, buffer: Buffer.from("%PDF-1.7\n") };
    const result = await service.storeDocument(file);
    assert.match(result.storageKey, /^[0-9a-f-]{36}\.pdf$/i);
    assert.equal(path.dirname(result.absolutePath), tempRoot);
    assert.deepEqual(await readFile(result.absolutePath), file.buffer);
    await service.removeStoredDocument(result.storageKey);
  });

  it("validates JPEG and PNG file signatures", () => {
    const jpeg = service.validateDocumentFile({ originalname: "id.jpg", mimetype: "image/jpeg", size: 3, buffer: Buffer.from([0xff, 0xd8, 0xff]) });
    const png = service.validateDocumentFile({ originalname: "id.png", mimetype: "image/png", size: 8, buffer: Buffer.from("89504e470d0a1a0a", "hex") });
    const webp = service.validateDocumentFile({ originalname: "id.webp", mimetype: "image/webp", size: 12, buffer: Buffer.from("524946460400000057454250", "hex") });
    assert.equal(jpeg.valid, true);
    assert.equal(png.valid, true);
    assert.equal(webp.valid, true);
  });

  it("rejects MIME/extension mismatch and invalid content signatures", () => {
    const mismatch = service.validateDocumentFile({ originalname: "id.pdf", mimetype: "image/png", size: 8, buffer: Buffer.alloc(8) });
    const spoofed = service.validateDocumentFile({ originalname: "id.png", mimetype: "image/png", size: 8, buffer: Buffer.from("not png!") });
    assert.equal(mismatch.valid, false);
    assert.equal(spoofed.valid, false);
  });

  it("rejects a file beyond the configured per-file maximum", () => {
    const tooLarge = service.validateDocumentFile({ originalname: "id.pdf", mimetype: "application/pdf", size: 6 * 1024 * 1024, buffer: Buffer.from("%PDF-") });
    assert.equal(tooLarge.valid, false);
    assert.equal(tooLarge.tooLarge, true);
  });

  it("requires one valid document label per uploaded file", () => {
    assert.deepEqual(parseDocumentTypes('[{"name":"PAN","type":"Identity"}]', 1)[0], { name: "PAN", type: "Identity", description: "" });
    assert.throws(() => parseDocumentTypes("[]", 1), { statusCode: 400 });
  });
});

describe("document access control", () => {
  const lead = { assignedEmployeeId: "EMP-1" };
  it("allows an administrator", () => assert.equal(service.canAccessLeadDocuments(lead, { role: "admin" }), true));
  it("allows only the assigned employee", () => {
    assert.equal(service.canAccessLeadDocuments(lead, { role: "employee", employeeCode: "EMP-1" }), true);
    assert.equal(service.canAccessLeadDocuments(lead, { role: "employee", employeeCode: "EMP-2" }), false);
  });
  it("denies partners and unauthenticated users", () => {
    assert.equal(service.canAccessLeadDocuments(lead, { role: "partner", partnerCode: "PTR-1" }), false);
    assert.equal(service.canAccessLeadDocuments(lead, null), false);
  });
  it("resolves a document only inside the lead already authorized by the API", () => {
    const scopedLead = { documents: [{ documentId: "doc-a", name: "PAN" }] };
    assert.equal(service.getDocumentFromLead(scopedLead, "doc-a").name, "PAN");
    assert.equal(service.getDocumentFromLead(scopedLead, "doc-from-another-lead"), null);
  });
});

describe("review, re-upload and final verification rules", () => {
  it("records approval and requires reasons for rejection/re-upload", () => {
    const doc = { name: "PAN", version: 1 };
    service.reviewDocumentRecord(doc, { status: "approved", userId: "admin-1" });
    assert.equal(doc.verified, true);
    assert.equal(doc.reviews.length, 1);
    assert.throws(() => service.reviewDocumentRecord(doc, { status: "rejected", userId: "admin-1" }), { statusCode: 400 });
    service.reviewDocumentRecord(doc, { status: "rejected", rejectionReason: "Image unreadable", userId: "emp-1" });
    assert.equal(doc.verified, false);
    assert.equal(doc.rejectionReason, "Image unreadable");
  });

  it("starts replacements as pending and preserves prior version metadata", () => {
    const doc = { name: "PAN", version: 1, fileName: "old.pdf", storageKey: "old", mimeType: "application/pdf", size: 10, status: "approved", verified: true, history: [] };
    service.replaceDocumentVersion(doc, { fileName: "new.pdf", storageKey: "new", mimeType: "application/pdf", size: 12 }, "emp-1");
    assert.equal(doc.version, 2);
    assert.equal(doc.history[0].storageKey, "old");
    assert.equal(doc.status, "pending");
    assert.equal(doc.verified, false);
  });

  it("blocks final verification unless all configured requirements are approved", () => {
    const lead = { requiredDocuments: ["PAN", "Salary Slips"], documents: [{ name: "PAN", status: "approved" }] };
    assert.deepEqual(service.getMissingRequiredDocuments(lead), ["Salary Slips"]);
    assert.equal(service.isLeadDocumentVerificationReady(lead), false);
    lead.documents.push({ name: "Salary Slips", verified: true }); // legacy verified flag remains compatible
    assert.equal(service.isLeadDocumentVerificationReady(lead), true);
    assert.equal(service.isLeadDocumentVerificationReady({ requiredDocuments: [], documents: [] }), false);
  });

  it("resolves requirements by employment type", () => {
    const category = { documentRequirements: [
      { documentType: "PAN", employmentTypes: [] },
      { documentType: "Salary Slips", employmentTypes: ["Salaried"] },
      { documentType: "ITR", employmentTypes: ["Self-Employed"] },
    ] };
    assert.deepEqual(service.resolveRequiredDocumentTypes(category, "Salaried"), ["PAN", "Salary Slips"]);
    assert.deepEqual(service.resolveRequiredDocumentTypes(category, "Self-Employed"), ["PAN", "ITR"]);
  });
});
