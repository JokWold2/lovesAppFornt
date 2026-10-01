/**
 * 需求市场的纯展示逻辑。
 * 抽出来是为了让页面模板保持简单，同时这些规则（价格文案、截止倒计时、
 * 报名与托管状态文案、各状态可执行的动作）可以被单元测试直接覆盖。
 *
 * 面向用户的文案统一通过可选的 t 参数读取（t('demandHall.xxx')）；
 * 不传 t 时退回内置简体中文，保证纯函数在不依赖语言运行时的情况下依然可用。
 */

const DEFAULT_TEXT = {
	priceNegotiable: '议价',
	priceUnitHour: '/小时',
	priceUnitDay: '/天',
	priceUnitTime: '/次',
	deadlineEnded: '已结束',
	deadlineToday: '今天截止',
	deadlineDays: '距离结束还有 {count} 天',
	timeJustNow: '刚刚',
	timeMinutes: '{count} 分钟前',
	timeHours: '{count} 小时前',
	timeDays: '{count} 天前',
	timeDate: '{month} 月 {day} 日',
	distanceMeters: '距离你 {value}m',
	distanceKm: '距离你 {value}km',
	badgeClosed: '已结单',
	badgeUrgent: '急单',
	badgeOffline: '线下',
	badgeOnline: '线上完成',
	badgeVerified: '需认证',
	badgeNegotiable: '可议价',
	actionDetail: '查看详情',
	actionClosed: '已结单',
	actionAccepted: '已选定',
	actionApplied: '已报名',
	actionApplyService: '我来接单',
	actionApplyDemand: '我要报名'
}

/** 统一读取文案：优先走页面传入的 t()，缺失时回退到内置中文并做占位符替换。 */
function label(t, key, fallback, params = {}) {
	const translated = typeof t === 'function' ? t(`demandHall.${key}`, params) : undefined
	const raw = typeof translated === 'string' && translated !== `demandHall.${key}` ? translated : fallback
	return String(raw ?? '').replace(/\{(\w+)\}/g, (_, name) => (params[name] == null ? '' : String(params[name])))
}

// 核心双 Tab：求助 / 找帮手 与 提供 / 找活儿
export const DEMAND_HALL_TABS = [
	{ key: 'demand', label: '求助 / 找帮手', shortLabel: '找帮手', labelKey: 'tabDemand', emptyKey: 'emptyDemand', icon: 'help-filled', emptyText: '暂时没有求助信息' },
	{ key: 'service', label: '提供 / 找活儿', shortLabel: '找活儿', labelKey: 'tabService', emptyKey: 'emptyService', icon: 'staff-filled', emptyText: '暂时没有服务信息' }
]

export const SORT_OPTIONS = [
	{ value: 'latest', label: '最新发布', labelKey: 'sortLatest' },
	{ value: 'budget', label: '预算最高', labelKey: 'sortBudget' },
	{ value: 'distance', label: '距离最近', labelKey: 'sortDistance' }
]

export const LOCATION_OPTIONS = [
	{ value: 'all', label: '不限位置', labelKey: 'anyLocation' },
	{ value: 'online', label: '线上远程', labelKey: 'locationOnline' },
	{ value: 'offline', label: '线下区域', labelKey: 'locationOffline' }
]

export const PRICE_UNIT_OPTIONS = [
	{ value: 'total', label: '整单', labelKey: 'formPriceUnitTotal' },
	{ value: 'hour', label: '每小时', labelKey: 'formPriceUnitHour' },
	{ value: 'day', label: '每天', labelKey: 'formPriceUnitDay' },
	{ value: 'time', label: '每次', labelKey: 'formPriceUnitTime' }
]

/** 内置分类的展示名与文案键一一对应；接口返回的白名单优先于这里。 */
export const DEFAULT_CATEGORY_DEFINITIONS = [
	{ name: '语言翻译', key: 'categoryTranslate' },
	{ name: '跑腿代办', key: 'categoryErrand' },
	{ name: '专业技能', key: 'categoryProfessional' },
	{ name: '生活求助', key: 'categoryLife' },
	{ name: '家政服务', key: 'categoryHousekeeping' },
	{ name: '其他', key: 'categoryOther' }
]

export const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_DEFINITIONS.map(item => item.name)

/**
 * 筛选栏的「全部」哨兵值。
 * 它不是真实分类，因此单独走 demandHall.all 文案，避免在非中文界面显示简体「全部」。
 */
