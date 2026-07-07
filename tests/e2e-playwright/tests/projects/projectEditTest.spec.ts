import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Project in-place edit — create/star/complete/delete were tested, edit was not.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const renamed = ProjectData.randomProject().title;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  await new BasicLoginPage(page).basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  await new ProjectPage(page).createProject(proj.title, proj.description);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Project edit', () => {
  configureSpecFailFast();

  test('PE0001 : Rename a project via the edit sheet', async () => {
    const pp = new ProjectPage(page);
    await pp.openProjectsList();
    await pp.edit(proj.title, renamed);
    await pp.assertProjectVisible(renamed);
    await pp.assertProjectNotVisible(proj.title);
  });
});
