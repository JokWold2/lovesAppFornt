const STORAGE_KEY = 'auction-local-state-v1'
const now = Date.now()

// This is the sole temporary local-data adapter and the later HTTP replacement point.
const DEFAULT_AUCTIONS = [
  createAuction(1, '清代 官窑粉彩百鹿尊', 'A1024', '瓷器专场', 128000, 34, 'ongoing', now + 3 * 3600 * 1000 + 20 * 60 * 1000, 'https://picsum.photos/seed/antique1/400/560', 2000, 96000, { era: '清代', size: '高 45cm', mark: '官窑款', condition: '器型周正，釉色莹润', material: '粉彩瓷' }),
  createAuction(2, '明代 沉香木雕摆件', 'A1025', '木器杂项', 56000, 12, 'ongoing', now + 45 * 60 * 1000, 'https://picsum.photos/seed/antique2/400/420', 1000, 42000, { era: '明代', size: '长 28cm', mark: '无款', condition: '自然包浆，局部轻微磨损', material: '沉香木' }),
  createAuction(3, '张大千 山水手卷', 'A1026', '书画专场', 860000, 21, 'preview', now + 26 * 3600 * 1000, 'https://picsum.photos/seed/antique3/400/500', 10000, 680000, { era: '近现代', size: '引首及画心共 620cm', artist: '张大千', condition: '保存完好', material: '设色纸本' }),
  createAuction(4, '战国 青铜错金带钩', 'A1027', '青铜杂项', 32000, 0, 'upcoming', now + 5 * 3600 * 1000, 'https://picsum.photos/seed/antique4/400/380', 500, 28000, { era: '战国', size: '长 14cm', mark: '无款', condition: '局部锈蚀自然', material: '青铜错金' }),
  createAuction(5, '清乾隆 田黄石印章', 'A1028', '文玩篆刻', 210000, 45, 'ended', now - 3 * 3600 * 1000, 'https://picsum.photos/seed/antique5/400/600', 5000, 150000, { era: '清乾隆', size: '高 6.2cm', mark: '篆书印文', condition: '石质温润，边角完整', material: '田黄石' }),
  createAuction(6, '民国 掐丝珐琅香炉', 'A1029', '金属工艺', 18800, 8, 'upcoming', now + 30 * 3600 * 1000, 'https://picsum.photos/seed/antique7/400/480', 500, 15000, { era: '民国', size: '高 18cm', mark: '无款', condition: '珐琅色彩保存良好', material: '掐丝珐琅' })
]

function createAuction(id, title, lotNo, category, currentPrice, bidCount, status, endAt, cover, bidStep, startingPrice, details) {
  return {
    id,
    title,
    lotNo,
    category,
    cover,
    currentPrice,
    bidCount,
    status,
    endAt,
    images: [cover],
    bidStep,
    startingPrice,
    commissionRate: 0.1,
    details,
    serviceNotes: ['支持当面验货', '支持邮寄到付', '成交后请按规则支付佣金'],
    bidRecords: createBidRecords(id, currentPrice, bidStep, bidCount)
  }
}

function createBidRecords(id, currentPrice, bidStep, bidCount) {
  if (!bidCount) return []

  return [
    { id: `seed-${id}-recent`, userId: `collector-${id}`, userName: '藏友', avatarUrl: '', amount: currentPrice - bidStep, bidAt: now - 30 * 60 * 1000 },
    { id: `seed-${id}-earlier`, userId: `bidder-${id}`, userName: '竞拍者', avatarUrl: '', amount: currentPrice - bidStep * 2, bidAt: now - 90 * 60 * 1000 }
  ]
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function readState() {
  const stored = globalThis.uni?.getStorageSync?.(STORAGE_KEY)
  if (!stored) return {}

  try {
    const state = typeof stored === 'string' ? JSON.parse(stored) : stored
    return state && typeof state === 'object' && !Array.isArray(state) ? clone(state) : {}
  } catch {
    return {}
  }
}

function writeState(state) {
  globalThis.uni?.setStorageSync?.(STORAGE_KEY, clone(state))
}

function toSummary(auction) {
  const { id, title, lotNo, category, cover, currentPrice, bidCount, status, endAt } = auction
  return { id, title, lotNo, category, cover, currentPrice, bidCount, status, endAt }
}

function sortBidRecords(records = []) {
  return clone(records).sort((left, right) => right.bidAt - left.bidAt)
}

function mergeCachedAuction(auction) {
  const cached = readState()[auction.id]
  if (!cached || typeof cached !== 'object') return clone(auction)

  return {
    ...clone(auction),
    currentPrice: Number.isFinite(cached.currentPrice) ? cached.currentPrice : auction.currentPrice,
    bidCount: Number.isFinite(cached.bidCount) ? cached.bidCount : auction.bidCount,
    bidRecords: Array.isArray(cached.bidRecords) ? clone(cached.bidRecords) : clone(auction.bidRecords)
  }
}

function findAuction(id) {
  const auction = DEFAULT_AUCTIONS.find((item) => item.id === Number(id))
  return auction ? mergeCachedAuction(auction) : null
}

function persistAuction(auction) {
  const state = readState()
  state[auction.id] = {
    currentPrice: auction.currentPrice,
    bidCount: auction.bidCount,
    bidRecords: clone(auction.bidRecords)
  }
  writeState(state)
}

export async function getAuctionList() {
  return DEFAULT_AUCTIONS.map((auction) => toSummary(mergeCachedAuction(auction)))
}

export async function getAuctionDetail(id) {
  const auction = findAuction(id)
  if (!auction) return null
  return { auction: clone(auction), bidRecords: sortBidRecords(auction.bidRecords) }
}

export async function placeBid(id, bidder) {
  const auction = findAuction(id)
  if (!auction) throw new Error('拍品不存在')
  if (auction.status !== 'ongoing') throw new Error('当前拍品暂不可出价')

  const timestamp = Date.now()
  const amount = auction.currentPrice + auction.bidStep
  const bidRecord = { id: `bid-${timestamp}`, ...clone(bidder), amount, bidAt: timestamp }
  const updated = {
    ...auction,
    currentPrice: amount,
    bidCount: auction.bidCount + 1,
    bidRecords: [bidRecord, ...auction.bidRecords]
  }
  persistAuction(updated)
  return { auction: clone(updated), bidRecord: clone(bidRecord) }
}
