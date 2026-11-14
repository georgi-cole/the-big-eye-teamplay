import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// One-time transformation of the pinned, isolated source snapshot only.
const root = process.cwd()
const textFiles = (directory) =>
  readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory()
      ? textFiles(path)
      : /\.(?:tsx?|jsx?|json|css|html|xml|java|kt|gradle|plist|pbxproj|entitlements)$/.test(path)
        ? [path]
        : []
  })
const replace = (file, transform) => {
  const path = join(root, file)
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  if (after !== before) writeFileSync(path, after, 'utf8')
}

for (const file of [...textFiles('src'), ...textFiles('tests'), ...textFiles('e2e')]) {
  replace(file, (source) =>
    source
      .replaceAll('bbmobilenew:', 'the-big-eye-teamplay:')
      .replaceAll('bbmobilenew_', 'the-big-eye-teamplay_')
      .replaceAll('bbmobile:', 'the-big-eye-teamplay:')
      .replace(/(['"\x60])bb:/g, '$1the-big-eye-teamplay:')
      .replace(
        /bb_(?=sp_competitions|eviction_vote_breakdown|vox_nomination|dr_|db)/g,
        'the-big-eye-teamplay_'
      )
      .replace(/the-big-eye-teamplay_q(?=\d)/g, 'bb_q')
      .replaceAll("'tiltedLedge_best_seconds'", "'the-big-eye-teamplay:tiltedLedge_best_seconds'")
  )
}
for (const file of ['package.json', 'package-lock.json']) {
  replace(file, (source) =>
    source.replaceAll('"name": "bbmobilenew"', '"name": "the-big-eye-teamplay"')
  )
}
replace('capacitor.config.ts', (source) =>
  source
    .replace(/com\.georgicole\.thebigeye(?!teamplay)/g, 'com.georgicole.thebigeyeteamplay')
    .replaceAll("appName: 'The Big Eye'", "appName: 'The Big Eye Teamplay'")
)
for (const file of [...textFiles('android'), ...textFiles('ios')]) {
  replace(file, (source) =>
    source
      .replace(/com\.georgicole\.thebigeye(?!teamplay)/g, 'com.georgicole.thebigeyeteamplay')
      .replaceAll('>The Big Eye<', '>The Big Eye Teamplay<')
      .replaceAll('DEVELOPMENT_TEAM = 9A85W8XX9Z;', 'DEVELOPMENT_TEAM = "";')
  )
}
replace('index.html', (source) =>
  source.replace(/The Big Eye(?! Teamplay)/g, 'The Big Eye Teamplay')
)
replace('public/manifest.json', (source) => {
  const manifest = JSON.parse(source)
  manifest.id = './'
  manifest.name = 'The Big Eye Teamplay'
  manifest.short_name = 'Teamplay'
  manifest.description = 'The Big Eye Teamplay development baseline'
  return JSON.stringify(manifest, null, 2) + '\n'
})
replace('vite.config.ts', (source) =>
  source
    .replaceAll("'/bbmobilenew/'", "'/the-big-eye-teamplay/'")
    .replace("target: 'http://localhost:4000'", "target: 'http://127.0.0.1:4401'")
)
console.log('Teamplay identity and namespaced storage applied to the isolated snapshot.')
