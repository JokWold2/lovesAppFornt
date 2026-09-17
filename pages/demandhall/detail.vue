<template>
	<view class="page app-h5-min-screen">
		<view class="state-box" v-if="loading">
			<uni-icons type="spinner-cycle" size="26" color="#ff8a4c"></uni-icons>
			<text>加载中...</text>
		</view>

		<view class="state-box" v-else-if="!post">
			<uni-icons type="info-filled" size="70" color="#e2e5ee"></uni-icons>
			<text>内容不存在或已下架</text>
			<view class="state-btn" @click="goBack">返回</view>
		</view>

		<template v-else>
			<view class="detail-card" :class="post.type === 'demand' ? 'is-demand' : 'is-service'">
				<view class="head-row">
					<view class="type-chip" :class="post.type">
						<text>{{ post.type === 'demand' ? '求助 / 找帮手' : '提供 / 找活儿' }}</text>
					</view>
					<view class="price-tag" :class="{ negotiable: post.isNegotiable }">
						<text class="price-emoji" v-if="post.type === 'demand'">💰</text>
						<text class="price-text">{{ formatPriceLabel(post) }}</text>
					</view>
				</view>

				<text class="detail-title">{{ post.title }}</text>

				<view class="badge-row">
					<text
						class="badge"
						v-for="badge in buildCardBadges(post, { max: 6 })"
						:key="badge.text"
						:class="`badge-${badge.tone}`"
					>{{ badge.tone === 'tag' ? '#' + badge.text : badge.text }}</text>
				</view>

				<view class="meta-grid">
					<view class="meta-cell">
						<text class="meta-value">{{ post.viewCount }}</text>
						<text class="meta-label">浏览</text>
					</view>
					<view class="meta-cell">
						<text class="meta-value">{{ post.applyCount }}</text>
						<text class="meta-label">{{ post.type === 'demand' ? '报名' : '接单' }}</text>
					</view>
					<view class="meta-cell">
						<text class="meta-value">{{ post.collectCount }}</text>
						<text class="meta-label">收藏</text>
					</view>
					<view class="meta-cell">
						<text class="meta-value">{{ post.category }}</text>
						<text class="meta-label">一级分类</text>
					</view>
				</view>

				<view class="meta-line" v-if="post.type === 'demand' && post.deadline">
					<uni-icons type="calendar" size="14" color="#f2542d"></uni-icons>
					<text :class="{ expired: post.deadline.expired }">{{ formatDeadlineText(post.deadline) }}</text>
				</view>
				<view class="meta-line">
					<uni-icons :type="post.locationType === 'offline' ? 'location' : 'cloud-upload'" size="14" color="#4f5bd5"></uni-icons>
					<text>{{ post.locationType === 'offline' ? `线下 · ${post.locationText || '区域待沟通'}` : '线上远程完成' }}</text>
				</view>
			</view>

			<view class="detail-card">
				<text class="section-title">详细说明</text>
				<text class="description">{{ post.description }}</text>
				<text class="publish-time">{{ formatRelativeTime(post.createdAt) }}发布 · 发布者 {{ post.author.name }}</text>
			</view>

			<!-- 发布者视角：报名列表 + 选定 + 发起担保交易 -->
			<view class="detail-card" v-if="isOwner">
				<view class="section-head">
					<text class="section-title">报名 / 接单记录</text>
					<text class="section-extra">{{ applications.length }} 条</text>
				</view>

				<view class="empty-inline" v-if="applications.length === 0">还没有人报名，可以把链接分享给合适的人。</view>

				<view class="application-item" v-for="item in applications" :key="item.id">
					<image class="app-avatar" :src="avatarOf(item.applicant)" mode="aspectFill"></image>
					<view class="app-body">
						<view class="app-head">
							<text class="app-name">{{ item.applicant.name }}</text>
							<text class="app-status" :class="item.status">{{ applicationStatusMeta(item.status)?.text }}</text>
						</view>
						<text class="app-message">{{ item.message }}</text>
						<view class="app-foot">
							<text class="app-quote">{{ item.quoteAmount != null ? `报价 ￥${item.quoteAmount}` : '按发布者价格' }}</text>
							<text class="app-time">{{ formatRelativeTime(item.createdAt) }}</text>
						</view>

						<view class="app-actions" v-if="item.status === 'pending'">
							<view class="mini-btn ghost" @click="handleApplication(item, 'reject')">不选他</view>
							<view class="mini-btn primary" @click="handleApplication(item, 'accept')">选定</view>
						</view>
						<view class="app-actions" v-else-if="item.status === 'accepted'">
							<view class="mini-btn primary" @click="openOrderSheet(item)">发起担保交易</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 担保交易状态 -->
			<view class="detail-card" v-if="order">
				<view class="section-head">
					<text class="section-title">担保交易</text>
					<text class="order-status" :class="orderStatusMeta(order.status).tone">{{ orderStatusMeta(order.status).text }}</text>
				</view>
				<view class="order-amount">
					<text class="amount-value">￥{{ order.amount }}</text>
					<text class="amount-role">{{ isBuyer ? '我是买家' : '我是卖家' }}</text>
				</view>
				<text class="order-hint">{{ orderStatusMeta(order.status).hint }}</text>

				<view class="timeline">
					<view class="timeline-item" v-for="event in order.events" :key="event.id">
						<view class="timeline-dot"></view>
						<view class="timeline-body">
							<text class="timeline-text">{{ orderEventText(event) }}</text>
							<text class="timeline-time">{{ formatRelativeTime(event.createdAt) }}</text>
						</view>
					</view>
				</view>

				<view class="order-actions" v-if="orderActions.length">
					<view
						class="action-btn"
						v-for="action in orderActions"
						:key="action.action"
						:class="action.tone"
						@click="runOrderAction(action)"
					>{{ action.label }}</view>
				</view>
			</view>

			<!-- 报名者视角：我的报名状态 -->
			<view class="detail-card" v-else-if="!isOwner && post.myApplicationStatus">
				<text class="section-title">我的报名</text>
				<text class="my-application">{{ applicationStatusMeta(post.myApplicationStatus)?.text }}</text>
				<text class="publish-time">{{ post.myApplicationStatus === 'accepted' ? '发布者已选定你，等待对方发起担保交易。' : '发布者处理后会收到通知。' }}</text>
			</view>

			<view class="bottom-spacer"></view>

			<!-- 底部操作栏 -->
			<view class="action-bar app-h5-fixed-bottom">
				<view class="bar-icon" @click="toggleCollect">
					<uni-icons :type="post.isCollected ? 'star-filled' : 'star'" size="22" :color="post.isCollected ? '#ff9f1c' : '#8a90a0'"></uni-icons>
					<text>{{ post.isCollected ? '已收藏' : '收藏' }}</text>
				</view>
				<view class="bar-icon" @click="contact">
					<uni-icons type="chat" size="22" color="#8a90a0"></uni-icons>
					<text>立即沟通</text>
				</view>

				<template v-if="isOwner">
					<view class="bar-btn ghost" @click="closePost" v-if="post.status === 'active'">标记结单</view>
					<view class="bar-btn danger" @click="removePost">删除</view>
				</template>
				<view v-else class="bar-btn primary" :class="{ done: !!post.hasApplied || post.status === 'closed' }" @click="openApply">
					{{ post.status === 'closed' ? '已结单' : (post.hasApplied ? '已报名' : (post.type === 'demand' ? '我要报名' : '我来接单')) }}
				</view>
			</view>

			<!-- 报名弹窗 -->
			<view class="sheet-mask app-h5-sheet-mask" v-if="showApplySheet" @click="showApplySheet = false">
				<view class="sheet app-h5-sheet" @click.stop>
					<view class="sheet-header">
						<text class="sheet-cancel" @click="showApplySheet = false">取消</text>
						<text class="sheet-title">{{ post.type === 'demand' ? '报名接单' : '下单预约' }}</text>
						<text class="sheet-submit" :class="{ disabled: applying }" @click="submitApply">{{ applying ? '提交中...' : '提交' }}</text>
					</view>
					<view class="sheet-body">
						<view class="form-block">
							<text class="form-label">说明<text class="required">*</text></text>
							<textarea class="form-textarea" v-model="applyMessage" maxlength="500" auto-height placeholder="说明你的经验、可交付时间或具体需求"></textarea>
							<text class="form-counter">{{ applyMessage.length }}/500</text>
						</view>
						<view class="form-block">
							<text class="form-label">报价 / 预算（可选）</text>
							<input class="form-input" v-model="applyQuote" type="digit" placeholder="留空表示按发布者价格" />
						</view>
						<view class="form-notice">
							<uni-icons type="info" size="14" color="#8a90a0"></uni-icons>
							<text>发布者选定后可发起担保交易：买家付款到平台托管 → 卖家交付 → 买家确认 → 资金结算。</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 发起担保交易弹窗 -->
			<view class="sheet-mask app-h5-sheet-mask" v-if="orderTarget" @click="orderTarget = null">
				<view class="sheet app-h5-sheet" @click.stop>
					<view class="sheet-header">
						<text class="sheet-cancel" @click="orderTarget = null">取消</text>
						<text class="sheet-title">发起担保交易</text>
						<text class="sheet-submit" :class="{ disabled: orderSubmitting }" @click="submitOrder">{{ orderSubmitting ? '提交中...' : '发起' }}</text>
					</view>
					<view class="sheet-body">
						<text class="order-target-name">交易对象：{{ orderTarget.applicant.name }}</text>
						<view class="form-block">
							<text class="form-label">托管金额<text class="required">*</text></text>
							<input class="form-input" v-model="orderAmount" type="digit" placeholder="请输入托管金额" />
							<text class="form-hint">默认取对方报价，没有报价时取帖子价格，可手动调整。</text>
						</view>
						<view class="form-block">
							<text class="form-label">备注（可选）</text>
							<input class="form-input" v-model="orderRemark" maxlength="255" placeholder="交付要求、时间节点等" />
						</view>
					</view>
				</view>
			</view>
		</template>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
	getDemandHallPostApi,
	getDemandHallApplicationsApi,
	handleDemandHallApplicationApi,
	createDemandHallApplicationApi,
	createDemandHallOrderApi,
	updateDemandHallOrderStatusApi,
	getDemandHallOrdersApi,
	closeDemandHallPostApi,
	deleteDemandHallPostApi,
	toggleDemandHallCollectApi
} from '@/api/demandHall.js'
import { createChatRequestApi, getChatRequestStatusApi } from '@/api/chat.js'
import {
	formatPriceLabel,
	formatDeadlineText,
	formatRelativeTime,
	buildCardBadges,
	applicationStatusMeta,
	orderStatusMeta,
	nextOrderActions,
	canApplyToPost
} from '@/utils/demandHallPresentation.js'

