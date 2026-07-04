import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class SearchPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async openSearch() {
    await this.validateAndClickAny(Selectors.search.trigger);
    await this.assertionValidate(Selectors.search.input);
  }

  async search(text: string) {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('admin-topbar-search') && r.status() < 500,
      ),
      this.validateAndFillStrings(Selectors.search.input, text),
    ]);
    expect(response.status()).toBeLessThan(500);
    await this.page.waitForTimeout(500);
  }

  async assertResultVisible(title: string) {
    await expect(this.page.locator(Selectors.search.resultByTitle(title)).first()).toBeVisible();
  }

  async selectResult(title: string) {
    await this.validateAndClick(Selectors.search.resultByTitle(title));
    await this.waitForLoading();
  }
}
