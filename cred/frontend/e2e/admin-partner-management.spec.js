import { test, expect } from '@playwright/test';

test('Admin reviews partner profile and KYC, views bank data, resets credentials and deactivates account', async ({ page, browser }) => {
  const partnerContext = await browser.newContext();
  const partnerPage = await partnerContext.newPage();
  await partnerPage.goto('/login');
  await partnerPage.getByRole('button', { name: 'Partner', exact: true }).click();
  await partnerPage.getByPlaceholder('name@realcred.in').fill('pw-partner@realcred.invalid');
  await partnerPage.getByPlaceholder('Enter account security key').fill('PW-Partner-Test-2026!');
  await partnerPage.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(partnerPage).toHaveURL(/\/partner$/);

  await page.goto('/login');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.getByPlaceholder('name@realcred.in').fill('pw-admin@realcred.invalid');
  await page.getByPlaceholder('Enter account security key').fill('PW-Isolated-Test-2026!');
  await page.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/partners');
  await page.getByPlaceholder('Search partner by company name, contact, or city...').fill('Playwright Partner Firm');
  const partnerRow = page.getByRole('row').filter({ hasText: 'PTR-PW-E2E' });
  await expect(partnerRow).toBeVisible();
  await partnerRow.getByRole('button', { name: /Review KYC/ }).click();

  await expect(page.getByRole('heading', { name: /Partner review · Playwright Partner Firm/ })).toBeVisible();
  await expect(page.getByText('masked account ****9012')).toBeVisible();
  await expect(page.getByText('123456789012', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'View authorized bank details' }).click();
  await expect(page.getByText('123456789012', { exact: true })).toBeVisible();

  await page.getByLabel('PDF or image').setInputFiles({ name: 'admin-pan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nDisposable Admin KYC evidence\n%%EOF') });
  const uploadResponse = page.waitForResponse((response) => response.url().endsWith('/partners/PTR-PW-E2E/documents') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Upload pending review' }).click();
  expect((await uploadResponse).status()).toBe(201);
  const kycCard = page.locator('article').filter({ hasText: 'PAN Card' });
  await expect(kycCard.getByText('pending', { exact: true })).toBeVisible();
  await kycCard.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(kycCard.getByText('approved', { exact: true })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Issue one-time password reset' }).click();
  await expect(page.getByRole('heading', { name: 'One-time temporary password' })).toBeVisible();
  const temporaryPassword = await page.locator('code').innerText();
  expect(temporaryPassword).toBeTruthy();
  await partnerPage.reload();
  await expect(partnerPage).toHaveURL(/\/login$/);
  await partnerPage.getByRole('button', { name: 'Partner', exact: true }).click();
  await partnerPage.getByPlaceholder('name@realcred.in').fill('pw-partner@realcred.invalid');
  await partnerPage.getByPlaceholder('Enter account security key').fill(temporaryPassword);
  await partnerPage.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(partnerPage).toHaveURL(/\/change-password$/);
  await partnerContext.close();

  await page.getByLabel('Company / firm name').fill('Playwright Partner Firm Updated');
  await page.getByLabel('Email / login address').fill('pw-partner-updated@realcred.invalid');
  const profileUpdate = page.waitForResponse((response) => response.url().endsWith('/partners/PTR-PW-E2E/profile') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Save profile details' }).click();
  expect((await profileUpdate).status()).toBe(200);
  await expect(page.getByText('Playwright Partner Firm Updated', { exact: true })).toBeVisible();
  await expect(page.getByText('pw-partner-updated@realcred.invalid', { exact: true }).first()).toBeVisible();
  const updatedPartnerPage = await browser.newPage();
  await updatedPartnerPage.goto('/login');
  await updatedPartnerPage.getByRole('button', { name: 'Partner', exact: true }).click();
  await updatedPartnerPage.getByPlaceholder('name@realcred.in').fill('pw-partner-updated@realcred.invalid');
  await updatedPartnerPage.getByPlaceholder('Enter account security key').fill(temporaryPassword);
  await updatedPartnerPage.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(updatedPartnerPage).toHaveURL(/\/change-password$/);
  await updatedPartnerPage.close();

  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await expect(partnerRow).toContainText('Inactive');
  await partnerRow.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(partnerRow).toContainText('Active');
});
