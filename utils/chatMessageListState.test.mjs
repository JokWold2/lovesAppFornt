import test from 'node:test'
import assert from 'node:assert/strict'

import { buildChatDisplayItems, shouldStickToBottom } from './chatMessageListState.js'

test('消息列表会在跨日处插入时间分隔项', () => {
  const items = buildChatDisplayItems([
    { id: 1, created_at: '2026-08-20T10:00:00+08:00' },
    { id: 2, created_at: '2026-08-21T10:00:00+08:00' }
  ])
  assert.deepEqual(items.map(item => item.kind), ['time', 'message', 'time', 'message'])
})

test('只在用户接近底部时让轮询结果自动滚动', () => {
  assert.equal(shouldStickToBottom({ scrollTop: 420, scrollHeight: 1000, viewportHeight: 520 }), true)
  assert.equal(shouldStickToBottom({ scrollTop: 120, scrollHeight: 1000, viewportHeight: 520 }), false)
})
