<template>
	<view class="page app-h5-min-screen">
		<view class="state-box" v-if="loading">
			<uni-icons type="spinner-cycle" size="26" color="var(--bless-primary, #C2A052)"></uni-icons>
			<text>{{ t('workspace.loading') }}</text>
		</view>

		<view class="state-box" v-else-if="loadError">
			<uni-icons type="info-filled" size="70" color="#e8e4da"></uni-icons>
			<text>{{ text.detailLoadFailed }}</text>
			<view class="state-btn" @click="loadDetail">{{ text.retry }}</view>
		</view>

		<view class="state-box" v-else-if="!post">
			<uni-icons type="info-filled" size="70" color="#e8e4da"></uni-icons>
			<text>{{ text.detailMissing }}</text>
			<view class="state-btn" @click="goBack">{{ text.detailBack }}</view>
		</view>

		<template v-else>
			<view class="detail-card" :class="post.type === 'demand' ? 'is-demand' : 'is-service'">
				<view class="head-row">
					<view class="type-chip" :class="post.type">
						<text>{{ post.type === 'demand' ? text.detailTypeDemand : text.detailTypeService }}</text>
					</view>
					<view class="price-tag" :class="{ negotiable: post.isNegotiable }">
						<text class="price-text">{{ formatPriceLabel(post, t) }}</text>
					</view>
				</view>

				<text class="detail-title">{{ post.title }}</text>

				<view class="badge-row">
					<text
						class="badge"
						v-for="badge in buildCardBadges(post, { max: 6, t })"
						:key="badge.text"
						:class="`badge-${badge.tone}`"
					>{{ badge.tone === 'tag' ? '#' + badge.text : badge.text }}</text>
				</view>

				<view class="meta-grid">
					<view class="meta-cell">
						<text class="meta-value">{{ post.viewCount }}</text>
						<text class="meta-label">{{ text.detailViews }}</text>
					</view>
					<view class="meta-cell">
						<text class="meta-value">{{ post.applyCount }}</text>
						<text class="meta-label">{{ post.type === 'demand' ? text.detailAppliesDemand : text.detailAppliesService }}</text>
					</view>
					<view class="meta-cell">
						<text class="meta-value">{{ post.collectCount }}</text>
						<text class="meta-label">{{ text.detailCollects }}</text>
					</view>
					<view class="meta-cell">
						<text class="meta-value">{{ categoryLabel(post.category, t) }}</text>
						<text class="meta-label">{{ text.detailCategory }}</text>
					</view>
				</view>

				<view class="meta-line" v-if="post.type === 'demand' && post.deadline">
					<uni-icons type="calendar" size="14" color="#a1791f"></uni-icons>
					<text :class="{ expired: post.deadline.expired }">{{ formatDeadlineText(post.deadline, Date.now(), t) }}</text>
				</view>
				<view class="meta-line">
					<uni-icons :type="post.locationType === 'offline' ? 'location' : 'cloud-upload'" size="14" color="#775E25"></uni-icons>
					<text>{{ post.locationType === 'offline' ? text.detailOffline(post.locationText || text.detailAreaPending) : text.detailOnline }}</text>
				</view>
			</view>

			<view class="detail-card">
				<text class="section-title">{{ text.detailDescriptionTitle }}</text>
				<text class="description">{{ post.description }}</text>
				<text class="publish-time">{{ text.detailPublishTime(formatRelativeTime(post.createdAt, Date.now(), t), post.author?.name) }}</text>
			</view>

			<!-- 发布者视角：报名列表 + 选定 + 发起担保交易 -->
			<view class="detail-card" v-if="isOwner">
				<view class="section-head">
					<text class="section-title">{{ text.detailApplicationsTitle }}</text>
					<text class="section-extra">{{ text.detailApplicationsCount(applications.length) }}</text>
				</view>

				<view class="empty-inline" v-if="applicationsError">
					<text>{{ text.detailApplicationsFailed }}</text>
					<view class="empty-retry" @click="loadApplications">{{ text.retry }}</view>
				</view>

				<view class="empty-inline" v-else-if="applications.length === 0">{{ text.detailApplicationsEmpty }}</view>

				<view class="application-item" v-for="item in applications" :key="item.id">
					<image class="app-avatar" :src="avatarOf(item.applicant)" mode="aspectFill"></image>
					<view class="app-body">
						<view class="app-head">
							<text class="app-name">{{ item.applicant?.name }}</text>
							<text class="app-status" :class="item.status">{{ applicationStatusMeta(item.status, t)?.text }}</text>
						</view>
						<text class="app-message">{{ item.message }}</text>
						<view class="app-foot">
							<text class="app-quote">{{ item.quoteAmount != null ? text.detailQuote(formatAmount(item.quoteAmount)) : text.detailQuoteDefault }}</text>
							<text class="app-time">{{ formatRelativeTime(item.createdAt, Date.now(), t) }}</text>
						</view>

						<view class="app-actions" v-if="item.status === 'pending'">
							<view class="mini-btn ghost" @click="handleApplication(item, 'reject')">{{ text.detailReject }}</view>
							<view class="mini-btn primary" @click="handleApplication(item, 'accept')">{{ text.detailSelect }}</view>
						</view>
						<view class="app-actions" v-else-if="item.status === 'accepted'">
							<view class="mini-btn primary" @click="openOrderSheet(item)">{{ text.detailEscrow }}</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 担保交易状态 -->
			<view class="detail-card" v-if="order">
				<view class="section-head">
					<text class="section-title">{{ text.detailEscrowTitle }}</text>
					<text class="order-status" :class="orderStatusMeta(order.status, t).tone">{{ orderStatusMeta(order.status, t).text }}</text>
				</view>
				<view class="order-amount">
					<text class="amount-value">￥{{ formatAmount(order.amount) }}</text>
					<text class="amount-role">{{ isBuyer ? text.detailBuyer : text.detailSeller }}</text>
				</view>
				<text class="order-hint">{{ orderStatusMeta(order.status, t).hint }}</text>

				<text class="timeline-empty" v-if="!orderEvents.length">{{ text.detailTimelineEmpty }}</text>
				<view class="timeline" v-else>
					<view class="timeline-item" v-for="event in orderEvents" :key="event.id">
						<view class="timeline-dot"></view>
						<view class="timeline-body">
							<text class="timeline-text">{{ orderEventText(event) }}</text>
							<text class="timeline-time">{{ formatRelativeTime(event.createdAt, Date.now(), t) }}</text>
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
					>{{ orderActionLabel(action) }}</view>
				</view>
			</view>

			<!-- 报名者视角：我的报名状态 -->
			<view class="detail-card" v-else-if="!isOwner && post.myApplicationStatus">
				<text class="section-title">{{ text.detailMyApplication }}</text>
				<text class="my-application">{{ applicationStatusMeta(post.myApplicationStatus, t)?.text }}</text>
				<text class="publish-time">{{ post.myApplicationStatus === 'accepted' ? text.detailAcceptedHint : text.detailPendingHint }}</text>
			</view>

			<view class="bottom-spacer"></view>

			<!-- 底部操作栏 -->
			<view class="action-bar app-h5-fixed-bottom" :class="{ 'is-owner': isOwner }">
				<view class="bar-icon" @click="toggleCollect">
					<uni-icons :type="post.isCollected ? 'star-filled' : 'star'" size="22" :color="post.isCollected ? '#775E25' : '#a49c8d'"></uni-icons>
					<text>{{ post.isCollected ? text.collected : text.collect }}</text>
				</view>
				<view class="bar-icon" @click="contact">
					<uni-icons type="chat" size="22" color="#a49c8d"></uni-icons>
					<text>{{ text.contact }}</text>
				</view>

				<template v-if="isOwner">
					<view class="bar-btn ghost" @click="editPost" v-if="post.status !== 'hidden'">{{ text.detailEditPost }}</view>
					<view class="bar-btn ghost" @click="closePost" v-if="post.status === 'active'">{{ text.detailClosePost }}</view>
					<view class="bar-btn ghost" @click="reopenPost" v-else-if="post.status === 'closed'">{{ text.detailReopenPost }}</view>
					<view class="bar-btn danger" @click="removePost">{{ text.detailDelete }}</view>
				</template>
				<view v-else class="bar-btn primary" :class="{ done: !!post.hasApplied || post.status === 'closed' }" @click="openApply">
					{{ post.status === 'closed' ? text.detailClosed : (post.hasApplied ? text.detailApplied : (post.type === 'demand' ? text.detailApplyDemand : text.detailApplyService)) }}
				</view>
			</view>

			<!-- 报名弹窗 -->
			<SlideUpPanel fixed :open="showApplySheet" :z-index="210" :label="post.type === 'demand' ? text.detailApplyTitleDemand : text.detailApplyTitleService" @dismiss="showApplySheet = false" @after-close="afterApplyClose">
				<view class="sheet">
					<view class="sheet-header">
						<text class="sheet-cancel" @click="showApplySheet = false">{{ text.cancel }}</text>
						<text class="sheet-title">{{ post.type === 'demand' ? text.detailApplyTitleDemand : text.detailApplyTitleService }}</text>
						<text class="sheet-submit" :class="{ disabled: applying }" @click="submitApply">{{ applying ? text.submitting : text.applySubmit }}</text>
					</view>
					<view class="sheet-body">
						<view class="form-block">
							<text class="form-label">{{ text.detailApplyLabel }}<text class="required">*</text></text>
							<textarea class="form-textarea" v-model="applyMessage" maxlength="500" auto-height :placeholder="text.detailApplyPlaceholder"></textarea>
							<text class="form-counter">{{ applyMessage.length }}/500</text>
						</view>
						<view class="form-block">
							<text class="form-label">{{ text.detailQuoteBudget }}</text>
							<input class="form-input" v-model="applyQuote" type="digit" :placeholder="text.detailQuotePlaceholder" />
						</view>
						<view class="form-notice">
							<uni-icons type="info" size="14" color="#a49c8d"></uni-icons>
							<text>{{ text.detailApplyNotice }}</text>
						</view>
					</view>
				</view>
			</SlideUpPanel>

			<!-- 发起担保交易弹窗 -->
			<SlideUpPanel fixed :open="!!orderTarget" :z-index="210" :label="text.detailEscrowCreate" @dismiss="closeOrderSheet" @after-close="afterOrderClose">
				<view class="sheet" v-if="orderTarget">
					<view class="sheet-header">
						<text class="sheet-cancel" @click="closeOrderSheet">{{ text.cancel }}</text>
						<text class="sheet-title">{{ text.detailEscrowCreate }}</text>
						<text class="sheet-submit" :class="{ disabled: orderSubmitting }" @click="submitOrder">{{ orderSubmitting ? text.submitting : text.detailEscrowSubmit }}</text>
					</view>
					<view class="sheet-body">
						<text class="order-target-name">{{ text.detailEscrowTarget(orderTarget.applicant.name) }}</text>
						<view class="form-block">
							<text class="form-label">{{ text.detailEscrowAmount }}<text class="required">*</text></text>
							<input class="form-input" v-model="orderAmount" type="digit" :placeholder="text.detailEscrowAmountPlaceholder" />
							<text class="form-hint">{{ text.detailEscrowAmountHint }}</text>
						</view>
						<view class="form-block">
							<text class="form-label">{{ text.detailEscrowRemark }}</text>
							<input class="form-input" v-model="orderRemark" maxlength="255" :placeholder="text.detailEscrowRemarkPlaceholder" />
						</view>
					</view>
				</view>
			</SlideUpPanel>
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
	reopenDemandHallPostApi,
	deleteDemandHallPostApi,
	toggleDemandHallCollectApi
} from '@/api/demandHall.js'
import { createChatRequestApi, getChatRequestStatusApi } from '@/api/chat.js'
import { t } from '@/utils/localeRuntime.js'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import {
	formatPriceLabel,
	formatDeadlineText,
	formatRelativeTime,
	buildCardBadges,
	categoryLabel,
	applicationStatusMeta,
	orderStatusMeta,
	nextOrderActions,
	canApplyToPost
} from '@/utils/demandHallPresentation.js'
import { formatAmount } from '@/utils/demandHallWorkspace.js'

