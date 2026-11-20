import { test, expect } from '@playwright/test';
import Lead from '../../backend/src/models/Lead.js';

test('assigned Employee uploads, approves, verifies and assigns a customer lead to an eligible partner', async ({ page, browser }) => {
  const mongoose = Lead.db.base;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pWQAAAAASUVORK5CYII=', 'base64');
  await page.goto('/login');
  await page.getByRole('button', { name: 'Employee', exact: true }).click();
  await page.getByPlaceholder('name@realcred.in').fill('pw-employee@realcred.invalid');
  await page.getByPlaceholder('Enter account security key').fill('PW-Employee-Test-2026!');
  await page.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(page).toHaveURL(/\/employee$/);
  await page.goto('/employee/documents');
  await page.locator('header').getByLabel('Lead').selectOption('RC-LD-PW-E2E');
  await expect(page.getByText('Playwright Document Lead', { exact: true })).toBeVisible();

  await page.getByLabel('Document name/type').selectOption('Playwright ID');
  await page.getByLabel('Short note (optional)').fill('Disposable upload with reviewer context.');
  await page.getByLabel('Document file').setInputFiles({ name: 'playwright-id.png', mimeType: 'image/png', buffer: png });
  const upload = page.waitForResponse((response) => response.url().endsWith('/leads/RC-LD-PW-E2E/documents') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Upload document for review' }).click();
  expect((await upload).status()).toBe(201);
  await expect(page.getByText('pending', { exact: true })).toBeVisible();
  await expect(page.getByText('Note: Disposable upload with reviewer context.')).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.getByPlaceholder('name@realcred.in').fill('pw-admin@realcred.invalid');
  await page.getByPlaceholder('Enter account security key').fill('PW-Isolated-Test-2026!');
  await page.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/document-verification');
  await page.locator('header').getByLabel('Lead').selectOption('RC-LD-PW-E2E');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByText('approved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Employee', exact: true }).click();
  await page.getByPlaceholder('name@realcred.in').fill('pw-employee@realcred.invalid');
  await page.getByPlaceholder('Enter account security key').fill('PW-Employee-Test-2026!');
  await page.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(page).toHaveURL(/\/employee$/);
  await page.goto('/employee/documents');
  await page.locator('header').getByLabel('Lead').selectOption('RC-LD-PW-E2E');
  await page.getByRole('button', { name: 'Verify lead when requirements are approved' }).click();
  await expect(page.getByLabel('Assign to approved partner')).toBeVisible();
  await page.getByLabel('Assign to approved partner').selectOption('PTR-PW-E2E');
  const assignmentNote = 'Disposable assignment note for audit history.';
  await page.getByLabel('Internal assignment note (optional)').fill(assignmentNote);
  const assignment = page.waitForResponse((response) => response.url().endsWith('/leads/RC-LD-PW-E2E/partner-assignment') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Assign partner' }).click();
  expect((await assignment).status()).toBe(200);

  await mongoose.connect(process.env.PLAYWRIGHT_MONGO_URI);
  try {
    const lead = await Lead.findOne({ leadCode: 'RC-LD-PW-E2E' }).lean();
    expect(lead.currentStatus).toBe('Verified');
    expect(lead.documents[0]).toMatchObject({ name: 'Playwright ID', description: 'Disposable upload with reviewer context.', status: 'approved', uploadedByRole: 'employee' });
    expect(lead.partnerId).toBe('PTR-PW-E2E');
    expect(lead.partnerAssignmentHistory).toHaveLength(1);
    expect(lead.partnerAssignmentHistory[0]).toMatchObject({ note: assignmentNote, previousPartnerId: '' });
  } finally { await mongoose.disconnect(); }

  await page.locator('header').getByLabel('Lead').selectOption('RC-LD-PW-POLICY-MISSING');
  await expect(page.getByRole('alert')).toContainText('No required-document policy matches');
  await expect(page.getByRole('button', { name: 'Verify lead when requirements are approved' })).toBeDisabled();

  await page.getByRole('button', { name: 'Logout' }).click();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.getByPlaceholder('name@realcred.in').fill('pw-admin@realcred.invalid');
  await page.getByPlaceholder('Enter account security key').fill('PW-Isolated-Test-2026!');
  await page.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/leads');
  await page.getByPlaceholder('Search by customer, phone, lead ID, or CBS number...').fill('Playwright Document Lead');
  await page.getByText('Playwright Document Lead', { exact: true }).last().click();
  await expect(page.getByLabel('Partner assignment history')).toContainText(assignmentNote);

  await page.goto('/admin/loan-categories');
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Edit Loan Category' })).toBeVisible();
  await page.getByRole('button', { name: 'Add document' }).click();
  await page.getByRole('textbox', { name: 'Required document' }).fill('Proof of Income');
  await page.getByLabel('Employment types (comma separated)').fill('Salaried');
  await page.getByRole('button', { name: 'Update Category' }).click();
  await expect(page.getByText('1 document requirement configured')).toBeVisible();
  await page.goto('/admin/document-verification');
  await page.locator('header').getByLabel('Lead').selectOption('RC-LD-PW-POLICY-MISSING');
  await expect(page.getByText('Required: Proof of Income')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  const otherEmployeePage = await browser.newPage();
  await otherEmployeePage.goto('/login');
  await otherEmployeePage.getByRole('button', { name: 'Employee', exact: true }).click();
  await otherEmployeePage.getByPlaceholder('name@realcred.in').fill('pw-other-employee@realcred.invalid');
  await otherEmployeePage.getByPlaceholder('Enter account security key').fill('PW-Employee-Test-2026!');
  await otherEmployeePage.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  const unauthorizedRead = await otherEmployeePage.evaluate(async () => {
    const response = await fetch('http://127.0.0.1:5017/api/leads/RC-LD-PW-E2E/documents', { credentials: 'include' });
    return response.status;
  });
  expect([401, 403, 404]).toContain(unauthorizedRead);
  await otherEmployeePage.close();
});
