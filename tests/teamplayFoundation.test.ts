import { describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import {
  APP_IDENTITY,
  EXTERNAL_SERVICES_ENABLED,
  NATIVE_BILLING_ENABLED,
  isBaselineClassicRun,
} from '../src/config/appIdentity'
import { withNativeBilling } from '../src/vip/nativeBillingQueue'
import { configureNativePurchaseLifecycle } from '../src/vip/nativePurchaseLifecycle'
import { getBackendConfig } from '../src/services/backend/config'
import { fetchRemoteConfig } from '../src/remoteConfig/remoteConfigService'
import {
  SAVED_RUN_SLOT_KEY_PREFIX,
  SAVED_STATE_KEY_PREFIX,
} from '../src/store/saveStatePersistence'

describe('isolated Teamplay foundation', () => {
  it('uses a distinct identity in native and web entry points', () => {
    expect(APP_IDENTITY.appId).toBe('com.georgicole.thebigeyeteamplay')
    expect(readFileSync('capacitor.config.ts', 'utf8')).toContain(APP_IDENTITY.appId)
    expect(readFileSync('android/app/build.gradle', 'utf8')).toContain(APP_IDENTITY.appId)
    expect(readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8')).toContain(
      APP_IDENTITY.appId
    )
    expect(readFileSync('index.html', 'utf8')).toContain(`<title>${APP_IDENTITY.name}</title>`)
  })

  it('keeps Android native classes in their declared application package', () => {
    const packageDirectory = `android/app/src/main/java/${APP_IDENTITY.appId.replaceAll('.', '/')}`
    const nativeClasses = readdirSync(packageDirectory).filter((file) => file.endsWith('.java'))
    expect(nativeClasses).toContain('MainActivity.java')
    for (const file of nativeClasses) {
      expect(readFileSync(`${packageDirectory}/${file}`, 'utf8')).toMatch(
        new RegExp(`^package ${APP_IDENTITY.appId.replaceAll('.', '\\.')};`, 'm')
      )
    }
    const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8')
    expect(manifest).toContain('android:name=".MainActivity"')
    expect(manifest).toContain('android:targetActivity=".MainActivity"')
  })

  it('cannot open the original app save slots', () => {
    expect(SAVED_RUN_SLOT_KEY_PREFIX).toBe('the-big-eye-teamplay:savedRunSlot:')
    expect(SAVED_STATE_KEY_PREFIX).toBe('the-big-eye-teamplay:savedSeason:')
    expect(APP_IDENTITY.databaseName).not.toBe('big-eye-persistence')
  })

  it('rejects legacy billing before an operation can execute', async () => {
    const operation = vi.fn(async () => 'purchased')
    expect(NATIVE_BILLING_ENABLED).toBe(false)
    await expect(withNativeBilling(operation)).rejects.toThrow('Purchases are disabled')
    await expect(configureNativePurchaseLifecycle()).rejects.toThrow('Purchases are disabled')
    expect(operation).not.toHaveBeenCalled()
  })

  it('does not connect the baseline to original backend/config services', async () => {
    expect(EXTERNAL_SERVICES_ENABLED).toBe(false)
    expect(getBackendConfig()).toBeNull()
    expect(await fetchRemoteConfig()).toBeNull()
  })

  it('admits only the Classic engine baseline at the product boundary', () => {
    expect(isBaselineClassicRun({})).toBe(true)
    expect(isBaselineClassicRun({ mode: 'classic', expansionMode: null })).toBe(true)
    expect(isBaselineClassicRun({ mode: 'survival' })).toBe(false)
    expect(isBaselineClassicRun({ mode: 'classic', expansionMode: 'cupidArrow' })).toBe(false)
    expect(isBaselineClassicRun({ mode: 'classic', expansionMode: 'voxPopuli' })).toBe(false)
  })
})
