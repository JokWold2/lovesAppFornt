import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../utils/messageLikesState.js', import.meta.url), 'utf8')
const { createMessageLikesState } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const person = id => ({ profileId: id, displayName: `Person ${id}`, photoUrl: `/photo/${id}.jpg`, mutual: true })
const page = (ids, total = ids.length, hasMore = false) => ({ items: ids.map(person), total, hasMore })
const setup = (overrides = {}) => {
  const changes = []
  let token = 'account-a'
  const controller = createMessageLikesState({
    getToken: () => token,
    getMembership: async () => ({ canViewLikes: true, tierLevel: 3 }),
    getIncoming: async () => ({ items: [{ ...person(80), avatarUrl: '/private/80.jpg', previewUrl: '/blur/80.jpg' }], total: 125 }),
    getMutual: async () => page([1, 2]),
    onChange: state => changes.push(state),
    ...overrides
  })
  return { controller, changes, setToken: value => { token = value } }
}

test('loads incoming total independently and paginates all mutual members', async () => {
  const calls = []
  const { controller } = setup({ getMutual: async params => { calls.push(params); return params.page === 1 ? page([1, 2], 3, true) : page([3], 3) } })
  await controller.refresh()
  assert.equal(controller.getState().incoming.total, 125)
  assert.equal(controller.getState().incoming.item.avatarUrl, '/private/80.jpg')
  await controller.loadMore()
  assert.deepEqual(controller.getState().mutual.items.map(item => item.profileId), [1, 2, 3])
  assert.equal(controller.getState().mutual.page, 2)
  assert.equal(controller.getState().mutual.hasMore, false)
  await controller.loadMore()
  assert.deepEqual(calls, [{ page: 1, pageSize: 20 }, { page: 2, pageSize: 20 }])
})

test('refreshes already-loaded pages, removes cancelled matches, and preserves visible order', async () => {
  let refreshed = false
  const requested = []
  const { controller } = setup({ getMutual: async ({ page: current }) => {
    requested.push(current)
    if (!refreshed) return current === 1 ? page([1, 2], 4, true) : page([3, 4], 4)
    return current === 1 ? page([5, 1], 4, true) : page([4, 3], 4)
  } })
  await controller.refresh()
  await controller.loadMore()
  refreshed = true
  await controller.refresh()
  assert.deepEqual(requested, [1, 2, 1, 2])
  assert.deepEqual(controller.getState().mutual.items.map(item => item.profileId), [1, 3, 4, 5])
  assert.equal(controller.getState().mutual.page, 2)
})

test('a failed incoming request does not stop mutual members and retains same-account data', async () => {
  let fail = false
  const { controller } = setup({ getIncoming: async () => { if (fail) throw new Error('offline'); return { items: [person(80)], total: 6 } } })
  await controller.refresh()
  fail = true
  await controller.refresh()
  assert.equal(controller.getState().incoming.total, 6)
  assert.equal(controller.getState().incoming.error.message, 'offline')
  assert.deepEqual(controller.getState().mutual.items.map(item => item.profileId), [1, 2])
  assert.equal(controller.getState().mutual.error, null)
})

test('membership failure hides old real incoming photos while mutual photos remain visible', async () => {
  let fail = false
  const { controller } = setup({ getMembership: async () => { if (fail) throw new Error('membership offline'); return { canViewLikes: true } } })
  await controller.refresh()
  fail = true
  await controller.refresh()
  const state = controller.getState()
  assert.equal(state.membership, null)
  assert.equal(state.membershipError.message, 'membership offline')
  assert.equal(state.incoming.item.locked, true)
  assert.equal(state.incoming.item.avatarUrl, undefined)
  assert.equal(state.incoming.item.photoUrl, undefined)
  assert.equal(state.incoming.item.displayName, undefined)
  assert.equal(state.incoming.item.previewUrl, '/blur/80.jpg')
  assert.equal(state.mutual.items[0].photoUrl, '/photo/1.jpg')
})

test('locked server rows remain locked even with silver membership', async () => {
  const { controller } = setup({ getIncoming: async () => ({ items: [{ ...person(80), locked: true, avatarUrl: '/private.jpg', previewUrl: '/blur.jpg', maskedDisplayName: 'P••' }], total: 1 }) })
  await controller.refresh()
  assert.equal(controller.getState().incoming.item.avatarUrl, undefined)
  assert.equal(controller.getState().incoming.item.maskedDisplayName, 'P••')
})

