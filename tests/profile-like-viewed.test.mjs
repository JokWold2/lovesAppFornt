import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { createBlessingOperations } from '../utils/blessingInteractions.js'
import { getChatRequestButtonState, getChatRequestEntryState } from '../utils/chatRequestState.js'

const source = (await readFile(new URL('../components/profile/ProfileDetailView.vue', import.meta.url), 'utf8'))
  .match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .+$/gm, '')
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const tick = () => new Promise(resolve => setImmediate(resolve))

function harness({ response = { profile: { id: 12, user_id: 80 }, incomingLikeId: 401 }, render, failAck = false, chatResponse, embedded = false, interactionsEnabled = true, decideResponse, guideSeen = true, headerInset = 28 } = {}) {
  const hooks = {}, events = {}, acknowledgements = [], refreshes = [], toasts = [], likesRequests = [], profileRequests = [], emitted = [], watchers = [], changes = [], decisions = [], dialogs = [], chatPosts = [], membershipErrors = []
  const props = { id: null, visible: false, embedded, interactionsEnabled }
  const chatReads = []
  const timers = new Map()
  let timerId = 0
  let token = 'viewer-token'
  const context = { module: { exports: {} }, console: { error: () => {} },
    ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }),
    defineProps: () => props, defineEmits: () => (...args) => emitted.push(args),
    watch: (read, cb, options) => {
      const value = () => typeof read === 'function' ? read() : read.map(item => item())
      const watcher = { value, cb, previous: value() }
      watchers.push(watcher)
      if (options?.immediate) cb(watcher.previous, undefined)
    },
    nextTick: async () => { if (render) await render.promise },
    onLoad: cb => { hooks.load = cb }, onShow: cb => { hooks.show = cb }, onHide: cb => { hooks.hide = cb },
    onUnload: cb => { hooks.unload = cb }, onBeforeUnmount: cb => { hooks.unmount = cb },
    getToken: () => token, t: key => key,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId }, clearTimeout: id => timers.delete(id),
    useFixedPageHeader: () => ({ headerStyle: { value: { paddingTop: `${headerInset}px` } }, spacerStyle: { value: { height: `${headerInset + 76}px` } } }),
    getCandidateProfileApi: async id => { profileRequests.push(id); return typeof response === 'function' ? await response(id) : await response },
    getProfileLikesApi: async id => { likesRequests.push(id); return { isLiked: false, total: 0 } },
    getChatRequestStatusApi: async id => { chatReads.push(id); return chatResponse ? await chatResponse : ({ status: 'none', isLiked: false, mutual: false }) },
    createBlessingOperations, decideBlessingApi: async (...args) => { decisions.push(args); return typeof decideResponse === 'function' ? await decideResponse() : await decideResponse }, createMembershipRequestId: () => 'id',
    getChatRequestButtonState, getChatRequestEntryState,
    getMembershipChatPrompt: state => ({ type: state.isLiked && state.mutual ? 'request' : 'like', title: 'gate', message: 'gate', confirmText: 'OK' }),
    createChatRequestApi: async payload => { chatPosts.push(payload); return { status: 'pending' } },
    notifyBlessingChanged: change => changes.push(change),
    handleMembershipError: error => { membershipErrors.push(error); return true },
    markProfileLikeViewedApi: async (profileId, likeId) => {
      acknowledgements.push({ profileId, likeId, renderedProfileId: context.module.exports.profile.value?.id })
      if (failAck) throw Error('offline')
      return { affected: 1 }
    },
    refreshUnreadBadge: async options => refreshes.push(options),
    uni: { $on: (event, cb) => { events[event] = cb }, $off: () => {},
      getStorageSync: key => key === 'USER_INFO' ? { id: 99 } : guideSeen ? 1 : null,
      showToast: options => toasts.push(options), showModal: options => dialogs.push(options) }
  }
  runInNewContext(source + '\nmodule.exports={profile,profileId,loading,fetchProfile,goBack,headerStyle,isLiked,likeCount,likePending,chatPending,toggleProfileLike,requestChat}', context)
  const setProps = patch => {
    Object.assign(props, patch)
    for (const watcher of watchers) {
      const value = watcher.value(), previous = watcher.previous
      if (JSON.stringify(value) === JSON.stringify(previous)) continue
      watcher.previous = value
      watcher.cb(value, previous)
    }
  }
  hooks.hide = () => setProps({ visible: false })
  hooks.show = () => setProps({ visible: true })
  hooks.unload = () => hooks.unmount()
  const start = () => setProps({ id: '12', visible: true })
  return { ...context.module.exports, hooks, events, acknowledgements, refreshes, toasts, likesRequests, profileRequests, emitted, changes, decisions, dialogs, chatPosts, chatReads, membershipErrors, start, setProps, runTimers: () => { for (const callback of timers.values()) callback(); timers.clear() }, setToken: value => { token = value } }
}

