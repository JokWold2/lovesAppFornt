import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const readPage = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8')
const h5Styles = (source) => source.replace(/\/\* #ifndef H5 \*\/[\s\S]*?\/\* #endif \*\//g, '')

test('朋友圈详情在 H5 保持评论栏固定且正文可滚动', async () => {
  const source = await readPage('../pages/moments/momentDetail.vue')

  assert.match(source, /<view class="page app-h5-screen">/)
  assert.match(source, /<scroll-view class="content app-h5-scroll" scroll-y/)
  assert.ok(source.indexOf('class="content app-h5-scroll"') < source.indexOf('class="bottom-bar"'))
  assert.doesNotMatch(h5Styles(source), /\.page\s*\{[^}]*height\s*:\s*100vh/)
})

test('市场信息流在 H5 由可滚动容器承载并允许媒体收缩', async () => {
  const source = await readPage('../pages/market/marketFeed.vue')

  assert.match(source, /<view class="market-feed-page app-h5-screen">/)
  assert.match(source, /class="feed app-h5-scroll"/)
  assert.match(source, /\.item\s*\{[^}]*flex-direction\s*:\s*column/)
  assert.match(source, /\.item\s*\{[^}]*height\s*:\s*100%/)
  assert.match(source, /\.photos\s*\{[^}]*flex\s*:\s*1[^}]*min-height\s*:\s*0/)
  assert.doesNotMatch(h5Styles(source), /\.market-feed-page\s*,\s*\.feed\s*\{[^}]*height\s*:\s*100vh/)
  assert.doesNotMatch(h5Styles(source), /\.item\s*\{[^}]*height\s*:\s*100vh/)
})

test('法律文档在 H5 使用应用全屏滚动容器', async () => {
  const source = await readPage('../components/legal/LegalDocument.vue')

  assert.match(source, /<scroll-view class="document app-h5-screen app-h5-scroll" scroll-y>/)
  assert.doesNotMatch(h5Styles(source), /\.document\s*\{[^}]*height\s*:\s*100vh/)
})
