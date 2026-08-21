const VALID_CATEGORIES = new Set(['antique', 'second_hand'])

function assertCategory(category) {
  if (!VALID_CATEGORIES.has(category)) throw new Error('市场分类无效')
}

export function marketListRoute(category) {
  assertCategory(category)
  return `/pages/market/marketList?category=${category}`
}

export function marketFeedRoute(category, postId) {
  assertCategory(category)
  return `/pages/market/marketFeed?category=${category}&postId=${encodeURIComponent(postId)}`
}