const postId = ref(null)
const post = ref(null)
const loading = ref(true)
// 首屏失败与「内容不存在」必须区分开，否则服务端错误会被当成帖子被删。
const loadError = ref(false)
const applications = ref([])
const applicationsError = ref(false)
const order = ref(null)

/** 页面文案集中在这里，模板里只用 text.xxx，切换语言即时生效。 */
const text = computed(() => ({
	detailMissing: t('demandHall.detailMissing'),
	detailBack: t('demandHall.detailBack'),
	detailLoadFailed: t('demandHall.detailLoadFailed'),
	retry: t('demandHall.retry'),
	detailTypeDemand: t('demandHall.detailTypeDemand'),
	detailTypeService: t('demandHall.detailTypeService'),
	detailViews: t('demandHall.detailViews'),
	detailAppliesDemand: t('demandHall.detailAppliesDemand'),
	detailAppliesService: t('demandHall.detailAppliesService'),
	detailCollects: t('demandHall.detailCollects'),
	detailCategory: t('demandHall.detailCategory'),
	detailOnline: t('demandHall.detailOnline'),
	detailOffline: area => t('demandHall.detailOffline', { area }),
	detailAreaPending: t('demandHall.detailAreaPending'),
	detailDescriptionTitle: t('demandHall.detailDescriptionTitle'),
	detailPublishTime: (time, name) => t('demandHall.detailPublishTime', { time, name }),
	detailApplicationsTitle: t('demandHall.detailApplicationsTitle'),
	detailApplicationsCount: count => t('demandHall.detailApplicationsCount', { count }),
	detailApplicationsEmpty: t('demandHall.detailApplicationsEmpty'),
	detailApplicationsFailed: t('demandHall.detailApplicationsFailed'),
	detailTimelineEmpty: t('demandHall.detailTimelineEmpty'),
	detailQuote: amount => t('demandHall.detailQuote', { amount }),
	detailQuoteDefault: t('demandHall.detailQuoteDefault'),
	detailReject: t('demandHall.detailReject'),
	detailSelect: t('demandHall.detailSelect'),
	detailEscrow: t('demandHall.detailEscrow'),
	detailEscrowTitle: t('demandHall.detailEscrowTitle'),
	detailBuyer: t('demandHall.detailBuyer'),
	detailSeller: t('demandHall.detailSeller'),
	detailMyApplication: t('demandHall.detailMyApplication'),
	detailAcceptedHint: t('demandHall.detailAcceptedHint'),
	detailPendingHint: t('demandHall.detailPendingHint'),
	detailClosePost: t('demandHall.detailClosePost'),
	detailEditPost: t('demandHall.detailEditPost'),
	detailReopenPost: t('demandHall.detailReopenPost'),
	detailReopenDone: t('demandHall.detailReopenDone'),
	detailDelete: t('demandHall.detailDelete'),
	detailClosed: t('demandHall.detailClosed'),
	detailApplyDemand: t('demandHall.detailApplyDemand'),
	detailApplyService: t('demandHall.detailApplyService'),
	detailApplied: t('demandHall.detailApplied'),
	detailApplyTitleDemand: t('demandHall.detailApplyTitleDemand'),
	detailApplyTitleService: t('demandHall.detailApplyTitleService'),
	detailApplyLabel: t('demandHall.detailApplyLabel'),
	detailApplyPlaceholder: t('demandHall.detailApplyPlaceholder'),
	detailQuoteBudget: t('demandHall.detailQuoteBudget'),
	detailQuotePlaceholder: t('demandHall.detailQuotePlaceholder'),
	detailApplyNotice: t('demandHall.detailApplyNotice'),
	detailApplySubmitted: t('demandHall.detailApplySubmitted'),
	detailEscrowCreate: t('demandHall.detailEscrowCreate'),
	detailEscrowTarget: name => t('demandHall.detailEscrowTarget', { name }),
	detailEscrowAmount: t('demandHall.detailEscrowAmount'),
	detailEscrowAmountPlaceholder: t('demandHall.detailEscrowAmountPlaceholder'),
	detailEscrowAmountHint: t('demandHall.detailEscrowAmountHint'),
	detailEscrowRemark: t('demandHall.detailEscrowRemark'),
	detailEscrowRemarkPlaceholder: t('demandHall.detailEscrowRemarkPlaceholder'),
	detailEscrowAmountInvalid: t('demandHall.detailEscrowAmountInvalid'),
	detailEscrowCreated: t('demandHall.detailEscrowCreated'),
	detailEscrowSubmit: t('demandHall.detailEscrowSubmit'),
	detailSelected: t('demandHall.detailSelected'),
	detailRejected: t('demandHall.detailRejected'),
	detailActionDone: t('demandHall.detailActionDone'),
	detailClosedDone: t('demandHall.detailClosedDone'),
	detailDeleteTitle: t('demandHall.detailDeleteTitle'),
	detailDeleteContent: t('demandHall.detailDeleteContent'),
	detailDeleted: t('demandHall.detailDeleted'),
	detailEscrowConfirmTitle: t('demandHall.detailEscrowConfirmTitle'),
	detailEscrowConfirmFallback: t('demandHall.detailEscrowConfirmFallback'),
	detailEscrowEventCreate: t('demandHall.detailEscrowEventCreate'),
	detailEscrowEventFund: t('demandHall.detailEscrowEventFund'),
	detailEscrowEventDeliver: t('demandHall.detailEscrowEventDeliver'),
	detailEscrowEventConfirm: t('demandHall.detailEscrowEventConfirm'),
	detailEscrowEventCancel: t('demandHall.detailEscrowEventCancel'),
	detailEscrowEventRefund: t('demandHall.detailEscrowEventRefund'),
	contactSelf: t('demandHall.contactSelf'),
	contactPending: t('demandHall.contactPending'),
	contactTitle: t('demandHall.contactTitle'),
	contactPlaceholder: t('demandHall.contactPlaceholder'),
	contactSend: t('demandHall.contactSend'),
	contactSent: t('demandHall.contactSent'),
	cancel: t('demandHall.cancel'),
	submitting: t('demandHall.submitting'),
	applySubmit: t('demandHall.applySubmit'),
	applyMessageRequired: t('demandHall.applyMessageRequired'),
	collect: t('demandHall.collect'),
	collected: t('demandHall.collected'),
	contact: t('demandHall.contact')
}))

