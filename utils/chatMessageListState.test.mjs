import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { buildChatDisplayItems, mergeChatMessages, planH5ChatLoadScroll, readH5MessageScrollMetrics, shouldAutoScrollForChatInteraction, shouldAutoScrollOnChatLoad, shouldLoadOlderMessagesFromH5Scroll, shouldShowChatLatestButton, shouldStickToBottom, shouldStickToBottomAfterChatLoad } from './chatMessageListState.js'

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
  assert.equal(shouldLoadOlderMessagesFromH5Scroll({ scrollTop: 60, hasOlderMessages: true, loadingOlder: false }), true)
  assert.equal(shouldLoadOlderMessagesFromH5Scroll({ scrollTop: 61, hasOlderMessages: true, loadingOlder: false }), false)
  assert.equal(shouldLoadOlderMessagesFromH5Scroll({ scrollTop: 0, hasOlderMessages: false, loadingOlder: false }), false)
  assert.equal(shouldLoadOlderMessagesFromH5Scroll({ scrollTop: 0, hasOlderMessages: true, loadingOlder: true }), false)
})

test('H5 包装滚动事件没有 metrics 时读取实际消息容器位置', () => {
  const metrics = readH5MessageScrollMetrics({
    element: { scrollTop: 234, scrollHeight: 1601, clientHeight: 687 },
    event: { currentTarget: { scrollTop: 0, scrollHeight: 0, clientHeight: 0 } },
  })

  assert.deepEqual(metrics, { scrollTop: 234, scrollHeight: 1601, clientHeight: 687 })
  assert.equal(shouldStickToBottom({ ...metrics, viewportHeight: metrics.clientHeight }), false)
  assert.equal(
    readH5MessageScrollMetrics({
      event: { currentTarget: { scrollTop: 0, scrollHeight: 0, clientHeight: 0 } },
    }),
    null,
  )
})

test('H5 用户手动查看历史消息后不会被首屏请求强制拉回底部', () => {
	assert.equal(shouldAutoScrollOnChatLoad({ forceScroll: true, atBottom: false, userScrolled: true }), false)
	assert.equal(shouldAutoScrollOnChatLoad({ forceScroll: false, atBottom: true, userScrolled: true }), false)
	assert.equal(shouldAutoScrollOnChatLoad({ forceScroll: true, atBottom: false, userScrolled: false }), true)
})

test('H5 已在底部时隐藏回到最新按钮，离底时才显示', () => {
  assert.equal(shouldShowChatLatestButton({ atBottom: true }), false)
  assert.equal(shouldShowChatLatestButton({ atBottom: false }), true)
})

test('H5 轮询响应前用户离底时不再自动滚回底部', () => {
  assert.equal(shouldStickToBottomAfterChatLoad({
    forceScroll: false,
    requestStartedAtBottom: true,
    atBottom: false,
    userScrolled: true,
  }), false)
  assert.equal(shouldStickToBottomAfterChatLoad({
    forceScroll: false,
    requestStartedAtBottom: true,
    atBottom: true,
    userScrolled: false,
  }), true)
})

test('H5 轮询响应保留请求期间用户移动后的实时历史位置', () => {
  const requestStartState = { scrollTop: 120, scrollHeight: 1400, clientHeight: 500 }
  const liveStateBeforeMutation = { scrollTop: 360, scrollHeight: 1400, clientHeight: 500 }
  const plan = planH5ChatLoadScroll({
    requestStartedAtBottom: shouldStickToBottom({ ...requestStartState, viewportHeight: requestStartState.clientHeight }),
    liveScrollState: liveStateBeforeMutation,
    fallbackAtBottom: false,
    forceScroll: false,
    userScrolled: true,
  })

  assert.equal(plan.shouldAutoScroll, false)
  assert.equal(plan.atBottom, false)
  assert.deepEqual(plan.scrollStateToPreserve, liveStateBeforeMutation)
})

