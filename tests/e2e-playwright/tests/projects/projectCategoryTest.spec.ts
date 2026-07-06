import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { Selectors } from '../../pages/selectors';
import { Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Assigning a category to a project from the create sheet — CC covers category
// CRUD and PJ covers project CRUD, but nothing asserted a project actually
// carries its assigned category. The sheet sends `categories: [id]`; we verify
// the link server-side via the project's `?with=categories` include.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const category = `Cat ${faker.string.alphanumeric(6)}`;
const project = `Proj ${faker.string.alphanumeric(6)}`;
let createdId = 0;

// pm/v2 in-page fetch (nonce + is_admin) — mirrors useApi's contract.
async function pmApi(page: Page, path: string, body?: unknown) {
  return page.evaluate(
    async ({ path, body }) => {
      const v = (window as unknown as { PM_Vars: { rest_url: string; permission: string; is_admin: unknown } }).PM_Vars;
      const base = v.rest_url.replace(/\/$/, '');
      const sep = path.includes('?') ? '&' : '?';
      const url = body ? `${base}/${path}` : `${base}/${path}${sep}is_admin=${v.is_admin}`;
      const res = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: { 'X-WP-Nonce': v.permission, 'content-type': 'application/json' },
        body: body ? JSON.stringify({ ...(body as object), is_admin: v.is_admin }) : undefined,
      });
      return res.json();
    },
    { path, body },
  );
}

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  // Seed the category via REST so it appears in the create-sheet Select. The
  // sheet lists only categorible_type='project' categories (Category_Controller
  // filters by type; CategoriesPage creates them as 'project'), so seed the same.
  await pmApi(page, 'categories', { title: category, categorible_type: 'project' });
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Project — category assignment', () => {
  configureSpecFailFast();

  test('PCG0001 : Create a project with a category selected', async () => {
    const pp = new ProjectPage(page);
    await pp.openProjectsList();
    await page.locator(Selectors.pmDashboard.newProjectButton).first().click();
    await page.locator(Selectors.project.titleInput).first().fill(project);
    // Category is a shadcn Select — open it and pick the seeded option.
    await page.locator(Selectors.project.categoryTrigger).first().click();
    await page.waitForTimeout(300);
    await page.locator(Selectors.project.categoryOption(category)).first().click();
    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => /\/pm\/v2\/projects(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      ),
      page.locator(Selectors.project.createSubmit).first().click(),
    ]);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    createdId = body?.data?.id ?? 0;
    expect(createdId, 'created project id from response').toBeGreaterThan(0);
    await page.waitForTimeout(500);
  });

  test('PCG0002 : The project carries the assigned category server-side', async () => {
    // Fetch the project directly by id — the list is paginated (hundreds of
    // projects) and a new one need not land on page 1.
    const show = await pmApi(page, `projects/${createdId}?with=categories`);
    const cats = (show?.data?.categories?.data as { title: string }[]) || [];
    expect(cats.map((c) => c.title)).toContain(category);
  });
});
