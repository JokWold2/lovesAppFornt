// Actual uni-app H5 runtime, including its native swiper implementation.
// Start H5 separately, then run: node tests/profile-detail-layout.browser.cjs
// Optional: H5_BASE_URL, BROWSER_CHANNEL, QA_SCREENSHOT_DIR.
// Every /api/ request is fulfilled locally; external non-API requests are blocked.
// This is browser regression coverage, not a claim of WeChat/iOS/Android device QA.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { chromium } = require('playwright')

const root = path.resolve(__dirname, '..')
const base = new URL(process.env.H5_BASE_URL || 'http://127.0.0.1:5173/app/')
const output = process.env.QA_SCREENSHOT_DIR || path.resolve(root, '../.lovesapp-runtime/profile-detail-layout-qa')
const detailRoute = 'pages/searchPerson/personShow/personShow?id=20'
const locales = ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']
const helperEmail = 'helper.private@example.invalid'
const maskedHelperEmail = 'hel' + '*'.repeat('helper.private'.length - 3) + '@example.invalid'
const profile = {
  id: 20, user_id: 80,
  native_last_name: '林', native_first_name: '予安', en_last_name: 'FixtureFamily', en_first_name: 'FixtureGiven',
  health: 'QAHealth', generation: 'QAGeneration', blessing_type: 'QABlessing', gender: 'QAGender', region: 'QARegion', country: 'QACountry',
  birth_year: 1996, birth_month: 7, birth_day: 19, height: 168, weight: 56, blood_type: 'QABlood', blood_rh: 'QARh', nationality: 'QANationality',
  qualification1: 'QAQualificationOne', qualification2: 'QAQualificationTwo', preferred_country1: 'QAPreferredOne', preferred_country2: 'QAPreferredTwo',
  lang1_name: 'QALanguageOne', lang1_level: 'QALevelOne', lang2_name: 'QALanguageTwo', lang2_level: 'QALevelTwo',
  degree_level: 'QADegree', degree_status: 'QADegreeStatus', school_name: 'QASchool', major: 'QAMajor',
  occupation: 'QAOccupation', company_name: 'QACompany_InternationalResearchAndDesign'.repeat(3),
  helper_name: 'QAHelper', helper_mobile: '+1 202 555 0148', helper_email: helperEmail,
  hobby1: 'QAHobbyOne', hobby2: 'QAHobbyTwo', faith_life: 'QAFaith', spouse_faith_life: JSON.stringify(['QASpouseOne', 'QASpouseTwo']),
  tool_hands: '右拇指', tool_yinyang: '陽', tool_five_elements: '木', tool_enneagram: '1: 改革型', tool_mbti: 'INFJ',
  Selfintroduction: 'QAIntroductionFirstLine\n第二行简介 — A long multilingual introduction. '.repeat(8), bio: 'QABioFallbackShouldNotWin',
  photos: JSON.stringify([1, 2, 3].map(index => `${base.origin}/__profile_qa__/portrait-${index}.svg`))
}
const fieldValues = [
  '林', '予安', 'FixtureFamily', 'FixtureGiven', 'QAHealth', 'QAGeneration', 'QABlessing', 'QAGender', 'QARegion', 'QACountry',
  '1996', '168', '56', 'QABlood', 'QARh', 'QANationality', 'QAQualificationOne', 'QAQualificationTwo', 'QAPreferredOne', 'QAPreferredTwo',
  'QALanguageOne', 'QALevelOne', 'QALanguageTwo', 'QALevelTwo', 'QADegree', 'QADegreeStatus', 'QASchool', 'QAMajor',
  'QAOccupation', profile.company_name, 'QAHelper', profile.helper_mobile, maskedHelperEmail,
  'QAHobbyOne', 'QAHobbyTwo', 'QAFaith', 'QASpouseOne', 'QASpouseTwo', 'INFJ', 'QAIntroductionFirstLine', '第二行简介'
]
const sectionKeys = ['basicInfo', 'introduction', 'personalInfo', 'education', 'employment', 'assistantInfo', 'lifestyle', 'partnerPreference', 'parents']
const fieldKeys = ['health', 'generation', 'blessing', 'gender', 'region', 'country', 'nativeName', 'englishName', 'birthDate', 'height', 'weight', 'bloodType', 'nationality', 'qualification', 'preferredCountry', 'language1', 'language2', 'degree', 'school', 'major', 'occupation', 'company', 'name', 'phone', 'email', 'hobby', 'myFaith', 'spouseFaith']

