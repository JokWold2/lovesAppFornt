// Actual uni-app H5 runtime. Start the local H5 server separately before running.
// All APIs and portraits are fixtures; no real account or server data is changed.
// H5_BASE_URL, BROWSER_CHANNEL and QA_SCREENSHOT_DIR may override local defaults.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const base = new URL(process.env.H5_BASE_URL || 'http://127.0.0.1:5173/app/')
const output = process.env.QA_SCREENSHOT_DIR || path.resolve(__dirname, '../../.lovesapp-runtime/profile-sheet-return-qa')
const homeRoute = 'pages/index/index360'
const detailRoute = 'pages/searchPerson/personShow/personShow'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }
const photo = (id, index) => `${base.origin}/__sheet_qa__/profile-${id}-${index}.svg`
const makeCandidate = id => ({ profileId: id, userId: id + 10000, displayName: `QAProfile${id}`, nativeFirstName: `QAProfile${id}`,
  birthYear: 1996, photos: [photo(id, 1), photo(id, 2), photo(id, 3)], avatarUrl: photo(id, 1), country: 'QACountry', region: 'QARegion',
  occupation: 'QAOccupation', bio: `QABio${id}`, likeCount: 7, commentCount: 0, isLiked: false })
const rawProfile = id => ({ id, user_id: id + 10000, native_first_name: `QAProfile${id}`, birth_year: 1996,
  photos: [photo(id, 1), photo(id, 2), photo(id, 3)], Selfintroduction: `QAIntroduction${id}\n${'A detailed fixture introduction. '.repeat(20)}`,
  occupation: 'QAOccupation', country: 'QACountry', region: 'QARegion', school_name: 'QASchool', hobby1: 'QAHobby' })

