import { getToken, getUserInfo } from './auth.js'
export const ONBOARDING_URL = '/pages/login/onboarding'
let installed = false
export function installOnboardingGuard() {
  if (installed) return
  installed = true
  for (const method of ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab']) {
    uni.addInterceptor(method, { invoke(args) {
      const route = String(args?.url || '').split('?')[0]
      if (!getToken() || !getUserInfo()?.needsOnboarding || route === ONBOARDING_URL || route === '/pages/login/login360' || route.startsWith('/pages/legal/')) return args
      uni.reLaunch({ url: ONBOARDING_URL })
      return false
    } })
  }
}
