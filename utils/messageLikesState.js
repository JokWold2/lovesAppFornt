const PAGE_SIZE = 20
const emptyState = () => ({
  membership: null,
  membershipLoading: false,
  membershipError: null,
  incoming: { item: null, total: 0, loading: false, error: null },
  mutual: { items: [], total: 0, page: 0, hasMore: true, loading: false, error: null }
})
const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0
const itemKey = item => String(item?.profileId ?? item?.userId ?? item?.rowKey ?? '')
const copyItem = item => item ? { ...item } : null
const asError = error => error instanceof Error ? error : new Error(String(error?.message || 'Unable to load likes'))

function uniqueItems(items) {
  const found = new Map()
  for (const item of items) {
    const key = itemKey(item)
    if (key) found.set(key, copyItem(item))
  }
  return [...found.values()]
}

function preserveOrder(previous, updated) {
  const remaining = new Map(uniqueItems(updated).map(item => [itemKey(item), item]))
  const ordered = []
  for (const item of previous) {
    const key = itemKey(item)
    if (remaining.has(key)) { ordered.push(remaining.get(key)); remaining.delete(key) }
  }
  return [...ordered, ...remaining.values()]
}

// Only server-generated blurred previews can be published while access is
// unknown. A failed membership refresh must not expose an earlier clear photo.
function visibleIncoming(item, membership) {
  if (!item) return null
  if (membership?.canViewLikes === true && !item.locked) return { ...item, locked: false }
  return {
    rowKey: item.rowKey,
    previewUrl: item.previewUrl || '',
    maskedDisplayName: item.maskedDisplayName || '',
    locked: true
  }
}

/**
 * Read-only message-page likes data. API functions return the response body:
 * getIncoming({ page: 1, pageSize: 1 }), getMutual({ page, pageSize: 20 }),
 * and getMembership(). No read receipts are written by this controller.
 */
