import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
	VERIFIED_ACCOUNT_LEVEL,
	WORKSPACE_ROLE_BY_TAB,
	WORKSPACE_TABS,
	buildMyPostGroups,
	buildReputationSummary,
	escrowActionBar,
	escrowSteps,
	evidenceKind,
	evidenceName,
	evidenceUrl,
	formatAmount,
	formatCountBadge,
	isOrderClosed,
	isVerifiedAccount,
	myPostActions,
	myPostStatusMeta,
	orderEventText,
	overdueState,
	resolveMyPostStatus,
	workspaceEmptyState,
	workspaceTabDefinition
} from '../utils/demandHallWorkspace.js'

const read = relativePath => readFile(new URL(relativePath, import.meta.url), 'utf8')
const FIXED_NOW = Date.parse('2026-09-20T10:00:00+08:00')

/* ============ 工作台：Tab 与状态 ============ */

test('工作台是三级 Tab，接口角色与 Tab 一一对应', () => {
	assert.deepEqual(WORKSPACE_TABS.map(tab => tab.key), ['posts', 'applies', 'collections'])
	assert.equal(workspaceTabDefinition('applies').label, '我的参与')
	assert.equal(workspaceTabDefinition('unknown').key, 'posts', '未知 Tab 回退到我发布的')
	assert.deepEqual(WORKSPACE_ROLE_BY_TAB, { posts: 'published', applies: 'applied', collections: 'collected' })
})

test('resolveMyPostStatus 依据托管订单给出四态流转', () => {
	// 进行中的订单优先于结单状态
	assert.equal(resolveMyPostStatus({ status: 'active' }, { hasActiveOrder: true }), 'ongoing')
	assert.equal(resolveMyPostStatus({ status: 'active' }), 'recruiting')
	assert.equal(resolveMyPostStatus({ status: 'closed' }), 'closed')
	assert.equal(resolveMyPostStatus({ status: 'closed' }, { hasActiveOrder: true }), 'ongoing')
	assert.equal(resolveMyPostStatus({ status: 'closed', orders: [{ status: 'completed' }] }), 'completed')
	assert.equal(resolveMyPostStatus({ status: 'active', orders: [{ status: 'delivered' }] }), 'ongoing')
	// 终态订单不把帖子留在「进行中」
	assert.equal(resolveMyPostStatus({ status: 'active', orders: [{ status: 'cancelled' }] }), 'recruiting')
})

test('myPostStatusMeta 覆盖全部状态角标', () => {
	assert.equal(myPostStatusMeta({ status: 'active' }).text, '招募中')
	assert.equal(myPostStatusMeta({ status: 'active' }).tone, 'recruiting')
	assert.equal(myPostStatusMeta({ status: 'active' }, { hasActiveOrder: true }).text, '进行中')
	assert.equal(myPostStatusMeta({ status: 'closed', orders: [{ status: 'completed' }] }).text, '已完结')
	assert.equal(myPostStatusMeta({ status: 'closed' }).text, '已关闭')
})

test('buildMyPostGroups 把托管订单按帖子聚合', () => {
	const posts = [{ id: 11 }, { id: 12 }]
	const orders = [
		{ id: 1, postId: 11, status: 'created', createdAt: 100 },
		{ id: 2, postId: 11, status: 'funded', createdAt: 300 },
		{ id: 3, postId: 12, status: 'completed', createdAt: 200 },
		{ id: 4, postId: null, status: 'created' }
	]
	const groups = buildMyPostGroups(posts, orders)
	assert.equal(groups.length, 2)
	assert.deepEqual(groups[0].orders.map(order => order.id), [2, 1], '同一帖子的订单按创建时间倒序')
	assert.deepEqual(groups[1].orders.map(order => order.id), [3])
	// 缺少 postId 的订单不会串到别的帖子上
	assert.deepEqual(buildMyPostGroups(posts, [{ id: 9, status: 'created' }])[0].orders, [])
	assert.deepEqual(buildMyPostGroups(null, null), [])
})

