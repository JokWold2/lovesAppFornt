import { getUnreadCountApi } from '@/api/notifications.js'
import { tabBarState } from './tabBarState.js'

let pollingTimer = null

export async function refreshUnreadBadge() {
  try {
    const data = await getUnreadCountApi()
    tabBarState.setUnreadCount(data?.totalUnread)
    // Every tab renders the shared badge. WeChat rejects native badge calls
    // when tabBar.custom is enabled, including removeTabBarBadge on launch.
    return data
  } catch (error) {
    console.warn('刷新消息未读数失败', error)
    return null
  }
}

export function startUnreadBadgePolling(interval = 30000) {
  if (pollingTimer) return
  pollingTimer = setInterval(() => { refreshUnreadBadge() }, interval)
}

export function stopUnreadBadgePolling() {
  if (!pollingTimer) return
  clearInterval(pollingTimer)
  pollingTimer = null
}
