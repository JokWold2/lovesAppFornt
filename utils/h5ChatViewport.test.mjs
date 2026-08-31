import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../pages/chat/chatRoom.vue', import.meta.url), 'utf8')

test('H5 群聊只有一个可滚动的消息容器，且输入栏位于其后', () => {
  assert.match(source, /<view class="page app-h5-screen">/)
  assert.match(source, /<view ref="h5MessagesRef" class="messages messages--h5 app-h5-scroll" @scroll="onH5MessageScroll">/)
  assert.doesNotMatch(source, /addEventListener\(['"]scroll['"]/)

  const h5ScrollHandler = source.split('function onH5MessageScroll(event) {')[1].split('function showLatestButton()')[0]
  assert.match(h5ScrollHandler, /event\?\.currentTarget \|\| event\?\.target \|\| h5MessagesRef\.value/)
  assert.doesNotMatch(h5ScrollHandler, /isTrusted|hasUserTriggeredH5Scroll|isBlockingProgrammaticH5Scroll/)

  const scrollStateUpdate = source.split('function updateMessageScrollState({ scrollTop, scrollHeight, clientHeight }) {')[1].split('function onH5MessageScroll(event) {')[0]
  assert.match(scrollStateUpdate, /shouldShowChatLatestButton\(\{ atBottom: atBottom\.value \}\)/)
  assert.doesNotMatch(scrollStateUpdate, /scrollTop > 120/)

  const h5MessagesStart = source.indexOf('<view ref="h5MessagesRef"')
  const h5MessagesEnd = source.indexOf('</view>\n\t\t<!-- #endif -->', h5MessagesStart)
  const composerStart = source.indexOf('<ChatComposer')
  assert.ok(h5MessagesStart >= 0 && h5MessagesEnd > h5MessagesStart)
  assert.ok(composerStart > h5MessagesEnd)
})

test('非 H5 消息滚动与键盘补偿仍由原生 scroll-view 负责', () => {
  assert.match(source, /<scroll-view/)
  assert.match(source, /@scrolltoupper="loadOlderMessages"/)
  assert.match(source, /:scroll-top="scrollTop"/)
  assert.match(source, /:keyboard-height="composerKeyboardHeight"/)
  assert.match(source, /const composerKeyboardHeight = computed\(\(\) => 0\);/)
  assert.match(source, /const composerKeyboardHeight = computed\(\(\) => keyboardHeight\.value\);/)
})
