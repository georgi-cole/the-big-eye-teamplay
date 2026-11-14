import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const executablePath =
  process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      ].find((path) => existsSync(path))
    : undefined

export default defineConfig({
  testDir: './e2e/bundle',
  outputDir: 'test-results/teamplay-bundle',
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    launchOptions: executablePath ? { executablePath } : {},
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    { name: 'desktop', use: { viewport: { width: 1366, height: 768 } } },
  ],
})
