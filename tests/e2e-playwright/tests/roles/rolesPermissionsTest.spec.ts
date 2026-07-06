import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { PmDashboardPage } from '../../pages/pmDashboard';
import { Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

let browser: Browser;
let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Free Permissions', () => {
  configureSpecFailFast();

  test('RP0001 : Admin can reach Settings page', async () => {
    const dash = new PmDashboardPage(page);
    await dash.openSettings();
    await dash.assertAppMounted();
  });

  test('RP0002 : Admin can reach Categories page', async () => {
    const dash = new PmDashboardPage(page);
    await dash.openCategories();
    await dash.assertAppMounted();
  });

  test('RP0003 : Free REST projects endpoint returns 200 for admin', async () => {
    // The custom PM router requires the X-WP-Nonce header (PM_Vars.permission)
    // and the is_admin param — a bare request is unauthorized by design.
    const dash = new PmDashboardPage(page);
    await dash.open();
    const status = await page.evaluate(async () => {
      const v = (window as unknown as { PM_Vars: { rest_url: string; permission: string; is_admin: unknown } }).PM_Vars;
      const base = v.rest_url.replace(/\/$/, '');
      const res = await fetch(`${base}/projects?per_page=1&is_admin=${v.is_admin}`, {
        headers: { 'X-WP-Nonce': v.permission },
      });
      return res.status;
    });
    expect(status).toBeLessThan(400);
  });
});
