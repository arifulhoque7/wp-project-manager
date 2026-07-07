import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Task privacy toggle (Pro) via the detail sheet (TaskPrivacyField). Also guards
// the isPrivate() display fix — the server stores meta.privacy as the STRING '1',
// so a `=== 1` regression would silently stop the toggle from reflecting.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const taskTitle = `Priv Task ${Date.now()}`;
let projectId = '';
let taskId = '';
let isPro = false;

async function pmApi(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const v = window.PM_Vars;
      const base = v.rest_url.replace(/\/$/, '');
      const sep = path.includes('?') ? '&' : '?';
      const url = method === 'GET' ? `${base}/${path}${sep}is_admin=${v.is_admin}` : `${base}/${path}`;
      const res = await fetch(url, {
        method,
        headers: { 'X-WP-Nonce': v.permission, 'content-type': 'application/json' },
        body: method === 'GET' ? undefined : JSON.stringify({ ...((body as object) || {}), is_admin: v.is_admin }),
      });
      return res.json();
    },
    { method, path, body },
  );
}

async function taskPrivacy(): Promise<number> {
  const res = await pmApi(page, 'GET', `projects/${projectId}/tasks/${taskId}`);
  return Number((res?.data as { meta?: { privacy?: unknown } })?.meta?.privacy ?? 0);
}

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  await new BasicLoginPage(page).basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  const pp = new ProjectPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  projectId = pp.currentProjectId();
  isPro = await page.evaluate(() => !!window.PM_Pro_Vars?.is_license_active);

  // Seed a list + task via REST; the toggle (not the create) is what's under test.
  const l = await pmApi(page, 'POST', `projects/${projectId}/task-lists`, { title: `Priv List ${Date.now()}` });
  const listId = String((l?.data as { id?: number })?.id ?? '');
  const t = await pmApi(page, 'POST', `projects/${projectId}/tasks`, { title: taskTitle, task_list_id: listId });
  taskId = String((t?.data as { id?: number })?.id ?? '');
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task privacy toggle (Pro) — detail sheet', () => {
  configureSpecFailFast();

  test('TPT0001 : Open task and make it Private', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    await page.reload();
    await page.waitForSelector('#wedevs-project-manager', { timeout: 60000 });
    await page.locator(`text=${taskTitle}`).first().click();
    const makePrivate = page.locator('[role="dialog"] button[title*="make private" i]').first();
    await makePrivate.waitFor({ timeout: 20000 });
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/tasks/privacy/') && r.request().method() === 'POST'),
      makePrivate.click(),
    ]);
    await page.waitForTimeout(500);
    expect(await taskPrivacy()).toBe(1);
    // The toggle now offers "make public" (label flipped) — proves isPrivate() read the string '1'.
    await expect(page.locator('[role="dialog"] button[title*="make public" i]').first()).toBeVisible();
  });

  test('TPT0002 : Privacy persists after reopening the task', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForSelector('#wedevs-project-manager', { timeout: 60000 });
    await page.locator(`text=${taskTitle}`).first().click();
    await expect(page.locator('[role="dialog"] button[title*="make public" i]').first()).toBeVisible({ timeout: 20000 });
    expect(await taskPrivacy()).toBe(1);
  });

  test('TPT0003 : Toggle back to Public', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    const makePublic = page.locator('[role="dialog"] button[title*="make public" i]').first();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/tasks/privacy/') && r.request().method() === 'POST'),
      makePublic.click(),
    ]);
    await page.waitForTimeout(500);
    expect(await taskPrivacy()).toBe(0);
    await expect(page.locator('[role="dialog"] button[title*="make private" i]').first()).toBeVisible();
  });
});
