import test from 'node:test'
import assert from 'node:assert/strict'
import { openIncomingLikes, consumeIncomingLikesIntent } from '../utils/likesTabIntent.js'

test('profile likes opens the real tab and selects incoming once without marking read', () => {
  const calls = []
  openIncomingLikes({ switchTab: options => calls.push(options) })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, '/pages/likes/likes')
  assert.equal(consumeIncomingLikesIntent(), true)
  assert.equal(consumeIncomingLikesIntent(), false)
})

test('failed navigation does not change a later ordinary visit to Likes', () => {
  openIncomingLikes({ switchTab: options => options.fail() })
  assert.equal(consumeIncomingLikesIntent(), false)
})
