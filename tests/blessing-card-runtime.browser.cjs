// Real uni-app H5 runtime with fixture-only APIs and real browser touch input.
// Start the local H5 server separately. This does not claim WeChat/device QA;
// blessing-card-controls.browser.cjs separately covers documented .stop semantics.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const { pathToFileURL } = require('node:url')
const { chromium } = require('playwright')
const root = path.resolve(__dirname, '..')
const base = new URL(process.env.H5_BASE_URL || 'http://127.0.0.1:5173/app/')
const output = process.env.QA_SCREENSHOT_DIR || path.resolve(root, '../.lovesapp-runtime/blessing-card-runtime-qa')
const testFilter = process.env.QA_TEST_FILTER ? new RegExp(process.env.QA_TEST_FILTER, 'i') : null
const touchDriver = process.env.QA_TOUCH_DRIVER || 'playwright'
const locales = ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
const photo = (id, index) => `${base.origin}/__card_qa__/profile-${id}-${index}.svg`
const profiles = Array.from({ length: 8 }, (_, index) => ({ profileId: index + 1, userId: index + 101,
  displayName: `QAProfile${index + 1}`, birthYear: 1996, photos: [photo(index + 1, 1), photo(index + 1, 2)],
  country: 'QACountry', region: 'QARegion', occupation: 'QAOccupation', bio: 'QAIntroduction', isLiked: false, likeCount: 0 }))

