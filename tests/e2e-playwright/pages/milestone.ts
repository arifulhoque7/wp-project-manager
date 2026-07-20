import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class MilestonePage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async open(projectId: string) {
    await this.navigateToURL(`${this.pmHome}#/projects/${projectId}/milestones`);
    await this.page.waitForSelector(Selectors.pmRoot, { timeout: 60000 });
    await this.waitForLoading();
    await this.page.waitForTimeout(800);
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

  async assertNotVisible(title: string) {
    await expect(this.page.locator(Selectors.milestone.byTitle(title))).toHaveCount(0);
  }

  private async openMenu(title: string) {
    await this.page.locator(Selectors.milestone.menuTriggerByTitle(title)).first().click();
    await this.page.waitForTimeout(400);
  }

  async editTitle(oldTitle: string, newTitle: string) {
    await this.openMenu(oldTitle);
    await this.page.locator(Selectors.milestone.editItem).first().click();
    const input = this.page.locator(Selectors.milestone.titleInput).first();
    await input.waitFor();
    await input.fill(newTitle);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.url().includes('/milestones/') &&
          r.url().includes('/update') &&
          r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.milestone.editSaveButton).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async remove(title: string) {
    await this.openMenu(title);
    await this.page.locator(Selectors.milestone.deleteItem).first().click();
    await this.page.waitForTimeout(300);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/milestones/') && r.url().includes('/delete'),
      ),
      this.page.locator(Selectors.milestone.confirmDelete).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
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
