import "dotenv/config";
import mongoose from "mongoose";
import { readFile } from "fs/promises";
import path from "path";
import User from "../models/User.js";
import Payout from "../models/Payout.js";
import PartnerChangeRequest from "../models/PartnerChangeRequest.js";
import { decryptPartnerValue, reencryptPartnerValue } from "../services/partnerSensitiveData.js";

// Dry-run by default. Apply only after a verified database backup and exact database-name check.
const apply = process.argv.includes("--apply");
const expected = process.argv.find((arg) => arg.startsWith("--expected-db-name="))?.split("=")[1];
const manifestPath = process.argv.find((arg) => arg.startsWith("--backup-manifest="))?.slice("--backup-manifest=".length);
if (!process.env.MONGO_URI) throw new Error("MONGO_URI must be configured.");
if (apply && (!expected || !manifestPath)) {
  throw new Error("Apply requires --expected-db-name=<exact-db> and --backup-manifest=<verified-backup.json>.");
}

const activeKeyId = () => process.env.PARTNER_PII_ACTIVE_KEY_ID || (process.env.PARTNER_PII_ENCRYPTION_KEY && !process.env.PARTNER_PII_ENCRYPTION_KEYS ? "legacy" : "");
const alreadyCurrent = (value) => String(value || "").startsWith(`enc:v2:${activeKeyId()}:`);
const migrateValue = (value) => {
  if (!value || alreadyCurrent(value)) return { value, changed: false };
  const next = reencryptPartnerValue(value);
  if (decryptPartnerValue(next) !== decryptPartnerValue(value)) throw new Error("Encryption verification failed; migration stopped.");
  return { value: next, changed: !alreadyCurrent(value) };
};
const fieldCounts = () => ({ values: 0, plaintext: 0, legacyV1: 0, oldKeyV2: 0 });
const countFieldValue = (counts, value) => {
  if (!value || alreadyCurrent(value)) return;
  counts.values += 1;
  if (String(value).startsWith("enc:v1:")) counts.legacyV1 += 1;
  else if (String(value).startsWith("enc:v2:")) counts.oldKeyV2 += 1;
  else counts.plaintext += 1;
};

try {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  const dbName = mongoose.connection.name;
  if (apply) {
    const manifest = JSON.parse(await readFile(path.resolve(manifestPath), "utf8"));
    if (manifest.verified !== true || manifest.databaseName !== expected || !String(manifest.backupReference || "").trim()) throw new Error("Backup manifest must confirm verified=true, the exact databaseName, and a backupReference.");
  }
  if (apply && dbName !== expected) throw new Error("Connected database name does not match --expected-db-name; no records changed.");
  const fields = { partnerAccountNumber: fieldCounts(), partnerBankHistory: fieldCounts(), profileChangeRequests: fieldCounts(), payoutSnapshots: fieldCounts() };
  const summary = { database: dbName, mode: apply ? "apply" : "dry-run", recordsScanned: 0, valuesNeedingEncryption: 0, valuesMigrated: 0, fields };
  const users = await User.find({ role: "partner" }).select("+accountNumber +bankDetailsHistory.accountNumber");
  for (const user of users) {
    summary.recordsScanned += 1;
    let changed = false;
    for (const [owner, key] of [[user, "accountNumber"], ...user.bankDetailsHistory.map((entry) => [entry, "accountNumber"])]) {
      const current = owner[key];
      if (!current || alreadyCurrent(current)) continue;
      countFieldValue(fields[key === "accountNumber" && owner === user ? "partnerAccountNumber" : "partnerBankHistory"], current);
      summary.valuesNeedingEncryption += 1;
      if (apply) { const next = migrateValue(current); owner[key] = next.value; changed ||= next.changed; summary.valuesMigrated += Number(next.changed); }
    }
    if (apply && changed) await user.save();
  }
  const changeRequests = await PartnerChangeRequest.find({}).select("+changes");
  for (const request of changeRequests) {
    const current = request.changes?.accountNumber;
    if (!current || alreadyCurrent(current)) continue;
    countFieldValue(fields.profileChangeRequests, current);
    summary.valuesNeedingEncryption += 1;
    if (apply) { request.changes.accountNumber = migrateValue(current).value; request.markModified("changes"); await request.save(); summary.valuesMigrated += 1; }
  }
  const payouts = await Payout.find({ "bankSnapshot.encryptedAccountNumber": { $exists: true, $ne: "" } }).select("+bankSnapshot.encryptedAccountNumber");
  for (const payout of payouts) {
    const current = payout.bankSnapshot?.encryptedAccountNumber;
    if (!current || alreadyCurrent(current)) continue;
    countFieldValue(fields.payoutSnapshots, current);
    summary.valuesNeedingEncryption += 1;
    if (apply) { payout.bankSnapshot.encryptedAccountNumber = migrateValue(current).value; await payout.save(); summary.valuesMigrated += 1; }
  }
  console.info(JSON.stringify(summary));
} catch (error) {
  console.error(JSON.stringify({ event: "bank_encryption_migration_failed", error: error.message }));
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