test('myPostActions 提供修改 / 下架 / 查看报名者，结单后改为重新上架', () => {
	const active = myPostActions({ status: 'active' }, { orderCount: 3 })
	assert.deepEqual(active.map(item => item.action), ['edit', 'close', 'applications'])
	assert.equal(active[2].label, '查看报名者（3）')
	assert.equal(active[0].label, '修改')
	assert.equal(active[1].label, '下架')
	assert.deepEqual(myPostActions({ status: 'active' }, { orderCount: 0 })[2].label, '查看报名者')
	assert.deepEqual(myPostActions({ status: 'closed' }).map(item => item.action), ['edit', 'reopen', 'applications'])
})

/* ============ 工作台：信誉看板 ============ */

test('isVerifiedAccount 与后端一致：金级（等级 4）起算 V 认证', () => {
	assert.equal(VERIFIED_ACCOUNT_LEVEL, 4)
	assert.equal(isVerifiedAccount(4), true)
	assert.equal(isVerifiedAccount(6), true)
	assert.equal(isVerifiedAccount(3), false)
	assert.equal(isVerifiedAccount(undefined), false)
})

test('buildReputationSummary 只把已完结订单计入收支', () => {
	const summary = buildReputationSummary({
		userId: 5,
		accountLevel: 4,
		posts: [{ id: 11, status: 'active' }, { id: 12, status: 'closed' }],
		orders: [
			{ id: 1, amount: 200, status: 'completed', buyerUserId: 3, sellerUserId: 5 },
			{ id: 2, amount: 50, status: 'completed', buyerUserId: 5, sellerUserId: 9 },
			{ id: 3, amount: 999, status: 'funded', buyerUserId: 3, sellerUserId: 5 },
			{ id: 4, amount: 300, status: 'completed', buyerUserId: 7, sellerUserId: 9 }
		]
	})
	assert.equal(summary.earned, 200, '只有作为卖家的已完结订单计入收入')
	assert.equal(summary.spent, 50, '只有作为买家的已完结订单计入支出')
	assert.equal(summary.ongoingOrders, 1)
	assert.equal(summary.completedOrders, 3)
	assert.equal(summary.postCount, 2)
	assert.equal(summary.recruitingCount, 1)
	assert.equal(summary.closedCount, 1)
	assert.equal(summary.isVerified, true)
	assert.equal(summary.scoreCount, 3)
	assert.ok(summary.score >= 4.6 && summary.score <= 5)
})

test('buildReputationSummary 无完成单量时不虚构评分', () => {
	const summary = buildReputationSummary({ userId: 5, orders: [{ id: 1, amount: 100, status: 'funded', sellerUserId: 5 }] })
	assert.equal(summary.score, null)
	assert.equal(summary.scoreCount, 0)
	assert.equal(summary.earned, 0)
	assert.equal(formatAmount(0), '0')
})

test('formatAmount 与 formatCountBadge 处理小数与上限', () => {
	assert.equal(formatAmount(200), '200')
	assert.equal(formatAmount(199.5), '199.50')
	assert.equal(formatAmount('abc'), '0')
	assert.equal(formatCountBadge(0), '')
	assert.equal(formatCountBadge(7), '7')
	assert.equal(formatCountBadge(120), '99+')
})

/* ============ 订单页：进度条与按钮 ============ */

test('escrowSteps 把订单状态映射到四步进度', () => {
	const created = escrowSteps('created')
	assert.deepEqual(created.map(step => step.key), ['fund', 'deliver', 'accept', 'settle'])
	assert.equal(created[0].active, true)
	assert.equal(created[0].done, false)
	assert.equal(created[1].reached, false)

	const funded = escrowSteps('funded')
	assert.equal(funded[0].done, true)
	assert.equal(funded[1].active, true)

	const delivered = escrowSteps('delivered')
	assert.equal(delivered[1].done, true)
	assert.equal(delivered[2].active, true)

	const completed = escrowSteps('completed')
	assert.ok(completed.every(step => step.done), '完成后四步都标记为已走完')

	assert.equal(escrowSteps('unknown')[0].active, true, '未知状态回退到第一步')
})

