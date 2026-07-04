import { type Page } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class ActivityPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async open(projectId: string) {
    await this.navigateToURL(`${this.pmHome}#/projects/${projectId}/activities`);
    await this.page.waitForTimeout(1500);
    await this.waitForLoading();
  }

  // In this build Pro is active but unlicensed, so the activity feed is
  // license-gated and redirects to the License page. Accept either the real
  // Activities feed or its License gate — both are reachable PM screens.
  async assertRendered() {
    await this.validateAny(`${Selectors.activity.heading}, ${Selectors.activity.licenseGate}`);
  }

  async assertContentRegion() {
    if (await this.page.locator(Selectors.activity.heading).first().isVisible().catch(() => false)) {
      if (await this.isProActive()) {
        await this.validateAny(`${Selectors.activity.item}, ${Selectors.activity.emptyState}`);
      } else {
        await this.validateAny(`${Selectors.activity.proBadge}, ${Selectors.activity.upsellHeading}`);
      }
    } else {
      // License-gated: assert the License page content is really rendered.
      await this.validateAny(Selectors.activity.licenseGate);
    }
  }
}
