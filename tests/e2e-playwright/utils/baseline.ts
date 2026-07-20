import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { Page } from '@playwright/test';

// A prerequisite project seeded ONCE by the setup project and reused by every
// "container" spec (tasks/milestones/discussions/files/kanban/…) so they skip
// their own ~10s create-project step. Specs still create their OWN uniquely-named
// task list inside it, so parallel container specs never collide on list-level
// state. Specs that test project-level CRUD keep creating their own project.
export const BASELINE_FILE = join(process.cwd(), 'playwright', '.auth', 'baseline.json');

export interface Baseline {
  projectId: string;
  listId: string;
  projectTitle: string;
  listTitle: string;
}

// Seed the baseline project + list via REST from an authenticated page, persist
// the ids. Best-effort — specs fall back to creating their own project if absent.
export async function saveBaseline(page: Page): Promise<void> {
  const data = await page.evaluate(async () => {
    const v = window.PM_Vars;
    const base = v.rest_url.replace(/\/$/, '');
    const post = async (path: string, body: object) =>
      (
        await fetch(`${base}/${path}`, {
          method: 'POST',
          headers: { 'X-WP-Nonce': v.permission, 'content-type': 'application/json' },
          body: JSON.stringify({ ...body, is_admin: v.is_admin }),
        })
      ).json();
    const projectTitle = 'E2E Baseline Project';
    const listTitle = 'E2E Baseline List';
    const p = await post('projects', { title: projectTitle, status: 'incomplete' });
    const projectId = String(p?.data?.id ?? '');
    const l = projectId ? await post(`projects/${projectId}/task-lists`, { title: listTitle }) : null;
    return { projectId, listId: String(l?.data?.id ?? ''), projectTitle, listTitle };
  });
  mkdirSync(dirname(BASELINE_FILE), { recursive: true });
  writeFileSync(BASELINE_FILE, JSON.stringify(data));
}

export function getBaseline(): Baseline | null {
  if (!existsSync(BASELINE_FILE)) return null;
  try {
    const b = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
    return b.projectId ? b : null;
  } catch {
    return null;
  }
}
