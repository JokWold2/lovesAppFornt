import { formatUnreadBadge } from './unreadBadgeState.js'

export const TAB_BAR_ITEMS = Object.freeze([
  { route: 'pages/index/index360', labelKey: 'navigation.home', icon: 'home' },
  { route: 'pages/notice/notice', labelKey: 'navigation.messages', icon: 'chat' },
  { route: 'pages/my/myLifeShow/myLifeShow', labelKey: 'navigation.moments', icon: 'pyq' }
])

function normalizeRoute(route) {
  return String(route || '').replace(/^\/+/, '')
}

export function isTabBarRoute(route) {
  return getTabBarIndex(route) >= 0
}

export function getTabBarIndex(route) {
  return TAB_BAR_ITEMS.findIndex(item => item.route === normalizeRoute(route))
}

export function getTabSwitchTarget(currentRoute, targetRoute) {
  if (!isTabBarRoute(targetRoute) || normalizeRoute(currentRoute) === normalizeRoute(targetRoute)) return null
  return `/${normalizeRoute(targetRoute)}`
}

export function isLiquidTabBarVisible({ route, pageVisible = true, keyboardHeight = 0, inputFocused = false } = {}) {
  return isTabBarRoute(route) && pageVisible && !inputFocused && !(Number(keyboardHeight) > 0)
}

// A small shared store also works before Vue mounts or while a cached tab is hidden.
export function createTabBarState() {
  let snapshot = { activeRoute: '', previousRoute: '', unreadText: '' }
  const listeners = new Set()
  const notify = reason => listeners.forEach(listener => listener({ ...snapshot }, reason))

  return {
    read: () => ({ ...snapshot }),
    subscribe(listener) {
      listeners.add(listener)
      listener({ ...snapshot }, 'subscribe')
      return () => listeners.delete(listener)
    },
    activate(route) {
      if (!isTabBarRoute(route)) return false
      const activeRoute = normalizeRoute(route)
      snapshot = {
        ...snapshot,
        previousRoute: activeRoute === snapshot.activeRoute ? snapshot.previousRoute : snapshot.activeRoute,
        activeRoute
      }
      // Notify even on the same route: navigateBack also reactivates a cached tab.
      notify('activate')
      return true
    },
    setUnreadCount(total) {
      const number = Number(total)
      const count = Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
      const unreadText = formatUnreadBadge(count)
      if (snapshot.unreadText === unreadText) return
      snapshot = { ...snapshot, unreadText }
      notify('unread')
    }
  }
}

export const tabBarState = createTabBarState()

export function hideNativeTabBar(runtime = typeof uni !== 'undefined' ? uni : undefined) {
  try {
    runtime?.hideTabBar?.({ animation: false, fail: () => {} })
  } catch (_) { /* Keep the custom navigation usable on runtimes without this API. */ }
}

export function activateLiquidTabBar(route, runtime = typeof uni !== 'undefined' ? uni : undefined) {
  if (!isTabBarRoute(route)) return false
  hideNativeTabBar(runtime)
  return tabBarState.activate(route)
}
