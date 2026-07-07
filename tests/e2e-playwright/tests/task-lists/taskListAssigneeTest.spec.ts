import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, TaskListData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Task-list assignees. TL/TLR/TLC cover create/rename/delete/comment, but nothing
// exercised `PUT task-lists/{id}/attach-users` (assigning members to a list) — a
// Free feature backed by the list create-form assignee picker. Attach a member,
// then verify server-side via the list's `?with=assignees` include.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const list = TaskListData.random();
let projectId = '';
let listId = 0;
const MEMBER_ID = 3; // pm_manager_user (seeded)

// pm/v2 in-page fetch (nonce + is_admin), method-aware — attach-users is a PUT.
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
  const created = await pmApi(page, 'POST', `projects/${projectId}/task-lists`, { title: list.title });
  listId = created?.data?.id ?? 0;
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Task List — assignees (attach-users)', () => {
  configureSpecFailFast();

  test('TLA0001 : List was seeded for the assignee test', async () => {
    expect(listId, 'created task list id').toBeGreaterThan(0);
  });

  test('TLA0002 : Attach a member to the task list', async () => {
    const res = await pmApi(page, 'PUT', `projects/${projectId}/task-lists/${listId}/attach-users`, {
      users: String(MEMBER_ID),
    });
    // attach_users returns the list resource (or a success payload) — just assert no error.
    expect(res?.error ?? res?.code, `attach-users error: ${JSON.stringify(res)}`).toBeUndefined();
  });

  test('TLA0003 : The member is an assignee of the list server-side', async () => {
    const show = await pmApi(page, 'GET', `projects/${projectId}/task-lists/${listId}?with=assignees`);
    const ids = ((show?.data?.assignees?.data as { id: number }[]) || []).map((u) => Number(u.id));
    expect(ids, `list assignees: ${JSON.stringify(ids)}`).toContain(MEMBER_ID);
  });
});