test('a partial mutual refresh failure keeps the whole previous list and page for retry', async () => {
  let fail = false
  const { controller } = setup({ getMutual: async ({ page: current }) => {
    if (fail && current === 2) throw new Error('page offline')
    return current === 1 ? page(fail ? [4, 1] : [1, 2], 3, true) : page([3], 3)
  } })
  await controller.refresh(); await controller.loadMore()
  fail = true
  await controller.refresh()
  assert.deepEqual(controller.getState().mutual.items.map(item => item.profileId), [1, 2, 3])
  assert.equal(controller.getState().mutual.page, 2)
  assert.equal(controller.getState().mutual.error.message, 'page offline')
  fail = false
  await controller.refresh()
  assert.equal(controller.getState().mutual.error, null)
})

test('changing accounts immediately discards cached cards and ignores old responses', async () => {
  const first = deferred()
  let call = 0
  const { controller, setToken } = setup({ getMutual: () => ++call === 1 ? first.promise : Promise.resolve(page([9])) })
  const old = controller.refresh()
  await Promise.resolve()
  setToken('account-b')
  const next = controller.refresh()
  assert.deepEqual(controller.getState().mutual.items, [])
  assert.equal(controller.getState().incoming.item, null)
  await next
  first.resolve(page([1, 2]))
  await old
  assert.deepEqual(controller.getState().mutual.items.map(item => item.profileId), [9])
})

test('logout during a request clears existing state and does not publish its response', async () => {
  const pending = deferred()
  let call = 0
  const { controller, setToken } = setup({ getMutual: () => ++call === 1 ? Promise.resolve(page([1])) : pending.promise })
  await controller.refresh()
  const refresh = controller.refresh()
  setToken('')
  pending.resolve(page([9]))
  await refresh
  assert.deepEqual(controller.getState().mutual.items, [])
  assert.equal(controller.getState().incoming.item, null)
  assert.equal(controller.getState().membership, null)
})

test('concurrent refresh and load-more calls do not overlap, and published snapshots stay independent', async () => {
  const pending = deferred()
  let calls = 0
  const { controller, changes } = setup({ getMutual: () => { calls += 1; return pending.promise } })
  const first = controller.refresh()
  const second = controller.refresh()
  const more = controller.loadMore()
  pending.resolve(page([1, 2]))
  await Promise.all([first, second, more])
  assert.equal(calls, 1)
  assert.ok(changes.length > 1)
  assert.deepEqual(changes[0].mutual.items, [])
  assert.notEqual(changes[0], changes.at(-1))
  assert.notEqual(changes[0].mutual, changes.at(-1).mutual)
  const snapshot = controller.getState()
  snapshot.mutual.items[0].displayName = 'mutated outside'
  assert.equal(controller.getState().mutual.items[0].displayName, 'Person 1')
})

test('disposing invalidates in-flight requests and publishes no late updates', async () => {
  const pending = deferred()
  const { controller, changes } = setup({ getMutual: () => pending.promise })
  const request = controller.refresh()
  controller.dispose()
  const count = changes.length
  pending.resolve(page([1]))
  await request
  assert.equal(changes.length, count)
  assert.deepEqual(controller.getState().mutual.items, [])
})

test('a failed next page is retryable without losing earlier cards or duplicating boundary rows', async () => {
  let fail = true
  const { controller } = setup({ getMutual: async ({ page: current }) => {
    if (current === 1) return page([1, 2], 3, true)
    if (fail) throw new Error('next page offline')
    return page([2, 3], 3)
  } })
  await controller.refresh(); await controller.loadMore()
  assert.equal(controller.getState().mutual.page, 1)
  assert.equal(controller.getState().mutual.hasMore, true)
  assert.deepEqual(controller.getState().mutual.items.map(item => item.profileId), [1, 2])
  fail = false
  await controller.loadMore()
  assert.deepEqual(controller.getState().mutual.items.map(item => item.profileId), [1, 2, 3])
  assert.equal(controller.getState().mutual.error, null)
})

