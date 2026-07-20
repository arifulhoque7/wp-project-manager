import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { DiscussionPage } from '../../pages/discussion';
import { Selectors } from '../../pages/selectors';
import { ProjectData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Discussion privacy toggle (Pro, gated by `view_private_message`) via the detail
// page actions menu. Guards the isPrivate() display fix (server stores string '1').
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const dTitle = `Priv Discussion ${Date.now()}`;
let projectId = '';
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

async function discussionPrivacy(title: string): Promise<number | null> {
  const res = await pmApi(page, 'GET', `projects/${projectId}/discussion-boards?per_page=100`);
  const d = ((res?.data as { title: string; meta?: { privacy?: unknown } }[]) || []).find((x) => x.title === title);
  return d ? Number(d.meta?.privacy ?? 0) : null;
}

async function toggleDetailMenu(label: string) {
  await page.locator(Selectors.discussionCrud.menuTrigger).first().click();
  const item = page.locator(`[data-radix-menu-content] [role="menuitem"]:has-text("${label}")`);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/discussion-boards') && r.request().method() === 'POST'),
    item.first().click(),
  ]);
  await page.waitForTimeout(500);
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

  const d = new DiscussionPage(page);
  await page.locator('a:has-text("Discussions"), button:has-text("Discussions")').first().click();
  await page.waitForTimeout(600);
  await d.create(dTitle, 'privacy discussion body');
  await d.open(dTitle);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Discussion privacy toggle (Pro)', () => {
  configureSpecFailFast();

  test('DPT0001 : Make the discussion Private', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    await toggleDetailMenu('Make Private');
    expect(await discussionPrivacy(dTitle)).toBe(1);
  });

  test('DPT0002 : Private state persists after reload', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    await page.reload();
    await page.waitForSelector('#wedevs-project-manager', { timeout: 60000 });
    await page.waitForTimeout(800);
    expect(await discussionPrivacy(dTitle)).toBe(1);
  });

  test('DPT0003 : Toggle back to Public', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    await toggleDetailMenu('Make Public');
    expect(await discussionPrivacy(dTitle)).toBe(0);
  });
});
