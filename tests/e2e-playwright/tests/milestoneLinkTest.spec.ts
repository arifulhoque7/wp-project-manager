import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { TaskListPage } from '../pages/taskList';
import { TaskPage } from '../pages/task';
import { MilestonePage } from '../pages/milestone';
import { ProjectData, TaskListData, TaskData, MilestoneData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';

// Cross-functional: a task assigned to a milestone (POST attach-tasks) must
// persist that link across a reload — proves the task<->milestone relation,
// not just that each screen renders in isolation.
let browser: Browser;
let context: BrowserContext;
let page: Page;
let projectId: string;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const task = TaskData.random();
const milestone = MilestoneData.random();

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
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

  const ms = new MilestonePage(page);
  await ms.open(projectId);
  await ms.create(milestone.title, milestone.description);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task <-> Milestone Linkage', () => {
  configureSpecFailFast();

  test('ML0001 : Milestone was created', async () => {
    const ms = new MilestonePage(page);
    await ms.assertVisible(milestone.title);
  });

  test('ML0002 : Assign the task to the milestone', async () => {
    const pp = new ProjectPage(page);
    const tk = new TaskPage(page);
    await pp.switchToProjectById(projectId);
    await tk.openTask(task.title);
    await tk.assignMilestone(milestone.title);
    await tk.assertMilestoneAssigned(milestone.title);
  });

  test('ML0003 : Link persists after reopening the task', async () => {
    const pp = new ProjectPage(page);
    const tk = new TaskPage(page);
    await tk.closeSheetIfOpen();
    await pp.switchToProjectById(projectId);
    await tk.openTask(task.title);
    await tk.assertMilestoneAssigned(milestone.title);
  });
});
