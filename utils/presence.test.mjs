import test from 'node:test'
import assert from 'node:assert/strict'

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
  assert.deepEqual(timers.cleared, [timers.intervals[0]])

  await presence.startPresence()
  assert.equal(heartbeat.calls.length, 2)
  assert.equal(timers.intervals.length, 2)
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
