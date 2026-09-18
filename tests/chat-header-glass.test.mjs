import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as headerLayout from '../utils/chatHeaderLayout.js'

const component = fs.readFileSync(new URL('../components/chat/ChatPageHeader.vue', import.meta.url), 'utf8')
const search = fs.readFileSync(new URL('../pages/searchPerson/searchPerson.vue', import.meta.url), 'utf8')
const unaffectedPages = [
  '../pages/account/accountCenter.vue',
  '../pages/chat/chatRoom.vue',
  '../pages/chat/groupManage.vue',
  '../pages/chat/groupMembers.vue'
].map(file => fs.readFileSync(new URL(file, import.meta.url), 'utf8'))

test('header glass progress is continuous and clamped over the shared fade distance', () => {
  assert.equal(typeof headerLayout.getChatHeaderGlassProgress, 'function', 'shared glass progress is not implemented yet')
  assert.equal(headerLayout.getChatHeaderGlassProgress(-10), 0)
  assert.equal(headerLayout.getChatHeaderGlassProgress(0), 0)
  assert.equal(headerLayout.getChatHeaderGlassProgress(9), 0.25)
  assert.equal(headerLayout.getChatHeaderGlassProgress(18), 0.5)
  assert.equal(headerLayout.getChatHeaderGlassProgress(36), 1)
  assert.equal(headerLayout.getChatHeaderGlassProgress(120), 1)
})

test('shared header owns the sticky fading glass surface', () => {
  assert.match(component, /header-glass-surface/)
  assert.match(component, /scrollTop/)
  assert.match(component, /getChatHeaderGlassProgress/)
  assert.match(component, /buildPlatformOverride\s*=\s*['"]mp-weixin['"]/)
  assert.match(component, /backdrop-filter:\s*blur/)
  assert.match(component, /transition:\s*opacity/)
  assert.match(component, /\.chat-page-header\{[^}]*position:relative[^}]*z-index:5[;}]/)
  assert.match(component, /\.glass-header\{[^}]*position:sticky/)
  assert.match(component, /\.header-glass-surface\{[^}]*z-index:0[;}]/)
  assert.doesNotMatch(component, /isolation:isolate|z-index:-1/)
})

test('glass behavior is opt-in on search and is absent from the existing chat and account pages', () => {
  assert.match(search, /class="search-fixed-panel"[\s\S]*?<ChatPageHeader[^>]*glass[^>]*:scroll-top="headerScrollTop"/)
  for (const page of unaffectedPages) {
    assert.doesNotMatch(page, /<ChatPageHeader[^>]*(?:glass|:scroll-top)/)
    assert.doesNotMatch(page, /headerScrollTop/)
  }
})

test('candidate controls stay outside the dedicated results scroller', () => {
  const scrollerIndex = search.indexOf('class="results-scroll')
  assert.ok(scrollerIndex > 0)
  assert.ok(search.indexOf('class="search-fixed-panel"') < scrollerIndex)
  assert.ok(search.indexOf('class="name-search-card"') < scrollerIndex)
  assert.ok(search.indexOf('class="more-filter-row"') < scrollerIndex)
  assert.ok(search.indexOf('class="results-section"') > scrollerIndex)
})
