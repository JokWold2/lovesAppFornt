import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildTimeDivider,
  formatConversationTime,
  formatReplyPreview,
  getReceiptIcon,
  tokenizeMentions
} from './chatMessagePresentation.js'

test('仅跨日或间隔超过五分钟时插入时间分隔', () => {
  assert.equal(
    buildTimeDivider(
      { created_at: '2026-08-22T14:10:00.000+08:00' },
      { created_at: '2026-08-22T14:08:00.000+08:00' }
    ),
    null
  )
  assert.match(
    buildTimeDivider(
      { created_at: '2026-08-22T14:20:00.000+08:00' },
      { created_at: '2026-08-22T14:08:00.000+08:00' }
    ),
    /14:20/
  )
})

test('群聊列表显示最后一条消息的简短时间', () => {
  const now = new Date(2026, 7, 24, 12, 7)
  assert.equal(formatConversationTime('2026-08-24T09:03:00+08:00', now), '09:03')
  assert.equal(formatConversationTime('2026-08-23T09:03:00+08:00', now), '昨天')
  assert.equal(formatConversationTime('2026-08-20T09:03:00+08:00', now), '8/20')
})

test('提及只根据已保存的成员结构高亮', () => {
  assert.deepEqual(
    tokenizeMentions('@小王 好', [{ userId: 9, name: '小王' }]),
    [
      { text: '@小王', mentioned: true, userId: 9 },
      { text: ' 好', mentioned: false, userId: null }
    ]
  )
})

test('引用预览支持缺失消息和图片消息', () => {
  assert.deepEqual(formatReplyPreview(null), { author: '', text: '原消息已删除', imageUrl: '' })
  assert.deepEqual(
    formatReplyPreview({ sender_name: '小王', message_type: 'image', media_url: 'https://oss.example/a.jpg', content: '' }),
    { author: '小王', text: '[图片]', imageUrl: 'https://oss.example/a.jpg' }
  )
})

test('回执状态映射为 WhatsApp 风格图标', () => {
  assert.equal(getReceiptIcon('sending'), 'clock')
  assert.equal(getReceiptIcon('delivered'), 'single')
  assert.equal(getReceiptIcon('read'), 'double-blue')
})