async function main() {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Only a local H5 server is allowed')
  fs.mkdirSync(output, { recursive: true })
  const { translate } = await import(pathToFileURL(path.join(root, 'utils/locale.js')).href)
  const state = { locale: 'zh-Hans', likes: 20, rewinds: 20, history: [], decisions: new Map(), writes: [], unexpectedWrites: [], delay: 0, nextAction: 1 }
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
  await context.addInitScript(() => {
    window.__cardTouchLog = []
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'click']) document.addEventListener(type, event => {
      if (!event.target.closest?.('.blessing-deck')) return
      window.__cardTouchLog.push({ type, target: event.target.className, time: performance.now(), cancelable: event.cancelable,
        touches: [...(event.touches || [])].map(point => ({ x: point.clientX, y: point.clientY })),
        changed: [...(event.changedTouches || [])].map(point => ({ x: point.clientX, y: point.clientY })) })
      window.__cardTouchLog = window.__cardTouchLog.slice(-80)
    }, { capture: true, passive: true })
  })
  const page = await context.newPage(), errors = [], failures = [], layouts = []
  const sharedTouchClient = touchDriver === 'cdp' ? await context.newCDPSession(page) : null
  let passed = 0, skipped = 0, phase = ''
  page.setDefaultTimeout(8000)
  page.on('pageerror', error => errors.push(error.message))
  const fulfill = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(data) })
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname, method = request.method()
    if (endpoint.startsWith('/api/')) {
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
      let data = {}; try { data = request.postDataJSON() || {} } catch (_) {}
      if (endpoint === '/api/auth/validate') return fulfill(route, { valid: true, user: { id: 99, accountLevel: 1, loginType: 'email', email: 'card-qa@example.invalid' } })
      if (endpoint.includes('/locale')) return fulfill(route, { effectiveLocale: state.locale, localeMode: 'manual', preferredLocale: state.locale })
      if (endpoint.startsWith('/api/presence/')) return fulfill(route, { stale: false })
      if (endpoint.endsWith('/unread-count')) return fulfill(route, { interactionUnread: 0, profileLikeUnread: 0, chatUnread: 0, chatRequestUnread: 0, totalUnread: 0 })
      if (endpoint === '/api/membership') return fulfill(route, { accountLevel: 1, tierLevel: 1, canSearch: false, canViewLikes: false,
        usage: { like: { remaining: state.likes }, comment: { remaining: 20 }, rewind: { remaining: state.rewinds } },
        rewind: { available: state.history.length > 0, actionId: state.history.at(-1)?.actionId }, plans: [] })
      if (endpoint === '/api/explore/feed') return fulfill(route, { profiles: profiles.filter(item => !state.decisions.has(item.profileId)), hasMore: false })
      if (endpoint === '/api/blessings/decisions' && method === 'POST') {
        state.writes.push({ endpoint, ...data })
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay))
        const result = { profileId: Number(data.profileId), isLiked: data.decision === 'like', likeCount: data.decision === 'like' ? 1 : 0,
          mutual: false, actionId: state.nextAction++ }
        state.decisions.set(result.profileId, data.decision)
        state.history.push({ ...result, decision: data.decision })
        if (result.isLiked) state.likes--
        return fulfill(route, result)
      }
      if (endpoint === '/api/blessings/rewind' && method === 'POST') {
        state.writes.push({ endpoint, ...data })
        const last = state.history.at(-1)
        if (!last || Number(data.actionId) !== last.actionId) return fulfill(route, { code: 'INVALID_REWIND', error: 'Wrong fixture action' }, 409)
        state.history.pop(); state.decisions.delete(last.profileId); state.rewinds--
        if (last.decision === 'like') state.likes++
        return fulfill(route, { profileId: last.profileId, isLiked: false, likeCount: 0, mutual: false })
      }
      if (method !== 'GET' && method !== 'HEAD') {
        state.unexpectedWrites.push({ endpoint, method }); return fulfill(route, { error: 'Unspecified fixture write blocked' }, 500)
      }
      return fulfill(route, { profiles: [], items: [], results: [], notifications: [], groups: [], requests: [], posts: [], total: 0, hasMore: false })
    }
    if (endpoint.startsWith('/__card_qa__/')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640"><rect width="480" height="640" fill="#aac0bc"/><circle cx="240" cy="210" r="95" fill="#f1dcc4"/><ellipse cx="240" cy="540" rx="185" ry="220" fill="#596971"/></svg>' })
    if (url.origin !== base.origin || !['GET', 'HEAD'].includes(method)) return route.abort()
    return route.continue()
  })
  const check = async (name, work) => {
    if (testFilter && !testFilter.test(name)) { skipped++; return }
    phase = 'starting'
    try { await work(); passed++; console.log(`PASS ${name}`) }
    catch (error) {
      const ui = await page.evaluate(() => ({ name: document.querySelector('.deck-name')?.textContent,
        quota: document.querySelector('.deck-quota')?.textContent, transform: document.querySelector('.deck-moving')?.getAttribute('style'),
        rewindDisabled: document.querySelector('.deck-rewind')?.getAttribute('disabled'), touches: window.__cardTouchLog,
        swipeInput: window.__cardSwipeInput, beforeRewind: window.__cardBeforeRewind })).catch(() => null)
      const failure = { name, phase, message: error.message, writes: state.writes, likes: state.likes, rewinds: state.rewinds, ui }
      failures.push(failure); console.error(`FAIL ${name} [${phase}]: ${error.message}`)
    }
  }
  const expectedQuota = () => translate(state.locale, 'deck.quota', { likes: String(state.likes), rewinds: String(state.rewinds) })
  const quotaReady = () => page.waitForFunction(text => document.querySelector('.deck-quota')?.textContent.trim() === text, expectedQuota())
  const reset = async (locale = 'zh-Hans') => {
    Object.assign(state, { locale, likes: 20, rewinds: 20, history: [], decisions: new Map(), writes: [], delay: 0, nextAction: 1 })
    await page.evaluate(locale => {
      uni.setStorageSync('AUTH_TOKEN', 'local-card-fixture-token')
      uni.setStorageSync('USER_INFO', { id: 99, accountLevel: 1, loginType: 'email', email: 'card-qa@example.invalid' })
      uni.setStorageSync('PROFILE_LIKE_DOUBLE_TAP_GUIDE_V2', true)
      uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale })
    }, locale)
    await page.goto('about:blank')
    await page.goto(`${base.href}#/pages/index/index360`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => document.querySelector('.deck-name')?.textContent.trim() === 'QAProfile1')
    await quotaReady()
  }
  const waitCard = id => page.waitForFunction(name => document.querySelector('.deck-name')?.textContent.trim() === name, `QAProfile${id}`)
  const center = async (selector, location = 'center') => page.locator(selector).evaluate((button, location) => {
    // A real child glyph can itself intercept events. Hit its geometric center,
    // without synthetic event dispatch or bypassing browser hit testing.
    const child = button.querySelector('uni-icons, .deck-action-icon, .deck-pass-icon, .deck-like-icon') || button.firstElementChild
    const target = location === 'icon' && child ? child : button
    const rect = target.getBoundingClientRect()
    return { x: rect.x + (location === 'edge' ? 5 : rect.width / 2), y: rect.y + rect.height / 2 }
  }, location)
  const tap = async (selector, location = 'center') => {
    const point = await center(selector, location)
    if (!sharedTouchClient) return page.touchscreen.tap(point.x, point.y)
    await sharedTouchClient.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)))
    await sharedTouchClient.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const decisionWrites = () => state.writes.filter(item => item.endpoint === '/api/blessings/decisions')
  const assertDecision = (decision, profileId = 1) => {
    assert.equal(decisionWrites().length, 1, 'one touch must issue exactly one decision request')
    const request = decisionWrites()[0]
    assert.equal(request.decision, decision); assert.equal(request.profileId, profileId); assert.equal(request.source, 'card')
    assert.ok(typeof request.requestId === 'string' && request.requestId.length > 5, 'mutation must carry its idempotency key')
  }
  const swipe = async direction => {
    const bounds = await page.locator('.deck-card').boundingBox(), y = bounds.y + bounds.height * .37
    const fractions = direction === 'like' ? [.25, .4, .55, .7, .85] : [.75, .6, .45, .3, .15]
    const client = sharedTouchClient || await context.newCDPSession(page)
    await page.evaluate(({ bounds, y, fractions }) => {
      const x = bounds.x + bounds.width * fractions[0]
      window.__cardSwipeInput = { bounds, x, y, hitTarget: document.elementFromPoint(x, y)?.className }
    }, { bounds, y, fractions })
    try {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width * fractions[0], y }] })
      for (const fraction of fractions.slice(1)) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds.x + bounds.width * fraction, y }] })
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } finally { if (!sharedTouchClient) await client.detach() }
  }
  try {
    await page.goto(base.href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.uni?.setStorageSync)
    for (const decision of ['like', 'pass']) for (const location of ['center', 'icon', 'edge']) await check(`real touch ${decision} at ${location} sends one correct request`, async () => {
      await reset(); await tap(`.deck-action-${decision}`, location)
      await waitCard(2); await quotaReady(); assertDecision(decision)
      assert.equal(state.likes, decision === 'like' ? 19 : 20)
    })
    await check('touching both controls repeatedly while the request is pending cannot write twice', async () => {
      await reset(); state.delay = 900
      await tap('.deck-action-like', 'icon')
      await page.waitForFunction(() => document.querySelector('.deck-stage')?.classList.contains('is-busy'))
      await tap('.deck-action-like', 'icon'); await tap('.deck-action-pass', 'icon'); await tap('.deck-action-like', 'edge')
      assert.equal((await page.locator('.deck-name').textContent()).trim(), 'QAProfile1', 'pending response must retain the card')
      assertDecision('like')
      await waitCard(2); await quotaReady(); assertDecision('like'); state.delay = 0
    })
    for (const decision of ['like', 'pass']) await check(`swipe ${decision} and rewind preserve quotas and card controls`, async () => {
      phase = 'reset'; await reset()
      phase = 'dispatching swipe'; await swipe(decision)
      phase = 'waiting for second card after swipe'; await waitCard(2)
      phase = 'waiting for quota after swipe'; await quotaReady(); assertDecision(decision)
      phase = 'waiting for rewind control to become enabled'
      await page.waitForFunction(() => {
        const button = document.querySelector('.deck-rewind')
        return button && !button.hasAttribute('disabled') && !button.classList.contains('uni-button-disabled') && button.getAttribute('aria-disabled') !== 'true'
      })
      await page.evaluate(() => {
        const button = document.querySelector('.deck-rewind')
        window.__cardBeforeRewind = { html: button.outerHTML, name: document.querySelector('.deck-name')?.textContent,
          busy: document.querySelector('.deck-stage')?.className, time: performance.now() }
      })
      phase = 'tapping rewind'
      await tap('.deck-rewind', 'icon')
      phase = 'waiting for restored first card'; await waitCard(1)
      phase = 'waiting for refunded quota'; await quotaReady()
      assert.equal(state.writes.filter(item => item.endpoint === '/api/blessings/rewind').length, 1)
      assert.equal(state.likes, 20, 'rewinding a like refunds the like; a pass never consumes it')
      assert.equal(state.rewinds, 19, 'successful rewind consumes its own quota')
      const transform = await page.locator('.deck-moving').evaluate(el => ({ value: getComputedStyle(el).transform, duration: getComputedStyle(el).transitionDuration }))
      assert.ok(await page.locator('.deck-moving').evaluate(el => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m41) < 1), 'restored card must be centered')
      assert.equal(transform.duration, '0s', 'restored card must not fly in again')
    })
    for (const viewport of [{ width: 320, height: 667 }, { width: 390, height: 844 }]) for (const locale of locales) await check(`card quota, controls and navigation fit ${viewport.width}px ${locale}`, async () => {
      await page.setViewportSize(viewport); await reset(locale)
      const layout = await page.evaluate(() => {
        const box = selector => { const el = document.querySelector(selector), r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom } }
        const selectors = ['.deck-stage', '.deck-quota', '.deck-rewind', '.deck-action-like', '.deck-action-pass', '.deck-actions', '.liquid-tabbar-dock']
        const boxes = Object.fromEntries(selectors.map(selector => [selector, box(selector)]))
        const hit = selector => {
          const el = document.querySelector(selector), r = el.getBoundingClientRect(), target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
          return !!target && (target === el || el.contains(target))
        }
        const quota = document.querySelector('.deck-quota')
        return { boxes, quotaInsideCard: !!quota.closest('.deck-stage'), quotaText: quota.textContent.trim(),
          clipped: quota.scrollWidth > quota.clientWidth + 2 || quota.scrollHeight > quota.clientHeight + 2,
          hits: ['.deck-action-like', '.deck-action-pass'].map(hit),
          gap: boxes['.liquid-tabbar-dock'].y - boxes['.deck-stage'].bottom }
      })
      layouts.push({ viewport, locale, ...layout })
      assert.equal(layout.quotaInsideCard, true, 'remaining quota must be inside the card')
      assert.equal(layout.quotaText, expectedQuota()); assert.equal(layout.clipped, false, 'translated quota must wrap without clipping')
      assert.deepEqual(layout.hits, [true, true], 'no invisible gesture overlay or navigation may intercept either control')
      const card = layout.boxes['.deck-stage'], quota = layout.boxes['.deck-quota'], rewind = layout.boxes['.deck-rewind'], nav = layout.boxes['.liquid-tabbar-dock']
      assert.ok(quota.x >= card.x && quota.right <= card.right && quota.y >= card.y && quota.bottom <= card.bottom, 'quota must remain within card bounds')
      assert.ok(quota.right <= rewind.x - 2, 'quota and rewind must not overlap')
      assert.ok(layout.gap >= -1 && layout.gap <= 28, `card/navigation gap must be compact without overlap, got ${layout.gap}px`)
      assert.ok(nav.bottom <= viewport.height + 1, 'tab bar must remain visible')
      for (const selector of ['.deck-action-like', '.deck-action-pass', '.deck-rewind']) {
        const r = layout.boxes[selector]
        assert.ok(r.width >= 44 && r.height >= 44, `${selector} must have at least a 44px touch target`)
        assert.ok(r.x >= 0 && r.right <= viewport.width && r.y >= card.y && r.bottom <= nav.y, `${selector} must not be hidden by navigation`)
      }
      if (locale === 'zh-Hans' || locale === 'ru') await page.screenshot({ path: path.join(output, `card-${viewport.width}-${locale}.png`) })
    })
    await check('no unexpected business writes or application exceptions', async () => { assert.deepEqual(state.unexpectedWrites, []); assert.deepEqual(errors, []) })
  } finally { if (sharedTouchClient) await sharedTouchClient.detach().catch(() => {}); await browser.close() }
  const report = { passed, skipped, failed: failures.length, filter: testFilter?.source || null, touchDriver, failures, limitation: 'Real H5 uni-app runtime with mocked APIs and Chrome touch input; not WeChat or physical-device testing.' }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  fs.writeFileSync(path.join(output, 'layout-metrics.json'), JSON.stringify(layouts, null, 2))
  console.log(JSON.stringify(report, null, 2)); assert.deepEqual(failures, [])
}
main().catch(error => { console.error(error); process.exitCode = 1 })
