import { formatUnreadBadge } from './unreadBadgeState.js'

export const TAB_BAR_ITEMS = Object.freeze([
  { route: 'pages/index/index360', labelKey: 'navigation.home', icon: 'home' },
  { route: 'pages/likes/likes', labelKey: 'navigation.likes', icon: 'heart' },
  { route: 'pages/notice/notice', labelKey: 'navigation.messages', icon: 'chat' },
  { route: 'pages/my/myLifeShow/myLifeShow', labelKey: 'navigation.moments', icon: 'person', selectedIcon: 'person-filled' }
])

function normalizeRoute(route) {
  return String(route || '').replace(/^\/+/, '')
}

export function isMessageTab(route) {
  return normalizeRoute(route) === 'pages/notice/notice'
}

export function isLikesTab(route) {
  return normalizeRoute(route) === 'pages/likes/likes'
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

export function getSessionRestoreTarget(currentRoute, launchPath) {
  const clean = route => String(route || '').trim().split(/[?#]/)[0].replace(/^\/+|\/+$/g, '')
  // The active page wins if the user navigated while authentication was pending.
  // Before the first page mounts, uni's launch path already identifies that page.
  const route = clean(currentRoute) || clean(launchPath)
  if (!route || route === 'pages/login/login360' || route === 'pages/login/login') return '/pages/index/index360'
  return null
}

export function isLiquidTabBarVisible({ route, pageVisible = true, keyboardHeight = 0, inputFocused = false } = {}) {
  return isTabBarRoute(route) && pageVisible && !inputFocused && !(Number(keyboardHeight) > 0)
}

// A small shared store also works before Vue mounts or while a cached tab is hidden.
export function createTabBarState() {
  let snapshot = { activeRoute: '', previousRoute: '', unreadText: '', likesUnreadText: '' }
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
      const unreadText = formatUnreadBadge(total)
      if (snapshot.unreadText === unreadText) return
      snapshot = { ...snapshot, unreadText }
      notify('unread')
    },
    setUnreadSummary({ totalUnread, profileLikeUnread } = {}) {
      const unreadText = formatUnreadBadge(totalUnread)
      const likesUnreadText = formatUnreadBadge(profileLikeUnread)
      if (snapshot.unreadText === unreadText && snapshot.likesUnreadText === likesUnreadText) return
      snapshot = { ...snapshot, unreadText, likesUnreadText }
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
