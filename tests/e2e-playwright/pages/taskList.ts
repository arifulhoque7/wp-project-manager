import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class TaskListPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async createList(title: string, description = '') {
    await this.validateAndClick(Selectors.taskList.newButton);
    await this.validateAndFillStrings(Selectors.taskList.titleInput, title);
    if (description) {
      const desc = this.page.locator(Selectors.taskList.descriptionInput).first();
      if (await desc.count()) await desc.fill(description);
    }
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/task-lists') && r.request().method() === 'POST',
      ),
      this.validateAndClick(Selectors.taskList.saveButton),
    ]);
    expect(response.ok()).toBeTruthy();
  }

  async assertListVisible(title: string) {
    await expect(this.page.locator(Selectors.taskList.byTitle(title)).first()).toBeVisible();
  }

  async deleteList(title: string) {
    await this.page.locator(Selectors.taskList.menuTrigger(title)).first().click();
    await this.page.waitForTimeout(300);
    await this.page.locator(Selectors.taskList.deleteMenuItem).first().click();
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.url().includes('/task-lists/') &&
          r.url().includes('/delete') &&
          r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.taskList.confirmDelete).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }
}
