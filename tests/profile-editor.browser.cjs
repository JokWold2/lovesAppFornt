// Real H5 runtime. All API traffic is intercepted; no live profile is modified.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
const { chromium } = require('playwright')
const { pathToFileURL } = require('node:url')
const base = 'http://127.0.0.1:5173/app/'
const output = path.resolve(__dirname, '../../.lovesapp-runtime/profile-editor-qa')
const routeName = 'pages/my/myLifeShow/myLifeShow'
const user = { id: 99, accountLevel: 4, email: 'editor@example.invalid', name: '林知夏', avatar_url: 'http://127.0.0.1:5173/__editor__/avatar.svg' }
const initial = { id: 20, user_id: 99, native_last_name: '林', native_first_name: '知夏', en_first_name: '',
  avatar_url: user.avatar_url, photos: ['http://127.0.0.1:5173/__editor__/other.svg'], bio: '沿途的风景', Selfintroduction: '原来的自我介绍',
  degree_level: 'Historical degree', occupation: '设计师', faith_life: '按自己的步调', spouse_faith_life: ['旧值一', '旧值二'],
  helper_name: '王老师', helper_mobile: '+81 123 456', helper_email: 'helper.private@example.invalid',
  tool_hands: '右拇指', tool_mbti: 'INFJ', country: '旧国家文本', status: '候選人', birth_year: 1998, birth_month: 2, birth_day: 20 }
