/**
 * 需求市场个人工作台与担保交易订单页的纯展示逻辑。
 *
 * 与 demandHallPresentation.js 的分工：
 *  - 那边是「信息流 / 详情页」的价格、报名与托管状态机文案；
 *  - 这边是「我的工作台」Tab、我的发布状态角标、订单进度条、角色按钮与超时判断。
 *
 * 抽成纯函数是为了让页面模板保持简单，同时这些规则可以被单元测试直接覆盖。
 */

/* ============================ 工作台 ============================ */

// icon 只做备注用途：页面用 Tab 文案渲染，未直接绑定 icon 字段。
export const WORKSPACE_TABS = [
  { key: 'posts', label: '我发布的' },
  { key: 'applies', label: '我的参与' },
  { key: 'collections', label: '我的收藏' }
]

/** 我发布的子分类：与信息流双 Tab 对齐，需求 / 服务分开展示。 */
export const WORKSPACE_POST_KINDS = [
  { key: 'demand', label: '需求', emptyText: '还没有发布过需求' },
  { key: 'service', label: '服务', emptyText: '还没有发布过服务' }
]

export const WORKSPACE_ROLE_BY_TAB = {
  posts: 'published',
  applies: 'applied',
  collections: 'collected'
}

export function workspaceTabDefinition(key) {
  return WORKSPACE_TABS.find(tab => tab.key === key) || WORKSPACE_TABS[0]
}

/**
 * 「我发布的」右上角状态角标。
 * 招募中 = 还在等信息流报名；进行中 = 已选定接单方且有进行中的托管订单；
 * 已完结 = 托管订单完成；已关闭 = 发布者结单但没有进行中的交易。
 */
export function myPostStatusMeta(status, { hasActiveOrder = false, t } = {}) {
  const meta = {
    recruiting: { text: translate(t, 'workspace.statusRecruiting', '招募中'), tone: 'recruiting' },
    ongoing: { text: translate(t, 'workspace.statusOngoing', '进行中'), tone: 'ongoing' },
    completed: { text: translate(t, 'workspace.statusCompleted', '已完结'), tone: 'completed' },
    closed: { text: translate(t, 'workspace.statusClosed', '已关闭'), tone: 'closed' }
  }
  return meta[resolveMyPostStatus(status, { hasActiveOrder })] || meta.recruiting
}

/** 统一读取文案：优先走页面传入的 t()，缺失时回退到内置中文。 */
function translate(t, key, fallback) {
  const translated = typeof t === 'function' ? t(key) : undefined
  return typeof translated === 'string' && translated !== key ? translated : fallback
}

export function resolveMyPostStatus(post = {}, { hasActiveOrder = false } = {}) {
  const matches = (post.orders || []).filter(Boolean)
  if (matches.some(order => order.status === 'completed')) return 'completed'
  if (hasActiveOrder || matches.some(order => ['created', 'funded', 'delivered'].includes(order.status))) return 'ongoing'
  if (post.status === 'closed') return 'closed'
  return 'recruiting'
}

/**
 * 把「我发布的」列表与「我的托管订单」合起来，产出每个帖子的状态与关联订单。
 * 订单按帖子聚合后取最近一条，供卡片角标、报名者管理面板与「推进交易」入口复用。
 */
export function buildMyPostGroups(posts = [], orders = []) {
  const ordersByPost = new Map()
  for (const order of Array.isArray(orders) ? orders : []) {
    if (!order || order.postId == null) continue
    const key = String(order.postId)
    if (!ordersByPost.has(key)) ordersByPost.set(key, [])
    ordersByPost.get(key).push(order)
  }
  return (Array.isArray(posts) ? posts : []).map(post => {
    const ordersForPost = (ordersByPost.get(String(post.id)) || [])
      .slice()
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    return { post, orders: ordersForPost }
  })
}

