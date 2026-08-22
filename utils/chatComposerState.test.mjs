import test from 'node:test'
import assert from 'node:assert/strict'

import { appendEmoji, insertMention, makeTextMessagePayload, attachReplyMessage, unwrapComponentEventPayload } from './chatComposerState.js'

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

test('父页面的最新引用消息优先写入发送载荷', () => {
  assert.deepEqual(
    attachReplyMessage({ content: '收到', messageType: 'text', replyToMessageId: null }, { id: 42 }),
    { content: '收到', messageType: 'text', replyToMessageId: 42 }
  )
})

test('微信小程序自定义事件使用 detail 中的真实消息', () => {
  const message = { id: 42, sender_name: '2', content: '你好' }
  assert.equal(unwrapComponentEventPayload({ detail: message }), message)
  assert.equal(unwrapComponentEventPayload(message), message)
})
