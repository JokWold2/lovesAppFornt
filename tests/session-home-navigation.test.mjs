import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const source = await readFile(new URL('../App.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^\s*import .+$/gm, '')
  .replace('export default', 'module.exports =')
const moduleUrl = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const badgeSource = await readFile(new URL('../utils/unreadBadgeState.js', import.meta.url), 'utf8')
const stateSource = await readFile(new URL('../utils/tabBarState.js', import.meta.url), 'utf8')
const { getTabSwitchTarget, getSessionRestoreTarget, hideNativeTabBar } = await import(moduleUrl(stateSource.replace("'./unreadBadgeState.js'", JSON.stringify(moduleUrl(badgeSource)))))

async function restoreSession(currentRoute, launchPath, routeAfterRestore) {
  const navigations = []
  const startupOrder = []
  const ignored = () => {}
  let visibleRoute = currentRoute
  const context = {
    module: { exports: {} }, console: { log: ignored, warn: ignored },
    getTabSwitchTarget, getSessionRestoreTarget,
    getCurrentPages: () => visibleRoute ? [{ route: visibleRoute }] : [],
    getToken: () => 'test-session', getUserInfo: () => ({ id: 1 }),
    validateTokenApi: async () => { startupOrder.push('validate'); return { valid: true, user: { id: 1 } } },
    uni: {
      hideTabBar: () => startupOrder.push('hide'),
      $emit: ignored,
      switchTab: options => navigations.push(options.url),
      reLaunch: options => { throw new Error(`Unexpected relaunch: ${options.url}`) }
    }
  }
  context.hideNativeTabBar = () => hideNativeTabBar(context.uni)
  for (const name of [
    'heartbeatPresenceApi', 'offlinePresenceApi', 'removeToken', 'removeUserInfo', 'setUserInfo',
    'refreshUnreadBadge', 'startUnreadBadgePolling', 'stopUnreadBadgePolling',
    'installPushListeners', 'registerCurrentDevice', 'configurePresenceApiMethods',
    'pausePresence', 'resumePresence', 'startPresence', 'stopPresence', 'bootstrapLocale'
  ]) context[name] = ignored
  context.bootstrapLocale = async () => { if (routeAfterRestore !== undefined) visibleRoute = routeAfterRestore }
  runInNewContext(script, context)
  const app = context.module.exports
  await app.onLaunch.call(app, launchPath === undefined ? undefined : { path: launchPath })
  assert.equal(app.globalData.restoringSession, false)
  assert.deepEqual(startupOrder, ['hide', 'validate'], 'native navigation must be hidden before any asynchronous session work')
  return navigations
}

test('restoring a session on the rendered homepage does not switch to the same page and hide its navigation', async () => {
  assert.deepEqual(await restoreSession('pages/index/index360'), [])
})

test('restoring a session from login or before a page is available still opens the homepage', async () => {
  assert.deepEqual(await restoreSession('pages/login/login360'), ['/pages/index/index360'])
  assert.deepEqual(await restoreSession(), ['/pages/index/index360'])
})

for (const route of ['pages/index/index360', 'pages/likes/likes', 'pages/notice/notice', 'pages/my/myLifeShow/myLifeShow', 'pages/searchPerson/personShow/personShow']) {
  test(`refreshing ${route} before the page stack is ready never queues a switchTab`, async () => {
    assert.deepEqual(await restoreSession(undefined, route), [])
  })
  test(`restoring an already rendered ${route} preserves that page`, async () => {
    assert.deepEqual(await restoreSession(route), [])
  })
}

for (const route of ['pages/login/login360', 'pages/login/login']) {
  test(`restoring from ${route} still opens Home with or without a ready page stack`, async () => {
    assert.deepEqual(await restoreSession(undefined, route), ['/pages/index/index360'])
    assert.deepEqual(await restoreSession(route, 'pages/likes/likes'), ['/pages/index/index360'])
  })
}

test('blank launch paths preserve the legacy login-to-home fallback', async () => {
  for (const route of [undefined, '', '/', '   ']) assert.deepEqual(await restoreSession(undefined, route), ['/pages/index/index360'])
})

test('a ready current page takes precedence over the older launch path', async () => {
  assert.deepEqual(await restoreSession('pages/likes/likes', 'pages/login/login360'), [])
  assert.deepEqual(await restoreSession('pages/searchPerson/personShow/personShow', 'pages/index/index360'), [])
  assert.deepEqual(await restoreSession('pages/index/index360', 'pages/login/login360'), [])
})

test('navigation completed while the session restores is not overwritten with Home', async () => {
  assert.deepEqual(await restoreSession('pages/login/login360', 'pages/login/login360', 'pages/searchPerson/personShow/personShow'), [])
})

test('runtime entry paths accept leading slashes and query strings without losing their destination', async () => {
  assert.deepEqual(await restoreSession(undefined, '/pages/index/index360?from=reload'), [])
  assert.deepEqual(await restoreSession(undefined, '/pages/searchPerson/personShow/personShow?id=12'), [])
  assert.deepEqual(await restoreSession(undefined, '/pages/login/login360?redirect=home'), ['/pages/index/index360'])
})
