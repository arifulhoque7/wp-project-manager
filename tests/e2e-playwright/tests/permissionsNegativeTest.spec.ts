import { Browser, BrowserContext, Page, test, chromium } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { PermissionsPage } from '../pages/permissions';
import { Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';

// Negative authorization: a plain WP Subscriber (no manage_options, not a PM
// manager) can mount the SPA (menu cap is `read`) but every admin-only route
// must render the AdminRoute "Access denied" card. Guards live in the Free
// plugin (ProtectedRoute.jsx) so this holds regardless of Pro.
let browser: Browser;
let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
  page = await context.newPage();
  const login = new BasicLoginPage(page);
  await login.basicLoginAndPmVisit(Users.memberUsername, Users.memberPassword);
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Negative Permissions (non-admin)', () => {
  configureSpecFailFast();

  test('PN0001 : Subscriber can mount the PM SPA', async () => {
    const perm = new PermissionsPage(page);
    await perm.assertSpaMounted();
  });

  test('PN0002 : Settings route is forbidden', async () => {
    const perm = new PermissionsPage(page);
    await perm.gotoAndExpectForbidden(perm.pmSettings);
  });

  test('PN0003 : Categories route is forbidden', async () => {
    const perm = new PermissionsPage(page);
    await perm.gotoAndExpectForbidden(perm.pmCategories);
  });

  test('PN0004 : Import/Tools route is forbidden', async () => {
    const perm = new PermissionsPage(page);
    await perm.gotoAndExpectForbidden(perm.pmTools);
  });

  test('PN0005 : Modules route is forbidden', async () => {
    const perm = new PermissionsPage(page);
    await perm.gotoAndExpectForbidden(perm.pmModules);
  });

  test('PN0006 : My Tasks (read-cap route) is allowed — block is selective', async () => {
    const perm = new PermissionsPage(page);
    await perm.gotoAndExpectAllowed(perm.pmMyTasks);
  });
});