/** 我发布的卡片底部管理按钮：修改、下架 / 重新上架、查看报名者。 */
export function myPostActions(post = {}, { orderCount = 0, t } = {}) {
  const applicationsLabel = orderCount > 0
    ? translate(t, 'workspace.actionApplicationsCount', `查看报名者（${orderCount}）`).replace('{count}', String(orderCount))
    : translate(t, 'workspace.actionApplications', '查看报名者')
  const actions = [
    { action: 'edit', label: translate(t, 'workspace.actionEdit', '修改'), tone: 'ghost' },
    { action: 'applications', label: applicationsLabel, tone: 'primary' }
  ]
  if (post.status === 'closed') actions.splice(1, 0, { action: 'reopen', label: translate(t, 'workspace.actionReopen', '重新上架'), tone: 'ghost' })
  else actions.splice(1, 0, { action: 'close', label: translate(t, 'workspace.actionClose', '下架'), tone: 'ghost' })
  return actions
}

/**
 * 信誉看板数据。
 * 累计收入 / 支出只统计已完结（completed）的托管订单，进行中的资金不算进账，
 * 避免给用户「钱已经到手」的错误预期；评分按完成单量给出，无单时不虚构评分。
 *
 * 收支与单量的权威来源是服务端聚合接口（summary）：本地只拿得到当前页帖子对应的订单，
 * 直接累加会少算。传了 summary 就用它，没传（或接口失败）时退回本地估算。
 */
export function buildReputationSummary({ posts = [], orders = [], accountLevel = 0, userId = 0, summary = null } = {}) {
  const viewerId = Number(userId) || 0
  const list = Array.isArray(orders) ? orders.filter(Boolean) : []
  const completed = list.filter(order => order.status === 'completed')
  let earned = 0
  let spent = 0
  let ongoing = 0
  for (const order of list) {
    const amount = Number(order.amount)
    const safeAmount = Number.isFinite(amount) ? amount : 0
    if (order.status === 'completed') {
      if (Number(order.sellerUserId) === viewerId) earned += safeAmount
      if (Number(order.buyerUserId) === viewerId) spent += safeAmount
    } else if (['created', 'funded', 'delivered'].includes(order.status)) {
      ongoing += 1
    }
  }
  const serverEarned = Number(summary?.earned)
  const serverSpent = Number(summary?.spent)
  const serverOngoing = Number(summary?.ongoingOrders)
  const serverCompleted = Number(summary?.completedOrders)
  const useServer = !!summary && Number.isFinite(serverEarned) && Number.isFinite(serverSpent)
  const completedCount = useServer && Number.isFinite(serverCompleted) ? serverCompleted : completed.length
  const serverLevel = Number(summary?.accountLevel)
  const level = Number.isFinite(serverLevel) && serverLevel > 0 ? serverLevel : (Number(accountLevel) || 0)
  const postList = Array.isArray(posts) ? posts : []
  const postCount = postList.length
  return {
    accountLevel: level,
    isVerified: typeof summary?.isVerified === 'boolean' ? summary.isVerified : isVerifiedAccount(level),
    earned: round2(useServer ? serverEarned : earned),
    spent: round2(useServer ? serverSpent : spent),
    ongoingOrders: useServer && Number.isFinite(serverOngoing) ? serverOngoing : ongoing,
    completedOrders: completedCount,
    postCount,
    recruitingCount: postList.filter(post => post.status !== 'closed').length,
    closedCount: postList.filter(post => post.status === 'closed').length,
    // 无完成单量时返回 null，页面显示「暂无评分」而不是伪造 5.0。
    score: completedCount ? round1(4.6 + Math.min(completedCount, 40) / 100) : null,
    scoreCount: completedCount
  }
}

/** V 认证判定与后端 VERIFIED_ACCOUNT_LEVEL 保持一致（金级及以上）。 */
export const VERIFIED_ACCOUNT_LEVEL = 4

export function isVerifiedAccount(accountLevel) {
  return Number(accountLevel) >= VERIFIED_ACCOUNT_LEVEL
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10
}

export function formatAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0'
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

/* ============================ 担保交易订单页 ============================ */

/**
 * 订单生命周期进度条：买家托管资金 -> 卖家交付 -> 买家验收 -> 资金结算。
 * 终态 cancelled / refunded 不落在正常进度上，页面改为展示异常提示。
 */
