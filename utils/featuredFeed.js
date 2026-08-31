import { marketFeedRoute } from './marketNavigation.js'

function textValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Normalise the two comment response formats currently used by the home feed.
 * Moment comments expose `author_name`, while blessing comments expose `email`.
 */
export function commentDisplayName(comment = {}, fallback = '用户') {
  const name = [
    comment.author_name,
    comment.authorName,
    comment.display_name,
    comment.displayName,
    comment.name
  ].map(textValue).find(Boolean)

  if (name) return name

  const email = textValue(comment.email)
  if (email) return email.split('@')[0] || email

  return fallback
}

export function commentReplyDisplayName(comment = {}, fallback = '用户') {
  return commentDisplayName({
    author_name: comment.reply_to_name || comment.replyToName,
    display_name: comment.reply_to_display_name || comment.replyToDisplayName,
    name: comment.reply_to_user_name || comment.replyToUserName,
    email: comment.reply_to_email || comment.replyToEmail
  }, fallback)
}

/**
 * Return the preferred image for a featured feed item.
 * @param {Object} item
 * @returns {string}
 */
export function featuredItemImage(item = {}) {
  return item.primaryImageUrl || item.images?.[0] || ''
}

/**
 * Featured market cards and moments can open their own detail pages.
 * @param {Object} item
 * @returns {string}
 */
export function featuredItemRoute(item = {}) {
	if (item.type === 'moment' && item.id) return `/pages/moments/momentDetail?id=${item.id}`
  if (item.type !== 'antique' && item.type !== 'second_hand') return ''
  if (item.marketCategory !== 'antique' && item.marketCategory !== 'second_hand') return ''
  return marketFeedRoute(item.marketCategory, item.id)
}

/**
 * Identifies the newest in-flight featured-feed request so callers can ignore
 * an older response after a refresh begins.
 */
export function createLatestRequestGuard() {
  let latestRequestId = 0

  return {
    begin() {
      latestRequestId += 1
      return latestRequestId
    },
    isCurrent(requestId) {
      return requestId === latestRequestId
    }
  }
}
