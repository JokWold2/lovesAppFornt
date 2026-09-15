import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const badgeUrl = moduleUrl(await readFile(new URL('../utils/unreadBadgeState.js', import.meta.url), 'utf8'))
const badge = await import(badgeUrl)
const navigation = await import(moduleUrl((await readFile(new URL('../utils/tabBarState.js', import.meta.url), 'utf8'))
  .replace("'./unreadBadgeState.js'", JSON.stringify(badgeUrl))))
const tick = () => new Promise(resolve => setImmediate(resolve))

function harness(initialToken = 'account-a') {
  assert.equal(typeof badge.createUnreadBadgeController, 'function')
  const state = navigation.createTabBarState()
  const requests = []
  const timers = new Map()
  let token = initialToken
  let timerId = 0
  const controller = badge.createUnreadBadgeController({
    readToken: () => token,
    fetchSummary: () => new Promise((resolve, reject) => requests.push({ token, resolve, reject })),
    onSummary: summary => state.setUnreadSummary(summary),
    setTimer: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id },
    clearTimer: id => timers.delete(id)
  })
  return { controller, state, requests, timers, setToken: value => { token = value } }
}

test('both badge counts update atomically, hide zero, cap at 99+, and legacy message updates preserve likes', () => {
  const state = navigation.createTabBarState()
  assert.equal(typeof state.setUnreadSummary, 'function')
  assert.equal(navigation.isLikesTab('/pages/likes/likes'), true)
  assert.equal(navigation.isLikesTab('pages/notice/notice'), false)
  const seen = []
  state.subscribe(snapshot => seen.push([snapshot.unreadText, snapshot.likesUnreadText]))
  state.setUnreadSummary({ totalUnread: 100, profileLikeUnread: 99 })
  state.setUnreadCount(3)
  state.setUnreadSummary({ totalUnread: 0, profileLikeUnread: 100 })
  state.setUnreadSummary({ totalUnread: 5 })
  assert.deepEqual(seen, [['', ''], ['99+', '99'], ['3', '99'], ['', '99+'], ['5', '']])
})

test('badge formatting cannot show invalid numbers or fractional unread counts', () => {
  for (const [value, expected] of [[-1, ''], [NaN, ''], [Infinity, ''], ['bad', ''], [null, ''],
    [undefined, ''], [{}, ''], [true, ''], [[], ''], ['3', '3'], [3.7, '3'], [99.8, '99'], [100, '99+']]) {
    assert.equal(badge.formatUnreadBadge(value), expected)
    assert.equal(badge.hasUnreadMessages(value), expected !== '')
  }
})

test('concurrent ordinary refreshes share one request and a failed refresh preserves both last counts', async () => {
  const h = harness()
  const first = h.controller.refresh()
  const second = h.controller.refresh()
  assert.equal(first, second)
  assert.equal(h.requests.length, 1)
  h.requests[0].resolve({ totalUnread: 7, profileLikeUnread: 4 })
  await first
  assert.equal(h.state.read().likesUnreadText, '4')
  const failed = h.controller.refresh()
  h.requests[1].reject(new Error('temporary network failure'))
  assert.equal(await failed, null)
  assert.equal(h.state.read().unreadText, '7')
  assert.equal(h.state.read().likesUnreadText, '4')
})

test('a clear-read refresh during an older request queues a fresh summary and does not flash stale counts', async () => {
  const h = harness()
  h.state.setUnreadSummary({ totalUnread: 4, profileLikeUnread: 2 })
  const observed = []
  h.state.subscribe(snapshot => observed.push([snapshot.unreadText, snapshot.likesUnreadText]))
  const older = h.controller.refresh()
  const clearRead = h.controller.refresh({ force: true })
  h.controller.refresh({ force: true })
  assert.equal(h.requests.length, 1)
  h.requests[0].resolve({ totalUnread: 6, profileLikeUnread: 5 })
  await tick()
  assert.equal(h.requests.length, 2)
  assert.deepEqual(observed, [['4', '2']])
  h.requests[1].resolve({ totalUnread: 0, profileLikeUnread: 0 })
  await Promise.all([older, clearRead])
  assert.deepEqual(observed, [['4', '2'], ['', '']])
})

