import test from 'node:test'
import assert from 'node:assert/strict'

import {
  facebookLoginScopes,
  facebookPhotoImportScopes,
  normalizeFacebookLoginResult
} from './socialAuth.js'

test('普通 Facebook 登录只请求身份和邮箱，不请求相册权限', () => {
  assert.equal(facebookLoginScopes(), 'public_profile,email')
  assert.equal(facebookLoginScopes().includes('user_photos'), false)
})

test('Facebook 相册导入在单独操作中才请求 user_photos', () => {
  assert.equal(facebookPhotoImportScopes(), 'public_profile,email,user_photos')
})

test('Facebook SDK 返回值只向调用方暴露短期 access token', () => {
  assert.deepEqual(
    normalizeFacebookLoginResult({ authResponse: { accessToken: 'short-lived-token', userID: 'ignored' } }),
    { accessToken: 'short-lived-token' }
  )
})

test('Facebook SDK 未返回 access token 时拒绝登录', () => {
  assert.throws(() => normalizeFacebookLoginResult({ authResponse: {} }), /未返回可验证的 Facebook 授权令牌/)
})
