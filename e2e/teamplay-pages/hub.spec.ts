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
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-pages-intro-hub.png'),
  })
  const utilities = page.getByRole('group', { name: 'Lobby utilities' })
  await expect(utilities).toBeInViewport({ ratio: 1 })
  if (test.info().project.name === 'phone') {
    await page.setViewportSize({ width: 320, height: 640 })
    await expect(page.getByRole('link', { name: 'Play Teamplay' })).toBeInViewport({ ratio: 1 })
    await expect(utilities).toBeInViewport({ ratio: 1 })
    const targets = await utilities.getByRole('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const { width, height } = button.getBoundingClientRect()
        return Math.min(width, height)
      })
    )
    expect(targets).toHaveLength(4)
    expect(Math.min(...targets)).toBeGreaterThanOrEqual(48)
    await page.setViewportSize({ width: 390, height: 844 })
  }
  await utilities.getByRole('button', { name: 'Store' }).click()
  const store = page.getByRole('dialog', { name: 'Store' })
  await expect(store).toContainText('The Teamplay store is closed in this build.')
  await store.getByRole('button', { name: 'Close' }).click()
  await utilities.getByRole('button', { name: 'Report a bug' }).click()
  const feedback = page.getByRole('dialog', { name: 'Report a bug' })
  await expect(feedback.getByRole('link', { name: 'Open email draft' })).toHaveAttribute(
    'href',
    /^mailto:[^?]+\?subject=The%20Big%20Eye%20Teamplay%20bug%20report&body=/
  )
  await page.keyboard.press('Escape')
  await expect(feedback).toBeHidden()
  for (const label of ['Music', 'Sound']) {
    const toggle = utilities.getByRole('button', { name: label, exact: true })
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  }
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(utilities.getByRole('button', { name: 'Music' })).toHaveAttribute(
    'aria-pressed',
    'false'
  )
  await expect(utilities.getByRole('button', { name: 'Sound' })).toHaveAttribute(
    'aria-pressed',
    'false'
  )
  await page.getByRole('button', { name: 'How Teamplay works' }).click()
  await expect(page.getByText('Three tribes of five.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByRole('button', { name: 'Meet the cast' }).click()
  await page
    .getByRole('group', { name: 'Your contestant' })
    .getByRole('button', { name: 'Finn' })
    .click()
  await expect(page.getByRole('button', { name: 'Finn' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Home' }).click()
  await page.getByRole('link', { name: 'Play Teamplay' }).click()
  await page.getByRole('button', { name: 'Create season', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Meet your tribes' })).toBeVisible()
  if (test.info().project.name === 'phone') {
    const roster = page.getByRole('region', { name: 'Tribe roster' })
    await expect(roster).toBeInViewport({ ratio: 1 })
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('teamplay-roster-390.png'),
    })
    await page.setViewportSize({ width: 320, height: 640 })
    await expect(roster.getByRole('button', { name: /^Inspect / })).toHaveCount(15)
    await expect(roster).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('button', { name: 'Enter the competition' })).toBeInViewport({
      ratio: 1,
    })
    await page.screenshot({
      animations: 'disabled',
      path: test.info().outputPath('teamplay-roster-320.png'),
    })
    await page.setViewportSize({ width: 390, height: 844 })
  }
  await page.getByRole('button', { name: 'Enter the competition' }).click()
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
