import assert from 'node:assert/strict'
import test from 'node:test'

import {
  commentDisplayName,
  commentReplyDisplayName,
  featuredItemImage,
  featuredItemRoute
} from './featuredFeed.js'

test('prefers primary image and falls back to the first image', () => {
  assert.equal(
    featuredItemImage({ primaryImageUrl: 'https://cdn.example/primary.jpg', images: ['fallback.jpg'] }),
    'https://cdn.example/primary.jpg'
  )
  assert.equal(featuredItemImage({ images: ['fallback.jpg'] }), 'fallback.jpg')
  assert.equal(featuredItemImage({ images: [] }), '')
})

test('市场卡和朋友圈卡各自解析到详情页', () => {
  assert.equal(
    featuredItemRoute({ type: 'antique', id: 7, marketCategory: 'antique' }),
    '/pages/market/marketFeed?category=antique&postId=7'
  )
  assert.equal(
    featuredItemRoute({ type: 'second_hand', id: 8, marketCategory: 'second_hand' }),
    '/pages/market/marketFeed?category=second_hand&postId=8'
  )
  assert.equal(featuredItemRoute({ type: 'moment', id: 9 }), '/pages/moments/momentDetail?id=9')
  assert.equal(featuredItemRoute({ type: 'blessing', id: 10 }), '')
  assert.equal(featuredItemRoute({ type: 'antique', id: 11 }), '')
  assert.equal(featuredItemRoute({ type: 'second_hand', id: 12, marketCategory: 'other' }), '')
})

test('精选朋友圈评论优先展示接口返回的资料名称', () => {
  assert.equal(commentDisplayName({ author_name: '小王', email: 'wang@example.com' }), '小王')
  assert.equal(commentDisplayName({ authorName: 'Mina', email: 'mina@example.com' }), 'Mina')
  assert.equal(commentDisplayName({ email: 'reader@example.com' }), 'reader')
  assert.equal(commentDisplayName({}), '用户')
  assert.equal(
    commentReplyDisplayName({ reply_to_name: '楼主', reply_to_email: 'owner@example.com' }),
    '楼主'
  )
})
