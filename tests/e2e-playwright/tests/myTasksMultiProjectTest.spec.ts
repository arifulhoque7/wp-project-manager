import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { TaskListPage } from '../pages/taskList';
import { TaskPage } from '../pages/task';
import { MyTasksPage } from '../pages/myTasks';
import { ProjectData, TaskListData, TaskData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';
import { pmContextOptions } from '../utils/auth';

// My Tasks must aggregate the current user's assigned tasks across DIFFERENT
// projects — the whole point of the dashboard. Assign admin one task in each
// of two projects and expect both to surface in the single My Tasks view.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const projA = ProjectData.randomProject();
const projB = ProjectData.randomProject();
const listA = TaskListData.random();
const listB = TaskListData.random();
const taskA = TaskData.random();
const taskB = TaskData.random();
// Negative control: created in project A but never assigned to admin.
const unassigned = TaskData.random();

async function seedAssignedTask(
  page: Page,
  proj: { title: string; description: string },
  list: { title: string; description: string },
  task: { title: string; description: string },
) {
  const pp = new ProjectPage(page);
  const tl = new TaskListPage(page);
  const tk = new TaskPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  await tl.createList(list.title, list.description);
  await tk.quickAdd(task.title);
  await tk.openTask(task.title);
  await tk.assignUser(Users.adminUsername);
  await tk.closeSheetIfOpen();
}

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  await seedAssignedTask(page, projA, listA, taskA);
  // Add an UNASSIGNED task to project A (admin is creator but not an assignee).
  // My Tasks filters by assignee (whereHas assignees assigned_to = me), so this
  // must never surface — the negative control for the aggregation claim.
  const tk = new TaskPage(page);
  await tk.quickAdd(unassigned.title);
  await tk.closeSheetIfOpen();
  await seedAssignedTask(page, projB, listB, taskB);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('My Tasks Cross-Project Aggregation', () => {
  configureSpecFailFast();

  test('MTX0001 : Open My Tasks view', async () => {
    const my = new MyTasksPage(page);
    await my.open();
  });

  test('MTX0002 : Task from project A appears', async () => {
    const my = new MyTasksPage(page);
    await my.assertTaskRowVisible(taskA.title);
  });

  test('MTX0003 : Task from project B appears in the same view', async () => {
    const my = new MyTasksPage(page);
    await my.assertTaskRowVisible(taskB.title);
  });

  test('MTX0004 : Unassigned task does NOT appear (assignment drives the view)', async () => {
    const my = new MyTasksPage(page);
    await my.assertTaskRowNotVisible(unassigned.title);
  });
});
