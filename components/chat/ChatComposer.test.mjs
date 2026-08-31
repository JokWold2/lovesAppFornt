import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('群聊输入栏使用图片表情图标且不让 textarea 自动顶起页面', async () => {
  const source = await readFile(new URL('./ChatComposer.vue', import.meta.url), 'utf8')
  assert.match(source, /src="\/static\/img\/icon-emoji-dark\.png"/)
  assert.match(source, /:adjust-position="false"/)
  assert.match(source, /:show-confirm-bar="false"/)
  assert.ok(source.indexOf('icon-emoji-dark.png') > source.indexOf('class="draft"'))
})

test('群聊输入栏只保留现有的表情和图片操作', async () => {
  const source = await readFile(new URL('./ChatComposer.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /class="apps-icon"/)
  assert.doesNotMatch(source, /icon-voice-message-dark\.png/)
  assert.match(source, /icon-emoji-dark\.png/)
  assert.match(source, /icon-create-post-dark\.png/)
})

test('群聊输入栏保持紧凑并放大表情和图片图标', async () => {
  const source = await readFile(new URL('./ChatComposer.vue', import.meta.url), 'utf8')
  assert.match(source, /min-height: 72rpx/)
  assert.match(source, /padding: 8rpx 20rpx/)
  assert.match(source, /width:\s*68rpx;\s*height:\s*68rpx/)
})

test('聊天页按平台向输入栏传递键盘高度', async () => {
  const source = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(source, /:keyboard-height="composerKeyboardHeight"/)
  assert.match(source, /const composerKeyboardHeight = computed\(\(\) => 0\);/)
  assert.match(source, /const composerKeyboardHeight = computed\(\(\) => keyboardHeight\.value\);/)
  assert.match(source, /@keyboard-height="setKeyboardHeight"/)
  assert.match(source, /function setKeyboardHeight\(/)
})

test('开始输入时聊天列表会滚动到末尾，避免键盘遮住新消息', async () => {
  const composer = await readFile(new URL('./ChatComposer.vue', import.meta.url), 'utf8')
  const room = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(composer, /@focus="\$emit\('focus'\)"/)
  assert.match(room, /@focus="scrollToLast"/)
  assert.match(room, /id="messages-end"/)
  assert.match(room, /scrollIntoView\.value = "messages-end"/)
  assert.match(room, /if \(keyboardHeight\.value\) nextTick\(\(\) => scrollToLast/)
  assert.match(room, /scroll-with-animation/)
})

test('群聊消息列表支持分页加载和回到最新按钮', async () => {
  const room = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(room, /@scrolltoupper="loadOlderMessages"/)
  assert.match(room, /v-if="loadingOlder"/)
  assert.match(room, /v-if="latestButtonVisible"/)
  assert.match(room, /class="back-to-latest"/)
  assert.match(room, /setTimeout\(hideLatestButton, 3000\)/)
  assert.match(room, /scrollToLast\(\{ animated: hasLoadedInitialMessages \}\)/)
  assert.match(room, /class="latest-chevron"/)
  assert.match(room, /left: 50%/)
  assert.match(room, /translate\(-50%, 72rpx\)/)
})

test('群聊管理员使用群管理入口，已解散群隐藏输入栏', async () => {
  const source = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(source, /openGroupManage/)
  assert.match(source, /v-if="isGroupMember && groupStatus === 'active'"/)
  assert.match(source, /该群已解散，仅可查看历史消息/)
  assert.match(source, /<GroupAvatar/)
  assert.doesNotMatch(source, /room-head"\s*\n\s*>/)
})

test('群管理页提供资料修改、成员管理与解散入口', async () => {
  const [manage, members] = await Promise.all([
    readFile(new URL('../../pages/chat/groupManage.vue', import.meta.url), 'utf8'),
    readFile(new URL('../../pages/chat/groupMembers.vue', import.meta.url), 'utf8')
  ])
  assert.match(manage, /uploadChatGroupAvatar/)
  assert.match(manage, /dissolveChatGroupApi/)
  assert.match(manage, /群成员/)
  assert.match(members, /MemberPickerSheet/)
  assert.match(members, /removeChatGroupMemberApi/)
})

test('群管理页将解散操作展示为独立粉色按钮', async () => {
  const source = await readFile(new URL('../../pages/chat/groupManage.vue', import.meta.url), 'utf8')
  assert.match(source, /class="dissolve-button"/)
  assert.match(source, /\.dissolve-button\{[^}]*background:#ffeef1;[^}]*color:#fe385c/)
  assert.match(source, /\.status-on\{color:#6fba88/)
})

test('群成员页将管理员展示为粉色圆角标签，并使用指定移出颜色', async () => {
  const source = await readFile(new URL('../../pages/chat/groupMembers.vue', import.meta.url), 'utf8')
  assert.match(source, /\.admin-tag\{display:inline-flex;[^}]*border-radius:12rpx;[^}]*background:#ffeef1;[^}]*color:#fe385c/)
  assert.match(source, /\.remove\{[^}]*color:#fe0039/)
})

test('二手市场内容详情使用拆分后的评论图标', async () => {
  const source = await readFile(new URL('../../pages/market/marketFeed.vue', import.meta.url), 'utf8')
  assert.match(source, /src="\/static\/img\/icon-comment\.png"/)
})

test('群聊页面禁用页面滚动以让键盘只压缩消息区域', async () => {
  const source = await readFile(new URL('../../pages.json', import.meta.url), 'utf8')
  assert.match(source, /"path":\s*"pages\/chat\/chatRoom"[\s\S]*?"disableScroll":\s*true/)
})

test('自己发送的消息展示已读成员头像和人数，未读时展示未读文案', async () => {
  const source = await readFile(new URL('./ChatMessageBubble.vue', import.meta.url), 'utf8')
  assert.match(source, /v-if="message\.readCount"/)
  assert.match(source, /class="read-avatar"/)
  assert.match(source, /人已读/)
  assert.match(source, /v-else>未读<\/text>/)
})
