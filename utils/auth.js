import { config } from './config.js'

/**
 * Token / 用户信息 管理
 * 封装 uni.setStorageSync / getStorageSync / removeStorageSync，多端兼容
 */

export function getToken() {
  try {
    return uni.getStorageSync(config.tokenKey) || ''
  } catch (e) {
    return ''
  }
}

export function setToken(token) {
  if (!token) return
  uni.setStorageSync(config.tokenKey, token)
}

export function removeToken() {
  uni.removeStorageSync(config.tokenKey)
}

export function getPresenceSessionId() {
  try {
    return uni.getStorageSync(config.presenceSessionKey) || ''
  } catch (e) {
    return ''
  }
}

export function setPresenceSessionId(sessionId) {
  if (!sessionId) return
  uni.setStorageSync(config.presenceSessionKey, sessionId)
}

export function removePresenceSessionId() {
  uni.removeStorageSync(config.presenceSessionKey)
}

export function getUserInfo() {
  try {
    return uni.getStorageSync(config.userInfoKey) || null
  } catch (e) {
    return null
  }
}

export function setUserInfo(user) {
  if (!user) return
  uni.setStorageSync(config.userInfoKey, user)
}

export function removeUserInfo() {
  uni.removeStorageSync(config.userInfoKey)
}

/**
 * 清空登录态（token + 用户信息 + 记住的账号）
 */
export function clearAuth() {
  removeToken()
  removeUserInfo()
  removePresenceSessionId()
  removeSavedAccount()
}

/**
 * 是否已登录（仅根据本地是否存在 token 判断）
 * 注意：token 实际是否过期需要后端 validate 接口确认。
 */
export function isLoggedIn() {
  return !!getToken()
}

/**
 * 记住的登录邮箱（用于"自动登录"）
 *  - 包含 email + password + remember 开关
 *  - 不存 token：token 有有效期，每次启动重新登录换取新 token
 */
export function getSavedAccount() {
  try {
    return uni.getStorageSync(config.savedAccountKey) || null
  } catch (e) {
    return null
  }
}

export function setSavedAccount(data) {
  if (!data || !data.email) {
    removeSavedAccount()
    return
  }
  const payload = {
    email: data.email,
    password: data.remember ? (data.password || '') : '',
    remember: !!data.remember,
    savedAt: Date.now()
  }
  uni.setStorageSync(config.savedAccountKey, payload)
}

export function removeSavedAccount() {
  uni.removeStorageSync(config.savedAccountKey)
}
