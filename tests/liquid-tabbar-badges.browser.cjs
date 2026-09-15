// Run with Node and the bundled NODE_PATH (Playwright, esbuild, Vue).
// Mounts the real navigation component and store with local data. This is a
// Chromium layout/touch test, not a WeChat runtime or physical device test.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { build } = require('esbuild')
const { parse, compileScript, compileStyleAsync } = require('@vue/compiler-sfc')

const root = path.resolve(__dirname, '..')
const output = process.env.QA_SCREENSHOT_DIR || path.resolve(root, '../.lovesapp-runtime/tabbar-badges-qa')

async function compileFixture() {
  const styles = []
  const result = await build({
    stdin: { resolveDir: root, contents: `
      import {createApp,h,nextTick} from 'vue';
      import Navigation from './components/navigation/LiquidGlassTabBar.vue';
      import {tabBarState} from './utils/tabBarState.js';
      import {currentLocale} from '@/utils/localeRuntime.js';
      const route='pages/index/index360';
      window.fixture={routes:[],set:async(locale,summary)=>{currentLocale.value=locale;tabBarState.setUnreadSummary(summary);tabBarState.activate(route);await nextTick();},summary:async(data)=>{tabBarState.setUnreadSummary(data);await nextTick();},home:async()=>{tabBarState.activate(route);await nextTick();}};
      window.getCurrentPages=()=>[{route}];
      window.uni={hideTabBar:()=>{},showToast:()=>{},switchTab:options=>{window.fixture.routes.push(options.url);options.complete?.();},onKeyboardHeightChange:()=>{},offKeyboardHeightChange:()=>{}};
      const app=createApp({render:()=>h(Navigation,{activeRoute:route})});
      app.component('uni-icons',{props:['type','size','color'],render(){return h('span',{class:'uni-icons uniui-'+this.type,style:{fontSize:this.size+'px',color:this.color}})}});
      app.mount('#app');`
    },
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'navigation-fixture', setup(b) {
      b.onResolve({ filter: /^@dcloudio\/uni-app$|^@\/utils\/localeRuntime\.js$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => args.path.includes('localeRuntime')
        ? { contents: `import {ref} from 'vue';import {translate} from ${JSON.stringify(path.join(root, 'utils/locale.js'))};export const currentLocale=ref('zh-Hans');export const t=(key,params)=>translate(currentLocale.value,key,params);`, resolveDir: root }
        : { contents: 'export const onShow=()=>{};export const onHide=()=>{};' })
      b.onResolve({ filter: /^@\// }, args => ({ path: path.join(root, args.path.slice(2)) }))
      b.onLoad({ filter: /\.vue$/ }, async args => {
        const source = fs.readFileSync(args.path, 'utf8')
          .replace(/\/\/ #ifndef H5[\s\S]*?\/\/ #endif/g, '')
        const { descriptor, errors } = parse(source, { filename: args.path })
        assert.deepEqual(errors, [])
        const id = 'badge-navigation'
        const script = compileScript(descriptor, { id, inlineTemplate: true })
        for (const style of descriptor.styles) {
          const compiled = await compileStyleAsync({ source: style.content, filename: args.path, id, preprocessLang: style.lang })
          assert.deepEqual(compiled.errors, [])
          styles.push(compiled.code)
        }
        return { contents: script.content, resolveDir: path.dirname(args.path) }
      })
    } }]
  })
  const iconRoot = path.join(root, 'node_modules/@dcloudio/uni-ui/lib/uni-icons')
  const font = fs.readFileSync(path.join(iconRoot, 'uniicons.ttf')).toString('base64')
  const iconCss = `@font-face{font-family:uniicons;src:url(data:font/ttf;base64,${font}) format('truetype')}.uni-icons{font-family:uniicons!important}` +
    fs.readFileSync(path.join(iconRoot, 'uniicons.css'), 'utf8')
  return { js: result.outputFiles[0].text, css: styles.join('\n') + '\n' + iconCss }
}

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const compiled = await compileFixture()
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  const failures = []
  let passed = 0
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 700 }, hasTouch: true, reducedMotion: 'reduce' })
    page.setDefaultTimeout(2500)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => route.abort())
    await page.setContent('<style>view{display:block}text{display:inline}body{margin:0;background:#f5f5f7;font-family:Arial,sans-serif}button{font:inherit}.uni-icons{display:inline-block;width:23px;height:25px;line-height:25px}</style><div id="app"></div>')
    await page.addStyleTag({ content: compiled.css })
    await page.addScriptTag({ content: compiled.js })
    await page.waitForSelector('.liquid-tabbar-item')
    await page.evaluate(() => document.fonts.ready)
    const check = async (name, task) => {
      try { await task(); passed++ }
      catch (error) { failures.push(name + ': ' + error.message); console.error('FAIL ' + failures.at(-1)) }
    }
    const values = async () => page.locator('.liquid-tabbar-item').evaluateAll(items => items.map(item => item.querySelector('.liquid-tabbar-badge')?.textContent || ''))
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 700 })
      for (const locale of ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko']) {
        const label = width + '/' + locale
        await page.evaluate(({ locale }) => window.fixture.set(locale, { totalUnread: 0, profileLikeUnread: 0 }), { locale })
        const originalBounds = await page.locator('.liquid-tabbar').boundingBox()
        for (const [count, expected] of [[1, '1'], [99, '99'], [120, '99+']]) {
          await check(label + '/' + expected + ' both badges render without layout shift', async () => {
            await page.evaluate(count => window.fixture.summary({ totalUnread: count, profileLikeUnread: count }), count)
            assert.deepEqual(await values(), ['', expected, expected, ''])
            assert.deepEqual(await page.locator('.liquid-tabbar').boundingBox(), originalBounds)
            const issues = await page.evaluate(() => {
              const issues = []
              document.querySelectorAll('.liquid-tabbar-badge').forEach(badge => {
                const bounds = badge.getBoundingClientRect()
                const icon = badge.parentElement.getBoundingClientRect()
                const tab = badge.closest('.liquid-tabbar-item').getBoundingClientRect()
                const css = getComputedStyle(badge)
                if (css.backgroundColor !== 'rgb(229, 57, 53)' || css.color !== 'rgb(255, 255, 255)') issues.push('wrong badge colors')
                if (css.pointerEvents !== 'none') issues.push('badge intercepts input')
                if (!(bounds.x > icon.x + icon.width / 2 && bounds.y < icon.y)) issues.push('badge not at icon upper-right')
                if (bounds.right > tab.right || bounds.top < tab.top - 1) issues.push('badge clipped outside tap target')
                if (bounds.width < 16 || bounds.height < 16 || badge.scrollWidth > badge.clientWidth + 1) issues.push('badge text clipped')
              })
              if (document.documentElement.scrollWidth > innerWidth) issues.push('horizontal overflow')
              if ([...document.querySelectorAll('.liquid-tabbar-label')].some(item => /navigation\./.test(item.textContent))) issues.push('untranslated label')
              return issues
            })
            assert.deepEqual(issues, [])
          })
        }
        await check(label + ' counts update and clear independently', async () => {
          await page.evaluate(() => window.fixture.summary({ totalUnread: 12, profileLikeUnread: 0 }))
          assert.deepEqual(await values(), ['', '', '12', ''])
          await page.evaluate(() => window.fixture.summary({ totalUnread: 0, profileLikeUnread: 4 }))
          assert.deepEqual(await values(), ['', '4', '', ''])
          await page.evaluate(() => window.fixture.summary({ totalUnread: 0, profileLikeUnread: 0 }))
          assert.deepEqual(await values(), ['', '', '', ''])
        })
        if (locale === 'zh-Hans' || locale === 'ru') {
          await page.evaluate(() => window.fixture.summary({ totalUnread: 99, profileLikeUnread: 120 }))
          await page.locator('.liquid-tabbar-dock').screenshot({ path: path.join(output, `badges-${width}-${locale}.png`) })
        }
      }
      for (const [index, target] of [[1, '/pages/likes/likes'], [2, '/pages/notice/notice']]) {
        for (const input of ['mouse', 'touch']) {
          await check(width + '/' + input + ' badge-area click opens ' + target, async () => {
            await page.evaluate(() => { window.fixture.routes.length = 0; return window.fixture.set('zh-Hans', { totalUnread: 120, profileLikeUnread: 120 }) })
            const bounds = await page.locator(`.liquid-tabbar-item[data-tab-index="${index}"] .liquid-tabbar-badge`).boundingBox()
            assert.ok(bounds)
            const x = bounds.x + bounds.width / 2
            const y = bounds.y + bounds.height / 2
            if (input === 'touch') await page.touchscreen.tap(x, y)
            else await page.mouse.click(x, y)
            // The existing navigation suppresses synthetic mouse events for
            // 450 ms after a gesture; each case must be a separate user input.
            await page.waitForTimeout(500)
            assert.deepEqual(await page.evaluate(() => window.fixture.routes), [target])
          })
        }
      }
    }
    assert.deepEqual(errors, [])
    await page.close()
  } finally { await browser.close() }
  const report = { passed, failed: failures.length, failures, limitation: 'Real Vue component and Chromium touch/mouse; no physical iOS, Android or WeChat runtime.' }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
  assert.deepEqual(failures, [], failures.join('\n'))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
