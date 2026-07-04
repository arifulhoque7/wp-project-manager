import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class ActivityPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async open(projectId: string) {
    await this.navigateToURL(`${this.pmHome}#/projects/${projectId}/activities`);
    await this.waitForLoading();
  }

  async assertRendered() {
    await expect(this.page.locator(Selectors.activity.heading).first()).toBeVisible();
    await expect(this.page.locator(Selectors.activity.subtitle).first()).toBeVisible();
  }

  // Free mode gates the feed behind a Pro upsell; Pro renders real entries.
  async assertContentRegion() {
    if (await this.isProActive()) {
      await this.validateAny(
        `${Selectors.activity.item}, ${Selectors.activity.emptyState}`,
      );
    } else {
      await this.validateAny(
        `${Selectors.activity.proBadge}, ${Selectors.activity.upsellHeading}`,
      );
    }
  }
}
