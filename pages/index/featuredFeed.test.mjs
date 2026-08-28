import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const featuredFeedHelpers = await import('../../utils/featuredFeed.js')
const pageSource = await readFile(new URL('./index360.vue', import.meta.url), 'utf8')

test('homepage keeps blessing and featured API calls separate', () => {
	assert.match(pageSource, /getFeaturedFeedApi/)
	assert.match(pageSource, /getExploreFeedApi/)
})

test('homepage renders moment summaries in the featured card layout', () => {
  assert.match(pageSource, /item\.type === 'moment'/)
  assert.match(pageSource, /item\.summary/)
  assert.match(pageSource, /featuredItemImage\(item\)/)
})

test('homepage displays featured content in a two-column masonry layout', () => {
  assert.match(pageSource, /waterfall-grid/)
  assert.match(pageSource, /waterfall-column/)
  assert.match(pageSource, /featuredColumns/)
  assert.match(pageSource, /v-for="\((columnItems, index)\) in featuredColumns"/)
})

test('featured cards keep natural image height and circular avatars in narrow columns', () => {
  assert.match(pageSource, /&\.featured-card\s*\{[\s\S]*?\.post-media\s*\{\s*min-height:\s*0;/)
  assert.match(pageSource, /&\.featured-card\s*\{[\s\S]*?\.post-avatar\s*\{\s*flex:\s*0 0 70rpx;/)
  assert.match(pageSource, /&\.featured-card\s*\{[\s\S]*?\.avatar-img\s*\{\s*width:\s*100%;\s*height:\s*100%;/)
})

test('featured cards prevent horizontal overflow and reserve a skeleton before images load', () => {
  assert.match(pageSource, /class="post-media"[\s\S]*?'is-image-loading':\s*!isFeaturedImageLoaded\(\s*item\.feedKey,\s*\)/)
  assert.match(pageSource, /\.waterfall-grid\s*\{[\s\S]*?max-width:\s*100%;/)
  assert.match(pageSource, /\.waterfall-column\s*\{[\s\S]*?min-width:\s*0;/)
  assert.match(pageSource, /&\.is-image-loading\s*\{\s*min-height:\s*260rpx;/)
})

test('featured market cards render the meta price with a currency symbol', () => {
  assert.match(pageSource, /class="featured-price"/)
  assert.match(pageSource, /¥\s*\{\{\s*item\.meta\s*\}\}/)
})

test('recommendation controls use a fixed fallback with a placeholder while the feed scrolls', () => {
  assert.match(pageSource, /class="recommendation-sticky-header"/)
  assert.match(pageSource, /onPageScroll/)
  assert.match(pageSource, /recommendationHeaderFixed/)
  assert.match(pageSource, /recommendation-sticky-placeholder/)
  assert.match(pageSource, /&\.is-fixed\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?top:\s*0;/)
})

test('homepage supports like and comment interactions for blessing/moment cards', () => {
  assert.match(pageSource, /isFeaturedLikeAvailable/)
  assert.match(pageSource, /isFeaturedCommentAvailable/)
  assert.match(pageSource, /toggleLikeMomentApi/)
  assert.match(pageSource, /toggleFeaturedLike\(item\)/)
  assert.match(pageSource, /toggleFeaturedCommentPanel\(item\)/)
  assert.match(pageSource, /submitFeaturedComment\(item\)/)
  assert.match(pageSource, /getCommentsApi/)
  assert.match(pageSource, /addCommentApi/)
})

test('homepage resets featured pagination and only navigates market cards', () => {
  assert.match(pageSource, /featuredSeed\.value = ''/)
  assert.match(pageSource, /featuredCursor\.value = ''/)
  assert.match(pageSource, /featuredItemRoute\(item\)/)
  assert.match(pageSource, /if \(!route\) return/)
})

test('latest featured request is the only request allowed to apply results', () => {
  assert.equal(typeof featuredFeedHelpers.createLatestRequestGuard, 'function')

  const guard = featuredFeedHelpers.createLatestRequestGuard()
  const firstRequest = guard.begin()
  const refreshRequest = guard.begin()

  assert.equal(guard.isCurrent(firstRequest), false)
  assert.equal(guard.isCurrent(refreshRequest), true)
  assert.match(pageSource, /featuredRequestGuard\.isCurrent\(requestId\)/)
})
