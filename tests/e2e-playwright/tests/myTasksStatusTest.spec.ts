import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { TaskListPage } from '../pages/taskList';
import { TaskPage } from '../pages/task';
import { MyTasksPage } from '../pages/myTasks';
import { ProjectData, TaskListData, TaskData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';
import { pmContextOptions } from '../utils/auth';

// My Tasks status tabs: an incomplete assigned task shows under Current Tasks,
// a completed one under Completed — the status filter was untested.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const projA = ProjectData.randomProject();
const projB = ProjectData.randomProject();
const openTask = TaskData.random();
const doneTask = TaskData.random();

async function seedAssignedTask(
  page: Page,
  proj: { title: string; description: string },
  task: { title: string; description: string },
  complete: boolean,
) {
  const pp = new ProjectPage(page);
  const tl = new TaskListPage(page);
  const tk = new TaskPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  await tl.createList(TaskListData.random().title, '');
  await tk.quickAdd(task.title);
  await tk.openTask(task.title);
  await tk.assignUser(Users.adminUsername);
  await tk.closeSheetIfOpen();
  if (complete) await tk.toggleComplete(task.title);
}

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  await new BasicLoginPage(page).basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  await seedAssignedTask(page, projA, openTask, false);
  await seedAssignedTask(page, projB, doneTask, true);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('My Tasks — status tabs', () => {
  configureSpecFailFast();

  test('MTS0001 : Current Tasks shows the incomplete task only', async () => {
    const my = new MyTasksPage(page);
    await my.open();
    await page.locator('button:has-text("Current Tasks")').first().click();
    await page.waitForTimeout(1500);
    await expect(page.locator(`text=${openTask.title}`).first()).toBeVisible();
    await expect(page.locator(`text=${doneTask.title}`)).toHaveCount(0);
  });

  test('MTS0002 : Completed shows the completed task only', async () => {
    await page.locator('button:has-text("Completed")').first().click();
    await page.waitForTimeout(1500);
    await expect(page.locator(`text=${doneTask.title}`).first()).toBeVisible();
    await expect(page.locator(`text=${openTask.title}`)).toHaveCount(0);
  });
});
