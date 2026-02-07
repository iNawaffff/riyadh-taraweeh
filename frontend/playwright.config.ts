import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Limit workers to avoid starving Flask dev server (single-threaded)
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 14'],
      },
    },
    {
      name: 'Desktop Chrome',
      dependencies: ['Mobile Safari'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
