import { config } from './config.js'
import { isLoggedIn, clearAuth } from './auth.js'
import { validateTokenApi } from '@/api/index.js'

/**
 * 路由守卫：基于 uni.interceptor + 手动校验
 *
 * 拦截 uni.navigateTo / redirectTo / reLaunch / switchTab
 * - 如果目标页面在白名单：放行
 * - 如果本地有 token：先调后端 validate 确认 token 还有效
 *      - 有效：放行
 *      - 无效/过期：清空登录态 + 跳登录页（带 redirect）
 * - 如果本地无 token：直接跳登录页（带 redirect）
 */

let installed = false

// 防止多个 navigateTo 触发并发校验导致反复跳登录页
let validating = null  // Promise | null
let lastInvalidated = 0  // 上次清空登录态的时间戳，用于去抖

export function setupRouteGuard() {
  if (installed) return
  installed = true

  // 拦截的目标方法
  const METHODS = ['navigateTo', 'redirectTo', 'reLaunch', 'switchTab']

  METHODS.forEach((method) => {
    uni.addInterceptor(method, {
      invoke(args) {
        const url = args && args.url
        if (!url) return args

        // 白名单直接放行
        if (isWhiteListed(url)) return args

        // 无 token：拦截并跳登录
        if (!isLoggedIn()) {
          uni.showToast({ title: '请先登录', icon: 'none' })
          return {
            url: '/pages/login/login360?redirect=' + encodeURIComponent(url)
          }
        }

        // 有 token：异步校验，校验完成前先"挂起"这次跳转
        ensureTokenValid().then((ok) => {
          if (ok) {
            // 重新发起被拦截的那次跳转
            doNavigate(method, url)
          } else {
            // token 已失效：跳登录页
            if (Date.now() - lastInvalidated > 1000) {
              uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
            }
            uni.reLaunch({
              url: '/pages/login/login360?redirect=' + encodeURIComponent(url)
            })
          }
        })

        // 告诉 uni.request 这次先不执行跳转
        return false
      },
      success() {},
      fail() {}
    })
  })
}

/**
 * 校验本地 token 是否还有效。
 * 多个并发请求会共享同一个 Promise，避免短时间内反复打后端。
 * 返回 Promise<boolean>
 */
export function ensureTokenValid() {
  return true
  if (!isLoggedIn()) return Promise.resolve(false)
  if (validating) return validating
  validating = validateTokenApi()
    .then((res) => !!(res && res.valid))
    .catch(() => false)
    .finally(() => {
      // 释放，让下一次能再校验
      setTimeout(() => { validating = null }, 50)
    })
  return validating
}

/**
 * 重新发起一次被守卫挂起的跳转（被守卫拦截后用）。
 */
function doNavigate(method, url) {
  // switchTab 没有 redirectTo/navigateTo 的差别，按原 method 调即可
  if (method === 'switchTab') {
    return uni.switchTab({ url })
  }
  return uni[method]({ url })
}

/**
 * 是否在白名单
 *  - 精确匹配 config.whiteList 中的路径
 *  - 也支持 "以某个前缀开头" 的写法，配置项以 / 结尾即为前缀
 */
function isWhiteListed(url) {
  if (!url) return false

  // 去掉 query 和 hash
  const path = url.split('?')[0].split('#')[0]

  return config.whiteList.some((rule) => {
    if (rule.endsWith('*')) {
      return path.startsWith(rule.slice(0, -1))
    }
    if (rule.endsWith('/')) {
      return path.startsWith(rule)
    }
    return path === rule
  })
}
