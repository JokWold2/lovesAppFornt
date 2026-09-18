import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import * as interactions from '../utils/blessingInteractions.js'
import * as featured from '../utils/featuredFeed.js'
import { getProfilePhotos, mergeProfileBatch } from '../utils/blessingDeck.js'

const rawSource = (await readFile(new URL('../pages/index/index360.vue', import.meta.url), 'utf8'))
  .match(/<script setup>([\s\S]*?)<\/script>/)[1]
const tick = () => new Promise(resolve => setImmediate(resolve))

function platformScript(platform) {
  const enabled = [true]
  return rawSource.split('\n').filter(line => {
    const directive = line.match(/^\s*\/\/\s*#(ifdef|ifndef|endif)\s*(.*)$/)
    if (directive) {
      if (directive[1] === 'endif') enabled.pop()
      else enabled.push(enabled.at(-1) && (directive[1] === 'ifdef' ? directive[2].trim() === platform : directive[2].trim() !== platform))
      return false
    }
    return enabled.at(-1)
  }).join('\n').replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
}

function harness(platform = 'H5') {
  const hooks = {}, events = {}, navigations = [], scrolls = [], feedRequests = [], featuredRequests = []
  let token = 'viewer-one', membershipRequests = 0
  const context = {
    ...interactions, ...featured, getProfilePhotos, mergeProfileBatch,
    module: { exports: {} }, console: { log() {}, error() {} },
    ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }),
    watch() {}, nextTick: callback => Promise.resolve().then(callback),
    useProfileDetailSheet: () => {
      const profileId = { value: null }, pageVisible = { value: true }
      return { profileId, pageVisible, open: id => { profileId.value = id }, close: () => { profileId.value = null } }
    },
    onMounted: callback => { hooks.mount = callback }, onBeforeUnmount: callback => { hooks.unmount = callback },
    onShow: callback => { hooks.show = callback }, onResize() {},
    onPageScroll: callback => { hooks.scroll = callback },
    onPullDownRefresh: callback => { hooks.pull = callback }, onReachBottom: callback => { hooks.bottom = callback },
    getToken: () => token, t: key => key, currentLocale: { value: 'zh-Hans' }, updateTabBarLocale() {},
    config: { baseURL: '', tokenKey: 'AUTH_TOKEN' }, ensureTokenValid: async () => true,
    getMembershipApi: async () => {
      membershipRequests++
      return { tierLevel: 3, canSearch: false, usage: { like: { remaining: 100 - membershipRequests } }, rewind: { available: false } }
    },
    getExploreFeedApi: async request => {
      feedRequests.push(request)
      return feedRequests.length === 1
        ? { profiles: [{ profileId: 11, userId: 101, photos: ['a.jpg', 'b.jpg'] }, { profileId: 12, userId: 102 }], hasMore: true }
        : request.excludeIds.length
          ? { profiles: [{ profileId: 13, userId: 103 }], hasMore: false }
          : { profiles: [{ profileId: 99, userId: 199 }], hasMore: false }
    },
    getFeaturedFeedApi: async request => {
      featuredRequests.push(request)
      return featuredRequests.length === 1
        ? { items: [{ type: 'moment', id: 41, feedKey: 'm41' }, { type: 'blessing', id: 11, feedKey: 'b11' }], seed: 'seed-one', nextCursor: 'page-two', hasMore: true }
        : request.cursor
          ? { items: [{ type: 'antique', id: 42, feedKey: 'a42' }], seed: 'seed-one', nextCursor: 'page-three', hasMore: false }
          : { items: [{ type: 'blessing', id: 99, feedKey: 'b99' }], seed: 'new-seed', nextCursor: '', hasMore: false }
    },
    decideBlessingApi: async () => ({}), rewindBlessingApi: async () => ({}),
    createMembershipRequestId: () => 'request-fixture', handleMembershipError: () => false,
    notifyBlessingChanged: change => events['blessing:changed']?.(change), openMembershipUpgrade() {},
    uni: {
      $on: (name, callback) => { events[name] = callback }, $off: name => { delete events[name] },
      getStorageSync: key => key === 'AUTH_TOKEN' ? token : { id: 7 },
      navigateTo: options => { navigations.push(options) }, pageScrollTo: options => { scrolls.push(options) },
      stopPullDownRefresh() {}, showToast() {}, setNavigationBarTitle() {},
      createSelectorQuery: () => ({ select() { return this }, boundingClientRect() { return this }, exec() {} })
    }
  }
  runInNewContext(platformScript(platform) + `\nmodule.exports = {
    loadFeed, loadFeaturedFeed, openBlessingProfile, openFeaturedItem, handleEntryClick, setBlessingViewMode,
    profiles, deckProfiles, blessingRevision, blessingViewMode, loadedImageIds, hasMore,
    featuredItems, featuredSeed, featuredCursor, featuredHasMore, currentEntryIndex,
    membership, recommendationHeaderFixed, model,
    sheetProfileId: typeof sheetProfileId === 'undefined' ? undefined : sheetProfileId,
    closeSheet: typeof closeProfileSheet === 'undefined' ? undefined : closeProfileSheet
  }`, context)
  return {
    ...context.module.exports, hooks, events, navigations, scrolls, feedRequests, featuredRequests,
    currentLocale: context.currentLocale,
    setToken: value => { token = value }, membershipRequests: () => membershipRequests,
    async start() { hooks.show(); await context.module.exports.loadFeed({ isRefresh: true }); await tick() }
  }
}

