import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { TaskListPage } from '../pages/taskList';
import { TaskPage } from '../pages/task';
import { ActivityPage } from '../pages/activity';
import { ProjectData, TaskListData, TaskData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';
import { pmContextOptions } from '../utils/auth';

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
  projectId = (page.url().match(/projects\/(\d+)/) || [])[1];
  const tl = new TaskListPage(page);
  await tl.createList(list.title, list.description);
  const tk = new TaskPage(page);
  await tk.quickAdd(task.title);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Activity Feed', () => {
  configureSpecFailFast();

  test('AC0001 : Open project Activities', async () => {
    const ac = new ActivityPage(page);
    await ac.open(projectId);
    await ac.assertRendered();
  });

  test('AC0002 : Activity content region renders', async () => {
    const ac = new ActivityPage(page);
    await ac.assertContentRegion();
  });
});
