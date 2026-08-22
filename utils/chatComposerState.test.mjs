import test from 'node:test'
import assert from 'node:assert/strict'

import { appendEmoji, insertMention, makeTextMessagePayload } from './chatComposerState.js'

test('插入表情保留已有输入内容', () => {
  assert.equal(appendEmoji('你好', '😊'), '你好😊')
})

test('插入成员提及并保存结构化成员信息', () => {
  assert.deepEqual(
    insertMention('大家好 @', [{ userId: 3, name: '小王' }], { userId: 9, name: '小李' }),
    { draft: '大家好 @小李 ', mentions: [{ userId: 3, name: '小王' }, { userId: 9, name: '小李' }] }
  )
})

test('发送载荷只保留实际出现在正文中的提及并带上引用 ID', () => {
  assert.deepEqual(
    makeTextMessagePayload(' @小李 收到 ', [{ userId: 9, name: '小李' }, { userId: 3, name: '小王' }], { id: 21 }),
    { content: '@小李 收到', messageType: 'text', mentions: [{ userId: 9, name: '小李' }], replyToMessageId: 21 }
  )
})
