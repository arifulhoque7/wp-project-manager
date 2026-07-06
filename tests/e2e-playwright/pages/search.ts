import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class SearchPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async openSearch() {
    const trigger = this.page.locator(Selectors.search.trigger).first();
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
    } else {
      // Fallback: the ⌘K / Ctrl+K global shortcut opens the command palette.
      await this.page.keyboard.press('Control+k');
    }
    await this.page.locator(Selectors.search.input).first().waitFor();
  }

  async search(text: string) {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('admin-topbar-search'),
      ),
      this.validateAndFillStrings(Selectors.search.input, text),
    ]);
    expect(response.ok()).toBeTruthy();
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
