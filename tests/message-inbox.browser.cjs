// Real uni-app H5 regression. API calls and external resources are intercepted.
// No live notifications, profiles, likes or messages can be modified by this test.
// NODE_PATH=<Playwright runtime> node tests/message-inbox.browser.cjs
// Optional: H5_BASE_URL, QA_SCREENSHOT_DIR, QA_TEST_FILTER, BROWSER_CHANNEL.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { chromium } = require('playwright')

const root = path.resolve(__dirname, '..')
const base = new URL(process.env.H5_BASE_URL || 'http://127.0.0.1:5173/app/')
const output = process.env.QA_SCREENSHOT_DIR || path.resolve(root, '../.lovesapp-runtime/message-inbox-qa')
const inboxRoute = 'pages/notice/notice'
const filter = process.env.QA_TEST_FILTER ? new RegExp(process.env.QA_TEST_FILTER, 'i') : null
const portrait = name => `${base.origin}/__inbox_qa__/${name}.svg`
const user = { id: 99, accountLevel: 2, email: 'inbox-qa@example.invalid', name: 'QAOwner', avatar_url: portrait('owner') }
const mutualPeople = [
  { profileId: 201, userId: 301, displayName: '互赞一号', avatarUrl: portrait('mutual-1'), photoUrl: portrait('mutual-1'), mutual: true, locked: false },
  { profileId: 202, userId: 302, displayName: 'Mutual Second Person', avatarUrl: portrait('mutual-2'), photoUrl: portrait('mutual-2'), mutual: true, locked: false },
  { profileId: 203, userId: 303, displayName: '互赞第三页成员', avatarUrl: portrait('mutual-3'), photoUrl: portrait('mutual-3'), mutual: true, locked: false }
]
const groups = [
  { id: 71, name: '测试沟通群', members: [], status: 'active', last_message: 'QALatestConversation', last_message_at: '2026-09-17T09:10:00Z', unread_count: 127 },
  { id: 72, name: '历史沟通群', members: [], status: 'dissolved', last_message: 'QAOldConversation', last_message_at: '2026-09-16T07:00:00Z', unread_count: 0 }
]

