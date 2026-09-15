import { marketFeedRoute } from './marketNavigation.js'

export function interactionRoute(notification) {
  if (notification?.type === 'profile_like') return '/pages/likes/likes'
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

export function isLockedBlessingNotification(notification) {
  return notification?.type === 'profile_like' && notification.locked === true
}

export function interactionSummary(notification, t) {
  if (!notification) return t('inbox.noInteractions')
  if (isLockedBlessingNotification(notification)) return t('membership.secretAdmirer')
  return `${notification.actor_name || notification.actor_email || t('inbox.user')} ${notification.type?.includes('comment') ? t('inbox.commented') : t('inbox.liked')}`
}
