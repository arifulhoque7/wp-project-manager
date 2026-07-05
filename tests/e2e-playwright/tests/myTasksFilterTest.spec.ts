import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { TaskListPage } from '../pages/taskList';
import { TaskPage } from '../pages/task';
import { MyTasksPage } from '../pages/myTasks';
import { Selectors } from '../pages/selectors';
import { ProjectData, TaskListData, TaskData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';

// My Tasks title filter — aggregation was tested, filtering was not. Two assigned
// tasks; searching one title must hide the other.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const projA = ProjectData.randomProject();
const projB = ProjectData.randomProject();
const taskA = TaskData.random();
const taskB = TaskData.random();

async function seedAssignedTask(
  page: Page,
  proj: { title: string; description: string },
  task: { title: string; description: string },
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
}

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
  page = await context.newPage();
  await new BasicLoginPage(page).basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  await seedAssignedTask(page, projA, taskA);
  await seedAssignedTask(page, projB, taskB);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('My Tasks — title filter', () => {
  configureSpecFailFast();

  test('MTF0001 : Both assigned tasks show', async () => {
    const my = new MyTasksPage(page);
    await my.open();
    await my.assertTaskRowVisible(taskA.title);
    await my.assertTaskRowVisible(taskB.title);
  });

  test('MTF0002 : Searching one title hides the other', async () => {
    const search = page.locator(Selectors.myTasks.searchInput).first();
    await search.waitFor();
    await search.fill(taskA.title);
    await page.waitForTimeout(2000); // debounced re-fetch
    await expect(page.locator(`text=${taskA.title}`).first()).toBeVisible();
    await expect(page.locator(`text=${taskB.title}`)).toHaveCount(0);
  });

  test('MTF0003 : Clearing the search restores both', async () => {
    const search = page.locator(Selectors.myTasks.searchInput).first();
    await search.fill('');
    await page.waitForTimeout(2000);
    const my = new MyTasksPage(page);
    await my.assertTaskRowVisible(taskA.title);
    await my.assertTaskRowVisible(taskB.title);
  });
});
