import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class TaskPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async quickAdd(title: string) {
    const reveal = this.page.locator(Selectors.task.quickAddReveal).first();
    if (await reveal.count()) await reveal.click();
    await this.validateAndFillStrings(Selectors.task.quickAddInput, title);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/tasks') && r.request().method() === 'POST',
      ),
      this.validateAndClick(Selectors.task.quickAddSubmit),
    ]);
    expect(response.ok()).toBeTruthy();
  }

  async openTask(title: string) {
    await this.validateAndClick(Selectors.task.rowTitleButton(title));
    await this.page.locator(Selectors.task.detailSheet).first().waitFor();
    await this.page.waitForTimeout(500);
  }

  // The detail sheet is a modal Sheet; close it before touching rows underneath.
  async closeSheetIfOpen() {
    const sheet = this.page.locator(Selectors.task.detailSheet).first();
    if ((await sheet.count()) && (await sheet.isVisible().catch(() => false))) {
      await this.page.keyboard.press('Escape');
      await sheet.waitFor({ state: 'hidden' }).catch(() => {});
      await this.page.waitForTimeout(300);
    }
  }

  // No native date input: reveal the dates editor, pick Today as the Due day, Save.
  // (Uses the calendar's "Today" button — the specific date value isn't asserted.)
  async setDueDateToday() {
    await this.validateAndClick(Selectors.task.setDatesButton);
    await this.page.locator(Selectors.task.dueDateTrigger).first().click();
    await this.page.waitForTimeout(300);
    await this.page.locator(Selectors.task.calendarToday).last().click();
    await this.page.waitForTimeout(300);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/update') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.task.datesSaveButton).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async assignUser(username: string) {
    await this.page.locator(Selectors.task.addAssigneeButton).first().click();
    const search = this.page.locator(Selectors.task.assigneeSearchInput).first();
    await search.waitFor();
    await search.fill(username);
    await this.page.waitForTimeout(600);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/update') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.task.assigneeOption(username)).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
  }

  async editDescription(text: string) {
    await this.validateAndClick(Selectors.task.descEditButton);
    const editor = this.page.locator(Selectors.task.descEditor).first();
    await editor.click();
    await editor.fill(text);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/update') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.task.descSaveButton).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  // Duplicate lives in the row's action dropdown, not in the detail sheet.
  async duplicate(title: string) {
    await this.closeSheetIfOpen();
    const row = this.page.locator(Selectors.task.rowByTitle(title)).first();
    await row.hover();
    await row.locator('button').last().click();
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/duplicate') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.task.menuItem('Duplicate')).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  // Status is a circle button (first button in the row), not a checkbox input.
  async toggleComplete(title: string) {
    await this.closeSheetIfOpen();
    const row = this.page.locator(Selectors.task.rowByTitle(title)).first();
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/change-status') && r.request().method() === 'POST',
      ),
      row.locator('button').first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async deleteTask(title: string) {
    await this.closeSheetIfOpen();
    const row = this.page.locator(Selectors.task.rowByTitle(title)).first();
    await row.hover();
    await row.locator('button').last().click();
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/delete') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.task.menuItem('Delete')).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  // Detail sheet must be open. Opens the Milestone dropdown, picks the milestone,
  // waits for the attach-tasks POST that persists the link.
  async assignMilestone(title: string) {
    await this.page.locator(Selectors.task.milestoneTrigger).first().click();
    await this.page.waitForTimeout(300);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/attach-tasks') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.task.milestoneOption(title)).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async assertMilestoneAssigned(title: string) {
    await expect(
      this.page.locator(Selectors.task.milestoneRow).locator('button', { hasText: title }).first(),
    ).toBeVisible();
  }

  // Detail sheet must be open. Flips the privacy toggle and waits for the
  // tasks/privacy POST that persists it.
  async makePrivate() {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/tasks/privacy/') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.task.privacyPublic).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async assertPrivate() {
    await expect(this.page.locator(Selectors.task.privacyPrivate).first()).toBeVisible();
  }

  async assertTaskVisible(title: string) {
    await expect(this.page.locator(Selectors.task.byTitle(title)).first()).toBeVisible();
  }

  async attachFile(localPath: string) {
    const input = this.page.locator(Selectors.task.attachFileInput).first();
    await input.setInputFiles(localPath);
    await this.waitForLoading();
  }
}
