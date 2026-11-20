import { test, expect } from '@playwright/test';
import Lead from '../../backend/src/models/Lead.js';

test('Partner processes only its assigned lead and Admin confirms disbursement evidence', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Partner', exact: true }).click();
  await page.getByPlaceholder('name@realcred.in').fill('pw-workflow-partner@realcred.invalid');
  await page.getByPlaceholder('Enter account security key').fill('PW-Workflow-Test-2026!');
  await page.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(page).toHaveURL(/\/partner$/);
  await page.goto('/partner/leads');
  const leadCard = page.locator('article').filter({ hasText: 'RC-LD-PW-PARTNER' });
  await expect(leadCard).toContainText('Playwright Partner Processing Lead');
  await expect(page.getByText('Playwright Document Lead', { exact: true })).toHaveCount(0);

  for (const stage of ['In Process', 'Follow-up', 'Approved', 'Sanctioned']) {
    const response = page.waitForResponse((item) => item.url().endsWith('/leads/RC-LD-PW-PARTNER/partner-status') && item.request().method() === 'PATCH');
    await leadCard.getByRole('button', { name: stage, exact: true }).click();
    expect((await response).status()).toBe(200);
    await expect(leadCard.getByText(stage, { exact: true }).first()).toBeVisible();
  }

  await leadCard.getByRole('button', { name: 'Submit disbursement' }).click();
  await page.getByLabel('Confirmed amount').fill('175000');
  await page.getByLabel('Transaction reference').fill('PW-DISBURSEMENT-REF-001');
  await page.getByLabel('Evidence PDF or image').setInputFiles({ name: 'settlement-evidence.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nDisposable settlement evidence\n%%EOF') });
  const submission = page.waitForResponse((response) => response.url().endsWith('/leads/RC-LD-PW-PARTNER/disbursement') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  expect((await submission).status()).toBe(201);
  await expect(leadCard).toContainText('Disbursement submitted; awaiting Admin confirmation.');

  const mongoose = Lead.db.base;
  await mongoose.connect(process.env.PLAYWRIGHT_MONGO_URI);
  try {
    const lead = await Lead.findOne({ leadCode: 'RC-LD-PW-PARTNER' }).lean();
    expect(lead).toMatchObject({ currentStatus: 'Sanctioned', partnerId: 'PTR-PW-WORKFLOW', disbursementUpdate: { status: 'pending_confirmation', amount: 175000, reference: 'PW-DISBURSEMENT-REF-001' } });
  } finally { await mongoose.disconnect(); }

  await page.getByRole('button', { name: 'Logout' }).click();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.getByPlaceholder('name@realcred.in').fill('pw-admin@realcred.invalid');
  await page.getByPlaceholder('Enter account security key').fill('PW-Isolated-Test-2026!');
  await page.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/disbursements');
  const submissionCard = page.locator('article').filter({ hasText: 'RC-LD-PW-PARTNER' });
  await expect(submissionCard).toContainText('PW-DISBURSEMENT-REF-001');
  const evidenceResponse = page.waitForResponse((response) => response.url().endsWith('/leads/RC-LD-PW-PARTNER/disbursement/evidence/0'));
  await submissionCard.getByRole('button', { name: 'Download settlement-evidence.pdf' }).click();
  expect((await evidenceResponse).status()).toBe(200);
  await submissionCard.getByRole('button', { name: 'Review submission' }).click();
  const confirmation = page.waitForResponse((response) => response.url().endsWith('/leads/RC-LD-PW-PARTNER/disbursement/review') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Confirm Disbursed' }).click();
  expect((await confirmation).status()).toBe(200);

  await mongoose.connect(process.env.PLAYWRIGHT_MONGO_URI);
  try {
    const lead = await Lead.findOne({ leadCode: 'RC-LD-PW-PARTNER' }).lean();
    expect(lead.currentStatus).toBe('Disbursed');
    expect(lead.disbursementUpdate.status).toBe('confirmed');
  } finally { await mongoose.disconnect(); }
});
