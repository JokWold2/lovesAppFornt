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

function conditionalBlocks(source, directive) {
  return [...source.matchAll(new RegExp(`/\\* #${directive} H5 \\*/([\\s\\S]*?)/\\* #endif \\*/`, 'g'))].map(match => match[1])
}

function rulesIn(block, selector) {
  return [...block.matchAll(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 'g'))].map(match => match[1])
}

test('普通长页面根节点与 scoped H5 规则保持安全', async () => {
  for (const [file, rootClass, mergesPadding] of pages) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    const template = source.slice(source.indexOf('<template>'))
    const root = template.match(/<view\b([^>]*)>/s)
    assert.ok(root, `${file} must have a template root view`)
    assert.match(root[1], new RegExp(`class="[^"]*\\b${rootClass}\\b[^"]*\\bapp-h5-min-screen\\b[^"]*"`), `${file} root classes must be on the first view`)

    const nonH5 = conditionalBlocks(source, 'ifndef').flatMap(block => rulesIn(block, rootClass))
    const h5 = conditionalBlocks(source, 'ifdef').flatMap(block => rulesIn(block, rootClass))
    assert.ok(nonH5.some(body => /min-height\s*:\s*100vh/.test(body)), `${file} non-H5 root fallback must contain min-height:100vh`)
    const withoutNonH5 = source.replaceAll(/\/\* #ifndef H5 \*\/[\s\S]*?\/\* #endif \*\//g, '')
    assert.doesNotMatch(withoutNonH5, new RegExp(`\\.${rootClass}\\s*\\{[^}]*min-height\\s*:\\s*100vh`), `${file} must not leave unconditional root min-height`)
    for (const body of h5) {
      assert.doesNotMatch(body, /(?:^|[;\s])(min-height|height)\s*:/, `${file} H5 root must not set height`)
      assert.doesNotMatch(body, /overflow\s*:\s*hidden/, `${file} H5 root must not hide overflow`)
      if (mergesPadding) assert.match(body, /padding-bottom\s*:[^;}]*env\(safe-area-inset-bottom\)/, `${file} H5 root must merge safe area padding`)
    }
    if (file.includes('login360')) {
      assert.ok(nonH5.some(body => /overflow\s*:\s*hidden/.test(body)), 'login non-H5 root keeps overflow fallback')
      assert.doesNotMatch(withoutNonH5, /\.container\s*\{[^}]*overflow\s*:\s*hidden/, 'login H5 root allows native scrolling')
    }
  }
})
