import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
	DEMAND_HALL_TABS,
	formatPriceLabel,
	formatDeadlineText,
	isDeadlineExpired,
	formatRelativeTime,
	formatDistanceText,
	buildCardBadges,
	applicationStatusMeta,
	orderStatusMeta,
	buildListParams,
	nextOrderActions,
	buildPublishDefaults,
	validatePublishForm,
	postActionText,
	canApplyToPost,
	tabDefinition
} from '../utils/demandHallPresentation.js'

const read = relativePath => readFile(new URL(relativePath, import.meta.url), 'utf8')
const FIXED_NOW = Date.parse('2026-09-20T10:00:00+08:00')

/* ============ 纯展示逻辑 ============ */

test('需求市场是双 Tab：求助找帮手 / 提供找活儿', () => {
	assert.deepEqual(DEMAND_HALL_TABS.map(tab => tab.key), ['demand', 'service'])
	assert.equal(tabDefinition('service').shortLabel, '找活儿')
	assert.equal(tabDefinition('unknown').key, 'demand', '未知 Tab 回退到需求列表')
})

test('formatPriceLabel 输出赏金与报价文案', () => {
	assert.equal(formatPriceLabel({ priceLabel: '￥200' }), '￥200', '后端已给文案时直接复用')
	assert.equal(formatPriceLabel({ price: 200 }), '￥200')
	assert.equal(formatPriceLabel({ price: 50, priceUnit: 'hour' }), '￥50/小时')
	assert.equal(formatPriceLabel({ price: 100, priceUnit: 'day' }), '￥100/天')
	assert.equal(formatPriceLabel({ price: null, isNegotiable: true }), '议价')
	assert.equal(formatPriceLabel({}), '议价')
})

test('formatDeadlineText 与 isDeadlineExpired 处理截止时间', () => {
	assert.equal(formatDeadlineText({ label: '距离结束还有 2 天' }), '距离结束还有 2 天')
	assert.equal(formatDeadlineText(FIXED_NOW - 1000, FIXED_NOW), '已结束')
	assert.equal(formatDeadlineText(FIXED_NOW + 6 * 3600_000, FIXED_NOW), '今天截止')
	assert.equal(formatDeadlineText(FIXED_NOW + 3 * 24 * 3600_000, FIXED_NOW), '距离结束还有 3 天')
	assert.equal(formatDeadlineText(null, FIXED_NOW), '')
	assert.equal(isDeadlineExpired({ expired: true }), true)
	assert.equal(isDeadlineExpired(FIXED_NOW - 1, FIXED_NOW), true)
	assert.equal(isDeadlineExpired(FIXED_NOW + 1, FIXED_NOW), false)
	assert.equal(isDeadlineExpired(null, FIXED_NOW), false)
})

test('formatRelativeTime 与 formatDistanceText 生成辅助文案', () => {
	assert.equal(formatRelativeTime(FIXED_NOW - 30 * 1000, FIXED_NOW), '刚刚')
	assert.equal(formatRelativeTime(FIXED_NOW - 5 * 60 * 1000, FIXED_NOW), '5 分钟前')
	assert.equal(formatRelativeTime(FIXED_NOW - 3 * 3600_000, FIXED_NOW), '3 小时前')
	assert.equal(formatRelativeTime(FIXED_NOW - 2 * 24 * 3600_000, FIXED_NOW), '2 天前')
	assert.equal(formatRelativeTime(0, FIXED_NOW), '')
	assert.equal(formatDistanceText(0.42), '距离你 420m')
	assert.equal(formatDistanceText(3.24), '距离你 3.2km')
	assert.equal(formatDistanceText(null), '')
})

test('buildCardBadges 把任务属性转成标签组', () => {
	const badges = buildCardBadges({
		isUrgent: true, locationType: 'offline', locationText: '马尼拉 BGC', requireVerified: true, isNegotiable: true, tags: ['翻译']
	})
	assert.deepEqual(badges.map(badge => badge.text), ['急单', '马尼拉 BGC', '需认证', '可议价'])
	assert.deepEqual(badges.map(badge => badge.tone), ['urgent', 'location', 'verified', 'neutral'])

	const online = buildCardBadges({ locationType: 'online', tags: ['急单', '翻译'] })
	assert.equal(online[0].text, '线上完成')
	assert.equal(online[0].tone, 'online')
	assert.deepEqual(online.slice(1).map(badge => badge.tone), ['tag', 'tag'])
	// 与属性标签同名的自定义标签不会重复展示
	assert.deepEqual(buildCardBadges({ locationType: 'online', tags: ['线上完成'] }).map(badge => badge.text), ['线上完成'])
	assert.equal(buildCardBadges({ tags: ['a', 'b', 'c', 'd', 'e'] }, { max: 2 }).length, 2)
})

