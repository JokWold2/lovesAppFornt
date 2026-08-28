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
  assert.match(bubble, /defineEmits\(\[(['"])message-long-press\1, \1preview-image\1(?:, \1show-read-members\1)?\]\)/)
  assert.match(bubble, /emit\((['"])message-long-press\1,/)
  assert.match(room, /@message-long-press="openLongPressMenu"/)
})

test('图片消息长按只显示引用回复，文字消息仍保留复制', async () => {
  const [bubble, menu] = await Promise.all([
    readFile(new URL('./ChatMessageBubble.vue', import.meta.url), 'utf8'),
    readFile(new URL('./ChatLongPressMenu.vue', import.meta.url), 'utf8')
  ])
  assert.doesNotMatch(bubble, /message_type === ["']image["']\) return/)
  assert.match(menu, /v-if="message\?\.message_type !== 'image'" class="menu-item" @tap="copy"/)
  assert.match(menu, /class="menu-item" @tap="\$emit\('reply', message\)"/)
})
