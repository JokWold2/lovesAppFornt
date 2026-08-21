import assert from 'node:assert/strict'
import test from 'node:test'
import { marketFeedRoute, marketListRoute } from './marketNavigation.js'

test('builds the antique and second hand list routes', () => {
  assert.equal(marketListRoute('antique'), '/pages/market/marketList?category=antique')
  assert.equal(marketListRoute('second_hand'), '/pages/market/marketList?category=second_hand')
})

test('builds a full screen market feed route', () => {
  assert.equal(marketFeedRoute('antique', 8), '/pages/market/marketFeed?category=antique&postId=8')
})