export const ESCROW_STEPS = [
  { key: 'fund', label: '买家托管', hint: '买家付款到平台托管' },
  { key: 'deliver', label: '卖家交付', hint: '卖家按约定交付并上传凭证' },
  { key: 'accept', label: '买家验收', hint: '买家确认交付结果' },
  { key: 'settle', label: '资金结算', hint: '托管资金结算给卖家' }
]

const ORDER_STEP_INDEX = {
  created: 0,
  funded: 1,
  delivered: 2,
  completed: 4,
  cancelled: 0,
  refunded: 1
}

export function escrowSteps(status) {
  const reached = ORDER_STEP_INDEX[status] ?? 0
  return ESCROW_STEPS.map((step, index) => ({
    ...step,
    // active = 正在进行的这一步；done = 已经走过的步骤。
    index,
    done: index < reached,
    active: index === reached,
    reached: index <= reached
  }))
}

export function isOrderClosed(status) {
  return ['completed', 'cancelled', 'refunded'].includes(status)
}

/**
 * 订单页底部固定操作栏：按当前身份与状态动态渲染主 / 次按钮。
 * 与后端 ORDER_ACTIONS 保持一致，前端只做展示层可用性控制，最终仍以接口校验为准。
 */
export function escrowActionBar({ status, isBuyer = false, isSeller = false, requiresVerified = false, t } = {}) {
  const actions = []
  if (status === 'created') {
    if (isBuyer) {
      actions.push({
        action: 'fund',
        label: translate(t, 'escrow.fundAction', '立即支付托管金'),
        tone: 'primary',
        // 需要认证服务者但卖家未认证时，按钮保持可见但点击会被拦截并提示原因。
        blocked: requiresVerified,
        blockedText: translate(t, 'escrow.fundBlocked', '该信息要求认证服务者，对方尚未完成 V 认证，暂不能支付托管金')
      })
      actions.push({ action: 'cancel', label: translate(t, 'escrow.cancelTitle', '取消交易'), tone: 'ghost' })
    } else if (isSeller) {
      actions.push({ action: 'waiting_fund', label: translate(t, 'escrow.waitingFundAction', '等待买家支付'), tone: 'disabled', disabled: true })
    }
  } else if (status === 'funded') {
    if (isSeller) actions.push({ action: 'delivery', label: translate(t, 'escrow.deliverySubmit', '提交交付凭证'), tone: 'primary' })
    if (isBuyer) actions.push({ action: 'waiting_deliver', label: translate(t, 'escrow.waitingDeliverAction', '等待卖家交付'), tone: 'disabled', disabled: true })
    if (isBuyer) actions.push({ action: 'refund', label: translate(t, 'escrow.refundTitle', '申请退款'), tone: 'ghost' })
  } else if (status === 'delivered') {
    if (isBuyer) actions.push({ action: 'confirm', label: translate(t, 'escrow.confirmTitle', '确认验收并付款'), tone: 'primary' })
    if (isBuyer) actions.push({ action: 'refund', label: translate(t, 'escrow.refundTitle', '申请介入退款'), tone: 'ghost' })
    // 卖家随时可以催办；到达期望完成时间后页面会额外给出超时警告。
    if (isSeller) actions.push({ action: 'remind', label: translate(t, 'escrow.remindBuyer', '提醒验收'), tone: 'primary' })
  } else if (status === 'completed') {
    actions.push({ action: 'done', label: translate(t, 'escrow.doneTitle', '交易已完成'), tone: 'disabled', disabled: true })
  } else if (status === 'cancelled') {
    actions.push({ action: 'done', label: translate(t, 'escrow.cancelledTitle', '交易已取消'), tone: 'disabled', disabled: true })
  } else if (status === 'refunded') {
    actions.push({ action: 'done', label: translate(t, 'escrow.refundedTitle', '已退款'), tone: 'disabled', disabled: true })
  }
  return actions
}

