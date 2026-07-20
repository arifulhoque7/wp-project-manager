import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, TaskData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Task assignees are a FULL REPLACEMENT on update — a partial array WIPES the
// rest (Task_Controller::update: whereNotIn(...) → Assignee::destroy, then
// re-attach). TK0004 only assigns one user; nothing locked in the wipe contract.
// Assign two, then update with one and assert the other is removed server-side.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const task = TaskData.random();
let projectId = '';
let taskId = 0;
const ADMIN_ID = 1;
const MEMBER_ID = 3; // pm_manager_user (seeded)

async function pmApi(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const v = window.PM_Vars;
      const base = v.rest_url.replace(/\/$/, '');
      const sep = path.includes('?') ? '&' : '?';
      const url = method === 'GET' ? `${base}/${path}${sep}is_admin=${v.is_admin}` : `${base}/${path}`;
      const res = await fetch(url, {
        method,
        headers: { 'X-WP-Nonce': v.permission, 'content-type': 'application/json' },
        body: method === 'GET' ? undefined : JSON.stringify({ ...((body as object) || {}), is_admin: v.is_admin }),
      });
      return res.json();
    },
    { method, path, body },
  );
}

async function assigneeIds(page: Page): Promise<number[]> {
  const show = await pmApi(page, 'GET', `projects/${projectId}/tasks/${taskId}?with=assignees`);
  return ((show?.data?.assignees?.data as { id: number }[]) || []).map((u) => Number(u.id));
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
  projectId = pp.currentProjectId();
  const created = await pmApi(page, 'POST', `projects/${projectId}/tasks`, {
    title: task.title,
    assignees: [ADMIN_ID, MEMBER_ID],
  });
  taskId = created?.data?.id ?? 0;
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task — assignees full replacement', () => {
  configureSpecFailFast();

  test('TKA0001 : Task created with two assignees', async () => {
    expect(taskId, 'created task id').toBeGreaterThan(0);
    const ids = await assigneeIds(page);
    expect(ids).toContain(ADMIN_ID);
    expect(ids).toContain(MEMBER_ID);
  });

  test('TKA0002 : Updating with one assignee wipes the other', async () => {
    const res = await pmApi(page, 'POST', `projects/${projectId}/tasks/${taskId}/update`, {
      title: task.title,
      assignees: [ADMIN_ID],
    });
    expect(res?.error ?? res?.code, `update error: ${JSON.stringify(res)}`).toBeUndefined();
    const ids = await assigneeIds(page);
    expect(ids, `assignees after partial update: ${JSON.stringify(ids)}`).toContain(ADMIN_ID);
    expect(ids, 'the dropped assignee must be wiped (full-replacement contract)').not.toContain(MEMBER_ID);
  });
});
