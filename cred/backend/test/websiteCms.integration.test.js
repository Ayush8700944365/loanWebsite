import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const testUri = process.env.TEST_MONGO_URI || "";
const useLocalMongo = (() => {
  try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(testUri).hostname); }
  catch { return false; }
})();

describe("public website content and institution directory API", { skip: !useLocalMongo }, () => {
  let app;
  let server;
  let baseUrl;
  let dbName;
  let storage;
  let User;
  let Bank;
  let LoanCategory;
  let WebsiteAsset;
  let admin;
  let employee;
  let teamPhotoKey;

  const token = (user) => jwt.sign({ userId: user._id.toString(), tokenVersion: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "5m" });
  const request = (route, options = {}, user = null) => fetch(`${baseUrl}${route}`, {
    ...options,
    headers: { ...(user ? { Authorization: `Bearer ${token(user)}` } : {}), ...(options.headers || {}) },
  });
  const png = () => new Blob([Buffer.from("89504e470d0a1a0a00010203", "hex")], { type: "image/png" });
  const webp = () => new Blob([Buffer.from("524946460400000057454250", "hex")], { type: "image/webp" });

  before(async () => {
    if (!useLocalMongo) return;
    process.env.JWT_SECRET = `website-test-${randomUUID()}`;
    storage = await mkdtemp(path.join(os.tmpdir(), "realcred-website-assets-"));
    process.env.DOCUMENT_STORAGE_PATH = storage;
    dbName = `realcred_website_test_${randomUUID().replaceAll("-", "")}`;
    await mongoose.connect(testUri, { dbName, serverSelectionTimeoutMS: 5000 });
    ({ default: User } = await import("../src/models/User.js"));
    ({ default: Bank } = await import("../src/models/Bank.js"));
    ({ default: LoanCategory } = await import("../src/models/LoanCategory.js"));
    ({ default: WebsiteAsset } = await import("../src/models/WebsiteAsset.js"));
    const { createApp } = await import("../src/app.js");
    admin = await User.create({ name: "CMS Admin", email: "cms-admin@test.local", password: "test-password-123", role: "admin", status: "active" });
    employee = await User.create({ name: "CMS Employee", email: "cms-employee@test.local", password: "test-password-123", role: "employee", status: "active", employeeCode: "EMP-CMS-TEST" });
    app = createApp();
    await new Promise((resolve, reject) => {
      server = app.listen(0, "127.0.0.1", resolve);
      server.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    if (storage) await rm(storage, { recursive: true, force: true });
  });

  it("publishes only active directory entries and gates uploads and CMS edits by Admin role", async () => {
    const loanCategory = await LoanCategory.create({ name: "Directory Home Category", slug: `directory-home-${Date.now()}`, status: "active" });
    const active = await Bank.create({ name: "Test Institution", category: "Test", minRoi: "8.25%", maxLtv: "75%", tat: "2 weeks", processingFee: "As published by lender", publicDescription: "Approved directory description.", availableLoanCategories: [loanCategory._id], relationshipManager: "Private staff record", contactPhone: "4165550100", status: "active", isPublicInstitution: true, institutionType: "Bank", displayOrder: 1 });
    await Bank.create({ name: "Hidden Institution", category: "Test", status: "inactive", isPublicInstitution: true });
    await Bank.create({ name: "Internal Desk", category: "Test", status: "active", isPublicInstitution: false });

    const publicList = await request("/banks/public");
    const publicListBody = await publicList.json();
    assert.equal(publicList.status, 200, JSON.stringify(publicListBody));
    assert.deepEqual(publicListBody.banks.map((bank) => bank.name), ["Test Institution"]);
    assert.deepEqual(publicListBody.banks[0], { _id: active._id.toString(), name: "Test Institution", category: "Test", minRoi: "8.25%", maxLtv: "75%", tat: "2 weeks", processingFee: "As published by lender", institutionType: "Bank", websiteUrl: "", publicDescription: "Approved directory description.", availableLoanCategories: [{ _id: loanCategory._id.toString(), name: loanCategory.name, slug: loanCategory.slug }], displayOrder: 1, logoStorageKey: "" });
    assert.equal("relationshipManager" in publicListBody.banks[0], false);
    assert.equal("contactPhone" in publicListBody.banks[0], false);

    const deniedUpload = new FormData();
    deniedUpload.append("image", png(), "logo.png");
    assert.equal((await request(`/banks/${active._id}/logo`, { method: "POST", body: deniedUpload }, employee)).status, 403);

    const invalidUpload = new FormData();
    invalidUpload.append("image", new Blob(["not an image"], { type: "image/png" }), "bad.png");
    assert.equal((await request(`/banks/${active._id}/logo`, { method: "POST", body: invalidUpload }, admin)).status, 400);

    const logoForm = new FormData();
    logoForm.append("image", png(), "logo.png");
    const uploaded = await request(`/banks/${active._id}/logo`, { method: "POST", body: logoForm }, admin);
    assert.equal(uploaded.status, 200);
    const bankAfterUpload = await uploaded.json();
    const assetUrl = await request(`/website-content/assets/${encodeURIComponent(bankAfterUpload.bank.logoStorageKey)}`);
    assert.equal(assetUrl.status, 200);
    assert.equal(assetUrl.headers.get("content-type"), "image/png");
    const directoryLogo = await request(`/banks/public/${active._id}/logo`);
    assert.equal(directoryLogo.status, 200, "Published bank logo is served through its public directory entry.");
    assert.equal(directoryLogo.headers.get("content-type"), "image/png");
    assert.equal(Buffer.from(await directoryLogo.arrayBuffer()).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const adminLogoPreview = await request(`/website-content/admin-assets/${encodeURIComponent(bankAfterUpload.bank.logoStorageKey)}`, {}, admin);
    assert.equal(adminLogoPreview.status, 200, "Admin can preview saved logo from the editor.");
    assert.equal(adminLogoPreview.headers.get("content-type"), "image/png");
    assert.equal(Buffer.from(await adminLogoPreview.arrayBuffer()).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal((await request(`/website-content/admin-assets/${encodeURIComponent(bankAfterUpload.bank.logoStorageKey)}`, {}, employee)).status, 403);

    const webpForm = new FormData();
    webpForm.append("image", webp(), "logo.webp");
    const webpUpload = await request(`/banks/${active._id}/logo`, { method: "POST", body: webpForm }, admin);
    assert.equal(webpUpload.status, 200);
    const webpBank = await webpUpload.json();
    const webpAsset = await request(`/website-content/assets/${encodeURIComponent(webpBank.bank.logoStorageKey)}`);
    assert.equal(webpAsset.status, 200);
    assert.equal(webpAsset.headers.get("content-type"), "image/webp");

    const photoForm = new FormData();
    photoForm.append("image", png(), "team.png");
    const photoResponse = await request("/website-content/team-assets", { method: "POST", body: photoForm }, admin);
    assert.equal(photoResponse.status, 201);
    teamPhotoKey = (await photoResponse.json()).photoStorageKey;
    assert.ok(await WebsiteAsset.exists({ storageKey: teamPhotoKey }), "Uploaded photos persist in MongoDB.");
    const adminPhotoPreview = await request("/website-content/admin-assets/" + encodeURIComponent(teamPhotoKey), {}, admin);
    assert.equal(adminPhotoPreview.status, 200, "Admin can preview a team photo before publishing the CMS draft.");
    assert.equal(adminPhotoPreview.headers.get("content-type"), "image/png");
    assert.equal(Buffer.from(await adminPhotoPreview.arrayBuffer()).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal((await request(`/website-content/assets/${encodeURIComponent(teamPhotoKey)}`)).status, 404, "Unpublished team photos remain private.");
    assert.equal((await request(`/website-content/admin-assets/${encodeURIComponent(teamPhotoKey)}`, {}, employee)).status, 403);

    const content = {
      hero: { bannerNotice: "", headline: "", subheadline: "" },
      about: { intro: "", mission: "", vision: "" },
      faqs: [],
      benefits: [{ title: "Clear steps", description: "A reviewed information item.", displayOrder: 0 }],
      team: [{ name: "Real Team Member", designation: "Operations", biography: "Approved profile.", photoStorageKey: teamPhotoKey, displayOrder: 0, active: true }, { name: "Inactive Draft", designation: "Draft", active: false }],
    };
    const forbiddenSave = await request("/website-content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) }, employee);
    assert.equal(forbiddenSave.status, 403);
    const save = await request("/website-content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) }, admin);
    assert.equal(save.status, 200);

    const published = await (await request("/website-content")).json();
    assert.deepEqual(published.content.team.map((member) => member.name), ["Real Team Member"]);
    assert.equal(published.content.benefits[0].title, "Clear steps");
    const publicTeamPhoto = await request(`/website-content/assets/${encodeURIComponent(teamPhotoKey)}`);
    assert.equal(publicTeamPhoto.status, 200);
    assert.equal(Buffer.from(await publicTeamPhoto.arrayBuffer()).subarray(0, 8).toString("hex"), "89504e470d0a1a0a");

    const hideInstitution = await request(`/banks/${active._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublicInstitution: false }) }, admin);
    assert.equal(hideInstitution.status, 200);
    assert.equal((await request(`/website-content/assets/${encodeURIComponent(webpBank.bank.logoStorageKey)}`)).status, 404);
    assert.equal((await request(`/banks/public/${active._id}/logo`)).status, 404, "Unpublished banks cannot serve public logos.");
    assert.equal((await request(`/website-content/admin-assets/${encodeURIComponent(webpBank.bank.logoStorageKey)}`, {}, admin)).status, 200, "Admin preview does not depend on public directory visibility.");
    assert.deepEqual((await (await request("/banks/public")).json()).banks, []);
  });
});