const currentUserId = computed(() => Number(uni.getStorageSync('USER_INFO')?.id) || 0)
const isOwner = computed(() => !!post.value && Number(post.value.userId) === currentUserId.value)
const isBuyer = computed(() => !!order.value && Number(order.value.buyerUserId) === currentUserId.value)
const orderEvents = computed(() => (Array.isArray(order.value?.events) ? order.value.events : []))
const orderActions = computed(() => (order.value
	? nextOrderActions({ status: order.value.status, isBuyer: isBuyer.value, isSeller: !isBuyer.value })
	: []))

/** 托管动作文案：逻辑层只给文案键，这里统一按当前语言渲染。 */
function orderActionLabel(action) {
	const translated = action?.labelKey ? t(action.labelKey) : ''
	return translated && translated !== action.labelKey ? translated : (action?.label || '')
}

function avatarOf(user) {
	if (user?.avatar) return user.avatar
	return `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(user?.name || 'user')}`
}

async function loadDetail() {
	loading.value = true
	loadError.value = false
	try {
		const data = await getDemandHallPostApi(postId.value)
		post.value = data?.post || null
		if (!post.value) return
		await Promise.all([isOwner.value ? loadApplications() : Promise.resolve(), loadOrder()])
	} catch (error) {
		// 404 = 内容确实不存在；其它错误（网络 / 5xx）要能重试，不能被当成已被删除。
		post.value = null
		loadError.value = Number(error?.statusCode) !== 404
	} finally {
		loading.value = false
	}
}