const postId = ref(null)
const post = ref(null)
const loading = ref(true)
const applications = ref([])
const order = ref(null)

const currentUserId = computed(() => Number(uni.getStorageSync('USER_INFO')?.id) || 0)
const isOwner = computed(() => !!post.value && Number(post.value.userId) === currentUserId.value)
const isBuyer = computed(() => !!order.value && Number(order.value.buyerUserId) === currentUserId.value)
const orderActions = computed(() => (order.value
	? nextOrderActions({ status: order.value.status, isBuyer: isBuyer.value, isSeller: !isBuyer.value })
	: []))

function avatarOf(user) {
	if (user?.avatar) return user.avatar
	return `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(user?.name || 'user')}`
}

async function loadDetail() {
	loading.value = true
	try {
		const data = await getDemandHallPostApi(postId.value)
		post.value = data?.post || null
		if (!post.value) return
		await Promise.all([isOwner.value ? loadApplications() : Promise.resolve(), loadOrder()])
	} catch (error) {
		post.value = null
	} finally {
		loading.value = false
	}
}

async function loadApplications() {
	try {
		const data = await getDemandHallApplicationsApi(postId.value)
		applications.value = Array.isArray(data?.applications) ? data.applications : []
	} catch (error) {
		applications.value = []
	}
}

