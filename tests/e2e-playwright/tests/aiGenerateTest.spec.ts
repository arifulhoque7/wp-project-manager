import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { ProjectPage } from '../pages/project';
import { ProjectData, Users, RestPaths } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';

let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  const pp = new ProjectPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('AI Task Generation', () => {
  configureSpecFailFast();

  test('AI0001 : Stub AI endpoint and trigger generate', async () => {
    // The AI generator (projects-list "AI Create" dialog) expects a task_groups
    // shape and renders the result as editable inputs in a preview step.
    await page.route(`**${RestPaths.aiGenerate}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            title: 'AI-Generated Project',
            task_groups: [
              {
                title: 'AI-Generated List',
                tasks: [
                  { title: 'AI task one' },
                  { title: 'AI task two' },
                  { title: 'AI task three' },
                ],
              },
            ],
          },
        }),
      });
    });

    const proj = new ProjectPage(page);
    await proj.openProjectsList();
    await page.locator('button:has-text("AI Create")').first().click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor();
    await dialog
      .locator('textarea')
      .first()
      .fill('Build a QA plan for weekly regression runs');

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/projects/ai/generate')),
      dialog.locator('button:has-text("Generate")').first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
  });

  test('AI0002 : Generated list appears in preview', async () => {
    // Preview renders list/task titles as editable inputs, not static text.
    await expect(page.locator('input[value="AI-Generated List"]').first()).toBeVisible();
    await expect(page.locator('input[value="AI task one"]').first()).toBeVisible();
  });
});
