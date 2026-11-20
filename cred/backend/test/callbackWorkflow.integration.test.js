import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const testUri = process.env.TEST_MONGO_URI || "";
const localMongo = (() => { try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(testUri).hostname); } catch { return false; } })();

describe("website callback support workflow", { skip: !localMongo }, () => {
  let server;
  let baseUrl;
  let User;
  let Ticket;
  let LoanCategory;
  let admin;
  let employee;
  let otherEmployee;
  let storage;
  const token = (user) => jwt.sign({ userId: user._id.toString(), tokenVersion: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "10m" });
  const request = (route, options = {}, user = null) => fetch(`${baseUrl}${route}`, { ...options, headers: { ...(user ? { Authorization: `Bearer ${token(user)}` } : {}), ...(options.headers || {}) } });

  before(async () => {
    if (!localMongo) return;
    process.env.JWT_SECRET = `callback-test-${randomUUID()}`;
    process.env.PARTNER_PII_ENCRYPTION_KEYS = JSON.stringify({ callbackTest: "c".repeat(64) });
    process.env.PARTNER_PII_ACTIVE_KEY_ID = "callbackTest";
    storage = await mkdtemp(path.join(os.tmpdir(), "realcred-callback-test-"));
    process.env.DOCUMENT_STORAGE_PATH = storage;
    const dbName = `realcred_callback_test_${randomUUID().replaceAll("-", "")}`;
    ({ default: User } = await import("../src/models/User.js"));
    ({ default: Ticket } = await import("../src/models/Ticket.js"));
    ({ default: LoanCategory } = await import("../src/models/LoanCategory.js"));
    await mongoose.connect(testUri, { dbName, serverSelectionTimeoutMS: 5000 });
    [admin, employee, otherEmployee] = await User.create([
      { name: "Callback Admin", email: `admin-${dbName}@test.local`, password: "test-password-123", role: "admin", status: "active" },
      { name: "Callback Employee", email: `employee-${dbName}@test.local`, password: "test-password-123", role: "employee", status: "active", employeeCode: `EMP-${dbName}` },
      { name: "Other Employee", email: `other-${dbName}@test.local`, password: "test-password-123", role: "employee", status: "active", employeeCode: `OTHER-${dbName}` },
    ]);
    await LoanCategory.create({ name: "Home Finance", slug: `home-finance-${dbName}`, status: "active", description: "Callback test category", documentRequirements: [] });
    const { createApp } = await import("../src/app.js");
    await new Promise((resolve, reject) => { server = createApp().listen(0, "127.0.0.1", resolve); server.once("error", reject); });
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
    if (storage) await rm(storage, { recursive: true, force: true });
  });

  it("validates, deduplicates, assigns, scopes and persists callbacks and internal follow-up", async () => {
    const idempotencyKey = randomUUID();
    const payload = { name: "Test Visitor", phone: "+1 317 555 0188", email: "visitor@test.local", loanCategory: "Home Finance", city: "Test City", loanAmount: 150000, message: "Please call after 4 PM.", idempotencyKey };
    const invalid = await request("/tickets/callback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, phone: "bad", idempotencyKey: randomUUID() }) });
    assert.equal(invalid.status, 400);

    const createdResponse = await request("/tickets/callback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.match(created.referenceId, /^RC-CB-/);
    assert.equal(await Ticket.countDocuments({ ticketType: "Callback" }), 1);

    const duplicate = await request("/tickets/callback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).duplicate, true);

    const adminTickets = await (await request("/tickets", {}, admin)).json();
    const callback = adminTickets.tickets.find((item) => item.ticketId === created.referenceId);
    assert.ok(callback);
    assert.equal((await request(`/tickets/${callback._id}/assign`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeCode: employee.employeeCode }) }, employee)).status, 403);
    assert.equal((await request(`/tickets/${callback._id}/assign`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeCode: employee.employeeCode }) }, admin)).status, 200);

    const assignedList = await (await request("/tickets", {}, employee)).json();
    assert.ok(assignedList.tickets.some((item) => item.ticketId === created.referenceId));
    const otherList = await (await request("/tickets", {}, otherEmployee)).json();
    assert.equal(otherList.tickets.some((item) => item.ticketId === created.referenceId), false);
    assert.equal((await request(`/tickets/${callback._id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: "Unauthorized note" }) }, otherEmployee)).status, 404);

    const note = await request(`/tickets/${callback._id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: "Called visitor; requested a morning callback." }) }, employee);
    assert.equal(note.status, 200);
    const status = await request(`/tickets/${callback._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "In Progress" }) }, employee);
    assert.equal(status.status, 200);
    const statusResolved = await request(`/tickets/${callback._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Resolved" }) }, employee);
    assert.equal(statusResolved.status, 200);

    const freshEmployeeToken = await request("/tickets", {}, employee);
    assert.equal(freshEmployeeToken.status, 200);
    const persisted = await Ticket.findOne({ ticketId: created.referenceId });
    assert.equal(persisted.assignedEmployeeId, employee.employeeCode);
    assert.equal(persisted.assignmentHistory.length, 1);
    assert.equal(persisted.internalNotes[0].text, "Called visitor; requested a morning callback.");
    assert.equal(persisted.status, "Resolved");
    assert.equal(persisted.statusHistory.length, 3);
  });

  it("lets Admin correct partner details and privately upload/review replacement KYC without auto-approval", async () => {
    const { encryptPartnerValue } = await import("../src/services/partnerSensitiveData.js");
    const partner = await User.create({ name: "Review Partner", email: "partner-review@test.local", username: "partner_review", password: "Original-Partner-2026!", role: "partner", status: "pending", partnerApprovalStatus: "pending", partnerCode: "PTR-CALLBACK-TEST", companyName: "Review Firm", contactPerson: "Review Contact", phone: "9876500100", partnerType: "DSA", businessType: "Consulting", panNo: "ABCDE1234F", gstNo: "22AAAAA0000A1Z5", address: "Registered road", communicationAddress: "Mailing road", city: "Old City", state: "State", pinCode: "123456", accountHolderName: "Review Contact", bankName: "Old Bank", bankBranch: "Old Branch", accountNumber: encryptPartnerValue("123456789012"), ifsc: "TEST0000001", accountType: "Savings", bankDetailsReviewStatus: "pending" });
    const forbiddenProfile = await request(`/partners/${partner.partnerCode}/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: "Not Allowed" }) }, employee);
    assert.equal(forbiddenProfile.status, 403);
    const update = await request(`/partners/${partner.partnerCode}/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city: "Updated City", bankName: "Updated Bank" }) }, admin);
    assert.equal(update.status, 200);
    assert.equal((await update.json()).partner.accountNumber.endsWith("9012"), true);

    const form = new FormData();
    form.append("partnerDocuments", new Blob([Buffer.from("89504e470d0a1a0a00010203", "hex")], { type: "image/png" }), "pan.png");
    form.append("documentTypes", JSON.stringify([{ documentType: "PAN Card" }]));
    const upload = await request(`/partners/${partner.partnerCode}/documents`, { method: "POST", body: form }, admin);
    assert.equal(upload.status, 201);
    let saved = await User.findById(partner._id).select("+partnerDocuments.storageKey");
    assert.equal(saved.partnerDocuments[0].status, "pending");
    assert.equal(String(saved.partnerDocuments[0].uploadedBy), String(admin._id));
    const doc = saved.partnerDocuments[0];
    assert.equal((await request(`/partners/${partner.partnerCode}/documents/${doc.documentId}/preview`, {}, employee)).status, 403);
    assert.equal((await request(`/partners/${partner.partnerCode}/documents/${doc.documentId}/preview`, {}, admin)).status, 200);
    assert.equal((await request(`/partners/${partner.partnerCode}/documents/${doc.documentId}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected" }) }, admin)).status, 400);
    const rejected = await request(`/partners/${partner.partnerCode}/documents/${doc.documentId}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected", reason: "File needs correction." }) }, admin);
    assert.equal(rejected.status, 200);
    const replacement = new FormData();
    replacement.append("partnerDocuments", new Blob([Buffer.from("89504e470d0a1a0a00020304", "hex")], { type: "image/png" }), "pan-replacement.png");
    replacement.append("documentTypes", JSON.stringify([{ documentType: "PAN Card" }]));
    assert.equal((await request(`/partners/${partner.partnerCode}/documents`, { method: "POST", body: replacement }, admin)).status, 201);
    saved = await User.findById(partner._id).select("+partnerDocuments.storageKey +partnerDocuments.history.storageKey +partnerInternalNotes");
    assert.equal(saved.partnerDocuments[0].status, "pending");
    assert.equal(saved.partnerDocuments[0].history[0].status, "rejected");
    assert.equal(saved.partnerDocuments[0].version, 2);

    const privateNote = await request(`/partners/${partner.partnerCode}/internal-notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "Review bank branch spelling." }) }, admin);
    assert.equal(privateNote.status, 201);
    const adminList = await (await request("/partners", {}, admin)).json();
    const exposed = adminList.partners.find((item) => item.partnerCode === partner.partnerCode);
    assert.equal(Object.hasOwn(exposed, "partnerInternalNotes"), false);
    assert.equal(exposed.accountNumber, "****9012");
    assert.equal(await User.countDocuments({ partnerCode: partner.partnerCode, status: "active" }), 0);
  });
});