/** 担保交易从“我的托管订单”里按帖子匹配，避免额外为详情页开接口。 */
async function loadOrder() {
	try {
		const data = await getDemandHallOrdersApi()
		const list = Array.isArray(data?.orders) ? data.orders : []
		order.value = list.find(item => Number(item.postId) === Number(postId.value)) || null
	} catch (error) {
		order.value = null
	}
}

const ORDER_EVENT_TEXT = {
	create: '发起托管交易',
	fund: '买家付款到平台托管',
	deliver: '卖家已交付',
	confirm: '买家确认，资金结算给卖家',
	cancel: '交易取消',
	refund: '托管资金退回买家'
}

function orderEventText(event) {
	return ORDER_EVENT_TEXT[event.event] || event.event
}

/* ============ 报名 ============ */
const showApplySheet = ref(false)
const applyMessage = ref('')
const applyQuote = ref('')
const applying = ref(false)

function openApply() {
	if (!post.value) return
	const blocked = canApplyToPost(post.value)
	if (blocked) {
		uni.showToast({ title: blocked, icon: 'none' })
		return
	}
	applyMessage.value = ''
	applyQuote.value = post.value.price != null ? String(post.value.price) : ''
	showApplySheet.value = true
}

async function submitApply() {
	if (applying.value) return
	if (!applyMessage.value.trim()) {
		uni.showToast({ title: '请填写说明', icon: 'none' })
		return
	}
	applying.value = true
	try {
		await createDemandHallApplicationApi(postId.value, {
			message: applyMessage.value.trim(),
			quoteAmount: applyQuote.value === '' ? null : applyQuote.value
		})
		post.value.hasApplied = true
		post.value.myApplicationStatus = 'pending'
		post.value.applyCount = Number(post.value.applyCount || 0) + 1
		showApplySheet.value = false
		uni.showToast({ title: '已提交，等待发布者处理', icon: 'success' })
	} catch (error) { /* 请求层已提示 */ } finally {
		applying.value = false
	}
}

