import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

// Drives the admin-only route guards (AdminRoute) from a NON-admin session.
export class PermissionsPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async gotoAndExpectForbidden(url: string) {
    await this.navigateToURL(url);
    // SPA mounts for any logged-in user (menu cap is `read`); the route body
    // is what the guard replaces with the Forbidden card.
    await this.page.waitForSelector(Selectors.pmRoot, { timeout: 60000 });
    await expect(this.page.locator(Selectors.permissions.forbiddenHeading).first()).toBeVisible({
      timeout: 30000,
    });
  }

  // Positive control: a non-admin route must render WITHOUT the Forbidden card,
  // proving the admin-route block is selective, not a blanket SPA failure.
  async gotoAndExpectAllowed(url: string) {
    await this.navigateToURL(url);
    await this.page.waitForSelector(Selectors.pmRoot, { timeout: 60000 });
    await this.page.waitForTimeout(1200);
    await expect(this.page.locator(Selectors.permissions.forbiddenHeading)).toHaveCount(0);
  }

  async assertSpaMounted() {
    await this.page.waitForSelector(Selectors.pmRoot, { timeout: 60000 });
    await expect(this.page.locator(Selectors.pmRoot)).toBeVisible();
  }

  async assertProjectNotVisible(title: string) {
    await this.page.waitForTimeout(1000);
    await expect(this.page.locator(Selectors.project.cardByTitle(title))).toHaveCount(0);
  }
}
