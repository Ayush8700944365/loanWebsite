import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { PDFDocument } from "pdf-lib";
import { decryptPartnerValue, encryptPartnerValue } from "../src/services/partnerSensitiveData.js";

const testUri = process.env.TEST_MONGO_URI || "";
const localTestMongo = (() => {
  try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(testUri).hostname); }
  catch { return false; }
})();

describe("lead document API integration", { skip: !localTestMongo }, () => {
  let app;
  let server;
  let baseUrl;
  let dbName;
  let tempStorage;
  let admin;
  let assignedEmployee;
  let otherEmployee;
  let partner;
  let otherPartner;
  let Lead;
  let User;
  let LoanCategory;
  let Invoice;
  let CommissionRule;
  let createApp;
  let leadCode;
  let documentId;

  const tokenFor = (user) => jwt.sign({ userId: user._id.toString(), tokenVersion: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "5m" });
  const request = (url, options = {}, user = null) => fetch(`${baseUrl}${url}`, {
    ...options,
    headers: { ...(user ? { Authorization: `Bearer ${tokenFor(user)}` } : {}), ...(options.headers || {}) },
  });
  const cookieHeader = (response) => (response.headers.getSetCookie?.() || [response.headers.get("set-cookie") || ""]).map((cookie) => cookie.split(";")[0]).join("; ");
  const applicationForm = ({ files = [], name = "PAN" } = {}) => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      customerName: "Test Customer", phone: "4165550100", email: "customer@example.test", leadType: "SBI",
      loanCategory: "Home Loan", loanAmount: "500000", monthlyIncome: "5000", employmentType: "Salaried",
      tenureYears: "10", city: "Toronto", propertyAddress: "Test Address",
    })) form.append(key, value);
    form.append("documentTypes", JSON.stringify(files.map(() => ({ name, type: "Identity" }))));
    for (const file of files) form.append("documents", new Blob([file.content], { type: file.mime }), file.name);
    return form;
  };

  before(async () => {
    if (!testUri) return;
    process.env.JWT_SECRET = `realcred-test-${randomUUID()}`;
    process.env.MAX_FILE_SIZE = String(1024 * 1024);
    tempStorage = await mkdtemp(path.join(os.tmpdir(), "realcred-api-docs-"));
    process.env.DOCUMENT_STORAGE_PATH = tempStorage;
    dbName = `realcred_docs_test_${randomUUID().replaceAll("-", "")}`;
    await mongoose.connect(testUri, { dbName, serverSelectionTimeoutMS: 5000 });
    ({ default: User } = await import("../src/models/User.js"));
    ({ default: Lead } = await import("../src/models/Lead.js"));
    ({ default: LoanCategory } = await import("../src/models/LoanCategory.js"));
    ({ default: Invoice } = await import("../src/models/Invoice.js"));
    ({ default: CommissionRule } = await import("../src/models/CommissionRule.js"));
    ({ createApp } = await import("../src/app.js"));
    app = createApp();
    await new Promise((resolve, reject) => {
      server = app.listen(0, "127.0.0.1", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;

    [admin, assignedEmployee, otherEmployee, partner, otherPartner] = await Promise.all([
      User.create({ name: "Test Admin", email: "admin@test.local", password: "long-test-password", role: "admin", status: "active" }),
      User.create({ name: "Assigned Employee", email: "assigned@test.local", password: "long-test-password", role: "employee", status: "active", employeeCode: "EMP-DOC-TEST-1" }),
      User.create({ name: "Other Employee", email: "other@test.local", password: "long-test-password", role: "employee", status: "active", employeeCode: "EMP-DOC-TEST-2" }),
      User.create({ name: "Test Partner", email: "partner@test.local", password: "long-test-password", role: "partner", status: "active", partnerApprovalStatus: "approved", bankDetailsReviewStatus: "approved", partnerCode: "PTR-DOC-TEST" }),
      User.create({ name: "Other Partner", email: "partner-other@test.local", password: "long-test-password", role: "partner", status: "active", partnerApprovalStatus: "approved", bankDetailsReviewStatus: "approved", partnerCode: "PTR-DOC-OTHER" }),
    ]);
    await LoanCategory.create({ name: "Home Loan", slug: "home-loan", documentRequirements: [{ documentType: "PAN", employmentTypes: [] }] });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState) {
      // dbName is a unique test-only database created by this suite.
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    if (tempStorage) await rm(tempStorage, { recursive: true, force: true });
  });

  it("authenticates all portal roles with HttpOnly cookies and enforces role access", async () => {
    for (const user of [admin, assignedEmployee, partner]) {
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password: "long-test-password", role: user.role }) });
      assert.equal(loginResponse.status, 200);
      const cookie = cookieHeader(loginResponse);
      assert.match(cookie, /realcred_session=/);
      assert.match((loginResponse.headers.getSetCookie?.() || [loginResponse.headers.get("set-cookie") || ""]).join(";"), /realcred_session=[^;]+;[^]*?HttpOnly/i, "session cookie is issued with HttpOnly attribute");
      const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
      assert.equal(me.status, 200);
      assert.equal((await me.json()).user.role, user.role);
      const adminOnly = await fetch(`${baseUrl}/api/payouts`, { headers: { Cookie: cookie } });
      assert.equal(adminOnly.status, user.role === "admin" ? 200 : 403);
    }
    const legacyAdmin = await User.create({ name: "Legacy Case Admin", email: "legacy-admin@test.local", password: "long-test-password", role: "admin", status: "active" });
    await User.collection.updateOne({ _id: legacyAdmin._id }, { $set: { role: "ADMIN " } });
    const normalizedLegacyAdmin = await request("/api/partners/eligible", {}, legacyAdmin);
    assert.equal(normalizedLegacyAdmin.status, 200);
    const logoutUser = await User.create({ name: "Logout Admin", email: "logout-admin@test.local", password: "long-test-password", role: "admin", status: "active" });
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: logoutUser.email, password: "long-test-password", role: "admin" }) });
    const loginBody = await loginResponse.json();
    const cookie = cookieHeader(loginResponse);
    const loggedOut = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { Cookie: cookie, "X-CSRF-Token": loginBody.csrfToken } });
    assert.equal(loggedOut.status, 200);
    const revoked = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal(revoked.status, 401);
  });

  it("uploads, scopes, reviews, versions, and gates verification end to end", async () => {
    const created = await request("/api/leads/website", { method: "POST", body: applicationForm({ files: [{ name: "customer-pan.pdf", mime: "application/pdf", content: "%PDF-1.7\nprivate test" }] }) });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    leadCode = createdBody.lead.leadCode;
    documentId = createdBody.lead.documents[0].documentId;
    assert.ok(leadCode && documentId);
    const serializedLead = JSON.stringify(createdBody.lead);
    assert.equal(serializedLead.includes("storageKey"), false);
    assert.equal(serializedLead.includes("private-documents"), false);

    const rejectedType = await request("/api/leads/website", { method: "POST", body: applicationForm({ files: [{ name: "not-allowed.txt", mime: "text/plain", content: "%PDF-1.7" }] }) });
    assert.equal(rejectedType.status, 400);
    const oversized = await request("/api/leads/website", { method: "POST", body: applicationForm({ files: [{ name: "oversized.pdf", mime: "application/pdf", content: `%PDF-${"x".repeat(1024 * 1024)}` }] }) });
    assert.equal(oversized.status, 413);

    const assigned = await request(`/api/leads/${leadCode}/assign`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeCode: assignedEmployee.employeeCode }) }, admin);
    assert.equal(assigned.status, 200);
    const category = await LoanCategory.findOne({ name: "Home Loan" });
    category.documentRequirements = [{ documentType: "PAN", employmentTypes: [] }, { documentType: "Proof of Address", employmentTypes: [] }];
    category.status = "inactive";
    await category.save();
    const livePolicyResponse = await request(`/api/leads/${leadCode}/documents`, {}, assignedEmployee);
    const livePolicy = await livePolicyResponse.json();
    category.documentRequirements = [{ documentType: "PAN", employmentTypes: [] }];
    category.status = "active";
    await category.save();
    assert.equal(livePolicyResponse.status, 200);
    assert.deepEqual(livePolicy.requiredDocuments, ["PAN", "Proof of Address"]);
    const adminList = await request(`/api/leads/${leadCode}/documents`, {}, admin);
    assert.equal(adminList.status, 200);
    const employeeList = await request(`/api/leads/${leadCode}/documents`, {}, assignedEmployee);
    assert.equal(employeeList.status, 200);
    const wrongEmployee = await request(`/api/leads/${leadCode}/documents`, {}, otherEmployee);
    assert.equal(wrongEmployee.status, 404);
    const partnerList = await request(`/api/leads/${leadCode}/documents`, {}, partner);
    assert.equal(partnerList.status, 403);
    const changedLeadId = await request(`/api/leads/not-this-lead/documents/${documentId}/preview`, {}, admin);
    assert.equal(changedLeadId.status, 404);
    const changedDocumentId = await request(`/api/leads/${leadCode}/documents/not-this-document/preview`, {}, admin);
    assert.equal(changedDocumentId.status, 404);
    const partnerPreview = await request(`/api/leads/${leadCode}/documents/${documentId}/preview`, {}, partner);
    assert.equal(partnerPreview.status, 403);
    const preview = await request(`/api/leads/${leadCode}/documents/${documentId}/preview`, {}, assignedEmployee);
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get("content-type"), /application\/pdf/);
    assert.match(await preview.text(), /^%PDF-/);
    const download = await request(`/api/leads/${leadCode}/documents/${documentId}/download`, {}, admin);
    assert.equal(download.status, 200);
    assert.match(download.headers.get("content-disposition"), /^attachment/);

    const verifyBeforeReview = await request(`/api/leads/${leadCode}/verify`, { method: "POST" }, assignedEmployee);
    assert.equal(verifyBeforeReview.status, 409);
    const verifyAsOtherEmployee = await request(`/api/leads/${leadCode}/verify`, { method: "POST" }, otherEmployee);
    assert.equal(verifyAsOtherEmployee.status, 404);
    const assignmentBeforeVerify = await request(`/api/leads/${leadCode}/partner-assignment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerCode: partner.partnerCode }) }, assignedEmployee);
    assert.equal(assignmentBeforeVerify.status, 409);
    const generalVerifiedPatch = await request(`/api/leads/${leadCode}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentStatus: "Verified" }) }, assignedEmployee);
    assert.equal(generalVerifiedPatch.status, 409);
    const noReason = await request(`/api/leads/${leadCode}/documents/${documentId}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected" }) }, admin);
    assert.equal(noReason.status, 400);
    const reject = await request(`/api/leads/${leadCode}/documents/${documentId}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected", rejectionReason: "Unreadable scan" }) }, admin);
    assert.equal(reject.status, 200);
    const verifyRejected = await request(`/api/leads/${leadCode}/verify`, { method: "POST" }, admin);
    assert.equal(verifyRejected.status, 409);
    const requestReplacement = await request(`/api/leads/${leadCode}/documents/${documentId}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "reupload_requested", rejectionReason: "Upload a clearer scan" }) }, admin);
    assert.equal(requestReplacement.status, 200);
    const replacementForm = new FormData();
    replacementForm.append("documents", new Blob(["%PDF-1.7\nreplacement"], { type: "application/pdf" }), "replacement.pdf");
    replacementForm.append("documentTypes", JSON.stringify([{ name: "PAN", type: "Identity" }]));
    const replacement = await request(`/api/leads/${leadCode}/documents`, { method: "POST", body: replacementForm }, assignedEmployee);
    assert.equal(replacement.status, 201);
    const afterReplacement = await (await request(`/api/leads/${leadCode}/documents`, {}, admin)).json();
    assert.equal(afterReplacement.documents[0].version, 2);
    assert.equal(afterReplacement.documents[0].status, "pending");
    assert.equal(afterReplacement.documents[0].history.length, 1);
    const approve = await request(`/api/leads/${leadCode}/documents/${documentId}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) }, admin);
    assert.equal(approve.status, 200);
    const verify = await request(`/api/leads/${leadCode}/verify`, { method: "POST" }, assignedEmployee);
    assert.equal(verify.status, 200);
    assert.equal((await verify.json()).lead.currentStatus, "Verified");
    const assignedPartner = await request(`/api/leads/${leadCode}/partner-assignment`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerCode: partner.partnerCode }) }, assignedEmployee);
    assert.equal(assignedPartner.status, 200);
    assert.equal((await assignedPartner.json()).lead.partnerId, partner.partnerCode);
    assert.equal((await request(`/api/leads/${leadCode}`, {}, otherPartner)).status, 404);
  });

  it("persists public applications, assigned leads, customers and employee follow-ups", async () => {
    const publicApplication = await request("/api/leads/website", { method: "POST", body: applicationForm() });
    assert.equal(publicApplication.status, 201);
    const publicBody = await publicApplication.json();
    assert.equal(publicBody.lead.source, "Website");

    const assignedResponse = await request("/api/leads/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: "Assigned Workflow Lead", phone: "4165550198", loanCategory: "Home Loan", loanAmount: 250000, assignedEmployeeId: assignedEmployee.employeeCode }) }, admin);
    assert.equal(assignedResponse.status, 201);
    const assignedLead = (await assignedResponse.json()).lead;
    assert.equal(assignedLead.assignedEmployeeId, assignedEmployee.employeeCode);

    const employeeLeads = await request("/api/leads", {}, assignedEmployee);
    assert.ok((await employeeLeads.json()).leads.some((lead) => lead.leadCode === assignedLead.leadCode));
    const otherEmployeeLeads = await request("/api/leads", {}, otherEmployee);
    assert.ok(!(await otherEmployeeLeads.json()).leads.some((lead) => lead.leadCode === assignedLead.leadCode));

    const application = await request("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: "Workflow Applicant", phone: "4165550199", loanType: "Home Loan", requestedAmount: "500000", roi: "8.5%", ltv: "72%", tenure: "20 Years" }) }, admin);
    assert.equal(application.status, 201);
    const applicationBody = await application.json();
    assert.equal(applicationBody.lead.interestRate, 8.5);
    assert.equal(applicationBody.lead.ltv, 72);

    const customer = await request("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Workflow Customer", phone: "4165550188", activeLoan: "Home Loan", totalBorrowed: 300000 }) }, admin);
    assert.equal(customer.status, 201);
    assert.equal((await customer.json()).data.kycStatus, "Pending");

    const followUp = await request("/api/followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadCode: assignedLead.leadCode, customerName: assignedLead.customerName, phone: assignedLead.phone, task: "Collect document", followUpDate: "2027-01-15", followUpTime: "10:30", ownerEmployeeCode: assignedEmployee.employeeCode }) }, admin);
    assert.equal(followUp.status, 201);
    const followUpId = (await followUp.json()).followUp.id;
    const wrongOwnerRead = await request("/api/followups", {}, otherEmployee);
    assert.equal((await wrongOwnerRead.json()).data.length, 0);
    const employeeRead = await request("/api/followups", {}, assignedEmployee);
    assert.ok((await employeeRead.json()).data.some((item) => item.id === followUpId));
    const completed = await request(`/api/followups/${followUpId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reminderStatus: "Completed" }) }, assignedEmployee);
    assert.equal(completed.status, 200);
  });

  it("forces employee password change and invalidates sessions on reset", async () => {
    const createdResponse = await request("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Employee", email: "new-employee@test.local", username: "new.employee", designation: "Loan Officer" }),
    }, admin);
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.equal(created.employee.mustChangePassword, true);
    assert.ok(created.temporaryPassword);

    const loginResponse = await request("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: created.employee.email, password: created.temporaryPassword, role: "employee" }),
    });
    assert.equal(loginResponse.status, 200);
    const login = await loginResponse.json();
    assert.equal(login.user.mustChangePassword, true);
    const firstCookies = cookieHeader(loginResponse);
    const blocked = await fetch(`${baseUrl}/api/leads`, { headers: { Cookie: firstCookies } });
    assert.equal(blocked.status, 403);
    assert.equal((await blocked.json()).code, "PASSWORD_CHANGE_REQUIRED");
    const csrfBlocked = await fetch(`${baseUrl}/api/auth/change-password`, { method: "POST", headers: { Cookie: firstCookies, "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: created.temporaryPassword, newPassword: "new-long-secure-password-1" }) });
    assert.equal(csrfBlocked.status, 403);
    assert.equal((await csrfBlocked.json()).code, "CSRF_INVALID");

    const changedResponse = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: "POST", headers: { Cookie: firstCookies, "X-CSRF-Token": login.csrfToken, "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: created.temporaryPassword, newPassword: "new-long-secure-password-1" }),
    });
    assert.equal(changedResponse.status, 200);
    const changed = await changedResponse.json();
    assert.equal(changed.user.mustChangePassword, false);
    const oldSession = await fetch(`${baseUrl}/api/leads`, { headers: { Cookie: firstCookies } });
    assert.equal(oldSession.status, 401);

    const resetResponse = await request(`/api/employees/${created.employee.employeeCode}/password-reset`, { method: "POST" }, admin);
    assert.equal(resetResponse.status, 200);
    const reset = await resetResponse.json();
    assert.ok(reset.temporaryPassword);
    const staleSession = await fetch(`${baseUrl}/api/leads`, { headers: { Cookie: cookieHeader(changedResponse) } });
    assert.equal(staleSession.status, 401);
  });

  it("scopes partner invoice listing to their own referral identity", async () => {
    const ownedLead = await Lead.create({ customerName: "Legacy Owned Customer", phone: "4165550199", loanCategory: "Home Loan", loanAmount: 30000, partnerId: partner.partnerCode });
    await Invoice.create([
      { invoiceNumber: `OWN-${randomUUID()}`, customerName: "Own Customer", leadId: "OWN-LEAD", invoiceAmount: 1200, partnerCode: partner.partnerCode },
      { invoiceNumber: `OTHER-${randomUUID()}`, customerName: "Other Customer", leadId: "OTHER-LEAD", invoiceAmount: 9800, partnerCode: "PTR-OTHER-TEST" },
    ]);
    await Invoice.collection.insertOne({ invoiceNumber: `LEGACY-${randomUUID()}`, customerName: "Legacy Customer", leadId: ownedLead.leadCode, invoiceAmount: 400, createdAt: new Date(), updatedAt: new Date() });
    const response = await request("/api/invoices/my", {}, partner);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.invoices.length, 2);
    assert.ok(body.invoices.some((invoice) => invoice.partnerCode === partner.partnerCode));
    assert.ok(body.invoices.some((invoice) => invoice.leadId === ownedLead.leadCode));
    const adminDenied = await request("/api/invoices/my", {}, admin);
    assert.equal(adminDenied.status, 403);
  });

  it("persists interior referrals with partner isolation and Admin status history", async () => {
    const created = await request("/api/interior-referrals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: "Referral Customer", phone: "4165550177", city: "Toronto" }) }, partner);
    assert.equal(created.status, 201);
    const referral = (await created.json()).referral;
    assert.equal(referral.partnerCode, partner.partnerCode);
    const otherRead = await request("/api/interior-referrals", {}, otherPartner);
    assert.equal((await otherRead.json()).referrals.length, 0);
    const adminUpdate = await request(`/api/interior-referrals/${referral.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Qualified" }) }, admin);
    assert.equal(adminUpdate.status, 200);
    const updated = (await adminUpdate.json()).referral;
    assert.equal(updated.status, "Qualified");
    assert.equal(updated.statusHistory.length, 2);
    const partnerRead = await request("/api/interior-referrals", {}, partner);
    assert.equal((await partnerRead.json()).referrals[0].status, "Qualified");
  });

  it("keeps partner applications locked until Admin activation", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ companyName: "Application Test Co", contactPerson: "Applicant", email: "new-partner@test.local", phone: "4165550100", partnerType: "DSA", businessType: "Broker", city: "Toronto", state: "ON", pinCode: "M5V1A1", address: "Registered address", communicationAddress: "Mailing address", accountHolderName: "Applicant", bankName: "Test Bank", bankBranch: "Toronto", accountNumber: "123456789012", ifsc: "ABCD0123456", accountType: "Savings", partnerKycConsent: "true", password: "Strong-Password-123" })) form.append(key, value);
    form.append("documentTypes", JSON.stringify([{ documentType: "Cancelled cheque" }]));
    form.append("partnerDocuments", new Blob(["%PDF-1.7\nKYC proof"], { type: "application/pdf" }), "bank-proof.pdf");
    const response = await request("/api/partners/apply", { method: "POST", body: form });
    assert.equal(response.status, 201);
    const application = await response.json();
    const pendingUser = await User.findOne({ partnerCode: application.applicationId });
    assert.equal(pendingUser.status, "pending");
    assert.equal(pendingUser.username, pendingUser.email);
    assert.notEqual(pendingUser.accountNumber, "123456789012");
    assert.equal((await request("/api/partners", {}, admin)).status, 200);
    const pendingDoc = pendingUser.partnerDocuments[0];
    const pendingPreview = await request(`/api/partners/${application.applicationId}/documents/${pendingDoc.documentId}/preview`, {}, admin);
    assert.equal(pendingPreview.status, 200);
    const pendingDownload = await request(`/api/partners/${application.applicationId}/documents/${pendingDoc.documentId}/download`, {}, admin);
    assert.equal(pendingDownload.status, 200);
    const kycAudit = await request(`/api/partners/${application.applicationId}/audit`, {}, admin);
    const kycActions = (await kycAudit.json()).events.map((event) => event.action);
    assert.ok(kycActions.includes("kyc_document_previewed"));
    assert.ok(kycActions.includes("kyc_document_downloaded"));
    const pendingLogin = await request("/api/partners", {}, pendingUser);
    assert.equal(pendingLogin.status, 403);
    const refusedPendingLogin = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: pendingUser.email, password: "Strong-Password-123", role: "partner" }) });
    assert.equal(refusedPendingLogin.status, 403);
    const preCorrectionReview = await request(`/api/partners/${application.applicationId}/documents/${pendingDoc.documentId}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) }, admin);
    assert.equal(preCorrectionReview.status, 200);
    const correctionIssued = await request(`/api/partners/${application.applicationId}/correction-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Replace bank proof and correct account number.", fields: ["accountNumber"], documentTypes: ["Cancelled cheque"], expiresInHours: 24 }) }, admin);
    assert.equal(correctionIssued.status, 201);
    const correction = (await correctionIssued.json()).correction;
    assert.equal(correction.token.length > 30, true);
    const correctionForm = await request(`/api/partners/corrections/${correction.token}`);
    assert.equal(correctionForm.status, 200);
    assert.equal((await correctionForm.json()).correction.fields.accountNumber, "");
    const correctionSubmission = new FormData();
    correctionSubmission.append("correctionFields", JSON.stringify({ accountNumber: "999988887777" }));
    correctionSubmission.append("documentTypes", JSON.stringify([{ documentType: "Cancelled cheque" }]));
    correctionSubmission.append("partnerDocuments", new Blob(["%PDF-1.7\nCorrected proof"], { type: "application/pdf" }), "corrected-bank-proof.pdf");
    const corrected = await request(`/api/partners/corrections/${correction.token}`, { method: "POST", body: correctionSubmission });
    assert.equal(corrected.status, 201);
    assert.equal((await request(`/api/partners/corrections/${correction.token}`)).status, 404);
    const resubmitted = await User.findById(pendingUser._id).select("+password +partnerDocuments.storageKey +partnerDocuments.history.storageKey +accountNumber");
    assert.equal(decryptPartnerValue(resubmitted.accountNumber), "999988887777");
    assert.equal(resubmitted.partnerDocuments[0].version, 2);
    assert.equal(resubmitted.partnerDocuments[0].status, "pending");
    assert.equal(resubmitted.partnerDocuments[0].history[0].status, "approved");
    assert.equal(await resubmitted.comparePassword("Strong-Password-123"), true);
    const correctionAudit = await request(`/api/partners/${application.applicationId}/audit`, {}, admin);
    const correctionActions = (await correctionAudit.json()).events.map((event) => event.action);
    assert.ok(correctionActions.includes("correction_link_created"));
    assert.ok(correctionActions.includes("correction_resubmitted"));
    const correctedDoc = resubmitted.partnerDocuments[0];
    const reviewed = await request(`/api/partners/${application.applicationId}/documents/${correctedDoc.documentId}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) }, admin);
    assert.equal(reviewed.status, 200);
    const activationWithoutBankReview = await request(`/api/partners/${application.applicationId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) }, admin);
    assert.equal(activationWithoutBankReview.status, 409);
    const bankReview = await request(`/api/partners/${application.applicationId}/bank-review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) }, admin);
    assert.equal(bankReview.status, 200);
    const activated = await request(`/api/partners/${application.applicationId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) }, admin);
    assert.equal(activated.status, 200);
    const originalPasswordLogin = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: pendingUser.email, password: "Strong-Password-123", role: "partner" }) });
    assert.equal(originalPasswordLogin.status, 200);
    const activeUser = await User.findById(pendingUser._id);
    assert.equal(activeUser.status, "active");
    const ordinaryProfile = await request("/api/auth/me", {}, activeUser);
    assert.equal((await ordinaryProfile.json()).user.accountNumber, "****7777");
    const adminBank = await request(`/api/partners/${application.applicationId}/payout-details`, {}, admin);
    assert.equal((await adminBank.json()).partner.accountNumber, "999988887777");
    assert.equal((await request(`/api/partners/${application.applicationId}/payout-details`, {}, activeUser)).status, 403);
    const activeDocPreview = await request(`/api/partners/${application.applicationId}/documents/${correctedDoc.documentId}/preview`, {}, activeUser);
    assert.equal(activeDocPreview.status, 403);
    const replacementForm = new FormData();
    replacementForm.append("documentTypes", JSON.stringify([{ documentType: "Cancelled cheque" }]));
    replacementForm.append("partnerDocuments", new Blob(["%PDF-1.7\nReplacement proof"], { type: "application/pdf" }), "replacement-proof.pdf");
    const replacementUpload = await request("/api/partners/me/documents", { method: "POST", body: replacementForm }, activeUser);
    assert.equal(replacementUpload.status, 201);
    const replacedDoc = (await replacementUpload.json()).partner.partnerDocuments[0];
    assert.equal(replacedDoc.version, 3);
    assert.equal(replacedDoc.status, "pending");
    assert.equal(replacedDoc.history.length, 2);
    const directBankEdit = await request("/api/auth/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountNumber: "555555555555" }) }, activeUser);
    assert.equal(directBankEdit.status, 409);
    const bankChange = await request("/api/partners/me/change-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountNumber: "555555555555" }) }, activeUser);
    assert.equal(bankChange.status, 201);
    const bankChangeBody = await bankChange.json();
    const pendingChanges = await request("/api/partners/change-requests", {}, admin);
    const requestRow = (await pendingChanges.json()).requests.find((row) => row._id === bankChangeBody.request.id);
    assert.equal(requestRow.changes.accountNumber, "555555555555");
    const approveChange = await request(`/api/partners/change-requests/${requestRow._id}/review`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }) }, admin);
    assert.equal(approveChange.status, 200);
    const changedPartner = await User.findById(activeUser._id);
    assert.equal(decryptPartnerValue(changedPartner.accountNumber), "555555555555");
    assert.equal(decryptPartnerValue(changedPartner.bankDetailsHistory[0].accountNumber), "999988887777");
    const activeAccess = await request("/api/interior-referrals", {}, activeUser);
    assert.equal(activeAccess.status, 200);
  });

  it("audits partner processing and requires Admin disbursement confirmation", async () => {
    const createdResponse = await request("/api/leads/partner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName: "Partner Workflow Customer", phone: "4165550133", loanCategory: "Home Loan", loanAmount: 100000, leadType: "SBI" }) }, partner);
    assert.equal(createdResponse.status, 201);
    const ownedLead = (await createdResponse.json()).lead;
    const rejectedNoReason = await request(`/api/leads/${ownedLead.leadCode}/partner-status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Rejected" }) }, partner);
    assert.equal(rejectedNoReason.status, 400);
    const unrelated = await request(`/api/leads/${ownedLead.leadCode}/partner-status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "In Process" }) }, otherPartner);
    assert.equal(unrelated.status, 404);
    for (const status of ["In Process", "Follow-up", "Approved", "Sanctioned"]) {
      const update = await request(`/api/leads/${ownedLead.leadCode}/partner-status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }, partner);
      assert.equal(update.status, 200);
    }
    const reverseSanction = await request(`/api/leads/${ownedLead.leadCode}/partner-status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Follow-up" }) }, partner);
    assert.equal(reverseSanction.status, 409);
    const submissionForm = new FormData();
    submissionForm.append("amount", "80000"); submissionForm.append("reference", "BANK-REF-TEST");
    submissionForm.append("documents", new Blob(["%PDF-1.7\nEvidence"], { type: "application/pdf" }), "evidence.pdf");
    const submitted = await request(`/api/leads/${ownedLead.leadCode}/disbursement`, { method: "POST", body: submissionForm }, partner);
    assert.equal(submitted.status, 201);
    const submittedLead = (await submitted.json()).lead;
    assert.equal(submittedLead.currentStatus, "Sanctioned");
    assert.equal(submittedLead.disbursementUpdate.status, "pending_confirmation");
    const evidenceUrl = `/api/leads/${ownedLead.leadCode}/disbursement/evidence/0`;
    assert.equal((await request(evidenceUrl, {}, otherPartner)).status, 404);
    const confirm = await request(`/api/leads/${ownedLead.leadCode}/disbursement/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "confirm" }) }, admin);
    assert.equal(confirm.status, 200);
    const finalLead = (await confirm.json()).lead;
    assert.equal(finalLead.currentStatus, "Disbursed");
    assert.equal(finalLead.statusHistory.at(-1).actorRole, "admin");
    const bypass = await request(`/api/leads/${ownedLead.leadCode}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentStatus: "Disbursed" }) }, admin);
    assert.equal(bypass.status, 409);
  });

  it("requires configured Payout rules and manages payout approvals", async () => {
    const payoutPartner = await User.findById(partner._id).select("+accountNumber");
    payoutPartner.accountHolderName = "Test Beneficiary"; payoutPartner.bankName = "Test Bank"; payoutPartner.bankBranch = "Toronto";
    payoutPartner.accountNumber = encryptPartnerValue("987654321234"); payoutPartner.ifsc = "ABCD0123456"; payoutPartner.accountType = "Savings"; await payoutPartner.save();
    assert.equal(decryptPartnerValue((await User.findById(partner._id).select("+accountNumber")).accountNumber), "987654321234");
    const lead = await Lead.create({ customerName: "Payout Customer", phone: "4165550177", loanCategory: "Home Loan", loanAmount: 100000, loanPayoutAmount: 80000, partnerId: partner.partnerCode, partnerName: partner.name, currentStatus: "Disbursed" });
    const createPayload = { partnerId: partner.partnerCode, leadId: lead.leadCode };
    const noRule = await request("/api/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createPayload) }, admin);
    assert.equal(noRule.status, 409);
    assert.equal((await noRule.json()).code, "COMMISSION_RULE_REQUIRED");
    await CommissionRule.create({ ruleKey: `${partner.partnerCode.toLowerCase()}::home loan`, name: "test approved rule", loanCategory: "Home Loan", partnerCode: partner.partnerCode, calculationType: "percentage", value: 1.5, gstPercentage: 0, status: "active", createdBy: admin._id, updatedBy: admin._id });
    const created = await request("/api/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createPayload) }, admin);
    assert.equal(created.status, 201);
    const payout = (await created.json()).payment;
    assert.equal(payout.amount, 1200);
    assert.equal(payout.status, "Pending");
    assert.equal(payout.bankSnapshot.accountNumber, "****1234");
    assert.equal(JSON.stringify(payout).includes("987654321234"), false);
    const adminPayoutDetail = await request(`/api/payouts/${payout._id}`, {}, admin);
    assert.equal((await adminPayoutDetail.json()).payment.bankSnapshot.accountNumber, "987654321234");
    const partnerPayouts = await request("/api/payouts/my", {}, partner);
    assert.equal((await partnerPayouts.json()).payments[0].bankSnapshot.accountNumber, "****1234");
    assert.equal((await request("/api/payouts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createPayload) }, admin)).status, 409);
    const missingReason = await request(`/api/payouts/${payout._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Rejected" }) }, admin);
    assert.equal(missingReason.status, 400);
    const approved = await request(`/api/payouts/${payout._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Approved" }) }, admin);
    assert.equal(approved.status, 200);
    const started = await request(`/api/payouts/${payout._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Payment Initiated" }) }, admin);
    assert.equal(started.status, 200);
    const paid = await request(`/api/payouts/${payout._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Paid", utr: "UTR-TEST-01" }) }, admin);
    assert.equal(paid.status, 200);
    assert.equal((await paid.json()).payment.statusHistory.length, 4);
    assert.equal((await Lead.findById(lead._id)).currentStatus, "Payout Complete");
  });

  it("validates and versions private templates and scopes generated PDF access", async () => {
    const lead = await Lead.create({ customerName: "Template Customer", phone: "4165550188", loanCategory: "Home Loan", loanAmount: 90000, partnerId: partner.partnerCode, partnerName: partner.name });
    const pdf = await PDFDocument.create(); const page = pdf.addPage([612, 792]); page.drawText("Owner-approved template body", { x: 50, y: 700 });
    const bytes = Buffer.from(await pdf.save());
    const upload = async (name = "Owner MOU") => {
      const form = new FormData(); form.append("kind", "mou"); form.append("name", name); form.append("approvalNote", "Owner supplied and approved test content");
      form.append("fieldSpecs", JSON.stringify([{ key: "customerName", page: 0, x: 70, y: 650, size: 12 }, { key: "leadCode", page: 0, x: 70, y: 625, size: 9 }]));
      form.append("template", new Blob([bytes], { type: "application/pdf" }), "template.pdf");
      return request("/api/documents/templates", { method: "POST", body: form }, admin);
    };
    assert.equal((await upload()).status, 201);
    const version2Response = await upload(); assert.equal(version2Response.status, 201);
    const version2 = (await version2Response.json()).template;
    assert.equal(version2.version, 2);
    assert.equal(JSON.stringify(version2).includes("storageKey"), false);
    const active = await request(`/api/documents/templates/${version2._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) }, admin);
    assert.equal(active.status, 200);
    const generatedResponse = await request("/api/documents/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadCode: lead.leadCode, kind: "mou" }) }, admin);
    assert.equal(generatedResponse.status, 201);
    const generated = (await generatedResponse.json()).document;
    assert.equal(JSON.stringify(generated).includes("storageKey"), false);
    assert.equal((await request(`/api/documents/generated/${generated.documentCode}/download`, {}, partner)).status, 200);
    assert.equal((await request(`/api/documents/generated/${generated.documentCode}/download`, {}, otherPartner)).status, 404);
    assert.equal((await request("/api/documents/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadCode: lead.leadCode, kind: "mou" }) }, partner)).status, 403);
  });
});
