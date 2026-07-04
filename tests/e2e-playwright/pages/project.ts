import { type Page, expect } from '@playwright/test';
import { Base } from './base';
import { Selectors } from './selectors';

export class ProjectPage extends Base {
  constructor(page: Page) {
    super(page);
  }

  async openProjectsList() {
    await this.navigateToURL(this.pmHome);
    await this.waitForPmSpa();
  }

  async createProject(title: string, description = '') {
    await this.openProjectsList();
    await this.validateAndClick(Selectors.pmDashboard.newProjectButton);
    await this.validateAndFillStrings(Selectors.project.titleInput, title);
    if (description) {
      const desc = this.page.locator(Selectors.project.descriptionInput).first();
      if (await desc.count()) await desc.fill(description);
    }
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/pm/v2/projects') && r.request().method() === 'POST',
      ),
      this.validateAndClick(Selectors.project.createSubmit),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async assertProjectVisible(title: string) {
    await expect(this.page.locator(Selectors.project.cardByTitle(title)).first()).toBeVisible();
  }

  async assertProjectNotVisible(title: string) {
    await expect(this.page.locator(Selectors.project.cardByTitle(title)).first()).toHaveCount(0);
  }

  async openProject(title: string) {
    await this.validateAndClick(Selectors.project.cardByTitle(title));
    await this.waitForLoading();
  }

  async searchProject(text: string) {
    await this.validateAndFillStrings(Selectors.project.searchInput, text);
    await this.page.waitForTimeout(500);
  }

  // Open the per-card action dropdown (star/complete/delete live on the list card).
  async openProjectMenu(title: string) {
    const card = this.page.locator(Selectors.project.cardRoot(title)).first();
    await card.waitFor();
    await card.hover();
    await card.locator('button:has(svg.lucide-ellipsis)').first().click();
    await this.page.waitForTimeout(300);
  }

  async starProject(title: string) {
    const card = this.page.locator(Selectors.project.cardRoot(title)).first();
    await card.waitFor();
    await card.hover();
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/favourite') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.project.starButton(title)).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
  }

  async markComplete(title: string) {
    await this.openProjectMenu(title);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/update') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.project.menuItem('Complete')).first().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }

  async deleteProject(title: string) {
    await this.openProjectMenu(title);
    await this.page.locator(Selectors.project.menuItem('Delete')).first().click();
    await this.page.waitForTimeout(400);
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/delete') && r.request().method() === 'POST',
      ),
      this.page.locator(Selectors.project.confirmDelete).last().click(),
    ]);
    expect(response.ok()).toBeTruthy();
    await this.waitForLoading();
  }
}
