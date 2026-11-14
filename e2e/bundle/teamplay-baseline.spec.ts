import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

const bundleRoot = resolve('dist')
const origin = 'https://teamplay.test'
const contentTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
}

test('production baseline renders and offers only Classic, with commerce closed', async ({
  page,
}) => {
  // Serve the real built files through Playwright's normal request fixture.
  // No HTTP server, network connection or browser security override is used.
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== origin) return route.abort()
    const pathname = decodeURIComponent(url.pathname)
    const file = resolve(bundleRoot, '.' + (pathname === '/' ? '/index.html' : pathname))
    if (!file.startsWith(bundleRoot + sep)) return route.fulfill({ status: 403 })
    try {
      const body = await readFile(file)
      await route.fulfill({
        status: 200,
        contentType: contentTypes[extname(file)] ?? 'application/octet-stream',
        body,
      })
    } catch {
      await route.fulfill({ status: 404 })
    }
  })

  const errors: string[] = []
  page.on('pageerror', (error) => {
    errors.push(error.message)
    console.error('Browser startup error:', error.message)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') console.error('Browser console:', message.text())
  })
  await page.goto(origin + '/#/', { waitUntil: 'domcontentloaded' })
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

  await page.goto(origin + '/#/store', { waitUntil: 'domcontentloaded' })
  await expect(
    page.getByText('This module is not enabled in the development baseline.')
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible()
  expect(errors).toEqual([])
})
