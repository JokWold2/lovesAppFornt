import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pages = [
  ['pages/login/login360.vue', 'container', false], ['pages/my/my.vue', 'container', true],
  ['pages/my/myFile/myFile.vue', 'page', false], ['pages/searchPerson/personShow/personShow.vue', 'page', false],
  ['pages/my/myLifeShowEdit/myLifeShowEdit.vue', 'container', false], ['pages/notice/notice.vue', 'page', false],
  ['pages/notice/interactionMessages.vue', 'interaction-page', false], ['pages/account/accountCenter.vue', 'page', true],
  ['pages/notice/chatRequestReview.vue', 'page', true], ['pages/chat/groupManage.vue', 'page', true],
  ['pages/chat/groupMembers.vue', 'page', false], ['pages/market/marketList.vue', 'page', true],
  ['pages/my/myLifeShow/myLifeShow.vue', 'container', true], ['pages/index/index360.vue', 'container', true]
]

function scopedRules(source, selector) {
  const rules = []
  const styles = source.matchAll(/<style[^>]*scoped[^>]*>([\s\S]*?)<\/style>/g)
  for (const style of styles) {
    const body = style[1]
    for (const match of body.matchAll(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 'g'))) {
      const prefix = body.slice(0, match.index)
      const h5 = prefix.lastIndexOf('#ifdef H5') > prefix.lastIndexOf('#endif')
      const nonH5 = prefix.lastIndexOf('#ifndef H5') > prefix.lastIndexOf('#endif')
      rules.push({ body: match[1], h5, nonH5 })
    }
  }
  return rules
}

test('普通长页面根节点与 scoped H5 规则保持安全', async () => {
  for (const [file, rootClass, mergesPadding] of pages) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    const template = source.slice(source.indexOf('<template>'))
    const root = template.match(/<view\b([^>]*)>/s)
    assert.ok(root, `${file} must have a template root view`)
    assert.match(root[1], new RegExp(`class="[^"]*\\b${rootClass}\\b[^"]*\\bapp-h5-min-screen\\b[^"]*"`), `${file} root classes must be on the first view`)

    const rules = scopedRules(source, rootClass)
    assert.ok(rules.length, `${file} must define a scoped ${rootClass} rule`)
    const fallback = rules.find(rule => !rule.h5)
    assert.ok(fallback && /min-height\s*:\s*100vh/.test(fallback.body), `${file} must preserve non-H5 min-height fallback`)
    for (const rule of rules.filter(rule => rule.h5)) {
      assert.doesNotMatch(rule.body, /(?:^|[;\s])(min-height|height)\s*:/, `${file} H5 root must not set height`)
      assert.doesNotMatch(rule.body, /overflow\s*:\s*hidden/, `${file} H5 root must not hide overflow`)
      if (mergesPadding) assert.match(rule.body, /padding-bottom\s*:[^;}]*env\(safe-area-inset-bottom\)/, `${file} H5 root must merge safe area padding`)
    }
    if (file.includes('login360')) {
      assert.ok(rules.some(rule => /overflow\s*:\s*hidden/.test(rule.body)), 'login non-H5 root keeps overflow fallback')
      assert.ok(rules.filter(rule => rule.h5).every(rule => !/overflow\s*:\s*hidden/.test(rule.body)), 'login H5 root allows native scrolling')
    }
  }
})
