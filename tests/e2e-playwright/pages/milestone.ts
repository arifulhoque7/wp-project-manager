import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class MilestonePage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async create(title: string, description = '') {
    await this.validateAndClick(Selectors.milestone.newButton);
    await this.page.locator(Selectors.milestone.titleInput).first().waitFor();
    await this.validateAndFillStrings(Selectors.milestone.titleInput, title);
    if (description) {
      const editor = this.page.locator(Selectors.milestone.descriptionEditor).first();
      if (await editor.count()) {
        await editor.click();
        await editor.fill(description);
      }
    }
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/milestones') && r.request().method() === 'POST',
      ),
      this.validateAndClick(Selectors.milestone.saveButton),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async assertVisible(title: string) {
    await expect(this.page.locator(Selectors.milestone.byTitle(title)).first()).toBeVisible();
  }

  // Complete toggle lives in the milestone card's action dropdown ("Mark Complete").
  async toggleComplete(title: string) {
    const card = this.page
      .locator('div')
      .filter({ has: this.page.locator(`h4:has-text("${title}")`) })
      .filter({ has: this.page.locator(Selectors.milestone.menuTrigger) })
      .last();
    await card.locator(Selectors.milestone.menuTrigger).first().click();
    await this.page.waitForTimeout(300);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.url().includes('/milestones/') &&
          r.url().includes('/update') &&
          r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.milestone.markComplete).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }
}
