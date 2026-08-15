import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('auction activity component imports the data API and navigates by item id', () => {
  const source = fs.readFileSync(new URL('../pages/index/components/Auctionactivity.vue', import.meta.url), 'utf8')
  assert.match(source, /import\s*\{\s*getAuctionList\s*\}/)
  assert.match(source, /uni\.navigateTo\(\{\s*url:\s*`\/pages\/index\/auctionDetail\/auctionDetail\?id=\$\{item\.id\}`/)
})
