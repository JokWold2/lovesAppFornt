import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function loadApi() {
  const calls = []
  globalThis.uni = {
    getStorageSync() { return '' },
    request(options) {
      calls.push(options)
      options.success({ statusCode: 200, data: { token: 'jwt' } })
    },
    showToast() {}
  }

  const api = await import('../api/index.js')
  return { ...api, post: { calls } }
}

async function loadAppWithPresence({ token = 'jwt', valid = true } = {}) {
  const storage = token ? { AUTH_TOKEN: token } : {}
  const presence = {
    configureCalls: [],
    startCalls: 0,
    pauseCalls: 0,
    stopCalls: [],
    configurePresenceApiMethods(methods) { this.configureCalls.push(methods) },
    startPresence() { this.startCalls += 1; return Promise.resolve() },
    pausePresence() { this.pauseCalls += 1 },
    stopPresence(options) { this.stopCalls.push(options) }
  }
  const uni = {
    $emit() {},
    switchTab() {},
    reLaunch() {}
  }
  const source = await readFile(new URL('../App.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1]
  if (!script) throw new Error('App.vue script was not found')
  const executable = script
    .replace(/^\s*import .*$/gm, '')
    .replace('export default', 'return')
  const createApp = new Function(
    'validateTokenApi', 'getToken', 'getUserInfo', 'removeToken', 'removeUserInfo', 'setUserInfo',
    'refreshUnreadBadge', 'startUnreadBadgePolling', 'stopUnreadBadgePolling',
    'installPushListeners', 'registerCurrentDevice', 'configurePresenceApiMethods', 'startPresence',
    'pausePresence', 'stopPresence', 'heartbeatPresenceApi', 'offlinePresenceApi', 'uni', executable
  )
  const app = createApp(
    async () => valid ? { valid: true, user: { id: 1 } } : { valid: false },
    () => storage.AUTH_TOKEN || '',
    () => storage.USER_INFO || null,
    () => { delete storage.AUTH_TOKEN },
    () => { delete storage.USER_INFO },
    (user) => { storage.USER_INFO = user },
    () => {}, () => {}, () => {}, () => {}, () => {},
    presence.configurePresenceApiMethods.bind(presence),
    presence.startPresence.bind(presence),
    presence.pausePresence.bind(presence),
    presence.stopPresence.bind(presence),
    () => Promise.resolve(), () => Promise.resolve(), uni
  )

  return { app, presence, storage }
}

function createTimers() {
  const intervals = []
  const cleared = []
  return {
    intervals,
    cleared,
    setInterval(callback, delay) {
      const handle = { callback, delay }
      intervals.push(handle)
      return handle
    },
    clearInterval(handle) {
      cleared.push(handle)
    }
  }
}

async function loadPresence({ token = '', sessionId } = {}) {
  const storage = {}
  if (token) storage.AUTH_TOKEN = token
  if (sessionId) storage.PRESENCE_SESSION_ID = sessionId

  globalThis.uni = {
    getStorageSync(key) { return storage[key] },
    setStorageSync(key, value) { storage[key] = value },
    removeStorageSync(key) { delete storage[key] }
  }

  const heartbeat = {
    calls: [],
    result: { started: true },
    async send(payload) {
      this.calls.push(payload)
      return this.result
    }
  }
  const offline = {
    calls: 0,
    error: null,
    async send() {
      this.calls += 1
      if (this.error) throw this.error
    }
  }
  const timers = createTimers()
  const presence = await import('./presence.js')
  presence.configurePresenceForTests({
    heartbeatPresenceApi: heartbeat.send.bind(heartbeat),
    offlinePresenceApi: offline.send.bind(offline),
    timers
  })
  presence.resetPresenceForTests()

  return { presence, heartbeat, offline, storage, timers }
}

test('creates one persistent session ID and reuses it for restored users', async () => {
  const { presence, storage } = await loadPresence({ token: 'jwt' })

  const first = presence.getOrCreatePresenceSessionId()

  assert.match(first, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/)
  assert.equal(presence.getOrCreatePresenceSessionId(), first)
  assert.equal(storage.PRESENCE_SESSION_ID, first)
})

test('sends immediately, schedules five minutes, pauses on hide, and restarts on show', async () => {
  const { presence, heartbeat, timers } = await loadPresence({ token: 'jwt' })

  await presence.startPresence()

  assert.deepEqual(heartbeat.calls, [{ clientSessionId: presence.getOrCreatePresenceSessionId() }])
  assert.equal(timers.intervals.length, 1)
  assert.equal(timers.intervals[0].delay, 5 * 60 * 1000)
  presence.pausePresence()
  assert.equal(timers.cleared.includes(timers.intervals[0]), true)

  presence.resumePresence()
  await presence.startPresence()
  assert.equal(heartbeat.calls.length, 2)
  assert.equal(timers.intervals.length, 2)
})

test('does not start from a backgrounded restoration until foreground is restored', async () => {
  const { presence, heartbeat, timers } = await loadPresence({ token: 'jwt' })

  const restoring = presence.startPresence()
  presence.pausePresence()
  await restoring

  assert.equal(heartbeat.calls.length, 0)
  assert.equal(timers.intervals.length, 0)

  presence.resumePresence()
  await presence.startPresence()
  assert.equal(heartbeat.calls.length, 1)
  assert.equal(timers.intervals.length, 1)
})

test('stale stops future heartbeats but explicit logout clears session even if offline fails', async () => {
  const { presence, heartbeat, offline, storage, timers } = await loadPresence({ token: 'jwt' })
  heartbeat.result = { started: false, stale: true }

  await presence.startPresence()

  assert.equal(presence.isPresenceBlocked(), true)
  assert.equal(timers.intervals.length, 0)
  offline.error = new Error('network')
  await presence.logoutPresence()
  assert.equal(offline.calls, 1)
  assert.equal(storage.PRESENCE_SESSION_ID, undefined)
})

test('shares an in-flight heartbeat and does not start for missing tokens', async () => {
  const { presence, heartbeat, timers } = await loadPresence()
  await presence.startPresence()
  assert.equal(heartbeat.calls.length, 0)

  globalThis.uni.setStorageSync('AUTH_TOKEN', 'jwt')
  let release
  heartbeat.send = async (payload) => {
    heartbeat.calls.push(payload)
    await new Promise((resolve) => { release = resolve })
    return { started: true }
  }
  presence.configurePresenceForTests({ heartbeatPresenceApi: heartbeat.send.bind(heartbeat), timers })
  const first = presence.startPresence()
  const second = presence.startPresence()
  await Promise.resolve()
  release()
  await Promise.all([first, second])
  assert.equal(heartbeat.calls.length, 1)
})

test('logout clears its timer before offline settles and prevents a racing interval heartbeat', async () => {
  const { presence, heartbeat, offline, timers } = await loadPresence({ token: 'jwt' })
  await presence.startPresence()
  let settleOffline
  offline.send = () => new Promise((resolve) => { settleOffline = resolve })
  presence.configurePresenceForTests({ offlinePresenceApi: offline.send.bind(offline), timers })

  const logout = presence.logoutPresence()
  timers.intervals[0].callback()
  await Promise.resolve()

  assert.equal(timers.cleared.includes(timers.intervals[0]), true)
  assert.equal(heartbeat.calls.length, 1)
  settleOffline()
  await logout
})

test('stopping invalidates an older heartbeat before a fast new presence start', async () => {
  const { presence, heartbeat, timers } = await loadPresence({ token: 'jwt' })
  const pending = []
  heartbeat.send = (payload) => new Promise((resolve) => {
    heartbeat.calls.push(payload)
    pending.push(resolve)
  })
  presence.configurePresenceForTests({ heartbeatPresenceApi: heartbeat.send.bind(heartbeat), timers })

  const oldStart = presence.startPresence()
  await Promise.resolve()
  presence.stopPresence({ clearSession: true })
  const newStart = presence.startPresence()
  await Promise.resolve()

  assert.equal(heartbeat.calls.length, 2)
  pending[0]({ started: false, stale: true })
  await oldStart
  assert.equal(presence.isPresenceBlocked(), false)
  pending[1]({ started: true })
  await newStart
})

test('login API includes clientSessionId for email and Google requests', async () => {
  const { loginApi, socialLoginApi, post } = await loadApi()

  await loginApi('a@example.com', 'password', { clientSessionId: 'session-a' })
  await socialLoginApi('google', { idToken: 'id-token' }, { clientSessionId: 'session-a' })

  assert.deepEqual(post.calls[0].data, {
    email: 'a@example.com',
    password: 'password',
    clientSessionId: 'session-a'
  })
  assert.deepEqual(post.calls[1].data, {
    provider: 'google',
    authResult: { idToken: 'id-token' },
    clientSessionId: 'session-a'
  })
})

test('a restored valid Token starts presence and hide only pauses it', async () => {
  const { app, presence } = await loadAppWithPresence()

  await app.onLaunch()
  app.onHide()

  assert.equal(presence.configureCalls.length, 1)
  assert.equal(presence.startCalls, 1)
  assert.equal(presence.pauseCalls, 1)
})

test('an invalid restored Token clears presence without an offline call', async () => {
  const { app, presence, storage } = await loadAppWithPresence({ valid: false })

  await app.onLaunch()

  assert.deepEqual(presence.stopCalls, [{ clearSession: true }])
  assert.equal(storage.AUTH_TOKEN, undefined)
})
