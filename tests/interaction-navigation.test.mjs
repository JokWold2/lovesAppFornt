import test from 'node:test'
import assert from 'node:assert/strict'
import { interactionRoute } from '../utils/interactionNavigation.js'

test('blessing likes open the likes page', () => {
  assert.equal(interactionRoute({ type: 'profile_like', target_type: 'profile', target_id: 12 }), '/pages/likes/likes')
})

test('community likes and comments retain the main branch community destination', () => {
  for (const type of ['community_like', 'community_comment']) {
    assert.equal(interactionRoute({ type, target_type: 'community_post', target_id: 12 }), '/pages/community/index')
  }
})

test('market likes retain their category and post destination', () => {
  for (const category of ['antique', 'second_hand']) {
    assert.equal(interactionRoute({ type: 'market_like', market_category: category, market_post_id: 12 }), `/pages/market/marketFeed?category=${category}&postId=12`)
  }
})

test('market comments retain the exact comment and open-comments flag', () => {
  assert.equal(interactionRoute({ type: 'market_comment', market_category: 'antique', market_post_id: 12, target_type: 'market_comment', target_id: 34 }), '/pages/market/marketFeed?category=antique&postId=12&commentId=34&openComments=1')
})

test('unsupported or absent notifications do not navigate', () => {
  assert.equal(interactionRoute(null), '')
  assert.equal(interactionRoute({ type: 'unknown' }), '')
})
