import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, TaskListData, TaskData, MilestoneData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Milestone detach-task. ML0002 covers attach (`attach-tasks`); the reverse
// (`detach-task/{task_id}`) was never exercised. Attach a task to a milestone,
// confirm the link, then detach it and confirm it's gone server-side.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const task = TaskData.random();
const milestone = MilestoneData.random();
let projectId = '';
let listId = 0;
let taskId = 0;
let milestoneId = 0;

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

// Is the task linked to the milestone? (milestone ?with=tasks)
async function milestoneHasTask(): Promise<boolean> {
  const show = await pmApi(page, 'GET', `projects/${projectId}/milestones/${milestoneId}?with=tasks`);
  const ids = ((show?.data?.tasks?.data as { id: number }[]) || []).map((t) => Number(t.id));
  return ids.includes(taskId);
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
  taskId =
    (await pmApi(page, 'POST', `projects/${projectId}/tasks`, { title: task.title, board_id: listId, status: 0 }))?.data
      ?.id ?? 0;
  milestoneId =
    (await pmApi(page, 'POST', `projects/${projectId}/milestones`, { title: milestone.title }))?.data?.id ?? 0;
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Milestone — detach task', () => {
  configureSpecFailFast();

  test('MDT0001 : Attach the task to the milestone', async () => {
    expect(taskId).toBeGreaterThan(0);
    expect(milestoneId).toBeGreaterThan(0);
    const res = await pmApi(page, 'POST', `projects/${projectId}/milestones/${milestoneId}/attach-tasks`, {
      task_ids: [taskId],
    });
    expect(res?.error ?? res?.code, `attach error: ${JSON.stringify(res)}`).toBeUndefined();
    expect(await milestoneHasTask(), 'task should be linked after attach').toBe(true);
  });

  test('MDT0002 : Detach the task from the milestone', async () => {
    const res = await pmApi(page, 'POST', `projects/${projectId}/milestones/${milestoneId}/detach-task/${taskId}`, {});
    expect(res?.error ?? res?.code, `detach error: ${JSON.stringify(res)}`).toBeUndefined();
  });

  test('MDT0003 : The task is no longer linked to the milestone', async () => {
    expect(await milestoneHasTask(), 'task should be unlinked after detach').toBe(false);
  });
});
