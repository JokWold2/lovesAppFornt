import { marketFeedRoute } from './marketNavigation.js'

export function interactionRoute(notification) {
  // 社区帖子暂无详情页，互动提醒统一进入社区列表
  if (notification?.target_type === 'community_post') return '/pages/community/index'
  if (!notification?.market_category || !notification?.market_post_id) return ''
  const baseRoute = marketFeedRoute(notification.market_category, notification.market_post_id)
  if (notification.type !== 'market_comment') return baseRoute
  const commentId = notification.target_type === 'market_comment' && notification.target_id
    ? `&commentId=${encodeURIComponent(notification.target_id)}`
    : ''
  return `${baseRoute}${commentId}&openComments=1`
}
