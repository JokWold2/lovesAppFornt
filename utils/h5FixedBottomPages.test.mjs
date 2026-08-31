import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const readPage = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

function conditionalBlocks(source, directive) {
  return [...source.matchAll(new RegExp(`/\\* #${directive} H5 \\*/([\\s\\S]*?)/\\* #endif \\*/`, 'g'))].map(match => match[1])
}

function rulesIn(block, selector) {
  return [...block.matchAll(new RegExp(`\\.${selector}\\s*\\{([^}]*)\\}`, 'g'))].map(match => match[1])
}

function unconditionalSource(source) {
  return source.replaceAll(/\/\* #(ifdef|ifndef) H5 \*\/[\s\S]*?\/\* #endif \*\//g, '')
}

function hasDeclaration(bodies, property, value) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*${escapedValue}\\s*(?:;|$)`)
  return bodies.some(body => pattern.test(body))
}

test('竞拍详情的固定操作栏随可视视口上移，正文留出操作栏空间', () => {
  const source = readPage('../pages/index/auctionDetail.vue')
  const nonH5BottomRules = conditionalBlocks(source, 'ifndef').flatMap(block => rulesIn(block, 'bottom-bar'))
  const unconditionalBottomRules = rulesIn(unconditionalSource(source), 'bottom-bar')
  const nonH5RootRules = conditionalBlocks(source, 'ifndef').flatMap(block => rulesIn(block, 'auction-detail'))
  const unconditionalRootRules = rulesIn(unconditionalSource(source), 'auction-detail')

  assert.match(source, /<view class="auction-detail app-h5-min-screen">/)
  assert.match(source, /<view v-if="auction" class="bottom-bar app-h5-fixed-bottom">/)
  assert.equal(hasDeclaration(unconditionalBottomRules, 'bottom', '0'), false)
  assert.equal(hasDeclaration(nonH5BottomRules, 'bottom', '0'), true)
  assert.equal(hasDeclaration(unconditionalRootRules, 'min-height', '100vh'), false)
  assert.equal(hasDeclaration(nonH5RootRules, 'min-height', '100vh'), true)
  assert.equal(hasDeclaration(unconditionalRootRules, 'padding-bottom', 'calc(140rpx + env(safe-area-inset-bottom))'), true)
  assert.match(unconditionalRootRules.join('\n'), /background\s*:\s*\$page-bg/)
})

test('搜索页在 H5 使用独立滚动区，末项能够滚到固定按钮上方', () => {
  const source = readPage('../pages/searchPerson/searchPerson.vue')
  const nonH5BottomRules = conditionalBlocks(source, 'ifndef').flatMap(block => rulesIn(block, 'bottom-bar'))
  const unconditionalBottomRules = rulesIn(unconditionalSource(source), 'bottom-bar')

  assert.match(source, /<view class="page app-h5-screen">/)
  assert.match(source, /<scroll-view[^>]*class="content-area app-h5-scroll"[^>]*:scroll-into-view="contentScrollIntoView"/s)
  assert.match(source, /<view class="bottom-bar app-h5-fixed-bottom">/)
  assert.equal(hasDeclaration(unconditionalBottomRules, 'bottom', '0'), false)
  assert.equal(hasDeclaration(nonH5BottomRules, 'bottom', '0'), true)
  assert.match(source, /\.content-area\s*\{[^}]*padding:\s*15px 15px calc\(100px \+ env\(safe-area-inset-bottom\)\)/)
})

test('H5 首次搜索滚动实际内容容器，非 H5 保留页面滚动', () => {
  const source = readPage('../pages/searchPerson/searchPerson.vue')
  const doSearch = source.split('async function doSearch (pageNum, append = false) {')[1].split('function onSearch ()')[0]

  assert.match(source, /<view v-if="hasSearched \|\| searching" id="search-results" class="form-card result-card">/)
  assert.match(source, /const contentScrollIntoView = ref\(''\)/)
  assert.match(doSearch, /\/\/ #ifdef H5[\s\S]*contentScrollIntoView\.value = ''[\s\S]*nextTick\(\(\) => \{[\s\S]*contentScrollIntoView\.value = 'search-results'/)
  assert.match(doSearch, /\/\/ #ifndef H5[\s\S]*uni\.pageScrollTo\(\{ duration: 200, scrollTop: 9999 \}\)/)
})

test('我的生活发布按钮保留安全区之外的正文占位', () => {
  const source = readPage('../pages/my/myLifeShow/myLifeShow.vue')
  const nonH5Rules = conditionalBlocks(source, 'ifndef').flatMap(block => rulesIn(block, 'fab-container'))

  assert.match(source, /<view class="fab-container app-h5-fixed-bottom" @click="goToEdit">/)
  assert.match(source, /\.fab-container\s*\{[^}]*--app-fixed-bottom-base:\s*60rpx/)
  assert.equal(hasDeclaration(nonH5Rules, 'bottom', '60rpx'), true)
  assert.match(source, /\.container\s*\{[^}]*padding-bottom:\s*calc\(160rpx \+ env\(safe-area-inset-bottom\)\)/)
})

test('360 页回顶按钮保留安全区之外的正文占位', () => {
  const source = readPage('../pages/index/index360.vue')
  const nonH5Rules = conditionalBlocks(source, 'ifndef').flatMap(block => rulesIn(block, 'fab-button'))

  assert.match(source, /<view class="fab-button app-h5-fixed-bottom" @click="scrollToTop">/)
  assert.match(source, /\.fab-button\s*\{[^}]*--app-fixed-bottom-base:\s*200rpx/)
  assert.equal(hasDeclaration(nonH5Rules, 'bottom', '200rpx'), true)
  assert.match(source, /\.container\s*\{[^}]*padding-bottom:\s*calc\(300rpx \+ env\(safe-area-inset-bottom\)\)/)
})
