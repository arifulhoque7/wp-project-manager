import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, TaskListData, TaskData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Task move between lists. The drag-a-task UX is backed by `POST tasks/sorting`
// (task_sorting), which re-parents the task's boardable to the target list. No
// spec exercised it — this seeds a task in list A, moves it to list B via the
// same endpoint, and asserts the task's task_list_id changed server-side.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const listA = TaskListData.random();
const listB = TaskListData.random();
const task = TaskData.random();
let projectId = '';
let listAId = 0;
let listBId = 0;
let taskId = 0;

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
  listAId = (await pmApi(page, 'POST', `projects/${projectId}/task-lists`, { title: listA.title }))?.data?.id ?? 0;
  listBId = (await pmApi(page, 'POST', `projects/${projectId}/task-lists`, { title: listB.title }))?.data?.id ?? 0;
  taskId =
    (await pmApi(page, 'POST', `projects/${projectId}/tasks`, { title: task.title, board_id: listAId, status: 0 }))
      ?.data?.id ?? 0;
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task — move between lists (task_sorting)', () => {
  configureSpecFailFast();

  test('TMV0001 : Task starts in list A', async () => {
    expect(listAId, 'list A id').toBeGreaterThan(0);
    expect(listBId, 'list B id').toBeGreaterThan(0);
    expect(taskId, 'task id').toBeGreaterThan(0);
    const show = await pmApi(page, 'GET', `projects/${projectId}/tasks/${taskId}?with=task_list`);
    expect(Number(show?.data?.task_list?.data?.id), 'initial list').toBe(listAId);
  });

  test('TMV0002 : Move the task to list B', async () => {
    const res = await pmApi(page, 'POST', `projects/${projectId}/tasks/sorting`, {
      list_id: listBId,
      task_id: taskId,
      receive: true,
      orders: [{ id: taskId, index: 0 }],
    });
    expect(res?.error ?? res?.code, `sorting error: ${JSON.stringify(res)}`).toBeUndefined();
  });

  test('TMV0003 : Task now belongs to list B server-side', async () => {
    const show = await pmApi(page, 'GET', `projects/${projectId}/tasks/${taskId}?with=task_list`);
    expect(Number(show?.data?.task_list?.data?.id), `task_list after move: ${JSON.stringify(show?.data?.task_list)}`).toBe(
      listBId,
    );
  });
});