test('read-only member detail loads a real profile without relationship requests, mutation controls or like guidance', async () => {
  const h = harness({ interactionsEnabled: false, guideSeen: false })
  h.start(); await tick(); h.runTimers(); await tick()
  assert.equal(h.profile.value.id, 12)
  assert.deepEqual(h.likesRequests, [])
  assert.deepEqual(h.chatReads, [])
  await h.toggleProfileLike(); await h.requestChat()
  assert.deepEqual(h.decisions, [])
  assert.deepEqual(h.chatPosts, [])
  assert.deepEqual(h.dialogs, [])
  assert.equal(h.acknowledgements.length, 1, 'rendered-profile notification acknowledgement retains its existing privacy checks')
})

test('switching an open detail to read-only invalidates a pending chat confirmation', async () => {
  const h = harness({ chatResponse: { status: 'none', isLiked: true, mutual: true } })
  h.start(); await tick()
  const pending = h.requestChat(); await tick()
  assert.equal(h.dialogs.length, 1)
  h.setProps({ interactionsEnabled: false }); await tick()
  h.dialogs[0].success({ confirm: true, content: 'hello' }); await pending
  assert.deepEqual(h.chatPosts, [])
})

for (const page of ['groupManage', 'groupMembers']) {
  test(`${page} fullscreen profile preserves the measured WeChat inset and requests read-only mode`, async () => {
    const pageSource = await readFile(new URL(`../pages/chat/${page}.vue`, import.meta.url), 'utf8')
    const sheetTag = pageSource.match(/<ProfileDetailSheet\b[^>]*>/)[0]
    const embedded = /(?:\s+native-header(?:\s|\/?>)|:native-header="true")/.test(sheetTag)
    const interactionsEnabled = !/:interactions-enabled="false"/.test(sheetTag)
    const h = harness({ embedded, interactionsEnabled, headerInset: 96, guideSeen: false })
    h.start(); await tick(); h.runTimers()
    assert.equal(h.headerStyle.value.paddingTop, '96px')
    assert.deepEqual(h.likesRequests, [])
    assert.deepEqual(h.chatReads, [])
    assert.deepEqual(h.dialogs, [])
  })
}

test('closing the shared profile before its guide delay does not show a guide over the parent page', async () => {
  const h = harness({ guideSeen: false })
  h.start(); await tick()
  h.hooks.hide(); h.runTimers(); await tick()
  assert.deepEqual(h.dialogs, [])
})

test('a delayed like for the previous person cannot change the next profile or notify its id', async () => {
  const decision = deferred()
  const h = harness({ decideResponse: decision.promise, response: id => ({ profile: { id, user_id: id + 68 } }) })
  h.start(); await tick()
  const first = h.toggleProfileLike(); await tick()
  assert.equal(h.likePending.value, true)
  h.setProps({ id: 13 }); await tick()
  decision.resolve({ isLiked: true, likeCount: 5 }); await first; await tick()
  assert.equal(h.profile.value.id, 13)
  assert.equal(h.isLiked.value, false)
  assert.equal(h.likeCount.value, 0)
  assert.equal(h.likePending.value, false)
  assert.deepEqual(h.changes.map(change => change.profileId), [12])
})

test('a profile switch while the chat confirmation is open cannot submit a request for the next person', async () => {
  const h = harness({ response: id => ({ profile: { id, user_id: id + 68 } }), chatResponse: { status: 'none', isLiked: true, mutual: true } })
  h.start(); await tick()
  const request = h.requestChat(); await tick()
  assert.equal(h.dialogs.length, 1)
  h.setProps({ id: 13 }); await tick()
  h.dialogs[0].success({ confirm: true, content: 'hello' }); await request; await tick()
  assert.deepEqual(h.chatPosts, [])
  assert.equal(h.chatPending.value, false)
})

test('a quota rejection preserves the heart and count while overlapping taps issue one decision', async () => {
  const decision = deferred(), h = harness({ decideResponse: decision.promise })
  h.start(); await tick()
  const first = h.toggleProfileLike()
  const second = h.toggleProfileLike(); await tick()
  assert.equal(h.decisions.length, 1)
  decision.reject({ code: 'DAILY_LIKE_LIMIT' }); await Promise.all([first, second]); await tick()
  assert.equal(h.isLiked.value, false)
  assert.equal(h.likeCount.value, 0)
  assert.equal(h.likePending.value, false)
  assert.equal(h.membershipErrors.length, 1)
  assert.deepEqual(h.changes, [])
})

test('a mounted but hidden sheet does not load or acknowledge until it is actually visible', async () => {
  const h = harness()
  h.setProps({ id: '12' }); await tick()
  assert.equal(h.profile.value, null)
  assert.equal(h.loading.value, true, 'a valid profile awaiting entry must render loading rather than the missing-profile state')
  assert.deepEqual(h.profileRequests, [])
  assert.deepEqual(h.acknowledgements, [])
  h.setProps({ visible: true }); await tick()
  assert.deepEqual(h.profileRequests, [12])
  assert.equal(h.acknowledgements.length, 1)
})

