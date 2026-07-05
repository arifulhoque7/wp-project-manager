import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { MilestonePage } from '../pages/milestone';
import { MilestoneData, ProjectData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';

// Milestone edit + delete — the audit found only create/complete were tested.
let browser: Browser;
let context: BrowserContext;
let page: Page;
let projectId = '';

const proj = ProjectData.randomProject();
const ms = MilestoneData.random();
const renamed = MilestoneData.random().title;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
  page = await context.newPage();
  await new BasicLoginPage(page).basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  const pp = new ProjectPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  projectId = pp.currentProjectId();
  const m = new MilestonePage(page);
  await m.open(projectId);
  await m.create(ms.title, ms.description);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Milestone edit & delete', () => {
  configureSpecFailFast();

  test('MC0001 : Edit (rename) the milestone', async () => {
    const m = new MilestonePage(page);
    await m.editTitle(ms.title, renamed);
    await m.assertVisible(renamed);
    await m.assertNotVisible(ms.title);
  });

  test('MC0002 : Delete the milestone', async () => {
    const m = new MilestonePage(page);
    await m.remove(renamed);
    await m.assertNotVisible(renamed);
  });
});
