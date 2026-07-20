import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { TaskListPage } from '../../pages/taskList';
import { TaskPage } from '../../pages/task';
import { ActivityPage } from '../../pages/activity';
import { ProjectData, TaskListData, TaskData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Cross-functional: real UI actions (create list, create task) must produce
// activity-log rows, verified through the Free activities REST route — so the
// log is asserted by content, not just that the feed region renders.
let browser: Browser;
let context: BrowserContext;
let page: Page;
let projectId: string;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const task = TaskData.random();

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
  const tl = new TaskListPage(page);
  await tl.createList(list.title, list.description);
  const tk = new TaskPage(page);
  await tk.quickAdd(task.title);
  // Activity rows are written synchronously in the controllers; small settle.
  await page.waitForTimeout(1500);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Activity Logging', () => {
  configureSpecFailFast();

  test('AL0001 : Activities endpoint returns logged rows', async () => {
    const ac = new ActivityPage(page);
    const raw = await ac.fetchActivitiesRaw(projectId);
    const json = JSON.parse(raw);
    const rows = json.data ?? json;
    expect(Array.isArray(rows)).toBeTruthy();
    expect(rows.length).toBeGreaterThan(0);
  });

  test('AL0002 : A create-type activity row was recorded', async () => {
    const ac = new ActivityPage(page);
    const raw = await ac.fetchActivitiesRaw(projectId);
    const rows = (JSON.parse(raw).data ?? []) as Array<{ action_type?: string }>;
    expect(rows.some((r) => r.action_type === 'create')).toBeTruthy();
  });

  test('AL0003 : The task creation is the logged create row (title + action)', async () => {
    const ac = new ActivityPage(page);
    const raw = await ac.fetchActivitiesRaw(projectId);
    const rows = (JSON.parse(raw).data ?? []) as Array<{
      action_type?: string;
      message?: string;
      meta?: unknown;
    }>;
    // A create row whose serialized message/meta references THIS task title —
    // proves the create action was logged for the task, not merely that the
    // string appears somewhere in the payload.
    const match = rows.some(
      (r) => r.action_type === 'create' && JSON.stringify(r).includes(task.title),
    );
    expect(match).toBeTruthy();
  });
});
