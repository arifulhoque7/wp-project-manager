import { existsSync } from 'fs';
import { join } from 'path';
import type { BrowserContext } from '@playwright/test';

// Playwright runs from the e2e-playwright dir (where the config lives), both
// locally and in CI, so resolve the auth file against the working directory
// (this module is ESM — no __dirname).

// Saved admin auth (cookies) produced once by the setup project (alphaSetupTest).
// Every admin spec reuses it so its login navigates straight into wp-admin
// already authenticated — basicLogin() then sees the dashboard and skips the
// wp-login form (~3-4s per spec). Non-admin specs (role/permission) must NOT use
// this — they log in as their own users.
export const ADMIN_AUTH_FILE = join(process.cwd(), 'playwright', '.auth', 'admin.json');

// newContext() options: attach the saved admin storageState when it exists.
// Falls back to a fresh (unauthenticated) context — so a single-spec local run
// without the setup project still works via the normal login form.
export function pmContextOptions(): { storageState?: string } {
  return existsSync(ADMIN_AUTH_FILE) ? { storageState: ADMIN_AUTH_FILE } : {};
}

// Persist the current (logged-in) context's cookies for reuse. Called by the
// setup project after the admin login succeeds.
export async function saveAdminAuth(context: BrowserContext): Promise<void> {
  await context.storageState({ path: ADMIN_AUTH_FILE });
}
