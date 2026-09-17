// Run with Node; requires Playwright (NODE_PATH can point to the local tool bundle).
// Uses only fixture profiles and a local like handler; no business API requests.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const { build } = require('esbuild')
const { parse, compileScript, compileStyleAsync } = require('@vue/compiler-sfc')

async function main() {
  const root = path.resolve(__dirname, '..')
  const filename = path.join(root, 'components/profile/BlessingCardDeck.vue')
  // WeChat retains this view: its generated WXML has an ordinary key attribute.
  // Keep the same node in this browser fixture to exercise that platform behavior.
  const source = fs.readFileSync(filename, 'utf8').replace(':key="`${revision}:${current.profileId}`"', '')
  const { descriptor } = parse(source, { filename })
  const compiled = compileScript(descriptor, { id: 'motion-check', inlineTemplate: true })
  const css = await compileStyleAsync({ source: descriptor.styles[0].content, filename, id: 'motion-check', preprocessLang: 'scss' })
  assert.deepEqual(css.errors, [])
  const dependencyStyles = []
  const bundle = await build({
    stdin: {
      contents: `import { createApp, h, ref } from 'vue';
        import Deck from './components/profile/BlessingCardDeck.vue';
        const items = ref([]), revision = ref(0); let failLike = false;
        const reset = () => { items.value = [1,2,3].map(profileId => ({profileId, displayName:'Profile '+profileId})); revision.value++; failLike = false; };
        window.fixture = { reset, failLike: () => { failLike = true; } }; reset();
        const app = createApp({render: () => h(Deck, {
          items: items.value, revision: revision.value, active: true,
          likeProfile: async () => { if (failLike) throw Error('fixture failure'); return {isLiked:true}; },
          onDismiss: () => { items.value = items.value.slice(1); }
        })});
        app.component('uni-icons', {render: () => h('span')}); app.mount('#app');`,
      resolveDir: root
    },
    bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'motion-fixture', setup(b) {
      b.onResolve({ filter: /^@dcloudio\/uni-app$|^@\/utils\/(config|localeRuntime)\.js$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const onHide = () => {}; export const config = {baseURL:""}; export const t = key => key;' }))
      b.onResolve({ filter: /^@\// }, args => ({ path: path.join(root, args.path.slice(2)) }))
      b.onLoad({ filter: /BlessingCardDeck\.vue$/ }, () => ({ contents: compiled.content, resolveDir: path.dirname(filename), loader: 'js' }))
      b.onLoad({ filter: /FeedContentState\.vue$/ }, async args => {
        const { descriptor, errors } = parse(fs.readFileSync(args.path, 'utf8'), { filename: args.path })
        assert.deepEqual(errors, [])
        const script = compileScript(descriptor, { id: 'state-check', inlineTemplate: true })
        for (const style of descriptor.styles) {
          const output = await compileStyleAsync({ source: style.content, filename: args.path, id: 'state-check' })
          assert.deepEqual(output.errors, [])
          dependencyStyles.push(output.code)
        }
        return { contents: script.content, resolveDir: path.dirname(args.path) }
      })
    } }]
  })
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
    await page.route('**/*', route => route.abort())
    await page.setContent('<style>view{display:block}button{border:0}body{margin:12px}</style><div id="app"></div>')
    await page.addStyleTag({ content: [css.code, ...dependencyStyles].join('\n') })
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    const state = () => page.locator('.deck-moving').evaluate(el => {
      const style = getComputedStyle(el)
      return { x: new DOMMatrixReadOnly(style.transform).m41, duration: style.transitionDuration }
    })
    const reset = async () => {
      await page.evaluate(() => window.fixture.reset())
      await page.waitForFunction(() => document.querySelector('.deck-name')?.textContent === 'Profile 1')
    }
    const touch = async (type, x) => page.locator('.deck-card').evaluate((el, {type, x}) => {
      const event = new Event(type, {bubbles:true, cancelable:true})
      Object.assign(event, {touches: type === 'touchend' ? [] : [{clientX:x,clientY:200}], changedTouches:[{clientX:x,clientY:200}]})
      el.dispatchEvent(event)
    }, {type, x})
    for (const direction of ['pass', 'like']) {
      for (const input of ['button', 'touch']) {
        await reset()
        if (input === 'button') await page.locator('.deck-action-' + direction).click()
        else {
          await touch('touchstart', 180)
          await touch('touchmove', direction === 'like' ? 330 : 30)
          await touch('touchend', direction === 'like' ? 330 : 30)
        }
        assert.notEqual((await state()).duration, '0s', `${input} ${direction}: departing card must still animate`)
        await page.waitForFunction(() => document.querySelector('.deck-name')?.textContent === 'Profile 2')
        const next = await state()
        assert.equal(next.duration, '0s', `${input} ${direction}: replacement must have no transition`)
        assert.ok(Math.abs(next.x) < 1, `${input} ${direction}: replacement must start at center, got ${next.x}`)
        console.log(`PASS ${input} ${direction}: next card stays centered without transition`)
      }
    }
    await page.locator('.deck-action-pass').click()
    await page.waitForFunction(() => document.querySelector('.deck-name')?.textContent === 'Profile 3')
    assert.equal((await state()).duration, '0s')
    assert.ok(Math.abs((await state()).x) < 1)
    await page.locator('.deck-action-pass').click()
    await page.waitForSelector('.deck-empty')
    console.log('PASS consecutive swipes and last-card empty state')
    await reset()
    await touch('touchstart', 180)
    await touch('touchmove', 200)
    await touch('touchend', 200)
    assert.notEqual((await state()).duration, '0s', 'short swipe must retain its return transition')
    assert.equal(await page.locator('.deck-name').textContent(), 'Profile 1')
    console.log('PASS short swipe retains return animation and current card')
    await reset()
    await page.evaluate(() => window.fixture.failLike())
    await page.locator('.deck-action-like').click()
    await page.waitForSelector('.deck-error')
    assert.equal(await page.locator('.deck-name').textContent(), 'Profile 1')
    assert.notEqual((await state()).duration, '0s', 'failed like must retain return animation')
    console.log('PASS failed like retains current card and return animation')
    await reset()
    await page.locator('.deck-action-pass').click()
    await reset()
    assert.equal((await state()).duration, '0s', 'refresh during exit must disable transition')
    assert.ok(Math.abs((await state()).x) < 1, 'refresh during exit must reset to center')
    console.log('PASS refresh during exit resets immediately')
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
