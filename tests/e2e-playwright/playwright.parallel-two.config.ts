import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  expect: { timeout: 20000 },
  // fullyParallel:false keeps tests WITHIN a file serial+ordered (shared file
  // data); only whole files run concurrently. Each spec seeds uniquely-named data
  // (PM roles are per-project), so parallel files don't overlap. Retries absorb
  // the occasional runner browser crash.
  fullyParallel: false,
  forbidOnly: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 2,
  reporter: process.env.CI
    ? [
        ['list', { printSteps: true }],
        ['json', { outputFile: './parallel-two/parallel-two-results.json' }],
        ['html', { outputFolder: './playwright-report/parallel-two-report', open: 'never' }],
      ]
    : [
        ['json', { outputFile: './parallel-two/parallel-two-results.json' }],
        ['html', { outputFolder: './playwright-report/parallel-two-report', open: 'never' }],
      ],
  use: {
    // Bounded so a wrong/blocked selector fails in 15s instead of hanging the
    // whole 90s test timeout (× retries).
    actionTimeout: 15000,
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    ignoreHTTPSErrors: true,
    baseURL: process.env.QA_BASE_URL,
  },
  projects: [
    {
      name: 'parallel-two',
      testMatch: [
        'tests/milestones/milestoneTest.spec.ts',
        'tests/milestones/milestoneCrudTest.spec.ts',
        'tests/milestones/milestoneLinkTest.spec.ts',
        'tests/discussions/discussionCommentTest.spec.ts',
        'tests/files/fileUploadTest.spec.ts',
        'tests/categories/categoryTest.spec.ts',
        'tests/kanban/kanbanTest.spec.ts',
        'tests/search/searchTest.spec.ts',
        'tests/overview/overviewTest.spec.ts',
        'tests/activity/activityTest.spec.ts',
        'tests/activity/activityLoggedTest.spec.ts',
        'tests/settings/settingsTest.spec.ts',
        'tests/settings/aiGenerateTest.spec.ts',
        'tests/upsell/proModalTest.spec.ts',
        'tests/auth/authTest.spec.ts',
        'tests/roles/rolesPermissionsTest.spec.ts',
        'tests/roles/rolesMatrixTest.spec.ts',
        'tests/roles/permissionsNegativeTest.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
