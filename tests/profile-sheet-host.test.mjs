import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const rawSource = await readFile(new URL('../utils/useProfileDetailSheet.js', import.meta.url), 'utf8')
function scriptFor(platform) {
  const enabled = [true]
  return rawSource.split('\n').filter(line => {
    const directive = line.match(/^\s*\/\/\s*#(ifdef|ifndef|endif)\s*(.*)$/)
    if (!directive) return enabled.at(-1)
    if (directive[1] === 'endif') enabled.pop()
    else enabled.push(enabled.at(-1) && (directive[1] === 'ifdef' ? directive[2].trim() === platform : directive[2].trim() !== platform))
    return false
  }).join('\n').replace(/^import .+$/gm, '').replace('export function', 'function')
}

function fakeBrowser() {
  const initialState = { position: 3, current: '/pages/index/index360', scroll: { top: 640 } }
  const entries = [{ url: 'https://app.invalid/app/#/pages/index/index360', state: initialState }]
  let index = 0, backCalls = 0, routerEvents = 0
  const pending = [], listeners = new Set(), captures = new Map()
  const window = {
    location: { get href() { return entries[index].url } },
    history: {
      get state() { return entries[index].state },
      pushState(state, title, url) { entries.splice(index + 1); entries.push({ state, url }); index++ },
      replaceState(state, title, url) { entries[index] = { state, url } },
      back() { backCalls++; if (index > 0) pending.push(index - 1) }
    },
    addEventListener(type, callback, capture) { if (type === 'popstate') { listeners.add(callback); captures.set(callback, capture) } },
    removeEventListener(type, callback) { if (type === 'popstate') { listeners.delete(callback); captures.delete(callback) } }
  }
  return {
    window, entries, initialState,
    userBack() { if (index > 0) pending.push(index - 1) },
    flushPop() {
      if (!pending.length) return
      index = pending.shift()
      let stopped = false
      const event = { state: entries[index].state, stopImmediatePropagation() { stopped = true } }
      for (const callback of [...listeners]) if (captures.get(callback)) callback(event)
      if (!stopped) routerEvents++
      for (const callback of [...listeners]) if (!captures.get(callback)) callback(event)
    },
    get index() { return index }, get backCalls() { return backCalls }, get routerEvents() { return routerEvents },
    get listenerCount() { return listeners.size }, get pendingCount() { return pending.length }
  }
}

function harness(platform = 'H5', { browser = fakeBrowser(), withWindow = true } = {}) {
  const hooks = {}, events = {}
  const context = {
    module: { exports: {} }, ref: value => ({ value }),
    onShow: callback => { hooks.show = callback }, onHide: callback => { hooks.hide = callback },
    onUnload: callback => { hooks.unload = callback }, onBeforeUnmount: callback => { hooks.unmount = callback },
    onBackPress: callback => { hooks.back = callback },
    uni: { $on: (name, callback) => { events[name] = callback }, $off: name => { delete events[name] } }
  }
  if (withWindow) context.window = browser.window
  runInNewContext(scriptFor(platform) + '\nmodule.exports = useProfileDetailSheet()', context)
  return { ...context.module.exports, hooks, events, browser }
}

test('H5 open adds one same-URL entry without changing router state or duplicating rapid opens', () => {
  const h = harness(), originalUrl = h.browser.window.location.href
  h.open(11); h.open(11); h.open('12')
  assert.equal(h.profileId.value, 12)
  assert.equal(h.browser.entries.length, 2)
  assert.equal(h.browser.window.location.href, originalUrl)
  assert.equal(h.browser.window.history.state.position, 3)
  assert.equal(h.browser.window.history.state.current, '/pages/index/index360')
  assert.equal(h.browser.window.history.state.scroll, h.browser.initialState.scroll)
  assert.equal(Object.keys(h.browser.initialState).length, 3, 'the original state object must not be mutated')
})

test('H5 browser back closes only the profile sheet and consumes the same-route router event', () => {
  const h = harness(); h.open(11)
  h.browser.userBack(); h.browser.flushPop()
  assert.equal(h.profileId.value, null)
  assert.equal(h.browser.index, 0)
  assert.equal(h.browser.routerEvents, 0)
  h.close()
  assert.equal(h.browser.backCalls, 0, 'afterleave must not navigate back a second time')
})

test('H5 explicit close releases its entry once even when close is called repeatedly', () => {
  const h = harness(); h.open(11)
  h.close(); h.close()
  assert.equal(h.profileId.value, null)
  assert.equal(h.browser.backCalls, 1)
  h.browser.flushPop()
  assert.equal(h.browser.routerEvents, 0)
  assert.equal(h.browser.index, 0)
  h.close()
  assert.equal(h.browser.backCalls, 1)
})

test('an H5 open arriving during history release opens the latest profile after release', () => {
  const h = harness(); h.open(11); h.close(); h.open(12); h.open(13)
  h.browser.flushPop()
  assert.equal(h.profileId.value, 13)
  assert.equal(h.browser.entries.length, 2)
  assert.equal(h.browser.index, 1)
  assert.equal(h.browser.routerEvents, 0)
  h.browser.userBack(); h.browser.flushPop()
  assert.equal(h.profileId.value, null)
})

for (const child of ['membership/upgrade', 'chat/chatRoom?id=4']) {
  test(`H5 ${child} navigation and back are untouched while the host is hidden`, () => {
    const h = harness(); h.open(11); h.hooks.hide()
    h.browser.window.history.pushState({ position: 4 }, '', `https://app.invalid/app/#/pages/${child}`)
    h.browser.userBack(); h.browser.flushPop()
    assert.equal(h.profileId.value, 11)
    assert.equal(h.browser.routerEvents, 1)
    h.hooks.show()
    assert.equal(h.pageVisible.value, true)
    assert.equal(h.browser.entries.length, 3, 'showing the host must reuse its existing sheet entry')
    h.close(); h.browser.flushPop()
    assert.equal(h.browser.index, 0)
    assert.equal(h.browser.routerEvents, 1)
  })
}

test('H5 logout in a child route closes the profile but waits for the host before releasing history', () => {
  const h = harness(); h.open(11); h.hooks.hide()
  h.browser.window.history.pushState({ position: 4 }, '', 'https://app.invalid/app/#/pages/membership/upgrade')
  h.events['auth-session-changed']()
  assert.equal(h.profileId.value, null)
  assert.equal(h.browser.backCalls, 0)
  h.browser.userBack(); h.browser.flushPop(); h.hooks.show()
  assert.equal(h.browser.backCalls, 1)
  h.browser.flushPop()
  assert.equal(h.browser.index, 0)
  assert.equal(h.browser.routerEvents, 1)
})

test('H5 unmount releases an owned current entry and removes listeners without changing another route', () => {
  const h = harness(); h.open(11); h.hooks.unmount(); h.browser.flushPop()
  assert.equal(h.profileId.value, null)
  assert.equal(h.browser.index, 0)
  assert.equal(h.browser.listenerCount, 0)
  assert.equal(h.events['auth-session-changed'], undefined)
  assert.equal(h.browser.routerEvents, 0)
  h.open(12)
  assert.equal(h.profileId.value, null)

  const hidden = harness(); hidden.open(11); hidden.hooks.hide()
  hidden.browser.window.history.pushState({ position: 4 }, '', 'https://app.invalid/app/#/pages/chat/chatRoom?id=4')
  hidden.hooks.unload(); hidden.hooks.unmount()
  assert.equal(hidden.browser.backCalls, 0)
  assert.equal(hidden.browser.listenerCount, 0)
  assert.match(hidden.browser.window.location.href, /chatRoom/)
})

test('H5 unmount during an asynchronous close still consumes only the pending sheet pop', () => {
  const h = harness(); h.open(11); h.close(); h.hooks.unload(); h.hooks.unmount()
  assert.equal(h.browser.backCalls, 1)
  h.browser.flushPop()
  assert.equal(h.browser.routerEvents, 0)
  assert.equal(h.browser.listenerCount, 0)
})

test('a pending release that reaches another route is not swallowed or left blocking future opens', () => {
  const h = harness(); h.open(11); h.close()
  h.browser.entries[0].url = 'https://app.invalid/app/#/pages/account/accountCenter'
  h.browser.flushPop()
  assert.equal(h.browser.routerEvents, 1)
  assert.equal(h.browser.listenerCount, 0)
  h.open(12)
  assert.equal(h.profileId.value, 12)
})

test('App hardware back closes a visible profile and leaves child pages or ordinary back untouched', () => {
  const h = harness('APP-PLUS', { withWindow: false })
  assert.equal(typeof h.hooks.back, 'function')
  assert.equal(h.hooks.back({ from: 'backbutton' }), false)
  h.open(11)
  assert.equal(h.hooks.back({ from: 'backbutton' }), true)
  assert.equal(h.profileId.value, null)
  h.open(12); h.hooks.hide()
  assert.equal(h.hooks.back({ from: 'backbutton' }), false)
  assert.equal(h.profileId.value, 12)
  h.hooks.show()
  assert.equal(h.hooks.back({ from: 'backbutton' }), true)
})

for (const platform of ['H5', 'MP-WEIXIN', 'APP-PLUS']) {
  test(`${platform} validates ids and remains usable without browser globals`, () => {
    const h = harness(platform, { withWindow: false })
    for (const id of [null, undefined, '', 0, -1, 1.5, 'wrong', Number.MAX_SAFE_INTEGER + 1]) h.open(id)
    assert.equal(h.profileId.value, null)
    h.open('11'); assert.equal(h.profileId.value, 11)
    h.hooks.hide(); assert.equal(h.pageVisible.value, false)
    h.hooks.show(); assert.equal(h.pageVisible.value, true)
    h.close(); assert.equal(h.profileId.value, null)
    h.hooks.unload(); h.hooks.unmount()
    assert.equal(h.events['auth-session-changed'], undefined)
  })
}
