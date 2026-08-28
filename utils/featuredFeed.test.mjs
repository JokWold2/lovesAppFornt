import assert from 'node:assert/strict'
import test from 'node:test'

import { featuredItemImage, featuredItemRoute } from './featuredFeed.js'

test('prefers primary image and falls back to the first image', () => {
  assert.equal(
    featuredItemImage({ primaryImageUrl: 'https://cdn.example/primary.jpg', images: ['fallback.jpg'] }),
    'https://cdn.example/primary.jpg'
  )
  assert.equal(featuredItemImage({ images: ['fallback.jpg'] }), 'fallback.jpg')
  assert.equal(featuredItemImage({ images: [] }), '')
})

test('only market cards resolve routes', () => {
  assert.equal(
    featuredItemRoute({ type: 'antique', id: 7, marketCategory: 'antique' }),
    '/pages/market/marketFeed?category=antique&postId=7'
  )
  assert.equal(
    featuredItemRoute({ type: 'second_hand', id: 8, marketCategory: 'second_hand' }),
    '/pages/market/marketFeed?category=second_hand&postId=8'
  )
  assert.equal(featuredItemRoute({ type: 'moment', id: 9 }), '')
  assert.equal(featuredItemRoute({ type: 'blessing', id: 10 }), '')
  assert.equal(featuredItemRoute({ type: 'antique', id: 11 }), '')
  assert.equal(featuredItemRoute({ type: 'second_hand', id: 12, marketCategory: 'other' }), '')
})
