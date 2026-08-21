import assert from 'node:assert/strict'
import test from 'node:test'
import { interactionRoute } from './interactionNavigation.js'

test('routes a market comment interaction into its post and comment', () => {
  assert.equal(
    interactionRoute({ type: 'market_comment', target_type: 'market_comment', market_category: 'antique', market_post_id: 8, target_id: 31 }),
    '/pages/market/marketFeed?category=antique&postId=8&commentId=31&openComments=1'
  )
})

test('routes a market like to its post', () => {
  assert.equal(
    interactionRoute({ type: 'market_like', market_category: 'second_hand', market_post_id: 9, target_id: 9 }),
    '/pages/market/marketFeed?category=second_hand&postId=9'
  )
})
