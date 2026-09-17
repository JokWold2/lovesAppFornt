/**
 * 需求市场的纯展示逻辑。
 * 抽出来是为了让页面模板保持简单，同时这些规则（价格文案、截止倒计时、
 * 报名与托管状态文案、各状态可执行的动作）可以被单元测试直接覆盖。
 */

// 核心双 Tab：求助 / 找帮手 与 提供 / 找活儿
export const DEMAND_HALL_TABS = [
  { key: 'demand', label: '求助 / 找帮手', shortLabel: '找帮手', icon: 'help-filled', emptyText: '暂时没有求助信息' },
  { key: 'service', label: '提供 / 找活儿', shortLabel: '找活儿', icon: 'staff-filled', emptyText: '暂时没有服务信息' }
]

export const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'budget', label: '预算最高' },
  { value: 'distance', label: '距离最近' }
]

export const LOCATION_OPTIONS = [
  { value: 'all', label: '不限位置' },
  { value: 'online', label: '线上远程' },
  { value: 'offline', label: '线下区域' }
]

export const PRICE_UNIT_OPTIONS = [
  { value: 'total', label: '整单' },
  { value: 'hour', label: '每小时' },
  { value: 'day', label: '每天' },
  { value: 'time', label: '每次' }
]

export const DEFAULT_CATEGORIES = ['语言翻译', '跑腿代办', '专业技能', '生活求助', '家政服务', '其他']

const PRICE_UNIT_SUFFIX = { total: '', hour: '/小时', day: '/天', time: '/次' }

export function tabDefinition(tabKey) {
  return DEMAND_HALL_TABS.find(tab => tab.key === tabKey) || DEMAND_HALL_TABS[0]
}

export function sortLabel(value) {
  return SORT_OPTIONS.find(option => option.value === value)?.label || SORT_OPTIONS[0].label
}

export function locationLabel(value) {
  return LOCATION_OPTIONS.find(option => option.value === value)?.label || LOCATION_OPTIONS[0].label
}

/** 价格文案：后台已给出 priceLabel 时优先使用，避免前后端规则漂移。 */
export function formatPriceLabel(post = {}) {
  if (post.priceLabel) return post.priceLabel
  if (post.isNegotiable || post.price == null) return '议价'
  const amount = Number(post.price)
  if (!Number.isFinite(amount)) return '议价'
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  return `￥${text}${PRICE_UNIT_SUFFIX[post.priceUnit] || ''}`
}

/** “距离结束还有 2 天” / “今天截止” / “已结束”。 */
export function formatDeadlineText(deadline, now = Date.now()) {
  if (!deadline) return ''
  if (typeof deadline === 'object' && typeof deadline.label === 'string') return deadline.label
  const target = Number(deadline)
  if (!Number.isFinite(target)) return ''
  const diff = target - now
  if (diff <= 0) return '已结束'
  const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (daysLeft <= 1) return '今天截止'
  return `距离结束还有 ${daysLeft} 天`
}

