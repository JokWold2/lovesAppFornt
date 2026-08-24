import test from 'node:test'
import assert from 'node:assert/strict'

import { formatUnreadBadge, hasUnreadMessages, shouldUpdateTabBarBadge } from './unreadBadgeState.js'

test('未读数角标按微信上限格式化', () => {
  assert.equal(formatUnreadBadge(0), '')
  assert.equal(formatUnreadBadge(8), '8')
  assert.equal(formatUnreadBadge(100), '99+')
})

test('只有当前 TabBar 页面允许调用微信角标 API', () => {
  assert.equal(shouldUpdateTabBarBadge('pages/notice/notice'), true)
  assert.equal(shouldUpdateTabBarBadge('/pages/index/index360'), true)
  assert.equal(shouldUpdateTabBarBadge('pages/chat/chatRoom'), false)
})

test('未读红点只在真实未读数量大于零时显示', () => {
  assert.equal(hasUnreadMessages(0), false)
  assert.equal(hasUnreadMessages('0'), false)
  assert.equal(hasUnreadMessages(1), true)
})
