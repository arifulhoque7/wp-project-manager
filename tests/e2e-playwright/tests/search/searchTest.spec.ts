import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { TaskListPage } from '../../pages/taskList';
import { TaskPage } from '../../pages/task';
import { SearchPage } from '../../pages/search';
import { ProjectData, TaskListData, TaskData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

let browser: Browser;
let context: BrowserContext;
let page: Page;

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
  const tl = new TaskListPage(page);
  await tl.createList(list.title, list.description);
  const tk = new TaskPage(page);
  await tk.quickAdd(task.title);
  await pp.openProjectsList();
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Global Search', () => {
  configureSpecFailFast();

  test('SR0001 : Open global search dialog', async () => {
    const s = new SearchPage(page);
    await s.openSearch();
  });

  test('SR0002 : Search finds seeded project', async () => {
    const s = new SearchPage(page);
    await s.search(proj.title);
    await s.assertResultVisible(proj.title);
  });

  test('SR0003 : Search finds seeded task', async () => {
    const s = new SearchPage(page);
    await s.search(task.title);
    await s.assertResultVisible(task.title);
  });

  test('SR0004 : Selecting a project result navigates', async () => {
    const s = new SearchPage(page);
    await s.search(proj.title);
    await s.selectResult(proj.title);
  });
});
