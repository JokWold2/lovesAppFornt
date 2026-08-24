import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('引用卡片位于消息正文下方并使用指定浅灰背景', async () => {
  const source = await readFile(new URL('./ChatMessageBubble.vue', import.meta.url), 'utf8')
  assert.ok(source.indexOf('class="message-text"') < source.indexOf('class="reply-card"'))
  assert.match(source, /\.reply-card[^}]*background:\s*#e4e4e4/)
})

test('长按使用原生事件并转发为不冲突的自定义事件', async () => {
  const bubble = await readFile(new URL('./ChatMessageBubble.vue', import.meta.url), 'utf8')
  const room = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(bubble, /@longpress="onLongPress"/)
  assert.match(bubble, /defineEmits\(\[(['"])message-long-press\1, \1preview-image\1\]\)/)
  assert.match(bubble, /emit\((['"])message-long-press\1,/)
  assert.match(room, /@message-long-press="openLongPressMenu"/)
})
