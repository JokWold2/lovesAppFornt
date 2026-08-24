import { getUnreadCountApi } from '@/api/notifications.js'
import { formatUnreadBadge, shouldUpdateTabBarBadge } from './unreadBadgeState.js'

let pollingTimer = null

function isCurrentTabBarPage() {
  if (typeof getCurrentPages !== 'function') return true
  const pages = getCurrentPages()
  return shouldUpdateTabBarBadge(pages[pages.length - 1]?.route)
}

export async function refreshUnreadBadge() {
  try {
    const data = await getUnreadCountApi()
    const text = formatUnreadBadge(data?.totalUnread)
    if (!isCurrentTabBarPage()) return data
    if (text) uni.setTabBarBadge({ index: 1, text })
    else uni.removeTabBarBadge({ index: 1 })
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
