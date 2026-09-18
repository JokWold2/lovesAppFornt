// Real H5 account-page regression. All API traffic is intercepted.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const { chromium } = require('playwright')

const base = process.env.H5_BASE_URL || 'http://127.0.0.1:5187/app/'
const out = process.env.QA_SCREENSHOT_DIR || 'F:/workspace/.lovesapp-runtime/account-center-refresh'
const user = { id: 99, name: 'elikun', email: '2903363868@qq.com', avatar_url: new URL('/__account__/avatar.svg', base).href }

async function main() {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname))
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
  const page = await context.newPage(), errors = []
  let locale = 'zh-Hans'
  page.setDefaultTimeout(10000)
  page.on('pageerror', error => errors.push(error.message))
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), endpoint = url.pathname
    const send = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(data) })
    if (endpoint.startsWith('/api/')) {
      if (req.method() === 'OPTIONS') return send({}, 204)
      if (endpoint === '/api/auth/validate') return send({ valid: true, user })
      if (endpoint.startsWith('/api/locale/')) return send({ effectiveLocale: locale, localeMode: 'manual', preferredLocale: locale })
      if (endpoint === '/api/profile') return send({ profile: { id: 20, user_id: 99, native_first_name: 'elikun', avatar_url: user.avatar_url }, careers: [] })
      if (endpoint.startsWith('/api/presence/')) return send({ success: true })
      return send({ items: [], total: 0 })
    }
    if (endpoint === '/__account__/avatar.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#d8c6b8"/><path d="M0 160L75 42l85 118" fill="#7f6b61"/><circle cx="110" cy="45" r="22" fill="#bbc3b1"/></svg>' })
    if (url.origin !== new URL(base).origin) return route.abort()
    return route.continue()
  })
  try {
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.evaluate(userInfo => { uni.setStorageSync('AUTH_TOKEN', 'account-fixture'); uni.setStorageSync('USER_INFO', userInfo); uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale: 'zh-Hans' }) }, user)
    await page.goto('about:blank'); await page.goto(base + '#/pages/account/accountCenter', { waitUntil: 'networkidle' })
    await page.locator('.account-hero').waitFor()
    assert.equal(await page.locator('.uni-page-head').count(), 0, 'account center uses compact custom navigation')
    assert.equal((await page.locator('.chat-page-header').innerText()).trim(), '个人中心')
    const header = await page.locator('.chat-page-header').boundingBox(), hero = await page.locator('.account-hero').boundingBox(), settings = await page.locator('.settings-card').boundingBox()
    assert.ok(header.y >= 0 && header.y + header.height <= hero.y + 1)
    assert.ok(settings.x >= 19 && settings.x + settings.width <= 371)
    assert.equal(await page.locator('.settings-card .setting-row').count(), 4)
    assert.equal(await page.locator('.account-name').innerText(), 'elikun')
    assert.equal(await page.locator('.account-email').innerText(), '2903363868@qq.com')
    const logout = await page.locator('.logout-button').boundingBox(); assert.ok(logout.height >= 50 && logout.height <= 54)
    await page.locator('.language-row').click(); await page.locator('.chat-sheet-host').waitFor()
    assert.ok(await page.locator('.language-option').count() >= 7)
    await page.locator('.language-sheet-close').click(); await page.locator('.chat-sheet-host').waitFor({ state: 'detached' })
    await page.screenshot({ path: path.join(out, 'account-center.png'), fullPage: true })
    await page.setViewportSize({ width: 320, height: 740 })
    for (const language of ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']) {
      locale = language
      await page.evaluate(value => uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale: value }), language)
      await page.reload({ waitUntil: 'networkidle' }); await page.locator('.settings-card').waitFor()
      assert.equal(await page.locator('.page').evaluate(element => element.scrollWidth > element.clientWidth + 1), false, language)
      assert.equal(await page.locator('.settings-card').evaluate(element => element.scrollWidth > element.clientWidth + 1), false, language)
    }
    assert.deepEqual(errors, [])
    console.log('PASS account center matches the refreshed design and keeps language interaction')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
