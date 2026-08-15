/**
 * 拍卖本地数据源。
 * 后端接口尚未提供时，列表页与详情页都只依赖本模块；之后只需将导出方法
 * 改为调用 api/index.js，无需改动页面逻辑。
 */
const STORAGE_KEY = 'AUCTION_MOCK_DATA_V1'

function createAuction(id, title, lotNo, category, currentPrice, status, endAt, cover, options = {}) {
  const now = Date.now()
  const priceStep = options.priceStep || 1000
  return {
    id, title, lotNo, category, currentPrice, status, endAt, cover,
    bidCount: status === 'upcoming' ? 0 : 2,
    photos: [cover, `${cover}?detail=1`],
    startingPrice: options.startingPrice || currentPrice,
    priceStep,
    depositRate: 0.15,
    era: options.era || '近现代',
    size: options.size || '尺寸待定',
    material: options.material || '藏品材质待定',
    condition: options.condition || '品相良好，详情以实物为准。',
    description: options.description || '拍品详情以现场展示及最终说明为准。',
    bidRecords: status === 'upcoming' ? [] : [
      { id: `${id}-1`, name: '林先生', avatar: 'https://i.pravatar.cc/120?img=11', amount: currentPrice, createdAt: now - 12 * 60 * 1000 },
      { id: `${id}-2`, name: '陈小姐', avatar: 'https://i.pravatar.cc/120?img=21', amount: currentPrice - priceStep, createdAt: now - 36 * 60 * 1000 }
    ]
  }
}

function createSeedData() {
  const now = Date.now()
  return [
    createAuction(1, '清代 官窑粉彩百鹿尊', 'A1024', '瓷器专场', 128000, 'ongoing', now + 3 * 3600 * 1000, 'https://picsum.photos/seed/antique1/750/900', { startingPrice: 100000, priceStep: 2000, era: '清代', size: '高 32cm，口径 18cm', material: '粉彩瓷', condition: '器形完整，釉色温润。', description: '器身绘百鹿纹，寓意福禄绵长。' }),
    createAuction(2, '明代 沉香木雕摆件', 'A1025', '木器杂项', 56000, 'ongoing', now + 45 * 60 * 1000, 'https://picsum.photos/seed/antique2/750/900', { startingPrice: 40000, era: '明代', size: '长 26cm，高 18cm', material: '沉香木' }),
    createAuction(3, '张大千 山水手卷', 'A1026', '书画专场', 860000, 'preview', now + 26 * 3600 * 1000, 'https://picsum.photos/seed/antique3/750/900', { startingPrice: 600000, priceStep: 10000, size: '长 540cm，宽 32cm', material: '纸本设色' }),
    createAuction(4, '战国 青铜错金带钩', 'A1027', '青铜杂项', 32000, 'upcoming', now + 5 * 3600 * 1000, 'https://picsum.photos/seed/antique4/750/900', { era: '战国', size: '长 16cm', material: '青铜错金' }),
    createAuction(5, '清乾隆 田黄石印章', 'A1028', '文玩篆刻', 210000, 'ended', now - 3 * 3600 * 1000, 'https://picsum.photos/seed/antique5/750/900', { startingPrice: 150000, priceStep: 5000, era: '清乾隆', size: '高 5.2cm', material: '田黄石' }),
    createAuction(6, '民国 掐丝珐琅香炉', 'A1029', '金属工艺', 18800, 'upcoming', now + 30 * 3600 * 1000, 'https://picsum.photos/seed/antique7/750/900', { priceStep: 500, era: '民国', size: '高 15cm，直径 12cm', material: '铜胎掐丝珐琅' })
  ]
}

function clone(data) { return JSON.parse(JSON.stringify(data)) }
function getAuctions() {
  const stored = uni.getStorageSync(STORAGE_KEY)
  if (Array.isArray(stored) && stored.length) return stored
  const auctions = createSeedData()
  uni.setStorageSync(STORAGE_KEY, auctions)
  return auctions
}

export async function getAuctionList() { return clone(getAuctions()) }

export async function getAuctionDetail(id) {
  const auction = getAuctions().find((item) => String(item.id) === String(id))
  if (!auction) throw new Error('拍品不存在或已下架')
  return clone(auction)
}

export async function placeAuctionBid(id, bidder) {
  const auctions = getAuctions()
  const auction = auctions.find((item) => String(item.id) === String(id))
  if (!auction) throw new Error('拍品不存在或已下架')
  if (auction.status !== 'ongoing' || auction.endAt <= Date.now()) throw new Error('当前拍品无法出价')
  const record = { id: `${auction.id}-${Date.now()}`, name: bidder.name || '我', avatar: bidder.avatar || '/static/avatar.png', amount: auction.currentPrice + auction.priceStep, createdAt: Date.now() }
  auction.currentPrice = record.amount
  auction.bidCount = (auction.bidCount || 0) + 1
  auction.bidRecords.unshift(record)
  uni.setStorageSync(STORAGE_KEY, auctions)
  return clone({ auction, record })
}