test('isOrderClosed 区分终态与进行中状态', () => {
	assert.equal(isOrderClosed('completed'), true)
	assert.equal(isOrderClosed('cancelled'), true)
	assert.equal(isOrderClosed('refunded'), true)
	assert.equal(isOrderClosed('created'), false)
	assert.equal(isOrderClosed('funded'), false)
	assert.equal(isOrderClosed('delivered'), false)
})

test('escrowActionBar 待托管状态按身份给出不同按钮', () => {
	const buyer = escrowActionBar({ status: 'created', isBuyer: true })
	assert.deepEqual(buyer.map(item => item.action), ['fund', 'cancel'])
	assert.equal(buyer[0].label, '立即支付托管金')
	assert.equal(buyer[0].tone, 'primary')

	const seller = escrowActionBar({ status: 'created', isSeller: true })
	assert.deepEqual(seller.map(item => item.action), ['waiting_fund'])
	assert.equal(seller[0].label, '等待买家支付')
	assert.equal(seller[0].disabled, true)
})

test('escrowActionBar 待验收状态：卖家提醒验收，买家确认并付款', () => {
	const seller = escrowActionBar({ status: 'delivered', isSeller: true })
	assert.deepEqual(seller.map(item => item.action), ['remind'])
	assert.equal(seller[0].label, '提醒验收')
	assert.equal(seller[0].tone, 'primary')

	const buyer = escrowActionBar({ status: 'delivered', isBuyer: true })
	assert.deepEqual(buyer.map(item => item.action), ['confirm', 'refund'])
	assert.equal(buyer[0].label, '确认验收并付款')
	assert.equal(buyer[1].label, '申请介入退款')
})

test('escrowActionBar 在需要认证且卖家未认证时标记拦截原因', () => {
	const blocked = escrowActionBar({ status: 'created', isBuyer: true, requiresVerified: true })
	assert.equal(blocked[0].action, 'fund')
	assert.equal(blocked[0].blocked, true)
	assert.match(blocked[0].blockedText, /V 认证/)
	assert.equal(escrowActionBar({ status: 'created', isBuyer: true }).blocked, undefined)
})

test('escrowActionBar 覆盖托管中与终态', () => {
	const sellerFunded = escrowActionBar({ status: 'funded', isSeller: true })
	assert.deepEqual(sellerFunded.map(item => item.action), ['delivery'])
	const buyerFunded = escrowActionBar({ status: 'funded', isBuyer: true })
	assert.deepEqual(buyerFunded.map(item => item.action), ['waiting_deliver', 'refund'])
	assert.deepEqual(escrowActionBar({ status: 'completed', isBuyer: true }).map(item => item.action), ['done'])
	assert.deepEqual(escrowActionBar({ status: 'cancelled', isSeller: true }).map(item => item.action), ['done'])
	assert.deepEqual(escrowActionBar({ status: 'refunded', isBuyer: true }).map(item => item.action), ['done'])
})

/* ============ 订单页：超时与事件 ============ */

test('overdueState 只在已交付且超过期望完成时间时警告', () => {
	assert.equal(overdueState({ status: 'delivered', deadlineAt: FIXED_NOW - 2 * 86400000, now: FIXED_NOW }).overdue, true)
	assert.equal(overdueState({ status: 'delivered', deadlineAt: FIXED_NOW - 2 * 86400000, now: FIXED_NOW }).days, 2)
	assert.equal(overdueState({ status: 'delivered', deadlineAt: FIXED_NOW + 86400000, now: FIXED_NOW }).overdue, false)
	assert.equal(overdueState({ status: 'funded', deadlineAt: FIXED_NOW - 86400000, now: FIXED_NOW }).overdue, false)
	assert.equal(overdueState({ status: 'delivered', deadlineAt: null, now: FIXED_NOW }).overdue, false)
	assert.equal(overdueState({ status: 'delivered', deadlineAt: FIXED_NOW - 3600000, now: FIXED_NOW }).days, 1)
})

test('orderEventText 覆盖含新增动作的轨迹', () => {
	assert.equal(orderEventText('create'), '发起担保交易')
	assert.equal(orderEventText('deliver'), '卖家已交付')
	assert.equal(orderEventText('deliver_update'), '卖家补充了交付凭证')
	assert.equal(orderEventText('remind'), '卖家提醒买家验收')
	assert.equal(orderEventText({ event: 'confirm' }), '买家确认，资金结算给卖家')
	assert.equal(orderEventText('unknown_event'), 'unknown_event')
	assert.equal(orderEventText(null), '')
})

