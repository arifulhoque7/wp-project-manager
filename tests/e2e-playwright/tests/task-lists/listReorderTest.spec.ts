import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, TaskListData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Task-list reorder. The drag-reorder UX (dnd-kit) is backed by
// `POST projects/{id}/lists/sorting` with `{ orders: [{id},...] }` in the desired
// top-to-bottom display order (list_sorting reverses it, assigns `order`, and the
// index sorts `order DESC`). Endpoint-driven like taskMoveTest — the dnd-kit
// pointer-sensor drag is too flaky to assert reliably; the endpoint is the same
// path the reorderLists thunk calls.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const listA = TaskListData.random();
const listB = TaskListData.random();
const listC = TaskListData.random();
let projectId = '';
let idA = 0;
let idB = 0;
let idC = 0;

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

// Relative order of my 3 lists within the (order DESC) index response.
async function myOrder(page: Page): Promise<number[]> {
  const res = await pmApi(page, 'GET', `projects/${projectId}/task-lists?status=1&per_page=100`);
  const rows = Array.isArray(res?.data) ? res.data : [];
  const mine = [idA, idB, idC];
  return rows.map((r: { id: number }) => Number(r.id)).filter((id: number) => mine.includes(id));
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
  idA = (await pmApi(page, 'POST', `projects/${projectId}/task-lists`, { title: listA.title }))?.data?.id ?? 0;
  idB = (await pmApi(page, 'POST', `projects/${projectId}/task-lists`, { title: listB.title }))?.data?.id ?? 0;
  idC = (await pmApi(page, 'POST', `projects/${projectId}/task-lists`, { title: listC.title }))?.data?.id ?? 0;
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task list — reorder (lists/sorting)', () => {
  configureSpecFailFast();

  test('LRO0001 : Three lists created', async () => {
    expect(idA, 'list A id').toBeGreaterThan(0);
    expect(idB, 'list B id').toBeGreaterThan(0);
    expect(idC, 'list C id').toBeGreaterThan(0);
    // Freshly created, order DESC shows newest first → C, B, A.
    const order = await myOrder(page);
    expect(order, `initial order: ${order}`).toEqual([idC, idB, idA]);
  });

  test('LRO0002 : Reorder to A, B, C', async () => {
    const res = await pmApi(page, 'POST', `projects/${projectId}/lists/sorting`, {
      orders: [{ id: idA }, { id: idB }, { id: idC }],
    });
    expect(res?.error ?? res?.code, `sorting error: ${JSON.stringify(res)}`).toBeUndefined();
  });

  test('LRO0003 : New order persists server-side', async () => {
    const order = await myOrder(page);
    expect(order, `after reorder: ${order}`).toEqual([idA, idB, idC]);
  });

  test('LRO0004 : Order survives a reload', async () => {
    await page.reload();
    await page.waitForTimeout(1500);
    const order = await myOrder(page);
    expect(order, `after reload: ${order}`).toEqual([idA, idB, idC]);
  });
});