export const ALL_CATEGORY = '全部'

/** 简体中文分类名 -> 文案键，用于把后端返回的分类名映射成当前语言。 */
const CATEGORY_KEY_BY_NAME = DEFAULT_CATEGORY_DEFINITIONS.reduce((map, item) => {
	map[item.name] = item.key
	return map
}, {})

export function tabDefinition(tabKey) {
	return DEMAND_HALL_TABS.find(tab => tab.key === tabKey) || DEMAND_HALL_TABS[0]
}

/** Tab 展示名；缺少 t 时退回内置中文标签。 */
export function tabLabel(tabKey, t) {
	const definition = tabDefinition(tabKey)
	return label(t, definition.labelKey, definition.shortLabel)
}

/** Tab 空状态文案。 */
export function tabEmptyText(tabKey, t) {
	const definition = tabDefinition(tabKey)
	return label(t, definition.emptyKey, definition.emptyText)
}

export function sortLabel(value, t) {
	const option = SORT_OPTIONS.find(item => item.value === value) || SORT_OPTIONS[0]
	return label(t, option.labelKey, option.label)
}

export function locationLabel(value, t) {
	const option = LOCATION_OPTIONS.find(item => item.value === value) || LOCATION_OPTIONS[0]
	return label(t, option.labelKey, option.label)
}

export function priceUnitLabel(value, t) {
	const option = PRICE_UNIT_OPTIONS.find(item => item.value === value) || PRICE_UNIT_OPTIONS[0]
	return label(t, option.labelKey, option.label)
}

/** 内置分类名 -> 当前语言；「全部」哨兵值走 all 文案，后端自定义分类名原样返回。 */
export function categoryLabel(name, t) {
	if (name === ALL_CATEGORY) return label(t, 'all', ALL_CATEGORY)
	const key = CATEGORY_KEY_BY_NAME[name]
	return key ? label(t, key, name) : name
}

export function categoryLabels(list, t) {
	return (Array.isArray(list) ? list : []).map(name => categoryLabel(name, t))
}

/** 价格文案：后台已给出 priceLabel 时优先使用，避免前后端规则漂移。 */
export function formatPriceLabel(post = {}, t) {
	if (post.priceLabel) return post.priceLabel
	const negotiated = label(t, 'priceNegotiable', DEFAULT_TEXT.priceNegotiable)
	if (post.isNegotiable || post.price == null) return negotiated
	const amount = Number(post.price)
	if (!Number.isFinite(amount)) return negotiated
	const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
	const suffixKey = { hour: 'priceUnitHour', day: 'priceUnitDay', time: 'priceUnitTime' }[post.priceUnit]
	return suffixKey ? `￥${text}${label(t, suffixKey, DEFAULT_TEXT[suffixKey])}` : `￥${text}`
}

/** “距离结束还有 2 天” / “今天截止” / “已结束”。 */
export function formatDeadlineText(deadline, now = Date.now(), t) {
	if (!deadline) return ''
	if (typeof deadline === 'object' && typeof deadline.label === 'string') return deadline.label
	const target = Number(deadline)
	if (!Number.isFinite(target)) return ''
	const diff = target - now
	if (diff <= 0) return label(t, 'deadlineEnded', DEFAULT_TEXT.deadlineEnded)
	const daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000))
	if (daysLeft <= 1) return label(t, 'deadlineToday', DEFAULT_TEXT.deadlineToday)
	return label(t, 'deadlineDays', DEFAULT_TEXT.deadlineDays, { count: daysLeft })
}

