import { test, expect } from '@playwright/test';

test.describe('Instructor Course Studio Workflow', () => {
  test('Instructor Access Barrier and Studio Interface', async ({ page }) => {
    // 1. Attempt unauthenticated access to Instructor Studio
    await page.goto('/studio');

    // Should encounter unauthenticated role guard barrier
    const authBarrier = page.locator('text=Sign in to EduSphere').or(page.locator('text=Authentication Required')).or(page.locator('text=Sign In'));
    await expect(authBarrier).toBeVisible();

    // 2. Mock instructor authenticated session in localStorage
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_e2e_instructor_token');
      localStorage.setItem('auth_user', JSON.stringify({
        id: 'inst-e2e-1',
        fullName: 'Prof. David Vance',
        email: 'd.vance@mit.edu',
        activeRole: 'INSTRUCTOR',
        globalRole: 'STANDARD_USER',
        institutionId: 'tenant-1'
      }));
    });

    // 3. Reload studio under instructor session
    await page.goto('/studio');

    // Check presence of Course Title input or studio header
    const studioTitle = page.locator('text=Course Studio').or(page.locator('text=Curriculum')).or(page.locator('input[placeholder*="Course"]'));
    await expect(studioTitle.first()).toBeVisible({ timeout: 10000 });
  });
});
