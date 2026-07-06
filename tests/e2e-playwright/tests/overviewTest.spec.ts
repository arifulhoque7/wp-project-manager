import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { OverviewPage } from '../pages/overview';
import { ProjectData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';
import { pmContextOptions } from '../utils/auth';

let browser: Browser;
let context: BrowserContext;
let page: Page;
let projectId: string;

const proj = ProjectData.randomProject();

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
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Project Overview', () => {
  configureSpecFailFast();

  test('OV0001 : Open project Overview', async () => {
    const ov = new OverviewPage(page);
    await ov.open(projectId);
    await ov.assertRendered();
  });

  test('OV0002 : Overall progress panel renders', async () => {
    const ov = new OverviewPage(page);
    await ov.assertProgressVisible();
  });

  test('OV0003 : Team members panel renders', async () => {
    const ov = new OverviewPage(page);
    await ov.assertTeamMembersVisible();
  });
});
