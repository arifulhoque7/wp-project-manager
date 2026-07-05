import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 30000 },
  // fullyParallel:false keeps tests WITHIN a file serial+ordered (shared file
  // data); only whole files run concurrently. Each spec seeds uniquely-named data
  // (PM roles are per-project), so parallel files don't overlap. Retries absorb
  // the occasional runner browser crash.
  fullyParallel: false,
  forbidOnly: false,
  retries: process.env.CI ? 2 : 0,
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
    actionTimeout: 0,
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
        'tests/milestoneTest.spec.ts',
        'tests/milestoneCrudTest.spec.ts',
        'tests/milestoneLinkTest.spec.ts',
        'tests/discussionCommentTest.spec.ts',
        'tests/fileUploadTest.spec.ts',
        'tests/categoryTest.spec.ts',
        'tests/kanbanTest.spec.ts',
        'tests/searchTest.spec.ts',
        'tests/overviewTest.spec.ts',
        'tests/activityTest.spec.ts',
        'tests/activityLoggedTest.spec.ts',
        'tests/settingsTest.spec.ts',
        'tests/aiGenerateTest.spec.ts',
        'tests/proModalTest.spec.ts',
        'tests/authTest.spec.ts',
        'tests/rolesPermissionsTest.spec.ts',
        'tests/rolesMatrixTest.spec.ts',
        'tests/permissionsNegativeTest.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