test('changing the displayed person discards a previous delayed response and acknowledges only the new person', async () => {
  const stale = deferred()
  const h = harness({ response: id => id === 12 ? stale.promise : { profile: { id: 13, user_id: 81 }, incomingLikeId: 402 } })
  h.start(); await tick()
  h.setProps({ id: '13' }); await tick()
  stale.resolve({ profile: { id: 12, user_id: 80 }, incomingLikeId: 401 }); await tick()
  assert.equal(h.profile.value.id, 13)
  assert.deepEqual(h.acknowledgements.map(item => [item.profileId, item.likeId]), [[13, 402]])
})

test('the shared down arrow emits close instead of navigating its parent away', () => {
  const h = harness()
  h.goBack()
  assert.deepEqual(h.emitted, [['close']])
})

test('an embedded detail omits the already provided native navigation top inset', () => {
  assert.equal(harness({ embedded: true }).headerStyle.value.paddingTop, '0px')
  assert.equal(harness().headerStyle.value.paddingTop, '28px')
})

test('an eligible detail acknowledges only its returned like after profile rendering, not navigation', async () => {
  const response = deferred(), render = deferred(), h = harness({ response: response.promise, render })
  h.start(); await tick()
  assert.deepEqual(h.acknowledgements, [])
  response.resolve({ profile: { id: 12, user_id: 80 }, incomingLikeId: 401 }); await tick()
  assert.equal(h.profile.value.id, 12)
  assert.deepEqual(h.acknowledgements, [])
  render.resolve(); await tick()
  assert.deepEqual(h.acknowledgements, [{ profileId: 12, likeId: 401, renderedProfileId: 12 }])
  assert.equal(h.refreshes.length, 1)
  assert.equal(h.refreshes[0].force, true)
})

for (const incomingLikeId of [null, undefined, 0, -1, 'invalid']) {
  test(`a detail without an eligible relation (${incomingLikeId}) does not acknowledge a like`, async () => {
    const h = harness({ response: { profile: { id: 12, user_id: 80 }, incomingLikeId } })
    h.start(); await tick()
    assert.deepEqual(h.acknowledgements, [])
    assert.deepEqual(h.refreshes, [])
  })
}

test('a failed or missing profile never clears an incoming like', async () => {
  for (const response of [() => { throw Error('not available') }, { profile: null, incomingLikeId: 401 }]) {
    const h = harness({ response }); h.start(); await tick()
    assert.deepEqual(h.acknowledgements, [])
    assert.deepEqual(h.refreshes, [])
  }
})

for (const action of ['hide', 'unload', 'account']) {
  test(`a delayed profile response after ${action} cannot clear any incoming like`, async () => {
    const response = deferred(), h = harness({ response: response.promise })
    h.start(); await tick()
    if (action === 'account') h.setToken('another-account')
    else { assert.equal(typeof h.hooks[action], 'function'); h.hooks[action]() }
    response.resolve({ profile: { id: 12, user_id: 80 }, incomingLikeId: 401 }); await tick()
    assert.deepEqual(h.acknowledgements, [])
    assert.deepEqual(h.refreshes, [])
  })
}

test('hiding between profile assignment and the render tick prevents acknowledgement', async () => {
  const render = deferred(), h = harness({ render })
  h.start(); await tick()
  assert.equal(h.profile.value.id, 12)
  assert.equal(typeof h.hooks.hide, 'function')
  h.hooks.hide(); render.resolve(); await tick()
  assert.deepEqual(h.acknowledgements, [])
})

test('a failed acknowledgement keeps the detail usable and does not fake badge clearing', async () => {
  const h = harness({ failAck: true }); h.start(); await tick()
  assert.equal(h.acknowledgements.length, 1)
  assert.equal(h.profile.value.id, 12)
  assert.deepEqual(h.refreshes, [])
  assert.deepEqual(h.toasts, [])
})

test('returning to a hidden detail fetches a fresh relationship id and never reuses the old one', async () => {
  const response = deferred(); let calls = 0
  const h = harness({ response: () => ++calls === 1 ? response.promise : { profile: { id: 12, user_id: 80 }, incomingLikeId: 402 } })
  h.start(); await tick()
  assert.equal(typeof h.hooks.hide, 'function')
  h.hooks.hide(); h.hooks.show(); await tick()
  response.resolve({ profile: { id: 12, user_id: 80 }, incomingLikeId: 401 }); await tick()
  assert.deepEqual(h.acknowledgements.map(item => item.likeId), [402])
})

test('a hidden detail does not continue its follow-up network requests after a delayed chat read', async () => {
  const chat = deferred(), h = harness({ chatResponse: chat.promise })
  h.start(); await tick()
  h.hooks.hide(); chat.resolve({ status: 'none' }); await tick()
  assert.deepEqual(h.likesRequests, [])
})

test('an auth change invalidates a pending render even if the next session reuses the token', async () => {
  const render = deferred(); let calls = 0
  const h = harness({ render, response: () => ++calls === 1
    ? { profile: { id: 12, user_id: 80 }, incomingLikeId: 401 }
    : { profile: { id: 12, user_id: 80 }, incomingLikeId: 402 } })
  h.start(); await tick()
  assert.equal(typeof h.events['auth-session-changed'], 'function')
  h.events['auth-session-changed'](); await tick()
  render.resolve(); await tick()
  assert.deepEqual(h.acknowledgements.map(item => item.likeId), [402])
})
