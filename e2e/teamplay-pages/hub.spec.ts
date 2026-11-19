import { expect, test } from '@playwright/test'
import { bundleOrigin, serveBundle } from '../bundle/assets'

test('the Pages intro hub starts and resumes a real game under the repository base path', async ({
  page,
}) => {
  const mountPath = (process.env.VITE_BASE_PATH ?? '/the-big-eye-teamplay/').replace(/\/$/, '')
  const site = bundleOrigin + mountPath + '/'
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await serveBundle(page, mountPath)
  await page.goto(site, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'The Big Eye Teamplay' })).toBeVisible()
  await expect
    .poll(() =>
      page.locator('.teamplay-intro-hero img').evaluate((img: HTMLImageElement) => img.naturalWidth)
    )
    .toBeGreaterThan(0)
  await page.getByText('How Teamplay works', { exact: true }).click()
  await expect(page.getByText('Three tribes of five.', { exact: false })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('teamplay-pages-intro-hub.png') })
  await page.getByRole('link', { name: 'Play Teamplay' }).click()
  await page.getByLabel('Your contestant').selectOption('finn')
  await page.getByRole('button', { name: 'Create season', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Meet your tribes' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Team competition' })).toBeVisible()
  await page.getByRole('button', { name: 'Play the 30-second race' }).click()
  await expect(page.getByRole('button', { name: 'Tap', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Home' }).click()
  await page.getByRole('link', { name: 'Play Teamplay' }).click()
  await expect(page.getByRole('button', { name: 'Restart the same attempt' })).toBeVisible()
  await page.goto(site + '#/teamplay-preview', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible()
  expect(errors).toEqual([])
})
