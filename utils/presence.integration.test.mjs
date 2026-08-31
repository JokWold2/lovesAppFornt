import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readScript(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  const script = source.match(/<script(?: setup)?>([\s\S]*?)<\/script>/)?.[1]
  if (!script) throw new Error(`${relativePath} script was not found`)
  return script
}

function createRef(value) {
  return { value }
}

function createComputed(getter) {
  return { get value() { return getter() } }
}

function appPlusScript(script) {
  return script
    .replace(/^\s*\/\/ #ifndef APP-PLUS\s*$[\s\S]*?^\s*\/\/ #endif\s*$/m, '')
    .replace(/^\s*\/\/ #ifdef APP-PLUS\s*$/gm, '')
    .replace(/^\s*\/\/ #endif\s*$/gm, '')
}

async function loadLogin360(dependencies) {
  const script = appPlusScript(await readScript('../pages/login/login360.vue'))
    .replace(/^\s*import .*;\s*$/gm, '')
  const createLogin = new Function(
    'ref', 'reactive', 'computed', 'onMounted', 'loginApi', 'registerApi', 'socialLoginApi',
    'setToken', 'setUserInfo', 'getUserInfo', 'registerCurrentDevice', 'signInWithGoogle',
    'getOrCreatePresenceSessionId', 'startPresence', 'uni', 'getCurrentPages', 'getApp', 'watch', 'currentLocale', 't', 'bootstrapLocale',
    `${script}\nreturn { agreePrivacy, handleGoogleLogin, handleLogin, loginForm }`
  )
  return createLogin(
    createRef,
    (value) => value,
    createComputed,
    () => {},
    dependencies.loginApi,
    async () => {},
    dependencies.socialLoginApi,
    dependencies.setToken,
    () => {},
    () => null,
    () => {},
    dependencies.signInWithGoogle,
    dependencies.getOrCreatePresenceSessionId,
    dependencies.startPresence,
    { navigateBack() {}, reLaunch() {}, showModal() {}, showToast() {}, switchTab() {} },
    () => [],
    () => ({ globalData: {} }),
    () => {},
    { value: 'en' },
    () => 'Login',
    () => Promise.resolve()
  )
}

async function loadAppWithPresence() {
  const storage = { AUTH_TOKEN: 'jwt' }
  const presence = { startCalls: 0, pauseCalls: 0, resumeCalls: 0 }
  const script = (await readScript('../App.vue'))
    .replace(/^\s*import .*$/gm, '')
    .replace('export default', 'return')
  const createApp = new Function(
    'validateTokenApi', 'getToken', 'getUserInfo', 'removeToken', 'removeUserInfo', 'setUserInfo',
    'refreshUnreadBadge', 'startUnreadBadgePolling', 'stopUnreadBadgePolling',
    'installPushListeners', 'registerCurrentDevice', 'configurePresenceApiMethods', 'startPresence',
    'pausePresence', 'resumePresence', 'stopPresence', 'heartbeatPresenceApi', 'offlinePresenceApi', 'uni', 'bootstrapLocale', script
  )
  const app = createApp(
    async () => ({ valid: true, user: { id: 1 } }),
    () => storage.AUTH_TOKEN,
    () => null,
    () => { delete storage.AUTH_TOKEN },
    () => {},
    () => {},
    () => {}, () => {}, () => {}, () => {}, () => {},
    () => {},
    () => { presence.startCalls += 1; return Promise.resolve() },
    () => { presence.pauseCalls += 1 },
    () => { presence.resumeCalls += 1 },
    () => {},
    () => Promise.resolve(), () => Promise.resolve(),
    { $emit() {}, reLaunch() {}, switchTab() {} },
    () => Promise.resolve()
  )
  return { app, presence }
}

async function loadAccountSessionFinish(dependencies) {
  const script = await readScript('../pages/account/accountCenter.vue')
  const handler = script.match(/async function finishSession\(message\) \{[\s\S]*?\n\}/)?.[0]
  if (!handler) throw new Error('accountCenter.vue finishSession was not found')
  const createHandler = new Function(
    'logoutPresence', 'unregisterCurrentDevice', 'clearAuth', 'uni', 'setTimeout',
    `${handler}\nreturn finishSession`
  )
  return createHandler(
    dependencies.logoutPresence,
    dependencies.unregisterCurrentDevice,
    dependencies.clearAuth,
    dependencies.uni,
    dependencies.setTimeout
  )
}

function createTimers() {
  const intervals = []
  const cleared = []
  return {
    intervals,
    cleared,
    setInterval(callback, delay) {
      const timer = { callback, delay }
      intervals.push(timer)
      return timer
    },
    clearInterval(timer) { cleared.push(timer) }
  }
}

async function loadRequestWithPresence() {
  const storage = { AUTH_TOKEN: 'jwt', PRESENCE_SESSION_ID: 'session-a' }
  const timers = createTimers()
  const offline = { calls: 0 }
  globalThis.uni = {
    getStorageSync(key) { return storage[key] },
    removeStorageSync(key) { delete storage[key] },
    setStorageSync(key, value) { storage[key] = value }
  }
  const presence = await import('./presence.js')
  presence.configurePresenceForTests({
    heartbeatPresenceApi: async () => ({ started: true }),
    offlinePresenceApi: async () => { offline.calls += 1 },
    timers
  })
  presence.resetPresenceForTests()
  await presence.startPresence()
  const redirects = []
  globalThis.uni = {
    getStorageSync(key) { return storage[key] },
    removeStorageSync(key) { delete storage[key] },
    request(options) {
      options.success({ statusCode: 401, data: { error: 'expired' } })
    },
    reLaunch(options) { redirects.push(options) },
    showToast() {}
  }
  const request = await import('./request.js')
  return { offline, presence, redirects, request, storage, timers }
}

test('email login creates a session, sends it, saves the token, then starts presence', async () => {
  const events = []
  const login = await loadLogin360({
    getOrCreatePresenceSessionId() { events.push(['session']); return 'session-email' },
    loginApi(email, password, options) {
      events.push(['email-api', email, password, options])
      return Promise.resolve({ token: 'email-jwt', user: { id: 1 } })
    },
    socialLoginApi() { throw new Error('not used') },
    setToken(token) { events.push(['set-token', token]) },
    signInWithGoogle() { throw new Error('not used') },
    startPresence() { events.push(['start-presence']); return Promise.resolve() }
  })
  login.loginForm.email = 'a@example.com'
  login.loginForm.password = 'password'
  login.agreePrivacy.value = true

  await login.handleLogin()

  assert.deepEqual(events, [
    ['session'],
    ['email-api', 'a@example.com', 'password', { clientSessionId: 'session-email' }],
    ['set-token', 'email-jwt'],
    ['start-presence']
  ])
})

test('Google login creates a session, sends it, saves the token, then starts presence', async () => {
  const events = []
  const login = await loadLogin360({
    getOrCreatePresenceSessionId() { events.push(['session']); return 'session-google' },
    loginApi() { throw new Error('not used') },
    socialLoginApi(provider, authResult, options) {
      events.push(['google-api', provider, authResult, options])
      return Promise.resolve({ token: 'google-jwt', user: { id: 2 } })
    },
    setToken(token) { events.push(['set-token', token]) },
    signInWithGoogle() { events.push(['native-google']); return Promise.resolve({ idToken: 'id-token' }) },
    startPresence() { events.push(['start-presence']); return Promise.resolve() }
  })
  login.agreePrivacy.value = true

  await login.handleGoogleLogin()

  assert.deepEqual(events, [
    ['native-google'],
    ['session'],
    ['google-api', 'google', { idToken: 'id-token' }, { clientSessionId: 'session-google' }],
    ['set-token', 'google-jwt'],
    ['start-presence']
  ])
})

test('App onShow restarts presence after a validated restored session', async () => {
  const { app, presence } = await loadAppWithPresence()

  await app.onLaunch()
  app.onShow()

  assert.equal(presence.startCalls, 2)
  assert.equal(presence.resumeCalls, 1)
})

test('a request 401 clears the active presence session without calling offline', async () => {
  const { offline, redirects, request, storage, timers } = await loadRequestWithPresence()

  await assert.rejects(request.request({ url: '/api/protected' }))

  assert.equal(offline.calls, 0)
  assert.equal(storage.AUTH_TOKEN, undefined)
  assert.equal(storage.PRESENCE_SESSION_ID, undefined)
  assert.deepEqual(timers.cleared, [timers.intervals[0]])
  assert.equal(redirects.length, 1)
})

test('account session exit awaits presence offline before device and auth cleanup', async () => {
  let token = 'jwt'
  let settlePresence
  const events = []
  const finishSession = await loadAccountSessionFinish({
    logoutPresence() {
      events.push(['offline-attempt', token])
      return new Promise((resolve) => { settlePresence = resolve })
    },
    unregisterCurrentDevice() { events.push(['unregister-device']) },
    clearAuth() { events.push(['clear-auth']); token = '' },
    uni: {
      showToast() { events.push(['toast']) },
      reLaunch() { events.push(['redirect']) }
    },
    setTimeout(callback) { callback() }
  })

  const logout = finishSession('已退出登录')
  await Promise.resolve()
  assert.deepEqual(events, [['offline-attempt', 'jwt']])
  settlePresence()
  await logout

  assert.deepEqual(events, [
    ['offline-attempt', 'jwt'],
    ['unregister-device'],
    ['clear-auth'],
    ['toast'],
    ['redirect']
  ])
})
