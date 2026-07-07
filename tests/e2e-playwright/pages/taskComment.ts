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

  async assertCommentNotVisible(text: string) {
    await expect(this.page.locator(Selectors.taskComment.byText(text))).toHaveCount(0);
  }

  // Comment rows only (excludes the activity feed, which echoes comment text).
  async assertNoComments() {
    await this.page.waitForTimeout(600);
    await expect(this.page.locator('[role="dialog"] .group\\/comment')).toHaveCount(0);
  }

  async assertEditedCommentVisible(text: string) {
    await expect(
      this.page.locator(`[role="dialog"] .group\\/comment :text("${text}")`).first(),
    ).toBeVisible();
  }

  // Comment action buttons live in a per-comment `.group/comment` row and reveal
  // on hover; scope to that row so the task's own Edit button isn't hit.
  async editComment(newText: string) {
    const row = this.page.locator('[role="dialog"] .group\\/comment').first();
    await row.hover();
    await row.locator('button[title="Edit"]').first().click();
    // The inline edit editor lives INSIDE the comment row (not the bottom
    // composer). Clear its existing content, then type the replacement.
    const editor = row.locator('.ProseMirror').first();
    await editor.waitFor();
    await editor.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
    await editor.type(newText);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.url().includes('/comments/') &&
          !r.url().includes('/delete') &&
          r.request().method() === 'POST',
      ),
      row.locator('button:has-text("Save")').first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async deleteComment() {
    const row = this.page.locator('[role="dialog"] .group\\/comment').first();
    await row.hover();
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/comments/') && r.url().includes('/delete'),
      ),
      row.locator('button[title="Delete"]').first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }
}