async function main() {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'H5_BASE_URL must target the local dev server')
  fs.mkdirSync(output, { recursive: true })
  const { translate } = await import(pathToFileURL(path.join(root, 'utils/locale.js')).href)
  const state = { locale: 'zh-Hans', tier: 3, liked: false, mutual: false, likeCount: 7, status: 'none', groupId: null,
    viewed: false, noPhotos: false, profileFailure: false, rejectQuota: false, delayLike: 0, requests: [], unexpectedWrites: [] }
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' })
  const page = await context.newPage(), errors = [], failures = []
  let passed = 0
  page.setDefaultTimeout(8000)
  page.on('pageerror', error => errors.push(error.message))
  const fulfill = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(body) })
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method(), endpoint = url.pathname
    if (endpoint.startsWith('/api/')) {
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } })
      let data = {}; try { data = request.postDataJSON() || {} } catch (_) {}
      state.requests.push({ endpoint, method, data })
      if (endpoint === '/api/auth/validate') return fulfill(route, { valid: true, user: { id: 99, accountLevel: state.tier, loginType: 'email', email: 'layout-qa@example.invalid' } })
      if (endpoint.startsWith('/api/locale/')) return fulfill(route, { effectiveLocale: state.locale, localeMode: 'manual', preferredLocale: state.locale })
      if (endpoint === '/api/presence/heartbeat' || endpoint === '/api/presence/offline') return fulfill(route, { stale: false })
      if (endpoint === '/api/search/candidates/20') {
        if (state.profileFailure) return fulfill(route, { error: 'Fixture unavailable' }, 500)
        return fulfill(route, { profile: { ...profile, photos: state.noPhotos ? [] : profile.photos }, incomingLikeId: state.tier >= 3 && !state.viewed ? 501 : null })
      }
      if (endpoint === '/api/explore/profiles/20/likes') return fulfill(route, { isLiked: state.liked, total: state.likeCount, likes: [] })
      if (endpoint === '/api/chat-requests/status/80') return fulfill(route, { status: state.status, isLiked: state.liked, mutual: state.mutual, groupId: state.groupId })
      if (endpoint === '/api/blessings/decisions' && method === 'POST') {
        if (state.delayLike) await new Promise(resolve => setTimeout(resolve, state.delayLike))
        if (state.rejectQuota) return fulfill(route, { error: 'Fixture quota reached', code: 'BLESSING_QUOTA_EXCEEDED', action: 'like' }, 429)
        if (!state.liked) state.likeCount++
        state.liked = true
        return fulfill(route, { profileId: 20, isLiked: true, likeCount: state.likeCount, mutual: state.mutual })
      }
      if (endpoint === '/api/explore/profiles/20/like' && method === 'POST') {
        if (state.liked) state.likeCount--
        state.liked = false; state.mutual = false
        return fulfill(route, { profileId: 20, isLiked: false, likeCount: state.likeCount, mutual: false })
      }
      if (endpoint === '/api/notifications/profile-likes/view' && method === 'POST') {
        const eligible = state.tier >= 3 && data.profileId === 20 && data.likeId === 501
        if (eligible) state.viewed = true
        return fulfill(route, { affected: eligible ? 1 : 0 })
      }
      if (endpoint === '/api/notifications/unread-count') return fulfill(route, { interactionUnread: 4, profileLikeUnread: state.viewed ? 0 : 1, chatUnread: 0, chatRequestUnread: 0, totalUnread: 4 })
      if (endpoint === '/api/membership') return fulfill(route, {
        accountLevel: state.tier, tierLevel: state.tier, canViewLikes: state.tier >= 3, canSearch: state.tier >= 4,
        plans: [1, 2, 3, 4].map(level => ({ level, priceCents: [0, 0, 2000, 5000, 10000][level], currency: 'USD', permanent: true,
          likeLimit: level === 4 ? null : [0, 20, 50, 100][level], commentLimit: level === 4 ? null : [0, 20, 50, 100][level], rewindLimit: level === 4 ? null : [0, 20, 50, 100][level] })),
        usage: { like: { remaining: 3 }, comment: { remaining: 3 }, rewind: { remaining: 3 } }, rewind: { available: false }
      })
      if (endpoint === '/api/membership/requests' && method === 'GET') return fulfill(route, { requests: [] })
      if (method !== 'GET' && method !== 'HEAD') {
        state.unexpectedWrites.push({ method, endpoint })
        return fulfill(route, { error: 'Unspecified fixture write blocked' }, 500)
      }
      return fulfill(route, { notifications: [], interactionReadThroughId: 0, groups: [], requests: [], posts: [], results: [], items: [], profiles: [], total: 0, hasMore: false })
    }
    if (endpoint.startsWith('/__profile_qa__/')) {
      const index = Number(endpoint.match(/portrait-(\d)/)?.[1]) || 1
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640"><rect width="480" height="640" fill="${['', '#c8b39d', '#adc5c3', '#b5b9d0'][index]}"/><circle cx="240" cy="205" r="100" fill="#f3dfc7"/><ellipse cx="240" cy="540" rx="180" ry="210" fill="#626b70"/><text x="25" y="600" font-size="45" fill="white">Photo ${index}</text></svg>` })
    }
    if (url.origin !== base.origin || !['GET', 'HEAD'].includes(method)) return route.abort()
    return route.continue()
  })
  const check = async (name, work) => {
    try { await work(); passed++; console.log(`PASS ${name}`) }
    catch (error) { failures.push({ name, message: error.message }); console.error(`FAIL ${name}: ${error.message}`) }
  }
  const storage = async () => page.evaluate(({ locale, tier }) => {
    uni.setStorageSync('AUTH_TOKEN', 'local-layout-fixture-token')
    uni.setStorageSync('USER_INFO', { id: 99, accountLevel: tier, loginType: 'email', email: 'layout-qa@example.invalid' })
    uni.setStorageSync('PROFILE_LIKE_DOUBLE_TAP_GUIDE_V2', true)
    uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale })
  }, { locale: state.locale, tier: state.tier })
  const visit = async (route = detailRoute) => {
    await storage()
    await page.goto('about:blank')
    await page.goto(`${base.href}#/${route}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => getApp().globalData.restoringSession === false)
  }
  const detailReady = async () => {
    await page.locator('.profile-container--cards').waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.querySelector('.profile-like-count')?.textContent.trim() === '7')
  }
  const requestsTo = endpoint => state.requests.filter(request => request.endpoint === endpoint && request.method === 'POST')
  const scrollTo = async top => {
    await page.locator('.profile-scroll:visible').evaluate((element, scrollTop) => {
      const scroller = [...element.querySelectorAll('.uni-scroll-view')].find(node => /auto|scroll/.test(getComputedStyle(node).overflowY))
      if (!scroller) throw new Error('The detail uni-scroll-view has no scrolling viewport')
      scroller.scrollTop = scrollTop
    }, top)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  const screenshot = name => page.screenshot({ path: path.join(output, name) })
  const resetRelationship = () => { state.liked = false; state.mutual = false; state.likeCount = 7; state.status = 'none'; state.groupId = null }
  try {
    await page.goto(base.href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.uni?.setStorageSync)
    for (const width of [320, 390, 1024]) for (const locale of locales) {
      await check(`all fields and fixed controls at ${width}px ${locale}`, async () => {
        state.locale = locale; resetRelationship()
        await page.setViewportSize({ width, height: 844 }); await visit(); await detailReady()
        const content = await page.locator('.profile-container--cards').innerText()
        for (const value of fieldValues) assert.ok(content.includes(value), `missing profile value: ${value}`)
        assert.ok(!content.includes(helperEmail), 'assistant email must remain masked')
        assert.ok(!content.includes(profile.bio), 'self introduction must take precedence over bio')
        for (const key of [...sectionKeys, ...fieldKeys, 'noParents']) {
          const translated = translate(locale, `profile.${key}`)
          assert.notEqual(translated, `profile.${key}`, `unresolved locale key: ${locale} profile.${key}`)
          assert.ok(content.includes(translated), `missing translated label: ${key}`)
        }
        for (const key of ['handsLabel', 'yinYangLabel', 'fiveElementsLabel', 'enneagramLabel']) assert.ok(content.includes(translate(locale, `profile.myFile.${key}`)), `missing analysis tool: ${key}`)
        for (const field of ['tool_hands', 'tool_yinyang', 'tool_five_elements', 'tool_enneagram']) assert.ok(content.includes(profile[field]), `stored analysis value must remain unchanged: ${field}`)
        const birthday = await page.locator('.section--cards .tr').filter({ hasText: translate(locale, 'profile.birthDate') }).locator('.td').innerText()
        assert.match(birthday, /1996/); assert.match(birthday, /(^|\D)0?7(?=\D|$)/); assert.match(birthday, /(^|\D)19(?=\D|$)/)
        assert.ok((await page.locator('.profile-age').innerText()).includes(String(new Date().getFullYear() - profile.birth_year)))
        assert.equal(await page.locator('.section--cards .tr').count(), 28, 'all 28 basic/personal/education/work/helper/lifestyle rows remain')
        assert.equal(await page.locator('.profile-card-analysis').count(), 5)
        assert.equal(await page.locator('uni-swiper.portrait-gallery').count(), 1, 'use the uni-app swiper, not a fixture shim')
        assert.equal(await page.locator('.portrait-gallery uni-swiper-item').count(), 3)
        assert.equal(await page.locator('.profile-actions .like-button').count(), 1)
        assert.equal(await page.locator('.profile-container .like-button').count(), 0, 'portrait must not duplicate the bottom like control')
        const layout = await page.evaluate(() => {
          const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom } }
          const selectors = ['.profile-chrome', '.profile-actions', '.profile-back', '.profile-like', '.chat-request', '.profile-card-photos']
          return { width: innerWidth, height: innerHeight, rects: Object.fromEntries(selectors.map(selector => [selector, rect(selector)])),
            fixed: ['.profile-chrome', '.profile-actions'].map(selector => getComputedStyle(document.querySelector(selector)).position),
            overflow: [...document.querySelectorAll('.profile-card, .section--cards, .profile-heading, .profile-actions-inner, .th, .td')].filter(element => {
              const r = element.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 2)
            }).map(element => element.className) }
        })
        assert.deepEqual(layout.fixed, ['absolute', 'absolute'])
        assert.deepEqual(layout.overflow, [], 'long translations/data must wrap inside the viewport')
        for (const selector of ['.profile-back', '.profile-like', '.chat-request']) {
          const r = layout.rects[selector]
          assert.ok(r.width >= 44 && r.height >= 44, `${selector} touch target must be at least 44px`)
          assert.ok(r.x >= 0 && r.right <= width + 1 && r.y >= 0 && r.bottom <= layout.height + 1, `${selector} must remain visible`)
        }
        assert.ok(layout.rects['.profile-card-photos'].y >= layout.rects['.profile-chrome'].bottom - 1, 'fixed header must not hide the first photo')
        if ((width === 320 && locale === 'ru') || (width === 390 && locale === 'zh-Hans') || (width === 1024 && locale === 'en')) await screenshot(`profile-top-${width}-${locale}.png`)
        await scrollTo(100000)
        const after = await page.evaluate(() => {
          const header = document.querySelector('.profile-chrome').getBoundingClientRect(), actions = document.querySelector('.profile-actions').getBoundingClientRect()
          const last = [...document.querySelectorAll('.profile-card')].at(-1).getBoundingClientRect()
          return { headerY: header.y, actionsY: actions.y, lastBottom: last.bottom, lastTop: last.top }
        })
        assert.ok(Math.abs(after.headerY - layout.rects['.profile-chrome'].y) < 2, 'header must not scroll with the document')
        assert.ok(Math.abs(after.actionsY - layout.rects['.profile-actions'].y) < 2, 'bottom controls must remain fixed')
        assert.ok(after.lastTop >= layout.rects['.profile-chrome'].bottom - 1 && after.lastBottom <= after.actionsY + 1, 'last parent section must scroll clear of the fixed controls')
        if (width === 320 && locale === 'ru') await screenshot('profile-bottom-320-ru.png')
      })
    }
    await check('native swiper changes photos and double tap still toggles one like', async () => {
      state.locale = 'zh-Hans'; resetRelationship(); state.requests = []; state.delayLike = 200
      await page.setViewportSize({ width: 390, height: 844 }); await visit(); await detailReady()
      const box = await page.locator('.portrait-gallery').boundingBox(), y = box.y + Math.min(box.height / 2, 220)
      const client = await context.newCDPSession(page)
      try {
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .82, y }] })
        for (const fraction of [.7, .55, .4, .2]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * fraction, y }] })
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      } finally { await client.detach() }
      await page.waitForFunction(() => document.querySelector('.portrait-count')?.textContent.trim() === '2 / 3')
      assert.equal(requestsTo('/api/blessings/decisions').length, 0, 'swiping photos must not like a profile')
      await page.touchscreen.tap(box.x + box.width / 2, y)
      await page.touchscreen.tap(box.x + box.width / 2, y)
      await page.waitForFunction(() => document.querySelector('.profile-like-count')?.textContent.trim() === '8')
      assert.equal(requestsTo('/api/blessings/decisions').length, 1)
      const decision = requestsTo('/api/blessings/decisions')[0].data
      assert.equal(decision.profileId, 20); assert.equal(decision.source, 'detail'); assert.equal(decision.decision, 'like'); assert.ok(decision.requestId)
      await page.locator('.profile-like').click()
      await page.waitForFunction(() => document.querySelector('.profile-like-count')?.textContent.trim() === '7')
      assert.equal(requestsTo('/api/explore/profiles/20/like').length, 1)
      assert.equal(requestsTo('/api/explore/profiles/20/like')[0].data.liked, false)
      state.delayLike = 0
    })
    await check('the first-like chat prompt does not jump the scrolled page or submit an application', async () => {
      resetRelationship(); state.requests = []; state.delayLike = 0; await visit(); await detailReady()
      await scrollTo(700)
      const before = await page.locator('.profile-card-photos').boundingBox()
      await page.locator('.chat-request').click()
      const message = page.getByText(translate(state.locale, 'membership.likeRequired'), { exact: true })
      await message.waitFor({ state: 'visible' })
      await page.getByText(translate(state.locale, 'membership.goLike'), { exact: true }).click()
      await message.waitFor({ state: 'hidden' })
      // Also catches the old selector-based scroll animation (250 ms).
      await page.waitForTimeout(350)
      const after = await page.locator('.profile-card-photos').boundingBox()
      assert.ok(Math.abs(before.y - after.y) < 2, 'confirming the prompt must preserve the current scroll position')
      assert.equal(requestsTo('/api/chat-requests').length, 0)
      assert.equal(requestsTo('/api/blessings/decisions').length, 0)
    })
    await check('empty photos keep the fields and working bottom actions', async () => {
      resetRelationship(); state.noPhotos = true
      await visit(); await detailReady()
      await page.locator('.portrait-empty').waitFor({ state: 'visible' })
      assert.ok((await page.locator('.portrait-empty').innerText()).includes(translate(state.locale, 'profile.noPhotos')))
      assert.equal(await page.locator('.section--cards .tr').count(), 28)
      assert.ok(await page.locator('.profile-like').isVisible()); assert.ok(await page.locator('.chat-request').isVisible())
      state.noPhotos = false
    })
    await check('L1 and L2 detail visits never acknowledge incoming likes', async () => {
      for (const tier of [1, 2]) {
        state.tier = tier; state.viewed = false; state.requests = []; resetRelationship()
        await visit(); await detailReady()
        assert.equal(requestsTo('/api/notifications/profile-likes/view').length, 0)
      }
      state.tier = 3
    })
    await check('silver detail acknowledges its exact relation and preserves message unread', async () => {
      state.viewed = false; state.requests = []; resetRelationship(); await visit(); await detailReady()
      assert.equal(requestsTo('/api/notifications/profile-likes/view').length, 1)
      assert.deepEqual(requestsTo('/api/notifications/profile-likes/view')[0].data, { profileId: 20, likeId: 501 })
      assert.equal(requestsTo('/api/notifications/interactions/read').length, 0)
    })
    await check('quota rejection leaves the relationship unchanged and opens BLESS membership', async () => {
      resetRelationship(); state.tier = 3; state.rejectQuota = true; await visit(); await detailReady()
      await page.locator('.profile-like').click()
      await page.locator('.membership-page .brand-name').waitFor({ state: 'visible' })
      assert.equal(await page.locator('.membership-page .brand-name').innerText(), 'BLESS')
      assert.equal(state.liked, false); assert.equal(state.likeCount, 7)
      assert.ok(!((await page.locator('.membership-page').innerText()).includes('LOVES')))
      await screenshot('membership-bless.png')
      state.rejectQuota = false
    })
    await check('no application exceptions or unexpected fixture writes', async () => {
      assert.deepEqual(errors, []); assert.deepEqual(state.unexpectedWrites, [])
    })
  } catch (error) {
    failures.push({ name: 'browser harness setup', message: error.message })
  } finally {
    await browser.close()
    const report = { passed, failed: failures.length, failures, limitation: 'Real local uni-app H5 runtime in Chromium; all API requests mocked. No physical WeChat, iOS or Android verification.' }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
  }
  assert.deepEqual(failures, [])
}
main().catch(error => { console.error(error); process.exitCode = 1 })
