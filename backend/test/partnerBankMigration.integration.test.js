import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { createCipheriv, randomBytes } from "crypto";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Payout from "../src/models/Payout.js";
import PartnerChangeRequest from "../src/models/PartnerChangeRequest.js";
import { decryptPartnerValue, encryptPartnerValue } from "../src/services/partnerSensitiveData.js";

const testUri = process.env.TEST_MONGO_URI || "";
const localOnly = (() => { try { return ["localhost", "127.0.0.1", "::1"].includes(new URL(testUri).hostname); } catch { return false; } })();
const legacyV1 = (text, keyHex) => { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv); const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]); return `enc:v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`; };

test("bank migration encrypts isolated legacy fields and leaves masked output only", { skip: !localOnly }, async () => {
  const suffix = randomUUID().replaceAll("-", "");
  const dbName = `realcred_bank_migration_${suffix}`;
  const oldKey = "a".repeat(64);
  const activeKey = "b".repeat(64);
  const previous = { keys: process.env.PARTNER_PII_ENCRYPTION_KEYS, active: process.env.PARTNER_PII_ACTIVE_KEY_ID, legacy: process.env.PARTNER_PII_ENCRYPTION_KEY };
  const temp = await mkdtemp(path.join(os.tmpdir(), "realcred-bank-migration-"));
  try {
    process.env.PARTNER_PII_ENCRYPTION_KEYS = JSON.stringify({ old: oldKey, active: activeKey });
    process.env.PARTNER_PII_ACTIVE_KEY_ID = "old";
    process.env.PARTNER_PII_ENCRYPTION_KEY = oldKey;
    await mongoose.connect(testUri, { dbName, serverSelectionTimeoutMS: 5000 });
    const oldV2 = encryptPartnerValue("987654321098");
    const oldV1 = legacyV1("456789012345", oldKey);
    const partner = await User.create({ name: "Migration Fixture", email: `migration-${suffix}@test.local`, password: "test-password", role: "partner", status: "active", partnerCode: `PTR-MIG-${suffix}`, accountNumber: "123456789012", bankDetailsHistory: [{ accountNumber: oldV2 }, { accountNumber: oldV1 }] });
    const change = await PartnerChangeRequest.create({ partnerId: partner._id, partnerCode: partner.partnerCode, changes: { accountNumber: "555555555555" } });
    const payout = await Payout.create({ paymentNumber: `MIG-${suffix}`, partnerId: partner.partnerCode, partnerName: "Migration Fixture", leadId: `LEAD-${suffix}`, customerName: "Fixture", loanAmount: 100, totalAmount: 1, amount: 1, bankSnapshot: { encryptedAccountNumber: "222222222222" } });
    const manifestPath = path.join(temp, "backup-manifest.json");
    await writeFile(manifestPath, JSON.stringify({ verified: true, databaseName: dbName, backupReference: "isolated-test-fixture" }));
    const isolatedUri = new URL(testUri); isolatedUri.pathname = `/${dbName}`;
    const runEnv = { ...process.env, MONGO_URI: isolatedUri.toString(), PARTNER_PII_ACTIVE_KEY_ID: "active", PARTNER_PII_ENCRYPTION_KEYS: JSON.stringify({ old: oldKey, active: activeKey }), PARTNER_PII_ENCRYPTION_KEY: oldKey };
    const script = path.resolve("src/scripts/migratePartnerBankEncryption.js");
    const output = execFileSync(process.execPath, [script, "--apply", `--expected-db-name=${dbName}`, `--backup-manifest=${manifestPath}`], { cwd: path.resolve("."), env: runEnv, encoding: "utf8" });
    assert.match(output, /"mode":"apply"/);
    assert.match(output, /"valuesMigrated":5/);
    const migratedPartner = await User.findById(partner._id).select("+accountNumber +bankDetailsHistory.accountNumber");
    assert.match(migratedPartner.accountNumber, /^enc:v2:active:/);
    assert.equal(decryptPartnerValue(migratedPartner.accountNumber), "123456789012");
    assert.match(migratedPartner.bankDetailsHistory[0].accountNumber, /^enc:v2:active:/);
    assert.equal(decryptPartnerValue(migratedPartner.bankDetailsHistory[0].accountNumber), "987654321098");
    assert.match(migratedPartner.bankDetailsHistory[1].accountNumber, /^enc:v2:active:/);
    assert.equal(decryptPartnerValue(migratedPartner.bankDetailsHistory[1].accountNumber), "456789012345");
    const migratedChange = await PartnerChangeRequest.findById(change._id).select("+changes");
    assert.match(migratedChange.changes.accountNumber, /^enc:v2:active:/);
    const migratedPayout = await Payout.findById(payout._id).select("+bankSnapshot.encryptedAccountNumber");
    assert.match(migratedPayout.bankSnapshot.encryptedAccountNumber, /^enc:v2:active:/);
  } finally {
    if (mongoose.connection.readyState) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
    for (const [key, value] of Object.entries({ PARTNER_PII_ENCRYPTION_KEYS: previous.keys, PARTNER_PII_ACTIVE_KEY_ID: previous.active, PARTNER_PII_ENCRYPTION_KEY: previous.legacy })) value === undefined ? delete process.env[key] : process.env[key] = value;
    await rm(temp, { recursive: true, force: true });
  }
});