async function main() {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Only a local H5 server is allowed')
  fs.mkdirSync(output, { recursive: true })
  const state = { feedReads: 0, featuredReads: 0, requests: [], unexpectedWrites: [] }
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    reducedMotion: 'no-preference', serviceWorkers: 'block' })
  await context.addInitScript(() => {
    window.__sheetQaPopCount = 0
    window.addEventListener('popstate', () => window.__sheetQaPopCount++)
  })
  const page = await context.newPage(), failures = [], errors = []
  let passed = 0
  page.setDefaultTimeout(8000)
  page.on('pageerror', error => errors.push(error.message))
  const fulfill = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname, method = request.method()
    if (endpoint.startsWith('/api/')) {
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
      state.requests.push({ endpoint, method })
      if (endpoint === '/api/auth/validate') return fulfill(route, { valid: true, user: { id: 99, accountLevel: 4, loginType: 'email', email: 'sheet-qa@example.invalid' } })
      if (endpoint.includes('/locale')) return fulfill(route, { effectiveLocale: 'zh-Hans', localeMode: 'manual', preferredLocale: 'zh-Hans' })
      if (endpoint.startsWith('/api/presence/')) return fulfill(route, { stale: false })
      if (endpoint === '/api/membership') return fulfill(route, { accountLevel: 4, tierLevel: 4, canSearch: true, canViewLikes: true,
        usage: { like: { remaining: null }, comment: { remaining: null }, rewind: { remaining: null } }, rewind: { available: false },
        plans: [1, 2, 3, 4].map(level => ({ level, priceCents: [0, 0, 2000, 5000, 10000][level], currency: 'USD', permanent: true,
          likeLimit: level === 4 ? null : [0, 20, 50, 100][level], commentLimit: level === 4 ? null : [0, 20, 50, 100][level], rewindLimit: level === 4 ? null : [0, 20, 50, 100][level] })) })
      if (endpoint === '/api/blessings/likes') return fulfill(route, { items: [{ profileId: 80, userId: 10080, rowKey: 'qa-like-80',
        displayName: 'QAProfile80', avatarUrl: photo(80, 1), mutual: false, locked: false, unread: false }], total: 1, hasMore: false })
      if (endpoint.endsWith('/unread-count')) return fulfill(route, { interactionUnread: 0, profileLikeUnread: 0, chatUnread: 0, chatRequestUnread: 0, totalUnread: 0 })
      if (endpoint === '/api/explore/feed') {
        // A second fetch visibly changes every card. The test cannot accidentally
        // pass merely because a refreshed fixture happened to have the same IDs.
        const first = 1000 + (++state.feedReads) * 100
        return fulfill(route, { profiles: Array.from({ length: 10 }, (_, index) => makeCandidate(first + index)), hasMore: false })
      }
      if (endpoint === '/api/explore/featured-feed') {
        const first = 10000 + (++state.featuredReads) * 100
        const items = Array.from({ length: 6 }, (_, index) => {
          const id = first + index, type = index === 1 ? 'moment' : 'blessing'
          return { id, feedKey: `${type}:${id}`, type, author: { userId: id + 10000, name: `QAFeatured${id}`, avatarUrl: photo(id, 1) },
            primaryImageUrl: photo(id, 1), images: [photo(id, 1)], summary: `QAFeaturedSummary${id}`, meta: 'QAMeta', likeCount: 0, commentCount: 0, isLiked: false }
        })
        return fulfill(route, { items, seed: `qa-seed-${state.featuredReads}`, nextCursor: '', hasMore: false })
      }
      const candidateId = endpoint.match(/^\/api\/search\/candidates\/(\d+)$/)?.[1]
      if (candidateId) return fulfill(route, { profile: rawProfile(Number(candidateId)), incomingLikeId: null })
      if (/^\/api\/explore\/profiles\/\d+\/likes$/.test(endpoint)) return fulfill(route, { isLiked: false, total: 7, likes: [] })
      if (/^\/api\/chat-requests\/status\/\d+$/.test(endpoint)) return fulfill(route, { status: 'none', isLiked: false, mutual: false, groupId: null })
      if (method !== 'GET' && method !== 'HEAD') {
        state.unexpectedWrites.push({ endpoint, method })
        return fulfill(route, { error: 'Unspecified fixture write blocked' }, 500)
      }
      return fulfill(route, { notifications: [], interactionReadThroughId: 0, groups: [], requests: [], posts: [], results: [], items: [], profiles: [], comments: [], total: 0, hasMore: false })
    }
    if (endpoint.startsWith('/__sheet_qa__/')) {
      const index = Number(endpoint.match(/-(\d)\.svg$/)?.[1]) || 1
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640"><rect width="480" height="640" fill="${['', '#b8c7d2', '#d7b49a', '#aebbb0'][index]}"/><circle cx="240" cy="210" r="90" fill="#eee0c9"/><ellipse cx="240" cy="545" rx="180" ry="200" fill="#61717c"/><text x="30" y="610" font-size="42" fill="white">Photo ${index}</text></svg>` })
    }
    if (url.origin !== base.origin || !['GET', 'HEAD'].includes(method)) return route.abort()
    return route.continue()
  })
  const check = async (name, work) => {
    try { await work(); passed++; console.log(`PASS ${name}`) }
    catch (error) { failures.push({ name, message: error.message }); console.error(`FAIL ${name}: ${error.message}`) }
  }
  // URL inspection also produces a useful failed assertion if browser Back has
  // accidentally left the app (where uni's getCurrentPages no longer exists).
  const currentRoute = () => new URL(page.url()).hash.replace(/^#\/?/, '').split('?')[0]
  const counts = () => ({ feed: state.feedReads, featured: state.featuredReads })
  const sheet = () => page.locator('.profile-detail-sheet:visible')
  const freshHome = async () => {
    await page.goto('about:blank')
    await page.goto(`${base.href}#/${homeRoute}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => getApp().globalData.restoringSession === false && getCurrentPages().at(-1)?.route === 'pages/index/index360')
    await page.locator('.deck-name:visible').waitFor()
    await page.waitForTimeout(120)
  }
  const assertOpen = async (expectedName, expectedRoute = homeRoute) => {
    await sheet().waitFor()
    await page.waitForFunction(name => [...document.querySelectorAll('.profile-detail-sheet .profile-name')].some(el => el.textContent.trim() === name), expectedName)
    await page.waitForTimeout(300)
    assert.equal(await currentRoute(), expectedRoute, 'a detail sheet must not push a uni-app page')
    assert.equal(await sheet().count(), 1, 'only one sheet can be open')
    assert.equal(await page.locator('.liquid-tabbar-dock:visible').count(), 0, 'host tab bar must be hidden while the sheet is open')
    const matrix = await page.locator('.profile-sheet-layer:visible').evaluate(el => {
      const value = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      return { x: value.m41, y: value.m42 }
    })
    assert.ok(Math.abs(matrix.x) < 1 && Math.abs(matrix.y) < 1, 'open sheet must settle at its original position')
  }
  const assertClosed = async (expectedRoute = homeRoute) => {
    await page.waitForFunction(() => !document.querySelector('.profile-detail-sheet'))
    await page.waitForTimeout(150)
    assert.equal(await currentRoute(), expectedRoute, 'closing the sheet must keep the host page')
    assert.equal(await page.locator('.liquid-tabbar-dock:visible').count(), 1)
  }
  const closeSheet = async (expectedRoute = homeRoute) => { await sheet().locator('.profile-back').click(); await assertClosed(expectedRoute) }
  const deckState = () => page.locator('.blessing-deck:visible').evaluate(el => ({
    name: el.querySelector('.deck-name')?.textContent.trim(),
    photo: el.querySelector('.deck-card .deck-photo img')?.currentSrc || el.querySelector('.deck-card .deck-photo')?.getAttribute('src'),
    activePhoto: [...el.querySelectorAll('.deck-photo-dot')].findIndex(dot => dot.classList.contains('active'))
  }))
  try {
    await page.goto(base.href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.uni?.setStorageSync)
    await page.evaluate(() => {
      uni.setStorageSync('AUTH_TOKEN', 'local-sheet-fixture-token')
      uni.setStorageSync('USER_INFO', { id: 99, accountLevel: 4, loginType: 'email', email: 'sheet-qa@example.invalid' })
      uni.setStorageSync('PROFILE_LIKE_DOUBLE_TAP_GUIDE_V2', true)
      uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale: 'zh-Hans' })
    })
    await check('card detail returns to the same candidate and second photo without refreshing the feed', async () => {
      await freshHome()
      await page.locator('.deck-photo-zone:visible').nth(1).tap()
      await page.waitForFunction(() => document.querySelectorAll('.blessing-deck .deck-photo-dot')[1]?.classList.contains('active'))
      const before = await deckState(), reads = counts()
      assert.equal(before.activePhoto, 1)
      assert.ok(before.photo?.includes('-2.svg'), 'second portrait must actually be displayed')
      await page.locator('.deck-detail:visible').click(); await assertOpen(before.name)
      await page.screenshot({ path: path.join(output, 'card-detail-sheet-open.png') })
      await closeSheet()
      assert.deepEqual(await deckState(), before, 'candidate, photo URL and photo index must survive closing')
      assert.deepEqual(counts(), reads, 'read-only detail navigation must not refresh either feed')
      await page.screenshot({ path: path.join(output, 'card-detail-sheet-return.png') })
    })
    await check('the sheet scrolls independently and keeps its name header and actions fixed', async () => {
      await freshHome(); const name = (await deckState()).name
      await page.locator('.deck-detail:visible').click(); await assertOpen(name)
      const bounds = async () => ({ header: await sheet().locator('.profile-chrome').boundingBox(), actions: await sheet().locator('.profile-actions').boundingBox() })
      const before = await bounds(), hostY = await page.evaluate(() => window.scrollY)
      await sheet().locator('.profile-scroll').evaluate(el => {
        const scroller = [...el.querySelectorAll('.uni-scroll-view')].find(node => /auto|scroll/.test(getComputedStyle(node).overflowY)) || el
        scroller.scrollTop = 1500
        scroller.dispatchEvent(new Event('scroll'))
      })
      await page.waitForTimeout(100)
      const after = await bounds()
      assert.ok(Math.abs(before.header.y - after.header.y) < 1 && Math.abs(before.actions.y - after.actions.y) < 1)
      assert.equal(await page.evaluate(() => window.scrollY), hostY, 'sheet scrolling must not move the host document')
      assert.ok(await sheet().locator('.profile-scroll').evaluate(el => ([...el.querySelectorAll('.uni-scroll-view')].find(node => /auto|scroll/.test(getComputedStyle(node).overflowY)) || el).scrollTop > 100), 'detail contents must really scroll')
      await closeSheet()
    })
    await check('a scrolled blessing list returns to the same records and scroll offset', async () => {
      await freshHome()
      await page.locator('.blessing-view-switch > uni-button:visible').nth(1).click()
      const row = page.locator('.blessing-list:visible .post-card').nth(3)
      await row.locator('.post-header').scrollIntoViewIfNeeded()
      // Keep the clicked row below the sticky homepage chrome.
      await row.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 290))
      await page.waitForTimeout(120)
      const position = async () => ({ y: await page.evaluate(() => window.scrollY), row: await row.boundingBox(),
        overflow: await page.evaluate(() => ({ html: document.documentElement.style.overflow, body: document.body.style.overflow,
          htmlComputed: getComputedStyle(document.documentElement).overflowY, bodyComputed: getComputedStyle(document.body).overflowY })) })
      const before = { names: await page.locator('.blessing-list .username').allTextContents(), ...(await position()), reads: counts() }
      const name = (await row.locator('.username').textContent()).trim()
      assert.ok(before.y > 400, 'fixture must exercise a genuinely scrolled list')
      await row.locator('.post-header').click()
      const afterClick = await position()
      await assertOpen(name)
      const afterOpen = await position()
      await closeSheet()
      const afterClose = await position()
      fs.writeFileSync(path.join(output, 'list-return-position.json'), JSON.stringify({ before, afterClick, afterOpen, afterClose }, null, 2))
      assert.deepEqual(await page.locator('.blessing-list .username').allTextContents(), before.names)
      assert.ok(Math.abs(afterClose.y - before.y) <= 2,
        `closing must restore the exact list position: before=${before.y}, afterClick=${afterClick.y}, afterOpen=${afterOpen.y}, afterClose=${afterClose.y}; rowY before=${before.row?.y}, after=${afterClose.row?.y}`)
      assert.ok(Math.abs(afterOpen.row.y - before.row.y) <= 2, 'the list must stay in place behind the entering sheet')
      assert.deepEqual(counts(), before.reads)
      // Keep the original offset while a child route temporarily owns scrolling.
      await row.locator('.post-header').click(); await assertOpen(name)
      await page.evaluate(() => uni.navigateTo({ url: '/pages/membership/upgrade?reason=like' }))
      await page.locator('.membership-page:visible .benefits').waitFor()
      await page.mouse.move(195, 500); await page.mouse.wheel(0, 650)
      await page.waitForFunction(() => window.scrollY > 50)
      await page.locator('.membership-page:visible .close-button').click()
      await assertOpen(name)
      await page.evaluate(() => history.back()); await assertClosed()
      assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - before.y) <= 2, 'child route and browser Back must preserve the scrolled list')
      assert.deepEqual(counts(), before.reads)
    })
    await check('featured blessings open in place and preserve the mixed feed order', async () => {
      await freshHome(); await page.locator('.tab-pill:visible').nth(0).click()
      await page.locator('.featured-card').first().waitFor()
      const before = { names: await page.locator('.featured-card .username').allTextContents(), reads: counts() }
      const card = page.locator('.featured-card').first(), name = (await card.locator('.username').textContent()).trim()
      const id = Number(name.replace('QAFeatured', ''))
      await card.click(); await assertOpen(`QAProfile${id}`); await closeSheet()
      assert.deepEqual(await page.locator('.featured-card .username').allTextContents(), before.names)
      assert.deepEqual(counts(), before.reads)
    })
    await check('non-blessing featured cards retain their original detail navigation', async () => {
      await freshHome(); await page.locator('.tab-pill:visible').nth(0).click()
      await page.locator('.featured-card').first().waitFor()
      const momentId = 10000 + state.featuredReads * 100 + 1
      await page.locator('.featured-card').filter({ hasText: `QAFeatured${momentId}` }).click()
      await page.waitForFunction(() => getCurrentPages().at(-1)?.route === 'pages/moments/momentDetail')
      assert.equal(await page.locator('.profile-detail-sheet').count(), 0)
    })
    await check('close animates vertically down and repeated close taps cannot dismiss the homepage', async () => {
      await freshHome(); const name = (await deckState()).name, reads = counts()
      await page.locator('.deck-detail:visible').click(); await assertOpen(name)
      const samples = await page.evaluate(async () => {
        const layer = document.querySelector('.profile-sheet-layer'), button = document.querySelector('.profile-detail-sheet .profile-back')
        const samples = [], start = performance.now(), popBefore = window.__sheetQaPopCount
        button.click(); button.click()
        await new Promise(resolve => {
          function sample(now) {
            if (layer.isConnected) {
              const matrix = new DOMMatrixReadOnly(getComputedStyle(layer).transform)
              samples.push({ x: matrix.m41, y: matrix.m42, at: now - start })
            }
            if (now - start < 500) requestAnimationFrame(sample); else resolve()
          }
          requestAnimationFrame(sample)
        })
        return { frames: samples, popEvents: window.__sheetQaPopCount - popBefore }
      })
      assert.ok(samples.frames.length >= 2, 'close must remain mounted during its transition')
      assert.ok(samples.frames.some(frame => frame.y > 20), 'close transition must move down')
      assert.ok(samples.frames.every(frame => Math.abs(frame.x) < 1), 'close transition must not slide left or right')
      for (let index = 1; index < samples.frames.length; index++) assert.ok(samples.frames[index].y >= samples.frames[index - 1].y - 1, 'close should not reverse or restart its animation')
      assert.ok(samples.popEvents <= 1, 'repeated close taps may pop at most one history entry')
      await assertClosed(); assert.deepEqual(counts(), reads)
      fs.writeFileSync(path.join(output, 'close-animation.json'), JSON.stringify(samples, null, 2))
    })
    await check('browser Back closes the sheet and retains the homepage and current card', async () => {
      await freshHome(); const before = await deckState(), reads = counts()
      const previousHref = page.url()
      await page.locator('.deck-detail:visible').click(); await assertOpen(before.name)
      await page.evaluate(() => history.back())
      await assertClosed()
      assert.equal(page.url(), previousHref, 'browser Back must leave the host route unchanged')
      assert.deepEqual(await deckState(), before); assert.deepEqual(counts(), reads)
    })
    await check('membership opened above a detail can scroll and returns to the same sheet and second photo', async () => {
      await freshHome()
      await page.locator('.deck-photo-zone:visible').nth(1).tap()
      await page.waitForFunction(() => document.querySelectorAll('.blessing-deck .deck-photo-dot')[1]?.classList.contains('active'))
      const before = await deckState(), reads = counts()
      const originalOverflow = await page.evaluate(() => ({ html: document.documentElement.style.overflow, body: document.body.style.overflow }))
      await page.locator('.deck-detail:visible').click(); await assertOpen(before.name)
      assert.deepEqual(await page.evaluate(() => ({ html: document.documentElement.style.overflow, body: document.body.style.overflow })), { html: originalOverflow.html, body: 'hidden' })
      // This is the same route used by a quota rejection; deliberately avoid
      // writing a like merely to exercise navigation and scroll ownership.
      await page.evaluate(() => uni.navigateTo({ url: '/pages/membership/upgrade?reason=like' }))
      await page.locator('.membership-page:visible .benefits').waitFor()
      assert.equal(currentRoute(), 'pages/membership/upgrade')
      assert.deepEqual(await page.evaluate(() => ({ html: document.documentElement.style.overflow, body: document.body.style.overflow })), originalOverflow,
        'the hidden detail sheet must release the global document scroll lock')
      const headlineBefore = await page.locator('.membership-page:visible .headline').boundingBox()
      await page.mouse.move(195, 500); await page.mouse.wheel(0, 650)
      await page.waitForFunction(() => window.scrollY > 50)
      const headlineAfter = await page.locator('.membership-page:visible .headline').boundingBox()
      assert.ok(headlineAfter.y < headlineBefore.y - 50, 'membership content must respond to a real wheel scroll')
      await page.screenshot({ path: path.join(output, 'membership-above-sheet-scrolled.png') })
      await page.locator('.membership-page:visible .close-button').click()
      await assertOpen(before.name)
      assert.deepEqual(counts(), reads, 'returning from membership must not refresh either homepage feed')
      assert.deepEqual(await page.evaluate(() => ({ html: document.documentElement.style.overflow, body: document.body.style.overflow })), { html: originalOverflow.html, body: 'hidden' },
        'the visible detail must reacquire its background lock')
      await closeSheet()
      assert.deepEqual(await deckState(), before, 'card and selected photo must survive the child-page round trip')
      assert.deepEqual(counts(), reads)
      assert.deepEqual(await page.evaluate(() => ({ html: document.documentElement.style.overflow, body: document.body.style.overflow })), originalOverflow)
    })
    await check('an unlocked incoming-like card opens a sheet and returns to the likes tab', async () => {
      await freshHome()
      await page.locator('.liquid-tabbar-dock:visible .liquid-tabbar-item').nth(1).click()
      await page.locator('.likes-page:visible .person-card').waitFor()
      assert.equal(currentRoute(), 'pages/likes/likes')
      await page.locator('.likes-page:visible .person-photo').click()
      await assertOpen('QAProfile80', 'pages/likes/likes')
      await closeSheet('pages/likes/likes')
      await page.locator('.likes-page:visible .person-name').waitFor()
      assert.equal((await page.locator('.likes-page:visible .person-name').textContent()).trim(), 'QAProfile80')
    })
    await check('direct detail links still work independently of a homepage sheet', async () => {
      await page.goto('about:blank')
      await page.goto(`${base.href}#/${detailRoute}?id=20`, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => [...document.querySelectorAll('.profile-name')].some(el => el.textContent.trim() === 'QAProfile20'))
      assert.equal(await currentRoute(), detailRoute)
      assert.equal(await page.locator('.profile-detail-sheet').count(), 0)
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForFunction(() => [...document.querySelectorAll('.profile-name')].some(el => el.textContent.trim() === 'QAProfile20'))
      assert.equal(await currentRoute(), detailRoute)
    })
    await check('320px sheet controls remain inside the viewport', async () => {
      await page.setViewportSize({ width: 320, height: 740 }); await freshHome()
      const name = (await deckState()).name
      await page.locator('.deck-detail:visible').click(); await assertOpen(name)
      for (const selector of ['.profile-back', '.profile-actions', '.profile-chrome']) {
        const box = await sheet().locator(selector).boundingBox()
        assert.ok(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= 321 && box.y + box.height <= 741, selector)
      }
      await page.screenshot({ path: path.join(output, 'sheet-320.png') }); await closeSheet()
    })
    await check('no unexpected business writes or application exceptions', async () => {
      assert.deepEqual(state.unexpectedWrites, []); assert.deepEqual(errors, [])
    })
  } finally { await browser.close() }
  const report = { passed, failed: failures.length, failures, counts: counts(), limitation: 'Actual local uni-app H5 runtime in Chrome with mocked APIs; no WeChat/iOS/Android physical-device verification.' }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2)); assert.deepEqual(failures, [])
}
main().catch(error => { console.error(error); process.exitCode = 1 })
