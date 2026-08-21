import { marketFeedRoute } from './marketNavigation.js'

export function interactionRoute(notification) {
  if (!notification?.market_category || !notification?.market_post_id) return ''
  const baseRoute = marketFeedRoute(notification.market_category, notification.market_post_id)
  if (notification.type !== 'market_comment') return baseRoute
  const commentId = notification.target_type === 'market_comment' && notification.target_id
    ? `&commentId=${encodeURIComponent(notification.target_id)}`
    : ''
  return `${baseRoute}${commentId}&openComments=1`
}
