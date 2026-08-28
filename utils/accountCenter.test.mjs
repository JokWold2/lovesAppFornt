import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getAccountAvatar,
  getAccountEmail,
  getAccountName
} from './accountCenter.js'

test('优先展示资料卡中的本地姓名', () => {
  assert.equal(getAccountName({ native_last_name: '张', native_first_name: '三' }, {}), '张三')
})

test('没有本地姓名时展示英文姓名', () => {
  assert.equal(getAccountName({ en_first_name: 'Alice', en_last_name: 'Lee' }, {}), 'Alice Lee')
})

test('资料卡缺失时回退到登录用户信息', () => {
  assert.equal(getAccountName({}, { displayName: '幸福用户' }), '幸福用户')
  assert.equal(getAccountEmail({}, { email: 'member@example.com' }), 'member@example.com')
})

test('资料头像优先于登录缓存头像', () => {
  assert.equal(
    getAccountAvatar({ avatar_url: 'https://example.com/profile.png' }, { avatarUrl: 'https://example.com/user.png' }),
    'https://example.com/profile.png'
  )
  assert.equal(getAccountAvatar({}, {}), '')
})
