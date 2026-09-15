import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')
const stripImports = source => source.replace(/^\s*import .+$/gm, '')
const script = source => stripImports(source.match(/<script(?: setup)?>([\s\S]*?)<\/script>/)[1])
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const tick = () => new Promise(resolve => setImmediate(resolve))

test('auth only announces actual credential changes and never exposes credentials in the event', async () => {
  const events = [], storage = new Map()
  const context = { module: { exports: {} }, config: { tokenKey: 'token' }, uni: {
    getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key), $emit: (...args) => events.push(args)
  } }
  runInNewContext(stripImports(await read('../utils/auth.js')).replace(/export /g, '') + '\nmodule.exports = {setToken, removeToken}', context)
  const { setToken, removeToken } = context.module.exports
  setToken('first'); setToken('first'); setToken('second'); removeToken(); removeToken()
  assert.deepEqual(events, Array.from({length: 3}, () => ['auth-session-changed']))
})

test('foreground login starts badge polling; logout resets; background login waits for foreground', async () => {
  const events = {}, calls = []; let token = ''
  const ignore = () => {}
  const context = { module: { exports: {} }, console: { log: ignore }, getToken: () => token,
    uni: { $on: (event, cb) => { events[event] = cb } },
    startUnreadBadgePolling: () => calls.push('start'), stopUnreadBadgePolling: () => calls.push('stop'),
    resetUnreadBadgeState: () => calls.push('reset'), refreshUnreadBadge: () => calls.push('refresh')
  }
  for (const name of ['hideNativeTabBar', 'installPushListeners', 'configurePresenceApiMethods', 'heartbeatPresenceApi', 'offlinePresenceApi', 'resumePresence', 'pausePresence', 'startPresence', 'registerCurrentDevice']) context[name] = ignore
  runInNewContext(script(await read('../App.vue')).replace('export default', 'module.exports ='), context)
  const app = context.module.exports
  await app.onLaunch.call(app); app.onShow.call(app)
  assert.equal(typeof events['auth-session-changed'], 'function')
  token = 'signed-in'; events['auth-session-changed']()
  assert.deepEqual(calls, ['reset', 'start'])
  token = ''; events['auth-session-changed']()
  assert.deepEqual(calls.slice(-1), ['reset'])
  app.onHide.call(app); token = 'another-session'; events['auth-session-changed']()
  assert.deepEqual(calls.slice(-2), ['stop', 'reset'])
  app.onShow.call(app)
  assert.equal(calls.at(-1), 'start')
})

async function likesHarness({ response, failRead = false } = {}) {
  const hooks = {}, reads = [], badgeRefreshes = []; let token = 'viewer'
  const context = { module: { exports: {} },
    ref: value => ({ value }), reactive: value => value, computed: fn => ({ get value() { return fn() } }),
    onShow: cb => { hooks.show = cb }, onHide: cb => { hooks.hide = cb }, onUnload: cb => { hooks.unload = cb },
    onReachBottom: () => {}, onPullDownRefresh: () => {}, uni: { $on: () => {}, $off: () => {} },
    getToken: () => token, getMembershipApi: async () => ({ canViewLikes: false, tierLevel: 1 }),
    getBlessingLikesApi: async params => response ? await (typeof response === 'function' ? response(params) : response) : ({ items: [{ rowKey: 'locked', locked: true }], total: 1, hasMore: false, likeReadThroughId: 42 }),
    markProfileLikesReadApi: async id => { reads.push(id); if (failRead) throw Error('offline'); return { affected: 1 } },
    refreshUnreadBadge: options => { badgeRefreshes.push(options); return Promise.resolve() },
    mergeBlessingLikes: (previous, next) => [...previous, ...next], getMembershipTierName: () => 'Iron',
    getMembershipErrorMessage: () => 'failed', useFixedPageHeader: () => ({}), t: key => key,
    config: {}, BLESSING_CHANGED_EVENT: 'blessing-changed'
  }
  runInNewContext(script(await read('../pages/likes/likes.vue')) + '\nmodule.exports = {refresh, loadFeed, switchDirection, feeds, direction}', context)
  return { ...context.module.exports, hooks, reads, badgeRefreshes, changeToken: value => { token = value } }
}

test('loading visible incoming likes never marks any person viewed or clears badges', async () => {
  const h = await likesHarness()
  h.hooks.show(); await tick()
  assert.deepEqual(h.reads, [])
  assert.deepEqual(h.badgeRefreshes, [])
  assert.equal(h.feeds.incoming.items.length, 1)
})

test('outgoing likes never clear incoming reminders', async () => {
  const h = await likesHarness()
  h.direction.value = 'outgoing'; h.hooks.show(); await tick()
  assert.deepEqual(h.reads, [])
})

test('loading a later page cannot clear a new like that arrived above the already loaded first page', async () => {
  const h = await likesHarness({ response: ({ page }) => ({ items: [{ rowKey: `page-${page}` }], hasMore: true, likeReadThroughId: page === 1 ? 42 : 43 }) })
  h.hooks.show(); await tick()
  await h.loadFeed(false)
  assert.equal(h.feeds.incoming.items.length, 2)
  assert.deepEqual(h.reads, [])
})

for (const scenario of ['hide', 'switch', 'account']) {
  test(`a delayed incoming response cannot clear reminders after ${scenario}`, async () => {
    const response = deferred(), h = await likesHarness({ response: response.promise })
    h.hooks.show(); await tick()
    if (scenario === 'hide') h.hooks.hide()
    if (scenario === 'switch') h.switchDirection('outgoing')
    if (scenario === 'account') h.changeToken('new-account')
    response.resolve({ items: [{ rowKey: 'old' }], likeReadThroughId: 42 }); await tick()
    assert.deepEqual(h.reads, [])
    if (scenario === 'account') assert.equal(h.feeds.incoming.items.length, 0)
  })
}

test('a list visit does not depend on a read acknowledgement to display cards', async () => {
  const h = await likesHarness({ failRead: true })
  h.hooks.show(); await tick()
  assert.deepEqual(h.reads, [])
  assert.equal(h.feeds.incoming.error, '')
  assert.equal(h.feeds.incoming.items.length, 1)
  assert.deepEqual(h.badgeRefreshes, [])
})
