import { type Page, expect } from '@playwright/test';
import { TaskPage } from './task';
import { Selectors } from './selectors';

// Extends TaskPage to reuse openTask; the comment editor lives inside the
// TaskDetailSheet, below the description editor (hence .last()).
export class TaskCommentPage extends TaskPage {
  constructor(page: Page) {
    super(page);
  }

  async addComment(text: string) {
    const editor = this.page.locator(Selectors.taskComment.editor).last();
    await editor.waitFor();
    await editor.click();
    await editor.fill(text);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/comments') && r.request().method() === 'POST',
      ),
      this.validateAndClick(Selectors.taskComment.submitButton),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async assertCommentVisible(text: string) {
    await expect(this.page.locator(Selectors.taskComment.byText(text)).first()).toBeVisible();
  }
}
