/**
 * 全局配置文件
 */

// 接口环境开关：下面两行只启用一行，切换后在 HBuilderX 停止并重新运行。
// H5 / 微信小程序 / iOS / Android 及上传接口共用，不再根据页面地址覆盖。
// 地址末尾不要加 / 或 /api；正式打包前确认启用线上 HTTPS 地址。
// const API_BASE_URL = 'https://www.lovesapp2026.com' // 线上环境
const API_BASE_URL = 'http://127.0.0.1:3000' // 本地环境（需先启动后端）

// 真机连接本地后端：将本地地址中的 127.0.0.1 改为电脑的局域网 IP，
// 例如 http://192.168.31.61:3000，并确保手机和电脑在同一局域网。
// 切换环境后请退出账号并重新登录，不复用另一环境的登录凭证。

export const config = {
  // 后端 API 基础地址：只在文件顶部切换。
  baseURL: API_BASE_URL,

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