export function isDeadlineExpired(deadline, now = Date.now()) {
  if (!deadline) return false
  if (typeof deadline === 'object' && typeof deadline.expired === 'boolean') return deadline.expired
  const target = Number(deadline)
  return Number.isFinite(target) ? target <= now : false
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 具体日期。 */
export function formatRelativeTime(timestamp, now = Date.now()) {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return ''
  const diff = now - value
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`
  const date = new Date(value)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

/** 距离展示：线下帖子带坐标时显示“距离你 3.2km”。 */
export function formatDistanceText(distanceKm) {
  if (distanceKm == null || distanceKm === '') return ''
  const value = Number(distanceKm)
  if (!Number.isFinite(value)) return ''
  if (value < 1) return `距离你 ${Math.max(1, Math.round(value * 1000))}m`
  return `距离你 ${value.toFixed(1)}km`
}

/** 卡片标签组：把“急单 / 线上完成 / 需认证”等属性标签统一生成。 */
export function buildCardBadges(post = {}, { max = 4 } = {}) {
  const badges = []
  // 结单状态最先展示：需求被选定后会置为 closed，提示其他人不要再报名。
  if (post.status === 'closed') badges.push({ text: '已结单', tone: 'muted' })
  if (post.isUrgent) badges.push({ text: '急单', tone: 'urgent' })
  if (post.locationType === 'offline') badges.push({ text: post.locationText || '线下', tone: 'location' })
  else badges.push({ text: '线上完成', tone: 'online' })
  if (post.requireVerified) badges.push({ text: '需认证', tone: 'verified' })
  if (post.isNegotiable) badges.push({ text: '可议价', tone: 'neutral' })
  for (const tag of Array.isArray(post.tags) ? post.tags : []) {
    if (badges.length >= max) break
    if (badges.some(badge => badge.text === tag)) continue
    badges.push({ text: tag, tone: 'tag' })
  }
  return badges.slice(0, max)
}

/** 卡片底部主按钮文案：区分自己的发布、已报名、已结单与可报名。 */
export function postActionText(post = {}) {
  if (post.isOwner) return '查看详情'
  if (post.status === 'closed') return '已结单'
  if (post.hasApplied) return post.myApplicationStatus === 'accepted' ? '已选定' : '已报名'
  if (post.type === 'service') return '我来接单'
  return '我要报名'
}

/** 报名前置校验，返回空字符串表示可以报名。 */
export function canApplyToPost(post = {}) {
  if (!post || !post.id) return '内容不存在'
  if (post.isOwner) return '这是你发布的内容'
  if (post.status === 'closed') return '该信息已结单'
  if (post.deadline?.expired || isDeadlineExpired(post.deadline)) return '该需求已结束'
  if (post.hasApplied) return '你已经提交过报名'
  return ''
}

/** 报名状态文案，用于卡片角标与详情页。 */
export function applicationStatusMeta(status) {
  const meta = {
    pending: { text: '已报名 · 待处理', tone: 'pending' },
    accepted: { text: '已选定', tone: 'accepted' },
    rejected: { text: '未选中', tone: 'muted' },
    cancelled: { text: '已取消', tone: 'muted' }
  }
  return meta[status] || null
}

/** 托管状态文案与当前状态提示。 */
export function orderStatusMeta(status) {
  const meta = {
    created: { text: '待买家付款', tone: 'pending', hint: '买家付款到平台托管后，卖家再开始交付。' },
    funded: { text: '资金托管中', tone: 'active', hint: '平台已托管资金，等待卖家交付。' },
    delivered: { text: '待买家确认', tone: 'active', hint: '卖家已交付，买家确认后资金结算给卖家。' },
    completed: { text: '已完成', tone: 'done', hint: '买家已确认，托管资金结算完成。' },
    cancelled: { text: '已取消', tone: 'muted', hint: '交易已取消，未发生资金流转。' },
    refunded: { text: '已退款', tone: 'muted', hint: '托管资金已退回买家。' }
  }
  return meta[status] || { text: status || '未知', tone: 'muted', hint: '' }
}

/**
 * 列表请求参数：把页面的筛选状态翻译成接口 query。
 * sort = distance 时必须带坐标，否则后端会退回最新排序。
 */
export function buildListParams({ tab, category = '全部', tag = '', keyword = '', sort = 'latest', locationType = 'all', coords = null, page = 1, pageSize = 10 } = {}) {
  const params = { page, pageSize, sort }
  if (tab) params.type = tab
  if (category && category !== '全部') params.category = category
  if (tag) params.tag = tag
  const trimmed = String(keyword || '').trim()
  if (trimmed) params.keyword = trimmed
  if (locationType && locationType !== 'all') params.locationType = locationType
  if (sort === 'distance' && coords && Number.isFinite(Number(coords.latitude)) && Number.isFinite(Number(coords.longitude))) {
    params.latitude = Number(coords.latitude)
    params.longitude = Number(coords.longitude)
  }
  return params
}

/**
 * 当前用户在该托管订单上可以执行的动作。
 * 与后端 ORDER_ACTIONS 保持一致，前端只做展示层的可用性控制，最终仍以接口校验为准。
 */
export function nextOrderActions({ status, isBuyer = false, isSeller = false } = {}) {
  const actions = []
  if (status === 'created') {
    if (isBuyer) actions.push({ action: 'fund', label: '付款到平台托管', tone: 'primary' })
    if (isBuyer || isSeller) actions.push({ action: 'cancel', label: '取消交易', tone: 'muted' })
  } else if (status === 'funded') {
    if (isSeller) actions.push({ action: 'deliver', label: '我已交付', tone: 'primary' })
    if (isBuyer) actions.push({ action: 'refund', label: '申请退款', tone: 'muted' })
  } else if (status === 'delivered') {
    if (isBuyer) actions.push({ action: 'confirm', label: '确认完成并放款', tone: 'primary' })
    if (isBuyer) actions.push({ action: 'refund', label: '申请退款', tone: 'muted' })
  }
  return actions
}

/**
 * 发布表单默认值：从当前 Tab 推导类型，避免用户在抽屉里再选一次角色。
 */
export function buildPublishDefaults(tabKey) {
  return {
    type: tabKey === 'service' ? 'service' : 'demand',
    categories: [],
    tags: [],
    title: '',
    description: '',
    price: '',
    priceUnit: 'total',
    isNegotiable: false,
    locationType: 'online',
    locationText: '',
    isUrgent: false,
    requireVerified: false,
    deadlineAt: ''
  }
}

/** 发布表单校验，返回第一条错误信息；通过时返回空字符串。 */
export function validatePublishForm(form = {}) {
  const title = String(form.title || '').trim()
  const description = String(form.description || '').trim()
  if (title.length < 2) return '请填写至少 2 个字的标题'
  if (title.length > 120) return '标题不能超过 120 个字'
  if (!description) return '请补充详细描述'
  if (description.length > 2000) return '详细描述不能超过 2000 个字'
  const categories = Array.isArray(form.categories) ? form.categories : []
  if (categories.length < 1) return '请至少选择 1 个一级分类'
  if (categories.length > 2) return '一级分类最多选择 2 个'
  if (form.locationType === 'offline' && !String(form.locationText || '').trim()) return '线下服务请填写区域'
  if (form.price !== '' && form.price != null) {
    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0) return '预算 / 报价金额无效'
  }
  if (Array.isArray(form.tags) && form.tags.length > 5) return '自定义标签最多 5 个'
  return ''
}
