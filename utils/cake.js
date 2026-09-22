// pages/cake 共用工具：多语言文本取值、金额/距离格式化、订单状态映射、
// 底部导航定义、购物车角标状态。所有页面统一从这里取，避免各自实现不一致。
import { ref } from 'vue'
import { config } from './config.js'

export const CAKE_ROUTES = Object.freeze({
  home: '/pages/cake/index',
  order: '/pages/cake/order',
  shop: '/pages/cake/shop',
  transport: '/pages/cake/transport',
  mine: '/pages/cake/mine',
  detail: '/pages/cake/detail',
  cart: '/pages/cake/cart',
  orders: '/pages/cake/orders',
  orderDetail: '/pages/cake/orderDetail',
  account: '/pages/account/accountCenter'
})

// 商品列表排序：与后端 sort 参数一一对应
export const CAKE_SORTS = Object.freeze([
  { key: 'default', labelKey: 'cake.sortDefault' },
  { key: 'sales', labelKey: 'cake.sortSales' },
  { key: 'new', labelKey: 'cake.sortNew' }
])

// 订单状态筛选分组：与后端 status 参数一一对应
export const CAKE_ORDER_TABS = Object.freeze([
  { key: 'all', labelKey: 'cake.orderTabAll' },
  { key: 'pending', labelKey: 'cake.orderTabPending' },
  { key: 'paid', labelKey: 'cake.orderTabPaid' },
  { key: 'completed', labelKey: 'cake.orderTabCompleted' },
  { key: 'cancelled', labelKey: 'cake.orderTabCancelled' }
])

const ORDER_STATUS_KEYS = Object.freeze({
  created: 'cake.statusCreated',
  paid: 'cake.statusPaid',
  preparing: 'cake.statusPreparing',
  shipped: 'cake.statusShipped',
  completed: 'cake.statusCompleted',
  cancelled: 'cake.statusCancelled'
})

const CAKE_LOCALE_FALLBACKS = ['zh-Hans', 'en']

// 后端返回的多语言字段是 { 'zh-Hans': '...', en: '...' }，这里按当前语言取值并逐级回退。
export function pickCakeText(value, locale) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(item => pickCakeText(item, locale)).filter(Boolean).join(' ')
  if (typeof value !== 'object') return ''
  const order = [locale, ...CAKE_LOCALE_FALLBACKS].filter(Boolean)
  for (const key of order) {
    const text = value[key]
    if (typeof text === 'string' && text) return text
  }
  const first = Object.values(value).find(text => typeof text === 'string' && text)
  return first || ''
}

export function orderStatusKey(status) {
  return ORDER_STATUS_KEYS[status] || 'cake.statusCreated'
}

// 待支付订单可以由用户支付/取消；进行中的订单可以确认收货。
export function canPayOrder(order) {
  return order?.status === 'created'
}

export function canCancelOrder(order) {
  return order?.status === 'created'
}

export function canConfirmOrder(order) {
  return ['paid', 'preparing', 'shipped'].includes(order?.status)
}

export function isOrderActive(order) {
  return ['created', 'paid', 'preparing', 'shipped'].includes(order?.status)
}

// 分成保留两位，整元不显示 .00，避免价签上出现无意义的零。
export function formatCakeAmount(cents) {
  const value = Number(cents)
  if (!Number.isFinite(value)) return '0'
  const yuan = value / 100
  const fixed = (Math.round(yuan * 100) / 100).toFixed(2)
  return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed
}

export function formatCakePrice(cents) {
  return `¥${formatCakeAmount(cents)}`
}

