import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { TaskListPage } from '../../pages/taskList';
import { TaskPage } from '../../pages/task';
import { RolesPage } from '../../pages/roles';
import { Selectors } from '../../pages/selectors';
import { ProjectData, TaskListData, TaskData, Users, AdminPaths, Urls } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';

// Positive + negative authorization matrix across every PM role. Members and
// their roles are provisioned through the real update-assignees endpoint; each
// role then drives the UI in its own logged-in browser context and we assert
// what it may and may not reach. Gates verified: project access (member vs
// non-member), managerOnly routes (/settings), manager-only UI (task-list menu
// = isManager), and site-admin routes (a project manager is NOT a site admin).
let adminBrowser: Browser;
let adminCtx: BrowserContext;
let adminPage: Page;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const task = TaskData.random();
let pid = '';
let clientAssigned = false;

const base = Urls.baseUrl + AdminPaths.pm;
const pmProjectListsUrl = () => `${base}#/projects/${pid}/task-lists`;
const projectSettingsUrl = () => `${base}#/projects/${pid}/settings`;
const globalSettingsUrl = Urls.baseUrl + AdminPaths.pmSettings;

async function runAsRole(fn: (page: Page, roles: RolesPage) => Promise<void>, username: string, password: string) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await new BasicLoginPage(page).basicLoginAndPmVisit(username, password);
    await fn(page, new RolesPage(page));
  } finally {
    await ctx.close();
    await browser.close();
  }
}

test.beforeAll(async () => {
  adminBrowser = await chromium.launch();
  adminCtx = await adminBrowser.newContext();
  adminPage = await adminCtx.newPage();
  await new BasicLoginPage(adminPage).basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  const proActive = await new BasicLoginPage(adminPage).isProActive();

  const pp = new ProjectPage(adminPage);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  pid = pp.currentProjectId();
  await new TaskListPage(adminPage).createList(list.title, list.description);
  // Task created by admin (a manager) — used for the ownership axis.
  await new TaskPage(adminPage).quickAdd(task.title);
  await new TaskPage(adminPage).closeSheetIfOpen();

  const roles = new RolesPage(adminPage);
  const mgr = await roles.resolveUserId(Users.managerEmail);
  const cow = await roles.resolveUserId(Users.coworkerEmail);
  const cli = await roles.resolveUserId(Users.clientEmail);
  const assignees = [
    { userId: mgr, roleId: 1 },
    { userId: cow, roleId: 2 },
  ];
  // The client project role is Pro-only. Assign it (and let RMX0003 run) only
  // when Pro is active AND the client user exists — otherwise it stays skipped.
  if (cli && proActive) {
    assignees.push({ userId: cli, roleId: 3 });
    clientAssigned = true;
  }
  const status = await roles.assignRoles(pid, proj.title, assignees);
  expect(status).toBeLessThan(400);
});

test.afterAll(async () => {
  await adminCtx.close();
  await adminBrowser.close();
});

test.describe('Role Authorization Matrix', () => {
  configureSpecFailFast();

  test('RMX0001 : Non-member cannot see the project content', async () => {
    await runAsRole(async (page) => {
      await page.goto(pmProjectListsUrl());
      await page.waitForSelector(Selectors.pmRoot, { timeout: 60000 });
      await page.waitForTimeout(2500);
      // Blocked members never receive the project payload, so its list never renders.
      await expect(page.locator(Selectors.taskList.byTitle(list.title))).toHaveCount(0);
    }, Users.memberUsername, Users.memberPassword);
  });

  test('RMX0002 : Co-worker can access the project but not manager-only surfaces', async () => {
    await runAsRole(async (page, roles) => {
      await roles.gotoAndExpectAllowed(pmProjectListsUrl());
      await expect(page.locator(Selectors.taskList.byTitle(list.title)).first()).toBeVisible();
      await roles.assertCannotDeleteList(list.title); // canDeleteTaskList = isManager
      await roles.gotoAndExpectForbidden(projectSettingsUrl()); // ProjectRoute managerOnly
      await roles.gotoAndExpectForbidden(globalSettingsUrl); // not a site admin
    }, Users.coworkerUsername, Users.coworkerPassword);
  });

  test('RMX0003 : Client can access the project but not manager-only surfaces', async () => {
    test.skip(!clientAssigned, 'Client role not present (Free-only install)');
    await runAsRole(async (page, roles) => {
      await roles.gotoAndExpectAllowed(pmProjectListsUrl());
      await expect(page.locator(Selectors.taskList.byTitle(list.title)).first()).toBeVisible();
      await roles.assertCannotDeleteList(list.title);
      await roles.gotoAndExpectForbidden(projectSettingsUrl());
      await roles.gotoAndExpectForbidden(globalSettingsUrl);
    }, Users.clientUsername, Users.clientPassword);
  });

  test('RMX0004 : Project manager gets project management but NOT site-admin pages', async () => {
    await runAsRole(async (page, roles) => {
      await roles.gotoAndExpectAllowed(pmProjectListsUrl());
      await roles.assertCanDeleteList(list.title); // isManager → Delete item shown
      await roles.gotoAndExpectAllowed(projectSettingsUrl()); // managerOnly → manager passes
      // A project manager is a Subscriber site-wide → blocked from global admin pages.
      await roles.gotoAndExpectForbidden(globalSettingsUrl);
    }, Users.managerUsername, Users.managerPassword);
  });

  test('RMX0005 : Site admin reaches the global settings page', async () => {
    await runAsRole(async (page, roles) => {
      await roles.gotoAndExpectAllowed(globalSettingsUrl);
    }, Users.adminUsername, Users.adminPassword);
  });

  // Ownership axis (Edit_Task = manager OR task creator). The task was created
  // by admin; a co-worker is neither → the update must NOT take effect.
  test('RMX0006 : Co-worker cannot edit a task they did not create', async () => {
    await runAsRole(async (page, roles) => {
      const taskId = await roles.resolveTaskId(pid, task.title);
      expect(taskId).toBeGreaterThan(0);
      await roles.attemptTaskRename(pid, taskId, 'HACKED BY CO-WORKER');
      // Bulletproof: re-read the task — the title must be unchanged (denied).
      expect(await roles.getTaskTitle(pid, taskId)).toBe(task.title);
    }, Users.coworkerUsername, Users.coworkerPassword);
  });

  test('RMX0007 : Project manager CAN edit any task in the project', async () => {
    await runAsRole(async (page, roles) => {
      const taskId = await roles.resolveTaskId(pid, task.title);
      expect(taskId).toBeGreaterThan(0);
      const renamed = `${task.title} (mgr-edited)`;
      await roles.attemptTaskRename(pid, taskId, renamed);
      expect(await roles.getTaskTitle(pid, taskId)).toBe(renamed);
    }, Users.managerUsername, Users.managerPassword);
  });
});
