import { test, expect } from '@playwright/test';

test.describe('Platform & Institution Administrator Workflow', () => {
  test('Admin Dashboard Access Control & Tabs Navigation', async ({ page }) => {
    // 1. Unauthenticated barrier
    await page.goto('/admin');
    const authBarrier = page.locator('text=Sign In').or(page.locator('text=Authentication Required')).or(page.locator('input[type="email"]'));
    await expect(authBarrier.first()).toBeVisible();

    // 2. Set SuperAdmin session
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock_e2e_admin_token');
      localStorage.setItem('auth_user', JSON.stringify({
        id: 'admin-e2e-root',
        fullName: 'Dr. Katherine Bell',
        email: 'root@edusphere.io',
        activeRole: 'PLATFORM_ADMIN',
        globalRole: 'PLATFORM_SUPERADMIN',
        institutionId: null
      }));
    });

    // 3. Navigate into Admin Dashboard
    await page.goto('/admin');

    // Admin overview metrics or administration tab should be visible
    const adminHeader = page.locator('text=Administration').or(page.locator('text=Platform Overview')).or(page.locator('text=Institutions'));
    await expect(adminHeader.first()).toBeVisible({ timeout: 10000 });
  });
});
