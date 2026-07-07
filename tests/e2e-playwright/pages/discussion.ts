import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class DiscussionPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async create(title: string, body: string) {
    await this.validateAndClick(Selectors.discussion.newButton);
    await this.validateAndFillStrings(Selectors.discussion.titleInput, title);
    const editor = this.page.locator(Selectors.discussion.bodyEditor).first();
    await editor.click();
    await editor.fill(body);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/discussion-boards') && r.request().method() === 'POST',
      ),
      this.validateAndClick(Selectors.discussion.submitButton),
    ]);
    expect(response.ok()).toBeTruthy();
  }

  async assertVisible(title: string) {
    await expect(this.page.locator(Selectors.discussion.byTitle(title)).first()).toBeVisible();
  }

  async assertNotVisible(title: string) {
    await expect(this.page.locator(Selectors.discussion.byTitle(title))).toHaveCount(0);
  }

  async open(title: string) {
    await this.page.locator(Selectors.discussion.byTitle(title)).first().click();
    await this.waitForLoading();
    await this.page.waitForTimeout(800);
  }

  // On the discussion detail page: open the actions menu, Delete, confirm.
  async remove() {
    await this.page.locator(Selectors.discussionCrud.menuTrigger).first().click();
    await this.page.waitForTimeout(400);
    await this.page.locator(Selectors.discussionCrud.deleteItem).first().click();
    await this.page.waitForTimeout(300);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/discussion-boards/') && r.url().includes('/delete'),
      ),
      this.page.locator(Selectors.discussionCrud.confirmDelete).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async comment(body: string) {
    const editor = this.page.locator(Selectors.discussion.commentInput).first();
    await editor.click();
    await editor.fill(body);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/comments') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.discussion.commentSubmit).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async mention(username: string) {
    const editor = this.page.locator(Selectors.discussion.commentInput).first();
    await editor.click();
    await this.page.keyboard.type('@');
    await this.page.keyboard.type(username);
    await this.page.waitForTimeout(500);
    await this.page.keyboard.press('Enter');
  }
}