for (const platform of ['H5', 'MP-WEIXIN', 'APP-PLUS']) {
 for (const mode of ['list', 'cards']) {
  test(`${platform} closing the profile sheet retains ${mode} items, page progress, image state and deck revision`, async () => {
    const h = harness(platform); await h.start()
    h.blessingViewMode.value = mode
    await h.loadFeed({ isRefresh: false })
    h.loadedImageIds.value.add('11')
    h.hooks.scroll({ scrollTop: 724 })
    const items = h.profiles.value, images = h.loadedImageIds.value, revision = h.blessingRevision.value
    h.openBlessingProfile(items[0])
    assert.equal(h.navigations.length, 0, 'all platforms open the profile in the current page')
    assert.equal(h.sheetProfileId.value, 11)
    h.closeSheet(); await tick()
    assert.equal(h.sheetProfileId.value, null)
    assert.equal(h.feedRequests.length, 2, 'closing must not request a fresh random candidate batch')
    assert.equal(h.profiles.value, items)
    assert.deepEqual(Array.from(h.profiles.value, item => item.profileId), [11, 12, 13])
    assert.equal(h.hasMore.value, false)
    assert.equal(h.loadedImageIds.value, images)
    assert.equal(h.blessingRevision.value, revision, 'the deck resets the photo index when revision changes')
    assert.equal(h.scrolls.length, 0, 'returning must not replace the native saved scroll position')
    assert.equal(h.recommendationHeaderFixed.value, mode === 'list')
  })
 }
}

for (const platform of ['H5', 'MP-WEIXIN', 'APP-PLUS']) {
 test(`${platform} featured blessing sheet preserves mixed item order, seed and pagination cursor`, async () => {
  const h = harness(platform); await h.start()
  h.currentEntryIndex.value = 0
  await h.loadFeaturedFeed({ isRefresh: true }); await h.loadFeaturedFeed({ isRefresh: false })
  const items = h.featuredItems.value
  h.openFeaturedItem(items[1])
  assert.equal(h.navigations.length, 0)
  assert.equal(h.sheetProfileId.value, 11)
  h.closeSheet(); await tick()
  assert.equal(h.featuredRequests.length, 2)
  assert.equal(h.feedRequests.length, 1)
  assert.equal(h.featuredItems.value, items)
  assert.deepEqual(Array.from(h.featuredItems.value, item => item.feedKey), ['m41', 'b11', 'a42'])
  assert.equal(h.featuredSeed.value, 'seed-one')
  assert.equal(h.featuredCursor.value, 'page-three')
  assert.equal(h.featuredHasMore.value, false)
 })
}

