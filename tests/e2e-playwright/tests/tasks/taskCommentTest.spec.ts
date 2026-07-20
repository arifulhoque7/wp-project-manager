import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { TaskListPage } from '../../pages/taskList';
import { TaskPage } from '../../pages/task';
import { TaskCommentPage } from '../../pages/taskComment';
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
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task Comments', () => {
  configureSpecFailFast();

  const first = 'First comment from admin';
  const second = 'Second comment for the thread';

  test('TC0001 : Open task detail sheet', async () => {
    const tc = new TaskCommentPage(page);
    await tc.openTask(task.title);
  });

  test('TC0002 : Post a comment on the task', async () => {
    const tc = new TaskCommentPage(page);
    await tc.addComment(first);
    await tc.assertCommentVisible(first);
  });

  test('TC0003 : Post a second comment', async () => {
    const tc = new TaskCommentPage(page);
    await tc.addComment(second);
    await tc.assertCommentVisible(second);
  });
});