test('交付凭证区分图片与文档，并能取出文件名', () => {
	assert.equal(evidenceKind('https://img/a.png'), 'image')
	assert.equal(evidenceKind('https://img/a.JPEG?x=1'), 'image')
	assert.equal(evidenceKind('https://doc/a.pdf'), 'file')
	assert.equal(evidenceKind(''), 'file')
	assert.equal(evidenceUrl({ url: 'https://img/a.png', name: 'a.png' }), 'https://img/a.png')
	assert.equal(evidenceUrl('https://img/b.png'), 'https://img/b.png')
	assert.equal(evidenceName({ url: 'https://doc/a.pdf', name: '交付说明.pdf' }), '交付说明.pdf')
	assert.equal(evidenceName({ url: 'https://doc/report.pdf?token=1' }), 'report.pdf')
	assert.equal(evidenceName({}, 2), '交付凭证 3')
})

test('workspaceEmptyState 按 Tab 与子分类给出不同引导', () => {
	assert.equal(workspaceEmptyState({ tab: 'posts', kind: 'demand' }).title, '还没有发布过需求')
	assert.equal(workspaceEmptyState({ tab: 'posts', kind: 'service' }).title, '还没有发布过服务')
	assert.equal(workspaceEmptyState({ tab: 'applies' }).title, '还没有参与记录')
	assert.equal(workspaceEmptyState({ tab: 'collections' }).title, '还没有收藏')
	assert.equal(workspaceEmptyState({ tab: 'posts', kind: 'unknown' }).title, '还没有发布过需求')
})

/* ============ 页面与路由接线 ============ */

// 轻量标签配对检查：uni-app 的模板标签都必须成对或自闭合。
function assertBalancedTags(source, label) {
	const template = source.match(/<template>([\s\S]*)<\/template>/)[1]
	const stack = []
	const tagPattern = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
	let match
	while ((match = tagPattern.exec(template)) !== null) {
		const [, closing, name, , selfClosing] = match
		if (selfClosing) continue
		if (closing) {
			const opened = stack.pop()
			assert.equal(opened, name, `${label}: 标签 </${name}> 与 <${opened}> 不匹配`)
		} else {
			stack.push(name)
		}
	}
	assert.deepEqual(stack, [], `${label}: 存在未闭合的标签`)
}

test('pages.json 注册工作台与担保交易订单页', async () => {
	const raw = await read('../pages.json')
	const pages = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''))
	const paths = pages.pages.map(page => page.path)
	assert.ok(paths.includes('pages/demandhall/workspace'), '缺少个人工作台页面')
	assert.ok(paths.includes('pages/demandhall/orderDetail'), '缺少担保交易订单页')
	assert.equal(pages.pages.find(page => page.path === 'pages/demandhall/workspace').style.navigationBarTitleText, '我的工作台')
	assert.equal(pages.pages.find(page => page.path === 'pages/demandhall/orderDetail').style.navigationBarTitleText, '担保交易')
})

test('信息流顶部提供工作台入口', async () => {
	const source = await read('../pages/demandhall/index.vue')
	assertBalancedTags(source, 'index.vue')
	assert.ok(source.includes('workspace-entry'), '顶部导航缺少「我的」入口')
	assert.ok(source.includes('function goWorkspace'), '入口需要跳转函数')
	assert.match(source, /workspace\?tab=posts/, '入口应携带 Tab 参数')
	assert.ok(source.includes("from '@/utils/localeRuntime.js'"), '入口文案要接入语言系统')
})

