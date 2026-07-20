import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../../pages/basicLogin';
import { ProjectPage } from '../../pages/project';
import { ProjectData, DiscussionData, Users } from '../../utils/testData';
import { configureSpecFailFast } from '../../utils/specFailFast';
import { pmContextOptions } from '../../utils/auth';

// Discussion attach/detach-users. Task-lists have TLA for this; discussions did
// not. Exercise `PUT discussion-boards/{id}/attach-users` + `detach-users`:
// assign a member, verify via `?with=assignees`, then detach and verify gone.
let browser: Browser;
let context: BrowserContext;
let page: Page;

const proj = ProjectData.randomProject();
const disc = DiscussionData.random();
let projectId = '';
let boardId = 0;
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

async function boardAssigneeIds(): Promise<number[]> {
  // Discussion boards expose their assigned members under the `users` include.
  const show = await pmApi(page, 'GET', `projects/${projectId}/discussion-boards/${boardId}?with=users`);
  return ((show?.data?.users?.data as { id: number }[]) || []).map((u) => Number(u.id));
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
  boardId =
    (await pmApi(page, 'POST', `projects/${projectId}/discussion-boards`, { title: disc.title, description: disc.body }))
      ?.data?.id ?? 0;
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Discussion — attach / detach users', () => {
  configureSpecFailFast();

  test('DAU0001 : Discussion was seeded', async () => {
    expect(boardId, 'discussion board id').toBeGreaterThan(0);
  });

  test('DAU0002 : Attach a member to the discussion', async () => {
    const res = await pmApi(page, 'PUT', `projects/${projectId}/discussion-boards/${boardId}/attach-users`, {
      users: [MEMBER_ID],
    });
    expect(res?.error ?? res?.code, `attach-users error: ${JSON.stringify(res)}`).toBeUndefined();
    expect(await boardAssigneeIds(), 'assignees after attach').toContain(MEMBER_ID);
  });

  test('DAU0003 : Detach the member from the discussion', async () => {
    const res = await pmApi(page, 'PUT', `projects/${projectId}/discussion-boards/${boardId}/detach-users`, {
      users: [MEMBER_ID],
    });
    expect(res?.error ?? res?.code, `detach-users error: ${JSON.stringify(res)}`).toBeUndefined();
    expect(await boardAssigneeIds(), 'assignees after detach').not.toContain(MEMBER_ID);
  });
});
