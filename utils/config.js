/**
 * 全局配置文件
 */

// 后端服务端口（本地开发后端默认监听 3000）
const API_PORT = 3000

/**
 * 解析后端 API 基础地址
 *  - H5（浏览器）：跟随当前页面主机名
 *      · 用 localhost / 127.0.0.1 / 内网 IP 打开 → 直连同主机的 3000 端口，换 Wi‑Fi 也不用改代码
 *      · 用正式域名打开 → 返回 ''（同源），交给 Nginx 反代，避免 HTTPS 页面请求 HTTP 接口被拦截
 *  - App / 小程序：真机调试走本机局域网 IP（手机需与电脑连接同一个 Wi‑Fi）
 */function resolveBaseURL() {
  // #ifdef H5
  const hostname = window.location.hostname
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)
  return isLocalHost ? `http://${hostname}:${API_PORT}` : ''
  // #endif

  // #ifndef H5
  // 自动获取本机局域网 IP（无需换 Wi‑Fi 后手动改）
  const os = uni.getSystemInfoSync()
  const net = os.networkList || []
  const wifi = net.find((n) => n.type === 'wifi' && n.active && n.ip && !n.ip.startsWith('169.254'))
  const LAN_HOST = wifi ? wifi.ip : 'localhost'
  return `http://${LAN_HOST}:${API_PORT}`
  // #endif
}

export const config = {
  // 后端 API 基础地址
  //  - H5 正式部署取同源（空串 → 相对路径）
  //  - 本地调试 / 真机调试由文件末尾的 resolveBaseURL() 自动覆盖为可直连地址
  baseURL: '',

  // 请求超时时间（毫秒）
  timeout: 10000,

  // 不需要登录态即可访问的页面路径（用于路由守卫白名单）
  // 同时支持精确匹配和 "/*" 前缀匹配
  whiteList: [
    '/pages/login/login',
    '/pages/login/login360',
    '/pages/legal/userAgreement',
    '/pages/legal/privacyPolicy',
    '/pages/legal/dataDeletion'
  ],

  // 后端约定的业务状态码：成功
  successCode: 0,
  // 后端约定的业务状态码：未登录 / token 过期
  unauthorizedCode: 401,

  // Token 在本地存储中的 key
  tokenKey: 'AUTH_TOKEN',
  // 用户信息在本地存储中的 key
  userInfoKey: 'USER_INFO',
  // 当前设备的在线会话标识；与 Token 分开保存，供在线心跳复用
  presenceSessionKey: 'PRESENCE_SESSION_ID',
  // 记住的登录账号（用于自动登录）
  savedAccountKey: 'SAVED_LOGIN_ACCOUNT'
}

// 本地 / 真机调试：自动切换为可直连的后端地址（正式域名访问时保持同源空串）
const resolvedBaseURL = resolveBaseURL()
if (resolvedBaseURL) config.baseURL = resolvedBaseURL
