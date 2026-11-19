import { expect, test } from '@playwright/test'
import { bundleOrigin, serveBundle } from '../bundle/assets'

test('Teamplay test page opens the individual stages and saves a human Tribunal vote across reloads', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await serveBundle(page)
  await page.goto(bundleOrigin + '/#/teamplay-preview', { waitUntil: 'domcontentloaded' })
  const scene = page.getByLabel('Jump to a scene')
  const event = page.locator('.teamplay-event')
  await scene.selectOption('fusion')
  await expect(event.getByRole('heading', { name: 'Final Five fusion' })).toBeVisible()
  const bank = await page.getByRole('list', { name: 'Resources' }).innerText()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(event.getByRole('heading', { name: 'Final Five fusion' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Final Five', exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Resources' })).toHaveText(bank, {
    useInnerText: true,
  })
  await expect(
    page.getByRole('group', { name: 'Choose a contender' }).getByRole('radio')
  ).toHaveCount(4)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(event.getByRole('heading', { name: 'Leader of the Hub', exact: true })).toBeVisible()
  await expect(event.getByRole('button', { name: 'Play the 30-second race' })).toBeVisible()

  await scene.selectOption('finalThree')
  await expect(event.getByRole('heading', { name: 'Final Three', exact: true })).toBeVisible()
  await expect(event.getByRole('heading', { name: /Part 1/ })).toBeVisible()
  await expect(event.getByRole('button', { name: 'Play the 30-second race' })).toBeVisible()

  await scene.selectOption('tribunal')
  await expect(event.getByRole('heading', { name: 'Tribunal', exact: true })).toBeVisible()
  await expect(event.getByText('Cast your vote for the champion.')).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(event.getByRole('radio')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Reveal the champion' })).toHaveCount(0)
  await event.getByRole('radio').first().check()
  await event.getByRole('button', { name: 'Confirm choice' }).click()
  await expect(page.getByRole('button', { name: 'Reveal the champion' })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(event.getByRole('radio')).toHaveCount(0)
  await page.getByRole('button', { name: 'Reveal the champion' }).click()
  await expect(event.getByRole('heading', { name: /wins Teamplay/ })).toBeVisible()
  const result = await event.getByRole('heading', { name: /wins Teamplay/ }).innerText()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(event.getByRole('heading', { name: result })).toBeVisible()
  await event.getByRole('button', { name: 'Tribunal voting record' }).click()
  await expect(event.getByText('voted for', { exact: false })).toHaveCount(9)
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-tribunal.png'),
  })
  await page.goto(bundleOrigin + '/#/teamplay', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Create season' })).toBeVisible()
  expect(errors).toEqual([])
})
