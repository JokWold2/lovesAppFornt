import test from 'node:test'
import assert from 'node:assert/strict'

const cache = new Map()
globalThis.uni = {
  getStorageSync: (key) => cache.get(key),
  setStorageSync: (key, value) => cache.set(key, value),
  removeStorageSync: (key) => cache.delete(key)
}

const { getAuctionDetail, placeBid } = await import('../api/auction.js')

test('returns newest bid first for a string route id', async () => {
  const detail = await getAuctionDetail('1')
  assert.equal(detail.auction.id, 1)
  assert.ok(detail.bidRecords.every((record, index, list) => index === 0 || record.bidAt <= list[index - 1].bidAt))
})

test('simulated bid increments price and becomes the newest record', async () => {
  const before = await getAuctionDetail(1)
  const result = await placeBid(1, { userId: 'local-user', userName: '我', avatarUrl: '' })
  const after = await getAuctionDetail(1)
  assert.equal(result.auction.currentPrice, before.auction.currentPrice + before.auction.bidStep)
  assert.equal(after.bidRecords[0].id, result.bidRecord.id)
  assert.equal(after.bidRecords[0].amount, result.auction.currentPrice)
})

test('list data reflects a cached simulated bid', async () => {
  const { getAuctionList } = await import('../api/auction.js')
  const bid = await placeBid(2, { userId: 'local-user', userName: '我', avatarUrl: '' })
  const list = await getAuctionList()
  const item = list.find((auction) => auction.id === 2)
  assert.equal(item.currentPrice, bid.auction.currentPrice)
  assert.equal(item.bidCount, bid.auction.bidCount)
})
