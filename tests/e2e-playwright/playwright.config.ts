import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

// Single config, real Playwright sharding. CI splits the suite with
// `--shard=<i>/<n>` across parallel matrix jobs (see .github/workflows) instead
// of hand-maintained parallel-one/two testMatch lists. The `setup` project runs
// first on every shard (dependency) to seed the reused admin auth; `chromium`
// then runs that shard's slice of the feature-folder specs.
export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup',
  timeout: 90000,
  expect: { timeout: 20000 },
  // Tests WITHIN a file stay serial+ordered (shared state); only whole files run
  // concurrently across workers, and only whole files are split across shards.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  // blob → mergeable across shards into one HTML report (merge-reports job).
  reporter: process.env.CI
    ? [['blob'], ['list']]
    : [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  use: {
    // Bounded so a wrong/blocked selector fails in 15s, not the whole timeout.
    actionTimeout: 15000,
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    baseURL: process.env.QA_BASE_URL,
  },
  projects: [
    // Logs in as admin once and saves storageState for the whole shard.
    {
      name: 'setup',
      testMatch: /setup\/.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    // All feature-folder specs; sharded by `--shard`. Reuses the admin auth.
    {
      name: 'chromium',
      testIgnore: /setup\//,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
