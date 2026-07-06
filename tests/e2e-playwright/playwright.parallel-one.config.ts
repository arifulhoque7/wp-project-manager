import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ quiet: true });

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  expect: { timeout: 20000 },
  // fullyParallel:false keeps tests WITHIN a file serial+ordered (they share the
  // file's created data); only whole files run concurrently across workers. Each
  // spec seeds its own uniquely-named data (PM roles are per-project), so parallel
  // files don't overlap. Retries absorb the occasional runner browser crash.
  fullyParallel: false,
  forbidOnly: false,
  retries: process.env.CI ? 1 : 0,
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
    // Bounded so a wrong/blocked selector fails in 15s instead of hanging the
    // whole 90s test timeout (× retries). Keeps the suite fast on failures.
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
      name: 'parallel-one',
      testMatch: [
        'tests/projects/projectTest.spec.ts',
        'tests/projects/projectEditTest.spec.ts',
        'tests/projects/projectSwitchTest.spec.ts',
        'tests/projects/projectCategoryTest.spec.ts',
        'tests/categories/coreCrudTest.spec.ts',
        'tests/task-lists/taskListTest.spec.ts',
        'tests/task-lists/taskListRenameTest.spec.ts',
        'tests/task-lists/taskListCommentTest.spec.ts',
        'tests/tasks/taskTest.spec.ts',
        'tests/tasks/taskCommentTest.spec.ts',
        'tests/tasks/commentCrudTest.spec.ts',
        'tests/tasks/taskPrivacyDiscussionTest.spec.ts',
        'tests/settings/taskTypesCrudTest.spec.ts',
        'tests/my-tasks/myTasksTest.spec.ts',
        'tests/my-tasks/myTasksFilterTest.spec.ts',
        'tests/my-tasks/myTasksStatusTest.spec.ts',
        'tests/my-tasks/myTasksMultiProjectTest.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
