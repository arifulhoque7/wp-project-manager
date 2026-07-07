import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { BasicLoginPage } from '../../pages/basicLogin';
import { Selectors } from '../../pages/selectors';
import { Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Settings → Task Types CRUD (create/edit/delete) — was untested.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const type = `Type ${faker.string.alphanumeric(5)}`;
const renamed = `Type ${faker.string.alphanumeric(5)}`;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  await login.navigateToURL(login.pmSettings);
  await login.waitForPmSpa();
  await page.locator(Selectors.taskTypes.tab).first().click();
  await page.waitForTimeout(1000);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Settings — Task Types CRUD', () => {
  configureSpecFailFast();

  test('TT0001 : Create a task type', async () => {
    await page.locator(Selectors.taskTypes.addButton).first().click();
    const input = page.locator(Selectors.taskTypes.titleInput).first();
    await input.waitFor();
    await input.fill(type);
    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => /\/settings\/task-types(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      ),
      page.locator(Selectors.taskTypes.createButton).first().click(),
    ]);
    expect(res.ok()).toBeTruthy();
    await expect(page.locator(Selectors.taskTypes.rowByTitle(type)).first()).toBeVisible();
  });

  test('TT0002 : Edit (rename) the task type', async () => {
    await page.locator(Selectors.taskTypes.editButton(type)).first().click();
    const input = page.locator(Selectors.taskTypes.editInput).first();
    await input.waitFor();
    await input.fill(renamed);
    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => /\/settings\/task-types\/\d+(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      ),
      page.locator(Selectors.taskTypes.editSave).first().click(),
    ]);
    expect(res.ok()).toBeTruthy();
    await expect(page.locator(Selectors.taskTypes.rowByTitle(renamed)).first()).toBeVisible();
    await expect(page.locator(Selectors.taskTypes.rowByTitle(type))).toHaveCount(0);
  });

  test('TT0003 : Delete the task type', async () => {
    await page.locator(Selectors.taskTypes.deleteButton(renamed)).first().click();
    await page.waitForTimeout(300);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/task-types/') && r.url().includes('/delete')),
      page.locator(Selectors.taskTypes.confirmDelete).first().click(),
    ]);
    expect(res.ok()).toBeTruthy();
    await expect(page.locator(Selectors.taskTypes.rowByTitle(renamed))).toHaveCount(0);
  });
});
