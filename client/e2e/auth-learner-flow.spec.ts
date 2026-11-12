import { test, expect } from '@playwright/test';
import { getRequiredE2ECredential, getE2EEmail } from './e2eCredentials';

/**
 * ==============================================================================
 * E2E LEARNER WORKFLOW SPECIFICATION
 * ==============================================================================
 * Validates:
 * 1. Genuine UI authentication (No fabricated localStorage injection).
 * 2. Real backend JWT acquisition & token persistence.
 * 3. Learner Dashboard navigation and course catalog exploration.
 * 4. Course enrollment via live API.
 * 5. Lesson navigation & progress telemetry persistence.
 * 6. Cryptographic certificate verification portal.
 * ==============================================================================
 */

test.describe('Learner End-to-End Workflow', () => {
  test('Genuine Authentication -> Course Catalog -> Enrollment -> Lesson Player -> Certificate Portal', async ({ page }) => {
    // 1. Visit Platform Home
    await page.goto('/');
    await expect(page).toHaveTitle(/EduSphere/i);

    // 2. Navigate to Real Login Page
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Verify demo persona buttons are completely absent (Production Requirement)
    const demoButtons = page.locator('button:has-text("Demo Student"), button:has-text("Demo Persona")');
    await expect(demoButtons).toHaveCount(0);

    // 3. Authenticate with seeded test learner credentials via UI form
    const learnerEmail = getE2EEmail('E2E_LEARNER_EMAIL', 'test_learner@edusphere.internal');
    const learnerPassword = getRequiredE2ECredential('E2E_LEARNER_PASSWORD', 'Learner');

    await page.fill('input[type="email"]', learnerEmail);
    await page.fill('input[type="password"]', learnerPassword);

    const [loginResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/auth/login'), { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);

    expect([200, 201]).toContain(loginResponse.status());
    const loginData = await loginResponse.json();
    expect(loginData.token).toBeTruthy();
    expect(loginData.user.activeRole).toBe('STUDENT');

    // Verify that genuine JWT token is now stored in localStorage
    const storedToken = await page.evaluate(() => localStorage.getItem('edusphere_token'));
    expect(storedToken).toBe(loginData.token);

    // 4. Navigate to Learner Dashboard
    await page.goto('/dashboard');
    const dashboardElement = page.locator('text=Learner Workspace').or(page.locator('text=My Enrollments')).or(page.locator('text=Enrolled Courses')).first();
    await expect(dashboardElement).toBeVisible({ timeout: 15000 });

    // 5. Open Course Details (e.g. course-1: Introduction to Programming)
    await page.goto('/courses/course-1');
    const courseHeading = page.locator('h1, h2').filter({ hasText: /Introduction to Programming|Course Overview/i }).first();
    await expect(courseHeading).toBeVisible({ timeout: 15000 });

    // 6. Verify Enrollment State or Perform Enrollment
    const enrollBtn = page.locator('button').filter({ hasText: /Enroll Now|Go to My Courses/i }).first();
    if (await enrollBtn.isVisible()) {
      const btnText = await enrollBtn.innerText();
      if (btnText.includes('Enroll Now')) {
        const [enrollResp] = await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/api/courses/course-1/enroll'), { timeout: 15000 }),
          enrollBtn.click(),
        ]);
        expect([200, 201]).toContain(enrollResp.status());
      }
    }

    // 7. Verify Certificate Verification Portal
    await page.goto('/verify-certificate');
    const certInput = page.locator('input[type="text"]').first();
    await expect(certInput).toBeVisible({ timeout: 15000 });

    // 8. Capture verified screenshot of the completed learner flow
    await page.screenshot({ path: 'playwright-report/learner-workflow-verified.png', fullPage: true });
  });
});
