import test from "node:test";
import assert from "node:assert/strict";
import { decryptPartnerValue, encryptPartnerValue, maskPartnerAccount, reencryptPartnerValue } from "../src/services/partnerSensitiveData.js";

test("partner bank encryption uses authenticated key-versioned ciphertext and supports rotation", () => {
  const before = { keys: process.env.PARTNER_PII_ENCRYPTION_KEYS, active: process.env.PARTNER_PII_ACTIVE_KEY_ID, legacy: process.env.PARTNER_PII_ENCRYPTION_KEY, node: process.env.NODE_ENV };
  try {
    process.env.PARTNER_PII_ENCRYPTION_KEYS = JSON.stringify({ old: "a".repeat(64), active: "b".repeat(64) });
    process.env.PARTNER_PII_ACTIVE_KEY_ID = "old";
    delete process.env.PARTNER_PII_ENCRYPTION_KEY;
    const oldCiphertext = encryptPartnerValue("123456789012");
    assert.match(oldCiphertext, /^enc:v2:old:/);
    assert.equal(decryptPartnerValue(oldCiphertext), "123456789012");
    assert.equal(maskPartnerAccount(oldCiphertext), "****9012");
    process.env.PARTNER_PII_ACTIVE_KEY_ID = "active";
    const rotated = reencryptPartnerValue(oldCiphertext);
    assert.match(rotated, /^enc:v2:active:/);
    assert.equal(decryptPartnerValue(rotated), "123456789012");
    assert.throws(() => { process.env.PARTNER_PII_ENCRYPTION_KEYS = JSON.stringify({ active: "c".repeat(64) }); decryptPartnerValue(oldCiphertext); }, /not configured/);
  } finally {
    for (const [key, value] of Object.entries({ PARTNER_PII_ENCRYPTION_KEYS: before.keys, PARTNER_PII_ACTIVE_KEY_ID: before.active, PARTNER_PII_ENCRYPTION_KEY: before.legacy, NODE_ENV: before.node })) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});