/* ============ 发布者处理报名 ============ */
async function handleApplication(item, action) {
	try {
		await handleDemandHallApplicationApi(item.id, { action })
		uni.showToast({ title: action === 'accept' ? '已选定该接单方' : '已拒绝该报名', icon: 'success' })
		await loadDetail()
	} catch (error) { /* 请求层已提示 */ }
}

/* ============ 担保交易 ============ */
const orderTarget = ref(null)
const orderAmount = ref('')
const orderRemark = ref('')
const orderSubmitting = ref(false)

function openOrderSheet(application) {
	orderTarget.value = application
	orderAmount.value = application.quoteAmount != null ? String(application.quoteAmount) : (post.value?.price != null ? String(post.value.price) : '')
	orderRemark.value = ''
}

async function submitOrder() {
	if (orderSubmitting.value || !orderTarget.value) return
	const amount = Number(orderAmount.value)
	if (!Number.isFinite(amount) || amount <= 0) {
		uni.showToast({ title: '请填写有效的托管金额', icon: 'none' })
		return
	}
	orderSubmitting.value = true
	try {
		await createDemandHallOrderApi({
			postId: postId.value,
			counterpartyUserId: orderTarget.value.applicantUserId,
			amount,
			remark: orderRemark.value.trim()
		})
		orderTarget.value = null
		uni.showToast({ title: '托管交易已发起', icon: 'success' })
		await loadOrder()
	} catch (error) { /* 请求层已提示 */ } finally {
		orderSubmitting.value = false
	}
}

async function runOrderAction(action) {
	const confirmText = {
		fund: '确认已将款项付到平台托管？托管期间资金不会直接给卖家。',
		deliver: '确认已按约定完成交付？',
		confirm: '确认完成并同意把托管资金结算给卖家？',
		cancel: '确认取消这笔托管交易？',
		refund: '确认申请退款？'
	}[action.action]
	const confirmed = await new Promise(resolve => {
		uni.showModal({
			title: '担保交易',
			content: confirmText || '确认执行该操作？',
			success: ({ confirm }) => resolve(confirm),
			fail: () => resolve(false)
		})
	})
	if (!confirmed) return
	try {
		await updateDemandHallOrderStatusApi(order.value.id, { action: action.action })
		uni.showToast({ title: '操作成功', icon: 'success' })
		await loadOrder()
	} catch (error) { /* 请求层已提示 */ }
}

/* ============ 收藏 / 沟通 / 管理 ============ */
async function toggleCollect() {
	if (!post.value) return
	const previous = post.value.isCollected
	post.value.isCollected = !previous
	post.value.collectCount = Math.max(0, Number(post.value.collectCount || 0) + (post.value.isCollected ? 1 : -1))
	try {
		const result = await toggleDemandHallCollectApi(postId.value)
		post.value.isCollected = !!result?.isCollected
		post.value.collectCount = Number(result?.collectCount ?? post.value.collectCount)
	} catch (error) {
		post.value.isCollected = previous
	}
}

