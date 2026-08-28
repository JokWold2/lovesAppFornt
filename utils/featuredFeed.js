import { marketFeedRoute } from './marketNavigation.js'

/**
 * Return the preferred image for a featured feed item.
 * @param {Object} item
 * @returns {string}
 */
export function featuredItemImage(item = {}) {
  return item.primaryImageUrl || item.images?.[0] || ''
}

/**
 * Featured market cards can open their detail page. Other card types are
 * intentionally not navigable from the mixed feed.
 * @param {Object} item
 * @returns {string}
 */
export function featuredItemRoute(item = {}) {
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
