import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

// Run the page's production script: API and uni lifecycle boundaries are the
// only substitutes. This catches changes in when actual page state is applied.
const source = await readFile(new URL('../pages/notice/notice.vue', import.meta.url), 'utf8')
const script = source.match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .+$/gm, '')
const tick = () => new Promise(resolve => setImmediate(resolve))
function deferred() {
  let resolve, reject
  const promise = new Promise((accept, decline) => { resolve = accept; reject = decline })
  return { promise, resolve, reject }
}
const storedGroup = { id: 17, name: 'Existing conversation', last_message: 'A saved message', unread_count: 2 }

function harness(t, { accountLevel = 1, responses = {} } = {}) {
  let token = 'account-one'
  const hooks = { show: [], hide: [], unload: [] }, events = new Map()
  const replies = {
    groups: () => ({ groups: [storedGroup] }),
    notifications: () => ({ notifications: [] }),
    requests: () => ({ requests: [] }),
    unread: () => ({ interactionUnread: 0, profileLikeUnread: 0 }),
    ...responses
  }
  const context = {
    module: { exports: {} }, console,
    ref: value => ({ value }), reactive: value => value,
    computed: getter => ({ get value() { return getter() } }), watch: () => {},
    onShow: callback => hooks.show.push(callback), onHide: callback => hooks.hide.push(callback),
    onUnload: callback => hooks.unload.push(callback), onReady: () => {}, onResize: () => {}, onPullDownRefresh: () => {},
    useFixedPageHeader: () => ({}), onPageScroll: () => {}, currentLocale: {}, t: key => key, updateTabBarLocale: () => {},
    getToken: () => token, config: { baseURL: 'https://example.invalid' },
    useProfileDetailSheet: () => ({ profileId: { value: null }, pageVisible: { value: true }, open: () => {}, close: () => {} }),
    createMessageLikesState: () => ({ refresh: async () => {}, loadMore: async () => {}, dispose: () => {} }),
    BLESSING_CHANGED_EVENT: 'blessing-changed',
    notificationSummary: () => '', presentGroupName: value => value,
    formatConversationTime: () => '', hasUnreadMessages: value => Number(value) > 0,
    setInterval: () => 1, clearInterval: () => {},
    getNotificationsApi: () => replies.notifications(),
    getChatGroupsApi: () => replies.groups(),
    getChatRequestsApi: () => replies.requests(),
    refreshUnreadBadge: () => replies.unread(),
    getMembershipApi: async () => ({}), getBlessingLikesApi: async () => ({}),
    uni: {
      getStorageSync: () => ({ accountLevel }), setNavigationBarTitle: () => {},
      $on: (name, callback) => events.set(name, callback), $off: name => events.delete(name)
    }
  }
  runInNewContext(script + '\nmodule.exports = { load, chatGroups, notifications, requests, messageError }', context)
  const fire = name => hooks[name].forEach(callback => callback())
  t.after(() => fire('unload'))
  return {
    ...context.module.exports, replies, fire,
    changeAccount(value) { token = value; events.get('auth-session-changed')?.() }
  }
}

for (const delayed of ['unread', 'notifications', 'requests']) {
  test(`saved groups appear immediately while ${delayed} is still pending`, async t => {
    const pending = deferred()
    const h = harness(t, { accountLevel: 5, responses: { [delayed]: () => pending.promise } })
    t.after(() => pending.resolve(delayed === 'requests' ? { requests: [] } : delayed === 'notifications' ? { notifications: [] } : {}))
    h.fire('show'); await tick()
    assert.deepEqual(Array.from(h.chatGroups.value, group => group.id), [17])
    assert.equal(h.chatGroups.value[0].last_message, 'A saved message')
  })
}

test('a synchronous notification API failure cannot prevent saved groups from loading', async t => {
  let groupRequests = 0
  const h = harness(t, { responses: {
    notifications: () => { throw new TypeError('Notification module is unavailable') },
    groups: () => { groupRequests++; return Promise.resolve({ groups: [storedGroup] }) }
  } })
  assert.doesNotThrow(() => h.fire('show'))
  await tick()
  assert.equal(groupRequests, 1)
  assert.deepEqual(Array.from(h.chatGroups.value, group => group.id), [17])
  assert.equal(h.chatGroups.value[0].last_message, 'A saved message')
  assert.equal(h.messageError.value, true)
})

test('a failed group refresh keeps saved conversations and shows its error without waiting for notifications', async t => {
  const h = harness(t); h.fire('show'); await tick()
  assert.equal(h.chatGroups.value.length, 1)
  const pending = deferred()
  t.after(() => pending.resolve({ notifications: [] }))
  h.replies.notifications = () => pending.promise
  h.replies.groups = () => Promise.reject(Error('offline'))
  void h.load(); await tick()
  assert.equal(h.chatGroups.value[0].id, 17)
  assert.equal(h.messageError.value, true)
})

for (const lifecycle of ['hide', 'unload']) {
  test(`a delayed group response cannot update the page after ${lifecycle}`, async t => {
    const pending = deferred(), h = harness(t, { responses: { groups: () => pending.promise } })
    h.fire('show'); await tick(); h.fire(lifecycle)
    pending.resolve({ groups: [storedGroup] }); await tick()
    assert.equal(h.chatGroups.value.length, 0)
    assert.equal(h.messageError.value, false)
  })
}

test('a previous account response cannot overwrite the new account conversations', async t => {
  const pending = deferred(), h = harness(t, { responses: { groups: () => pending.promise } })
  h.fire('show'); await tick()
  h.replies.groups = () => ({ groups: [{ id: 29, name: 'Second account conversation' }] })
  h.changeAccount('account-two'); await tick()
  assert.deepEqual(Array.from(h.chatGroups.value, group => group.id), [29])
  pending.resolve({ groups: [storedGroup] }); await tick()
  assert.deepEqual(Array.from(h.chatGroups.value, group => group.id), [29])
})

test('an explicit empty groups array replaces saved groups without reporting a failure', async t => {
  const h = harness(t); h.fire('show'); await tick()
  h.replies.groups = () => ({ groups: [] })
  await h.load()
  assert.equal(h.chatGroups.value.length, 0)
  assert.equal(h.messageError.value, false)
})

for (const [label, invalid] of [
  ['missing body', null], ['missing groups', {}], ['null groups', { groups: null }],
  ['object groups', { groups: {} }], ['non-JSON response', '<html>upstream error</html>']
]) {
  test(`${label} is treated as a failed response and cannot silently erase saved groups`, async t => {
    const h = harness(t); h.fire('show'); await tick()
    h.replies.groups = () => invalid
    await h.load()
    assert.deepEqual(Array.from(h.chatGroups.value, group => group.id), [17])
    assert.equal(h.messageError.value, true)
  })
}
