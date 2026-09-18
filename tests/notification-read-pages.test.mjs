import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const source = await readFile(new URL('../pages/notice/interactionMessages.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .+$/gm, '')
const tick = () => new Promise(resolve => setImmediate(resolve))
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

function harness({ response, failRead = false } = {}) {
  let token = 'account-one'
  const hooks = {}, reads = [], legacyReads = [], summaries = [], toasts = []
  const context = { module: { exports: {} }, ref: value => ({ value }), watch: () => {},
    onShow: cb => { hooks.show = cb }, onHide: cb => { hooks.hide = cb }, onUnload: cb => { hooks.unload = cb },
    getToken: () => token, currentLocale: {}, t: key => key,
    getNotificationsApi: async () => response ? await response : ({ notifications: [{ id: 20, type: 'profile_like', is_read: false }, { id: 21, type: 'market_comment', is_read: false }], interactionReadThroughId: 75 }),
    markInteractionsReadApi: async id => { reads.push(id); if (failRead) throw Error('offline'); return { affected: 75 } },
    markNotificationsReadApi: async ids => { legacyReads.push(ids) },
    refreshUnreadBadge: async options => { summaries.push(options); return { totalUnread: 0, profileLikeUnread: 3 } },
    uni: { setNavigationBarTitle: () => {}, showToast: options => toasts.push(options), $on: () => {}, $off: () => {} }
  }
  runInNewContext(script + '\nmodule.exports = {items, loading, load}', context)
  return { ...context.module.exports, hooks, reads, legacyReads, summaries, toasts, changeToken: value => { token = value } }
}

test('entering interactions acknowledges the server watermark rather than just the limited visible rows', async () => {
  const h = harness(); h.hooks.show(); await tick()
  assert.deepEqual(h.reads, [75])
  assert.deepEqual(h.legacyReads, [])
  assert.equal(h.summaries[0]?.force, true)
  assert.equal(h.items.value.length, 2)
})

for (const scenario of ['hidden', 'unloaded', 'account changed']) {
  test(`a delayed interaction list cannot mark messages read when ${scenario}`, async () => {
    const data = deferred(), h = harness({ response: data.promise })
    h.hooks.show(); await tick()
    if (scenario === 'hidden') h.hooks.hide?.()
    if (scenario === 'unloaded') h.hooks.unload?.()
    if (scenario === 'account changed') h.changeToken('account-two')
    data.resolve({ notifications: [{ id: 20, type: 'profile_like', is_read: false }], interactionReadThroughId: 20 })
    await tick()
    assert.deepEqual(h.reads, [])
    assert.deepEqual(h.legacyReads, [])
    assert.equal(h.items.value.length, 0)
  })
}

test('a failed message acknowledgement keeps content usable without pretending to clear either badge', async () => {
  const h = harness({ failRead: true }); h.hooks.show(); await tick()
  assert.deepEqual(h.reads, [75])
  assert.equal(h.items.value.length, 2)
  assert.deepEqual(h.summaries, [])
  assert.deepEqual(h.toasts, [])
})

test('a failed or empty interaction response cannot mark notifications read', async () => {
  const data = deferred(), h = harness({ response: data.promise })
  h.hooks.show(); data.reject(Error('offline')); await tick()
  assert.deepEqual(h.reads, [])
  assert.equal(h.items.value.length, 0)
  assert.equal(h.toasts.length, 1)
})

test('the interaction conversation badge uses the full unread summary and clears independently of profile views', async () => {
  const page = await readFile(new URL('../pages/notice/notice.vue', import.meta.url), 'utf8')
  const code = page.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .+$/gm, '')
  const likesSource = await readFile(new URL('../utils/messageLikesState.js', import.meta.url), 'utf8')
  const { createMessageLikesState } = await import(`data:text/javascript;base64,${Buffer.from(likesSource).toString('base64')}`)
  const hooks = { show: [], hide: [], unload: [] }, reads = []
  let unread = { interactionUnread: 123, totalUnread: 123, profileLikeUnread: 3 }
  const context = { module: { exports: {} }, ref: value => ({ value }), reactive: value => value, computed: fn => ({ get value() { return fn() } }),
    watch: () => {}, onShow: cb => hooks.show.push(cb), onHide: cb => hooks.hide.push(cb), onUnload: cb => hooks.unload.push(cb),
    onReady: () => {}, onResize: () => {}, onPullDownRefresh: () => {}, currentLocale: {},
    useFixedPageHeader: () => ({}), onPageScroll: () => {}, updateTabBarLocale: () => {}, t: key => key,
    useProfileDetailSheet: () => ({ profileId: { value: null }, pageVisible: { value: true }, open: () => {}, close: () => {} }),
    createMessageLikesState, BLESSING_CHANGED_EVENT: 'blessing-changed',
    setInterval: () => 1, clearInterval: () => {},
    uni: { getStorageSync: () => ({}), setNavigationBarTitle: () => {}, $on: () => {}, $off: () => {} }, getToken: () => 'session', console,
    getNotificationsApi: async () => ({ notifications: Array.from({ length: 50 }, (_, index) => ({ id: index + 1, type: 'profile_like', is_read: false })) }),
    getMembershipApi: async () => ({ canViewLikes: false, tierLevel: 1 }),
    getBlessingLikesApi: async ({ direction }) => ({ items: [], total: direction === 'incoming' ? 3 : 0, hasMore: false }),
    markInteractionsReadApi: async value => reads.push(['interactions', value]),
    markProfileLikesReadApi: async value => reads.push(['profiles', value]),
    getChatGroupsApi: async () => ({ groups: [] }), refreshUnreadBadge: async () => unread
  }
  runInNewContext(code + '\nmodule.exports = {load, interactionUnread, badgeText, notifications, likesState}', context)
  const h = context.module.exports
  hooks.show.forEach(cb => cb()); await tick()
  assert.equal(h.notifications.value.length, 50, 'the message overview loaded its limited visible rows')
  assert.equal(h.interactionUnread.value, 123)
  assert.equal(h.badgeText(h.interactionUnread.value), '99+')
  unread = null; await h.load()
  assert.equal(h.interactionUnread.value, 123, 'a failed summary does not fake a read')
  unread = { interactionUnread: 0, totalUnread: 0, profileLikeUnread: 3 }; await h.load()
  assert.equal(h.interactionUnread.value, 0, 'unviewed liker profiles do not keep the interaction badge lit')
  assert.equal(h.likesState.value.incoming.total, 3, 'clearing interaction messages preserves received likes')
  assert.deepEqual(reads, [], 'the message overview does not acknowledge interactions or viewed profiles')
  hooks.unload.forEach(cb => cb())
})
