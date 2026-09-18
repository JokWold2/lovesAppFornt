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



test('聊天页按平台向输入栏传递键盘高度', async () => {
  const source = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(source, /:keyboard-height="composerKeyboardHeight"/)
  assert.match(source, /const composerKeyboardHeight = computed\(\(\) => 0\);/)
  assert.match(source, /const composerKeyboardHeight = computed\(\(\) => keyboardHeight\.value\);/)
  assert.match(source, /@keyboard-height="setKeyboardHeight"/)
  assert.match(source, /function setKeyboardHeight\(/)
})

test('开始输入时只在允许跟随最新消息的平台状态滚动到底部', async () => {
  const composer = await readFile(new URL('./ChatComposer.vue', import.meta.url), 'utf8')
  const room = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(composer, /@focus="\$emit\('focus'\)"/)
  assert.match(room, /@focus="handleComposerFocus"/)
  assert.match(room, /function shouldFollowLatestOnComposerInteraction\(\)/)
  assert.match(room, /if \(!shouldFollowLatestOnComposerInteraction\(\)\) return;/)
  assert.match(room, /id="messages-end"/)
  assert.doesNotMatch(room, /:scroll-into-view=/)
  assert.match(room, /keyboardHeight\.value && shouldFollowLatestOnComposerInteraction\(\)/)
  assert.match(room, /scroll-with-animation/)
})

test('群聊消息列表支持分页加载和回到最新按钮', async () => {
  const room = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(room, /@scrolltoupper="loadOlderMessages"/)
  assert.match(room, /v-if="loadingOlder"/)
  assert.match(room, /v-if="latestButtonVisible"/)
  assert.match(room, /class="back-to-latest"/)
  assert.match(room, /class="latest-button-anchor"/)
  assert.match(room, /class="latest-arrow"/)
  assert.doesNotMatch(room, /setTimeout\(hideLatestButton/)
})

test('群聊管理员使用群管理入口，已解散群隐藏输入栏', async () => {
  const source = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(source, /openGroupManage/)
  assert.match(source, /v-if="isGroupMember && groupStatus === 'active'"/)
  assert.match(source, /t\('inbox\.dissolvedNote'\)/)
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
  assert.match(manage, /t\('group\.members'\)/)
  assert.match(members, /MemberPickerSheet/)
  assert.match(members, /removeChatGroupMemberApi/)
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
  assert.match(source, /t\('chat\.readCount'/)
  assert.match(source, /t\('chat\.unread'\)/)
})
