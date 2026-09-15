// Real Likes/Profile Vue pages and shared badge store; external APIs are local
// fixtures. Chromium rendering/touch checks do not replace real-device testing.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { build } = require('esbuild')
const { parse, compileScript, compileStyleAsync } = require('@vue/compiler-sfc')
const root = path.resolve(__dirname, '..')
const output = process.env.QA_SCREENSHOT_DIR || path.resolve(root, '../.lovesapp-runtime/profile-like-viewed-qa')

async function bundle() {
  const styles = []
  const result = await build({
    stdin: { resolveDir: root, contents: `import {createApp,h,nextTick} from 'vue';
      import Likes from './pages/likes/likes.vue';import Detail from './pages/searchPerson/personShow/personShow.vue';
      import {tabBarState} from './utils/tabBarState.js';import {currentLocale} from '@/utils/localeRuntime.js';
      let app=null;window.fixture.tabs=tabBarState;
      window.fixture.mount=async(kind,id=12)=>{if(app)app.unmount();window.fixtureHooks={load:[],show:[],hide:[],unload:[]};window.fixture.kind=kind;app=createApp(kind==='likes'?Likes:Detail);app.component('uni-icons',{props:['type','size','color'],render(){return h('span',{class:'uni-icons uniui-'+this.type,style:{fontSize:this.size+'px',color:this.color}})}});window.fixture.subject=app.mount('#app');for(const fn of fixtureHooks.load)fn({id});for(const fn of fixtureHooks.show)fn();await nextTick();};
      window.fixture.locale=value=>{currentLocale.value=value};window.fixture.mount('likes');` },
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'profile-view-fixture', setup(b) {
      b.onResolve({ filter: /^@dcloudio\/uni-app$|^@\/api\// }, args => ({ path: args.path, namespace: 'fixture' }))
      b.onResolve({ filter: /^@\/utils\/(localeRuntime|config|auth|unreadBadge)\.js$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        if (args.path.includes('/api/')) return { contents: ['getMembershipApi', 'getBlessingLikesApi', 'getCandidateProfileApi', 'getProfileLikesApi', 'toggleProfileLikeApi', 'createChatRequestApi', 'getChatRequestStatusApi', 'decideBlessingApi', 'markProfileLikeViewedApi'].map(name => `export const ${name}=(...args)=>window.fixture.api.${name}(...args);`).join('\n') }
        if (args.path.includes('localeRuntime')) return { contents: `import {ref} from 'vue';import {translate} from ${JSON.stringify(path.join(root, 'utils/locale.js'))};export const currentLocale=ref('zh-Hans');export const t=(key,args)=>translate(currentLocale.value,key,args);`, resolveDir: root }
        if (args.path.includes('config')) return { contents: 'export const config={baseURL:""};' }
        if (args.path.includes('auth')) return { contents: 'export const getToken=()=>window.fixture.token;' }
        if (args.path.includes('unreadBadge')) return { contents: 'export const refreshUnreadBadge=async(options)=>window.fixture.refreshBadges(options);' }
        return { contents: `export const onLoad=fn=>window.fixtureHooks.load.push(fn);export const onShow=fn=>window.fixtureHooks.show.push(fn);export const onHide=fn=>window.fixtureHooks.hide.push(fn);export const onUnload=fn=>window.fixtureHooks.unload.push(fn);export const onReady=()=>{};export const onResize=()=>{};export const onReachBottom=()=>{};export const onPullDownRefresh=()=>{};` }
      })
      b.onResolve({ filter: /^@\// }, args => ({ path: path.join(root, args.path.slice(2)) }))
      b.onLoad({ filter: /\.vue$/ }, async args => {
        let source = fs.readFileSync(args.path, 'utf8').replace(/\/\/ #ifndef H5[\s\S]*?\/\/ #endif/g, '')
          .replace(/<image(?=[\s>])/g, '<img').replace(/<\/image>/g, '</img>')
        if (args.path.endsWith('likes.vue')) source = source.replace('</script>', 'defineExpose({refresh,switchDirection})\n</script>')
        const { descriptor, errors } = parse(source, { filename: args.path }); assert.deepEqual(errors, [])
        const id = 'viewed-' + path.basename(args.path, '.vue')
        const script = compileScript(descriptor, { id, inlineTemplate: true })
        for (const style of descriptor.styles) {
          const compiled = await compileStyleAsync({ source: style.content, filename: args.path, id, preprocessLang: style.lang })
          assert.deepEqual(compiled.errors, [])
          styles.push(compiled.code.replace(/([\d.]+)rpx/g, (_, value) => `calc(${value} * 100vw / 750)`))
        }
        return { contents: script.content, resolveDir: path.dirname(args.path) }
      })
    } }]
  })
  const icons = path.join(root, 'node_modules/@dcloudio/uni-ui/lib/uni-icons')
  styles.push(`@font-face{font-family:uniicons;src:url(data:font/ttf;base64,${fs.readFileSync(path.join(icons, 'uniicons.ttf')).toString('base64')})}.uni-icons{font-family:uniicons!important}` + fs.readFileSync(path.join(icons, 'uniicons.css'), 'utf8'))
  return { js: result.outputFiles[0].text, css: styles.join('\n') }
}

function installFixture() {
  const photo = color => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><rect width="160" height="240" fill="${color}"/><circle cx="80" cy="75" r="35" fill="#f0dfcc"/><ellipse cx="80" cy="200" rx="64" ry="88" fill="#515857"/></svg>`)
  const state = { kind: 'likes', token: 'viewer', tier: 3, requests: [], acks: [], badgeRefreshes: [], profileFailure: false, profileDelay: false,
    items: [
      { profileId: 12, userId: 80, displayName: '林予安', avatarUrl: photo('#ad8b76'), unread: true, mutual: true, likeId: 401 },
      { profileId: 13, userId: 81, displayName: 'Alex', avatarUrl: photo('#6e8c99'), unread: true, mutual: false, likeId: 402 },
      { profileId: 14, userId: 82, displayName: '유나', avatarUrl: photo('#9c9879'), unread: false, mutual: false, likeId: 403 }
    ] }
  state.refreshBadges = async options => { state.badgeRefreshes.push(options); state.tabs.setUnreadSummary({ totalUnread: 7, profileLikeUnread: state.items.filter(item => item.unread).length }) }
  state.api = {
    getMembershipApi: async () => ({ tierLevel: state.tier, canViewLikes: state.tier >= 3 }),
    getBlessingLikesApi: async ({ direction }) => ({ total: 3, hasMore: false, items: state.items.map(item => state.tier < 3 && direction === 'incoming' ? { rowKey: String(item.profileId), locked: true, maskedDisplayName: item.displayName[0] + '***', previewUrl: item.avatarUrl } : { ...item }) }),
    getCandidateProfileApi: async id => {
      if (state.profileDelay) await new Promise(resolve => { state.resolveProfile = resolve })
      if (state.profileFailure) throw Error('profile unavailable')
      const item = state.items.find(item => item.profileId === Number(id))
      return { profile: { id: item.profileId, user_id: item.userId, native_first_name: item.displayName, photos: [item.avatarUrl], bio: 'Profile fixture' }, incomingLikeId: state.tier >= 3 && item.unread ? item.likeId : null }
    },
    markProfileLikeViewedApi: async (profileId, likeId) => {
      state.acks.push({ profileId, likeId, rendered: !!document.querySelector('.profile-container'), visible: state.kind === 'detail' })
      const item = state.items.find(item => item.profileId === profileId && item.likeId === likeId)
      if (item && state.tier >= 3) item.unread = false
      return { affected: item ? 1 : 0 }
    },
    getProfileLikesApi: async () => ({ isLiked: true, total: 1 }),
    getChatRequestStatusApi: async () => ({ status: 'none', isLiked: true, mutual: true })
  }
  window.fixture = state; window.fixtureHooks = { load: [], show: [], hide: [], unload: [] }
  const events = new Map()
  window.getCurrentPages = () => [{ route: state.kind === 'likes' ? 'pages/likes/likes' : 'pages/searchPerson/personShow/personShow' }]
  window.uni = {
    getStorageSync: key => key === 'USER_INFO' ? { id: 99 } : 1,
    $on: (name, fn) => { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn) },
    $off: (name, fn) => events.get(name)?.delete(fn),
    hideTabBar: () => {}, stopPullDownRefresh: () => {}, showToast: () => {},
    getWindowInfo: () => ({ windowWidth: innerWidth, statusBarHeight: 24, uniPlatform: 'h5' }),
    getSystemInfoSync: () => ({ windowWidth: innerWidth, statusBarHeight: 24, uniPlatform: 'h5' }),
    createSelectorQuery: () => ({ in() { return this }, select(value) { this.selector = value; return this }, boundingClientRect(fn) { this.callback = fn; return this }, exec() { this.callback(document.querySelector(this.selector)?.getBoundingClientRect()) } }),
    navigateTo: ({ url }) => state.requests.push(url), switchTab: ({ url }) => state.requests.push(url),
    onKeyboardHeightChange: () => {}, offKeyboardHeightChange: () => {}
  }
}

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const compiled = await bundle(), browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  let passed = 0
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' })
    page.setDefaultTimeout(4000)
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', async route => {
      const url = route.request().url()
      if (url.startsWith('http://fixture.local/static/')) return route.fulfill({ body: fs.readFileSync(path.join(root, url.replace('http://fixture.local/', ''))), contentType: 'image/png' })
      return route.abort()
    })
    await page.setContent('<base href="http://fixture.local/"><style>view{display:block}body{margin:0;background:#f6f5f2;font-family:Arial,sans-serif}button{display:block;border:0;font:inherit}img{object-fit:cover}.uni-icons{display:inline-block;width:23px;height:25px;line-height:25px}</style><div id="app"></div>')
    await page.evaluate(installFixture); await page.addStyleTag({ content: compiled.css }); await page.addScriptTag({ content: compiled.js })
    await page.waitForSelector('.person-card')
    await page.evaluate(() => fixture.refreshBadges())
    for (const width of [320, 390]) for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']) {
      await page.setViewportSize({ width, height: 844 })
      await page.evaluate(locale => fixture.locale(locale), locale)
      assert.equal(await page.locator('.person-unread-dot').count(), 2)
      assert.equal(await page.locator('.relationship-heart').count(), 3)
      const issues = await page.locator('.person-card').evaluateAll(cards => cards.flatMap(card => {
        const dot = card.querySelector('.person-unread-dot'), image = card.querySelector('.person-photo'), heart = card.querySelector('.relationship-heart')
        const result = []
        if (!image?.complete || image.naturalWidth !== 160) result.push('original image missing')
        if (dot) {
          const d = dot.getBoundingClientRect(), h = heart.getBoundingClientRect(), c = card.getBoundingClientRect(), css = getComputedStyle(dot)
          if (d.x >= c.x + c.width / 2 || d.right >= h.left || d.y < c.y || d.bottom > c.y + 40) result.push('dot placement')
          if (css.backgroundColor !== 'rgb(229, 57, 53)' || css.borderTopColor !== 'rgb(255, 255, 255)' || css.pointerEvents !== 'none') result.push('dot style')
        }
        return result
      }))
      assert.deepEqual(issues, [])
      assert.deepEqual(await page.evaluate(() => fixture.acks), [])
      if ((width === 390 && locale === 'zh-Hans') || (width === 320 && locale === 'ru')) await page.screenshot({ path: path.join(output, `likes-unviewed-${width}-${locale}.png`) })
      passed++
    }
    await page.evaluate(() => fixture.subject.switchDirection('outgoing'))
    await page.waitForTimeout(50); assert.equal(await page.locator('.person-unread-dot').count(), 0); passed++
    await page.evaluate(() => { fixture.tier = 2; return fixture.mount('likes') })
    await page.waitForSelector('.person-card.locked'); assert.equal(await page.locator('.person-unread-dot').count(), 0)
    await page.evaluate(() => fixture.mount('detail', 12)); await page.waitForSelector('.profile-container')
    assert.deepEqual(await page.evaluate(() => fixture.acks), []); passed++
    await page.evaluate(() => { fixture.tier = 3; return fixture.mount('likes') }); await page.waitForSelector('.person-unread-dot')
    const dot = await page.locator('.person-unread-dot').first().boundingBox()
    await page.touchscreen.tap(dot.x + dot.width / 2, dot.y + dot.height / 2)
    assert.equal(await page.evaluate(() => fixture.requests.at(-1)), '/pages/searchPerson/personShow/personShow?id=12')
    assert.deepEqual(await page.evaluate(() => fixture.acks), []); passed++
    await page.evaluate(() => fixture.mount('detail', 12)); await page.waitForFunction(() => fixture.acks.length === 1)
    assert.deepEqual(await page.evaluate(() => fixture.acks), [{ profileId: 12, likeId: 401, rendered: true, visible: true }])
    assert.deepEqual(await page.evaluate(() => [fixture.tabs.read().likesUnreadText, fixture.tabs.read().unreadText]), ['1', '7']); passed++
    await page.evaluate(() => fixture.mount('likes')); await page.waitForSelector('.person-unread-dot')
    assert.equal(await page.locator('.person-unread-dot').count(), 1)
    assert.equal(await page.locator('.person-card').first().locator('.person-unread-dot').count(), 0); passed++
    await page.evaluate(() => { fixture.profileFailure = true; return fixture.mount('detail', 13) }); await page.waitForSelector('.state-box')
    assert.equal(await page.evaluate(() => fixture.acks.length), 1); passed++
    await page.evaluate(() => { fixture.profileFailure = false; fixture.profileDelay = true; return fixture.mount('detail', 13) })
    await page.waitForFunction(() => !!fixture.resolveProfile)
    await page.evaluate(() => { for (const fn of fixtureHooks.hide) fn(); fixture.resolveProfile() })
    await page.waitForTimeout(100); assert.equal(await page.evaluate(() => fixture.acks.length), 1); passed++
    assert.deepEqual(errors, [])
    await page.close()
  } finally { await browser.close() }
  const report = { passed, failed: 0, limitation: 'Real Vue pages with API fixtures in Chromium, no physical devices or WeChat runtime.' }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
