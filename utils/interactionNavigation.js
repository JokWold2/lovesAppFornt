import { marketFeedRoute } from './marketNavigation.js'

export function interactionRoute(notification) {
  if (notification?.type === 'profile_like') return '/pages/likes/likes'
  // 社区帖子暂无详情页，互动提醒统一进入社区列表
  if (notification?.target_type === 'community_post') return '/pages/community/index'
  // 需求市场的报名 / 选定通知直接进入信息详情；托管交易通知进入担保交易订单页
  if (notification?.target_type === 'demand_hall_post' && notification.target_id) {
    return `/pages/demandhall/detail?id=${encodeURIComponent(notification.target_id)}`
  }
  if (notification?.target_type === 'demand_hall_order') {
    // 早期通知没有带订单号，退回工作台而不是打开一个无效的订单页。
    return notification.target_id
      ? `/pages/demandhall/orderDetail?id=${encodeURIComponent(notification.target_id)}`
      : '/pages/demandhall/workspace?tab=applies'
  }
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
