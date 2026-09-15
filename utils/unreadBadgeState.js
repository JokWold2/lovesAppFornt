const TAB_BAR_ROUTES = new Set([
  'pages/index/index360',
  'pages/likes/likes',
  'pages/notice/notice',
  'pages/my/myLifeShow/myLifeShow'
])

function normalizeUnreadCount(total) {
  if (typeof total !== 'number' && typeof total !== 'string') return 0
  const count = Number(total)
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
}

export function formatUnreadBadge(total) {
  const count = normalizeUnreadCount(total)
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}

export function hasUnreadMessages(total) {
  return normalizeUnreadCount(total) > 0
}

export function shouldUpdateTabBarBadge(route) {
  return TAB_BAR_ROUTES.has(String(route || '').replace(/^\/+/, ''))
}

// Separate the request lifecycle from uni-app so every platform shares the same
// account isolation, foreground polling and read-after-write ordering.
export function createUnreadBadgeController({
  readToken,
  fetchSummary,
  onSummary,
  setTimer = setInterval,
  clearTimer = clearInterval
}) {
  const tokenNow = () => {
    try { return readToken() || '' } catch (_) { return '' }
  }
  let sessionToken = tokenNow()
  let generation = 0
  let inFlight = null
  let timer = null
  let foreground = true

  const clearPolling = () => {
    if (timer !== null) clearTimer(timer)
    timer = null
  }
  const invalidate = () => {
    generation += 1
    inFlight = null
  }
  const synchronizeSession = () => {
    const token = tokenNow()
    if (token !== sessionToken) {
      sessionToken = token
      invalidate()
      onSummary({ totalUnread: 0, profileLikeUnread: 0 })
    }
    if (!token) clearPolling()
    return token
  }

  function refresh({ force = false } = {}) {
    const token = synchronizeSession()
    if (!foreground || !token) return Promise.resolve(null)
    if (inFlight) {
      // A read acknowledgement or push arrived after the current request began.
      // Coalesce these events into a subsequent request, never the older result.
      if (force) inFlight.dirty = true
      return inFlight.promise
    }
    const job = { generation, token, dirty: false, promise: null }
    inFlight = job
    job.promise = (async () => {
      try {
        while (true) {
          job.dirty = false
          let data = null
          try { data = await fetchSummary() } catch (_) { /* Preserve the last successful counts. */ }
          const currentToken = synchronizeSession()
          if (!foreground || job.generation !== generation || job.token !== currentToken) return null
          if (job.dirty) continue
          if (data && typeof data === 'object') onSummary(data)
          return data
        }
      } finally {
        if (inFlight === job) inFlight = null
      }
    })()
    return job.promise
  }

  function start(interval = 5000) {
    foreground = true
    if (!synchronizeSession()) return Promise.resolve(null)
    if (timer === null) {
      const value = Number(interval)
      const delay = Number.isFinite(value) && value >= 1000 ? Math.floor(value) : 5000
      timer = setTimer(() => { refresh() }, delay)
    }
    return refresh()
  }

  function stop() {
    foreground = false
    clearPolling()
    invalidate()
  }

  function reset() {
    stop()
    sessionToken = tokenNow()
    onSummary({ totalUnread: 0, profileLikeUnread: 0 })
  }

  return { refresh, start, stop, reset }
}
