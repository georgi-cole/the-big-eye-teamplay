import { NativePurchases } from '@capgo/native-purchases'
import { NATIVE_BILLING_ENABLED } from '../config/appIdentity'

let configuring: Promise<void> | null = null

/** Matches the static Capacitor setting, including after a hot reload. */
export function configureNativePurchaseLifecycle(): Promise<void> {
  if (!NATIVE_BILLING_ENABLED) {
    return Promise.reject(new Error('Purchases are disabled in the Teamplay baseline.'))
  }
  if (!configuring) {
    configuring = NativePurchases.configure({ autoFinishTransactions: false }).catch((error) => {
      configuring = null
      throw error
    })
  }
  return configuring
}
