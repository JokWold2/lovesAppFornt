import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pages = [
  ['pages/login/login360.vue', 'container', false],
  ['pages/my/my.vue', 'container', true],
  ['pages/my/myFile/myFile.vue', 'page', false],
  ['pages/searchPerson/personShow/personShow.vue', 'page', false],
  ['pages/my/myLifeShowEdit/myLifeShowEdit.vue', 'container', false],
  ['pages/notice/notice.vue', 'page', false],
  ['pages/notice/interactionMessages.vue', 'interaction-page', false],
  ['pages/account/accountCenter.vue', 'page', true],
  ['pages/notice/chatRequestReview.vue', 'page', true],
  ['pages/chat/groupManage.vue', 'page', true],
  ['pages/chat/groupMembers.vue', 'page', false],
  ['pages/market/marketList.vue', 'page', true],
  ['pages/my/myLifeShow/myLifeShow.vue', 'container', true],
  ['pages/index/index360.vue', 'container', true]
]

function rootRule(source, selector) {
  const match = source.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `missing scoped root rule ${selector}`)
  return { body: match[1], index: match.index }
}

test('普通长页面绑定真实根节点，并隔离 H5 视口规则', async () => {
  for (const [file, rootClass, mergesPadding] of pages) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    const root = source.match(new RegExp(`<view[^>]*class="${rootClass} app-h5-min-screen"`))
    assert.ok(root, `${file} template root must carry app-h5-min-screen`)

    const selector = `.${rootClass}`
    const { body, index } = rootRule(source, selector)
    assert.match(body, /min-height\s*:\s*100vh/, `${file} keeps non-H5 fallback min-height`)
    const ruleWindow = source.slice(Math.max(0, index - 100), index + body.length + 100)
    const fallbackIsScoped = ruleWindow.indexOf('#ifndef H5') !== -1 && ruleWindow.indexOf('#endif') > ruleWindow.indexOf('#ifndef H5')
    const h5Override = source.match(new RegExp(`#ifdef H5[\\s\\S]*?\\.${rootClass}\\s*\\{([^}]*)\\}`))
    assert.ok(fallbackIsScoped || h5Override, `${file} fallback root must be non-H5-only or neutralized by an H5 override`)
    assert.doesNotMatch(root[0], /app-h5-screen|app-h5-scroll/)
    if (rootClass === 'container' && file.includes('login360')) {
      assert.match(source, /#ifndef H5[\s\S]*overflow\s*:\s*hidden[\s\S]*#endif/, `${file} login overflow fallback must be non-H5 only`)
    }

    if (mergesPadding) {
      const h5 = h5Override
      assert.ok(h5, `${file} needs a post-H5 root rule to merge safe-area padding`)
      assert.match(h5[1], /padding-bottom\s*:[^;}]*env\(safe-area-inset-bottom\)/, `${file} H5 root padding must include safe area`)
    }
  }
})
