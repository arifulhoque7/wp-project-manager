import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class KanbanPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async open(projectId: string) {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/kanboard') && r.status() < 500,
      ),
      this.navigateToURL(`${this.pmHome}#/projects/${projectId}/kanban`),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async assertBoardRendered() {
    await expect(this.page.locator(Selectors.kanban.boardHeading).first()).toBeVisible();
  }

  async createSection(title: string) {
    await this.validateAndFillStrings(Selectors.kanban.addSectionInput, title);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/kanboard') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.kanban.addSectionInput).first().press('Enter'),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async assertColumnVisible(title: string) {
    await expect(this.page.locator(Selectors.kanban.columnByTitle(title)).first()).toBeVisible();
  }
}