export function isDeadlineExpired(deadline, now = Date.now()) {
	if (!deadline) return false
	if (typeof deadline === 'object' && typeof deadline.expired === 'boolean') return deadline.expired
	const target = Number(deadline)
	return Number.isFinite(target) ? target <= now : false
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 具体日期。 */
export function formatRelativeTime(timestamp, now = Date.now(), t) {
	const value = Number(timestamp)
	if (!Number.isFinite(value) || value <= 0) return ''
	const diff = now - value
	if (diff < 60 * 1000) return label(t, 'timeJustNow', DEFAULT_TEXT.timeJustNow)
	if (diff < 60 * 60 * 1000) return label(t, 'timeMinutes', DEFAULT_TEXT.timeMinutes, { count: Math.floor(diff / (60 * 1000)) })
	if (diff < 24 * 60 * 60 * 1000) return label(t, 'timeHours', DEFAULT_TEXT.timeHours, { count: Math.floor(diff / (60 * 60 * 1000)) })
	if (diff < 7 * 24 * 60 * 60 * 1000) return label(t, 'timeDays', DEFAULT_TEXT.timeDays, { count: Math.floor(diff / (24 * 60 * 60 * 1000)) })
	const date = new Date(value)
	return label(t, 'timeDate', DEFAULT_TEXT.timeDate, { month: date.getMonth() + 1, day: date.getDate() })
}

/** 距离展示：线下帖子带坐标时显示“距离你 3.2km”。 */
export function formatDistanceText(distanceKm, t) {
	if (distanceKm == null || distanceKm === '') return ''
	const value = Number(distanceKm)
	if (!Number.isFinite(value)) return ''
	if (value < 1) return label(t, 'distanceMeters', DEFAULT_TEXT.distanceMeters, { value: Math.max(1, Math.round(value * 1000)) })
	return label(t, 'distanceKm', DEFAULT_TEXT.distanceKm, { value: value.toFixed(1) })
}

/** 卡片标签组：把“急单 / 线上完成 / 需认证”等属性标签统一生成。 */
export function buildCardBadges(post = {}, { max = 4, t } = {}) {
	const badges = []
	// 结单状态最先展示：需求被选定后会置为 closed，提示其他人不要再报名。
	if (post.status === 'closed') badges.push({ text: label(t, 'badgeClosed', DEFAULT_TEXT.badgeClosed), tone: 'muted' })
	if (post.isUrgent) badges.push({ text: label(t, 'badgeUrgent', DEFAULT_TEXT.badgeUrgent), tone: 'urgent' })
	if (post.locationType === 'offline') badges.push({ text: post.locationText || label(t, 'badgeOffline', DEFAULT_TEXT.badgeOffline), tone: 'location' })
	else badges.push({ text: label(t, 'badgeOnline', DEFAULT_TEXT.badgeOnline), tone: 'online' })
	if (post.requireVerified) badges.push({ text: label(t, 'badgeVerified', DEFAULT_TEXT.badgeVerified), tone: 'verified' })
	if (post.isNegotiable) badges.push({ text: label(t, 'badgeNegotiable', DEFAULT_TEXT.badgeNegotiable), tone: 'neutral' })
	for (const tag of Array.isArray(post.tags) ? post.tags : []) {
		if (badges.length >= max) break
		if (badges.some(badge => badge.text === tag)) continue
		badges.push({ text: tag, tone: 'tag' })
	}
	return badges.slice(0, max)
}

/** 卡片底部主按钮文案：区分自己的发布、已报名、已结单与可报名。 */
export function postActionText(post = {}, t) {
	if (post.isOwner) return label(t, 'actionDetail', DEFAULT_TEXT.actionDetail)
	if (post.status === 'closed') return label(t, 'actionClosed', DEFAULT_TEXT.actionClosed)
	if (post.hasApplied) return post.myApplicationStatus === 'accepted'
		? label(t, 'actionAccepted', DEFAULT_TEXT.actionAccepted)
		: label(t, 'actionApplied', DEFAULT_TEXT.actionApplied)
	if (post.type === 'service') return label(t, 'actionApplyService', DEFAULT_TEXT.actionApplyService)
	return label(t, 'actionApplyDemand', DEFAULT_TEXT.actionApplyDemand)
}

/** 报名前置校验，返回空字符串表示可以报名。 */
export function canApplyToPost(post = {}, t) {
	if (!post || !post.id) return label(t, 'applyBlockedMissing', '内容不存在')
	if (post.isOwner) return label(t, 'contactSelf', '这是你发布的内容')
	if (post.status === 'closed') return label(t, 'applyBlockedClosed', '该信息已结单')
	if (post.deadline?.expired || isDeadlineExpired(post.deadline)) return label(t, 'applyBlockedExpired', '该需求已结束')
	if (post.hasApplied) return label(t, 'applyBlockedApplied', '你已经提交过报名')
	return ''
}

/** 报名状态文案，用于卡片角标与详情页。 */
export function applicationStatusMeta(status, t) {
	const meta = {
		pending: { text: label(t, 'applyStatusPending', '已报名 · 待处理'), tone: 'pending' },
		accepted: { text: label(t, 'applyStatusAccepted', '已选定'), tone: 'accepted' },
		rejected: { text: label(t, 'applyStatusRejected', '未选中'), tone: 'muted' },
		cancelled: { text: label(t, 'applyStatusCancelled', '已取消'), tone: 'muted' }
	}
	return meta[status] || null
}

/** 托管状态文案与当前状态提示。 */
export function orderStatusMeta(status, t) {
	const meta = {
		created: { text: label(t, 'orderCreatedStatus', '待买家付款'), tone: 'pending', hint: label(t, 'orderCreatedHint', '买家付款到平台托管后，卖家再开始交付。') },
		funded: { text: label(t, 'orderFundedStatus', '资金托管中'), tone: 'active', hint: label(t, 'orderFundedHint', '平台已托管资金，等待卖家交付。') },
		delivered: { text: label(t, 'orderDeliveredStatus', '待买家确认'), tone: 'active', hint: label(t, 'orderDeliveredHint', '卖家已交付，买家确认后资金结算给卖家。') },
		completed: { text: label(t, 'orderCompletedStatus', '已完成'), tone: 'done', hint: label(t, 'orderCompletedHint', '买家已确认，托管资金结算完成。') },
		cancelled: { text: label(t, 'orderCancelledStatus', '已取消'), tone: 'muted', hint: label(t, 'orderCancelledHint', '交易已取消，未发生资金流转。') },
		refunded: { text: label(t, 'orderRefundedStatus', '已退款'), tone: 'muted', hint: label(t, 'orderRefundedHint', '托管资金已退回买家。') }
	}
	return meta[status] || { text: status || label(t, 'orderUnknownStatus', '未知'), tone: 'muted', hint: '' }
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
 * labelKey 指向 escrow 命名空间，页面用 t(action.labelKey) 渲染；
 * label 只是没有语言运行时的兜底中文。
 */
export function nextOrderActions({ status, isBuyer = false, isSeller = false } = {}) {
	const actions = []
	if (status === 'created') {
		if (isBuyer) actions.push({ action: 'fund', labelKey: 'escrow.fundAction', label: '付款到平台托管', tone: 'primary' })
		if (isBuyer || isSeller) actions.push({ action: 'cancel', labelKey: 'escrow.cancelTitle', label: '取消交易', tone: 'muted' })
	} else if (status === 'funded') {
		if (isSeller) actions.push({ action: 'deliver', labelKey: 'escrow.deliverySubmit', label: '我已交付', tone: 'primary' })
		if (isBuyer) actions.push({ action: 'refund', labelKey: 'escrow.refundTitle', label: '申请退款', tone: 'muted' })
	} else if (status === 'delivered') {
		if (isBuyer) actions.push({ action: 'confirm', labelKey: 'escrow.confirmTitle', label: '确认完成并放款', tone: 'primary' })
		if (isBuyer) actions.push({ action: 'refund', labelKey: 'escrow.refundTitle', label: '申请退款', tone: 'muted' })
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
		// 线下信息发布时把坐标一起带上，「距离最近」排序才有数据可用。
		latitude: null,
		longitude: null,
		isUrgent: false,
		requireVerified: false,
		deadlineAt: ''
	}
}

/** 发布表单校验，返回第一条错误信息；通过时返回空字符串。 */
export function validatePublishForm(form = {}, t) {
	const title = String(form.title || '').trim()
	const description = String(form.description || '').trim()
	if (title.length < 2) return label(t, 'publishTitleRequired', '请填写至少 2 个字的标题')
	if (title.length > 120) return label(t, 'publishTitleTooLong', '标题不能超过 120 个字')
	if (!description) return label(t, 'publishDescriptionRequired', '请补充详细描述')
	if (description.length > 2000) return label(t, 'publishDescriptionTooLong', '详细描述不能超过 2000 个字')
	const categories = Array.isArray(form.categories) ? form.categories : []
	if (categories.length < 1) return label(t, 'publishCategoryRequired', '请至少选择 1 个一级分类')
	if (categories.length > 2) return label(t, 'publishCategoryTooMany', '一级分类最多选择 2 个')
	if (form.locationType === 'offline' && !String(form.locationText || '').trim()) return label(t, 'publishLocationRequired', '线下服务请填写区域')
	if (form.price !== '' && form.price != null) {
		const price = Number(form.price)
		if (!Number.isFinite(price) || price < 0) return label(t, 'publishPriceInvalid', '预算 / 报价金额无效')
	}
	if (Array.isArray(form.tags) && form.tags.length > 5) return label(t, 'publishTagsTooMany', '自定义标签最多 5 个')
	return ''
}