test('H5 请求从底部开始但用户在响应前查看历史时不跳回底部', () => {
  const liveStateBeforeMutation = { scrollTop: 280, scrollHeight: 1400, clientHeight: 500 }
  const plan = planH5ChatLoadScroll({
    requestStartedAtBottom: true,
    liveScrollState: liveStateBeforeMutation,
    fallbackAtBottom: true,
    forceScroll: true,
    userScrolled: false,
  })

  assert.equal(plan.shouldAutoScroll, false)
  assert.deepEqual(plan.scrollStateToPreserve, liveStateBeforeMutation)
})

test('H5 输入交互只在接近底部时跟随最新，非 H5 保留原行为', () => {
  assert.equal(shouldAutoScrollForChatInteraction({ isH5: true, atBottom: false, userScrolled: true }), false)
  assert.equal(shouldAutoScrollForChatInteraction({ isH5: true, atBottom: true, userScrolled: false }), true)
  assert.equal(shouldAutoScrollForChatInteraction({ isH5: false, atBottom: false, userScrolled: true }), true)
})

test('H5 加载在消息变更前读取实时位置并用该位置恢复', () => {
  const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  const load = source.split('async function load({ silent = false } = {}) {')[1].split('async function loadOnlineMembers')[0]
  const liveCaptureIndex = load.indexOf('const liveH5ScrollState = captureH5ScrollState();')
  const mutationIndex = load.indexOf('messages.value = hasLoadedInitialMessages')

  assert.ok(liveCaptureIndex >= 0 && liveCaptureIndex < mutationIndex)
  assert.match(load, /planH5ChatLoadScroll\(\{[\s\S]*liveScrollState: liveH5ScrollState/)
  assert.match(load, /restoreH5ScrollState\(h5ScrollPlan\.scrollStateToPreserve\)/)
  assert.doesNotMatch(load, /restoreH5ScrollState\(preLoadH5ScrollState\)/)
})

test('H5 输入框聚焦和键盘变化不会让历史阅读者跳到最新', () => {
  const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  const interactionGuard = source.split('function shouldFollowLatestOnComposerInteraction() {')[1].split('function handleComposerFocus()')[0]
  const focus = source.split('function handleComposerFocus() {')[1].split('function setKeyboardHeight(event) {')[0]
  const keyboard = source.split('function setKeyboardHeight(event) {')[1].split('function closeLongPressMenu()')[0]

  assert.match(source, /@focus="handleComposerFocus"/)
  assert.match(interactionGuard, /isH5:\s*true/)
  assert.match(interactionGuard, /isH5:\s*false/)
  assert.match(focus, /if \(!shouldFollowLatestOnComposerInteraction\(\)\) return;/)
  assert.match(keyboard, /keyboardHeight\.value && shouldFollowLatestOnComposerInteraction\(\)/)
})

test('发送消息和显式返回最新仍会强制滚动到底部', () => {
  const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  const load = source.split('async function load({ silent = false } = {}) {')[1].split('async function loadOnlineMembers')[0]
  const returnToLatest = source.split('function returnToLatest() {')[1].split('function startPolling()')[0]

  assert.match(load, /const shouldForceAfterSending = forceScrollAfterLoad && forceScrollReason === "send";/)
  assert.match(load, /const shouldAutoScroll = shouldForceAfterSending \|\|/)
  assert.match(returnToLatest, /scrollToLast\(\{ animated: true \}\);/)
})

test('H5 消息节点不能被原生 template 的文档片段包裹', () => {
  const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  const h5Section = source.split('<!-- #ifdef H5 -->')[1].split('<!-- #endif -->')[0]
  assert.doesNotMatch(h5Section, /<template>/)
})

test('H5 滚动状态机会记录用户已离开底部', () => {
  const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  const scrollStateUpdate = source.split('function updateMessageScrollState({ scrollTop, scrollHeight, clientHeight }) {')[1].split('function onH5MessageScroll(event) {')[0]
  assert.match(scrollStateUpdate, /h5UserScrolledAwayFromBottom\.value = !atBottom\.value/)
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