test('applicationStatusMeta 与 orderStatusMeta 覆盖全部状态', () => {
	assert.equal(applicationStatusMeta('pending').text, '已报名 · 待处理')
	assert.equal(applicationStatusMeta('accepted').text, '已选定')
	assert.equal(applicationStatusMeta('unknown'), null)
	assert.equal(orderStatusMeta('created').text, '待买家付款')
	assert.equal(orderStatusMeta('funded').tone, 'active')
	assert.equal(orderStatusMeta('delivered').text, '待买家确认')
	assert.equal(orderStatusMeta('completed').text, '已完成')
	assert.ok(orderStatusMeta('completed').hint.includes('结算'))
	assert.equal(orderStatusMeta('refunded').text, '已退款')
})

test('buildListParams 把筛选状态翻译成接口参数', () => {
	assert.deepEqual(buildListParams({ tab: 'demand', page: 2 }), { page: 2, pageSize: 10, sort: 'latest', type: 'demand' })
	const params = buildListParams({
		tab: 'service', category: '语言翻译', tag: '简历', keyword: ' 翻译 ', sort: 'budget', locationType: 'online', page: 1
	})
	assert.deepEqual(params, {
		page: 1, pageSize: 10, sort: 'budget', type: 'service', category: '语言翻译', tag: '简历', keyword: '翻译', locationType: 'online'
	})
	// 距离排序必须带坐标，否则后端会退回最新排序。
	const withCoords = buildListParams({ tab: 'demand', sort: 'distance', coords: { latitude: 14.6, longitude: 120.98 } })
	assert.equal(withCoords.latitude, 14.6)
	assert.equal(withCoords.longitude, 120.98)
	const withoutCoords = buildListParams({ tab: 'demand', sort: 'distance', coords: null })
	assert.equal(withoutCoords.latitude, undefined)
	// 全部 / 不限 之类的默认值不参与请求，避免无意义条件。
	assert.deepEqual(buildListParams({ tab: 'demand', category: '全部', locationType: 'all' }), { page: 1, pageSize: 10, sort: 'latest', type: 'demand' })
})

test('nextOrderActions 依据托管状态与买卖双方给出可用动作', () => {
	assert.deepEqual(nextOrderActions({ status: 'created', isBuyer: true }).map(item => item.action), ['fund', 'cancel'])
	assert.deepEqual(nextOrderActions({ status: 'created', isSeller: true }).map(item => item.action), ['cancel'])
	assert.deepEqual(nextOrderActions({ status: 'funded', isSeller: true }).map(item => item.action), ['deliver'])
	assert.deepEqual(nextOrderActions({ status: 'funded', isBuyer: true }).map(item => item.action), ['refund'])
	assert.deepEqual(nextOrderActions({ status: 'delivered', isBuyer: true }).map(item => item.action), ['confirm', 'refund'])
	assert.deepEqual(nextOrderActions({ status: 'completed', isBuyer: true }), [])
	assert.deepEqual(nextOrderActions({ status: 'cancelled', isSeller: true }), [])
})

test('postActionText 与 canApplyToPost 处理结单、自己发布与已报名', () => {
	assert.equal(postActionText({ isOwner: true }), '查看详情')
	assert.equal(postActionText({ status: 'closed' }), '已结单')
	assert.equal(postActionText({ hasApplied: true, myApplicationStatus: 'accepted' }), '已选定')
	assert.equal(postActionText({ hasApplied: true, myApplicationStatus: 'pending' }), '已报名')
	assert.equal(postActionText({ type: 'service' }), '我来接单')
	assert.equal(postActionText({ type: 'demand' }), '我要报名')

	assert.equal(canApplyToPost({ id: 1, type: 'demand' }), '')
	assert.equal(canApplyToPost({ id: 1, isOwner: true }), '这是你发布的内容')
	assert.equal(canApplyToPost({ id: 1, status: 'closed' }), '该信息已结单')
	assert.equal(canApplyToPost({ id: 1, deadline: { expired: true } }), '该需求已结束')
	assert.equal(canApplyToPost({ id: 1, hasApplied: true }), '你已经提交过报名')
	assert.equal(canApplyToPost(null), '内容不存在')
})

test('buildPublishDefaults 与 validatePublishForm 约束发布表单', () => {
	const demand = buildPublishDefaults('demand')
	assert.equal(demand.type, 'demand')
	assert.equal(demand.locationType, 'online')
	assert.equal(demand.priceUnit, 'total')
	assert.deepEqual(demand.categories, [])
	assert.equal(buildPublishDefaults('service').type, 'service')
	// 结单状态会作为第一个标签展示
	assert.equal(buildCardBadges({ status: 'closed', tags: ['急单'] })[0].text, '已结单')

	const base = { title: '求翻译', description: '中菲双语对照', categories: ['语言翻译'], locationType: 'online', price: '200', tags: [] }
	assert.equal(validatePublishForm(base), '')
	assert.match(validatePublishForm({ ...base, title: 'a' }), /标题/)
	assert.match(validatePublishForm({ ...base, description: '  ' }), /详细描述/)
	assert.match(validatePublishForm({ ...base, categories: [] }), /一级分类/)
	assert.match(validatePublishForm({ ...base, categories: ['语言翻译', '跑腿代办', '专业技能'] }), /最多选择 2 个/)
	assert.match(validatePublishForm({ ...base, locationType: 'offline', locationText: '' }), /线下服务请填写区域/)
	assert.match(validatePublishForm({ ...base, price: '-5' }), /金额无效/)
	assert.match(validatePublishForm({ ...base, tags: ['1', '2', '3', '4', '5', '6'] }), /最多 5 个/)
	assert.equal(validatePublishForm({ ...base, price: '' }), '', '议价时金额可以留空')
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

test('pages.json 注册需求市场主页面与详情页', async () => {
	const raw = await read('../pages.json')
	const pages = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''))
	const paths = pages.pages.map(page => page.path)
	assert.ok(paths.includes('pages/demandhall/index'), '缺少需求市场主页面')
	assert.ok(paths.includes('pages/demandhall/detail'), '缺少需求市场详情页')
	const home = pages.pages.find(page => page.path === 'pages/demandhall/index')
	assert.equal(home.style.navigationBarTitleText, '需求市场')
})

