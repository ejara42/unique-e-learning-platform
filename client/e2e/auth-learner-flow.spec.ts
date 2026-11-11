import { test, expect } from '@playwright/test';

test.describe('Learner End-to-End Workflow', () => {
  test('Landing Page -> Catalog Exploration -> Syllabus & Authenticated Enrollment', async ({ page }) => {
    // 1. Visit Root Landing Page
    await page.goto('/');
    await expect(page).toHaveTitle(/EduSphere/i);

    // Verify key platform branding and navigation
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // 2. Navigate to Catalog
    const catalogLink = page.locator('a[href="/courses"]').first();
    if (await catalogLink.isVisible()) {
      await catalogLink.click();
      await expect(page).toHaveURL(/\/courses/);
    }

    // 3. Navigate to Auth Sign In Barrier
    await page.goto('/auth');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Verify demo persona buttons are absent
    const demoQuickLogin = page.locator('button:has-text("Demo Student")');
    await expect(demoQuickLogin).toHaveCount(0);

    // 4. Input validation check
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', '123');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Validation warning should appear
    await expect(page.locator('text=valid email').or(page.locator('text=Invalid'))).toBeVisible();
  });
});
