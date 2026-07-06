import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Privacy-on-create parity (a Pro feature the Vue era had and the React migration
// lost): the create-form "Private" checkbox must actually persist. Both task and
// list persist privacy through the dedicated `.../privacy/{id}` endpoint after
// create, and the Lock icon must reflect it immediately. Pro-gated.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const privateListTitle = `Private List ${Date.now()}`;
const privateTaskTitle = `Private Task ${Date.now()}`;
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

// Look up a list's privacy meta by its title (create is UI-driven; assert server-side).
async function listPrivacyByTitle(page: Page, title: string): Promise<number | null> {
  const res = await pmApi(page, 'GET', `projects/${projectId}/task-lists?per_page=100`);
  const list = ((res?.data as { title: string; meta?: { privacy?: unknown } }[]) || []).find((l) => l.title === title);
  return list ? Number(list.meta?.privacy ?? 0) : null;
}

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  const pp = new ProjectPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  projectId = pp.currentProjectId();
  isPro = await page.evaluate(() => !!window.PM_Pro_Vars?.is_license_active);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Privacy on create (Pro) — task list + task', () => {
  configureSpecFailFast();

  test('PVC0001 : Create a PRIVATE task list → privacy persists', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    // Reload the task-lists view so the create form is fresh.
    await page.reload();
    await page.waitForSelector('#wedevs-project-manager', { timeout: 60000 });
    await page.getByRole('button', { name: /New (Task )?List/i }).first().click();
    await page.getByPlaceholder(/Task list name/i).first().fill(privateListTitle);
    await page.locator('#new-list-private').first().check();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/task-lists/privacy/') && r.request().method() === 'POST'),
      page.getByRole('button', { name: /^Add List$/i }).first().click(),
    ]);
    await page.waitForTimeout(600);
    expect(await listPrivacyByTitle(page, privateListTitle), 'new list meta.privacy').toBe(1);
  });

  test('PVC0002 : The private list shows the Lock icon (no reload)', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    const row = page.locator('div').filter({ hasText: privateListTitle }).first();
    await expect(row.locator('svg.lucide-lock, [title="Private"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('PVC0003 : Add a PRIVATE task → privacy persists', async () => {
    test.skip(!isPro, 'Privacy is a Pro feature');
    // Inbox is the default list, always rendered first; drive its add-task form and
    // tick its Private checkbox by id (id+check is proven by PVC0001).
    const listsBefore = await pmApi(page, 'GET', `projects/${projectId}/task-lists?per_page=100`);
    const inbox = ((listsBefore?.data as { id: number; title: string }[]) || []).find((l) => l.title === 'Inbox');
    const firstId = inbox?.id ?? 0;
    expect(firstId, 'inbox list id').toBeGreaterThan(0);

    await page.reload();
    await page.waitForSelector('#wedevs-project-manager', { timeout: 60000 });
    const addBtn = page.getByRole('button', { name: /Add a task/i }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 30000 });
    await addBtn.click();
    // Scope every action to the one open form (that holds the title input) so a
    // second list's form/button can't be targeted by mistake.
    const form = page.locator('form').filter({ has: page.getByPlaceholder(/Task name/i) }).first();
    await form.waitFor({ state: 'visible' });
    await form.getByPlaceholder(/Task name/i).fill(privateTaskTitle);
    await form.getByRole('button', { name: /^More$/i }).click();
    const cb = form.locator('[id^="new-task-private-"]');
    await cb.waitFor({ state: 'visible' });
    await cb.check();
    const [createResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/tasks') && !r.url().includes('/privacy/') && r.request().method() === 'POST',
      ),
      form.getByRole('button', { name: /^Add Task$/i }).click(),
    ]);
    const taskId = (await createResp.json())?.data?.id;
    expect(taskId, 'created task id').toBeTruthy();
    await page.waitForTimeout(1500); // async privacy POST fires after create resolves
    const show = await pmApi(page, 'GET', `projects/${projectId}/tasks/${taskId}`);
    expect(Number(show?.data?.meta?.privacy ?? 0), 'new task meta.privacy').toBe(1);
  });
});
