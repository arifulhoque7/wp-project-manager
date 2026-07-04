import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { KanbanPage } from '../pages/kanban';
import { ProjectData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';

let browser: Browser;
let context: BrowserContext;
let page: Page;
let projectId: string;

const proj = ProjectData.randomProject();
const sectionTitle = `Section ${Math.random().toString(36).slice(2, 7)}`;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
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

test.describe('Kanban Board', () => {
  configureSpecFailFast();

  test('KB0001 : Open project Kanban board', async () => {
    const kb = new KanbanPage(page);
    await kb.open(projectId);
    await kb.assertBoardRendered();
  });

  test('KB0002 : Create a Kanban section', async () => {
    const kb = new KanbanPage(page);
    await kb.createSection(sectionTitle);
    await kb.assertColumnVisible(sectionTitle);
  });
});
