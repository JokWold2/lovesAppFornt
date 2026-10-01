import { marketFeedRoute } from './marketNavigation.js'

function textValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Normalise the comment name fields used by the home feed.
 * An email address is an account identifier, not a public display name.
 */
export function commentDisplayName(comment = {}, fallback = '') {
  const name = [
    comment.author_name,
    comment.authorName,
    comment.display_name,
    comment.displayName,
    comment.name
  ].map(textValue).find(Boolean)

  if (name) return name

  return fallback
}

export function commentReplyDisplayName(comment = {}, fallback = '') {
  return commentDisplayName({
    author_name: comment.reply_to_name || comment.replyToName,
    display_name: comment.reply_to_display_name || comment.replyToDisplayName,
    name: comment.reply_to_user_name || comment.replyToUserName
  }, fallback)
}

/**
 * Return the preferred image for a featured feed item.
 * @param {Object} item
 * @returns {string}
 */
export function featuredItemImage(item = {}) {
  if (item.membershipLocked) return item.lockedPreviewUrl?.startsWith('/api/market/locked-previews/') ? item.lockedPreviewUrl : ''
  return item.primaryImageUrl || item.images?.[0] || ''
}

/**
 * Featured market cards and moments can open their own detail pages.
 * @param {Object} item
 * @returns {string}
 */
export function featuredItemRoute(item = {}) {
	if (item.type === 'blessing' && item.id) return `/pages/searchPerson/personShow/personShow?id=${encodeURIComponent(item.id)}`
	if (item.type === 'moment' && item.id) return `/pages/moments/momentDetail?id=${item.id}`
  if (item.type !== 'antique' && item.type !== 'second_hand') return ''
  if (item.marketCategory !== 'antique' && item.marketCategory !== 'second_hand') return ''
  return marketFeedRoute(item.marketCategory, item.id, item.membershipLocked ? item.lockedPreviewUrl : '')
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