async function main() {
  fs.mkdirSync(output, { recursive: true })
  const { translate } = await import(pathToFileURL(path.resolve(__dirname, '../utils/locale.js')).href)
  const state = { profile: structuredClone(initial), locale: 'zh-Hans', writes: [], fail: false, hold: false }, errors = []
  let release
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference', serviceWorkers: 'block' })
  const page = await context.newPage()
  page.setDefaultTimeout(6000)
  page.on('pageerror', e => errors.push(e.message))
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), endpoint = url.pathname, method = req.method()
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(body) })
    if (endpoint.startsWith('/api/')) {
      if (method === 'OPTIONS') return send({}, 204)
      if (endpoint === '/api/auth/validate') return send({ valid: true, user })
      if (endpoint.startsWith('/api/locale/')) return send({ effectiveLocale: state.locale, localeMode: 'manual', preferredLocale: state.locale })
      if (endpoint === '/api/profile/bio' && method === 'POST') { state.profile.bio = req.postDataJSON().bio; return send({ bio: state.profile.bio }) }
      if (endpoint === '/api/profile' && method === 'GET') return send({ profile: state.profile, careers: [] })
      if (endpoint === '/api/profile' && method === 'POST') {
        const data = req.postDataJSON(); state.writes.push(data)
        if (state.hold) await new Promise(r => { release = r })
        if (state.fail) return send({ error: 'Test save failure' }, 500)
        const names = { selfIntroduction: 'Selfintroduction', spouseFaithLife: 'spouse_faith_life', faithLife: 'faith_life', degreeLevel: 'degree_level' }
        for (const [k, v] of Object.entries(data)) {
          if (k === 'tools') { const fields = { hands: 'tool_hands', yinYang: 'tool_yinyang', fiveElements: 'tool_five_elements', enneagram: 'tool_enneagram', mbti: 'tool_mbti' }; for (const [tool,value] of Object.entries(v)) state.profile[fields[tool]] = value }
          else state.profile[names[k] || k.replace(/[A-Z]/g, l => '_' + l.toLowerCase())] = v
        }
        return send({ code: 0, data: { profileId: 20 } })
      }
      if (method !== 'GET' && !endpoint.startsWith('/api/presence/')) { state.writes.push({ unexpected: endpoint }); return send({ error: 'Unexpected write' }, 500) }
      if (endpoint === '/api/notifications/unread-count') return send({ profileLikeUnread: 3, totalUnread: 0 })
      if (endpoint === '/api/membership') return send({ accountLevel: 4, tierLevel: 4, canViewLikes: true, plans: [], usage: {} })
      return send({ moments: [], total: 2, likes: [], items: [], requests: [], notifications: [] })
    }
    if (endpoint.startsWith('/__editor__/')) return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200"><rect width="160" height="200" fill="${endpoint.includes('avatar') ? '#b9c5ac' : '#dac1ad'}"/><circle cx="80" cy="70" r="35" fill="#f2e1cf"/><ellipse cx="80" cy="190" rx="70" ry="80" fill="#768772"/></svg>` })
    if (url.origin !== 'http://127.0.0.1:5173') return route.abort()
    return route.continue()
  })
  await page.goto(base, { waitUntil: 'networkidle' })
  async function visit() {
    await page.evaluate(({ user, locale }) => { uni.setStorageSync('AUTH_TOKEN', 'editor-fixture'); uni.setStorageSync('USER_INFO', user); uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale }) }, { user, locale: state.locale })
    await page.goto('about:blank'); await page.goto(base + '#/' + routeName, { waitUntil: 'networkidle' })
    await page.locator('.profile-pane').waitFor({ state: 'visible' })
  }
  const open = async group => { await page.locator('.profile-edit-entry').click(); await page.locator('.profile-editor-overview').waitFor({ state: 'visible' }); if (group) await openGroup(group) }
  const openGroup = async key => { await page.locator(`.profile-editor-group-entry[data-group="${key}"]`).click(); await page.locator('.profile-editor-fields').waitFor({ state: 'visible' }) }
  const field = key => page.locator(`[data-field="${key}"]`).locator('input,textarea').first()
  const confirmGroup = async () => { await page.locator('.profile-editor-group-confirm').click(); await page.locator('.profile-editor-fields').waitFor({ state: 'hidden' }) }
  const close = async () => { await page.locator('.profile-editor-close').click(); await page.locator('.profile-editor-host').waitFor({ state: 'hidden' }) }
  const results = []
  async function check(name, work) { if (process.env.QA_TEST_FILTER && !new RegExp(process.env.QA_TEST_FILTER).test(name)) return; try { await work(); results.push({ name, pass: true }); console.log('PASS ' + name) } catch (e) { results.push({ name, pass: false, error: e.message }); console.error('FAIL ' + name + ': ' + e.message); await page.screenshot({ path: path.join(output, 'failure-' + results.length + '.png') }).catch(() => {}) } }
  try {
    await check('profile is default with two-photo stack and edit entry', async () => { await visit(); assert.equal(await page.locator('.moments-tab').first().innerText(), '个人资料'); assert.equal(await page.locator('.identity-photo-stack uni-image').count(), 2); await page.locator('.profile-edit-entry').waitFor(); await page.locator('.profile-completion-prompt').waitFor(); await page.screenshot({ path: path.join(output, 'profile.png') }) })
    await check('only changed raw text saves; group cancel and email privacy', async () => {
      await visit(); await open('helper'); assert.equal(await field('helper_email').inputValue(), initial.helper_email); assert.ok(!(await page.locator('.profile-editor-fields').innerText()).includes('脱敏')); await page.locator('.profile-editor-group-cancel').click(); await page.locator('.profile-editor-fields').waitFor({ state: 'hidden' })
      await openGroup('lifestyle'); assert.equal(await field('spouse_faith_life').inputValue(), '旧值一 / 旧值二'); await field('faith_life').fill('自由填写信仰'); await field('spouse_faith_life').fill('彼此理解与尊重'); await field('hobby1').fill('读书与散步'); await confirmGroup(); await openGroup('employment'); await field('occupation').fill('建筑师'); await confirmGroup();
      await page.locator('.profile-editor-save').click(); await page.locator('.profile-editor-host').waitFor({ state: 'hidden' }); assert.deepEqual(state.writes.at(-1), { occupation: '建筑师', hobby1: '读书与散步', faithLife: '自由填写信仰', spouseFaithLife: '彼此理解与尊重' }); assert.ok((await page.locator('.profile-pane').innerText()).includes('彼此理解与尊重')); assert.ok(!(await page.locator('.profile-pane').innerText()).includes(initial.helper_email))
    })
    await check('degree junior school and hands options have no ticks or selection hints', async () => { await visit(); await open('education'); await page.locator('[data-field="degree_level"] .profile-choice').filter({ hasText: /^初中$/ }).click(); assert.equal(await page.locator('[data-field="degree_level"] .profile-choice.selected').innerText(), '初中'); assert.ok(!/单选|多选|✓/.test(await page.locator('.profile-editor-fields').innerText())); await confirmGroup(); await openGroup('personality'); const chips = await page.locator('[data-field="tool_hands"] .profile-choice').allTextContents(); assert.deepEqual(chips, ['左手', '右手']); await page.locator('[data-field="tool_hands"] .profile-choice').first().click(); await confirmGroup(); await page.locator('.profile-editor-save').click(); await page.locator('.profile-editor-host').waitFor({ state: 'hidden' }); assert.deepEqual(state.writes.at(-1), { degreeLevel: '初中', tools: { hands: '左手' } }) })
    await check('selected option toggles off without a separate clear control', async () => {
      await visit(); await open('basic')
      const choice = page.locator('[data-field="health"] .profile-choice').first()
      await choice.click(); assert.equal(await choice.getAttribute('aria-pressed'), 'true')
      await choice.click(); assert.equal(await choice.getAttribute('aria-pressed'), 'false')
      assert.equal(await page.locator('[data-field="health"] .editor-clear').count(), 0)
      await confirmGroup(); await close()
    })
    await check('catalog searches country flags, cancels nested drafts and saves text only', async () => {
      state.locale = 'zh-Hans'; await visit(); await open('basic')
      await page.locator('[data-field="country"] .editor-catalog-entry').click()
      await page.locator('.profile-catalog-picker').waitFor({ state: 'visible' })
      assert.ok((await page.locator('.catalog-count').innerText()).includes('249'))
      assert.equal(await page.locator('.catalog-choices .catalog-choice').count(), 60)
      assert.equal(await page.locator('.catalog-selected-value').innerText(), state.profile.country)
      await page.locator('.catalog-search input').fill('Japan')
      await page.locator('.catalog-choice[data-code="JP"]').click()
      const atlas = page.locator('.catalog-choice[data-code="JP"] .profile-country-atlas img')
      await atlas.waitFor(); await page.waitForFunction(() => [...document.querySelectorAll('.catalog-choice[data-code="JP"] img')].every(img => img.complete && img.naturalWidth > 0))
      assert.ok(!(await page.locator('.catalog-choices').innerText()).includes('✓'))
      await page.locator('.catalog-cancel').click(); await page.locator('.profile-catalog-picker').waitFor({ state:'hidden' })
      assert.equal(await page.locator('[data-field="country"] .editor-catalog-entry').innerText(), state.profile.country)
      await page.locator('[data-field="country"] .editor-catalog-entry').click()
      await page.locator('.catalog-search input').fill('JP'); await page.locator('.catalog-choice[data-code="JP"]').click()
      await page.locator('.catalog-confirm').click(); await page.locator('.profile-catalog-picker').waitFor({ state:'hidden' })
      await confirmGroup(); await page.locator('.profile-editor-save').click(); await page.locator('.profile-editor-host').waitFor({ state:'hidden' })
      assert.deepEqual(state.writes.at(-1), { country: '日本' })
    })
    await check('catalog includes rare languages, paginates and preserves group on browser back', async () => {
      state.locale = 'zh-Hans'; await visit(); await open('personal'); await page.locator('[data-field="lang1_name"] .editor-catalog-entry').click()
      assert.ok((await page.locator('.catalog-count').innerText()).includes('7923'))
      await page.locator('.catalog-more').click(); assert.ok(await page.locator('.catalog-choices .catalog-choice').count() >= 120)
      await page.locator('.catalog-search input').fill('aaa'); await page.locator('.catalog-choice[data-code="aaa"]').click()
      assert.ok((await page.locator('.catalog-selected-value').innerText()).includes('Ghotuo'))
      await page.goBack(); await page.locator('.profile-catalog-picker').waitFor({ state:'hidden' }); assert.ok(await page.locator('.profile-editor-fields').isVisible())
      await page.locator('[data-field="lang1_name"] .editor-catalog-entry').click()
      await page.locator('.catalog-search input').fill('한국어'); await page.locator('.catalog-choice[data-code="kor"]').click()
      await page.locator('.catalog-choice[data-code="kor"]').click(); assert.equal(await page.locator('.catalog-selected-value').count(), 0)
      await page.locator('.catalog-search input').fill('doesnotexist123'); await page.locator('.catalog-empty').waitFor(); assert.equal(await page.locator('.catalog-choices .catalog-choice').count(),0)
      await page.locator('.catalog-search input').fill('yue'); const label = await page.locator('.catalog-choice[data-code="yue"]').innerText(); await page.locator('.catalog-choice[data-code="yue"]').click()
      await page.locator('.catalog-confirm').click(); await page.locator('.profile-catalog-picker').waitFor({ state:'hidden' }); await confirmGroup()
      await page.locator('.profile-editor-save').click(); await page.locator('.profile-editor-host').waitFor({ state:'hidden' }); assert.deepEqual(state.writes.at(-1), { lang1Name: label })
    })
    await check('catalog six locales fit narrow screens and retain legacy labels until changed', async () => {
      for (const locale of ['zh-Hans','zh-Hant','en','ru','ja','ko']) {
        state.locale = locale; state.profile.nationality = '旧国籍文字'; await page.setViewportSize({ width:320, height:780 }); await visit(); await open('personal')
        await page.locator('[data-field="nationality"] .editor-catalog-entry').click(); assert.equal(await page.locator('.catalog-selected-value').innerText(), '旧国籍文字')
        await page.locator('.catalog-search input').fill('United States'); const option = page.locator('.catalog-choice[data-code="US"]'); await option.waitFor(); const label = await option.innerText(); await option.click()
        assert.ok(!/profileEditor\./.test(await page.locator('.profile-catalog-picker').innerText()))
        assert.ok(await page.locator('.profile-catalog-picker').evaluate(el => el.scrollWidth <= el.clientWidth + 1))
        await page.screenshot({ path: path.join(output, 'catalog-' + locale + '.png') })
        await page.locator('.catalog-confirm').click(); await page.locator('.profile-catalog-picker').waitFor({ state:'hidden' }); await confirmGroup()
        await page.locator('.profile-editor-save').click(); await page.locator('.profile-editor-host').waitFor({ state:'hidden' }); assert.deepEqual(state.writes.at(-1), { nationality:label })
      }
      state.locale = 'zh-Hans'; await page.setViewportSize({ width:390, height:844 })
    })
    await check('failed save retains draft and retry suppresses duplicate submission', async () => { await visit(); await open('introduction'); await field('Selfintroduction').fill('新的自我介绍'); await confirmGroup(); state.fail = true; await page.locator('.profile-editor-save').click(); await page.locator('.profile-editor-save-error').waitFor({ state: 'visible' }); assert.ok(await page.locator('.profile-editor-host').isVisible()); state.fail = false; state.hold = true; const count = state.writes.length; await page.locator('.profile-editor-save').click(); await page.waitForTimeout(180); await page.locator('.profile-editor-save').click({ force: true }); assert.equal(state.writes.length, count + 1); release(); state.hold = false; await page.locator('.profile-editor-host').waitFor({ state: 'hidden' }); assert.ok((await page.locator('.profile-pane').innerText()).includes('新的自我介绍')) })
    await check('signature stays current when editing another profile field afterwards', async () => {
      await visit(); await page.locator('.identity-bio').click(); await page.locator('.bio-input input').fill('刚更新的签名'); await page.locator('.bio-input input').press('Enter')
      await page.waitForFunction(() => document.querySelector('.identity-bio')?.textContent === '刚更新的签名')
      await open('introduction'); assert.equal(await field('bio').inputValue(), '刚更新的签名')
      await page.locator('.profile-editor-group-cancel').click(); await page.locator('.profile-editor-fields').waitFor({ state:'hidden' }); await openGroup('employment'); await field('occupation').fill('建筑设计'); await confirmGroup(); await page.locator('.profile-editor-save').click(); await page.locator('.profile-editor-host').waitFor({ state:'hidden' })
      assert.equal(await page.locator('.identity-bio').innerText(), '刚更新的签名'); assert.equal(await page.evaluate(() => uni.getStorageSync('USER_INFO').bio), '刚更新的签名')
    })
    await check('unsaved draft browser back asks then preserves profile and scroll', async () => { await visit(); await page.evaluate(() => window.scrollTo(0, 120)); await open('employment'); await field('occupation').fill('不应保存'); await confirmGroup(); const count = state.writes.length; await page.goBack(); await page.locator('.profile-editor-discard-sheet').waitFor({ state: 'visible' }); await page.locator('.profile-editor-keep').click(); await page.locator('.profile-editor-discard-sheet').waitFor({ state: 'hidden' }); await page.locator('.profile-editor-close').click(); await page.locator('.profile-editor-discard').click(); await page.locator('.profile-editor-host').waitFor({ state: 'hidden' }); assert.equal(state.writes.length, count); assert.ok(page.url().endsWith(routeName)); assert.equal(await page.evaluate(() => window.scrollY), 120) })
    await check('sheet has upward entry downward exit with delayed unmount', async () => { await visit(); await page.locator('.profile-edit-entry').click(); const entering = await page.locator('.profile-editor-panel').evaluate(el => ({ transform: getComputedStyle(el).transform, duration: getComputedStyle(el).transitionDuration })); assert.notEqual(entering.duration, '0s'); await page.waitForTimeout(300); await page.locator('.profile-editor-close').click(); assert.ok(await page.locator('.profile-editor-host').count()); await page.waitForTimeout(100); const transform = await page.locator('.profile-editor-panel').evaluate(el => getComputedStyle(el).transform); assert.notEqual(transform, 'matrix(1, 0, 0, 1, 0, 0)'); await page.locator('.profile-editor-host').waitFor({ state: 'hidden' }) })
    await check('six language text submission and narrow layout', async () => {
      for (const locale of ['zh-Hans','zh-Hant','en','ru','ja','ko']) { state.locale = locale; state.profile.health = '旧值-' + locale; await page.setViewportSize({ width: 320, height: 780 }); await visit(); await open('basic'); assert.ok(!/profileEditor\./.test(await page.locator('.profile-editor-host').innerText())); const chip = page.locator('[data-field="health"] .profile-choice').first(), label = await chip.innerText(); await chip.click(); await page.screenshot({ path: path.join(output, 'basic-' + locale + '.png') }); assert.ok(await page.locator('.profile-editor-fields').evaluate(el => el.scrollWidth <= el.clientWidth + 1)); await confirmGroup(); await page.locator('.profile-editor-save').click(); await page.locator('.profile-editor-host').waitFor({ state: 'hidden' }); assert.equal(state.writes.at(-1).health, label) }
      state.locale='zh-Hans'; await page.setViewportSize({ width: 390, height: 844 })
    })
    await check('profile without uploaded images has a single default avatar', async () => { state.profile.avatar_url = ''; state.profile.photos = []; user.avatar_url = ''; await visit(); assert.equal(await page.locator('.identity-photo-stack .avatar-fallback').count(), 1); assert.equal(await page.locator('.identity-photo-stack .identity-photo-back').count(), 0) })
    assert.deepEqual(errors, [])
  } finally { fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ results, errors }, null, 2)); await browser.close() }
  if (results.some(item => !item.pass)) process.exitCode = 1
}
main().catch(e => { console.error(e); process.exitCode = 1 })
