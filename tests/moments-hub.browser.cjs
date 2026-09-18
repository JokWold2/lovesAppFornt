// Real uni-app H5 regression. Start H5 separately; every API is a local fixture.
// NODE_PATH=<Playwright runtime> node tests/moments-hub.browser.cjs
// Optional: H5_BASE_URL, QA_SCREENSHOT_DIR, QA_TEST_FILTER, BROWSER_CHANNEL.
// Browser coverage does not claim WeChat/iOS/Android device validation.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { chromium } = require('playwright')

const root = path.resolve(__dirname, '..')
const base = new URL(process.env.H5_BASE_URL || 'http://127.0.0.1:5173/app/')
const output = process.env.QA_SCREENSHOT_DIR || path.resolve(root, '../.lovesapp-runtime/moments-hub-qa')
const hubRoute = 'pages/my/myLifeShow/myLifeShow'
const filter = process.env.QA_TEST_FILTER ? new RegExp(process.env.QA_TEST_FILTER, 'i') : null
const portrait = index => `${base.origin}/__moments_qa__/portrait-${index}.svg`
const isPhotoUploadPath = endpoint => ['/api/profile/photos', '/api/profile/photos/replace'].includes(endpoint)
const uploadImage = { name: 'qa-photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=', 'base64') }
const user = { id: 99, accountLevel: 4, loginType: 'email', email: 'moments-qa@example.invalid', name: 'QAOwner', avatar_url: portrait(1) }
const profile = {
  id: 20, user_id: 99, native_last_name: '林', native_first_name: '予安', en_last_name: 'FixtureFamily', en_first_name: 'QAOwner',
  health: 'QAHealth', generation: 'QAGeneration', blessing_type: 'QABlessing', gender: 'QAGender', region: 'QARegion', country: 'QACountry',
  birth_year: 1996, birth_month: 7, birth_day: 19, height: 168, weight: 56, blood_type: 'QABlood', blood_rh: 'QARh', nationality: 'QANationality',
  qualification1: 'QAQualificationOne', qualification2: 'QAQualificationTwo', preferred_country1: 'QAPreferredOne', preferred_country2: 'QAPreferredTwo',
  lang1_name: 'QALanguageOne', lang1_level: 'QALevelOne', lang2_name: 'QALanguageTwo', lang2_level: 'QALevelTwo',
  degree_level: 'QADegree', degree_status: 'QADegreeStatus', school_name: 'QASchool', major: 'QAMajor',
  occupation: 'QAOccupation', company_name: 'QACompany_InternationalResearchAndDesign'.repeat(3),
  helper_name: 'QAHelper', helper_mobile: '+1 202 555 0148', helper_email: 'helper.private@example.invalid',
  hobby1: 'QAHobbyOne', hobby2: 'QAHobbyTwo', faith_life: 'QAFaith', spouse_faith_life: ['QASpouseOne', 'QASpouseTwo'],
  tool_hands: '右拇指', tool_yinyang: '陽', tool_five_elements: '木', tool_enneagram: '1: 改革型', tool_mbti: 'INFJ',
  Selfintroduction: 'QAIntroductionFirstLine\n第二行简介 — A long multilingual introduction. '.repeat(6),
  bio: 'QABio · 收藏生活中温柔的片刻', avatar_url: portrait(1), photos: JSON.stringify([1, 2, 3].map(portrait))
}
const fieldValues = ['林', '予安', 'FixtureFamily', 'QAOwner', 'QAHealth', 'QAGeneration', 'QABlessing', 'QAGender', 'QARegion', 'QACountry',
  '1996', '168', '56', 'QABlood', 'QARh', 'QANationality', 'QAQualificationOne', 'QAQualificationTwo', 'QAPreferredOne', 'QAPreferredTwo',
  'QALanguageOne', 'QALevelOne', 'QALanguageTwo', 'QALevelTwo', 'QADegree', 'QADegreeStatus', 'QASchool', 'QAMajor', 'QAOccupation', profile.company_name,
  'QAHelper', profile.helper_mobile, 'hel' + '*'.repeat('helper.private'.length - 3) + '@example.invalid', 'QAHobbyOne', 'QAHobbyTwo',
  'QAFaith', 'QASpouseOne', 'QASpouseTwo', 'INFJ', 'QAIntroductionFirstLine', '第二行简介']
const comments = [
  { id: 701, user_id: 51, email: 'first.reader@example.invalid', content: 'QAFirstComment', created_at: '2026-09-16T09:00:00Z', reply_count: 1 },
  { id: 702, user_id: 52, email: 'second.reader@example.invalid', content: 'QASecondComment', created_at: '2026-09-16T09:02:00Z', reply_count: 0 }
]
const reply = { id: 703, user_id: 53, email: 'reply.reader@example.invalid', content: 'QANestedReply', reply_to_user_id: 51, reply_to_email: comments[0].email,
  root_comment_id: 701, parent_comment_id: 701, created_at: '2026-09-16T09:03:00Z' }
const makeMoments = () => Array.from({ length: 8 }, (_, index) => ({
  id: 101 + index, user_id: 99, email: user.email, created_at: `2026-09-${String(16 - index).padStart(2, '0')}T08:12:00Z`,
  content: `QAMoment${index + 1} · 记录生活的光与影\nA quiet moment to remember. ` + (index === 2 ? 'Длинная строка без потери смысла. '.repeat(8) : ''),
  images: JSON.stringify(index < 3 ? [portrait(index % 3 + 1)] : []), video_url: null, location_name: index === 0 ? 'QALocation' : '',
  like_count: index === 0 ? 2 : 0, comment_count: index === 0 ? 3 : 0, is_liked: false, is_pinned: false
}))

