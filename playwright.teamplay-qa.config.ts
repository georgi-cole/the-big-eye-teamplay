import { defineConfig } from '@playwright/test'
import bundleConfig from './playwright.bundle.config'

export default defineConfig(bundleConfig, {
  testDir: './e2e/teamplay-qa',
  outputDir: 'test-results/teamplay-qa',
})
