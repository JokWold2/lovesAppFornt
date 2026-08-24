import test from 'node:test'
import assert from 'node:assert/strict'

import { buildChatDisplayItems, mergeChatMessages, shouldStickToBottom } from './chatMessageListState.js'

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

test('分页加载更早消息和轮询新消息会按 ID 合并去重', () => {
  assert.deepEqual(
    mergeChatMessages([{ id: 16 }, { id: 17 }], [{ id: 1 }, { id: 2 }, { id: 16, content: '更新后的消息' }]),
    [{ id: 1 }, { id: 2 }, { id: 16, content: '更新后的消息' }, { id: 17 }]
  )
})
