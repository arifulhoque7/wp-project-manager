import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { TaskListPage } from '../pages/taskList';
import { TaskPage } from '../pages/task';
import { DiscussionPage } from '../pages/discussion';
import { ProjectData, TaskListData, TaskData, DiscussionData, Users, AdminPaths, Urls } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';
import { pmContextOptions } from '../utils/auth';

// Task privacy toggle + discussion delete — both were untested (audit gaps).
let browser: Browser;
let context: BrowserContext;
let page: Page;
let projectId = '';
let isPro = false;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const task = TaskData.random();
const disc = DiscussionData.random();

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  await new BasicLoginPage(page).basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  isPro = await new BasicLoginPage(page).isProActive();
  const pp = new ProjectPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  projectId = pp.currentProjectId();
  await new TaskListPage(page).createList(list.title, list.description);
  await new TaskPage(page).quickAdd(task.title);
  // Create a discussion (lands on its detail page).
  await page.locator('a:has-text("Discussions"), button:has-text("Discussions")').first().click();
  await page.waitForTimeout(800);
  await new DiscussionPage(page).create(disc.title, disc.body);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task privacy + Discussion delete', () => {
  configureSpecFailFast();

  test('TPD0001 : Make a task private', async () => {
    // Task privacy is Pro-gated (TaskPrivacyField renders a ProGate when !isPro).
    test.skip(!isPro, 'Task privacy is a Pro feature');
    const tk = new TaskPage(page);
    await page.goto(`${Urls.baseUrl}${AdminPaths.pm}#/projects/${projectId}/task-lists`);
    await page.waitForSelector('#wedevs-project-manager', { timeout: 60000 });
    await page.waitForTimeout(1000);
    await tk.openTask(task.title);
    await tk.makePrivate();
    await tk.assertPrivate();
  });

  test('TPD0002 : Delete a discussion', async () => {
    const d = new DiscussionPage(page);
    await page.goto(`${Urls.baseUrl}${AdminPaths.pm}#/projects/${projectId}/discussions`);
    await page.waitForSelector('#wedevs-project-manager', { timeout: 60000 });
    await page.waitForTimeout(1200);
    await d.open(disc.title);
    await d.remove();
    await page.goto(`${Urls.baseUrl}${AdminPaths.pm}#/projects/${projectId}/discussions`);
    await page.waitForTimeout(1200);
    await d.assertNotVisible(disc.title);
  });
});
