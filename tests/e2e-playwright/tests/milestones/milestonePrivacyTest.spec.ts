import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { MilestonePage } from '../../pages/milestone';
import { ProjectData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Milestone privacy toggle (Pro, gated by `view_private_milestone`) via the card
// menu. Guards the isPrivate() display fix (server stores string '1').
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const msTitle = `Priv Milestone ${Date.now()}`;
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

async function milestonePrivacy(title: string): Promise<number | null> {
  const res = await pmApi(page, 'GET', `projects/${projectId}/milestones?per_page=100`);
  const m = ((res?.data as { title: string; meta?: { privacy?: unknown } }[]) || []).find((x) => x.title === title);
  return m ? Number(m.meta?.privacy ?? 0) : null;
}

async function toggleMenu(label: string) {
  await page.locator(`div:has(h4:has-text("${msTitle}")) button[aria-label="More actions"]`).first().click();
  const item = page.locator(`[data-radix-menu-content] [role="menuitem"]:has-text("${label}")`);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/milestones/') && r.request().method() === 'POST'),
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
  const m = new MilestonePage(page);
  await m.open(projectId);
  await m.create(msTitle, 'privacy milestone');
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Milestone privacy toggle (Pro)', () => {
  configureSpecFailFast();

  test('MPT0001 : Make the milestone Private', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    await toggleMenu("Make Private");
    expect(await milestonePrivacy(msTitle)).toBe(1);
  });

  test('MPT0002 : Private state persists after reload', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    await page.reload();
    await page.waitForSelector('#wedevs-project-manager', { timeout: 60000 });
    await page.locator(`h4:has-text("${msTitle}")`).first().waitFor({ timeout: 20000 });
    expect(await milestonePrivacy(msTitle)).toBe(1);
  });

  test('MPT0003 : Toggle back to Public', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    await toggleMenu("Make Public");
    expect(await milestonePrivacy(msTitle)).toBe(0);
  });
});
