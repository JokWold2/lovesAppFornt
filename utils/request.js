import { config } from './config.js'
import { getToken, clearAuth } from './auth.js'
import { stopPresence } from './presence.js'

/**
 * 统一的 toast 提示封装，避免页面到处写 uni.showToast
 */
function showToast(title, icon = 'none') {
  uni.showToast({ title, icon, duration: 2000 })
}

/**
 * 退出登录统一入口
 *  - 清空 token / 用户信息
 *  - 关闭所有页面，跳回登录页（reLaunch 保证回到栈底）
 */
let isRedirecting = false
export function logoutAndRedirect(showTip = true) {
  if (isRedirecting) return
  isRedirecting = true
  // The failed credential cannot authorize an explicit offline request.
  stopPresence({ clearSession: true })
  clearAuth()
  if (showTip) showToast('登录已过期，请重新登录', 'none')
  uni.reLaunch({
    url: '/pages/login/login360',
    complete: () => {
      // 跳转结束后放开标记，便于后续可能的再次重定向
      setTimeout(() => { isRedirecting = false }, 500)
    }
  })
}

/**
 * 核心请求函数
 * @param {Object} options
 * @param {string} options.url        接口地址（不含 baseURL，例如 '/api/user/info'）
 * @param {string} [options.method]   GET / POST / PUT / DELETE，默认 GET
 * @param {Object} [options.data]     请求参数
 * @param {Object} [options.header]   额外请求头
 * @param {boolean} [options.noAuth]  true 则不携带 token（用于登录/注册接口）
 * @param {boolean} [options.silent]  true 则不自动 toast 错误
 * @param {boolean} [options.skipAuthRedirect] true 则由调用方处理 401，不自动跳登录页
 * @returns {Promise} resolve(res.data) / reject(err)
 */
export function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    noAuth = false,
    silent = false,
    skipAuthRedirect = false,
    timeout = config.timeout
  } = options || {}

  if (!url) {
    return Promise.reject(new Error('request: url 不能为空'))
  }

  // 拼接完整地址
  const fullURL = /^https?:\/\//i.test(url) ? url : (config.baseURL + url)

  // 组装 header：默认 JSON，带 token
  const reqHeader = {
    'Content-Type': 'application/json;charset=utf-8',
    ...header
  }
  if (!noAuth) {
    const token = getToken()
    if (token) reqHeader.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullURL,
      method,
      data,
      header: reqHeader,
      timeout,
      success: (res) => {
        // noAuth 请求（登录/注册）即使收到 401 也只是业务错误，
        // 不应该触发 logoutAndRedirect 把页面 reLaunch 回登录页
        const isNoAuth = noAuth

        // HTTP 层错误（4xx/5xx）—— 后端是 express，会返回 { error: '...' }
        if (res.statusCode === 401) {
          const msg = (res.data && res.data.error) || '请求失败'
          if (isNoAuth) {
            if (!silent) showToast(msg)
            return reject(res.data || { error: msg })
          }
          if (!silent) showToast('登录已过期')
          if (!skipAuthRedirect) logoutAndRedirect(false)
          return reject(res.data || { error: '未授权' })
        }
        if (res.statusCode >= 400) {
          const msg = (res.data && (res.data.error || res.data.message)) || `请求失败 (${res.statusCode})`
          if (!silent) showToast(msg)
          return reject(res.data || { error: msg })
        }

        // 业务层约定：如果后端返回 { code, data, message }
        if (res.data && typeof res.data === 'object' && 'code' in res.data) {
          if (res.data.code === config.unauthorizedCode) {
            const msg = res.data.message || '请求失败'
            if (isNoAuth) {
              if (!silent) showToast(msg)
              return reject(res.data)
            }
            if (!silent) showToast(msg || '登录已过期')
            if (!skipAuthRedirect) logoutAndRedirect(false)
            return reject(res.data)
          }
          if (res.data.code !== config.successCode) {
            // 业务错误：把后端 message 透传给调用方 + 显示 toast
            const bizMsg = res.data.message || '请求失败'
            if (!silent) showToast(bizMsg)
            return reject(Object.assign({ __bizError: true }, res.data))
          }
          return resolve(res.data.data)
        }

        // 没有业务 code 包装，直接把后端的 data 返回（兼容 { message, token, user } 这种）
        resolve(res.data)
      },
      fail: (err) => {
        if (!silent) showToast('网络异常，请稍后再试')
        reject(err)
      }
    })
  })
}

// 便捷方法
export const get = (url, data, opts = {}) =>
  request({ ...opts, url, method: 'GET', data })

export const post = (url, data, opts = {}) =>
  request({ ...opts, url, method: 'POST', data })

export const put = (url, data, opts = {}) =>
  request({ ...opts, url, method: 'PUT', data })

export const del = (url, data, opts = {}) =>
  request({ ...opts, url, method: 'DELETE', data })

export default request
