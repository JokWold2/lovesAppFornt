import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const asModuleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const badgeSource = await readFile(new URL('../utils/unreadBadgeState.js', import.meta.url), 'utf8')
const stateSource = await readFile(new URL('../utils/tabBarState.js', import.meta.url), 'utf8')
const stateModuleUrl = asModuleUrl(stateSource.replace("'./unreadBadgeState.js'", JSON.stringify(asModuleUrl(badgeSource))))
const navigation = await import(stateModuleUrl)

test('only existing tab destinations can be opened, and the current tab is a no-op', () => {
  assert.equal(typeof navigation.getTabSwitchTarget, 'function')
  assert.equal(navigation.getTabSwitchTarget('pages/index/index360', 'pages/notice/notice'), '/pages/notice/notice')
  assert.equal(navigation.getTabSwitchTarget('/pages/notice/notice', 'pages/notice/notice'), null)
  assert.equal(navigation.getTabSwitchTarget('pages/index/index360', 'pages/my/myLifeShow/myLifeShow'), '/pages/my/myLifeShow/myLifeShow')
  assert.equal(navigation.getTabSwitchTarget('pages/notice/notice', '/pages/index/index360'), '/pages/index/index360')
  assert.equal(navigation.getTabSwitchTarget('pages/index/index360', 'pages/chat/chatRoom'), null)
  assert.equal(navigation.getTabSwitchTarget('pages/index/index360', undefined), null)
})

test('the navigation is hidden during text input or while a keyboard covers the page', () => {
  assert.equal(typeof navigation.isLiquidTabBarVisible, 'function')
  const page = { route: 'pages/notice/notice', pageVisible: true }
  assert.equal(navigation.isLiquidTabBarVisible(page), true)
  assert.equal(navigation.isLiquidTabBarVisible({ ...page, keyboardHeight: 280 }), false)
  assert.equal(navigation.isLiquidTabBarVisible({ ...page, inputFocused: true }), false)
  assert.equal(navigation.isLiquidTabBarVisible({ ...page, pageVisible: false }), false)
  assert.equal(navigation.isLiquidTabBarVisible({ ...page, route: 'pages/chat/chatRoom' }), false)
  assert.equal(navigation.isLiquidTabBarVisible({ ...page, keyboardHeight: 0, inputFocused: false }), true)
})

test('cached tabs receive unread changes and reactivation even when the route stays the same', () => {
  assert.equal(typeof navigation.createTabBarState, 'function')
  const state = navigation.createTabBarState()
  const observed = []
  const unsubscribe = state.subscribe((snapshot, reason) => observed.push({ ...snapshot, reason }))
  state.activate('pages/notice/notice')
  state.setUnreadCount(7)
  state.setUnreadCount(120)
  state.activate('pages/notice/notice')
  assert.deepEqual(observed.map(item => [item.unreadText, item.reason]), [
    ['', 'subscribe'], ['', 'activate'], ['7', 'unread'], ['99+', 'unread'], ['99+', 'activate']
  ])
  state.setUnreadCount(0)
  assert.equal(state.read().unreadText, '')
  unsubscribe()
  const delivered = observed.length
  state.setUnreadCount(2)
  assert.equal(observed.length, delivered)
})

test('unread counts cannot expose invalid numbers and active navigation rejects non-tab routes', () => {
  assert.equal(typeof navigation.createTabBarState, 'function')
  const state = navigation.createTabBarState()
  state.activate('/pages/index/index360')
  assert.equal(state.activate('pages/chat/chatRoom'), false)
  assert.equal(state.read().activeRoute, 'pages/index/index360')
  for (const value of [-8, null, undefined, 'bad count', Infinity]) {
    state.setUnreadCount(value)
    assert.equal(state.read().unreadText, '')
  }
  state.setUnreadCount('8')
  assert.equal(state.read().unreadText, '8')
  state.setUnreadCount(2.9)
  assert.equal(state.read().unreadText, '2')
})

test('native tab hiding is repeated on cached-page activation and unavailable APIs do not stop navigation', () => {
  assert.equal(typeof navigation.activateLiquidTabBar, 'function')
  const requests = []
  const runtime = { hideTabBar: options => requests.push(options.animation) }
  assert.equal(navigation.activateLiquidTabBar('pages/notice/notice', runtime), true)
  assert.equal(navigation.activateLiquidTabBar('pages/notice/notice', runtime), true)
  assert.deepEqual(requests, [false, false])
  assert.equal(navigation.activateLiquidTabBar('pages/chat/chatRoom', runtime), false)
  assert.equal(requests.length, 2)
  assert.equal(navigation.activateLiquidTabBar('pages/index/index360', {}), true)
})

test('unread changes update custom badges on details and tabs without using unsupported native badge APIs', async () => {
  const unreadSource = await readFile(new URL('../utils/unreadBadge.js', import.meta.url), 'utf8')
  const apiModule = asModuleUrl('export async function getUnreadCountApi() { return globalThis.__liquidTabTestUnreadData }')
  const authModule = asModuleUrl("export const getToken = () => 'test-session'")
  const unread = await import(asModuleUrl(unreadSource
    .replace("'@/api/notifications.js'", JSON.stringify(apiModule))
    .replace("'./auth.js'", JSON.stringify(authModule))
    .replace("'./unreadBadgeState.js'", JSON.stringify(asModuleUrl(badgeSource)))
    .replace("'./tabBarState.js'", JSON.stringify(stateModuleUrl))))
  const originalUni = globalThis.uni
  const originalPages = globalThis.getCurrentPages
  const calls = []
  let route = 'pages/chat/chatRoom'
  globalThis.uni = {
    setTabBarBadge: options => calls.push(['set', options]),
    removeTabBarBadge: options => calls.push(['remove', options])
  }
  globalThis.getCurrentPages = () => [{ route }]
  try {
    globalThis.__liquidTabTestUnreadData = { totalUnread: 5, profileLikeUnread: 120 }
    await unread.refreshUnreadBadge()
    assert.equal(navigation.tabBarState.read().unreadText, '5')
    assert.equal(navigation.tabBarState.read().likesUnreadText, '99+')
    assert.deepEqual(calls, [])
    globalThis.__liquidTabTestUnreadData = { totalUnread: 0 }
    await unread.refreshUnreadBadge()
    assert.equal(navigation.tabBarState.read().unreadText, '')
    assert.equal(navigation.tabBarState.read().likesUnreadText, '')
    route = 'pages/notice/notice'
    globalThis.__liquidTabTestUnreadData = { totalUnread: 130 }
    await unread.refreshUnreadBadge()
    assert.equal(navigation.tabBarState.read().unreadText, '99+')
    globalThis.__liquidTabTestUnreadData = { totalUnread: 0 }
    await unread.refreshUnreadBadge()
    assert.equal(navigation.tabBarState.read().unreadText, '')
    assert.deepEqual(calls, [])
  } finally {
    globalThis.uni = originalUni
    globalThis.getCurrentPages = originalPages
    delete globalThis.__liquidTabTestUnreadData
  }
})
