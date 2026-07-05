import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 30000 },
  fullyParallel: false,
  forbidOnly: false,
  retries: process.env.CI ? 0 : 0,
  // CI runs serial: 3 concurrent SPA boots on a runner that also hosts WordPress
  // overloads it and the PM bundle exceeds the 60s hydrate wait. Local keeps 3.
  workers: process.env.CI ? 1 : 3,
  reporter: process.env.CI
    ? [
        ['list', { printSteps: true }],
        ['json', { outputFile: './parallel-one/parallel-one-results.json' }],
        ['html', { outputFolder: './playwright-report/parallel-one-report', open: 'never' }],
      ]
    : [
        ['json', { outputFile: './parallel-one/parallel-one-results.json' }],
        ['html', { outputFolder: './playwright-report/parallel-one-report', open: 'never' }],
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
      name: 'parallel-one',
      testMatch: [
        'tests/projectTest.spec.ts',
        'tests/projectEditTest.spec.ts',
        'tests/projectSwitchTest.spec.ts',
        'tests/projectCategoryTest.spec.ts',
        'tests/coreCrudTest.spec.ts',
        'tests/taskListTest.spec.ts',
        'tests/taskListRenameTest.spec.ts',
        'tests/taskListCommentTest.spec.ts',
        'tests/taskTest.spec.ts',
        'tests/taskCommentTest.spec.ts',
        'tests/commentCrudTest.spec.ts',
        'tests/taskPrivacyDiscussionTest.spec.ts',
        'tests/taskTypesCrudTest.spec.ts',
        'tests/myTasksTest.spec.ts',
        'tests/myTasksFilterTest.spec.ts',
        'tests/myTasksStatusTest.spec.ts',
        'tests/myTasksMultiProjectTest.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
