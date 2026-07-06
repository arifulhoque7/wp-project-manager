import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { TaskListPage } from '../pages/taskList';
import { ProjectData, TaskListData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';
import { pmContextOptions } from '../utils/auth';

// Task-list rename via the section "…" menu — the CRUD-symmetry hole (every
// other entity had an edit test; task list only had create + delete).
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const renamed = TaskListData.random();

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  const pp = new ProjectPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task List — rename', () => {
  configureSpecFailFast();

  test('TLR0001 : Create a task list', async () => {
    const tl = new TaskListPage(page);
    await tl.createList(list.title, list.description);
    await tl.assertListVisible(list.title);
  });

  test('TLR0002 : Rename the task list', async () => {
    const tl = new TaskListPage(page);
    await tl.renameList(list.title, renamed.title);
    await tl.assertListVisible(renamed.title);
    await tl.assertListNotVisible(list.title);
  });

  test('TLR0003 : The rename persists after a reload', async () => {
    await page.reload();
    await new BasicLoginPage(page).waitForPmSpa();
    const tl = new TaskListPage(page);
    await tl.assertListVisible(renamed.title);
    await tl.assertListNotVisible(list.title);
  });
});
