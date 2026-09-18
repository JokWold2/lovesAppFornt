// Run with Node; requires Playwright (NODE_PATH may point to the local tool bundle).
// This mounts the real Vue deck with fixture data and never calls business APIs.
// "wechat-stop-semantics" is a documented-semantics browser simulation, NOT a
// WeChat runtime or device test. Uni documents that .stop also prevents default
// outside H5: https://uniapp.dcloud.net.cn/tutorial/vue-basics.html#事件修饰符
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { build } = require('esbuild')
const { parse, compileScript, compileStyleAsync } = require('@vue/compiler-sfc')

const root = path.resolve(__dirname, '..')

async function compileFixture(mode) {
  const styles = []
  const bundle = await build({
    stdin: {
      contents: `import { createApp, h, reactive, ref, nextTick } from 'vue';
        import Deck from './components/profile/BlessingCardDeck.vue';
        const state = reactive({items:[],revision:0,loading:false,rewindBusy:false,rewindAvailable:true});
        const counts = {rewind:0,decide:0,dismiss:0,open:0}; let pendingOnRewind = false; let decisions = [];
        window.fixture = {
          reset: async (overrides={}) => {
            Object.keys(counts).forEach(key => counts[key]=0);
            pendingOnRewind = false;
            decisions = [];
            Object.assign(state,{items:[{profileId:1,displayName:'Fixture One'},{profileId:2,displayName:'Fixture Two'}],loading:false,rewindBusy:false,rewindAvailable:true},overrides);
            state.revision++; await nextTick();
          }, counts: () => ({...counts}), decisions: () => decisions.slice(), pendingOnNextRewind: () => {pendingOnRewind=true;}
        };
        const app = createApp({render: () => h(Deck, {...state,active:true,
          decideProfile: async (_profile,direction) => {counts.decide++;decisions.push(direction);return {isLiked:direction==='like'};},
          onRewind: () => {counts.rewind++;if(pendingOnRewind)state.rewindBusy=true;},onDismiss: () => {counts.dismiss++;},onOpen: () => {counts.open++;}
        })});
        // Preserve the icon's real event shape: a text node with an independent
        // click listener which emits a component click. The glyph is a fixture.
        app.component('uni-icons',{props:['size','color'],emits:['click'],
          setup:(props,{emit})=>()=>h('span',{class:'fixture-icon',style:{fontSize:props.size+'px',color:props.color},onClick:event=>emit('click',event)},'↶')});
        app.mount('#app'); window.fixture.reset();`,
      resolveDir: root
    },
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'controls-fixture', setup(b) {
      b.onResolve({ filter: /^@dcloudio\/uni-app$|^@\/utils\/(config|localeRuntime)\.js$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const onHide=()=>{};export const config={baseURL:""};export const t=key=>key;' }))
      b.onResolve({ filter: /^@\// }, args => ({ path: path.join(root, args.path.slice(2)) }))
      b.onLoad({ filter: /\.vue$/ }, async args => {
        let source = fs.readFileSync(args.path, 'utf8')
        if (mode === 'wechat-stop-semantics') {
          // Only touch-start default suppression is modeled. Do not intercept
          // clicks in the harness: Chromium synthesizes (or suppresses) those
          // from actual touchscreen input, exposing the original broken path.
          source = source.replace(/@touchstart\.stop(?![\w.-]*\.prevent)/g, '@touchstart.stop.prevent')
        }
        const { descriptor, errors } = parse(source, { filename: args.path })
        assert.deepEqual(errors, [])
        const id = 'controls-' + path.basename(args.path, '.vue')
        const script = compileScript(descriptor, { id, inlineTemplate: true })
        for (const style of descriptor.styles) {
          const output = await compileStyleAsync({ source: style.content, filename: args.path, id, preprocessLang: style.lang })
          assert.deepEqual(output.errors, [])
          styles.push(output.code)
        }
        return { contents: script.content, resolveDir: path.dirname(args.path) }
      })
    } }]
  })
  return { js: bundle.outputFiles[0].text, css: styles.join('\n') }
}

async function main() {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  const failures = []
  let passed = 0
  try {
    for (const mode of ['h5', 'wechat-stop-semantics']) {
      const compiled = await compileFixture(mode)
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
      const pageErrors = []
      page.on('pageerror', error => pageErrors.push(error.message))
      await page.route('**/*', route => route.abort())
      await page.setContent('<style>view{display:block}button{border:0}body{margin:12px}.fixture-icon{display:inline-block;width:25px;height:25px;line-height:25px;text-align:center}</style><div id="app"></div>')
      await page.addStyleTag({ content: compiled.css })
      await page.addScriptTag({ content: compiled.js })
      await page.waitForSelector('.deck-rewind')
      if (process.env.QA_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.QA_SCREENSHOT_DIR, { recursive: true })
        await page.locator('.deck-stage').screenshot({ path: path.join(process.env.QA_SCREENSHOT_DIR, 'rewind-' + mode + '.png') })
      }
      const reset = async (overrides = {}) => page.evaluate(overrides => window.fixture.reset(overrides), overrides)
      const activate = async (input, location = 'center', selector = '.deck-rewind', settle = true) => {
        const bounds = await page.locator(selector).boundingBox()
        assert.ok(bounds, selector + ' must be visible')
        const x = bounds.x + (location === 'edge' ? 4 : bounds.width / 2)
        const y = bounds.y + bounds.height / 2
        if (input === 'touch') await page.touchscreen.tap(x, y)
        else await page.mouse.click(x, y)
        // Wait for delayed tap dispatch and any accidental swipe animation.
        if (settle) await page.waitForTimeout(340)
      }
      const check = async (label, callback) => {
        try { await callback(); passed++; console.log('PASS ' + mode + ': ' + label) }
        catch (error) { failures.push(mode + ': ' + label + ': ' + error.message); console.error('FAIL ' + failures.at(-1)) }
      }
      const expectCounts = async rewind => {
        const counts = await page.evaluate(() => window.fixture.counts())
        assert.deepEqual(counts, { rewind, decide: 0, dismiss: 0, open: 0 })
        assert.deepEqual(pageErrors, [])
      }
      for (const input of mode === 'h5' ? ['touch', 'mouse'] : ['touch']) {
        for (const decision of ['pass', 'like']) {
          for (const location of ['center', 'edge']) {
            await check(input + ' ' + location + ' ' + decision + ' saves one decision without rewind or detail navigation', async () => {
              await reset(); await activate(input, location, '.deck-action-' + decision)
              assert.deepEqual(await page.evaluate(() => window.fixture.decisions()), [decision])
              assert.deepEqual(await page.evaluate(() => window.fixture.counts()), { rewind: 0, decide: 1, dismiss: 1, open: 0 })
              assert.deepEqual(pageErrors, [])
            })
          }
        }
        for (const location of ['center', 'edge']) {
          await check(input + ' ' + location + ' rewinds exactly once without card actions', async () => {
            await reset(); await activate(input, location); await expectCounts(1)
            assert.equal(await page.locator('.deck-name').textContent(), 'Fixture One')
          })
        }
        for (const overrides of [{ loading: true }, { rewindBusy: true }, { rewindAvailable: false }]) {
          await check(input + ' respects disabled ' + JSON.stringify(overrides), async () => {
            await reset(overrides)
            assert.equal(await page.locator('.deck-rewind').isDisabled(), true)
            await activate(input); await expectCounts(0)
          })
        }
        await check(input + ' parent pending state blocks repeated activation', async () => {
          await reset()
          await page.evaluate(() => window.fixture.pendingOnNextRewind())
          await activate(input, 'center', '.deck-rewind', false)
          assert.equal(await page.locator('.deck-rewind').isDisabled(), true)
          await activate(input, 'center')
          await expectCounts(1)
        })
        await check(input + ' empty-state rewind stays usable', async () => {
          await reset({ items: [] }); await activate(input, 'center', '.deck-empty-rewind'); await expectCounts(1)
        })
        await check(input + ' empty-state rewind respects pending request', async () => {
          await reset({ items: [], rewindBusy: true }); await activate(input, 'center', '.deck-empty-rewind'); await expectCounts(0)
        })
      }
      await page.close()
    }
  } finally { await browser.close() }
  console.log(JSON.stringify({ passed, failed: failures.length, platformLimit: 'WeChat behavior is a documented .stop semantics simulation, not a device test.' }))
  assert.deepEqual(failures, [], failures.join('\n'))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
