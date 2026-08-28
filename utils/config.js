/**
 * 全局配置文件
 */

export const config = {
  // 后端 API 基础地址
  // 局域网真机测试：Android 手机需与本机连接同一个 Wi‑Fi。
  // 部署线上后恢复为正式 API 域名，不能保留局域网地址。
  //   baseURL: 'http://192.168.31.61:3000',
  // 后端 API 基础地址
  // baseURL: 'http://localhost:3000',
  baseURL: 'http://8.218.94.132',

  // 请求超时时间（毫秒）
  timeout: 10000,

  // 不需要登录态即可访问的页面路径（用于路由守卫白名单）
  // 同时支持精确匹配和 "/*" 前缀匹配
  whiteList: [
    '/pages/login/login',
    '/pages/login/login360',
    '/pages/legal/userAgreement',
    '/pages/legal/privacyPolicy'
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
