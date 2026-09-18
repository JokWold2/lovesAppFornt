import test from 'node:test'
import assert from 'node:assert/strict'
import { messageLikePhoto } from '../utils/messageLikePhoto.js'

test('new like cards prefer avatars and fall back to an available uploaded photo', () => {
  const item = { avatarUrl: '/avatar.jpg', photoUrl: '/photo.jpg' }
  assert.equal(messageLikePhoto(item), '/avatar.jpg')
  assert.equal(messageLikePhoto({ photoUrl: '/photo.jpg' }), '/photo.jpg')
  assert.equal(messageLikePhoto({ avatarUrl: ' ', photoUrl: '/photo.jpg' }), '/photo.jpg')
  assert.equal(messageLikePhoto(item, false, url => url === '/avatar.jpg' ? '' : url || ''), '/photo.jpg')
  assert.equal(messageLikePhoto(null), '')
})

test('locked likes only display protected previews even when the original URLs are present', () => {
  const item = { avatarUrl: '/avatar.jpg', photoUrl: '/photo.jpg', previewUrl: 'data:image/jpeg;base64,blur' }
  assert.equal(messageLikePhoto(item, true), item.previewUrl)
  assert.equal(messageLikePhoto({ ...item, previewUrl: '' }, true), '')
  assert.equal(messageLikePhoto(item, true, () => ''), '')
  assert.equal(messageLikePhoto({ ...item, locked: true }), item.previewUrl)
})
