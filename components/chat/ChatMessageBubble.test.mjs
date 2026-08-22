import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('引用卡片位于消息正文下方并使用指定浅灰背景', async () => {
  const source = await readFile(new URL('./ChatMessageBubble.vue', import.meta.url), 'utf8')
  assert.ok(source.indexOf('class="message-text"') < source.indexOf('class="reply-card"'))
  assert.match(source, /\.reply-card[^}]*background:\s*#e4e4e4/)
})
