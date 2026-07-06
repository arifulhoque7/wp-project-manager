import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { PmProjectListPage } from '../../pages/pmProjectList';
import { Users } from '../../utils/testData';
import { saveAdminAuth } from '../../utils/auth';
import { saveBaseline } from '../../utils/baseline';
import { configureSpecFailFast } from '../../utils/specFailFast';

let browser: Browser;
let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
  page = await context.newPage();
});

test.afterAll(async () => {
  // Persist the admin session so every admin spec reuses it (skips wp-login).
  // Best-effort: if login failed, the empty state just makes specs log in normally.
  await saveAdminAuth(context).catch(() => {});
  await context.close();
  await browser.close();
});

test.describe('Login and Setup (Free)', () => {
  configureSpecFailFast();

  test('LS0001 : Admin logs into WP dashboard', { tag: ['@Basic'] }, async () => {
    const login = new BasicLoginPage(page);
    await login.basicLogin(Users.adminUsername, Users.adminPassword);
  });

  test('LS0002 : Admin validates dashboard reached', { tag: ['@Basic'] }, async () => {
    const login = new BasicLoginPage(page);
    await login.validateBasicLogin();
  });

  test('LS0003 : PM menu visible in sidebar', { tag: ['@Basic'] }, async () => {
    const dash = new PmProjectListPage(page);
    await dash.assertMenuVisible();
  });

  test('LS0004 : PM SPA mounts on Projects page', { tag: ['@Basic'] }, async () => {
    const dash = new PmProjectListPage(page);
    await dash.open();
    await dash.assertAppMounted();
  });

  test('LS0005 : My Tasks page opens', { tag: ['@Basic'] }, async () => {
    const dash = new PmProjectListPage(page);
    await dash.openMyTasks();
    await dash.assertAppMounted();
  });

  test('LS0006 : Categories page opens for admin', { tag: ['@Basic'] }, async () => {
    const dash = new PmProjectListPage(page);
    await dash.openCategories();
    await dash.assertAppMounted();
  });

  test('LS0007 : Settings page opens for admin', { tag: ['@Basic'] }, async () => {
    const dash = new PmProjectListPage(page);
    await dash.openSettings();
    await dash.assertAppMounted();
  });

  // Seed the shared prerequisite project + list (via REST) that container specs
  // reuse instead of each creating their own — persisted to baseline.json.
  test('LS0008 : Seed baseline project', { tag: ['@Basic'] }, async () => {
    const dash = new PmProjectListPage(page);
    await dash.open();
    await dash.assertAppMounted();
    await saveBaseline(page);
  });
});