test('首页入口列表包含需求市场', async () => {
	const source = await read('../pages/index/index360.vue')
	assert.match(source, /name: '需求市场', page: "\/pages\/demandhall\/index"/)
})

test('主页面包含筛选栏、双 Tab、两类卡片与悬浮发布抽屉', async () => {
	const source = await read('../pages/demandhall/index.vue')
	assertBalancedTags(source, 'index.vue')
	for (const keyword of [
		'class="hero"', 'class="tab-bar"', 'class="search-box"', 'class="dropdown-row"',
		'class="filter-panel"', 'class="tag-strip"', 'class="fab"', 'class="entry-item demand"', 'class="entry-item service"'
	]) {
		assert.ok(source.includes(keyword), `主页面缺少 ${keyword}`)
	}
	// 需求卡与服务卡必须视觉区分
	assert.ok(source.includes('demand-card') && source.includes('service-card'))
	// 关键交互：报名、沟通、收藏、发布
	for (const handler of ['openApply', 'contact', 'toggleCollect', 'openPublishEntry', 'submitPublish', 'selectSort']) {
		assert.ok(source.includes(`function ${handler}`) || source.includes(`const ${handler}`), `主页面缺少 ${handler}`)
	}
	// 接口与展示逻辑都来自统一封装
	assert.ok(source.includes("from '@/api/demandHall.js'"))
	assert.ok(source.includes("from '@/utils/demandHallPresentation.js'"))
})

test('详情页覆盖报名、担保交易与 IM 沟通', async () => {
	const source = await read('../pages/demandhall/detail.vue')
	assertBalancedTags(source, 'detail.vue')
	for (const keyword of ['报名 / 接单记录', '担保交易', '发起担保交易', '立即沟通', '标记结单']) {
		assert.ok(source.includes(keyword), `详情页缺少「${keyword}」`)
	}
	for (const handler of ['handleApplication', 'submitApply', 'submitOrder', 'runOrderAction', 'contact']) {
		assert.ok(source.includes(`function ${handler}`) || source.includes(`async function ${handler}`), `详情页缺少 ${handler}`)
	}
	assert.ok(source.includes('createDemandHallOrderApi'), '详情页需要发起托管交易')
	assert.ok(source.includes('createChatRequestApi'), '详情页需要复用应用内 IM')
})

test('接口封装覆盖需求市场的全部后端路由', async () => {
	const source = await read('../api/demandHall.js')
	for (const path of [
		'/api/demand-hall/posts', '/api/demand-hall/tags/hot', '/api/demand-hall/stats', '/api/demand-hall/mine',
		'/api/demand-hall/applications/', '/api/demand-hall/orders'
	]) {
		assert.ok(source.includes(path), `缺少接口 ${path}`)
	}
})

test('互动消息能把需求市场通知跳回对应页面', async () => {
	const { interactionRoute } = await import('../utils/interactionNavigation.js')
	assert.equal(
		interactionRoute({ target_type: 'demand_hall_post', target_id: 11 }),
		'/pages/demandhall/detail?id=11'
	)
	assert.equal(interactionRoute({ target_type: 'demand_hall_order', target_id: 31 }), '/pages/demandhall/orderDetail?id=31')
	assert.equal(
		interactionRoute({ target_type: 'demand_hall_order', target_id: null }),
		'/pages/demandhall/workspace?tab=applies',
		'缺少订单号的旧通知退回工作台'
	)
	assert.equal(interactionRoute({ target_type: 'community_post', target_id: 2 }), '/pages/community/index')
	assert.equal(interactionRoute({ target_type: 'market_post' }), '', '缺少市场信息时仍返回空路由')
})

test('互动消息为需求市场通知提供独立文案', async () => {
	const inbox = await read('../pages/notice/interactionMessages.vue')
	assert.ok(inbox.includes('demand_hall_application'))
	assert.ok(inbox.includes('demandHallApplied') && inbox.includes('demandHallUpdated'))
	const locale = await read('../utils/locale.js')
	for (const key of ["demandHallApplied", "demandHallUpdated"]) {
		const occurrences = locale.split(`${key}:`).length - 1
		assert.equal(occurrences, 6, `${key} 需要在 6 种语言里都补齐`)
	}
})
