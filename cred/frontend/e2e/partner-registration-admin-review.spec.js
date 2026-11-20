import { test, expect } from '@playwright/test';

test('public partner registration appears in Admin, can be corrected, reviewed and activated', async ({ page }) => {
  const suffix = `${Date.now()}`;
  const companyName = `Browser Partner ${suffix}`;
  const email = `browser-partner-${suffix}@realcred.invalid`;
  const document = Buffer.from('%PDF-1.7\nDisposable partner KYC proof\n%%EOF');

  await page.goto('/partner-register');
  await page.getByLabel(/Company \/ Firm Name/).fill(companyName);
  await page.getByLabel('Contact Person *').fill('Browser Applicant');
  await page.getByLabel('Email *').fill(email);
  await page.getByLabel('Phone *').fill('9876501234');
  await page.getByLabel('Business type *').fill('Loan Referral');
  await page.getByLabel('City *').fill('Indore');
  await page.getByLabel('State *').fill('Madhya Pradesh');
  await page.getByLabel('PIN code *').fill('452001');
  await page.getByLabel('Registered address *').fill('10 Test Road');
  await page.getByLabel('Communication address *').fill('10 Test Road');
  await page.getByLabel('Account holder *').fill('Browser Applicant');
  await page.getByLabel('Bank *').fill('Example Bank');
  await page.getByLabel('Branch *').fill('Indore Main');
  await page.getByLabel('Account number *', { exact: true }).fill('123456789012');
  await page.getByLabel('Confirm account number *').fill('123456789012');
  await page.getByLabel('IFSC *').fill('ABCD0123456');
  await page.locator('input[type="password"]').nth(0).fill('Browser-Partner-2026!');
  await page.locator('input[type="password"]').nth(1).fill('Browser-Partner-2026!');
  await page.getByRole('button', { name: 'Add document' }).click();
  await page.locator('form select').last().selectOption('PAN Card');
  await page.locator('input[type="file"]').setInputFiles({ name: 'partner-pan.pdf', mimeType: 'application/pdf', buffer: document });
  await page.getByRole('checkbox').check();
  const applicationResponse = page.waitForResponse((response) => response.url().endsWith('/partners/apply') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit application' }).click();
  expect((await applicationResponse).status()).toBe(201);
  await expect(page.getByRole('heading', { name: 'Application awaiting review' })).toBeVisible();

  await page.goto('/login');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.getByPlaceholder('name@realcred.in').fill('pw-admin@realcred.invalid');
  await page.getByPlaceholder('Enter account security key').fill('PW-Isolated-Test-2026!');
  await page.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/partners');
  await page.getByPlaceholder('Search partner by company name, contact, or city...').fill(companyName);
  const row = page.getByRole('row').filter({ hasText: companyName });
  await expect(row).toContainText('Pending');
  await expect(row).toContainText('browser-partner-');
  await row.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Partner review/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Activation checklist' })).toBeVisible();
  await page.getByLabel('Company / firm name').fill(`${companyName} Corrected`);
  await page.getByLabel('Email / login address').fill(`updated-${email}`);
  const updateResponse = page.waitForResponse((response) => response.url().includes('/profile') && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: 'Save profile details' }).click();
  expect((await updateResponse).status()).toBe(200);

  const kycCard = page.locator('article').filter({ hasText: 'PAN Card' });
  await kycCard.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByRole('button', { name: 'View authorized bank details' }).click();
  await page.getByRole('button', { name: 'Approve bank details' }).click();
  await page.getByRole('button', { name: 'Activate partner', exact: true }).click();

  const correctedRow = page.getByRole('row').filter({ hasText: 'PTR-' }).filter({ hasText: `${companyName} Corrected` });
  await expect(correctedRow).toBeVisible();
  await expect(correctedRow).toContainText('Active');
  await correctedRow.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await expect(correctedRow).toContainText('Inactive');
});
