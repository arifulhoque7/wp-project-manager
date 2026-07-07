import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { TaskListPage } from '../../pages/taskList';
import { ProjectData, TaskListData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Switching projects must reset scoped store state (global/resetProjectState):
// project A's task list must never leak into project B's view and vice-versa.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const projA = ProjectData.randomProject();
const projB = ProjectData.randomProject();
const listA = TaskListData.random();
const listB = TaskListData.random();
let idA: string;
let idB: string;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);

  const pp = new ProjectPage(page);
  const tl = new TaskListPage(page);

  await pp.createProject(projA.title, projA.description);
  await pp.openProject(projA.title);
  idA = pp.currentProjectId();
  await tl.createList(listA.title, listA.description);

  await pp.createProject(projB.title, projB.description);
  await pp.openProject(projB.title);
  idB = pp.currentProjectId();
  await tl.createList(listB.title, listB.description);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Project Switch State Reset', () => {
  configureSpecFailFast();

  test('PS0001 : Project A shows only its own list', async () => {
    const pp = new ProjectPage(page);
    const tl = new TaskListPage(page);
    await pp.switchToProjectById(idA);
    await tl.assertListVisible(listA.title);
    await tl.assertListNotVisible(listB.title);
  });

  test('PS0002 : Switching to B drops A state and shows only B list', async () => {
    const pp = new ProjectPage(page);
    const tl = new TaskListPage(page);
    await pp.switchToProjectById(idB);
    await tl.assertListVisible(listB.title);
    await tl.assertListNotVisible(listA.title);
  });
});
