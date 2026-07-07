import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class SettingsPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.navigateToURL(this.pmSettings);
    await this.waitForPmSpa();
  }

  async openAiTab() {
    await this.open();
    await this.validateAndClick(Selectors.settings.aiTab);
    await this.page.locator(Selectors.settings.saveButton).first().waitFor();
  }

  // provider kept for signature parity; the shadcn default (OpenAI) is used.
  async saveAiConfig(_provider: string, apiKey: string) {
    const changeKey = this.page.locator(Selectors.settings.aiChangeKeyButton).first();
    if ((await changeKey.count()) && (await changeKey.isVisible().catch(() => false))) {
      await changeKey.click();
      await this.page.waitForTimeout(200);
    }
    const keyInput = this.page.locator(Selectors.settings.aiApiKeyInput).first();
    await keyInput.waitFor();
    await keyInput.fill(apiKey);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/settings/ai') && r.request().method() === 'POST',
      ),
      this.validateAndClick(Selectors.settings.saveButton),
    ]);
    expect(response.ok()).toBeTruthy();
  }

  async saveGeneral() {
    // Save Changes is disabled until a change makes the form dirty. The General
    // switches are Pro-only, so in Free mode dirty a free number field instead.
    const toggle = this.page.locator(Selectors.settings.generalSwitch).first();
    if (await toggle.count()) {
      await toggle.click();
    } else {
      const numInput = this.page.locator(Selectors.settings.generalNumberField).first();
      await numInput.waitFor();
      await numInput.fill('15');
    }
    await this.page.waitForTimeout(200);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.url().includes('/pm/v2/settings') &&
          !r.url().includes('/ai') &&
          r.request().method() === 'POST',
      ),
      this.validateAndClick(Selectors.settings.saveButton),
    ]);
    expect(response.ok()).toBeTruthy();
  }
}
