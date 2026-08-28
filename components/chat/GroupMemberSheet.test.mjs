import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('成员 Sheet 展示头像、名称和邮箱', async () => {
  const source = await readFile(new URL('./GroupMemberSheet.vue', import.meta.url), 'utf8')
  assert.match(source, /class="member-avatar"/)
  assert.match(source, /class="member-name"/)
  assert.match(source, /class="member-email"/)
})

test('已读成员 Sheet 在下方展示未读成员统计', async () => {
  const source = await readFile(new URL('./GroupMemberSheet.vue', import.meta.url), 'utf8')
  assert.match(source, /unreadMembers/)
  assert.match(source, /未读成员/)
  assert.match(source, /全部已读/)
})

test('群聊页展示可点击在线人数并打开在线成员 Sheet', async () => {
  const source = await readFile(new URL('../../pages/chat/chatRoom.vue', import.meta.url), 'utf8')
  assert.match(source, /class="online-count"/)
  assert.match(source, /@tap="openOnlineMembers"/)
  assert.match(source, /<GroupMemberSheet/)
  assert.match(source, /:unread-members="memberSheetUnreadMembers"/)
  assert.match(source, /getChatGroupOnlineMembersApi/)
})

test('自己的已读人数可点击查看已读成员', async () => {
  const source = await readFile(new URL('./ChatMessageBubble.vue', import.meta.url), 'utf8')
  assert.match(source, /@tap="emit\('show-read-members', message\)"/)
  assert.match(source, /defineEmits\(\[.*show-read-members.*\]\)/s)
})