for (const change of [
  { profileId: 11, isLiked: true, decision: 'like' },
  { profileId: 11, decision: 'pass' },
  { profileId: 11, isLiked: false, rewound: true }
]) {
  test(`a real ${change.decision || 'rewind'} event updates visible candidates without reloading their random order`, async () => {
    const h = harness(); await h.start()
    const items = h.profiles.value
    if (change.rewound) h.events['blessing:changed']({ profileId: 11, decision: 'pass' })
    h.openBlessingProfile(h.profiles.value[0]); h.events['blessing:changed'](change)
    if (change.isLiked || change.decision === 'pass') assert.equal(h.deckProfiles.value.some(item => item.profileId === 11), false)
    else assert.deepEqual(Array.from(h.deckProfiles.value, item => item.profileId), [11, 12])
    await tick()
    assert.equal(h.feedRequests.length, 1)
    assert.equal(h.profiles.value, items)
    assert.equal(h.membershipRequests() > 1, true)
  })
}

test('manual pull to refresh after closing details still replaces candidates and resets image state', async () => {
  const h = harness(); await h.start()
  h.loadedImageIds.value.add('11')
  const revision = h.blessingRevision.value
  h.openBlessingProfile(h.profiles.value[0]); h.closeSheet(); await tick()
  assert.equal(h.feedRequests.length, 1)
  h.hooks.pull(); await tick()
  assert.equal(h.feedRequests.length, 2)
  assert.equal(h.profiles.value[0].profileId, 99)
  assert.equal(h.loadedImageIds.value.size, 0)
  assert.equal(h.blessingRevision.value, revision + 1)
})

test('changing the feed section still loads the selected feed after closing details', async () => {
  const h = harness(); await h.start()
  h.openBlessingProfile(h.profiles.value[0]); h.closeSheet()
  h.handleEntryClick(0, ''); await tick()
  assert.equal(h.feedRequests.length, 1)
  assert.equal(h.featuredRequests.length, 1)
  assert.equal(h.currentEntryIndex.value, 0)
})

for (const [item, url] of [
  [{ type: 'moment', id: 41 }, '/pages/moments/momentDetail?id=41'],
  [{ type: 'antique', id: 42, marketCategory: 'antique' }, '/pages/market/marketFeed?category=antique&postId=42'],
  [{ type: 'second_hand', id: 43, marketCategory: 'second_hand' }, '/pages/market/marketFeed?category=second_hand&postId=43']
]) {
 test(`${item.type} featured detail keeps its original route and refresh behavior`, async () => {
  const h = harness(); await h.start()
  await h.loadFeaturedFeed({ isRefresh: true })
  h.openFeaturedItem(item)
  assert.equal(h.navigations[0].url, url)
  h.hooks.show(); await tick()
  assert.equal(h.feedRequests.length, 2)
  assert.equal(h.featuredRequests.length, 2)
 })
}

for (const platform of ['H5', 'MP-WEIXIN', 'APP-PLUS']) {
 for (const childPage of ['membership', 'chat']) {
 test(`${platform} returning from ${childPage} keeps the open sheet and feed while refreshing quota`, async () => {
  const h = harness(platform); await h.start()
  h.openBlessingProfile(h.profiles.value[0])
  if (childPage === 'membership') h.events['blessing:changed']({ source: 'membership' })
  h.hooks.show(); await tick()
  assert.equal(h.feedRequests.length, 1)
  assert.equal(h.sheetProfileId.value, 11)
  assert.equal(h.membershipRequests(), childPage === 'membership' ? 3 : 2)
  h.closeSheet()
  h.hooks.show(); await tick()
  assert.equal(h.feedRequests.length, 2, 'closing a sheet must not leave a navigation-return exemption behind')
 })
 }
}

for (const platform of ['H5', 'MP-WEIXIN', 'APP-PLUS']) {
 test(`${platform} account change closes the old sheet and allows the next homepage refresh`, async () => {
  const h = harness(platform); await h.start()
  h.openBlessingProfile(h.profiles.value[0])
  h.setToken('viewer-two'); h.events['auth-session-changed']()
  assert.equal(h.sheetProfileId?.value, null)
  h.hooks.show(); await tick()
  assert.equal(h.feedRequests.length, 2)
  assert.equal(h.profiles.value[0].profileId, 99)
 })
}

test('unmounting the homepage unregisters its account and blessing event listeners', async () => {
  const h = harness(); await h.start()
  h.hooks.unmount()
  assert.equal(h.events['auth-session-changed'], undefined)
  assert.equal(h.events['blessing:changed'], undefined)
})
