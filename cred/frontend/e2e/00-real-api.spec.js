import { test, expect } from '@playwright/test';
import Bank from '../../backend/src/models/Bank.js';
import Ticket from '../../backend/src/models/Ticket.js';
import WebsiteContent from '../../backend/src/models/WebsiteContent.js';
import User from '../../backend/src/models/User.js';

test('Admin CMS and public enquiry workflows persist through the real API and isolated MongoDB', async ({ page }) => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const bankName = `PW Institution ${suffix}`;
  const teamName = `PW Team ${suffix}`;
  const teamUpdatedName = `${teamName} Updated`;
  const benefitTitle = `PW Benefit ${suffix}`;
  const benefitUpdatedTitle = `${benefitTitle} Revised`;
  const logo = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext('2d');
    context.fillStyle = '#2463eb';
    context.fillRect(0, 0, 2, 2);
    return canvas.toDataURL('image/png').split(',')[1];
  }), 'base64');
  const mongoose = Bank.db.base;

  await page.goto('/login');
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await page.getByPlaceholder('name@realcred.in').fill('pw-admin@realcred.invalid');
  await page.getByPlaceholder('Enter account security key').fill('PW-Isolated-Test-2026!');
  await page.getByRole('button', { name: /Sign In & Open Dashboard/ }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.goto('/admin/banks-nbfc');
  await page.getByRole('button', { name: 'Empanel New Lender' }).click();
  await page.getByPlaceholder('Enter bank / NBFC name').fill(bankName);
  await page.locator('select[name="category"]').selectOption('Private Bank');
  await page.locator('select[name="institutionType"]').selectOption('NBFC');
  await page.getByLabel(/Show this institution in the public/).check();
  await page.getByLabel('Public description (optional)').fill('Published directory details from the Admin configuration.');
  await page.getByLabel('Playwright Home Finance', { exact: true }).check();
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: logo });
  const bankCreateResponse = page.waitForResponse((response) => response.url().endsWith('/banks') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save Partner' }).click();
  const createdBankResponse = await bankCreateResponse;
  expect(createdBankResponse.status()).toBe(201);
  const createdBankPayload = await createdBankResponse.json();
  expect(createdBankPayload.bank?.name).toBe(bankName);
  await expect(page.getByRole('heading', { name: bankName, exact: true })).toBeVisible();

  await mongoose.connect(process.env.PLAYWRIGHT_MONGO_URI);
  try {
    const persistedBank = await Bank.findOne({ name: bankName }).lean();
    if (!persistedBank) throw new Error(`Mongo verification failed. DB=${mongoose.connection.name} users=${await User.countDocuments()} banks=${JSON.stringify(await Bank.find().select('name').lean())}`);
    expect(persistedBank).toMatchObject({ status: 'active', institutionType: 'NBFC', isPublicInstitution: true });
    expect(persistedBank.logoStorageKey).toBeTruthy();
  } finally {
    await mongoose.disconnect();
  }

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Banks & NBFCs' })).toBeVisible();
  await expect(page.getByRole('heading', { name: bankName, exact: true })).toBeVisible();
  await page.goto('/services#playwright-home-finance');
  await expect(page.getByRole('heading', { name: 'Playwright Home Finance', exact: true })).toBeVisible();
  await expect(page.getByText('Configured document requirements')).toBeVisible();
  await expect(page.getByText('Playwright ID', { exact: true })).toBeVisible();
  await expect(page.getByText('per annum onwards', { exact: true })).toHaveCount(0);
  await page.goto('/');
  const institutionCard = page.locator('.home-bank-offer').filter({ hasText: bankName });
  await institutionCard.getByRole('button', { name: /Read more/ }).click();
  await expect(page.getByRole('dialog')).toContainText(bankName);
  await expect(page.getByRole('dialog')).toContainText('Published directory details from the Admin configuration.');
  await expect(page.getByRole('dialog')).toContainText('Playwright Home Finance');
  await page.getByRole('dialog').getByRole('link', { name: 'Apply Now' }).click();
  await expect(page).toHaveURL(/\/apply\?institution=/);
  await page.getByPlaceholder('Full name').fill('Directory Applicant');
  await page.getByPlaceholder('Phone number').fill('9876501234');
  await page.getByPlaceholder('Email address').fill('directory-applicant@example.test');
  await page.getByPlaceholder('Apartment, Street name, Landmark, Pincode').fill('Disposable test address');
  await page.getByRole('button', { name: 'Continue to Loan Details' }).click();
  await expect(page.locator('#preferred-institution')).toHaveValue(bankName);
  await expect(page.getByRole('combobox').nth(0)).toHaveValue('Playwright Home Finance');

  await page.goto('/admin/banks-nbfc');
  await page.getByRole('button', { name: 'Deactivate' }).click();
  await expect(page.getByText(bankName, { exact: true })).toBeVisible();
  await page.goto('/');
  await expect(page.getByText(bankName, { exact: true })).toHaveCount(0);

  await page.goto('/admin/website-cms');
  await page.getByRole('button', { name: 'Our Team', exact: true }).click();
  await page.getByRole('button', { name: 'Add team member' }).click();
  await page.getByLabel('Name').last().fill(teamName);
  await page.getByLabel('Designation').last().fill('Test Specialist');
  await page.getByLabel('Short biography').last().fill('Disposable browser integration profile.');
  const teamPhotoUpload = page.waitForResponse((response) => response.url().includes('/website-content/team-assets') && response.request().method() === 'POST');
  await page.locator('input[type="file"]').last().setInputFiles({ name: 'team.png', mimeType: 'image/png', buffer: logo });
  const teamPhotoResponse = await teamPhotoUpload;
  expect(teamPhotoResponse.status()).toBe(201);
  const teamPhotoKey = (await teamPhotoResponse.json()).photoStorageKey;
  expect(teamPhotoKey).toBeTruthy();
  await page.getByLabel('Active', { exact: true }).check();
  await page.getByRole('button', { name: 'Save team' }).click();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Our Team' })).toBeVisible();
  await expect(page.getByText(teamName, { exact: true })).toBeVisible();
  await expect(page.locator(`img.home-team-photo[alt="${teamName}"]`)).toBeVisible();
  const publicPhotoResponse = await page.request.get(`http://127.0.0.1:5017/api/website-content/assets/${encodeURIComponent(teamPhotoKey)}`);
  expect(publicPhotoResponse.status()).toBe(200);
  expect(publicPhotoResponse.headers()['content-type']).toContain('image/png');
  expect((await publicPhotoResponse.body()).subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'));
  const publishedTeamPhoto = page.locator(`img.home-team-photo[alt="${teamName}"]`);
  await publishedTeamPhoto.scrollIntoViewIfNeeded();
  await expect(publishedTeamPhoto).toHaveAttribute('src', new RegExp(encodeURIComponent(teamPhotoKey)));

  await page.goto('/admin/website-cms');
  await page.getByRole('button', { name: 'Our Team', exact: true }).click();
  await page.getByLabel('Name').last().fill(teamUpdatedName);
  await page.getByRole('button', { name: 'Save team' }).click();
  await page.goto('/');
  await expect(page.getByText(teamUpdatedName, { exact: true })).toBeVisible();
  await expect(page.getByText(teamName, { exact: true })).toHaveCount(0);

  await page.goto('/admin/website-cms');
  await page.getByRole('button', { name: 'Benefits', exact: true }).click();
  await page.getByRole('button', { name: 'Add benefit' }).click();
  await page.getByLabel('Title').last().fill(benefitTitle);
  await page.getByLabel('Description').last().fill('Disposable reviewed benefit for browser verification.');
  await page.getByRole('button', { name: 'Save benefits' }).click();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Benefits of RealCred' })).toBeVisible();
  await expect(page.getByText(benefitTitle, { exact: true })).toBeVisible();

  await page.goto('/admin/website-cms');
  await page.getByRole('button', { name: 'Benefits', exact: true }).click();
  await page.getByLabel('Title').last().fill(benefitUpdatedTitle);
  const benefitUpdateResponse = page.waitForResponse((response) => response.url().endsWith('/website-content') && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Save benefits' }).click();
  const updatedBenefitsResponse = await benefitUpdateResponse;
  expect(updatedBenefitsResponse.status()).toBe(200);
  const updatedBenefitsBody = await updatedBenefitsResponse.json();
  expect(updatedBenefitsBody.content.benefits.some((item) => item.title === benefitUpdatedTitle)).toBe(true);
  await page.goto('/');
  await expect(page.getByText(benefitUpdatedTitle, { exact: true })).toBeVisible();
  await expect(page.getByText(benefitTitle, { exact: true })).toHaveCount(0);

  await page.getByPlaceholder('e.g. Rajesh Khurana').fill('E2E Borrower');
  await page.getByPlaceholder('+91 98200 XXXXX').fill('9876543210');
  await page.locator('#enquiry-amount').fill('1200000');
  await page.locator('#enquiry-category').selectOption('Playwright Home Finance');
  const validCallbackRequests = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/tickets/callback') && request.method() === 'POST') validCallbackRequests.push(request);
  });
  await page.getByRole('button', { name: /Request a callback/ }).click();
  await expect(page.getByText('Callback Request Received!')).toBeVisible();
  await expect.poll(() => validCallbackRequests.length).toBe(1);
  const callbackPayload = JSON.parse(validCallbackRequests[0].postData());
  await mongoose.connect(process.env.PLAYWRIGHT_MONGO_URI);
  try {
    const referenceText = await page.getByText(/Reference RC-CB-/).textContent();
    const callback = await Ticket.findOne({ ticketId: referenceText.match(/RC-CB-[A-Z0-9]+/)?.[0] }).select("+idempotencyKey");
    expect(callback).toMatchObject({ customerName: 'E2E Borrower', customerPhone: '9876543210', loanCategory: 'Playwright Home Finance', source: 'website', ticketType: 'Callback', status: 'Open' });
    expect(callback.idempotencyKey).toBe(callbackPayload.idempotencyKey);
  } finally {
    await mongoose.disconnect();
  }
  const duplicateResponse = await page.request.post('http://127.0.0.1:5017/api/tickets/callback', { data: callbackPayload });
  expect(duplicateResponse.status()).toBe(200);
  expect((await duplicateResponse.json()).duplicate).toBe(true);
  expect(validCallbackRequests).toHaveLength(1);

  await page.getByRole('button', { name: 'Submit another request' }).click();
  await page.getByPlaceholder('e.g. Rajesh Khurana').fill('Invalid Borrower');
  await page.getByPlaceholder('+91 98200 XXXXX').fill('not-a-phone');
  await page.locator('#enquiry-amount').fill('-12');
  await page.locator('#enquiry-category').selectOption('Playwright Home Finance');
  await page.getByRole('button', { name: /Request a callback/ }).click();
  await expect(page.getByText('Enter a valid phone number with 7 to 15 digits.')).toBeVisible();
  await expect(page.getByText('Enter a requested amount greater than zero.')).toBeVisible();
  expect(validCallbackRequests).toHaveLength(1);

  await mongoose.connect(process.env.PLAYWRIGHT_MONGO_URI);
  try {
    expect(await WebsiteContent.countDocuments()).toBe(1);
    expect(await Ticket.countDocuments({ ticketType: 'Callback' })).toBe(1);
    const content = await WebsiteContent.findOne().lean();
    expect(content.team.some((member) => member.name === teamUpdatedName && member.active)).toBe(true);
    expect(content.team.find((member) => member.name === teamUpdatedName)?.photoStorageKey).toBe(teamPhotoKey);
    expect(content.benefits.some((benefit) => benefit.title === benefitUpdatedTitle)).toBe(true);
  } finally {
    await mongoose.disconnect();
  }
});
