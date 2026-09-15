import { ref, watch } from 'vue'
import { createLocaleState } from './localeState.js'
import { activateLiquidTabBar, isTabBarRoute } from './tabBarState.js'
import { getLocaleBootstrapApi, saveLocalePreferenceApi } from '@/api/index.js'

const adapter = {
  get: key => uni.getStorageSync(key),
  set: (key, value) => uni.setStorageSync(key, value),
  bootstrap: systemLocale => getLocaleBootstrapApi(systemLocale),
  save: payload => saveLocalePreferenceApi(payload)
}

export const localeRuntime = createLocaleState(adapter, ref)
export const currentLocale = localeRuntime.locale
export const currentLocaleMode = localeRuntime.mode
export const t = (key, params) => localeRuntime.t(key, params)

function isCurrentTabBarPage() {
  try {
    if (typeof getCurrentPages !== 'function') return false
    const pages = getCurrentPages()
    return isTabBarRoute(pages[pages.length - 1]?.route)
  } catch (_) {
    return false
  }
}

export function updateTabBarLocale() {
  if (!isCurrentTabBarPage()) return false
  const pages = getCurrentPages()
  activateLiquidTabBar(pages[pages.length - 1]?.route)

  // LiquidGlassTabBar labels react directly to the locale. Native item updates
  // are unsupported on WeChat custom tab bars and would produce SDK errors.
  return true
}

function getSystemLocale() {
  try { return uni.getSystemInfoSync()?.language || '' } catch (_) { return '' }
}

export function initializeLocale() {
  localeRuntime.applySystemLocale(getSystemLocale())
}

export async function bootstrapLocale() {
  try {
    await localeRuntime.bootstrap(getSystemLocale())
  } catch (error) {
    // 位置接口不可用时保留已缓存的语言或系统语言，不打断用户会话。
    console.warn('语言地区初始化失败', error?.message || error)
  }
}

watch(currentLocale, () => updateTabBarLocale())
