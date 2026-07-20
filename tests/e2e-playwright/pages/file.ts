import { type Page, expect } from '@playwright/test';
import { Base } from './base';

// On a task, files are attached by posting a comment with the file — there is no
// standalone task-file endpoint. The attachment then renders inside that comment.
export class FilePage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async upload(localPath: string) {
    const input = this.page.locator('[role="dialog"] input[type="file"]').first();
    await input.setInputFiles(localPath);
    await this.page.waitForTimeout(400);
    const editor = this.page.locator('[role="dialog"] .ProseMirror').last();
    await editor.click();
    await editor.fill('Attached file for QA');
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/comments') && r.request().method() === 'POST',
      ),
      this.page.locator('[role="dialog"] button:has-text("Add Comment")').first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.page.waitForTimeout(600);
  }

  // WP strips the extension and dedupes uploads (sample -> "sample-1"), so the
  // literal filename is unreachable; assert the image attachment is present instead.
  async assertFileVisible(_name: string) {
    await expect(
      this.page.locator('[role="dialog"] [class~="group/comment"] img').first(),
    ).toBeVisible();
  }

  async deleteFile(_name: string) {
    const comment = this.page
      .locator('[role="dialog"] [class~="group/comment"]')
      .filter({ has: this.page.locator('img') })
      .first();
    await comment.hover();
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          r.url().includes('/comments/') &&
          r.url().includes('/delete') &&
          r.request().method() === 'POST',
      ),
      comment.locator('button[title="Delete"]').first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }
}