async function main() {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use the local H5 runtime only')
  fs.mkdirSync(output, { recursive: true })
  const { translate } = await import(pathToFileURL(path.join(root, 'utils/locale.js')).href)
  const defaults = { locale: 'zh-Hans', canViewLikes: false, empty: false, mutualFailure: false, incomingFailure: false, membershipFailure: false, incomingCount: 120, interactionUnread: 129, profileUnread: 120, mutualPeople, groups, accountLevel: 2 }
  const state = { ...defaults, requests: [], unexpectedWrites: [], blockedExternal: [] }
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference', serviceWorkers: 'block' })
  const page = await context.newPage(), errors = [], results = []
  page.setDefaultTimeout(7000)
  page.on('pageerror', error => errors.push(error.message))
  const send = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: {
    'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*'
  }, body: JSON.stringify(body) })
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname, method = request.method()
    if (endpoint.startsWith('/api/')) {
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } })
      let data = {}; try { data = request.postDataJSON() || {} } catch (_) {}
      state.requests.push({ endpoint, method, data, query: Object.fromEntries(url.searchParams) })
      if (endpoint === '/api/auth/validate') return send(route, { valid: true, user: { ...user, accountLevel: state.accountLevel } })
      if (endpoint.startsWith('/api/locale/')) return send(route, { effectiveLocale: state.locale, localeMode: 'manual', preferredLocale: state.locale })
      if (endpoint.startsWith('/api/presence/')) return send(route, { stale: false })
      if (endpoint === '/api/notifications/unread-count') return send(route, { totalUnread: state.interactionUnread + 127, interactionUnread: state.interactionUnread, profileLikeUnread: state.profileUnread, chatUnread: 127 })
      if (endpoint === '/api/notifications') return send(route, { notifications: state.empty ? [] : [
        { id: 901, type: 'profile_like', target_type: 'profile', target_id: 20, actor_name: '点赞的人', actor_avatar_url: portrait('incoming-clear'), locked: !state.canViewLikes, is_read: false, created_at: '2026-09-17T09:00:00Z' }
      ], interactionReadThroughId: 901 })
      if (endpoint === '/api/notifications/interactions/read') { state.interactionUnread = 0; return send(route, { success: true }) }
      if (endpoint === '/api/notifications/profile-likes/view') {
        if (state.canViewLikes) state.profileUnread = Math.max(0, state.profileUnread - 1)
        return send(route, { success: true, marked: state.canViewLikes })
      }
      if (endpoint === '/api/membership') return state.membershipFailure ? send(route, { error: 'Membership temporarily unavailable' }, 503) : send(route, {
        accountLevel: state.accountLevel, tierLevel: state.canViewLikes ? 3 : 2, canViewLikes: state.canViewLikes, plans: [], usage: {}
      })
      if (endpoint === '/api/blessings/likes') {
        const direction = url.searchParams.get('direction'), pageNumber = Number(url.searchParams.get('page') || 1)
        if (direction === 'mutual') {
          if (state.mutualFailure) return send(route, { error: 'Mutual likes temporarily unavailable' }, 503)
          return send(route, { items: state.empty ? [] : state.mutualPeople.slice((pageNumber - 1) * 2, pageNumber * 2), total: state.empty ? 0 : state.mutualPeople.length, hasMore: !state.empty && pageNumber * 2 < state.mutualPeople.length })
        }
        if (direction === 'incoming') {
          if (state.incomingFailure) return send(route, { error: 'Incoming likes temporarily unavailable' }, 503)
          const incoming = state.canViewLikes
            ? { profileId: 204, userId: 304, displayName: '点赞的人', avatarUrl: portrait('incoming-clear'), photoUrl: portrait('incoming-clear'), mutual: false, locked: false, unread: true }
            : { rowKey: 'locked-one', previewUrl: portrait('locked-preview'), maskedDisplayName: '点•••', locked: true }
          return send(route, { items: state.empty ? [] : [incoming], total: state.empty ? 0 : state.incomingCount, hasMore: false })
        }
        // A non-mutual outgoing person must never be used to populate the mutual rail.
        return send(route, { items: [{ profileId: 999, userId: 998, displayName: 'One sided only', avatarUrl: portrait('not-mutual'), mutual: false, locked: false }], total: 1, hasMore: false })
      }
      if (endpoint === '/api/chat-groups') return send(route, { groups: state.empty ? [] : state.groups })
      if (endpoint === '/api/chat-requests') return send(route, { requests: [{ id: 1001, status: 'pending' }] })
      if (/^\/api\/search\/candidates\/\d+$/.test(endpoint)) {
        const id = Number(endpoint.split('/').at(-1)), person = state.mutualPeople.find(item => item.profileId === id)
        return send(route, { profile: { id, user_id: person?.userId || 304, native_last_name: person?.displayName || '点赞的人', birth_year: 2000,
          avatar_url: person?.avatarUrl || portrait('incoming-clear'), photos: [person?.photoUrl || portrait('incoming-clear')], Selfintroduction: 'QA Profile introduction', bio: 'QA signature' }, incomingLikeId: state.canViewLikes ? 1301 : null })
      }
      if (/^\/api\/explore\/profiles\/\d+\/likes$/.test(endpoint)) return send(route, { isLiked: true, total: 2, likes: [] })
      if (/^\/api\/chat-requests\/status\/\d+$/.test(endpoint)) return send(route, { status: 'none', isLiked: true, mutual: true, groupId: null })
      if (endpoint === '/api/profile') return send(route, { profile: { id: 20, user_id: 99, avatar_url: user.avatar_url }, careers: [] })
      if (method !== 'GET') { state.unexpectedWrites.push({ endpoint, data }); return send(route, { error: 'Unexpected write blocked by test' }, 500) }
      return send(route, { items: [], groups: [], members: [], messages: [], notifications: [], total: 0 })
    }
    if (endpoint.startsWith('/__inbox_qa__/')) {
      if (endpoint.includes('broken-avatar')) return route.fulfill({ status: 404, body: '' })
      const locked = endpoint.includes('locked-preview'), color = endpoint.includes('mutual-1') ? '#699dad' : endpoint.includes('mutual-2') ? '#ac8f78' : '#b7a88b'
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="240"><defs><filter id="blur"><feGaussianBlur stdDeviation="22"/></filter></defs><g ${locked ? 'filter="url(#blur)"' : ''}><rect width="180" height="240" fill="${color}"/><circle cx="90" cy="76" r="39" fill="#f2deca"/><ellipse cx="90" cy="237" rx="79" ry="106" fill="#6e7774"/></g></svg>` })
    }
    if (url.origin !== base.origin) { state.blockedExternal.push(url.origin); return route.abort() }
    return route.continue()
  })
  await page.goto(base.href, { waitUntil: 'networkidle' })
  async function visit(overrides = {}) {
    Object.assign(state, defaults, overrides)
    await page.evaluate(({ user, locale, accountLevel }) => {
      uni.setStorageSync('AUTH_TOKEN', 'inbox-fixture')
      uni.setStorageSync('USER_INFO', { ...user, accountLevel })
      uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale })
      uni.setStorageSync('PROFILE_LIKE_DOUBLE_TAP_GUIDE_V2', true)
    }, { user, locale: state.locale, accountLevel: state.accountLevel })
    await page.goto('about:blank')
    await page.goto(base.href + '#/' + inboxRoute, { waitUntil: 'networkidle' })
    await page.locator('.message-likes-section').waitFor({ state: 'visible' })
    await page.locator('.interaction-row').waitFor({ state: 'visible' })
  }
  const likeReads = () => state.requests.filter(request => ['/api/notifications/profile-likes/view', '/api/notifications/read', '/api/notifications/interactions/read'].includes(request.endpoint))
  const source = locator => locator.evaluate(el => el.getAttribute('src') || el.querySelector('img')?.getAttribute('src') || '')
  const shot = name => page.screenshot({ path: path.join(output, name + '.png'), fullPage: true })
  const box = selector => page.locator(selector).first().boundingBox()
  async function scrollInbox(top) {
    await page.locator('.message-page').evaluate((el, top) => {
      let container = el
      while (container && container !== document.body && container !== document.documentElement && !(container.scrollHeight - container.clientHeight > 20 && /auto|scroll/.test(getComputedStyle(container).overflowY))) container = container.parentElement
      if (container === document.body || container === document.documentElement) container = document.scrollingElement
      if (container) container.scrollTo({ top, behavior: 'instant' })
      else window.scrollTo({ top, behavior: 'instant' })
    }, top)
    await page.waitForTimeout(100)
  }
  async function checkMutualBadges(locale) {
    const cards = await page.locator('.mutual-card').evaluateAll(elements => elements.map(card => {
      const portrait = card.querySelector('.mutual-portrait'), name = card.querySelector('.like-card-name'), badge = card.querySelector('.mutual-badge')
      const rect = element => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height } }
      const image = badge?.querySelector('img')
      return { portrait: rect(portrait), name: rect(name), badge: badge ? rect(badge) : null, hearts: image?.getAttribute('src') || badge?.getAttribute('src') || '', imageLoaded: !!image?.complete && image.naturalWidth > 0 }
    }))
    assert.ok(cards.length > 0, `${locale}: fixture must show mutual people`)
    for (const card of cards) {
      assert.ok(card.badge, `${locale}: every mutual portrait needs a mutual badge`)
      assert.match(card.hearts, /mutual-hearts\.png/, `${locale}: mutual badge must show the pair of hearts`)
      assert.ok(card.imageLoaded, `${locale}: the pair of hearts image must load`)
      assert.ok(card.badge.left >= card.portrait.left + card.portrait.width / 2 && card.badge.right <= card.portrait.right + 1, `${locale}: badge must stay at the portrait's right edge`)
      assert.ok(card.badge.top >= card.portrait.top - 1 && card.badge.bottom < card.portrait.top + card.portrait.height / 2, `${locale}: badge must stay in the portrait's upper half`)
      assert.ok(card.name.top >= card.portrait.bottom && card.name.top > card.badge.bottom, `${locale}: badge must never cover the name below the portrait`)
    }
  }
  async function checkRetryLayout(locale) {
    await page.locator('.likes-retry').first().waitFor({ state: 'visible' })
    const buttons = await page.locator('.likes-retry').evaluateAll(elements => elements.map(button => {
      const label = button.querySelector('.retry-label'), text = button.querySelector('.retry-label-text')
      if (!label || !text) return { missingLabel: true }
      const box = el => { const rect = el.getBoundingClientRect(); return { width: rect.width, height: rect.height, centerX: rect.x + rect.width / 2, centerY: rect.y + rect.height / 2 } }
      const contentFits = el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1
      return { button: box(button), label: box(label), text: box(text), background: getComputedStyle(button).backgroundColor,
        contentFits: contentFits(button) && contentFits(label) && contentFits(text) }
    }))
    for (const item of buttons) {
      assert.ok(!item.missingLabel, `${locale}: retry must have a separate visual label`)
      assert.ok(item.button.width >= 44 && item.button.height >= 44, `${locale}: retry touch target must remain at least 44px`)
      assert.ok(item.button.height <= 45, `${locale}: retry touch target must stay compact`)
      assert.ok(item.background === 'transparent' || /^rgba\([^)]*,\s*0\)$/.test(item.background), `${locale}: outer retry touch target must be transparent`)
      assert.ok(item.label.height >= 32, `${locale}: retry visual label must remain readable`)
      if (locale.startsWith('zh')) assert.ok(item.label.height <= 34, `${locale}: Chinese retry pill must be visibly smaller than its touch target`)
      for (const axis of ['centerX', 'centerY']) {
        assert.ok(Math.abs(item.button[axis] - item.label[axis]) <= 1, `${locale}: retry pill must be centered in its touch target (${axis})`)
        assert.ok(Math.abs(item.label[axis] - item.text[axis]) <= 1, `${locale}: retry text must be centered in the pill (${axis})`)
      }
      assert.ok(item.contentFits, `${locale}: retry content must not clip or overflow`)
    }
  }
  async function check(name, work) {
    if (filter && !filter.test(name)) return
    try { await work(); results.push({ name, pass: true }); console.log('PASS ' + name) }
    catch (error) { results.push({ name, pass: false, error: error.stack || error.message }); console.error('FAIL ' + name + ': ' + error.message); await shot('failure-' + results.length).catch(() => {}) }
  }
  try {
    await check('new likes prefer avatar and recover with uploaded photo when absent or broken', async () => {
      await visit({ canViewLikes: true, mutualPeople: [
        { ...mutualPeople[0], avatarUrl: portrait('avatar-priority'), photoUrl: portrait('uploaded-fallback') },
        { ...mutualPeople[1], avatarUrl: '', photoUrl: portrait('no-avatar-upload') }
      ] })
      await page.locator('.mutual-card[data-profile-id="201"] .like-photo').waitFor()
      assert.match(await source(page.locator('.mutual-card[data-profile-id="201"] .like-photo')), /avatar-priority/)
      assert.match(await source(page.locator('.mutual-card[data-profile-id="202"] .like-photo')), /no-avatar-upload/)
      await visit({ canViewLikes: true, mutualPeople: [{ ...mutualPeople[0], avatarUrl: portrait('broken-avatar'), photoUrl: portrait('broken-upload-fallback') }] })
      await page.waitForFunction(() => document.querySelector('.mutual-card .like-photo img')?.src.includes('broken-upload-fallback'))
      await shot('avatar-priority-fallback')
    })
    await check('below silver shows protected first photo and clear mutual people only', async () => {
      await visit()
      const nativeHeaders = await page.locator('uni-page-head').evaluateAll(elements => elements.filter(el => {
        const style = getComputedStyle(el), rect = el.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      }).length)
      assert.equal(nativeHeaders, 0, 'Message page must not display a duplicate native navigation header')
      assert.ok((await page.locator('.message-likes-section').innerText()).includes('新的点赞'))
      assert.equal(await page.locator('.mutual-card').count(), 2)
      assert.match(await source(page.locator('.received-likes-card uni-image').first()), /locked-preview/)
      assert.match(await source(page.locator('.mutual-card[data-profile-id="201"] uni-image').first()), /mutual-1/)
      assert.match(await source(page.locator('.mutual-card[data-profile-id="202"] uni-image').first()), /mutual-2/)
      assert.equal(await page.locator('.mutual-card[data-profile-id="999"]').count(), 0)
      const filters = await page.locator('.mutual-card uni-image').evaluateAll(elements => elements.map(el => getComputedStyle(el).filter))
      assert.ok(filters.every(value => value === 'none'))
      assert.ok(state.requests.some(request => request.endpoint === '/api/blessings/likes' && request.query.direction === 'mutual'))
      await shot('bronze-inbox')
    })
    await check('silver membership reveals received preview without changing mutual cards', async () => {
      await visit({ canViewLikes: true, accountLevel: 3 })
      assert.match(await source(page.locator('.received-likes-card uni-image').first()), /incoming-clear/)
      assert.equal(await page.locator('.mutual-card').count(), 2)
      await shot('silver-inbox')
    })
    await check('mutual portraits show double hearts while keeping every nickname below the photo', async () => {
      await visit()
      await checkMutualBadges('zh-Hans')
      assert.deepEqual(await page.locator('.mutual-card .like-card-name').allTextContents(), ['互赞一号', 'Mutual Second Person'])
      assert.equal(await page.locator('.received-likes-card .mutual-badge').count(), 0, 'Incoming likes must retain their distinct badge')
      await shot('mutual-names-and-badges')
    })
    await check('missing empty and whitespace mutual names use the localized user fallback', async () => {
      const unnamed = mutualPeople.map((person, index) => ({ ...person, displayName: [undefined, '', '   \t  '][index] }))
      for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']) {
        await visit({ locale, mutualPeople: unnamed })
        await page.locator('.rail-more').click()
        await page.locator('.mutual-card[data-profile-id="203"]').waitFor({ state: 'visible' })
        assert.deepEqual(await page.locator('.mutual-card .like-card-name').allTextContents(), Array(3).fill(translate(locale, 'messageInbox.mutualNameFallback')), `${locale}: blank names should remain user labels`)
        const labels = await page.locator('.mutual-card').evaluateAll(cards => cards.map(card => card.getAttribute('aria-label')))
        assert.ok(labels.every(label => label.includes(translate(locale, 'messageInbox.mutualNameFallback'))), `${locale}: profile buttons must announce the fallback name`)
      }
    })
    await check('message header stays fixed over scrolling content with a blurred background', async () => {
      await visit({ groups: Array.from({ length: 24 }, (_, index) => ({ ...groups[0], id: 100 + index, name: '滚动沟通群 ' + index })) })
      const before = await box('.header'), contentBefore = await box('.message-likes-section')
      assert.ok(contentBefore.y >= before.y + before.height - 1, 'Initial likes content must clear the complete header')
      await scrollInbox(190)
      const after = await box('.header'), contentAfter = await box('.message-likes-section')
      assert.ok(contentBefore.y - contentAfter.y >= 150, 'Scroll fixture must actually move the page content')
      assert.ok(Math.abs(after.y - before.y) <= 1, 'Message title and search must stay in place while content scrolls')
      const glass = await page.locator('.header-surface').evaluate(el => {
        const styles = [getComputedStyle(el), getComputedStyle(el, '::before'), getComputedStyle(el, '::after')]
        return styles.map(style => ({ backdrop: style.backdropFilter || style.webkitBackdropFilter, opacity: style.opacity, background: style.backgroundColor }))
      })
      assert.ok(glass.some(style => /blur\((?!0(?:px)?\))/.test(style.backdrop || '') && Number(style.opacity) > 0), 'Scrolling beneath the header must retain a visible backdrop blur')
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.header-surface'), '::after').opacity) === 0)
      assert.equal(await page.locator('.page-title').evaluate(el => getComputedStyle(el).filter), 'none', 'The title itself must remain sharp')
      const search = await box('.message-search-toggle')
      assert.ok(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.message-search-toggle'), { x: search.x + search.width / 2, y: search.y + search.height / 2 }), 'Scrolled content must not intercept the fixed search button')
      await page.screenshot({ path: path.join(output, 'header-scrolled-glass.png') })
    })
    await check('opening and closing fixed search keeps content clear of the header at narrow widths', async () => {
      await page.setViewportSize({ width: 320, height: 780 })
      try {
        for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']) {
          await visit({ locale })
          const headerBefore = await box('.header'), likesBefore = await box('.message-likes-section')
          await page.locator('.message-search-toggle').click()
          await page.locator('.message-search-close').waitFor({ state: 'visible' })
          await page.waitForTimeout(250)
          const headerOpen = await box('.header'), likesOpen = await box('.message-likes-section'), input = await box('.search-input')
          assert.ok(Math.abs(headerOpen.y - headerBefore.y) <= 1, `${locale}: opening search must keep the header fixed at the top`)
          assert.ok(likesOpen.y >= headerOpen.y + headerOpen.height - 1, `${locale}: expanding search must not cover the likes heading`)
          assert.ok(Math.abs((likesOpen.y - likesBefore.y) - (headerOpen.height - headerBefore.height)) <= 2, `${locale}: content spacing must follow the expanded header's actual height`)
          assert.ok(input.width >= 90 && input.x >= headerOpen.x && input.y >= headerOpen.y && input.y + input.height <= headerOpen.y + headerOpen.height + 1, `${locale}: search input must remain visible within the header`)
          assert.ok(await page.locator('.header').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${locale}: search header must fit 320px`)
          await page.locator('.search-input input').fill('QALatestConversation')
          assert.equal(await page.locator('.conversation-row').count(), 1)
          await shot('search-open-' + locale)
          await page.locator('.message-search-close').click()
          await page.locator('.message-search-close').waitFor({ state: 'hidden' })
          await page.waitForTimeout(250)
          const headerClosed = await box('.header'), likesClosed = await box('.message-likes-section')
          assert.ok(Math.abs(headerClosed.y - headerBefore.y) <= 1 && Math.abs(headerClosed.height - headerBefore.height) <= 1, `${locale}: closing search must restore the same header bounds`)
          assert.ok(Math.abs(likesClosed.y - likesBefore.y) <= 1, `${locale}: closing search must preserve likes placement; ${JSON.stringify({ headerBefore, likesBefore, headerOpen, likesOpen, headerClosed, likesClosed, spacer: await box('.header-spacer'), scrollTop: await page.evaluate(() => document.scrollingElement.scrollTop) })}`)
          assert.equal(await page.locator('.conversation-row').count(), 2, `${locale}: closing search must restore all conversations`)
        }
      } finally { await page.setViewportSize({ width: 390, height: 844 }) }
    })
    await check('all mutual pages are reachable and profile sheet returns to the same rail', async () => {
      await visit(); await page.locator('.rail-more').click()
      await page.locator('.mutual-card[data-profile-id="203"]').waitFor({ state: 'visible' })
      assert.equal(await page.locator('.mutual-card').count(), 3)
      assert.ok(state.requests.some(request => request.endpoint === '/api/blessings/likes' && request.query.direction === 'mutual' && request.query.page === '2'))
      await page.locator('.mutual-card[data-profile-id="203"]').click()
      await page.locator('.profile-sheet-host .profile-name').filter({ hasText: '互赞第三页成员' }).waitFor()
      assert.ok(page.url().endsWith(inboxRoute))
      await page.waitForTimeout(300)
      await page.locator('.profile-back').click()
      assert.equal(await page.locator('.profile-sheet-host').count(), 1, 'Sheet must stay mounted during exit')
      await page.waitForTimeout(80)
      const transform = await page.locator('.profile-sheet-layer').evaluate(el => getComputedStyle(el).transform)
      const y = transform.startsWith('matrix3d(') ? Number(transform.slice(9, -1).split(',')[13]) : Number(transform.slice(7, -1).split(',')[5])
      assert.ok(y > 0, 'Closing profile must move down')
      await page.locator('.profile-sheet-host').waitFor({ state: 'hidden' })
      assert.equal(await page.locator('.mutual-card').count(), 3)
      assert.ok(page.url().endsWith(inboxRoute))
    })
    await check('first card opens incoming Likes without acknowledging anyone', async () => {
      await visit(); const before = likeReads().length
      await page.locator('.received-likes-card').click()
      await page.locator('.likes-page').waitFor()
      await page.locator('.likes-tabs .active').filter({ hasText: translate('zh-Hans', 'membership.incoming') }).waitFor()
      assert.equal(likeReads().length, before)
      assert.equal(state.profileUnread, defaults.profileUnread)
    })
    await check('interaction entry uses yellow fire and reads interactions separately from likes', async () => {
      await visit(); const before = likeReads().length
      const icon = await page.locator('.interaction-icon').evaluate(el => ({ color: getComputedStyle(el).backgroundColor, text: el.textContent }))
      const rgb = icon.color.match(/[\d.]+/g)?.map(Number) || []
      assert.ok(rgb[0] >= 230 && rgb[1] >= 175 && rgb[2] < 150, `Expected theme yellow, got ${icon.color}`)
      assert.ok(!icon.text.includes('🔥'), 'Use the local icon font rather than an emoji')
      await page.locator('.interaction-icon .uni-icons').waitFor()
      assert.equal(await page.locator('.interaction-row .badge').innerText(), '99+')
      await page.locator('.interaction-row').click()
      await page.locator('.interaction-page').waitFor()
      await page.waitForFunction(() => !document.querySelector('.interaction-page .state'))
      assert.equal(state.interactionUnread, 0)
      assert.equal(state.profileUnread, defaults.profileUnread)
      const reads = likeReads().slice(before)
      assert.deepEqual(reads.map(item => item.endpoint), ['/api/notifications/interactions/read'])
      assert.deepEqual(reads[0].data, { throughId: 901 })
    })
    await check('group messages retain summaries, unread counts and search behavior', async () => {
      await visit()
      const active = page.locator('.messages-panel .row').filter({ hasText: 'QALatestConversation' })
      await active.waitFor(); assert.equal(await active.locator('.badge').innerText(), '99+')
      await page.locator('.message-search-toggle').click()
      await page.locator('.search-input input').fill('QALatestConversation')
      assert.equal(await page.locator('.messages-panel .row').count(), 1)
      await page.locator('.search-input input').fill('does-not-match-qa')
      await page.locator('.search-empty').waitFor()
      await page.locator('.search-input input').fill('QALatestConversation')
      await active.click()
      await page.waitForURL('**/pages/chat/chatRoom?id=71')
    })
    await check('admin pending review entry remains available', async () => {
      await visit({ accountLevel: 5, canViewLikes: true })
      const pending = page.locator('.messages-panel .row').filter({ hasText: translate('zh-Hans', 'inbox.pendingRequests') })
      await pending.waitFor(); await pending.click()
      await page.waitForURL('**/pages/notice/chatRequestReview')
    })
    await check('empty likes remain intentional and do not display fake people', async () => {
      await visit({ empty: true, incomingCount: 0, interactionUnread: 0, profileUnread: 0 })
      assert.equal(await page.locator('.mutual-card').count(), 0)
      assert.equal(await page.locator('.rail-more').count(), 0)
      assert.equal(await page.locator('.likes-retry').count(), 0)
      assert.ok((await page.locator('.message-likes-section').innerText()).trim().length > '新的点赞'.length)
      await shot('empty-inbox')
    })
    await check('likes request failure has retry and recovers without losing conversations', async () => {
      await visit({ mutualFailure: true })
      await checkRetryLayout('zh-Hans')
      assert.ok((await page.locator('.messages-panel').innerText()).includes('QALatestConversation'))
      await shot('error-inbox')
      state.mutualFailure = false
      await page.locator('.likes-retry').first().click()
      await page.locator('.mutual-card[data-profile-id="201"]').waitFor()
      assert.equal(await page.locator('.mutual-card').count(), 2)
    })
    await check('six locales fit 320px and all capped badges use 99+', async () => {
      await page.setViewportSize({ width: 320, height: 780 })
      for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']) {
        await visit({ locale })
        const text = await page.locator('.message-likes-section').innerText()
        assert.ok(text.includes(translate(locale, 'messageInbox.newLikes')), `${locale}: new likes heading`)
        assert.ok(!/\b(?:inbox|membership|messageInbox)\.[A-Za-z]/.test(text), `${locale}: unresolved translation`)
        if (!locale.startsWith('zh')) assert.ok(!text.includes('新的点赞'), `${locale}: untranslated new likes title`)
        assert.ok(await page.locator('.page').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${locale}: page overflows viewport`)
        assert.ok(await page.locator('.messages-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${locale}: message panel overflows viewport`)
        await checkMutualBadges(locale)
        assert.equal(await page.locator('.interaction-row .badge').innerText(), '99+')
        assert.ok((await page.locator('.liquid-tabbar-badge').allTextContents()).every(value => value === '99+'))
        const labels = await page.locator('.liquid-tabbar-item').evaluateAll(items => items.map(item => {
          const label = item.querySelector('.liquid-tabbar-label'), box = item.getBoundingClientRect(), textBox = label.getBoundingClientRect(), style = getComputedStyle(label)
          return { inside: textBox.left >= box.left - 1 && textBox.right <= box.right + 1, overflow: style.overflowX,
            ellipsis: style.textOverflow, text: label.textContent, accessible: item.getAttribute('aria-label') }
        }))
        assert.equal(labels.length, 4)
        for (const label of labels) {
          assert.ok(label.inside, `${locale}: tab label extends beyond its button`)
          assert.equal(label.overflow, 'hidden', `${locale}: tab label must clip long text`)
          assert.equal(label.ellipsis, 'ellipsis')
          assert.equal(label.accessible, label.text, `${locale}: retain the complete accessible tab name`)
        }
        await shot('inbox-' + locale)
        await visit({ locale, mutualFailure: true, incomingFailure: true })
        await checkRetryLayout(locale)
        assert.equal(await page.locator('.likes-retry').count(), 2, `${locale}: cover both rail and incoming-likes retry buttons`)
        assert.ok(await page.locator('.message-page').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${locale}: failure layout overflows 320px viewport`)
        for (const selector of ['.rail-status', '.likes-feedback']) {
          assert.ok(await page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1), `${locale}: ${selector} error copy must wrap without clipping`)
        }
        await shot('error-inbox-' + locale)
      }
      assert.deepEqual(errors, [])
      await page.setViewportSize({ width: 390, height: 844 })
    })
    await check('only mocked read acknowledgements were sent and browser has no errors', async () => {
      assert.deepEqual(state.unexpectedWrites, [])
      assert.deepEqual(errors, [])
    })
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ results, errors, unexpectedWrites: state.unexpectedWrites, blockedExternal: [...new Set(state.blockedExternal)] }, null, 2))
    await browser.close()
  }
  if (results.some(item => !item.pass)) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
