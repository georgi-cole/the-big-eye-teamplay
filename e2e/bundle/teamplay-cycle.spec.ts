import { test, expect, type Page } from '@playwright/test'
import { bundleOrigin, serveBundle } from './assets'

async function finishDuel(page: Page, resultHeading: string) {
  for (let replay = 0; replay < 2; replay++) {
    const spectator = page.getByRole('button', { name: 'Reveal AI competition', exact: true })
    if (await spectator.isVisible()) await spectator.click()
    else {
      await page.getByRole('button', { name: 'Delegate this performance', exact: true }).click()
      await page.getByRole('button', { name: 'Use this performance', exact: true }).click()
    }
    const result = page.getByRole('heading', { name: resultHeading, exact: true })
    await expect(
      result.or(page.getByText('The first attempt tied.', { exact: false }))
    ).toBeVisible()
    if (await result.isVisible()) return
  }
  await expect(page.getByRole('heading', { name: resultHeading, exact: true })).toBeVisible()
}

test('Teamplay completes a cycle after a real race and a saved Social 1 reload', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await serveBundle(page)
  await page.clock.install()
  await page.goto(bundleOrigin + '/#/teamplay', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'The Big Eye Teamplay' })).toBeVisible()
  await expect(
    page.getByRole('group', { name: 'Your contestant' }).getByRole('button', { name: 'Finn' })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.teamplay-intro-hero img')).toHaveJSProperty('complete', true)
  await expect
    .poll(() =>
      page.locator('.teamplay-intro-hero img').evaluate((img: HTMLImageElement) => img.naturalWidth)
    )
    .toBeGreaterThan(0)
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-intro.png'),
  })
  await page.getByRole('button', { name: 'Create season', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Meet your tribes' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Tribes' }).getByRole('listitem')).toHaveCount(3)
  await expect(page.locator('.teamplay-cycle-path [aria-current="step"]')).toHaveText('Tribes')
  const roster = page.getByRole('region', { name: 'Tribe roster' })
  for (const tribe of ['Ember', 'Tide', 'Iris']) {
    const lineup = roster.getByRole('group', { name: tribe, exact: true })
    await expect(lineup.getByRole('button', { name: /^Inspect / })).toHaveCount(5)
    await expect(lineup).toBeInViewport({ ratio: 1 })
  }
  await expect(page.getByRole('region', { name: 'The Big Eye broadcast' })).toBeInViewport()
  await expect(page.getByRole('region', { name: 'Tribe roster' })).toBeInViewport({ ratio: 1 })
  const dock = page.getByRole('navigation', { name: 'Game modules' })
  await expect(dock).toBeInViewport({ ratio: 1 })
  await expect(page.locator('.teamplay-screen select, .teamplay-screen details')).toHaveCount(0)
  await dock.getByRole('button', { name: 'Tribes' }).click()
  await roster
    .getByRole('group', { name: 'Tide', exact: true })
    .getByRole('button', { name: /^Inspect / })
    .first()
    .click()
  await expect(page.locator('.tp-dossier')).toBeVisible()
  await page.locator('.tp-dossier').getByRole('button', { name: 'Tribes' }).click()
  await dock.getByRole('button', { name: 'Hub' }).click()
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-tribe-hub.png'),
  })
  await page.getByRole('button', { name: 'Enter the competition' }).click()
  await expect(page.getByRole('heading', { name: 'Team competition', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Team competition' })).toHaveAttribute(
    'data-scene',
    'tribal'
  )
  await expect(dock).toHaveCount(0)
  await page.getByRole('button', { name: 'Play the 30-second race' }).click()
  const canvas = page.getByRole('button', { name: 'Tap', exact: true })
  await expect(canvas).toBeVisible()
  await page.clock.runFor(3500)
  for (let index = 0; index < 10; index++) await canvas.press('Space')
  await page.clock.runFor(30000)
  await expect(page.getByRole('heading', { name: 'Team results & captains' })).toBeVisible({
    timeout: 20000,
  })
  await page.getByRole('button', { name: 'Individual scores' }).click()
  await expect(page.locator('.teamplay-event')).toContainText(/Finn\s+10/)
  await page.getByRole('button', { name: 'Enter social' }).click()
  await expect(page.getByRole('heading', { name: 'Social 1', exact: true })).toBeVisible()
  const bank = await page.getByRole('list', { name: 'Resources' }).innerText()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Social 1', exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Resources' })).toHaveText(bank, {
    useInnerText: true,
  })
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-social-one.png'),
  })
  await expect(page.locator('html')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => window.innerWidth)
  )
  await page.getByRole('button', { name: /^Compliment/ }).click()
  await dock.getByRole('button', { name: 'Events' }).click()
  await expect(page.getByText(/wins immunity/)).toHaveCount(1)
  await page.getByRole('button', { name: 'My messages' }).click()
  await expect(page.getByText('Compliment', { exact: true })).toBeVisible()
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-events.png'),
  })
  await dock.getByRole('button', { name: 'Social' }).click()
  await page.getByRole('button', { name: 'Go to nominations' }).click()
  await expect(page.getByRole('heading', { name: 'Secret nominations', exact: true })).toBeVisible()
  const ballot = page.getByRole('button', { name: 'Lock secret ballot', exact: true })
  if (await ballot.isVisible()) {
    const choices = page.getByRole('group', { name: 'Choose a teammate' }).getByRole('radio')
    await expect(choices).toHaveCount(4)
    await choices.nth(1).check()
    await ballot.click()
    await expect(page.getByText('Your ballot is locked.', { exact: false })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Reveal nominees' }).click()
  const cutoff = page.getByRole('heading', { name: 'Captain cutoff decision', exact: true })
  const reveal = page.getByRole('heading', { name: 'Nomination reveal', exact: true })
  for (let index = 0; index < 2; index++) {
    await expect(cutoff.or(reveal)).toBeVisible()
    if (await reveal.isVisible()) break
    const strategy = page.getByRole('button', { name: 'Use strategy', exact: true })
    if (await strategy.isVisible()) {
      await strategy.click()
      await page.getByRole('button', { name: 'Confirm delegation' }).click()
    } else {
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
    }
  }
  await expect(reveal).toBeVisible()
  await expect(page.locator('[data-arena="nominations"] .teamplay-portrait')).toHaveCount(2)
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-nominations.png'),
  })
  await page.getByRole('button', { name: 'Enter social' }).click()
  await expect(page.getByRole('heading', { name: 'Social 2', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Enter nominee duel' }).click()
  await expect(page.getByRole('heading', { name: 'Nominee duel', exact: true })).toBeVisible()
  await finishDuel(page, 'Nominee duel result')
  await expect(page.locator('.teamplay-count')).toContainText('15 active')
  await page.getByRole('button', { name: 'Enter reserve duel' }).click()
  await expect(page.getByRole('heading', { name: 'Reserve duel', exact: true })).toBeVisible()
  await expect(page.locator('[data-arena="reserve"] .teamplay-portrait')).toHaveCount(2)
  await expect(
    page.locator('.teamplay-matchup').getByText('Neutral reserve', { exact: true })
  ).toBeVisible()
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-reserve-duel.png'),
  })
  await finishDuel(page, 'Reserve duel result')
  await expect(page.locator('.teamplay-matchup .teamplay-portrait-score')).toHaveCount(2)
  await expect(page.locator('.teamplay-count')).toContainText('14 active')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Cycle recap', exact: true })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Cycle recap', exact: true })).toBeVisible()
  await expect(page.locator('.teamplay-count')).toHaveText('Cycle 1 · 14 active')
  await expect(page.getByRole('region', { name: 'The Big Eye broadcast' })).toContainText(
    'leaves the house'
  )
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-recap.png'),
  })
  expect(errors).toEqual([])
})

test('production exposes the Teamplay launcher and keeps the test lab out of ordinary release builds', async ({
  page,
}) => {
  await serveBundle(page)
  await page.goto(bundleOrigin + '/#/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Not now', exact: true }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await page.getByRole('button', { name: 'Play Teamplay', exact: true }).click()
  await page.getByRole('link', { name: 'Play Teamplay', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Create season', exact: true })).toBeVisible()
  await page.goto(bundleOrigin + '/#/teamplay-preview', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible()
  await expect(page.getByText('Teamplay test page', { exact: true })).toHaveCount(0)
})