async function loadApplications() {
	try {
		const data = await getDemandHallApplicationsApi(postId.value)
		applications.value = Array.isArray(data?.applications) ? data.applications : []
		applicationsError.value = false
	} catch (error) {
		applications.value = []
		applicationsError.value = true
	}
}

/** 担保交易从“我的托管订单”里按帖子匹配，避免额外为详情页开接口。 */
async function loadOrder() {
	try {
		const data = await getDemandHallOrdersApi({ postId: postId.value, pageSize: 50 })
		const list = Array.isArray(data?.orders) ? data.orders : []
		order.value = list.find(item => Number(item.postId) === Number(postId.value)) || null
	} catch (error) {
		order.value = null
	}
}

const ORDER_EVENT_KEYS = {
	create: 'detailEscrowEventCreate',
	fund: 'detailEscrowEventFund',
	deliver: 'detailEscrowEventDeliver',
	deliver_update: 'detailEscrowEventDeliverUpdate',
	remind: 'detailEscrowEventRemind',
	confirm: 'detailEscrowEventConfirm',
	cancel: 'detailEscrowEventCancel',
	refund: 'detailEscrowEventRefund'
}

function orderEventText(event) {
	const key = typeof event === 'string' ? event : event?.event
	// 未登记的轨迹类型统一显示成「操作成功」，不把内部事件码透给用户。
	return ORDER_EVENT_KEYS[key] ? text.value[ORDER_EVENT_KEYS[key]] : text.value.detailActionDone
}

