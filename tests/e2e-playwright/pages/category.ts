import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class CategoryPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async create(name: string) {
    await this.openCategoriesPage();
    await this.validateAndClick(Selectors.category.newButton);
    const input = this.page.locator(Selectors.category.newInput).first();
    await input.waitFor();
    await input.fill(name);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/categories') && r.request().method() === 'POST',
      ),
      this.validateAndClick(Selectors.category.submit),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async openCategoriesPage() {
    await this.navigateToURL(this.pmCategories);
    await this.waitForPmSpa();
  }

  async assertVisible(name: string) {
    await expect(this.page.locator(Selectors.category.byName(name)).first()).toBeVisible();
  }

  async assertNotVisible(name: string) {
    await expect(this.page.locator(Selectors.category.byName(name))).toHaveCount(0);
  }

  private async openRowMenu(name: string) {
    // The "…" trigger is opacity-0 until the row is hovered — hover first.
    const row = this.page
      .locator(`div.grid.grid-cols-12:has(span:has-text("${name}"))`)
      .first();
    await row.scrollIntoViewIfNeeded();
    await row.hover();
    await this.page.waitForTimeout(200);
    await this.page
      .locator(Selectors.categoryCrud.rowMenu(name))
      .first()
      .click({ force: true, timeout: 10000 });
    await this.page.waitForTimeout(400);
  }

  async rename(oldName: string, newName: string) {
    await this.openRowMenu(oldName);
    await this.page.locator(Selectors.categoryCrud.editItem).first().click({ timeout: 10000 });
    const input = this.page.locator(Selectors.category.newInput).first();
    await input.waitFor();
    await input.fill(newName);
    // The dialog input submits (handleSave → categories/{id}/update) on Enter;
    // the edit button reads "Update Category", not "Save".
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.url().includes('/categories/') &&
          r.url().includes('/update') &&
          r.request().method() === 'POST',
      ),
      input.press('Enter'),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async remove(name: string) {
    await this.openRowMenu(name);
    await this.page.locator(Selectors.categoryCrud.deleteItem).first().click();
    await this.page.waitForTimeout(300);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/categories/') && r.url().includes('/delete'),
      ),
      this.page.locator(Selectors.categoryCrud.confirmDelete).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }
}
