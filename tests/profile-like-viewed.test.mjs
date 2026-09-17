import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const source = (await readFile(new URL('../pages/searchPerson/personShow/personShow.vue', import.meta.url), 'utf8'))
  .match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .+$/gm, '')
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
const tick = () => new Promise(resolve => setImmediate(resolve))

function harness({ response = { profile: { id: 12, user_id: 80 }, incomingLikeId: 401 }, render, failAck = false, chatResponse } = {}) {
  const hooks = {}, events = {}, acknowledgements = [], refreshes = [], toasts = [], likesRequests = []
  let token = 'viewer-token'
  const context = { module: { exports: {} }, console: { error: () => {} },
    ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }),
    nextTick: async () => { if (render) await render.promise },
    onLoad: cb => { hooks.load = cb }, onShow: cb => { hooks.show = cb }, onHide: cb => { hooks.hide = cb },
    onUnload: cb => { hooks.unload = cb }, onBeforeUnmount: cb => { hooks.unmount = cb },
    getToken: () => token, t: key => key,
    getCandidateProfileApi: async () => typeof response === 'function' ? await response() : await response,
    getProfileLikesApi: async id => { likesRequests.push(id); return { isLiked: false, total: 0 } },
    getChatRequestStatusApi: async () => chatResponse ? await chatResponse : ({ status: 'none', isLiked: false, mutual: false }),
    createBlessingOperations: () => ({}), decideBlessingApi: () => {}, createMembershipRequestId: () => 'id',
    getChatRequestButtonState: () => ({}),
    markProfileLikeViewedApi: async (profileId, likeId) => {
      acknowledgements.push({ profileId, likeId, renderedProfileId: context.module.exports.profile.value?.id })
      if (failAck) throw Error('offline')
      return { affected: 1 }
    },
    refreshUnreadBadge: async options => refreshes.push(options),
    uni: { $on: (event, cb) => { events[event] = cb }, $off: () => {},
      getStorageSync: key => key === 'USER_INFO' ? { id: 99 } : 1,
      showToast: options => toasts.push(options), showModal: () => {} }
  }
  runInNewContext(source + '\nmodule.exports={profile,profileId,loading,fetchProfile}', context)
  const start = () => { hooks.load({ id: '12' }); hooks.show() }
  return { ...context.module.exports, hooks, events, acknowledgements, refreshes, toasts, likesRequests, start, setToken: value => { token = value } }
}

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
