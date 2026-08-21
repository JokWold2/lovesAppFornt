import { getUnreadCountApi } from '@/api/notifications.js'

let pollingTimer = null

export function formatUnreadBadge(total) {
  const count = Number(total || 0)
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}

export async function refreshUnreadBadge() {
  try {
    const data = await getUnreadCountApi()
    const text = formatUnreadBadge(data?.totalUnread)
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
