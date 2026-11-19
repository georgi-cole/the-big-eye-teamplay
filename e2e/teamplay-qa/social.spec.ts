import { expect, test } from '@playwright/test'
import { bundleOrigin, serveBundle } from '../bundle/assets'

test('Teamplay social preview offers local pact and alliance choices and restores the result', async ({
  page,
}) => {
  await serveBundle(page)
  await page.goto(bundleOrigin + '/#/teamplay-preview', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Jump to a scene').selectOption('socialOne')
  const alliances = page.getByRole('button', { name: 'Pacts & alliances', exact: true })
  await alliances.click()
  const panel = page.getByRole('region', { name: 'Pacts & alliances' })
  await expect(panel).toBeVisible()
  await panel.getByRole('button', { name: /Offer a personal pact/ }).click()
  const partners = panel.getByRole('group', { name: 'Pact partner' }).getByRole('radio')
  await expect(partners).toHaveCount(4)
  await partners.first().check()
  const pact = panel.getByRole('button', { name: /Offer a personal pact/ })
  await pact.click()
  const response = panel.getByText(/Agreement (accepted|declined):/)
  await expect(response).toHaveCount(1)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await alliances.click()
  await expect(response).toHaveCount(1)
  await panel.getByRole('button', { name: 'Found an alliance' }).click()
  const founders = panel.getByRole('checkbox')
  await expect(founders).toHaveCount(4)
  await founders.nth(0).check()
  await founders.nth(1).check()
  await panel.getByRole('button', { name: 'Send founding request' }).click()
  await expect(response).toHaveCount(2)
  await page.screenshot({
    animations: 'disabled',
    path: test.info().outputPath('teamplay-pacts-and-alliances.png'),
  })
  await page.getByLabel('Jump to a scene').selectOption('intro')
  await expect(page.getByRole('heading', { name: 'The Big Eye Teamplay' })).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await alliances.click()
  await expect(response).toHaveCount(2)
})
