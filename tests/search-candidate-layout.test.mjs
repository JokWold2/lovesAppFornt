import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../pages/searchPerson/searchPerson.vue', import.meta.url), 'utf8')
const pages = fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8')

test('candidate search uses the shared cross-platform custom header and a bottom sheet for advanced filters', () => {
  assert.match(source, /<ChatPageHeader[^>]*glass[^>]*:title="t\('search\.title'\)"/)
  assert.match(source, /<ChatSheet\s+:open="showAdvancedFilters"/)
  assert.doesNotMatch(source, /class="bottom-bar/)
  assert.doesNotMatch(source, /native-header/)
  assert.match(pages, /"path"\s*:\s*"pages\/searchPerson\/searchPerson"[\s\S]{0,180}"navigationStyle"\s*:\s*"custom"/)
})

test('name search is primary, gender stays visible, and generation and status live in the advanced sheet', () => {
  const sheetIndex = source.indexOf('<ChatSheet :open="showAdvancedFilters"')
  assert.ok(sheetIndex > 0)
  const main = source.slice(0, sheetIndex)
  const sheet = source.slice(sheetIndex)
  assert.match(main, /class="name-search-card"/)
  assert.match(main, /form\.gender/)
  assert.doesNotMatch(main, /form\.generation/)
  assert.doesNotMatch(main, /form\.status/)
  assert.match(sheet, /form\.generation/)
  assert.match(sheet, /form\.status/)
})
