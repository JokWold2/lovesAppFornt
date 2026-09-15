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
const { getTabSwitchTarget, hideNativeTabBar } = await import(moduleUrl(stateSource.replace("'./unreadBadgeState.js'", JSON.stringify(moduleUrl(badgeSource)))))

async function restoreSession(currentRoute) {
  const navigations = []
  const startupOrder = []
  const ignored = () => {}
  const context = {
    module: { exports: {} }, console: { log: ignored, warn: ignored },
    getTabSwitchTarget,
    getCurrentPages: () => currentRoute ? [{ route: currentRoute }] : [],
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
  runInNewContext(script, context)
  const app = context.module.exports
  await app.onLaunch.call(app)
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