test('工作台页面覆盖统计看板、三级 Tab、报名者面板与空状态', async () => {
	const source = await read('../pages/demandhall/workspace.vue')
	assertBalancedTags(source, 'workspace.vue')
	for (const keyword of ['class="board"', 'class="tab-bar"', 'class="kind-bar"', 'class="card-status"', 'class="fab"']) {
		assert.ok(source.includes(keyword), `工作台缺少 ${keyword}`)
	}
	// 报名者管理面板与选定动作
	assert.ok(source.includes('applicationsTitle'))
	for (const handler of ['openApplicants', 'selectApplicant', 'submitOrder', 'updatePostStatus', 'toggleCollect']) {
		assert.ok(source.includes(`function ${handler}`), `工作台缺少 ${handler}`)
	}
	assert.ok(source.includes('handleDemandHallApplicationApi'), '选定此人需要调用报名处理接口')
	assert.ok(source.includes('createDemandHallOrderApi'), '选定后要能发起担保交易')
	// 下拉刷新与触底加载与信息流一致
	assert.ok(source.includes('refresher-enabled') && source.includes('@scrolltolower') && source.includes('lower-threshold'))
	assert.ok(source.includes('emptyDiscover'), '空状态需要「去发现」引流')
	assert.ok(source.includes("from '@/utils/demandHallWorkspace.js'"))
	assert.ok(source.includes("from '@/utils/localeRuntime.js'"), '工作台文案要接入语言系统')
})

test('担保交易订单页覆盖进度条、快照、凭证与底部操作栏', async () => {
	const source = await read('../pages/demandhall/orderDetail.vue')
	assertBalancedTags(source, 'orderDetail.vue')
	for (const keyword of ['class="steps"', 'snapshot-card', 'delivery-section', 'action-bar', 'timeout-card']) {
		assert.ok(source.includes(keyword), `订单页缺少 ${keyword}`)
	}
	for (const handler of ['loadOrder', 'submitDelivery', 'runAction', 'chooseEvidence', 'showVerifiedGate', 'goSnapshot']) {
		assert.ok(source.includes(`function ${handler}`) || source.includes(`async function ${handler}`), `订单页缺少 ${handler}`)
	}
	assert.ok(source.includes('submitDemandHallOrderDeliveryApi'), '卖家需要能提交交付凭证')
	assert.ok(source.includes('getDemandHallOrderApi'), '订单页需要订单详情接口')
	assert.ok(source.includes('requiresVerifiedSeller'), '需要认证的订单要有支付前校验')
	assert.ok(source.includes("from '@/utils/demandHallWorkspace.js'"))
	assert.ok(source.includes("from '@/utils/localeRuntime.js'"), '订单页文案要接入语言系统')
	// 上传走 uni.uploadFile，不能误用 JSON 请求通道
	assert.ok(source.includes('uni.uploadFile'), '交付凭证上传需要 uni.uploadFile')
})

test('接口封装覆盖工作台与订单页需要的后端路由', async () => {
	const source = await read('../api/demandHall.js')
	for (const path of [
		'/api/demand-hall/mine', '/api/demand-hall/orders', '/api/demand-hall/orders/${id}',
		'/api/demand-hall/orders/${id}/status', '/api/demand-hall/orders/${id}/delivery'
	]) {
		assert.ok(source.includes(path), `缺少接口 ${path}`)
	}
	assert.ok(source.includes('submitDemandHallOrderDeliveryApi'), '缺少交付凭证接口封装')
})

test('工作台与订单页文案在六种语言里都补齐', async () => {
	const locale = await read('../utils/locale.js')
	assert.ok(locale.includes('demandWorkspaceMessages'), '缺少工作台文案命名空间')
	for (const key of [
		'tabPosts', 'tabApplies', 'tabCollections', 'selectApplicant', 'emptyDiscover',
		'statusRecruiting', 'statusOngoing', 'statusCompleted', 'statusClosed'
	]) {
		const occurrences = locale.split(`${key}:`).length - 1
		assert.ok(occurrences >= 6, `workspace.${key} 需要在 6 种语言里都补齐（当前 ${occurrences}）`)
	}
	for (const key of [
		'stepsFund', 'stepsDeliver', 'stepsAccept', 'stepsSettle', 'deliverySubmit',
		'remindBuyer', 'timeoutWarn', 'verifiedGateTitle', 'fundConfirmTitle'
	]) {
		const occurrences = locale.split(`${key}:`).length - 1
		assert.ok(occurrences >= 6, `escrow.${key} 需要在 6 种语言里都补齐（当前 ${occurrences}）`)
	}
})
