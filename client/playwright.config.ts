import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for EduSphere
 * Executes real end-to-end tests against deployed staging or local test server
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 60000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-results.json' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://unique-e-learning-platform.pages.dev',
    trace: 'on',
    screenshot: 'on',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROME_PATH || 'C:\\Users\\ejara\\AppData\\Local\\ms-playwright\\chromium-1254\\chrome-win64\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
