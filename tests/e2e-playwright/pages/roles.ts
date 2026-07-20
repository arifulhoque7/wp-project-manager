import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export interface RoleAssignee {
  userId: number;
  roleId: number; // 1 = manager, 2 = co_worker, 3 = client
}

// Drives PM role provisioning + per-role UI/route gate assertions.
export class RolesPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  // Resolve a WP user id from a PM users/search hit matching the given email.
  async resolveUserId(email: string): Promise<number> {
    return this.page.evaluate(async (email) => {
      const v = window.PM_Vars;
      const base = v.rest_url.replace(/\/$/, '');
      const res = await fetch(`${base}/users/search?query=${encodeURIComponent(email)}&is_admin=${v.is_admin}`, {
        headers: { 'X-WP-Nonce': v.permission },
      });
      const json = await res.json();
      const rows = (json.data ?? []) as Array<{ id?: number; email?: string }>;
      const hit = rows.find((r) => r.email === email);
      return hit?.id ?? 0;
    }, email);
  }

  // Assign members+roles to a project through the real update endpoint
  // (assignees:[{user_id,role_id}]). The creator (admin) is re-added as manager
  // by the controller, so callers only pass the additional members.
  async assignRoles(projectId: string, title: string, assignees: RoleAssignee[]): Promise<number> {
    return this.page.evaluate(
      async ({ projectId, title, assignees }) => {
        const v = window.PM_Vars;
        const base = v.rest_url.replace(/\/$/, '');
        const res = await fetch(`${base}/projects/${projectId}/update`, {
          method: 'POST',
          headers: { 'X-WP-Nonce': v.permission, 'content-type': 'application/json' },
          body: JSON.stringify({
            title,
            is_admin: v.is_admin,
            assignees: assignees.map((a) => ({ user_id: a.userId, role_id: a.roleId })),
          }),
        });
        return res.status;
      },
      { projectId, title, assignees },
    );
  }

  // Resolve a task id by title from the project's task-list payload.
  async resolveTaskId(projectId: string, taskTitle: string): Promise<number> {
    return this.page.evaluate(
      async ({ projectId, taskTitle }) => {
        const v = window.PM_Vars;
        const base = v.rest_url.replace(/\/$/, '');
        const res = await fetch(
          `${base}/projects/${projectId}/task-lists?with=incomplete_tasks,complete_tasks&is_admin=${v.is_admin}`,
          { headers: { 'X-WP-Nonce': v.permission } },
        );
        const json = await res.json();
        const lists = (json.data ?? []) as Array<{
          incomplete_tasks?: { data?: Array<{ id: number; title: string }> };
          complete_tasks?: { data?: Array<{ id: number; title: string }> };
        }>;
        for (const l of lists) {
          const all = [...(l.incomplete_tasks?.data ?? []), ...(l.complete_tasks?.data ?? [])];
          const hit = all.find((t) => t.title === taskTitle);
          if (hit) return hit.id;
        }
        return 0;
      },
      { projectId, taskTitle },
    );
  }

  // Attempt to rename a task via the Edit_Task-gated update route; returns the
  // HTTP status so callers can assert allow (manager/creator) vs deny (member).
  async attemptTaskRename(projectId: string, taskId: number, newTitle: string): Promise<number> {
    return this.page.evaluate(
      async ({ projectId, taskId, newTitle }) => {
        const v = window.PM_Vars;
        const base = v.rest_url.replace(/\/$/, '');
        const res = await fetch(`${base}/projects/${projectId}/tasks/${taskId}/update`, {
          method: 'POST',
          headers: { 'X-WP-Nonce': v.permission, 'content-type': 'application/json' },
          body: JSON.stringify({ title: newTitle, is_admin: v.is_admin }),
        });
        return res.status;
      },
      { projectId, taskId, newTitle },
    );
  }

  async getTaskTitle(projectId: string, taskId: number): Promise<string> {
    return this.page.evaluate(
      async ({ projectId, taskId }) => {
        const v = window.PM_Vars;
        const base = v.rest_url.replace(/\/$/, '');
        const res = await fetch(`${base}/projects/${projectId}/tasks/${taskId}?is_admin=${v.is_admin}`, {
          headers: { 'X-WP-Nonce': v.permission },
        });
        const json = await res.json();
        return json?.data?.title ?? '';
      },
      { projectId, taskId },
    );
  }

  async gotoAndExpectForbidden(url: string) {
    await this.navigateToURL(url);
    await this.page.waitForSelector(Selectors.pmRoot, { timeout: 60000 });
    await expect(this.page.locator(Selectors.permissions.forbiddenHeading).first()).toBeVisible({
      timeout: 30000,
    });
  }

  async gotoAndExpectAllowed(url: string) {
    await this.navigateToURL(url);
    await this.page.waitForSelector(Selectors.pmRoot, { timeout: 60000 });
    await this.page.waitForTimeout(1500);
    await expect(this.page.locator(Selectors.permissions.forbiddenHeading)).toHaveCount(0);
  }

  // The task-list "…" menu trigger renders for everyone, but the Delete item
  // inside is gated by canDeleteTaskList = isManager. Open the menu and check
  // the item — that is the real manager vs member signal.
  private async openListMenu(listTitle: string) {
    await this.page.locator(Selectors.taskList.menuTrigger(listTitle)).first().click();
    await this.page.waitForTimeout(400);
  }

  async assertCanDeleteList(listTitle: string) {
    await this.openListMenu(listTitle);
    await expect(this.page.locator(Selectors.taskList.deleteMenuItem).first()).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  async assertCannotDeleteList(listTitle: string) {
    await this.openListMenu(listTitle);
    await expect(this.page.locator(Selectors.taskList.deleteMenuItem)).toHaveCount(0);
    await this.page.keyboard.press('Escape');
  }
}
