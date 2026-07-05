import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { TaskListPage } from '../pages/taskList';
import { TaskPage } from '../pages/task';
import { TaskCommentPage } from '../pages/taskComment';
import { ProjectData, TaskListData, TaskData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';

// Task comment edit + delete — only posting was tested.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const task = TaskData.random();
const original = 'Original comment text';
const edited = 'Edited comment text';

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
  page = await context.newPage();
  await new BasicLoginPage(page).basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  const pp = new ProjectPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  await new TaskListPage(page).createList(list.title, list.description);
  const tk = new TaskPage(page);
  await tk.quickAdd(task.title);
  await tk.openTask(task.title);
  await new TaskCommentPage(page).addComment(original);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task comment — edit & delete', () => {
  configureSpecFailFast();

  test('CMT0001 : Edit a comment', async () => {
    const c = new TaskCommentPage(page);
    await c.editComment(edited);
    // The edited text appears in the comment row (the update POST already
    // succeeded inside editComment). The original lingers only in the activity
    // feed, so it is not asserted absent here.
    await c.assertEditedCommentVisible(edited);
  });

  test('CMT0002 : Delete the comment', async () => {
    const c = new TaskCommentPage(page);
    await c.deleteComment();
    await c.assertNoComments();
  });
});
