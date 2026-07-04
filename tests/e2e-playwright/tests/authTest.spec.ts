import { Browser, BrowserContext, Page, test, chromium, expect } from '@playwright/test';
import { BasicLoginPage } from '../pages/basicLogin';
import { BasicLogoutPage } from '../pages/basicLogout';
import { Selectors } from '../pages/selectors';
import { Users } from '../utils/testData';
import { configureSpecFailFast } from '../utils/specFailFast';

let browser: Browser;
let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
  browser = await chromium.launch();
  context = await browser.newContext();
  page = await context.newPage();
});

test.afterAll(async () => {
  await context.close();
  await browser.close();
});

test.describe('Authentication', () => {
  configureSpecFailFast();

  test('AU0001 : Admin logs into WP dashboard', async () => {
    const login = new BasicLoginPage(page);
    await login.basicLogin(Users.adminUsername, Users.adminPassword);
    await login.validateBasicLogin();
  });

  test('AU0002 : PM SPA mounts after login', async () => {
    const login = new BasicLoginPage(page);
    await login.navigateToURL(login.pmHome);
    await login.waitForPmSpa();
    await login.assertionValidate(Selectors.pmRoot);
  });

  test('AU0003 : Admin logs out and login form returns', async () => {
    const logout = new BasicLogoutPage(page);
    await logout.logout();
    await logout.navigateToURL(logout.wpAdminPage);
    await expect(
      page.locator(Selectors.login.basicLogin.loginEmailField).first(),
    ).toBeVisible();
  });
});
