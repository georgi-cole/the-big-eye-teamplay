import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

export const bundleOrigin = 'https://teamplay.test'
const root = resolve('dist')
const types: Record<string, string> = {
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

export async function serveBundle(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== bundleOrigin) return route.abort()
    const file = resolve(
      root,
      '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname))
    )
    if (!file.startsWith(root + sep)) return route.fulfill({ status: 403 })
    try {
      await route.fulfill({
        status: 200,
        contentType: types[extname(file)] ?? 'application/octet-stream',
        body: await readFile(file),
      })
    } catch {
      await route.fulfill({ status: 404 })
    }
  })
}