export function formatCakeDistance(meters) {
  const value = Number(meters)
  if (!Number.isFinite(value) || value < 0) return ''
  if (value < 1000) return `${Math.round(value)}m`
  const km = value / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km`
}

// 只有后端托管的资源才需要拼接口域名：
//  - /uploads/... 由 Express 静态目录提供，必须拼 baseURL
//  - /static/...  是前端包内资源（占位图等），拼了反而会 404
export function resolveCakeImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url
  if (url.startsWith('/uploads/')) return `${config.baseURL}${url}`
  return url
}

// 商品图按分类兜底到本地静态占位图，避免图片缺失时页面出现破图。
export function cakePlaceholderImage(categoryCode) {
  const code = String(categoryCode || '')
  if (code.startsWith('cake')) return '/static/cake/placeholder-cake.png'
  if (code === 'bread') return '/static/cake/placeholder-bread.png'
  if (code === 'drink') return '/static/cake/placeholder-drink.png'
  if (code === 'cookie-gift') return '/static/cake/placeholder-cookie.png'
  return '/static/cake/placeholder-mooncake.png'
}

// 门店营业状态：后端给 businessStatus，缺失时回退到 isOpen。
export function storeStatusKey(store) {
  if (store?.businessStatus === 'closing_soon') return 'cake.storeClosingSoon'
  if (store?.businessStatus === 'closed' || store?.isOpen === false) return 'cake.storeClosed'
  return 'cake.storeOpen'
}

export function isStoreOpen(store) {
  return store?.businessStatus ? store.businessStatus !== 'closed' : store?.isOpen !== false
}

export function storeServiceKeys(store) {
  const services = Array.isArray(store?.services) ? store.services : []
  return services.map(service => (service === 'pickup' ? 'cake.servicesPickup' : 'cake.servicesDelivery'))
}

export function normalizeTimeText(value) {
  if (typeof value !== 'string') return ''
  return value.slice(0, 5)
}

// 购物车角标：购物车页写入，底部导航和首页读取。
// 服务端购物车是唯一数据源，这里只做展示缓存，不做业务计算。
export const cakeCartState = (() => {
  const totalQuantity = ref(0)
  const itemsAmountCents = ref(0)
  return {
    totalQuantity,
    itemsAmountCents,
    apply(cart) {
      totalQuantity.value = Number(cart?.totalQuantity || 0)
      itemsAmountCents.value = Number(cart?.itemsAmountCents || 0)
    },
    reset() {
      totalQuantity.value = 0
      itemsAmountCents.value = 0
    }
  }
})()

// 门店定位：H5 与小程序都支持 uni.getLocation，授权失败时返回 null 由页面提示。
export function getCakeLocation() {
  return new Promise(resolve => {
    if (typeof uni?.getLocation !== 'function') return resolve(null)
    uni.getLocation({
      type: 'gcj02',
      success: result => resolve({ latitude: Number(result.latitude), longitude: Number(result.longitude) }),
      fail: () => resolve(null)
    })
  })
}

export function isValidCakePhone(value) {
  const phone = String(value || '').trim()
  return phone.length >= 6 && phone.length <= 30 && /^[0-9+\-\s]+$/.test(phone)
}

// 只允许本地生成的幂等号，长度符合后端 8–64 校验。
export function createCakeRequestId() {
  const random = Math.random().toString(36).slice(2, 10)
  return `cake-${Date.now().toString(36)}-${random}`
}

// 固定导航栏毛玻璃进度：滚过 threshold 像素后完全显形，回到顶部渐隐。
// 页面把 scroll-view 的 scrollTop 或 onPageScroll 的 scrollTop 传进来即可。
export function createCakeScrollProgress(threshold = 48) {
  const progress = ref(0)
  let last = -1
  function update(scrollTop) {
    const ratio = Math.min(1, Math.max(0, Number(scrollTop || 0) / threshold))
    // 只在可见变化时写 ref，避免滚动过程中频繁触发无意义的渲染。
    const rounded = Math.round(ratio * 100) / 100
    if (rounded === last) return
    last = rounded
    progress.value = rounded
  }
  return { progress, update }
}

export function goCakePage(route) {
  const target = route.startsWith('/') ? route : `/${route}`
  uni.navigateTo({ url: target, fail: () => uni.redirectTo({ url: target }) })
}

// 模块内主页面之间跳转：走页面栈，返回键可逐级退回；
// 页面栈写满（微信 10 层）时降级为 redirectTo，仍然不会卡住用户。
export function goCakeTab(route) {
  const target = route.startsWith('/') ? route : `/${route}`
  uni.navigateTo({
    url: target,
    fail: () => uni.redirectTo({ url: target, fail: () => uni.reLaunch({ url: target }) })
  })
}

// 「回首页」按钮：栈里已经有月饼首页就退回去，避免同一页反复入栈。
export function goCakeHome() {
  try {
    if (typeof getCurrentPages === 'function') {
      const pages = getCurrentPages() || []
      const route = String(CAKE_ROUTES.home).replace(/^\/+/, '')
      for (let index = pages.length - 2; index >= 0; index -= 1) {
        if (String(pages[index]?.route || '').replace(/^\/+/, '') !== route) continue
        uni.navigateBack({ delta: pages.length - 1 - index })
        return
      }
    }
  } catch (_) { /* 读取页面栈失败时按下面的 reLaunch 兜底 */ }
  uni.reLaunch({ url: CAKE_ROUTES.home })
}

// 月饼模块已经从首页入口 navigateTo 进来，返回时退回上一页；
// 没有页面栈（外部链接直接打开、小程序冷启动）时回 App 首页，而不是退出小程序。
export function backFromCakePage() {
  const fallback = () => uni.reLaunch({ url: '/pages/index/index360' })
  try {
    // navigateBack 在部分端「栈底」不会走 fail，先显式判断有没有上一页。
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() || [] : []
    if (pages.length > 1) {
      uni.navigateBack({ fail: fallback })
      return
    }
  } catch (_) { /* 读取页面栈失败时直接走兜底 */ }
  fallback()
}

// ===== 促销与运费规则 =====
// 必须与后端 services/cakeOrderService.js 的 PRICING 保持一致。
// 仅用于「立即购买」在提交前的金额预览；下单金额一律以后端重算结果为准。
export const CAKE_PRICING = Object.freeze({
  freeShippingThresholdCents: 19900,
  shippingFeeCents: 1500,
  bundle2ThresholdCents: 3000,
  // 后端对单个商品的每行数量上限是 99，超出会直接返回 400，前端要提前夹住。
  maxQuantityPerLine: 99
})

// 单行可选数量的上限 = 库存与后端每行上限的较小值。
export function cakeMaxQuantity(stock) {
  const value = Math.floor(Number(stock) || 0)
  if (value <= 0) return 0
  return Math.min(value, CAKE_PRICING.maxQuantityPerLine)
}

/**
 * 促销规则（逐行与后端 computeTotals 对齐）：
 *  - 单价或数量为 0 的行整个跳过，既不进金额也不进促销分组
 *  - bundle2_30：同组总件数 floor(总件数 / 2) * 30 元
 *  - second_half：同组内摊平成单件后按单价升序两两配对，每对减免较便宜那件的 50%
 *  - 优惠只累加不设上限，但应付金额不为负
 * @param {{unitPriceCents:number, quantity:number, promo:string}[]} lines
 * @param {'pickup'|'delivery'} deliveryType
 */
export function estimateCakeTotals(lines, deliveryType) {
  const rows = Array.isArray(lines) ? lines : []
  let itemsAmountCents = 0
  let bundleQuantity = 0
  const halfPrices = []

  for (const line of rows) {
    const unitPriceCents = Math.max(0, Math.round(Number(line?.unitPriceCents) || 0))
    const quantity = Math.max(0, Math.floor(Number(line?.quantity) || 0))
    if (!unitPriceCents || !quantity) continue
    itemsAmountCents += unitPriceCents * quantity
    if (line?.promo === 'bundle2_30') bundleQuantity += quantity
    else if (line?.promo === 'second_half') {
      for (let index = 0; index < quantity; index += 1) halfPrices.push(unitPriceCents)
    }
  }

  let discountCents = Math.floor(bundleQuantity / 2) * CAKE_PRICING.bundle2ThresholdCents
  halfPrices.sort((left, right) => left - right)
  for (let index = 0; index + 1 < halfPrices.length; index += 2) discountCents += Math.round(halfPrices[index] / 2)

  const threshold = CAKE_PRICING.freeShippingThresholdCents
  const shippingCents = deliveryType === 'pickup' ? 0 : (itemsAmountCents >= threshold ? 0 : CAKE_PRICING.shippingFeeCents)
  const payableCents = Math.max(0, itemsAmountCents - discountCents + shippingCents)
  return { itemsAmountCents, discountCents, shippingCents, payableCents }
}
