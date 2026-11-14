import { expect, test } from '@playwright/test'

test('Teamplay baseline offers one engine and keeps the legacy store closed', async ({ page }) => {
  await page.goto('./#/')
  await expect(page.getByRole('heading', { name: 'The Big Eye Teamplay' })).toBeVisible({
    timeout: 45000,
  })
  await expect(page.getByText('Development baseline · Classic engine')).toBeVisible()
  await page.getByRole('button', { name: 'Not now', exact: true }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play Classic baseline' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Vox Populi|Cupid|Surveyeval|Surprise Me/ })
  ).toHaveCount(0)
  await page.goto('./#/store')
  await expect(
    page.getByText('This module is not enabled in the development baseline.')
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible()
})