function buildContactMessage() {
	return `你好，我在需求市场看到「${post.value.title}」，想和你沟通一下。\n信息卡：pages/demandhall/detail?id=${post.value.id}`
}

/** 复用应用内 IM：已通过审核直接进聊天室，否则提交带卡片链接的私聊申请。 */
async function contact() {
	if (!post.value || isOwner.value) {
		uni.showToast({ title: '这是你发布的内容', icon: 'none' })
		return
	}
	try {
		const status = await getChatRequestStatusApi(post.value.userId)
		if (status?.status === 'approved' && status.groupId) {
			uni.navigateTo({ url: `/pages/chat/chatRoom?id=${status.groupId}` })
			return
		}
		if (status?.status === 'pending' || status?.status === 'processing') {
			uni.showToast({ title: '私聊申请审核中，请稍候', icon: 'none' })
			return
		}
		uni.showModal({
			title: '申请私聊',
			editable: true,
			content: buildContactMessage(),
			placeholderText: '说明来意，通过后即可聊天',
			confirmText: '发送申请',
			success: async ({ confirm, content }) => {
				if (!confirm) return
				try {
					await createChatRequestApi({ targetUserId: post.value.userId, message: (content || buildContactMessage()).slice(0, 500) })
					uni.showToast({ title: '申请已提交', icon: 'success' })
				} catch (error) { /* 请求层已提示 */ }
			}
		})
	} catch (error) { /* 请求层已提示 */ }
}

async function closePost() {
	try {
		await closeDemandHallPostApi(postId.value)
		post.value.status = 'closed'
		uni.showToast({ title: '已标记结单', icon: 'success' })
	} catch (error) { /* 请求层已提示 */ }
}

async function removePost() {
	const confirmed = await new Promise(resolve => {
		uni.showModal({ title: '删除确认', content: '删除后不可恢复，确认删除这条信息？', success: ({ confirm }) => resolve(confirm), fail: () => resolve(false) })
	})
	if (!confirmed) return
	try {
		await deleteDemandHallPostApi(postId.value)
		uni.showToast({ title: '已删除', icon: 'success' })
		setTimeout(() => uni.navigateBack(), 600)
	} catch (error) { /* 请求层已提示 */ }
}

function goBack() {
	uni.navigateBack()
}

onLoad(options => {
	postId.value = Number(options?.id) || null
	if (!postId.value) {
		loading.value = false
		return
	}
	void loadDetail()
})

onShow(() => {
	if (postId.value && !loading.value) void loadDetail()
})
</script>

<style scoped lang="scss">
.page {
	min-height: 100vh;
	padding: 20rpx 24rpx 0;
	background: #f5f6fa;
	box-sizing: border-box;
}

.state-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 18rpx;
	padding: 200rpx 0;
	color: #9aa0a6;
	font-size: 26rpx;
}

.state-btn {
	margin-top: 10rpx;
	padding: 14rpx 44rpx;
	border-radius: 30rpx;
	background: #fff1e8;
	color: #f2542d;
	font-size: 25rpx;
}

.detail-card {
	background: #fff;
	border-radius: 22rpx;
	padding: 28rpx 26rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 14rpx rgba(31, 41, 55, 0.06);

	&.is-demand {
		border-top: 8rpx solid #ff6b35;
	}

	&.is-service {
		border-top: 8rpx solid #2f7cf6;
	}
}

.head-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.type-chip {
	padding: 6rpx 18rpx;
	border-radius: 16rpx;
	font-size: 21rpx;
	font-weight: 600;

	&.demand {
		background: #fff1e8;
		color: #f2542d;
	}

	&.service {
		background: #eaf2ff;
		color: #2f7cf6;
	}
}

.price-tag {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 8rpx 20rpx;
	border-radius: 16rpx;
	background: linear-gradient(135deg, #fff2e8, #ffe3d3);
	color: #f2542d;

	&.negotiable {
		background: #f2f4f8;
		color: #6b7280;
	}
}

.price-emoji {
	font-size: 22rpx;
}

.price-text {
	font-size: 30rpx;
	font-weight: 700;
}

.detail-title {
	display: block;
	margin-top: 20rpx;
	font-size: 36rpx;
	font-weight: 700;
	color: #23262f;
	line-height: 1.42;
}

.badge-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 20rpx;
}