test('logout clears both counts and late responses cannot restore the prior account', async () => {
  const h = harness()
  h.state.setUnreadSummary({ totalUnread: 2, profileLikeUnread: 8 })
  const oldRequest = h.controller.refresh()
  h.setToken('')
  h.controller.reset()
  h.requests[0].resolve({ totalUnread: 20, profileLikeUnread: 30 })
  await oldRequest
  assert.equal(h.state.read().unreadText, '')
  assert.equal(h.state.read().likesUnreadText, '')
  assert.equal(await h.controller.refresh(), null)
  assert.equal(h.requests.length, 1)
})

test('switching accounts does not wait for or display the previous account response', async () => {
  const h = harness()
  const first = h.controller.refresh()
  h.setToken('account-b')
  const second = h.controller.refresh()
  assert.equal(h.requests.length, 2)
  h.requests[1].resolve({ totalUnread: 1, profileLikeUnread: 3 })
  await second
  h.requests[0].resolve({ totalUnread: 99, profileLikeUnread: 99 })
  await first
  assert.equal(h.state.read().unreadText, '1')
  assert.equal(h.state.read().likesUnreadText, '3')
})

test('polling refreshes immediately and every five seconds, stops in the background, and resumes fresh', async () => {
  const h = harness()
  h.controller.start()
  assert.equal(h.requests.length, 1)
  assert.deepEqual([...h.timers.values()].map(timer => timer.delay), [5000])
  h.requests[0].resolve({ totalUnread: 1, profileLikeUnread: 2 })
  await tick()
  h.timers.values().next().value.callback()
  assert.equal(h.requests.length, 2)
  h.controller.refresh({ force: true })
  h.controller.stop()
  assert.equal(h.timers.size, 0)
  h.requests[1].resolve({ totalUnread: 8, profileLikeUnread: 8 })
  await tick()
  assert.equal(h.requests.length, 2)
  assert.equal(h.state.read().likesUnreadText, '2')
  assert.equal(await h.controller.refresh({ force: true }), null)
  h.controller.start()
  assert.equal(h.requests.length, 3)
  h.requests[2].resolve({ totalUnread: 3, profileLikeUnread: 4 })
  await tick()
  assert.equal(h.state.read().likesUnreadText, '4')
  h.controller.stop()
})

test('anonymous sessions do not request unread summaries or run a timer', async () => {
  const h = harness('')
  h.controller.start()
  assert.equal(await h.controller.refresh(), null)
  assert.equal(h.requests.length, 0)
  assert.equal(h.timers.size, 0)
})

test('a queued clear-read refresh still completes after the older request fails', async () => {
  const h = harness()
  h.state.setUnreadSummary({ totalUnread: 1, profileLikeUnread: 5 })
  const result = h.controller.refresh()
  h.controller.refresh({ force: true })
  h.requests[0].reject(new Error('old request timed out'))
  await tick()
  assert.equal(h.requests.length, 2)
  h.requests[1].resolve({ totalUnread: 1, profileLikeUnread: 0 })
  await result
  assert.equal(h.state.read().unreadText, '1')
  assert.equal(h.state.read().likesUnreadText, '')
})

test('an explicit reset isolates a restored session even if it reuses the same token', async () => {
  const h = harness()
  const beforeReset = h.controller.start()
  h.controller.reset()
  const afterReset = h.controller.start()
  h.controller.start()
  assert.equal(h.requests.length, 2)
  assert.equal(h.timers.size, 1)
  h.requests[1].resolve({ totalUnread: 2, profileLikeUnread: 3 })
  await afterReset
  h.requests[0].resolve({ totalUnread: 9, profileLikeUnread: 9 })
  await beforeReset
  assert.equal(h.state.read().unreadText, '2')
  assert.equal(h.state.read().likesUnreadText, '3')
  h.controller.stop()
})
