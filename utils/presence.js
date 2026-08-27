import {
  getPresenceSessionId,
  getToken,
  removePresenceSessionId,
  setPresenceSessionId
} from './auth.js'

export const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000

let timer = null
let inFlight = null
let blocked = false
let lifecycleVersion = 0

const defaultTimers = {
  setInterval: (...args) => setInterval(...args),
  clearInterval: (...args) => clearInterval(...args)
}

let dependencies = {
  heartbeatPresenceApi: () => Promise.reject(new Error('Presence heartbeat API is not configured')),
  offlinePresenceApi: () => Promise.reject(new Error('Presence offline API is not configured')),
  timers: defaultTimers
}

function createUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function getOrCreatePresenceSessionId() {
  const existingSessionId = getPresenceSessionId()
  if (existingSessionId) return existingSessionId

  const sessionId = createUuid()
  setPresenceSessionId(sessionId)
  return sessionId
}

function sendHeartbeat() {
  if (!getToken() || blocked) return Promise.resolve(null)
  if (inFlight) return inFlight

  const clientSessionId = getOrCreatePresenceSessionId()
  inFlight = Promise.resolve()
    .then(() => dependencies.heartbeatPresenceApi({ clientSessionId }))
    .then((result) => {
      if (result?.stale === true) {
        blocked = true
        pausePresence()
      }
      return result
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

export function startPresence() {
  if (!getToken() || blocked) return Promise.resolve(null)

  const startVersion = lifecycleVersion
  return sendHeartbeat().then((result) => {
    if (startVersion === lifecycleVersion && !timer && !blocked && getToken()) {
      timer = dependencies.timers.setInterval(() => { void sendHeartbeat() }, HEARTBEAT_INTERVAL_MS)
    }
    return result
  })
}

export function pausePresence() {
  lifecycleVersion += 1
  if (timer) dependencies.timers.clearInterval(timer)
  timer = null
}

export function stopPresence({ clearSession = false } = {}) {
  pausePresence()
  blocked = false
  if (clearSession) removePresenceSessionId()
}

export async function logoutPresence() {
  try {
    if (getToken()) await dependencies.offlinePresenceApi()
  } catch (error) {
    // Offline is best-effort. Local logout must always finish.
  } finally {
    stopPresence({ clearSession: true })
  }
}

export function isPresenceBlocked() {
  return blocked
}

export function configurePresenceApiMethods({ heartbeatPresenceApi, offlinePresenceApi } = {}) {
  if (heartbeatPresenceApi) dependencies.heartbeatPresenceApi = heartbeatPresenceApi
  if (offlinePresenceApi) dependencies.offlinePresenceApi = offlinePresenceApi
}

export function configurePresenceForTests({ heartbeatPresenceApi, offlinePresenceApi, timers } = {}) {
  configurePresenceApiMethods({ heartbeatPresenceApi, offlinePresenceApi })
  if (timers) dependencies.timers = timers
}

export function resetPresenceForTests() {
  pausePresence()
  inFlight = null
  blocked = false
}
