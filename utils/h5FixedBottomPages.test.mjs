import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const readPage = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

test('竞拍详情的固定操作栏随可视视口上移，正文留出操作栏空间', () => {
  const source = readPage('../pages/index/auctionDetail.vue')

  assert.match(source, /<view class="auction-detail app-h5-min-screen">/)
  assert.match(source, /<view v-if="auction" class="bottom-bar app-h5-fixed-bottom">/)
  assert.doesNotMatch(source, /\.bottom-bar\s*\{[^}]*bottom:\s*0/)
  assert.match(source, /\.auction-detail\s*\{[^}]*padding-bottom:\s*calc\(140rpx \+ env\(safe-area-inset-bottom\)\)/)
})

test('搜索页在 H5 使用独立滚动区，末项能够滚到固定按钮上方', () => {
  const source = readPage('../pages/searchPerson/searchPerson.vue')

  assert.match(source, /<view class="page app-h5-screen">/)
  assert.match(source, /<scroll-view scroll-y class="content-area app-h5-scroll"/)
  assert.match(source, /<view class="bottom-bar app-h5-fixed-bottom">/)
  assert.doesNotMatch(source, /\.bottom-bar\s*\{[^}]*bottom:\s*0/)
  assert.match(source, /\.content-area\s*\{[^}]*padding:\s*15px 15px calc\(100px \+ env\(safe-area-inset-bottom\)\)/)
})

test('我的生活发布按钮保留安全区之外的正文占位', () => {
  const source = readPage('../pages/my/myLifeShow/myLifeShow.vue')

  assert.match(source, /<view class="fab-container app-h5-fixed-bottom" @click="goToEdit">/)
  assert.match(source, /\.fab-container\s*\{[^}]*--app-fixed-bottom-base:\s*60rpx/)
  assert.match(source, /\.container\s*\{[^}]*padding-bottom:\s*calc\(160rpx \+ env\(safe-area-inset-bottom\)\)/)
})

test('360 页回顶按钮保留安全区之外的正文占位', () => {
  const source = readPage('../pages/index/index360.vue')

  assert.match(source, /<view class="fab-button app-h5-fixed-bottom" @click="scrollToTop">/)
  assert.match(source, /\.fab-button\s*\{[^}]*--app-fixed-bottom-base:\s*200rpx/)
  assert.match(source, /\.container\s*\{[^}]*padding-bottom:\s*calc\(300rpx \+ env\(safe-area-inset-bottom\)\)/)
})
