import { test, expect } from '@playwright/test';

const userFor = (role) => ({ _id: 'test-user', name: 'Browser Test', email: 'test@example.invalid', role, employeeCode: 'EMP-TEST', partnerCode: 'PRT-TEST', mustChangePassword: false });

async function installApiMocks(page, role) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api/, '');
    let body = { success: true, data: [] };
    if (path === '/auth/me') body = { success: true, user: userFor(role) };
    else if (path === '/leads') body = { success: true, leads: [], pagination: { page: 1, pages: 1, total: 0 } };
    else if (path === '/applications' || path === '/customers' || path === '/followups') body = { success: true, data: [] };
    else if (path === '/invoices' || path === '/invoices/my') body = { success: true, invoices: [] };
    else if (path === '/payouts' || path === '/payouts/my') body = { success: true, payouts: [] };
    else if (path === '/employees') body = { success: true, employees: [] };
    else if (path === '/partners') body = { success: true, partners: [] };
    else if (path === '/banks') body = { success: true, banks: [] };
    else if (path === '/loan-categories') body = { success: true, categories: [] };
    else if (path === '/guides') body = { success: true, guides: [] };
    else if (path === '/tickets') body = { success: true, tickets: [] };
    else if (path === '/website-content') body = { success: true, content: { hero: {}, about: {}, faqs: [] } };
    else if (path === '/commission-rules') body = { success: true, rules: [] };
    else if (path === '/documents/templates') body = { success: true, templates: [] };
    else if (path === '/documents/generated') body = { success: true, documents: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.addInitScript(({ role, user }) => {
    localStorage.setItem('realcred_token', 'browser-test-token');
    localStorage.setItem('realcred_user', JSON.stringify(user));
    localStorage.setItem('realcred_role', role);
  }, { role, user: userFor(role) });
}

for (const [role, route, heading] of [
  ['admin', '/admin/leads', 'Lead'],
  ['employee', '/employee/leads', 'Lead'],
  ['partner', '/partner/leads', 'Lead'],
]) {
  test(`${role} direct navigation and refresh at desktop/tablet/mobile`, async ({ page }) => {
    const consoleErrors = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await installApiMocks(page, role);
    for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(route);
      await expect(page.locator('body')).toContainText(heading);
      await page.reload();
      await expect(page.locator('body')).toContainText(heading);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, `horizontal overflow at ${viewport.width}px`).toBe(false);
    }
    expect(consoleErrors).toEqual([]);
  });
}

test('public home and apply pages load directly', async ({ page }) => {
  const consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await installApiMocks(page, 'admin');
  for (const route of ['/', '/apply', '/partner-register', '/contact', '/services']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  }
  expect(consoleErrors).toEqual([]);
});
