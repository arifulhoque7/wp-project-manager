import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class OverviewPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async open(projectId: string) {
    await this.navigateToURL(`${this.pmHome}#/projects/${projectId}/overview`);
    await this.waitForLoading();
  }

  async assertRendered() {
    await expect(this.page.locator(Selectors.overview.subtitle).first()).toBeVisible();
  }

  async assertProgressVisible() {
    await expect(this.page.locator(Selectors.overview.progressHeading).first()).toBeVisible();
  }

  async assertTeamMembersVisible() {
    await expect(this.page.locator(Selectors.overview.teamMembersHeading).first()).toBeVisible();
  }

  async assertStatVisible(label: string) {
    await expect(this.page.locator(Selectors.overview.statByLabel(label)).first()).toBeVisible();
  }
}
