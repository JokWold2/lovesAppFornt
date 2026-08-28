import test from 'node:test'
import assert from 'node:assert/strict'
import { onlineMemberLabel, visibleMemberDetails } from './groupMemberSheetState.js'

test('在线人数标签与成员卡展示头像名称邮箱', () => {
  assert.equal(onlineMemberLabel(2), '2 人在线')
  assert.deepEqual(
    visibleMemberDetails({ userId: 1, name: '小王', email: 'wang@example.com', avatarUrl: 'https://example.com/avatar.png' }),
    { userId: 1, name: '小王', email: 'wang@example.com', avatarUrl: 'https://example.com/avatar.png' }
  )
})

test('成员缺少昵称时以邮箱前缀降级', () => {
  assert.deepEqual(
    visibleMemberDetails({ userId: 2, email: 'fallback@example.com' }),
    { userId: 2, name: 'fallback', email: 'fallback@example.com', avatarUrl: '' }
  )
})
