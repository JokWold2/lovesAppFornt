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
let heartbeatVersion = 0
let foreground = true
let active = false

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
  if (!getToken() || blocked || !foreground || !active) return Promise.resolve(null)
  if (inFlight) return inFlight

  const clientSessionId = getOrCreatePresenceSessionId()
  const requestVersion = heartbeatVersion
  const heartbeat = Promise.resolve()
    .then(() => {
      if (requestVersion !== heartbeatVersion || !getToken() || !foreground || !active) return null
      return dependencies.heartbeatPresenceApi({ clientSessionId })
    })
    .then((result) => {
      if (result?.stale === true && requestVersion === heartbeatVersion) {
        blocked = true
        clearTimer()
      }
      return result
    })
    .catch(() => null)
    .finally(() => {
      if (inFlight === heartbeat) inFlight = null
    })

  inFlight = heartbeat
  return heartbeat
}

export function startPresence() {
  if (!getToken() || blocked || !foreground) return Promise.resolve(null)
  active = true

  const startVersion = lifecycleVersion
  return sendHeartbeat().then((result) => {
    if (startVersion === lifecycleVersion && !timer && !blocked && foreground && active && getToken()) {
      timer = dependencies.timers.setInterval(() => { void sendHeartbeat() }, HEARTBEAT_INTERVAL_MS)
    }
    return result
  })
}

function clearTimer() {
  if (timer) dependencies.timers.clearInterval(timer)
  timer = null
}

export function pausePresence() {
  lifecycleVersion += 1
  foreground = false
  clearTimer()
}

export function resumePresence() {
  foreground = true
}

export function stopPresence({ clearSession = false } = {}) {
  lifecycleVersion += 1
  heartbeatVersion += 1
  inFlight = null
  active = false
  clearTimer()
  blocked = false
  if (clearSession) removePresenceSessionId()
}

export async function logoutPresence() {
  const hasToken = !!getToken()
  stopPresence({ clearSession: true })

  try {
    if (hasToken) await dependencies.offlinePresenceApi()
  } catch (error) {
    // Offline is best-effort. Local logout must always finish.
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
  lifecycleVersion += 1
  heartbeatVersion += 1
  clearTimer()
  inFlight = null
  blocked = false
  foreground = true
  active = false
}
