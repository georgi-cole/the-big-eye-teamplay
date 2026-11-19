import { defineConfig } from '@playwright/test'
import bundleConfig from './playwright.bundle.config'

export default defineConfig(bundleConfig, {
  testDir: './e2e/teamplay-pages',
  outputDir: 'test-results/teamplay-pages',
})