export function createMessageLikesState({ getIncoming, getMutual, getMembership, getToken, onChange = () => {} }) {
  let state = emptyState()
  let sessionToken = ''
  let generation = 0
  let inFlight = null
  let inFlightKind = ''
  let pendingMore = null
  let disposed = false

  const tokenNow = () => { try { return getToken() || '' } catch (_) { return '' } }
  const snapshot = () => ({
    ...state,
    membership: state.membership ? { ...state.membership } : null,
    incoming: { ...state.incoming, item: visibleIncoming(state.incoming.item, state.membership) },
    mutual: { ...state.mutual, loading: state.mutual.loading || !!pendingMore, items: state.mutual.items.map(copyItem) }
  })
  const publish = () => { if (!disposed) onChange(snapshot()) }
  function synchronizeSession() {
    const next = tokenNow()
    if (next === sessionToken) return
    sessionToken = next
    generation += 1
    inFlight = null
    inFlightKind = ''
    pendingMore = null
    state = emptyState()
    publish()
  }
  function isCurrent(ticket) {
    if (disposed) return false
    synchronizeSession()
    return ticket === generation && !!sessionToken
  }
  function run(operation, kind = 'refresh') {
    const current = operation()
    inFlight = current
    inFlightKind = kind
    current.finally(() => { if (inFlight === current) { inFlight = null; inFlightKind = '' } })
    return current
  }
  function queueMore() {
    if (pendingMore) return pendingMore.promise
    const job = { generation, token: sessionToken, promise: null }
    pendingMore = job
    job.promise = inFlight.then(() => {
      if (disposed || pendingMore !== job) return snapshot()
      synchronizeSession()
      if (pendingMore !== job || job.generation !== generation || job.token !== sessionToken) return snapshot()
      pendingMore = null
      publish()
      return loadMore()
    })
    publish()
    return job.promise
  }

  function refresh({ reset = false } = {}) {
    if (disposed) return Promise.resolve(snapshot())
    synchronizeSession()
    if (!sessionToken) return Promise.resolve(snapshot())
    if (reset) {
      generation += 1
      inFlight = null
      inFlightKind = ''
      pendingMore = null
      state = emptyState()
    }
    if (inFlight) return inFlight
    const ticket = generation
    const pageCount = Math.max(1, state.mutual.page)
    state.membershipLoading = true
    state.membershipError = null
    state.incoming = { ...state.incoming, loading: true, error: null }
    state.mutual = { ...state.mutual, loading: true, error: null }
    publish()

    return run(async () => {
      const membershipTask = Promise.resolve().then(getMembership).then(data => {
        if (!isCurrent(ticket)) return
        state.membership = data && typeof data === 'object' ? { ...data } : null
      }).catch(error => {
        if (!isCurrent(ticket)) return
        state.membership = null
        state.membershipError = asError(error)
      }).finally(() => {
        if (!isCurrent(ticket)) return
        state.membershipLoading = false
        publish()
      })
      const incomingTask = Promise.resolve().then(() => getIncoming({ page: 1, pageSize: 1 })).then(data => {
        if (!isCurrent(ticket)) return
        state.incoming = { ...state.incoming, item: copyItem(data?.items?.[0]), total: count(data?.total) }
      }).catch(error => {
        if (isCurrent(ticket)) state.incoming.error = asError(error)
      }).finally(() => {
        if (!isCurrent(ticket)) return
        state.incoming.loading = false
        publish()
      })
      const mutualTask = Promise.allSettled(Array.from({ length: pageCount }, (_, index) =>
        Promise.resolve().then(() => getMutual({ page: index + 1, pageSize: PAGE_SIZE }))
      )).then(results => {
        if (!isCurrent(ticket)) return
        const items = []
        let total = 0, lastPage = 0, hasMore = false
        for (let index = 0; index < results.length; index += 1) {
          const result = results[index]
          if (result.status === 'rejected') {
            state.mutual.error = asError(result.reason)
            return
          }
          const data = result.value
          if (index === 0) total = count(data?.total)
          items.push(...(Array.isArray(data?.items) ? data.items : []))
          lastPage = index + 1
          hasMore = !!data?.hasMore
          if (!hasMore) break
        }
        state.mutual = { ...state.mutual, items: preserveOrder(state.mutual.items, items), total, page: lastPage, hasMore }
      }).finally(() => {
        if (!isCurrent(ticket)) return
        state.mutual.loading = false
        publish()
      })
      await Promise.all([membershipTask, incomingTask, mutualTask])
      return snapshot()
    })
  }

  function loadMore() {
    if (disposed) return Promise.resolve(snapshot())
    synchronizeSession()
    if (!sessionToken) return Promise.resolve(snapshot())
    if (inFlight) {
      // A blurred incoming preview may outlast the already-visible mutual page.
      // Retain one click until that refresh settles; repeated page-load taps
      // still share their existing request rather than advancing twice.
      return inFlightKind === 'refresh' && state.mutual.page > 0 && state.mutual.hasMore ? queueMore() : inFlight
    }
    if (!state.mutual.page) return refresh()
    if (!state.mutual.hasMore) return Promise.resolve(snapshot())
    const ticket = generation
    const nextPage = state.mutual.page + 1
    state.mutual = { ...state.mutual, loading: true, error: null }
    publish()
    return run(async () => {
      try {
        const data = await getMutual({ page: nextPage, pageSize: PAGE_SIZE })
        if (!isCurrent(ticket)) return snapshot()
        state.mutual = {
          ...state.mutual,
          items: uniqueItems([...state.mutual.items, ...(Array.isArray(data?.items) ? data.items : [])]),
          total: count(data?.total), page: nextPage, hasMore: !!data?.hasMore
        }
      } catch (error) {
        if (isCurrent(ticket)) state.mutual.error = asError(error)
      } finally {
        if (isCurrent(ticket)) { state.mutual.loading = false; publish() }
      }
      return snapshot()
    }, 'more')
  }

  return {
    getState() { if (!disposed) synchronizeSession(); return snapshot() },
    refresh,
    loadMore,
    dispose() { disposed = true; generation += 1; inFlight = null; inFlightKind = ''; pendingMore = null; state = emptyState() }
  }
}
