import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { TaskListPage } from '../pages/taskList';
import { CategoryPage } from '../pages/category';
import { ProjectData, TaskListData, CategoryData, Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';

// Edit/delete CRUD on core objects — the audit found these were never tested
// (only create/complete/delete existed for some). Real UI, real update/delete
// endpoints, verified by the renamed value appearing and the old one gone.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const cat = CategoryData.random();
// Renamed value must NOT contain the original — byName uses substring (text=)
// matching, so an "-edited" suffix would still match the old name.
const renamedCat = CategoryData.random().name;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
  page = await context.newPage();
  await new BasicLoginPage(page).basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  const pp = new ProjectPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  await new TaskListPage(page).createList(list.title, list.description);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Core CRUD — edit & delete', () => {
  configureSpecFailFast();

  test('CC0001 : Create then rename a category', async () => {
    const c = new CategoryPage(page);
    await c.create(cat.name);
    await c.assertVisible(cat.name);
    await c.rename(cat.name, renamedCat);
    await c.assertVisible(renamedCat);
    await c.assertNotVisible(cat.name);
  });

  test('CC0002 : Delete the category', async () => {
    const c = new CategoryPage(page);
    await c.remove(renamedCat);
    await c.assertNotVisible(renamedCat);
  });
});
