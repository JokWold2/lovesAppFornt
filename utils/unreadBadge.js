import { getUnreadCountApi } from '@/api/notifications.js'
import { getToken } from './auth.js'
import { tabBarState } from './tabBarState.js'
import { createUnreadBadgeController } from './unreadBadgeState.js'

const unreadBadge = createUnreadBadgeController({
  readToken: getToken,
  fetchSummary: getUnreadCountApi,
  onSummary: data => tabBarState.setUnreadSummary(data)
})

export function refreshUnreadBadge(options) {
  // Every tab renders shared state. Native badge APIs are unsupported when
  // WeChat tabBar.custom is enabled and must not be used here.
  return unreadBadge.refresh(options)
}

export function startUnreadBadgePolling(interval = 5000) {
  return unreadBadge.start(interval)
}

export function stopUnreadBadgePolling() {
  unreadBadge.stop()
}

export function resetUnreadBadgeState() {
  unreadBadge.reset()
}