.badge {
	padding: 6rpx 16rpx;
	border-radius: 12rpx;
	font-size: 21rpx;
	background: #f2f4f8;
	color: #6b7280;
}

.badge-urgent {
	background: #ffe9e6;
	color: #e5484d;
	font-weight: 600;
}

.badge-online {
	background: #e9f7ef;
	color: #1f9d55;
}

.badge-location {
	background: #eef2ff;
	color: #4f5bd5;
}

.badge-verified {
	background: #eaf2ff;
	color: #2f7cf6;
}

.badge-tag {
	background: #f6f7fb;
	color: #8a90a0;
}

.badge-muted {
	background: #e8eaef;
	color: #5a6270;
	font-weight: 600;
}

.meta-grid {
	display: flex;
	margin-top: 26rpx;
	padding: 20rpx 0;
	border-top: 1px solid #f2f3f7;
	border-bottom: 1px solid #f2f3f7;
}

.meta-cell {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
}

.meta-value {
	font-size: 28rpx;
	font-weight: 700;
	color: #23262f;
}

.meta-label {
	font-size: 20rpx;
	color: #9aa0a6;
}

.meta-line {
	display: flex;
	align-items: center;
	gap: 10rpx;
	margin-top: 18rpx;
	font-size: 24rpx;
	color: #5a6270;

	.expired {
		color: #b8bdc9;
	}
}

.section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.section-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #23262f;
}

.section-extra {
	font-size: 22rpx;
	color: #9aa0a6;
}

.description {
	display: block;
	margin-top: 18rpx;
	font-size: 27rpx;
	color: #4b5563;
	line-height: 1.7;
	white-space: pre-wrap;
}

.publish-time {
	display: block;
	margin-top: 20rpx;
	font-size: 21rpx;
	color: #b8bdc9;
}

.empty-inline {
	padding: 30rpx 0;
	font-size: 24rpx;
	color: #9aa0a6;
}

.application-item {
	display: flex;
	gap: 18rpx;
	padding: 24rpx 0;
	border-bottom: 1px solid #f4f5f9;

	&:last-child {
		border-bottom: none;
	}
}

.app-avatar {
	width: 74rpx;
	height: 74rpx;
	border-radius: 50%;
	background: #eef0f6;
	flex-shrink: 0;
}

.app-body {
	flex: 1;
	min-width: 0;
}

.app-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.app-name {
	font-size: 26rpx;
	font-weight: 600;
	color: #23262f;
}

.app-status {
	font-size: 21rpx;
	color: #9aa0a6;

	&.accepted {
		color: #1f9d55;
		font-weight: 600;
	}

	&.pending {
		color: #f2542d;
	}
}

.app-message {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	color: #5a6270;
	line-height: 1.6;
}

.app-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 12rpx;
	font-size: 21rpx;
	color: #9aa0a6;
}

.app-quote {
	color: #f2542d;
}

.app-actions {
	display: flex;
	gap: 16rpx;
	margin-top: 16rpx;
}

