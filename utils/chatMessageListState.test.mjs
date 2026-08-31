import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { buildChatDisplayItems, mergeChatMessages, shouldAutoScrollOnChatLoad, shouldLoadOlderMessagesFromH5Scroll, shouldStickToBottom } from './chatMessageListState.js'

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

test('H5 消息容器只有滚动到顶部且可以加载时才请求更早消息', () => {
  assert.equal(shouldLoadOlderMessagesFromH5Scroll({ scrollTop: 80, hasOlderMessages: true, loadingOlder: false }), true)
  assert.equal(shouldLoadOlderMessagesFromH5Scroll({ scrollTop: 81, hasOlderMessages: true, loadingOlder: false }), false)
  assert.equal(shouldLoadOlderMessagesFromH5Scroll({ scrollTop: 0, hasOlderMessages: false, loadingOlder: false }), false)
  assert.equal(shouldLoadOlderMessagesFromH5Scroll({ scrollTop: 0, hasOlderMessages: true, loadingOlder: true }), false)
})

test('H5 用户手动查看历史消息后不会被首屏请求强制拉回底部', () => {
	assert.equal(shouldAutoScrollOnChatLoad({ forceScroll: true, atBottom: false, userScrolled: true }), false)
	assert.equal(shouldAutoScrollOnChatLoad({ forceScroll: false, atBottom: true, userScrolled: true }), false)
	assert.equal(shouldAutoScrollOnChatLoad({ forceScroll: true, atBottom: false, userScrolled: false }), true)
})

test('H5 消息节点不能被原生 template 的文档片段包裹', () => {
  const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  const h5Section = source.split('<!-- #ifdef H5 -->')[1].split('<!-- #endif -->')[0]
  assert.doesNotMatch(h5Section, /<template>/)
})

test('H5 滚动回调会记录用户已离开底部', () => {
  const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  const h5Handler = source.split('function onH5MessageScroll(event) {')[1].split('function showLatestButton()')[0]
  assert.match(h5Handler, /h5UserScrolledAwayFromBottom\.value = !atBottom\.value/)
})

test('仅 H5 的后台刷新关闭自动滚动动画', () => {
  const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(source, /\/\/ #ifdef H5\s+scrollToLast\(\{ animated: false \}\);\s+\/\/ #endif\s+\/\/ #ifndef H5\s+scrollToLast\(\{ animated: hasLoadedInitialMessages \}\);/)
})

test('H5 的回到底部按钮在用户浏览历史消息时不会自动隐藏', () => {
  const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  const showButton = source.split('function showLatestButton() {')[1].split('function hideLatestButton()')[0]
  assert.match(showButton, /\/\/ #ifdef H5\s+return;\s+\/\/ #endif/)
})

test('分页加载更早消息和轮询新消息会按 ID 合并去重', () => {
  assert.deepEqual(
    mergeChatMessages([{ id: 16 }, { id: 17 }], [{ id: 1 }, { id: 2 }, { id: 16, content: '更新后的消息' }]),
    [{ id: 1 }, { id: 2 }, { id: 16, content: '更新后的消息' }, { id: 17 }]
  )
})

test('轮询返回相同消息时复用原列表，避免 H5 滚动容器重渲染', () => {
  const currentMessages = [{ id: 1, content: '已存在消息', read_count: 0 }]
  const mergedMessages = mergeChatMessages(currentMessages, [{ id: 1, content: '已存在消息', read_count: 0 }])
  assert.equal(mergedMessages, currentMessages)
})

test('同 ID 消息会复用旧对象并更新字段，减少 H5 重渲染', () => {
  const currentMessage = { id: 1, content: '旧内容', read_count: 0 }
  const currentMessages = [currentMessage]
  const mergedMessages = mergeChatMessages(currentMessages, [{ id: 1, content: '新内容', read_count: 3 }])
  assert.equal(mergedMessages[0], currentMessage)
  assert.deepEqual(mergedMessages[0], { id: 1, content: '新内容', read_count: 3 })
})

test('消息接口包在 data 中时仍会合并并展示消息', () => {
  assert.deepEqual(
    mergeChatMessages([], { data: { messages: [{ id: 18, content: '来自接口的消息' }] } }),
    [{ id: 18, content: '来自接口的消息' }]
  )
})