async function main() {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use the local H5 runtime only')
  fs.mkdirSync(output, { recursive: true })
  const { translate } = await import(pathToFileURL(path.join(root, 'utils/locale.js')).href)
  const state = { locale: 'zh-Hans', moments: makeMoments(), profileFailure: false, momentsFailure: false, empty: false,
    requests: [], unexpectedWrites: [], addedComments: [], interactionsEmpty: false, bio: profile.bio, holdBio: false,
    photos: [1, 2, 3].map(portrait), uploadFailure: false, deleteFailure: false, uploadSequence: 0, uploadAttempts: 0, uploadFailureAt: null, holdProfile: false, replaceUnavailable: false }
  let releaseBioResponse = null, releaseProfileResponse = null
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' })
  const page = await context.newPage(), errors = [], failures = [], measurements = []
  let passed = 0, skipped = 0
  page.setDefaultTimeout(8000)
  page.on('pageerror', error => errors.push(error.message))
  const fulfill = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(body) })
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), endpoint = url.pathname, method = request.method()
    if (endpoint.startsWith('/api/')) {
      if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } })
      let data = {}; try { data = request.postDataJSON() || {} } catch (_) {}
      if (isPhotoUploadPath(endpoint) && method === 'POST') {
        const body = request.postDataBuffer()?.toString('utf8') || ''
        const replacement = body.match(/name="replacePhotoUrl"\r?\n\r?\n([^\r\n]+)/)?.[1]
        data = { multipart: /multipart\/form-data/i.test(request.headers()['content-type'] || ''), hasImage: /name="photos"; filename="/.test(body), replacePhotoUrl: replacement || null }
      }
      state.requests.push({ endpoint, method, data, query: Object.fromEntries(url.searchParams) })
      if (endpoint === '/api/auth/validate') return fulfill(route, { valid: true, user })
      if (endpoint.startsWith('/api/locale/')) return fulfill(route, { effectiveLocale: state.locale, localeMode: 'manual', preferredLocale: state.locale })
      if (endpoint.startsWith('/api/presence/')) return fulfill(route, { stale: false })
      if (endpoint === '/api/profile') {
        const snapshot = { ...profile, bio: state.bio, photos: JSON.stringify(state.photos) }
        if (state.holdProfile) await new Promise(resolve => { releaseProfileResponse = resolve })
        return state.profileFailure ? fulfill(route, { error: 'QA profile unavailable' }, 500) : fulfill(route, { profile: snapshot })
      }
      if (isPhotoUploadPath(endpoint) && method === 'POST') {
        state.uploadAttempts++
        if (endpoint === '/api/profile/photos/replace' && state.replaceUnavailable) return fulfill(route, { error: 'Old server does not support photo replacement' }, 404)
        if (endpoint === '/api/profile/photos/replace' && !data.replacePhotoUrl) return fulfill(route, { error: 'Replacement requires the original photo URL' }, 400)
        if (endpoint === '/api/profile/photos' && data.replacePhotoUrl) return fulfill(route, { error: 'Replacement must use its dedicated route' }, 400)
        if (state.uploadFailure || state.uploadFailureAt === state.uploadAttempts) return fulfill(route, { error: 'QA photo upload unavailable' }, 500)
        if (!data.multipart || !data.hasImage) return fulfill(route, { error: 'Fixture expects a multipart image upload' }, 400)
        const photo = `${base.origin}/__moments_qa__/uploaded-${++state.uploadSequence}.svg`
        if (data.replacePhotoUrl) {
          const index = state.photos.indexOf(data.replacePhotoUrl)
          if (index < 0) return fulfill(route, { error: 'Replacement photo is not present' }, 404)
          state.photos.splice(index, 1, photo)
        } else {
          if (state.photos.length >= 9) return fulfill(route, { error: 'Photo capacity reached' }, 400)
          state.photos.push(photo)
        }
        return fulfill(route, { photos: [...state.photos] })
      }
      if (endpoint === '/api/profile/photos' && method === 'DELETE') {
        if (state.deleteFailure) return fulfill(route, { error: 'QA photo delete unavailable' }, 500)
        state.photos = state.photos.filter(photo => photo !== data.photoUrl)
        return fulfill(route, { photos: [...state.photos] })
      }
      if (endpoint === '/api/profile/bio' && method === 'POST') {
        if (state.holdBio) await new Promise(resolve => { releaseBioResponse = resolve })
        state.bio = data.bio
        return fulfill(route, { bio: state.bio })
      }
      if (endpoint === '/api/moments' && method === 'GET') return state.momentsFailure ? fulfill(route, { error: 'QA moments unavailable' }, 500) : fulfill(route, { moments: state.empty ? [] : state.moments })
      if (endpoint === '/api/explore/profiles/20/likes') return fulfill(route, { total: 4, likes: [1, 2, 3].map(index => ({ userId: 40 + index, name: `QALiker${index}`, avatarUrl: portrait(index), createdAt: '2026-09-16T08:00:00Z' })) })
      const momentId = Number(endpoint.match(/^\/api\/moments\/(\d+)/)?.[1]), moment = state.moments.find(item => item.id === momentId)
      if (/\/moments\/\d+\/like$/.test(endpoint) && method === 'POST' && moment) {
        moment.is_liked = !moment.is_liked; moment.like_count += moment.is_liked ? 1 : -1
        return fulfill(route, { isLiked: moment.is_liked, likeCount: moment.like_count })
      }
      if (/\/moments\/\d+\/likes$/.test(endpoint)) return fulfill(route, { likes: momentId === 101 && !state.interactionsEmpty ? [{ user_id: 51, email: comments[0].email }, { user_id: 52, email: comments[1].email }] : [] })
      if (/\/moments\/\d+\/comments\/701\/replies$/.test(endpoint)) return fulfill(route, { replies: [reply], comments: [reply], hasMore: false, total: 1 })
      if (/\/moments\/\d+\/comments$/.test(endpoint) && method === 'GET') return fulfill(route, { comments: momentId === 101 && !state.interactionsEmpty ? [...comments, reply, ...state.addedComments] : [], hasMore: false, total: momentId === 101 && !state.interactionsEmpty ? 3 + state.addedComments.length : 0 })
      if (/\/moments\/\d+\/comments$/.test(endpoint) && method === 'POST' && moment) {
        const comment = { id: 800 + state.addedComments.length, user_id: 99, email: user.email, content: data.content, reply_to_user_id: data.replyToUserId,
          reply_to_comment_id: data.replyToCommentId, reply_to_email: data.replyToUserId ? comments[0].email : null, created_at: new Date().toISOString() }
        state.addedComments.push(comment); moment.comment_count++
        return fulfill(route, { comment })
      }
      if (/\/moments\/\d+\/pin$/.test(endpoint) && method === 'PATCH' && moment) { moment.is_pinned = !moment.is_pinned; return fulfill(route, { isPinned: moment.is_pinned }) }
      if (endpoint === '/api/notifications/unread-count') return fulfill(route, { interactionUnread: 0, profileLikeUnread: 4, chatUnread: 0, chatRequestUnread: 0, totalUnread: 0 })
      if (endpoint === '/api/membership') return fulfill(route, { accountLevel: 4, tierLevel: 4, canViewLikes: true, canSearch: true, plans: [], usage: {}, rewind: { available: false } })
      if (endpoint === '/api/blessings/likes') return fulfill(route, { items: [], likes: [], total: 4, hasMore: false, canViewLikes: true })
      if (method !== 'GET' && method !== 'HEAD') { state.unexpectedWrites.push({ endpoint, method, data }); return fulfill(route, { error: 'Unknown fixture write blocked' }, 500) }
      return fulfill(route, { notifications: [], groups: [], requests: [], posts: [], results: [], items: [], profiles: [], total: 0, hasMore: false })
    }
    if (endpoint.startsWith('/__moments_qa__/')) {
      const index = Number(endpoint.match(/portrait-(\d)/)?.[1]) || 1
      return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640"><rect width="480" height="640" fill="${['#c8b39d', '#adc5c3', '#b5b9d0'][(index - 1) % 3]}"/><circle cx="240" cy="205" r="100" fill="#f3dfc7"/><ellipse cx="240" cy="540" rx="180" ry="210" fill="#626b70"/><text x="25" y="600" font-size="45" fill="white">Photo ${index}</text></svg>` })
    }
    if (url.origin !== base.origin || !['GET', 'HEAD'].includes(method)) return route.abort()
    return route.continue()
  })
  const screenshot = name => page.screenshot({ path: path.join(output, name) })
  const check = async (name, work) => {
    if (filter && !filter.test(name)) { skipped++; return }
    try { await work(); passed++; console.log(`PASS ${name}`) }
    catch (error) { failures.push({ name, message: error.message }); console.error(`FAIL ${name}: ${error.message}`); await screenshot(`failure-${failures.length}.png`).catch(() => {}) }
  }
  const visit = async () => {
    await page.evaluate(({ locale, user }) => {
      uni.setStorageSync('AUTH_TOKEN', 'local-moments-fixture-token'); uni.setStorageSync('USER_INFO', user)
      uni.setStorageSync('PROFILE_LIKE_DOUBLE_TAP_GUIDE_V2', true)
      uni.setStorageSync('lovesapp.locale.preference', { mode: 'manual', locale })
    }, { locale: state.locale, user })
    await page.goto('about:blank')
    await page.goto(`${base.href}#/${hubRoute}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => getApp().globalData.restoringSession === false)
  }
  // Keep the existing case helpers semantic: 0 = moments, 1 = profile.
  // The user-facing tab order is now profile first, moments second.
  const tab = index => page.locator('.moments-tabs > uni-button').nth(index ? 0 : 1)
  const ready = async () => {
    await page.locator('.moments-tabs').waitFor({ state: 'visible' })
    if (await tab(0).getAttribute('aria-selected') !== 'true') await switchTab(0)
    await page.locator('.post-card').first().waitFor({ state: 'visible' })
  }
  const writes = endpoint => state.requests.filter(request => request.endpoint === endpoint && !['GET', 'HEAD', 'OPTIONS'].includes(request.method))
  const reset = () => { state.locale = 'zh-Hans'; state.moments = makeMoments(); state.profileFailure = false; state.momentsFailure = false; state.empty = false; state.addedComments = []; state.requests = []; state.interactionsEmpty = false; state.bio = profile.bio; state.holdBio = false; state.photos = [1, 2, 3].map(portrait); state.uploadFailure = false; state.deleteFailure = false; state.uploadSequence = 0; state.uploadAttempts = 0; state.uploadFailureAt = null; state.holdProfile = false; state.replaceUnavailable = false }
  const switchTab = async index => {
    await tab(index).click()
    await page.locator(index ? '.profile-pane' : '.moments-pane').waitFor({ state: 'visible' })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  const scroll = async y => {
    await page.evaluate(top => window.scrollTo(0, top), y)
    await page.waitForFunction(top => Math.abs(window.scrollY - top) < 2, y)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  const expectScroll = async (phase, y) => {
    try { await page.waitForFunction(top => Math.abs(window.scrollY - top) < 2, y) }
    catch (_) { throw new Error(`${phase}: expected scrollY=${y}, actual=${await page.evaluate(() => window.scrollY)}`) }
    measurements.push({ kind: 'scroll-phase', phase, expected: y, actual: await page.evaluate(() => window.scrollY) })
  }
  const routeIs = async route => page.waitForURL(url => url.hash.replace(/^#\/?/, '').split('?')[0] === route)
  const firstPost = () => page.locator('.post-card').filter({ hasText: 'QAMoment1' })
  const cancelMenu = async () => { await page.locator('.uni-actionsheet__action .uni-actionsheet__cell').click(); await page.locator('.uni-actionsheet_toggle').waitFor({ state: 'hidden' }) }
  const openPhotoManager = async () => { await page.locator('.photos-manage-button').click(); await page.locator('.photo-manager').waitFor({ state: 'visible' }) }
  const photoRequests = method => state.requests.filter(request => isPhotoUploadPath(request.endpoint) && request.method === method)
  const choosePhotoFile = async (source, cancel = false, files = uploadImage) => {
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator(`.photo-source-${source}`).click()])
    assert.equal(await chooser.element().getAttribute('capture'), source === 'camera' ? 'camera' : null, 'the selected source must reach the native uni H5 chooser')
    if (cancel) {
      // uni H5 handles the native input cancel event; no component method is replaced.
      await chooser.element().dispatchEvent('cancel')
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      return
    }
    const [response] = await Promise.all([
      page.waitForResponse(response => isPhotoUploadPath(new URL(response.url()).pathname) && response.request().method() === 'POST'),
      chooser.setFiles(files)
    ])
    return response.status()
  }
  const confirmPhotoRemoval = async (index = null) => {
    const target = index === null ? page.locator('.photo-editor-thumb.selected .photo-remove-button') : page.locator('.photo-editor-thumb').nth(index).locator('.photo-remove-button')
    await target.click()
    await page.locator('.uni-modal').waitFor({ state: 'visible' })
    const modal = await page.locator('.uni-modal__btn_primary').evaluate(element => {
      const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      const chain = node => { const values = []; for (; node; node = node.parentElement) values.push({ className: node.className, tag: node.tagName, z: getComputedStyle(node).zIndex }); return values }
      return { accessible: element.contains(hit), modalAncestors: chain(element), hitAncestors: chain(hit) }
    })
    measurements.push({ kind: 'photo-delete-confirm', ...modal })
    assert.ok(modal.accessible, `delete confirmation is covered by ${JSON.stringify(modal.hitAncestors)}`)
    const [response] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === '/api/profile/photos' && response.request().method() === 'DELETE'),
      page.locator('.uni-modal__btn_primary').click()
    ])
    return response.status()
  }
  const waitPhotoCount = async count => page.waitForFunction(expected => document.querySelectorAll('.photo-manager .photo-grid-image-button').length === expected, count)
  try {
    await page.goto(base.href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.uni?.setStorageSync)
    await check('profile opens by default before moments and both tabs isolate their content', async () => {
      reset()
      await visit()
      await page.locator('.moments-tabs').waitFor({ state: 'visible' })
      assert.equal(await tab(1).getAttribute('aria-selected'), 'true', 'profile is the default selected tab')
      assert.equal(await page.locator('.moments-tabs > uni-button').first().innerText(), translate(state.locale, 'momentsHub.profileTab'))
      assert.equal(await page.locator('.moments-pane:visible').count(), 0, 'the timeline starts hidden')
      await page.locator('.profile-pane').waitFor({ state: 'visible' })
      await page.locator('.profile-pane .profile-container--cards').waitFor({ state: 'visible' })
      assert.equal(await page.locator('.post-card:visible').count(), 0, 'timeline must not appear underneath profile fields')
      const content = await page.locator('.profile-pane').innerText()
      for (const value of fieldValues) assert.ok(content.includes(value), `missing profile field: ${value}`)
      assert.equal(await page.locator('.profile-pane .section--cards .tr').count(), 28)
      assert.equal(await page.locator('.profile-pane .profile-card-analysis').count(), 5)
      assert.equal(await page.locator('.profile-pane .portrait-gallery').count(), 0, 'photo management grid replaces the duplicated profile gallery')
      assert.equal(await page.locator('.photo-summary-strip uni-image').count(), 3)
      await tab(0).click(); await page.locator('.post-card').first().waitFor({ state: 'visible' })
      assert.equal(await page.locator('.post-card:visible').count(), 8)
      assert.equal(await page.locator('.profile-pane:visible').count(), 0, 'profile fields must not precede the timeline')
    })
    await check('all eight own-profile edit shortcuts open their corresponding group without writing', async () => {
      reset(); await visit()
      await page.locator('.profile-pane .profile-container--cards').waitFor({ state: 'visible' })
      const shortcuts = page.locator('.profile-pane .profile-card-edit, .profile-pane .section-edit')
      const groups = ['introduction', 'basic', 'personal', 'education', 'employment', 'helper', 'lifestyle', 'personality']
      assert.equal(await shortcuts.count(), groups.length)
      for (let index = 0; index < groups.length; index++) {
        await shortcuts.nth(index).click()
        await page.locator('.profile-editor-fields .editor-group-heading').waitFor({ state: 'visible' })
        assert.equal(await page.locator('.profile-editor-fields .editor-group-heading').innerText(), translate(state.locale, `profileEditor.groups.${groups[index]}`))
        await page.locator('.profile-editor-group-cancel').click()
        await page.locator('.profile-editor-fields').waitFor({ state: 'hidden' })
        await page.locator('.profile-editor-close').click()
        await page.locator('.profile-editor-host').waitFor({ state: 'hidden' })
      }
      assert.deepEqual(writes('/api/profile'), [], 'opening and cancelling a group must not save it')
    })
    await check('tabs preserve independent page scroll and keep the header fixed', async () => {
      reset(); await visit(); await ready()
      const before = await page.locator('.moments-tabs').boundingBox()
      await scroll(640)
      const after = await page.locator('.moments-tabs').boundingBox()
      assert.ok(Math.abs(before.y - after.y) < 2, 'section tabs must remain in place while the timeline scrolls')
      measurements.push({ kind: 'scroll-phase', phase: 'moments-before-switch', actual: await page.evaluate(() => window.scrollY) })
      await switchTab(1)
      await expectScroll('first-profile-open', 0)
      await scroll(980)
      measurements.push({ kind: 'scroll-phase', phase: 'profile-before-switch', actual: await page.evaluate(() => window.scrollY) })
      await switchTab(0)
      await expectScroll('return-to-moments', 640)
      await switchTab(1)
      await expectScroll('return-to-profile', 980)
      measurements.push({ kind: 'independent-scroll', moments: 640, profile: await page.evaluate(() => window.scrollY) })
    })
    await check('profile received likes enters incoming likes even after viewing outgoing likes', async () => {
      reset(); await visit(); await ready()
      await page.locator('.liquid-tabbar-item:visible').nth(1).click()
      await routeIs('pages/likes/likes')
      await page.locator('.likes-tabs > uni-button').nth(1).click()
      await page.locator('.likes-tabs > uni-button').nth(1).evaluate(element => {
        if (!element.classList.contains('active')) throw new Error('Outgoing likes were not selected')
      })
      await page.locator('.liquid-tabbar-item:visible').nth(3).click()
      await routeIs(hubRoute); await ready(); await switchTab(1)
      await page.locator('.profile-likes-entry').click()
      await routeIs('pages/likes/likes')
      assert.ok((await page.locator('.likes-tabs > uni-button').first().getAttribute('class')).includes('active'))
      assert.equal(await page.locator('.profile-likes-sheet:visible').count(), 0)
      assert.equal(writes('/api/notifications/profile-likes/view').length, 0, 'opening the incoming list must not mark individual profiles read')
    })
    await check('moment likes and comments retain their API behavior', async () => {
      reset(); await visit(); await ready()
      await Promise.all([
        page.waitForResponse(response => new URL(response.url()).pathname === '/api/moments/101/like' && response.request().method() === 'POST'),
        firstPost().locator('.post-like-button').click()
      ])
      assert.equal(writes('/api/moments/101/like').length, 1)
      assert.equal(state.moments[0].like_count, 3)
      await page.waitForFunction(() => [...document.querySelectorAll('.post-card')].find(element => element.textContent.includes('QAMoment1'))?.querySelector('.post-like-button')?.textContent.trim().endsWith('3'))
      await firstPost().locator('.post-comment-button').click()
      await firstPost().locator('.comment-input input').fill('QANewComment')
      await firstPost().locator('.comment-send-button').click()
      await page.waitForFunction(() => [...document.querySelectorAll('.post-card')].find(element => element.textContent.includes('QAMoment1'))?.textContent.includes('QANewComment'))
      const commentWrites = writes('/api/moments/101/comments')
      assert.equal(commentWrites.length, 1)
      assert.equal(commentWrites[0].data.content, 'QANewComment')
      assert.ok(commentWrites[0].data.replyToUserId == null, 'a new comment must not inherit a stale reply recipient')
      assert.equal(writes('/api/blessings/decisions').length, 0, 'moment likes do not consume blessing likes')
    })
    await check('expanded interactions retain the full comments and reply recipient', async () => {
      reset(); await visit(); await ready()
      await firstPost().locator('.interactions-toggle').click()
      await firstPost().locator('.comment-item').filter({ hasText: 'QAFirstComment' }).waitFor({ state: 'visible' })
      await firstPost().locator('.comment-item').filter({ hasText: 'QASecondComment' }).waitFor({ state: 'visible' })
      await firstPost().locator('.comment-item').filter({ hasText: 'QANestedReply' }).waitFor({ state: 'visible' })
      await firstPost().locator('.comment-item').filter({ hasText: 'QAFirstComment' }).click()
      await firstPost().locator('.comment-input input').fill('QAReplyToFirst')
      await firstPost().locator('.comment-send-button').click()
      await page.waitForFunction(() => document.body.textContent.includes('QAReplyToFirst'))
      const request = writes('/api/moments/101/comments').at(-1)
      assert.ok(request, 'reply must submit a real request through the API fixture')
      assert.equal(request.data.content, 'QAReplyToFirst'); assert.equal(request.data.replyToUserId, 51)
      if (request.data.replyToCommentId != null) assert.equal(request.data.replyToCommentId, 701)
    })
    await check('returning with zero interaction counts clears cached expanded comments and likes', async () => {
      reset(); await visit(); await ready()
      await firstPost().locator('.interactions-toggle').click()
      await firstPost().locator('.comment-item').filter({ hasText: 'QAFirstComment' }).waitFor({ state: 'visible' })
      assert.equal(await firstPost().locator('.comment-item').count(), 3)
      assert.equal(await firstPost().locator('.liked-by-row').count(), 1)
      await page.locator('.liquid-tabbar-item:visible').nth(1).click()
      await routeIs('pages/likes/likes')
      state.interactionsEmpty = true
      state.moments[0].like_count = 0; state.moments[0].comment_count = 0
      const before = state.requests.filter(request => request.endpoint === '/api/moments').length
      await Promise.all([
        page.waitForResponse(response => new URL(response.url()).pathname === '/api/moments' && response.request().method() === 'GET'),
        page.locator('.liquid-tabbar-item:visible').nth(3).click()
      ])
      await routeIs(hubRoute); await ready()
      await page.waitForFunction(() => [...document.querySelectorAll('.post-card')].find(element => element.textContent.includes('QAMoment1'))?.querySelector('.post-comment-button')?.textContent.trim().endsWith('0'))
      assert.equal(state.requests.filter(request => request.endpoint === '/api/moments').length, before + 1, 'returning must use the refreshed feed')
      assert.equal(await firstPost().locator('.interactions-toggle').count(), 0)
      assert.equal(await firstPost().locator('.comment-item').count(), 0, 'previous comments must be removed when their authoritative count becomes zero')
      assert.equal(await firstPost().locator('.liked-by-row').count(), 0, 'previous likers must be removed when their authoritative count becomes zero')
      assert.ok(!(await firstPost().innerText()).includes('QAFirstComment'))
    })
    await check('a slow signature save blocks a second edit and permits editing after completion', async () => {
      reset(); await visit(); await ready()
      state.holdBio = true
      try {
        await page.locator('.identity-bio').click()
        await page.locator('.bio-input input').fill('QASavedSignatureOne')
        await Promise.all([
          page.waitForRequest(request => new URL(request.url()).pathname === '/api/profile/bio' && request.method() === 'POST'),
          page.locator('.bio-input input').press('Enter')
        ])
        await page.waitForFunction(() => document.querySelector('.identity-bio')?.hasAttribute('disabled'))
        const button = await page.locator('.identity-bio').boundingBox()
        await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2)
        await page.touchscreen.tap(button.x + button.width / 2, button.y + button.height / 2)
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        assert.equal(await page.locator('.bio-input').count(), 0, 'a pending save must not open a second draft')
        assert.equal(writes('/api/profile/bio').length, 1, 'confirm/blur and repeated taps must share one save')
        assert.ok(releaseBioResponse, 'fixture should hold the in-flight response')
        state.holdBio = false; releaseBioResponse(); releaseBioResponse = null
        await page.waitForFunction(() => document.querySelector('.identity-bio')?.textContent.trim() === 'QASavedSignatureOne' && !document.querySelector('.identity-bio').hasAttribute('disabled'))
        assert.equal(await page.evaluate(() => uni.getStorageSync('USER_INFO').bio), 'QASavedSignatureOne')
        await page.locator('.identity-bio').click()
        await page.locator('.bio-input input').fill('QASavedSignatureTwo')
        await page.locator('.bio-input input').press('Enter')
        await page.waitForFunction(() => document.querySelector('.identity-bio')?.textContent.trim() === 'QASavedSignatureTwo')
        assert.deepEqual(writes('/api/profile/bio').map(request => request.data.bio), ['QASavedSignatureOne', 'QASavedSignatureTwo'])
        assert.equal(await page.evaluate(() => uni.getStorageSync('USER_INFO').bio), 'QASavedSignatureTwo')
      } finally {
        state.holdBio = false
        releaseBioResponse?.(); releaseBioResponse = null
      }
    })
    await check('post management keeps pin and delete options', async () => {
      reset(); await visit(); await ready()
      await firstPost().locator('.post-more-button').click()
      const menu = page.locator('.uni-actionsheet_toggle')
      await menu.waitFor({ state: 'visible' })
      assert.ok((await menu.innerText()).includes(translate(state.locale, 'life.delete')))
      await menu.getByText(translate(state.locale, 'life.pin'), { exact: true }).click()
      await page.waitForFunction(() => document.querySelector('.post-card')?.textContent.includes('置顶'))
      assert.equal(writes('/api/moments/101/pin').length, 1)
      assert.equal(writes('/api/moments/101/pin')[0].method, 'PATCH')
      assert.equal(state.moments[0].is_pinned, true)
      assert.equal(state.requests.filter(request => request.method === 'DELETE').length, 0)
    })
    await check('profile photo manager opens and closes and a summary thumbnail opens its editor', async () => {
      reset(); await visit(); await ready(); await switchTab(1)
      await openPhotoManager()
      assert.equal(await page.locator('.photo-grid-tile').count(), 9)
      assert.equal(await page.locator('.photo-grid-image-button').count(), 3)
      assert.equal(await page.locator('.photo-grid-add').count(), 6)
      await page.locator('.photo-manager-done').click()
      await page.locator('.photo-manager').waitFor({ state: 'hidden' })
      await page.locator('.photo-summary-strip uni-button').nth(1).click()
      await page.locator('.photo-editor').waitFor({ state: 'visible' })
      assert.ok((await page.locator('.photo-editor').innerHTML()).includes('portrait-2.svg'), 'the second thumbnail must open the second photo')
      await page.locator('.photo-replace-button').waitFor({ state: 'visible' })
      await page.locator('.photo-editor-thumb.selected .photo-remove-button').waitFor({ state: 'visible' })
      await page.locator('.photo-editor-close').click()
      await page.locator('.photo-editor').waitFor({ state: 'hidden' })
      await page.locator('.photo-manager-done').click()
      await page.locator('.photo-manager').waitFor({ state: 'hidden' })
      assert.equal(state.requests.filter(request => request.method === 'DELETE').length, 0)
    })
    await check('browser back closes the profile photo manager and restores the profile scroll position', async () => {
      reset(); await visit(); await ready(); await switchTab(1)
      await scroll(120)
      const before = await page.evaluate(() => ({ y: window.scrollY, url: location.href, bodyPosition: document.body.style.position, bodyOverflow: document.body.style.overflow }))
      await openPhotoManager()
      assert.equal(await page.evaluate(() => document.body.style.position), 'fixed')
      await page.goBack()
      await page.locator('.photo-sheet-host').waitFor({ state: 'hidden' })
      await expectScroll('photo-manager-browser-back', before.y)
      assert.equal(page.url(), before.url, 'browser back must close the layer without leaving the profile page')
      assert.equal(await tab(1).getAttribute('aria-selected'), 'true')
      assert.deepEqual(await page.evaluate(() => ({ bodyPosition: document.body.style.position, bodyOverflow: document.body.style.overflow })), { bodyPosition: before.bodyPosition, bodyOverflow: before.bodyOverflow })
      assert.equal(photoRequests('POST').length, 0)
      assert.equal(photoRequests('DELETE').length, 0)
    })
    await check('profile photo album addition uploads a real multipart file and updates the grid', async () => {
      reset(); await visit(); await ready(); await switchTab(1); await openPhotoManager()
      await page.locator('.photo-grid-add').first().click()
      await page.locator('.photo-source-sheet').waitFor({ state: 'visible' })
      assert.equal(await page.locator('.photo-source-facebook').count(), 1, 'Facebook import remains available when adding photos')
      assert.equal(await choosePhotoFile('album'), 200)
      await waitPhotoCount(4)
      assert.equal(photoRequests('POST').length, 1)
      assert.equal(photoRequests('POST')[0].endpoint, '/api/profile/photos')
      assert.deepEqual(photoRequests('POST')[0].data, { multipart: true, hasImage: true, replacePhotoUrl: null })
      assert.ok((await page.locator('.photo-manager').innerHTML()).includes('uploaded-1.svg'))
      assert.deepEqual(await page.evaluate(() => uni.getStorageSync('USER_INFO').photos), state.photos)
    })
    await check('profile photo replacement uses the camera source and preserves order and count', async () => {
      reset(); await visit(); await ready(); await switchTab(1); await openPhotoManager()
      await page.locator('.photo-grid-image-button').nth(1).click()
      await page.locator('.photo-replace-button').click()
      assert.equal(await page.locator('.photo-source-facebook').count(), 0, 'replacement must not invoke the multi-photo Facebook import')
      assert.equal(await choosePhotoFile('camera'), 200)
      await page.waitForFunction(() => document.querySelector('.photo-editor-preview')?.innerHTML.includes('uploaded-1.svg'))
      assert.deepEqual(state.photos, [portrait(1), `${base.origin}/__moments_qa__/uploaded-1.svg`, portrait(3)])
      assert.equal(photoRequests('POST')[0].data.replacePhotoUrl, portrait(2))
      assert.equal(photoRequests('POST')[0].endpoint, '/api/profile/photos/replace')
      assert.equal(photoRequests('DELETE').length, 0, 'replacement must not delete the old photo before uploading')
      assert.equal(await page.locator('.photo-editor-thumb').count(), 3)
    })
    await check('profile photo deletion confirms the selected photo and leaves the other photos intact', async () => {
      reset(); await visit(); await ready(); await switchTab(1); await openPhotoManager()
      await page.locator('.photo-grid-image-button').nth(1).click()
      assert.equal(await confirmPhotoRemoval(), 200)
      await page.locator('.photo-editor-close').click()
      await waitPhotoCount(2)
      assert.equal(photoRequests('DELETE').length, 1)
      assert.equal(photoRequests('DELETE')[0].data.photoUrl, portrait(2))
      assert.deepEqual(state.photos, [portrait(1), portrait(3)])
      assert.deepEqual(await page.evaluate(() => uni.getStorageSync('USER_INFO').photos), state.photos)
    })
    await check('deleting an earlier photo preserves the selected photo in the editor', async () => {
      reset(); await visit(); await ready(); await switchTab(1); await openPhotoManager()
      await page.locator('.photo-grid-image-button').nth(1).click()
      assert.ok((await page.locator('.photo-editor-preview').innerHTML()).includes('portrait-2.svg'))
      assert.equal(await confirmPhotoRemoval(0), 200)
      await page.waitForFunction(() => document.querySelectorAll('.photo-editor-thumb').length === 2)
      assert.deepEqual(state.photos, [portrait(2), portrait(3)])
      assert.equal(photoRequests('DELETE')[0].data.photoUrl, portrait(1))
      assert.ok((await page.locator('.photo-editor-preview').innerHTML()).includes('portrait-2.svg'), 'removing an earlier thumbnail must not advance the visible photo')
      assert.ok((await page.locator('.photo-editor-thumb.selected').innerHTML()).includes('portrait-2.svg'), 'the selected outline must follow the same photo URL')
    })
    await check('profile photo replacement and deletion failures retain the original photo', async () => {
      reset(); await visit(); await ready(); await switchTab(1); await openPhotoManager()
      state.uploadFailure = true
      await page.locator('.photo-grid-image-button').nth(1).click()
      await page.locator('.photo-replace-button').click()
      assert.equal(await choosePhotoFile('album'), 500)
      await page.locator('.photo-editor').waitFor({ state: 'visible' })
      await page.waitForFunction(() => !document.querySelector('.photo-replace-button')?.hasAttribute('disabled'))
      assert.ok((await page.locator('.photo-editor-preview').innerHTML()).includes('portrait-2.svg'))
      assert.deepEqual(state.photos, [1, 2, 3].map(portrait))
      assert.equal(photoRequests('DELETE').length, 0)
      state.deleteFailure = true
      assert.equal(await confirmPhotoRemoval(), 500)
      await page.waitForFunction(() => !document.querySelector('.photo-replace-button')?.hasAttribute('disabled'))
      assert.ok((await page.locator('.photo-editor-preview').innerHTML()).includes('portrait-2.svg'))
      assert.equal(await page.locator('.photo-editor-thumb').count(), 3)
      assert.deepEqual(await page.evaluate(() => uni.getStorageSync('USER_INFO').photos), [1, 2, 3].map(portrait))
    })
    await check('a full profile photo grid still allows replacement at nine photos', async () => {
      reset(); state.photos = Array.from({ length: 9 }, (_, index) => portrait(index + 1))
      await visit(); await ready(); await switchTab(1); await openPhotoManager()
      assert.equal(await page.locator('.photo-grid-tile').count(), 9)
      assert.equal(await page.locator('.photo-grid-add').count(), 0)
      await page.locator('.photo-grid-image-button').nth(8).click()
      await page.locator('.photo-replace-button').click()
      assert.equal(await choosePhotoFile('album'), 200)
      await page.waitForFunction(() => document.querySelector('.photo-editor-preview')?.innerHTML.includes('uploaded-1.svg'))
      assert.equal(state.photos.length, 9)
      assert.equal(photoRequests('POST')[0].data.replacePhotoUrl, portrait(9))
      assert.equal(photoRequests('DELETE').length, 0)
    })
    await check('an unsupported photo replacement route fails safely without appending or deleting photos', async () => {
      reset(); state.replaceUnavailable = true
      await visit(); await ready(); await switchTab(1); await openPhotoManager()
      await page.locator('.photo-grid-image-button').nth(1).click()
      await page.locator('.photo-replace-button').click()
      assert.equal(await choosePhotoFile('album'), 404)
      await page.waitForFunction(() => !document.querySelector('.photo-replace-button')?.hasAttribute('disabled'))
      assert.ok((await page.locator('.photo-editor-preview').innerHTML()).includes('portrait-2.svg'))
      assert.deepEqual(state.photos, [1, 2, 3].map(portrait))
      assert.equal(photoRequests('POST').length, 1)
      assert.equal(photoRequests('POST')[0].endpoint, '/api/profile/photos/replace')
      assert.equal(photoRequests('DELETE').length, 0)
      assert.deepEqual(await page.evaluate(() => uni.getStorageSync('USER_INFO').photos), state.photos)
    })
    await check('cancelled profile photo selection performs no upload and the next selection still works', async () => {
      reset(); await visit(); await ready(); await switchTab(1); await openPhotoManager()
      for (const source of ['album', 'camera']) {
        await page.locator('.photo-grid-add').first().click()
        await choosePhotoFile(source, true)
        assert.equal(photoRequests('POST').length, 0, `cancelling ${source} must not upload`)
        assert.deepEqual(state.photos, [1, 2, 3].map(portrait))
      }
      await page.locator('.photo-grid-add').first().click()
      assert.equal(await choosePhotoFile('album'), 200)
      await waitPhotoCount(4)
      assert.equal(photoRequests('POST').length, 1)
    })
    await check('a stale profile response cannot overwrite photos added after the request began', async () => {
      reset(); await visit(); await ready(); await switchTab(1)
      await page.locator('.liquid-tabbar-item:visible').nth(1).click(); await routeIs('pages/likes/likes')
      state.holdProfile = true
      try {
        await Promise.all([
          page.waitForRequest(request => new URL(request.url()).pathname === '/api/profile' && request.method() === 'GET'),
          page.locator('.liquid-tabbar-item:visible').nth(3).click()
        ])
        await routeIs(hubRoute)
        await page.locator('.profile-pane').waitFor({ state: 'visible' })
        await openPhotoManager()
        await page.locator('.photo-grid-add').first().click()
        assert.equal(await choosePhotoFile('album'), 200)
        await waitPhotoCount(4)
        assert.ok(releaseProfileResponse, 'the stale profile response must still be held')
        const staleResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/profile' && response.request().method() === 'GET')
        state.holdProfile = false; releaseProfileResponse(); releaseProfileResponse = null
        await staleResponse
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        assert.equal(await page.locator('.photo-grid-image-button').count(), 4, 'the delayed three-photo GET must not roll back the successful upload')
        assert.ok((await page.locator('.photo-manager').innerHTML()).includes('uploaded-1.svg'))
        assert.deepEqual(await page.evaluate(() => uni.getStorageSync('USER_INFO').photos), state.photos)
      } finally {
        state.holdProfile = false
        releaseProfileResponse?.(); releaseProfileResponse = null
      }
    })
    await check('partial profile photo upload failure retains completed uploads and permits retry', async () => {
      reset(); state.uploadFailureAt = 2
      await visit(); await ready(); await switchTab(1); await openPhotoManager()
      await page.locator('.photo-grid-add').first().click()
      const failureResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/profile/photos' && response.request().method() === 'POST' && response.status() === 500)
      assert.equal(await choosePhotoFile('album', false, [uploadImage, { ...uploadImage, name: 'qa-photo-two.png' }]), 200)
      await failureResponse
      await page.waitForFunction(() => !document.querySelector('.photo-grid-add')?.hasAttribute('disabled'))
      assert.equal(photoRequests('POST').length, 2)
      assert.equal(await page.locator('.photo-grid-image-button').count(), 4, 'the first completed upload must remain after the second fails')
      assert.ok((await page.locator('.photo-manager').innerHTML()).includes('uploaded-1.svg'))
      assert.deepEqual(await page.evaluate(() => uni.getStorageSync('USER_INFO').photos), state.photos)
      state.uploadFailureAt = null
      await page.locator('.photo-grid-add').first().click()
      assert.equal(await choosePhotoFile('album'), 200)
      await waitPhotoCount(5)
      assert.equal(photoRequests('DELETE').length, 0)
    })
    await check('profile photo manager editor and source sheet fit a 320px Russian viewport', async () => {
      reset(); state.locale = 'ru'
      await page.setViewportSize({ width: 320, height: 844 }); await visit(); await ready(); await switchTab(1); await openPhotoManager()
      for (const surface of ['.photo-manager', '.photo-editor', '.photo-source-sheet']) {
        if (surface === '.photo-editor') await page.locator('.photo-grid-image-button').first().click()
        if (surface === '.photo-source-sheet') await page.locator('.photo-replace-button').click()
        await page.locator(surface).waitFor({ state: 'visible' })
        const metrics = await page.locator(surface).evaluate(element => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth,
          overflow: [...element.querySelectorAll('uni-button,uni-text,uni-view')].filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden' && !node.closest('.photo-editor-rail')).filter(node => {
            const r = node.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || (node.scrollWidth > node.clientWidth + 2 && !node.matches('.photo-grid-tile,.photo-grid-add') && !/auto|scroll|hidden/.test(getComputedStyle(node).overflowX))
          }).map(node => ({ className: node.className, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth })) }))
        measurements.push({ kind: 'photo-manager-layout', surface, locale: state.locale, ...metrics })
        assert.ok(metrics.documentWidth <= 321)
        assert.deepEqual(metrics.overflow, [], `${surface} should wrap Russian labels inside the viewport`)
        assert.ok(!(await page.locator(surface).innerText()).includes('photoManager.'), 'photo labels must be translated')
        await screenshot(`photo-${surface.slice(1)}-320-ru.png`)
      }
    })
    for (const [width, locale] of [[390, 'zh-Hans'], [320, 'ru']]) {
      await check(`no horizontal overflow and readable controls at ${width}px ${locale}`, async () => {
        reset(); state.locale = locale
        await page.setViewportSize({ width, height: 844 }); await visit(); await ready()
        for (const index of [0, 1]) {
          if (index) await switchTab(index)
          const layout = await page.evaluate(() => {
            const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden'
            const selectors = '.moments-page-header,.moments-identity,.moments-tabs,.post-card,.profile-likes-entry,.profile-pane .profile-card,.profile-pane .section--cards,.profile-pane .th,.profile-pane .td'
            return { width: innerWidth, documentWidth: document.documentElement.scrollWidth,
              overflow: [...document.querySelectorAll(selectors)].filter(visible).filter(node => {
                const rect = node.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2
              }).map(node => ({ className: node.className, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth })),
              controls: [...document.querySelectorAll('.moments-tabs > uni-button,.post-more-button,.post-like-button,.post-comment-button,.photos-manage-button')].filter(visible).map(node => {
                const r = node.getBoundingClientRect(); return { className: node.className, width: r.width, height: r.height }
              }) }
          })
          measurements.push({ kind: 'layout', width, locale, tab: index, ...layout })
          assert.ok(layout.documentWidth <= width + 1, `document width ${layout.documentWidth} exceeds ${width}`)
          assert.deepEqual(layout.overflow, [], 'content and translated controls must wrap')
          for (const control of layout.controls) assert.ok(control.width >= 44 && control.height >= 44, `${control.className} target is ${control.width}×${control.height}`)
          assert.equal(await page.locator('.moments-page .lightning-button').count(), 0, 'search is removed from this page')
          assert.ok(!/life\.\w+|profile\.\w+|momentsHub\.\w+/.test(await page.locator('.moments-page').innerText()), 'locale keys must not appear in UI')
          await screenshot(`moments-${index ? 'profile' : 'timeline'}-${width}-${locale}.png`)
        }
      })
    }
    await check('moments API error offers retry instead of claiming the feed is empty', async () => {
      reset(); state.momentsFailure = true
      await visit(); await switchTab(0); await page.locator('.moments-retry').waitFor({ state: 'visible' })
      assert.equal(await page.locator('.post-card:visible').count(), 0)
      assert.ok(!(await page.locator('.moments-pane').innerText()).includes(translate(state.locale, 'momentsHub.emptyTitle')))
      await screenshot('moments-error.png')
      state.momentsFailure = false
      await page.locator('.moments-retry').click(); await ready()
      assert.equal(await page.locator('.post-card:visible').count(), 8)
    })
    await check('profile API error is isolated from moments and can retry', async () => {
      reset(); state.profileFailure = true
      await visit(); await ready(); await switchTab(1)
      await page.locator('.profile-retry').waitFor({ state: 'visible' })
      await screenshot('profile-error.png')
      state.profileFailure = false
      await page.locator('.profile-retry').click()
      await page.locator('.profile-pane .profile-container--cards').waitFor({ state: 'visible' })
      assert.ok((await page.locator('.profile-pane').innerText()).includes('QASchool'))
    })
    await check('a successful empty feed has an empty state while profile data remains available', async () => {
      reset(); state.empty = true
      await visit(); await page.locator('.moments-tabs').waitFor({ state: 'visible' })
      await switchTab(0)
      await page.getByText(translate(state.locale, 'momentsHub.emptyTitle'), { exact: true }).waitFor({ state: 'visible' })
      assert.equal(await page.locator('.moments-retry:visible').count(), 0)
      assert.equal(await page.locator('.post-card').count(), 0)
      await screenshot('moments-empty.png')
      await switchTab(1)
      assert.ok((await page.locator('.profile-pane').innerText()).includes('QASchool'))
    })
    await check('no browser exceptions or unspecified writes', async () => { assert.deepEqual(errors, []); assert.deepEqual(state.unexpectedWrites, []) })
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed, skipped, failures, errors, measurements, requests: state.requests, unexpectedWrites: state.unexpectedWrites }, null, 2))
    await browser.close()
  }
  console.log(JSON.stringify({ passed, skipped, failures, output }, null, 2))
  if (failures.length) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
