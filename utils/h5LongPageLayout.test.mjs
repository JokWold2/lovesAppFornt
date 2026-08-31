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

const crossPlatformRootStyles = [
  ['pages/chat/groupManage.vue', 'page', [['padding', '26rpx'], ['box-sizing', 'border-box'], ['background', '#f4f5f7'], ['color', '#1b2230']]],
  ['pages/notice/chatRequestReview.vue', 'page', [['padding', '24rpx'], ['background', '#f7f7f7']]],
  ['pages/market/marketList.vue', 'page', [['background', '#f6f6f6'], ['padding', '20rpx 16rpx']]]
]

function conditionalBlocks(source, directive) {
  return [...source.matchAll(new RegExp(`/\\* #${directive} H5 \\*/([\\s\\S]*?)/\\* #endif \\*/`, 'g'))].map(match => match[1])
}

function rulesIn(block, selector) {
  return [...block.matchAll(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 'g'))].map(match => match[1])
}

function unconditionalSource(source) {
  return source.replaceAll(/\/\* #(ifdef|ifndef) H5 \*\/[\s\S]*?\/\* #endif \*\//g, '')
}

function assertRootAllowsNativeScroll(body, message) {
  assert.doesNotMatch(body, /(?:^|;)\s*height\s*:/, `${message} must not set height`)
  assert.doesNotMatch(body, /(?:^|;)\s*min-height\s*:/, `${message} must not set min-height`)
  assert.doesNotMatch(body, /(?:^|;)\s*overflow\s*:\s*hidden(?:\s*!important)?\s*(?:;|$)/, `${message} must not hide overflow`)
}

function declarationPattern(property, value) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*${escapedValue}\\s*(?:;|$)`)
}

function declarationNames(bodies) {
  return bodies.flatMap(body => [...body.matchAll(/(?:^|;)\s*([\w-]+)\s*:/g)].map(match => match[1]))
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
    const unconditional = rulesIn(unconditionalSource(source), rootClass)
    assert.ok(nonH5.some(body => /min-height\s*:\s*100vh/.test(body)), `${file} non-H5 root fallback must contain min-height:100vh`)
    for (const [index, body] of unconditional.entries()) {
      assertRootAllowsNativeScroll(body, `${file} unconditional root rule ${index + 1}`)
    }
    for (const [index, body] of h5.entries()) {
      assertRootAllowsNativeScroll(body, `${file} H5 root rule ${index + 1}`)
      if (mergesPadding) assert.match(body, /padding-bottom\s*:[^;}]*env\(safe-area-inset-bottom\)/, `${file} H5 root must merge safe area padding`)
    }
    if (file.includes('login360')) {
      assert.ok(nonH5.some(body => /overflow\s*:\s*hidden/.test(body)), 'login non-H5 root keeps overflow fallback')
    }
  }
})

test('跨端业务根样式不能随非 H5 高度 fallback 一起被隔离', async () => {
  for (const [file, rootClass, declarations] of crossPlatformRootStyles) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
    const rules = rulesIn(unconditionalSource(source), rootClass)
    const nonH5 = conditionalBlocks(source, 'ifndef').flatMap(block => rulesIn(block, rootClass))
    const h5 = conditionalBlocks(source, 'ifdef').flatMap(block => rulesIn(block, rootClass))
    assert.ok(rules.length, `${file} must keep an unconditional root rule`)
    for (const [property, value] of declarations) {
      assert.ok(rules.some(body => declarationPattern(property, value).test(body)), `${file} unconditional root must keep ${property}: ${value}`)
    }
    assert.deepEqual([...new Set(declarationNames(nonH5))], ['min-height'], `${file} non-H5 root must contain only the viewport fallback`)
    assert.deepEqual([...new Set(declarationNames(h5))], ['padding-bottom'], `${file} H5 root must contain only the safe-area padding override`)
  }
})
