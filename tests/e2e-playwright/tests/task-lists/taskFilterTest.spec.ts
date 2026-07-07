import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, TaskListData, TaskData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Task filter bar. `TaskFilterBar` (status/due/list/assignee/title) posts to
// `tasks/filter`, unexercised by any spec. Seed two tasks with distinct titles,
// filter by one title, assert the filtered set contains it and excludes the other.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const taskA = TaskData.random();
const taskB = TaskData.random();
let projectId = '';
let listId = 0;

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

// Collect every task title nested anywhere in the filter response.
function collectTitles(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((n) => collectTitles(n, out));
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o.title === 'string' && 'task_list_id' in o) out.push(o.title);
    Object.values(o).forEach((v) => collectTitles(v, out));
  }
  return out;
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
  listId = (await pmApi(page, 'POST', `projects/${projectId}/task-lists`, { title: list.title }))?.data?.id ?? 0;
  await pmApi(page, 'POST', `projects/${projectId}/tasks`, { title: taskA.title, board_id: listId, status: 0 });
  await pmApi(page, 'POST', `projects/${projectId}/tasks`, { title: taskB.title, board_id: listId, status: 0 });
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task list — filter bar (tasks/filter)', () => {
  configureSpecFailFast();

  test('TFB0001 : Two distinct tasks were seeded', async () => {
    expect(listId, 'list id').toBeGreaterThan(0);
    expect(taskA.title).not.toBe(taskB.title);
  });

  test('TFB0002 : Filtering by title returns the matching task, not the other', async () => {
    const res = await pmApi(page, 'POST', `projects/${projectId}/tasks/filter`, { title: taskA.title });
    expect(res?.error ?? res?.code, `filter error: ${JSON.stringify(res)}`).toBeUndefined();
    const titles = collectTitles(res?.data ?? res);
    expect(titles, `filtered titles: ${JSON.stringify(titles)}`).toContain(taskA.title);
    expect(titles, `filtered titles should exclude the other: ${JSON.stringify(titles)}`).not.toContain(taskB.title);
  });
});