test('refresh discards no-longer-existing later pages when the first page becomes the final page', async () => {
  let shrunk = false
  const { controller } = setup({ getMutual: async ({ page: current }) => {
    if (!shrunk) return current === 1 ? page([1, 2], 3, true) : page([3], 3)
    if (current === 1) return page([2], 1)
    throw new Error('page no longer exists')
  } })
  await controller.refresh(); await controller.loadMore()
  shrunk = true
  await controller.refresh()
  assert.equal(controller.getState().mutual.error, null)
  assert.equal(controller.getState().mutual.page, 1)
  assert.equal(controller.getState().mutual.total, 1)
  assert.deepEqual(controller.getState().mutual.items.map(item => item.profileId), [2])
})

test('membership is unknown initially so an earlier incoming response cannot flash a clear photo', async () => {
  const membership = deferred()
  const { controller, changes } = setup({ getMembership: () => membership.promise })
  const pending = controller.refresh()
  await new Promise(resolve => setImmediate(resolve))
  const early = changes.filter(state => state.incoming.item)
  assert.ok(early.length)
  assert.ok(early.every(state => !state.incoming.item.avatarUrl && state.incoming.item.locked))
  membership.resolve({ canViewLikes: true })
  await pending
  assert.equal(controller.getState().incoming.item.avatarUrl, '/private/80.jpg')
})

test('anonymous users make no requests', async () => {
  let calls = 0
  const { controller, setToken } = setup({ getMutual: async () => { calls += 1; return page([1]) } })
  setToken('')
  await controller.refresh(); await controller.loadMore()
  assert.equal(calls, 0)
})

test('a next-page click waits for a slow incoming preview instead of being lost, and repeated clicks merge', async () => {
  const incoming = deferred()
  const requested = []
  const { controller } = setup({
    getIncoming: () => incoming.promise,
    getMutual: async ({ page: current }) => { requested.push(current); return current === 1 ? page([1], 2, true) : page([2], 2) }
  })
  const refresh = controller.refresh()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(controller.getState().mutual.loading, false)
  assert.equal(controller.getState().incoming.loading, true)
  const firstClick = controller.loadMore()
  const repeatedClick = controller.loadMore()
  assert.equal(controller.getState().mutual.loading, true, 'queued clicks show loading feedback immediately')
  incoming.resolve({ items: [], total: 0 })
  await Promise.all([refresh, firstClick, repeatedClick])
  assert.deepEqual(requested, [1, 2])
  assert.deepEqual(controller.getState().mutual.items.map(item => item.profileId), [1, 2])
})

test('repeated clicks during an actual next-page fetch do not queue another page', async () => {
  const next = deferred()
  const requested = []
  const { controller } = setup({ getMutual: ({ page: current }) => {
    requested.push(current)
    return current === 1 ? Promise.resolve(page([1], 3, true)) : next.promise
  } })
  await controller.refresh()
  const first = controller.loadMore()
  const repeated = controller.loadMore()
  next.resolve(page([2], 3, true))
  await Promise.all([first, repeated])
  assert.deepEqual(requested, [1, 2])
  assert.equal(controller.getState().mutual.page, 2)
})

for (const interrupt of ['account', 'reset', 'dispose']) {
  test(`a queued next page is cancelled by ${interrupt}`, async () => {
    const incoming = deferred()
    const requested = []
    let incomingCalls = 0
    const { controller, setToken } = setup({
      getIncoming: () => ++incomingCalls === 1 ? incoming.promise : Promise.resolve({ items: [], total: 0 }),
      getMutual: async ({ page: current }) => { requested.push(current); return page([current], 2, true) }
    })
    const old = controller.refresh()
    await new Promise(resolve => setImmediate(resolve))
    const queued = controller.loadMore()
    if (interrupt === 'account') { setToken('account-b'); await controller.refresh() }
    if (interrupt === 'reset') await controller.refresh({ reset: true })
    if (interrupt === 'dispose') controller.dispose()
    incoming.resolve({ items: [], total: 0 })
    await Promise.all([old, queued])
    assert.deepEqual(requested, interrupt === 'dispose' ? [1] : [1, 1])
    assert.equal(controller.getState().mutual.page, interrupt === 'dispose' ? 0 : 1)
  })
}