/* ============ 报名 ============ */
const showApplySheet = ref(false)
const applyMessage = ref('')
const applyQuote = ref('')
const applying = ref(false)

function openApply() {
	if (!post.value) return
	const blocked = canApplyToPost(post.value, t)
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
		uni.showToast({ title: text.value.applyMessageRequired, icon: 'none' })
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
		uni.showToast({ title: text.value.detailApplySubmitted, icon: 'success' })
	} catch (error) { /* 请求层已提示 */ } finally {
		applying.value = false
	}
}

function afterApplyClose() {
	applyMessage.value = ''
	applyQuote.value = ''
}

/* ============ 发布者处理报名 ============ */
async function handleApplication(item, action) {
	try {
		await handleDemandHallApplicationApi(item.id, { action })
		uni.showToast({ title: action === 'accept' ? text.value.detailSelected : text.value.detailRejected, icon: 'success' })
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

function closeOrderSheet() {
	orderTarget.value = null
}

function afterOrderClose() {
	orderAmount.value = ''
	orderRemark.value = ''
	orderSubmitting.value = false
}

async function submitOrder() {
	if (orderSubmitting.value || !orderTarget.value) return
	const amount = Number(orderAmount.value)
	if (!Number.isFinite(amount) || amount <= 0) {
		uni.showToast({ title: text.value.detailEscrowAmountInvalid, icon: 'none' })
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
		uni.showToast({ title: text.value.detailEscrowCreated, icon: 'success' })
		await loadOrder()
	} catch (error) { /* 请求层已提示 */ } finally {
		orderSubmitting.value = false
	}
}

async function runOrderAction(action) {
	const confirmText = {
		fund: t('demandHall.detailEscrowConfirmFund'),
		deliver: t('demandHall.detailEscrowConfirmDeliver'),
		confirm: t('demandHall.detailEscrowConfirmConfirm'),
		cancel: t('demandHall.detailEscrowConfirmCancel'),
		refund: t('demandHall.detailEscrowConfirmRefund')
	}[action.action]
	const confirmed = await new Promise(resolve => {
		uni.showModal({
			title: text.value.detailEscrowConfirmTitle,
			content: confirmText || text.value.detailEscrowConfirmFallback,
			success: ({ confirm }) => resolve(confirm),
			fail: () => resolve(false)
		})
	})
	if (!confirmed) return
	try {
		await updateDemandHallOrderStatusApi(order.value.id, { action: action.action })
		uni.showToast({ title: text.value.detailActionDone, icon: 'success' })
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
	return `${t('demandHall.contactCardPrefix', { title: post.value.title })}\npages/demandhall/detail?id=${post.value.id}`
}

/** 复用应用内 IM：已通过审核直接进聊天室，否则提交带卡片链接的私聊申请。 */
async function contact() {
	if (!post.value || isOwner.value) {
		uni.showToast({ title: text.value.contactSelf, icon: 'none' })
		return
	}
	try {
		const status = await getChatRequestStatusApi(post.value.userId)
		if (status?.status === 'approved' && status.groupId) {
			uni.navigateTo({ url: `/pages/chat/chatRoom?id=${status.groupId}` })
			return
		}
		if (status?.status === 'pending' || status?.status === 'processing') {
			uni.showToast({ title: text.value.contactPending, icon: 'none' })
			return
		}
		uni.showModal({
			title: text.value.contactTitle,
			editable: true,
			content: buildContactMessage(),
			placeholderText: text.value.contactPlaceholder,
			confirmText: text.value.contactSend,
			success: async ({ confirm, content }) => {
				if (!confirm) return
				try {
					await createChatRequestApi({ targetUserId: post.value.userId, message: (content || buildContactMessage()).slice(0, 500) })
					uni.showToast({ title: text.value.contactSent, icon: 'success' })
				} catch (error) { /* 请求层已提示 */ }
			}
		})
	} catch (error) { /* 请求层已提示 */ }
}

async function closePost() {
	try {
		await closeDemandHallPostApi(postId.value)
		post.value.status = 'closed'
		uni.showToast({ title: text.value.detailClosedDone, icon: 'success' })
		// 结单会把其余待处理报名一并结清，重新拉一次让报名列表与角标同步。
		await Promise.all([loadApplications(), loadOrder()])
	} catch (error) { /* 请求层已提示 */ }
}

async function reopenPost() {
	try {
		const result = await reopenDemandHallPostApi(postId.value)
		post.value.status = result?.post?.status || 'active'
		uni.showToast({ title: text.value.detailReopenDone, icon: 'success' })
	} catch (error) { /* 请求层已提示 */ }
}

/** 修改复用信息流页的发布抽屉，带上 editId 过去即可回填。 */
function editPost() {
	if (!post.value?.id) return
	uni.navigateTo({ url: `/pages/demandhall/index?editId=${post.value.id}` })
}

async function removePost() {
	const confirmed = await new Promise(resolve => {
		uni.showModal({ title: text.value.detailDeleteTitle, content: text.value.detailDeleteContent, success: ({ confirm }) => resolve(confirm), fail: () => resolve(false) })
	})
	if (!confirmed) return
	try {
		await deleteDemandHallPostApi(postId.value)
		uni.showToast({ title: text.value.detailDeleted, icon: 'success' })
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
// 与首页 index360 统一的品牌色板
$brand-yellow: var(--bless-primary, #C2A052);
$brand-soft: var(--bless-soft, #F1E4BD);
$brand-ink: var(--bless-text, #775E25);
$bg-color: #f6f5f2;
$surface: #ffffff;
$text-main: #292825;
$text-sub: #8b8984;
$text-muted: #a49c8d;
$gray-bg: #f4f3f1;
$line-color: #f0eeea;

.page {
	min-height: 100vh;
	padding: 20rpx 24rpx 0;
	background: $bg-color;
	box-sizing: border-box;
}

.state-box {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 18rpx;
	padding: 200rpx 0;
	color: $text-sub;
	font-size: 26rpx;
}

.state-btn {
	margin-top: 10rpx;
	padding: 14rpx 44rpx;
	border-radius: 30rpx;
	background: $brand-soft;
	color: $brand-ink;
	font-size: 25rpx;
}

.detail-card {
	background: $surface;
	border-radius: 24rpx;
	padding: 28rpx 26rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(45, 42, 34, .04);

	&.is-demand {
		border-top: 8rpx solid $brand-yellow;
	}

	&.is-service {
		border-top: 8rpx solid $brand-soft;
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
	background: $brand-soft;
	color: $brand-ink;

	&.service {
		background: $gray-bg;
		color: #655d51;
	}
}

.price-tag {
	display: flex;
	align-items: center;
	gap: 6rpx;
	flex-shrink: 0;
	max-width: 50%;
	padding: 8rpx 20rpx;
	border-radius: 16rpx;
	background: $brand-soft;
	color: $brand-ink;

	&.negotiable {
		background: $gray-bg;
		color: $text-sub;
	}
}

.price-text {
	font-size: 30rpx;
	font-weight: 650;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.detail-title {
	display: block;
	margin-top: 20rpx;
	font-size: 36rpx;
	font-weight: 650;
	color: $text-main;
	line-height: 1.42;
	overflow-wrap: anywhere;
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
	background: $gray-bg;
	color: #655d51;
	max-width: 100%;
	overflow-wrap: anywhere;
}

.badge-urgent {
	background: #ffe9e6;
	color: #e5484d;
	font-weight: 600;
}

.badge-online {
	background: $brand-soft;
	color: $brand-ink;
}

.badge-location {
	background: $gray-bg;
	color: #655d51;
}

.badge-verified {
	background: rgba(194, 160, 82, .22);
	color: $brand-ink;
}

.badge-tag {
	background: $gray-bg;
	color: $text-sub;
}

.badge-neutral {
	background: $gray-bg;
	color: #655d51;
}

.badge-muted {
	background: #ecebe7;
	color: #6f6a63;
	font-weight: 600;
}

.meta-grid {
	display: flex;
	margin-top: 26rpx;
	padding: 20rpx 0;
	border-top: 1rpx solid $line-color;
	border-bottom: 1rpx solid $line-color;
}

.meta-cell {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
}

.meta-value {
	font-size: 28rpx;
	font-weight: 650;
	color: $text-main;
	max-width: 100%;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.meta-label {
	font-size: 20rpx;
	color: $text-muted;
}

.meta-line {
	display: flex;
	align-items: center;
	gap: 10rpx;
	margin-top: 18rpx;
	font-size: 24rpx;
	color: #6f6a63;

	.expired {
		color: $text-muted;
	}
}

.section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.section-title {
	font-size: 28rpx;
	font-weight: 650;
	color: $text-main;
}

.section-extra {
	font-size: 22rpx;
	color: $text-muted;
}

.description {
	display: block;
	margin-top: 18rpx;
	font-size: 27rpx;
	color: #4b4741;
	line-height: 1.7;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.publish-time {
	display: block;
	margin-top: 20rpx;
	font-size: 21rpx;
	color: $text-muted;
}

.empty-inline {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	padding: 30rpx 0;
	font-size: 24rpx;
	color: $text-sub;
}

/* 报名列表加载失败时的重试按钮 */
.empty-retry {
	flex-shrink: 0;
	padding: 10rpx 28rpx;
	border-radius: 28rpx;
	background: $brand-soft;
	color: $brand-ink;
	font-size: 23rpx;
	font-weight: 600;
}

.timeline-empty {
	display: block;
	margin-top: 18rpx;
	font-size: 23rpx;
	color: $text-muted;
}

.application-item {
	display: flex;
	gap: 18rpx;
	padding: 24rpx 0;
	border-bottom: 1rpx solid $line-color;

	&:last-child {
		border-bottom: none;
	}
}

.app-avatar {
	width: 74rpx;
	height: 74rpx;
	border-radius: 50%;
	background: #ece9e2;
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
	gap: 12rpx;
}

.app-name {
	font-size: 26rpx;
	font-weight: 600;
	color: $text-main;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.app-status {
	flex-shrink: 0;
	font-size: 21rpx;
	color: $text-sub;

	&.accepted {
		color: $brand-ink;
		font-weight: 600;
	}

	&.pending {
		color: #a1791f;
	}
}

.app-message {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	color: #6f6a63;
	line-height: 1.6;
	overflow-wrap: anywhere;
}

.app-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
	margin-top: 12rpx;
	font-size: 21rpx;
	color: $text-muted;
}

.app-quote {
	color: $brand-ink;
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
	transition: transform 140ms cubic-bezier(.23, 1, .32, 1), background-color 140ms ease-out;

	&:active {
		transform: scale(.96);
	}

	&.ghost {
		background: $gray-bg;
		color: #655d51;
	}

	&.primary {
		background: $brand-yellow;
		color: $brand-ink;
		font-weight: 600;
	}
}

.order-status {
	font-size: 22rpx;
	padding: 4rpx 16rpx;
	border-radius: 14rpx;
	background: $gray-bg;
	color: #655d51;

	&.pending {
		background: $brand-soft;
		color: $brand-ink;
	}

	&.active {
		background: $brand-soft;
		color: $brand-ink;
	}

	&.done {
		background: #ecebe7;
		color: #6f6a63;
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
	font-weight: 650;
	color: $brand-ink;
}

.amount-role {
	font-size: 22rpx;
	color: $text-muted;
}

.order-hint {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: $text-sub;
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
	background: $brand-yellow;
	flex-shrink: 0;
}

.timeline-body {
	flex: 1;
	min-width: 0;
}

.timeline-text {
	display: block;
	font-size: 24rpx;
	color: #4b4741;
	overflow-wrap: anywhere;
}

.timeline-time {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: $text-muted;
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
	transition: transform 140ms cubic-bezier(.23, 1, .32, 1), background-color 140ms ease-out;

	&:active {
		transform: scale(.97);
	}

	&.primary {
		background: $brand-yellow;
		color: $brand-ink;
		font-weight: 600;
	}

	&.muted {
		background: $gray-bg;
		color: #655d51;
	}
}

.my-application {
	display: block;
	margin-top: 16rpx;
	font-size: 28rpx;
	font-weight: 600;
	color: $brand-ink;
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
	background: $surface;
	box-shadow: 0 -4rpx 16rpx rgba(45, 42, 34, .06);
}

.bar-icon {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
	width: 110rpx;
	font-size: 20rpx;
	color: $text-sub;
}

.bar-btn {
	flex: 1;
	height: 84rpx;
	line-height: 84rpx;
	text-align: center;
	border-radius: 42rpx;
	font-size: 27rpx;
	transition: transform 140ms cubic-bezier(.23, 1, .32, 1);

	&:active {
		transform: scale(.98);
	}

	&.primary {
		background: $brand-yellow;
		color: $brand-ink;
		font-weight: 600;

		&.done {
			background: #ecebe7;
			color: $text-sub;
		}
	}

	&.ghost {
		background: $gray-bg;
		color: #655d51;
	}

	&.danger {
		background: #ffe9e6;
		color: #e5484d;
	}
}

/* 发布者视角按钮更多（修改 / 下架 / 重新上架 / 删除），收紧间距与图标宽度避免挤出屏幕 */
.action-bar.is-owner {
	gap: 12rpx;

	.bar-icon {
		width: 84rpx;
		font-size: 19rpx;
	}

	.bar-btn {
		font-size: 24rpx;
		white-space: nowrap;
	}
}

/* ============ 底部抽屉（SlideUpPanel 内容） ============ */
.sheet {
	width: 100%;
	background: $surface;
	display: flex;
	flex-direction: column;
	max-height: 84vh;
	box-sizing: border-box;
	overflow: hidden;
}

.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	padding: 26rpx 28rpx;
	border-bottom: 1rpx solid $line-color;
	flex-shrink: 0;
}

.sheet-title {
	flex: 1;
	min-width: 0;
	text-align: center;
	font-size: 30rpx;
	font-weight: 600;
	color: $text-main;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.sheet-cancel {
	flex-shrink: 0;
	font-size: 27rpx;
	color: $text-sub;
}

.sheet-submit {
	flex-shrink: 0;
	font-size: 26rpx;
	color: $brand-ink;
	font-weight: 600;
	background: $brand-yellow;
	padding: 8rpx 26rpx;
	border-radius: 30rpx;

	&.disabled {
		background: $gray-bg;
		color: $text-muted;
	}
}

.sheet-body {
	padding: 24rpx 28rpx calc(48rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
	overflow-y: auto;
}

.order-target-name {
	display: block;
	margin-bottom: 20rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: $text-main;
	overflow-wrap: anywhere;
}

.form-block {
	margin-bottom: 28rpx;
	min-width: 0;
}

.form-label {
	display: block;
	margin-bottom: 14rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: $text-main;
	overflow-wrap: anywhere;
}

.required {
	margin-left: 6rpx;
	color: #e5484d;
}

.form-input {
	width: 100%;
	height: 80rpx;
	padding: 0 24rpx;
	border-radius: 40rpx;
	background: $gray-bg;
	font-size: 26rpx;
	color: $text-main;
	box-sizing: border-box;
}

.form-textarea {
	width: 100%;
	min-height: 160rpx;
	padding: 20rpx 24rpx;
	border-radius: 24rpx;
	background: $gray-bg;
	font-size: 26rpx;
	color: $text-main;
	line-height: 1.55;
	box-sizing: border-box;
	overflow-wrap: anywhere;
}

.form-counter {
	display: block;
	margin-top: 8rpx;
	text-align: right;
	font-size: 21rpx;
	color: $text-muted;
}

.form-hint {
	display: block;
	margin-top: 12rpx;
	font-size: 21rpx;
	color: $text-muted;
	overflow-wrap: anywhere;
}

.form-notice {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	padding: 20rpx;
	border-radius: 20rpx;
	background: $gray-bg;
	font-size: 22rpx;
	color: $text-sub;
	line-height: 1.6;

	text {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}
}

@media (prefers-reduced-motion: reduce) {
	.mini-btn,
	.action-btn,
	.bar-btn {
		transition: none;
	}

	.mini-btn:active,
	.action-btn:active,
	.bar-btn:active {
		transform: none;
	}
}
</style>
