import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 30000 },
  // fullyParallel:false keeps tests WITHIN a file serial+ordered (they share the
  // file's created data); only whole files run concurrently across workers. Each
  // spec seeds its own uniquely-named data (PM roles are per-project), so parallel
  // files don't overlap. Retries absorb the occasional runner browser crash.
  fullyParallel: false,
  forbidOnly: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 3,
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
