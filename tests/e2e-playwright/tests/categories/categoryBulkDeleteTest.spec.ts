import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Category bulk-delete. CC covers single create/rename/delete; the
// `categories/bulk-delete` (bulk_destroy, `category_ids[]`) endpoint — deleting
// several at once — was uncovered. Seed two categories, bulk-delete both, assert
// both are gone server-side.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const suffix = Math.random().toString(36).slice(2, 8);
const catA = `E2E Bulk Cat A ${suffix}`;
const catB = `E2E Bulk Cat B ${suffix}`;
let idA = 0;
let idB = 0;

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

async function categoryExists(id: number): Promise<boolean> {
  const show = await pmApi(page, 'GET', `categories/${id}`);
  return Number(show?.data?.id) === id;
}

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  idA = (await pmApi(page, 'POST', 'categories', { title: catA, categorible_type: 'project' }))?.data?.id ?? 0;
  idB = (await pmApi(page, 'POST', 'categories', { title: catB, categorible_type: 'project' }))?.data?.id ?? 0;
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Category — bulk delete', () => {
  configureSpecFailFast();

  test('CBD0001 : Two categories were seeded', async () => {
    expect(idA, 'category A id').toBeGreaterThan(0);
    expect(idB, 'category B id').toBeGreaterThan(0);
    expect(await categoryExists(idA)).toBe(true);
    expect(await categoryExists(idB)).toBe(true);
  });

  test('CBD0002 : Bulk-delete both categories', async () => {
    const res = await pmApi(page, 'POST', 'categories/bulk-delete', { category_ids: [idA, idB] });
    expect(res?.error ?? res?.code, `bulk-delete error: ${JSON.stringify(res)}`).toBeUndefined();
  });

  test('CBD0003 : Both categories are gone server-side', async () => {
    expect(await categoryExists(idA), 'category A should be deleted').toBe(false);
    expect(await categoryExists(idB), 'category B should be deleted').toBe(false);
  });
});
