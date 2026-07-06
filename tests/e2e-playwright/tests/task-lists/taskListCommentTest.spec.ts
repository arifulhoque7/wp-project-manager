import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { TaskListPage } from '../../pages/taskList';
import { ProjectData, TaskListData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Task-list level discussion — SingleTaskListPage posts a comment with
// commentable_type 'task_list'. Only task-level comments were covered before.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
const commentText = `List note ${faker.string.alphanumeric(8)}`;

let pid = '';
let listId = 0;

async function pmApi(page: Page, path: string) {
  return page.evaluate(async ({ path }) => {
    const v = window.PM_Vars;
    const base = v.rest_url.replace(/\/$/, '');
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${base}/${path}${sep}is_admin=${v.is_admin}`, {
      headers: { 'X-WP-Nonce': v.permission },
    });
    return res.json();
  }, { path });
}

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext(pmContextOptions());
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.adminUsername, Users.adminPassword);
  const pp = new ProjectPage(page);
  await pp.createProject(proj.title, proj.description);
  await pp.openProject(proj.title);
  pid = pp.currentProjectId();
  const tl = new TaskListPage(page);
  await tl.createList(list.title, list.description);
  const lists = await pmApi(page, `projects/${pid}/task-lists?per_page=50`);
  const row = ((lists?.data as { id: number; title: string }[]) || []).find((l) => l.title === list.title);
  listId = row?.id ?? 0;
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task List — comment', () => {
  configureSpecFailFast();

  test('TLC0001 : Open the single-list page', async () => {
    expect(listId, 'list id resolved').toBeGreaterThan(0);
    const login = new BasicLoginPage(page);
    await login.navigateToURL(`${login.pmHome}#/projects/${pid}/task-lists/${listId}`);
    await login.waitForPmSpa();
    await page.waitForTimeout(1000);
    await expect(page.locator('.ProseMirror').last()).toBeVisible();
  });

  test('TLC0002 : Post a comment on the list', async () => {
    const editor = page.locator('.ProseMirror').last();
    await editor.click();
    await editor.fill(commentText);
    const [res] = await Promise.all([
      page.waitForResponse(
        (r) => /\/comments(\?|$)/.test(r.url()) && r.request().method() === 'POST',
      ),
      page.locator('button:has-text("Post Comment")').first().click(),
    ]);
    expect(res.ok()).toBeTruthy();
    await page.waitForTimeout(500);
  });

  test('TLC0003 : The comment is a task_list comment server-side', async () => {
    const json = await pmApi(page, `projects/${pid}/task-lists/${listId}?with=comments`);
    const comments = (json?.data?.comments?.data as { content: string }[]) || [];
    const found = comments.some((c) => (c.content || '').includes(commentText));
    expect(found, 'posted comment present on the list').toBeTruthy();
  });
});
