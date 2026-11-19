import { spawn } from 'node:child_process'
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Copied next to the built index.html in the browser test package.
const root = dirname(fileURLToPath(import.meta.url))
const port = 4198
const url = `http://127.0.0.1:${port}/#/teamplay-preview`
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end()
    return
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, url).pathname)
    if (pathname.includes('\\') || pathname.includes('\0')) throw new Error('Invalid path')
    const file = join(root, pathname === '/' ? 'index.html' : pathname)
    if (relative(root, file).startsWith('..')) throw new Error('Path outside the build')
    const info = statSync(file)
    if (!info.isFile()) throw new Error('File not found')
    response.writeHead(200, {
      'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache',
    })
    if (request.method === 'HEAD') response.end()
    else
      createReadStream(file)
        .on('error', () => response.destroy())
        .pipe(response)
  } catch {
    response.writeHead(404).end('Not found')
  }
})

server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? 'Port 4198 is already in use. Close the other Teamplay preview and try again.'
      : error.message
  )
  process.exitCode = 1
})
server.listen(port, '127.0.0.1', () => {
  console.log(`Teamplay test build: ${url}\nKeep this window open while you play.`)
  if (process.platform === 'win32' && process.argv.includes('--open')) {
    const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
      windowsHide: true,
      stdio: 'ignore',
      detached: true,
    })
    browser.on('error', () => console.log(`Open ${url} in your browser.`))
    browser.unref()
  }
})