.mini-btn {
	padding: 12rpx 30rpx;
	border-radius: 26rpx;
	font-size: 24rpx;

	&.ghost {
		background: #f5f6fa;
		color: #6b7280;
	}

	&.primary {
		background: linear-gradient(135deg, #ff8a4c, #f2542d);
		color: #fff;
		font-weight: 600;
	}
}

.order-status {
	font-size: 22rpx;
	padding: 4rpx 16rpx;
	border-radius: 14rpx;
	background: #f2f4f8;
	color: #6b7280;

	&.pending {
		background: #fff1e8;
		color: #f2542d;
	}

	&.active {
		background: #eaf2ff;
		color: #2f7cf6;
	}

	&.done {
		background: #e9f7ef;
		color: #1f9d55;
	}
}

.order-amount {
	display: flex;
	align-items: baseline;
	gap: 16rpx;
	margin-top: 20rpx;
}

.amount-value {
	font-size: 44rpx;
	font-weight: 700;
	color: #f2542d;
}

.amount-role {
	font-size: 22rpx;
	color: #9aa0a6;
}

.order-hint {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #8a90a0;
	line-height: 1.6;
}

.timeline {
	margin-top: 22rpx;
	padding-left: 6rpx;
}

.timeline-item {
	display: flex;
	gap: 16rpx;
	padding-bottom: 20rpx;
	position: relative;
}

.timeline-dot {
	width: 14rpx;
	height: 14rpx;
	margin-top: 10rpx;
	border-radius: 50%;
	background: #ffb08a;
	flex-shrink: 0;
}

.timeline-body {
	flex: 1;
}

.timeline-text {
	display: block;
	font-size: 24rpx;
	color: #4b5563;
}

.timeline-time {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #b8bdc9;
}

.order-actions {
	display: flex;
	gap: 16rpx;
	margin-top: 10rpx;
}

.action-btn {
	flex: 1;
	height: 76rpx;
	line-height: 76rpx;
	text-align: center;
	border-radius: 38rpx;
	font-size: 25rpx;

	&.primary {
		background: linear-gradient(135deg, #ff8a4c, #f2542d);
		color: #fff;
		font-weight: 600;
	}

	&.muted {
		background: #f5f6fa;
		color: #6b7280;
	}
}

.my-application {
	display: block;
	margin-top: 16rpx;
	font-size: 28rpx;
	font-weight: 600;
	color: #f2542d;
}

.bottom-spacer {
	height: 180rpx;
}

.action-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 90;
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 16rpx 24rpx;
	background: #fff;
	box-shadow: 0 -4rpx 16rpx rgba(31, 41, 55, 0.08);
}

.bar-icon {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	width: 110rpx;
	font-size: 20rpx;
	color: #8a90a0;
}

.bar-btn {
	flex: 1;
	height: 84rpx;
	line-height: 84rpx;
	text-align: center;
	border-radius: 42rpx;
	font-size: 27rpx;

	&.primary {
		background: linear-gradient(135deg, #ff8a4c, #f2542d);
		color: #fff;
		font-weight: 700;

		&.done {
			background: #eef0f6;
			color: #8a90a0;
		}
	}

	&.ghost {
		background: #f5f6fa;
		color: #5a6270;
	}

	&.danger {
		background: #ffe9e6;
		color: #e5484d;
	}
}

/* 抽屉 */
.sheet-mask {
	position: fixed;
	inset: 0;
	z-index: 200;
	display: flex;
	align-items: flex-end;
	background: rgba(0, 0, 0, 0.42);
}

.sheet {
	width: 100%;
	background: #fff;
	border-radius: 28rpx 28rpx 0 0;
}

.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 26rpx 28rpx;
	border-bottom: 1px solid #f2f3f7;
}

.sheet-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #23262f;
}

.sheet-cancel {
	font-size: 27rpx;
	color: #9aa0a6;
}

.sheet-submit {
	font-size: 27rpx;
	color: #f2542d;
	font-weight: 700;

	&.disabled {
		opacity: 0.5;
	}
}

.sheet-body {
	padding: 24rpx 28rpx 48rpx;
}

.order-target-name {
	display: block;
	margin-bottom: 20rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: #23262f;
}

.form-block {
	margin-bottom: 28rpx;
}

.form-label {
	display: block;
	margin-bottom: 14rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: #3b3f4a;
}

.required {
	margin-left: 6rpx;
	color: #e5484d;
}

.form-input {
	width: 100%;
	height: 80rpx;
	padding: 0 22rpx;
	border-radius: 16rpx;
	background: #f5f6fa;
	font-size: 26rpx;
	color: #23262f;
	box-sizing: border-box;
}

.form-textarea {
	width: 100%;
	min-height: 160rpx;
	padding: 20rpx 22rpx;
	border-radius: 16rpx;
	background: #f5f6fa;
	font-size: 26rpx;
	color: #23262f;
	line-height: 1.55;
	box-sizing: border-box;
}

.form-counter {
	display: block;
	margin-top: 8rpx;
	text-align: right;
	font-size: 21rpx;
	color: #b8bdc9;
}

.form-hint {
	display: block;
	margin-top: 12rpx;
	font-size: 21rpx;
	color: #9aa0a6;
}

.form-notice {
	display: flex;
	gap: 12rpx;
	padding: 20rpx;
	border-radius: 16rpx;
	background: #f7f8fc;
	font-size: 22rpx;
	color: #8a90a0;
	line-height: 1.6;
}
</style>
