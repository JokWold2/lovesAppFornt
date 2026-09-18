const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const base = process.env.H5_BASE_URL || 'http://127.0.0.1:5188/'
const out = process.env.QA_SCREENSHOT_DIR || 'F:/workspace/.lovesapp-runtime/search-candidate-refresh'

async function main () {
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname))
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
  const page = await context.newPage()
  const errors = []
  const payloads = []
  let locale = 'zh-Hans'
  page.setDefaultTimeout(12000)
  page.on('pageerror', error => errors.push(error.message))
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const send = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(data) })
    if (url.pathname.startsWith('/api/')) {
      if (request.method() === 'OPTIONS') return send({}, 204)
      if (url.pathname === '/api/auth/validate') return send({ valid: true, user: { id: 9, account_level: 5, name: 'Tester' } })
      if (url.pathname.startsWith('/api/locale/')) return send({ effectiveLocale: locale, localeMode: 'manual', preferredLocale: locale })
      if (url.pathname.includes('/membership')) return send({ canSearch: true, accountLevel: 5 })
      if (url.pathname === '/api/search') {
        payloads.push(request.postDataJSON())
        return send({ total: 12, results: Array.from({ length: 12 }, (_, index) => ({
          id: 11 + index,
          native_last_name: ['林', '陈', '王'][index % 3],
          native_first_name: ['悦', '嘉', '宁'][index % 3],
          generation: index % 2 ? '一世會員' : '祝福子女',
          birth_year: 1996 + (index % 5),
          avatar_url: index < 2 ? new URL(`/fixture/avatar-${index + 1}.svg`, base).href : ''
        })) })
      }
      if (url.pathname === '/api/profile') return send({ profile: { native_first_name: 'Tester' }, careers: [] })
      return send({ items: [], total: 0 })
    }
    if (url.pathname.startsWith('/fixture/avatar-')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="60" fill="#d7c8b7"/><circle cx="60" cy="48" r="23" fill="#8d7569"/><path d="M24 120c5-32 20-47 36-47s31 15 36 47" fill="#716058"/></svg>' })
    return route.continue()
  })
  try {
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.evaluate(() => { uni.setStorageSync('AUTH_TOKEN', 'search-fixture'); uni.setStorageSync('USER_INFO', { id: 9, account_level: 5 }); uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale: 'zh-Hans' }) })
    await page.goto('about:blank')
    await page.goto(base + '#/pages/searchPerson/searchPerson', { waitUntil: 'networkidle' })
    await page.locator('.name-search-card').waitFor()
    assert.equal(await page.locator('.uni-page-head').count(), 0)
    assert.equal((await page.locator('.chat-page-header').innerText()).trim(), '搜索候选人')
    assert.equal(await page.locator('.bottom-bar').count(), 0)
    assert.equal(Number(await page.locator('.header-glass-surface').evaluate(element => getComputedStyle(element).opacity)), 0)
    assert.equal(await page.locator('.primary-chip').count(), 3)
    await page.locator('.primary-chip').nth(0).click()
    await page.locator('.primary-chip').nth(1).click()
    assert.equal(await page.locator('.primary-chip.selected').count(), 2)
    await page.locator('.more-filter-row').click()
    await page.locator('.advanced-sheet').waitFor()
    await page.locator('.sheet-section').nth(0).locator('.filter-chip').nth(0).click()
    await page.locator('.sheet-section').nth(0).locator('.filter-chip').nth(1).click()
    await page.locator('.sheet-section').nth(1).locator('.filter-chip').nth(0).click()
    await page.locator('.sheet-section').nth(1).locator('.filter-chip').nth(1).click()
    assert.match(await page.locator('.sheet-count').innerText(), /4/)
    await page.locator('.apply-button').click()
    await page.locator('.result-item').first().waitFor()
    await page.locator('.chat-sheet-host').waitFor({ state: 'detached' })
    assert.deepEqual(payloads.at(-1).gender, ['女', '男'])
    assert.deepEqual(payloads.at(-1).generation, ['祝福子女', '一世會員'])
    assert.deepEqual(payloads.at(-1).status, ['申請者', '候選人'])
    assert.equal(await page.locator('.result-item').count(), 12)
    const fixedPanelTop = (await page.locator('.search-fixed-panel').boundingBox()).y
    await page.locator('.results-scroll').evaluate(host => {
      const scroller = [host, ...host.querySelectorAll('*')].find(element => element.scrollHeight > element.clientHeight + 1) || host
      scroller.scrollTop = 120
      scroller.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.header-glass-surface')).opacity) > 0.95)
    assert.equal((await page.locator('.search-fixed-panel').boundingBox()).y, fixedPanelTop)
    await page.screenshot({ path: path.join(out, 'search-candidates.png'), fullPage: true })
    await page.locator('.results-scroll').evaluate(host => {
      const scroller = [host, ...host.querySelectorAll('*')].find(element => element.scrollHeight > element.clientHeight + 1) || host
      scroller.scrollTop = 0
      scroller.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.header-glass-surface')).opacity) < 0.05)

    await page.setViewportSize({ width: 320, height: 740 })
    for (const language of ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']) {
      locale = language
      await page.evaluate(value => uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale: value }), language)
      await page.reload({ waitUntil: 'networkidle' })
      await page.locator('.name-search-card').waitFor()
      assert.equal(await page.locator('.page').evaluate(element => element.scrollWidth > element.clientWidth + 1), false, language)
      assert.equal(await page.locator('.name-search-card').evaluate(element => element.scrollWidth > element.clientWidth + 1), false, language)
    }

    locale = 'zh-Hans'
    await page.goto(base + '#/pages/account/accountCenter', { waitUntil: 'networkidle' })
    await page.locator('.account-hero').waitFor()
    assert.equal(await page.locator('.uni-page-head').count(), 0)
    const header = await page.locator('.chat-page-header').boundingBox()
    assert.ok(header.y >= 0 && header.height < 90, 'account header stays compact on H5')
    assert.deepEqual(errors, [])
    console.log('PASS search refresh, multi-select request, six narrow locales, and shared account/search H5 navigation')
  } finally { await browser.close() }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
