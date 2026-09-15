// Full uni-app H5 runtime, not a standalone component mount. Requires a running
// local H5 dev server. All business APIs are fixtures; no real account is used.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const { chromium } = require('playwright')
const base = new URL(process.env.H5_BASE_URL || 'http://127.0.0.1:5173/app/')
const output = process.env.QA_SCREENSHOT_DIR || path.resolve(__dirname, '../../.lovesapp-runtime/h5-refresh-qa')
const routes = ['pages/index/index360', 'pages/likes/likes', 'pages/notice/notice', 'pages/my/myLifeShow/myLifeShow']
async function main() {
  fs.mkdirSync(output, { recursive: true })
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage(), failures = [], errors = []
  let passed = 0, authDelay = 0
  page.setDefaultTimeout(6000)
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.startsWith('/api/')) {
      let body = { notifications: [], interactionReadThroughId: 0, groups: [], requests: [], posts: [], results: [], items: [], profiles: [], total: 0, hasMore: false }
      if (url.pathname.endsWith('/auth/validate')) {
        if (authDelay) await new Promise(resolve => setTimeout(resolve, authDelay))
        body = { valid: true, user: { id: 1, accountLevel: 4, loginType: 'email', email: 'qa@example.invalid' } }
      }
      if (url.pathname === '/api/membership') body = { tierLevel: 4, canSearch: true, canViewLikes: true, usage: { like: { remaining: null }, comment: { remaining: null }, rewind: { remaining: null } }, rewind: { available: false }, plans: [] }
      if (url.pathname.endsWith('/unread-count')) body = { interactionUnread: 1, profileLikeUnread: 2, chatUnread: 0, chatRequestUnread: 0, totalUnread: 1 }
      if (url.pathname.endsWith('/presence/heartbeat')) body = { stale: false }
      if (url.pathname.includes('/locale')) body = { effectiveLocale: 'zh-Hans', mode: 'system' }
      if (url.pathname.endsWith('/feed') && !url.pathname.includes('featured')) body = { profiles: [{ profileId: 20, userId: 20, nativeFirstName: '测试资料', photos: ['/static/logo.png'], age: 26 }], hasMore: false }
      if (url.pathname === '/api/search/candidates/20') body = { profile: { id: 20, user_id: 20, native_first_name: '测试资料', photos: [] }, incomingLikeId: null }
      return route.fulfill({ status: route.request().method() === 'OPTIONS' ? 204 : 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(body) })
    }
    if (url.origin !== base.origin) return route.abort()
    return route.continue()
  })
  const check = async (name, work) => { try { await work(); passed++ } catch (error) { failures.push({ name, message: error.message }) } }
  const visit = async route => {
    // Changing only the hash is an in-app navigation, not a cold entry. Leave
    // the document first so every direct-entry assertion exercises onLaunch.
    await page.goto('about:blank')
    await page.goto(`${base.href}#/${route}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => getApp().globalData.restoringSession === false)
  }
  const currentRoute = () => page.evaluate(() => getCurrentPages().at(-1)?.route)
  const assertTab = async expected => {
    await page.waitForFunction(route => getCurrentPages().at(-1)?.route === route && getApp().globalData.restoringSession === false, expected)
    assert.equal(await currentRoute(), expected, 'refresh must preserve the requested page')
    const dock = page.locator('.liquid-tabbar-dock:visible')
    assert.equal(await dock.count(), 1, 'exactly the current page navigation must be visible')
    assert.equal(await dock.locator('.liquid-tabbar-item').count(), 4)
    const bounds = await dock.boundingBox(), viewport = page.viewportSize()
    assert.ok(bounds.width > 0 && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height + 1)
    await page.waitForFunction(() => [...document.querySelectorAll('.liquid-tabbar-dock')].some(dock => dock.getBoundingClientRect().height > 0 && [...dock.querySelectorAll('.liquid-tabbar-badge')].map(badge => badge.textContent).join(',') === '2,1'))
    assert.deepEqual(await dock.locator('.liquid-tabbar-badge').allTextContents(), ['2', '1'])
  }
  try {
    await page.goto(base.href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.uni?.setStorageSync)
    await page.evaluate(() => {
      uni.setStorageSync('AUTH_TOKEN', 'qa-session')
      uni.setStorageSync('USER_INFO', { id: 1, accountLevel: 4, loginType: 'email', email: 'qa@example.invalid' })
      uni.setStorageSync('PROFILE_LIKE_DOUBLE_TAP_GUIDE_V2', true)
    })
    for (const delay of [0, 300]) {
      authDelay = delay
      for (const route of routes) await check(`direct + refresh ${route}, validation ${delay}ms`, async () => {
        await visit(route); await assertTab(route)
        await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(100); await assertTab(route)
      })
    }
    authDelay = 0
    await check('repeated homepage refresh with a fast restored session', async () => {
      await visit(routes[0])
      for (let i = 0; i < 3; i++) { await page.reload({ waitUntil: 'networkidle' }); await assertTab(routes[0]) }
      await page.screenshot({ path: path.join(output, 'home-after-refresh.png') })
    })
    await check('bottom navigation remains usable across all four cached tabs', async () => {
      await visit(routes[0]); await assertTab(routes[0])
      for (const index of [1, 2, 3, 0, 1, 0]) {
        await page.locator('.liquid-tabbar-dock:visible .liquid-tabbar-item').nth(index).tap()
        await page.waitForFunction(route => getCurrentPages().at(-1)?.route === route, routes[index])
        await assertTab(routes[index])
      }
    })
    await check('opening a detail hides cached tab bars and returning restores the homepage', async () => {
      await visit(routes[0]); await assertTab(routes[0])
      await page.evaluate(() => uni.navigateTo({ url: '/pages/searchPerson/personShow/personShow?id=20' }))
      await page.waitForFunction(() => getCurrentPages().at(-1)?.route === 'pages/searchPerson/personShow/personShow')
      assert.equal(await page.locator('.liquid-tabbar-dock:visible').count(), 0)
      await page.evaluate(() => uni.navigateBack())
      await page.waitForFunction(() => getCurrentPages().at(-1)?.route === 'pages/index/index360')
      await assertTab(routes[0])
    })
    await check('refreshing a public detail does not force navigation back to home', async () => {
      await visit('pages/searchPerson/personShow/personShow?id=20')
      await page.reload({ waitUntil: 'networkidle' })
      assert.equal(await currentRoute(), 'pages/searchPerson/personShow/personShow')
      assert.equal(await page.locator('.liquid-tabbar-dock:visible').count(), 0)
    })
    await check('the message search field still hides navigation during focus and restores it after blur', async () => {
      await visit(routes[2]); await assertTab(routes[2])
      await page.locator('.search-trigger:visible').click()
      const field = page.locator('.search-input input')
      await field.focus(); await page.waitForTimeout(100)
      assert.equal(await page.locator('.liquid-tabbar-dock:visible').count(), 0)
      await field.evaluate(element => element.blur()); await page.waitForTimeout(100)
      await assertTab(routes[2])
    })
    await check('a restored login entry still navigates to home', async () => {
      await visit('pages/login/login360'); await assertTab(routes[0])
    })
    await check('320px refreshed homepage navigation stays inside the viewport', async () => {
      await page.setViewportSize({ width: 320, height: 740 }); await visit(routes[0])
      await page.reload({ waitUntil: 'networkidle' }); await assertTab(routes[0])
      await page.screenshot({ path: path.join(output, 'home-after-refresh-320.png') })
    })
    await check('no application runtime exceptions', async () => assert.deepEqual(errors, []))
  } finally { await browser.close() }
  const report = { passed, failed: failures.length, failures, limitation: 'Full local uni-app H5 runtime in Chrome with mocked business APIs; no real account or physical device.' }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2)); assert.deepEqual(failures, [])
}
main().catch(error => { console.error(error); process.exitCode = 1 })