/**
 * 超时判断：到达原设定的「期望完成时间」仍未验收时给出警告。
 * 只在卖家已交付、买家还没验收的阶段提示，否则刚发布就报超时会误导用户。
 */
export function overdueState({ status, deadlineAt, now = Date.now() } = {}) {
  if (status !== 'delivered') return { overdue: false, days: 0 }
  const target = Number(deadlineAt)
  // 没有设置期望完成时间就不判定超时。
  if (!Number.isFinite(target) || target <= 0) return { overdue: false, days: 0 }
  const diff = now - target
  if (diff <= 0) return { overdue: false, days: 0 }
  return { overdue: true, days: Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000))) }
}

/** 托管订单轨迹文案。deliver_update / remind 是订单页新增的动作。 */
export const ORDER_EVENT_TEXT = {
  create: '发起担保交易',
  fund: '买家付款到平台托管',
  deliver: '卖家已交付',
  deliver_update: '卖家补充了交付凭证',
  remind: '卖家提醒买家验收',
  confirm: '买家确认，资金结算给卖家',
  cancel: '交易取消',
  refund: '托管资金退回买家'
}

/** 轨迹文案键：与 demandHall 命名空间一一对应，便于页面按语言渲染。 */
const ORDER_EVENT_KEY = {
  create: 'detailEscrowEventCreate',
  fund: 'detailEscrowEventFund',
  deliver: 'detailEscrowEventDeliver',
  deliver_update: 'detailEscrowEventDeliver',
  remind: 'detailEscrowEventRemind',
  confirm: 'detailEscrowEventConfirm',
  cancel: 'detailEscrowEventCancel',
  refund: 'detailEscrowEventRefund'
}

export function orderEventText(event, t) {
  const key = typeof event === 'string' ? event : event?.event
  if (!key) return ''
  // 已登记的轨迹类型优先走语言系统，未登记的返回原始键名供页面兜底。
  return translate(t, `demandHall.${ORDER_EVENT_KEY[key]}`, ORDER_EVENT_TEXT[key] || key)
}

/** 交付凭证展示：区分图片与文档，图片走预览，文档走下载提示。 */
const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i

export function evidenceKind(url) {
  return IMAGE_EXTENSION.test(String(url || '')) ? 'image' : 'file'
}

export function evidenceName(item, index = 0, t) {
  if (item && typeof item === 'object' && item.name) return item.name
  const url = typeof item === 'string' ? item : item?.url || ''
  const clean = String(url).split('?')[0]
  const name = clean.slice(clean.lastIndexOf('/') + 1)
  if (name) return name
  // 没带文件名的凭证用序号兜底，文案同样走语言系统。
  const fallback = `交付凭证 ${index + 1}`
  if (typeof t !== 'function') return fallback
  const translated = t('escrow.evidenceFallbackName', { index: index + 1 })
  return typeof translated === 'string' && translated !== 'escrow.evidenceFallbackName' ? translated : fallback
}

export function evidenceUrl(item) {
  return typeof item === 'string' ? item : item?.url || ''
}

/* ============================ 空状态 ============================ */

/** 空状态文案：按 Tab 与子分类给出具体引导，避免所有空列表都长一样。 */
export function workspaceEmptyState({ tab = 'posts', kind = 'demand' } = {}) {
  if (tab === 'posts') {
    const definition = WORKSPACE_POST_KINDS.find(item => item.key === kind) || WORKSPACE_POST_KINDS[0]
    return {
      title: definition.emptyText,
      hint: kind === 'service' ? '把你的能力标价发出来，让别人主动找你' : '把需求说清楚，标注赏金和截止时间更容易被接单'
    }
  }
  if (tab === 'applies') {
    return { title: '还没有参与记录', hint: '在需求市场报名或下单后，进度会集中显示在这里' }
  }
  return { title: '还没有收藏', hint: '在信息流点击卡片上的星号，就能把内容收进这里慢慢看' }
}

/** 订单数量徽标文案，超过 99 收敛为 99+。 */
export function formatCountBadge(value) {
  const count = Number(value) || 0
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}
