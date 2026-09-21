<template>
	<view class="page app-h5-min-screen">
		<view class="state-box" v-if="loading">
			<uni-icons type="spinner-cycle" size="26" color="#b8bdc9"></uni-icons>
			<text>{{ t('escrow.loading') }}</text>
		</view>

		<view class="state-box" v-else-if="!order">
			<uni-icons type="info-filled" size="70" color="#e2e5ee"></uni-icons>
			<text>{{ t('escrow.missing') }}</text>
			<view class="state-btn" @click="goBack">{{ t('escrow.cancel') }}</view>
		</view>

		<template v-else>
			<!-- 交易状态进度条：买家托管 -> 卖家交付 -> 买家验收 -> 资金结算 -->
			<view class="card steps-card">
				<view class="steps-head">
					<text class="steps-title">{{ t('escrow.title') }}</text>
					<text class="steps-order"> {{ t('escrow.orderNo', { id: order.id }) }} </text>
				</view>
				<view class="steps" v-if="!isClosedOrder">
					<view class="step" v-for="step in steps" :key="step.key" :class="{ done: step.done, active: step.active }">
						<view class="step-track">
							<view class="step-dot">
								<uni-icons v-if="step.done" type="checkmarkempty" size="12" color="#1a1a1a"></uni-icons>
								<text v-else class="step-index">{{ step.index + 1 }}</text>
							</view>
							<view class="step-line" v-if="step.index < steps.length - 1"></view>
						</view>
						<text class="step-label">{{ stepLabel(step.key) }}</text>
					</view>
				</view>
				<view class="steps-closed" v-else :class="`tone-${order.status}`">
					<uni-icons :type="closedIcon" size="18" :color="closedTone === 'done' ? '#1f9d55' : '#5a6270'"></uni-icons>
					<text>{{ closedTitle }} · {{ closedContent }}</text>
				</view>
				<text class="steps-hint">{{ stepHint }}</text>
			</view>

			<!-- 超时警告：到达期望完成时间仍未验收 -->
			<view class="card timeout-card" v-if="overdue.overdue">
				<uni-icons type="info-filled" size="16" color="#e5484d"></uni-icons>
				<text class="timeout-text">{{ t('escrow.timeoutWarn', { days: overdue.days }) }}</text>
				<view class="timeout-btn" v-if="isSeller" :class="{ busy: actionBusy }" @click="runAction('remind')">{{ t('escrow.remindBuyer') }}</view>
			</view>

			<!-- 关联快照区：点击跳回详情 -->
			<view class="card snapshot-card" @click="goSnapshot">
				<view class="snapshot-head">
					<text class="snapshot-title">{{ t('escrow.snapshotTitle') }}</text>
					<text class="snapshot-link" v-if="postAvailable">{{ t('escrow.snapshotView') }} ›</text>
					<text class="snapshot-gone" v-else>{{ t('escrow.snapshotGone') }}</text>
				</view>
				<view class="snapshot-body">
					<text class="snapshot-name">{{ post?.title }}</text>
					<view class="price-tag" :class="{ negotiable: post?.isNegotiable }">
						<text class="price-text">{{ snapshotPriceLabel }}</text>
					</view>
				</view>
				<view class="badge-row">
					<text class="badge badge-urgent" v-if="post?.isUrgent">{{ t('escrow.snapshotUrgent') }}</text>
					<text class="badge badge-verified" v-if="post?.requireVerified">{{ t('escrow.snapshotRequireVerified') }}</text>
					<text class="badge" v-if="post?.category">#{{ post?.category }}</text>
				</view>
				<view class="snapshot-meta" v-if="post?.deadlineAt">
					<uni-icons type="calendar" size="13" color="#999999"></uni-icons>
					<text>{{ t('escrow.snapshotDeadline') }} · {{ formatDeadlineText(post.deadline) }}</text>
				</view>
			</view>

			<!-- 交易金额与角色 -->
			<view class="card">
				<view class="section-head">
					<text class="section-title">{{ t('escrow.amountTitle') }}</text>
					<text class="role-chip">{{ isBuyer ? t('escrow.roleBuyer') : t('escrow.roleSeller') }}</text>
				</view>
				<view class="amount-row">
					<text class="amount-value">￥{{ formatAmount(order.amount) }}</text>
					<text class="amount-note">{{ t('escrow.amountTotal') }}</text>
				</view>
				<text class="amount-hint">{{ t('escrow.amountHint') }}</text>

				<!-- 交易对象与 V 认证状态 -->
				<view class="counterparty" v-if="counterparty">
					<image class="counterparty-avatar" :src="avatarOf(counterparty)" mode="aspectFill"></image>
					<view class="counterparty-body">
						<text class="counterparty-name">{{ counterparty.name }}</text>
						<text class="counterparty-role">{{ counterparty.isSeller ? t('escrow.stepsDeliver') : t('escrow.stepsFund') }}</text>
					</view>
					<text class="verify-badge" :class="{ ok: counterparty.isVerified }">
						{{ counterparty.isVerified ? t('escrow.verifiedBadge') : t('escrow.unverifiedBadge') }}
					</text>
				</view>
			</view>

			<!-- 交付凭证 -->
			<view class="card" id="delivery-section">
				<view class="section-head">
					<text class="section-title">{{ t('escrow.deliveryTitle') }}</text>
					<text class="section-extra" v-if="order.deliverySubmittedAt">{{ deliveryTimeText }}</text>
				</view>

				<text class="delivery-empty" v-if="!hasDelivery">{{ t('escrow.deliveryEmpty') }}</text>

				<template v-else>
					<text class="delivery-note-label" v-if="order.deliveryNote">{{ t('escrow.deliveryNote') }}</text>
					<text class="delivery-note" v-if="order.deliveryNote">{{ order.deliveryNote }}</text>
					<view class="evidence-grid" v-if="evidence.length">
						<view class="evidence-item" v-for="(item, index) in evidence" :key="evidenceUrl(item)" @click="previewEvidence(item, index)">
							<image v-if="evidenceKind(evidenceUrl(item)) === 'image'" class="evidence-image" :src="evidenceUrl(item)" mode="aspectFill"></image>
							<view v-else class="evidence-file">
								<uni-icons type="paperclip" size="20" color="#666666"></uni-icons>
								<text class="evidence-file-name">{{ evidenceName(item, index) }}</text>
							</view>
						</view>
					</view>
				</template>

				<!-- 卖家在托管中 / 已交付阶段都可以提交或补充凭证 -->
				<view class="delivery-form" v-if="canSubmitDelivery">
					<text class="form-label">{{ t('escrow.deliveryNote') }}</text>
					<textarea
						class="form-textarea"
						v-model="deliveryNote"
						maxlength="500"
						auto-height
						:placeholder="t('escrow.deliveryNotePlaceholder')"
					></textarea>
					<text class="form-counter">{{ deliveryNote.length }}/500</text>

					<text class="form-label">{{ t('escrow.deliveryEvidence') }}</text>
					<view class="upload-row">
						<view class="upload-btn" :class="{ busy: uploading }" @click="chooseEvidence">
							<uni-icons type="plusempty" size="16" color="#1a1a1a"></uni-icons>
							<text>{{ uploading ? t('escrow.deliveryUploading') : t('escrow.deliveryAdd') }}</text>
						</view>
						<text class="upload-hint" v-if="draftEvidence.length">{{ t('escrow.deliveryEvidence') }} · {{ draftEvidence.length }}</text>
					</view>
					<view class="evidence-grid draft" v-if="draftEvidence.length">
						<view class="evidence-item" v-for="(item, index) in draftEvidence" :key="evidenceUrl(item)">
							<image v-if="evidenceKind(evidenceUrl(item)) === 'image'" class="evidence-image" :src="evidenceUrl(item)" mode="aspectFill"></image>
							<view v-else class="evidence-file">
								<uni-icons type="paperclip" size="20" color="#666666"></uni-icons>
								<text class="evidence-file-name">{{ evidenceName(item, index) }}</text>
							</view>
							<view class="evidence-remove" @click.stop="removeDraftEvidence(index)">✕</view>
						</view>
					</view>

					<view class="delivery-submit" :class="{ busy: actionBusy }" @click="submitDelivery">
						{{ t('escrow.deliverySubmit') }}
					</view>
				</view>
			</view>

			<!-- 交易轨迹 -->
			<view class="card">
				<text class="section-title">{{ t('escrow.timelineTitle') }}</text>
				<text class="timeline-empty" v-if="!order.events?.length">{{ t('escrow.timelineEmpty') }}</text>
				<view class="timeline" v-else>
					<view class="timeline-item" v-for="event in order.events" :key="event.id">
						<view class="timeline-dot"></view>
						<view class="timeline-body">
							<text class="timeline-text">{{ eventLabel(event) }}</text>
							<text class="timeline-time">{{ formatRelativeTime(event.createdAt) }}</text>
						</view>
					</view>
				</view>
			</view>

			<view class="bottom-spacer"></view>

			<!-- 底部固定操作栏：按身份与状态动态渲染 -->
			<view class="action-bar app-h5-fixed-bottom" v-if="actions.length">
				<view
					class="bar-btn"
					v-for="action in actions"
					:key="action.action"
					:class="[action.tone, { busy: actionBusy }]"
					@click="onActionTap(action)"
				>{{ action.label }}</view>
			</view>
		</template>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { config } from '@/utils/config.js'
import { getToken } from '@/utils/auth.js'
import {
	getDemandHallOrderApi,
	updateDemandHallOrderStatusApi,
	submitDemandHallOrderDeliveryApi,
	DEMAND_HALL_UPLOAD_URL
} from '@/api/demandHall.js'
import { t } from '@/utils/localeRuntime.js'
import { formatDeadlineText, formatRelativeTime } from '@/utils/demandHallPresentation.js'
import {
	escrowActionBar,
	escrowSteps,
	evidenceKind,
	evidenceName,
	evidenceUrl,
	formatAmount,
	orderEventText,
	overdueState
} from '@/utils/demandHallWorkspace.js'

const orderId = ref(null)
const order = ref(null)
const post = ref(null)
const counterparty = ref(null)
const postAvailable = ref(false)
const isBuyer = ref(false)
const isSeller = ref(false)
const requiresVerifiedSeller = ref(false)
const loading = ref(true)
const actionBusy = ref(false)

/* ============ 展示派生 ============ */
const steps = computed(() => escrowSteps(order.value?.status))
const isClosedOrder = computed(() => ['completed', 'cancelled', 'refunded'].includes(order.value?.status || ''))

const stepHint = computed(() => {
	// 后端已给出各状态的提示语在 escrow.* 里，这里按状态取对应文案。
	const status = order.value?.status
	if (status === 'created') return isSeller.value ? t('escrow.waitingFund') : t('escrow.stepsFundHint')
	if (status === 'funded') return isSeller.value ? t('escrow.stepsDeliverHint') : t('escrow.waitingDeliver')
	if (status === 'delivered') return isBuyer.value ? t('escrow.deliveryHint') : t('escrow.stepsAcceptHint')
	return ''
})

function stepLabel(key) {
	return {
		fund: t('escrow.stepsFund'),
		deliver: t('escrow.stepsDeliver'),
		accept: t('escrow.stepsAccept'),
		settle: t('escrow.stepsSettle')
	}[key] || key
}

const closedTitle = computed(() => {
	const status = order.value?.status
	if (status === 'completed') return t('escrow.doneTitle')
	if (status === 'cancelled') return t('escrow.cancelledTitle')
	return t('escrow.refundedTitle')
})

const closedContent = computed(() => {
	const status = order.value?.status
	if (status === 'completed') return t('escrow.doneContent')
	if (status === 'cancelled') return t('escrow.cancelledContent')
	return t('escrow.refundedContent')
})

const closedTone = computed(() => (order.value?.status === 'completed' ? 'done' : 'muted'))
const closedIcon = computed(() => (order.value?.status === 'completed' ? 'checkbox-filled' : 'info-filled'))

const snapshotPriceLabel = computed(() => post.value?.priceLabel || (post.value?.isNegotiable ? '议价' : `￥${formatAmount(post.value?.price)}`))

const overdue = computed(() => overdueState({ status: order.value?.status, deadlineAt: post.value?.deadlineAt }))

const evidence = computed(() => (Array.isArray(order.value?.deliveryEvidence) ? order.value.deliveryEvidence : []))
const hasDelivery = computed(() => !!order.value?.deliveryNote || evidence.value.length > 0)

const canSubmitDelivery = computed(() => isSeller.value && ['funded', 'delivered'].includes(order.value?.status || ''))

const deliveryTimeText = computed(() => {
	if (!order.value?.deliverySubmittedAt) return ''
	const text = formatRelativeTime(order.value.deliverySubmittedAt)
	// 首次交付展示「交付于 …」，后续补充凭证展示「最近更新 …」。
	return order.value.status === 'funded'
		? t('escrow.deliveryAt', { time: text })
		: t('escrow.deliveryUpdatedAt', { time: text })
})

const actions = computed(() => escrowActionBar({
	status: order.value?.status,
	isBuyer: isBuyer.value,
	isSeller: isSeller.value,
	requiresVerified: requiresVerifiedSeller.value
}))

function avatarOf(user) {
	if (user?.avatar) return user.avatar
	return `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(user?.name || 'user')}`
}

function eventLabel(event) {
	const key = `escrow.event${eventKeySuffix(event.event)}`
	const translated = t(key)
	// 未登记的轨迹类型回退到展示逻辑层的默认文案，避免页面出现翻译键名。
	return translated === key ? orderEventText(event) : translated
}

function eventKeySuffix(event) {
	const map = {
		create: 'Create',
		fund: 'Fund',
		deliver: 'Deliver',
		deliver_update: 'DeliverUpdate',
		remind: 'Remind',
		confirm: 'Confirm',
		cancel: 'Cancel',
		refund: 'Refund'
	}
	return map[event] || ''
}

/* ============ 数据加载 ============ */
async function loadOrder() {
	try {
		const data = await getDemandHallOrderApi(orderId.value)
		if (!data?.order) {
			order.value = null
			return
		}
		order.value = data.order
		post.value = data.post || null
		counterparty.value = data.counterparty || null
		postAvailable.value = data.postAvailable !== false
		isBuyer.value = !!data.isBuyer
		isSeller.value = !!data.isSeller
		requiresVerifiedSeller.value = !!data.requiresVerifiedSeller
		syncDeliveryDraft()
	} catch (error) {
		order.value = null
	} finally {
		loading.value = false
	}
}

/* ============ 交付凭证 ============ */
const deliveryNote = ref('')
const draftEvidence = ref([])
const uploading = ref(false)

/** 打开页面时把已提交的凭证回填到草稿，避免卖家重复上传。 */
function syncDeliveryDraft() {
	deliveryNote.value = order.value?.deliveryNote || ''
	draftEvidence.value = [...evidence.value]
}

function chooseEvidence() {
	if (uploading.value) return
	uni.chooseImage({
		count: Math.max(1, 9 - draftEvidence.value.length),
		sizeType: ['compressed'],
		success: async ({ tempFilePaths }) => {
			await uploadEvidence(tempFilePaths || [])
		}
	})
}

/**
 * 交付凭证走 uni.uploadFile（不能复用 request.js 的 JSON 通道），
 * 因此这里单独拼 baseURL、单独带 token，并保留后端的错误文案。
 */
function uploadEvidence(paths) {
	if (!paths.length) return
	uploading.value = true
	return Promise.all(paths.map(filePath => new Promise(resolve => {
		uni.uploadFile({
			url: config.baseURL + DEMAND_HALL_UPLOAD_URL,
			filePath,
			name: 'images',
			header: { Authorization: `Bearer ${getToken()}` },
			success: response => {
				try {
					const parsed = JSON.parse(response.data)
					const urls = Array.isArray(parsed?.urls) ? parsed.urls : (parsed?.url ? [parsed.url] : [])
					resolve(urls.map(url => ({ url })))
				} catch (error) {
					resolve([])
				}
			},
			fail: () => resolve([])
		})
	}))).then(groups => {
		const uploaded = groups.flat()
		if (!uploaded.length) uni.showToast({ title: t('escrow.deliveryUploadFailed'), icon: 'none' })
		else draftEvidence.value = [...draftEvidence.value, ...uploaded].slice(0, 9)
	}).finally(() => {
		uploading.value = false
	})
}

function removeDraftEvidence(index) {
	draftEvidence.value = draftEvidence.value.filter((_, position) => position !== index)
}

function previewEvidence(item, index) {
	const url = evidenceUrl(item)
	if (evidenceKind(url) !== 'image') {
		uni.showToast({ title: evidenceName(item, index), icon: 'none' })
		return
	}
	uni.previewImage({
		urls: evidence.value.map(evidenceUrl).filter(Boolean),
		current: url
	})
}

async function submitDelivery() {
	if (actionBusy.value) return
	if (!deliveryNote.value.trim() && draftEvidence.value.length === 0) {
		uni.showToast({ title: t('escrow.deliveryNoteRequired'), icon: 'none' })
		return
	}
	actionBusy.value = true
	try {
		await submitDemandHallOrderDeliveryApi(orderId.value, {
			note: deliveryNote.value.trim(),
			evidence: draftEvidence.value
		})
		uni.showToast({ title: t('escrow.deliverySubmitted'), icon: 'success' })
		await loadOrder()
	} catch (error) { /* 请求层已提示 */ } finally {
		actionBusy.value = false
	}
}

/* ============ 主 / 次操作 ============ */
const CONFIRM_KEYS = {
	fund: { title: 'escrow.fundConfirmTitle', content: 'escrow.fundConfirmContent' },
	confirm: { title: 'escrow.confirmTitle', content: 'escrow.confirmContent' },
	cancel: { title: 'escrow.cancelTitle', content: 'escrow.cancelContent' },
	refund: { title: 'escrow.refundTitle', content: 'escrow.refundContent' }
}

function onActionTap(action) {
	// 需要认证服务者的订单在卖家未认证时拦截付款，先弹说明再询问是否继续。
	if (action.action === 'fund' && requiresVerifiedSeller.value) {
		showVerifiedGate()
		return
	}
	void runAction(action.action)
}

function showVerifiedGate() {
	uni.showModal({
		title: t('escrow.verifiedGateTitle'),
		content: t('escrow.verifiedGateContent'),
		cancelText: t('escrow.verifiedGateCancel'),
		confirmText: t('escrow.verifiedGateContinue'),
		success: ({ confirm }) => {
			// 后端的校验结果是唯一依据；这里只负责把原因说清楚。
			if (confirm) uni.showToast({ title: t('escrow.fundBlocked'), icon: 'none' })
		}
	})
}

async function runAction(action) {
	if (actionBusy.value) return
	if (action === 'delivery') {
		// 交付凭证走表单提交，滚动到凭证区而不是弹确认框。
		scrollToDelivery()
		return
	}
	if (action === 'waiting_fund' || action === 'waiting_deliver' || action === 'done') return

	const keys = CONFIRM_KEYS[action]
	if (keys) {
		const confirmed = await confirmDialog({
			title: t(keys.title),
			content: t(keys.content, { amount: formatAmount(order.value?.amount) })
		})
		if (!confirmed) return
	}

	actionBusy.value = true
	try {
		await updateDemandHallOrderStatusApi(orderId.value, { action })
		if (action === 'remind') uni.showToast({ title: t('escrow.remindSent'), icon: 'success' })
		else uni.showToast({ title: t('escrow.actionDone'), icon: 'success' })
		await loadOrder()
	} catch (error) { /* 请求层已提示 */ } finally {
		actionBusy.value = false
	}
}

function confirmDialog({ title, content }) {
	return new Promise(resolve => {
		uni.showModal({
			title,
			content,
			confirmText: t('escrow.confirm'),
			cancelText: t('escrow.cancel'),
			success: ({ confirm }) => resolve(confirm),
			fail: () => resolve(false)
		})
	})
}

/** 滚到交付凭证区，让卖家直接开始填写，而不是只弹一句提示。 */
function scrollToDelivery() {
	uni.createSelectorQuery()
		.select('#delivery-section')
		.boundingClientRect(rect => {
			if (!rect) return
			uni.pageScrollTo({ scrollTop: Math.max(0, rect.top - 20), duration: 240 })
		})
		.exec()
}

function goSnapshot() {
	if (!postAvailable.value || !post.value?.id) return
	uni.navigateTo({ url: `/pages/demandhall/detail?id=${post.value.id}` })
}

function goBack() {
	const stack = typeof getCurrentPages === 'function' ? getCurrentPages() : []
	if (stack.length > 1) uni.navigateBack()
	else uni.redirectTo({ url: '/pages/demandhall/workspace' })
}

onLoad(options => {
	orderId.value = Number(options?.id) || null
	if (!orderId.value) {
		loading.value = false
		return
	}
	void loadOrder()
})

onShow(() => {
	if (orderId.value && !loading.value) void loadOrder()
})
</script>

<style scoped lang="scss">
$brand-yellow: var(--bless-primary, #C2A052);
$text-main: #1a1a1a;
$text-sub: #999999;
$gray-bg: #f5f6f8;
$line-color: #f2f2f4;

.page {
	min-height: 100vh;
	padding: 20rpx 24rpx 0;
	background: #f5f6f8;
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
	background: $brand-yellow;
	color: $text-main;
	font-size: 25rpx;
	font-weight: 600;
}

.card {
	background: #fff;
	border-radius: 22rpx;
	padding: 26rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 14rpx rgba(31, 41, 55, 0.06);
}

/* ============ 进度条 ============ */
.steps-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.steps-title {
	font-size: 30rpx;
	font-weight: bold;
	color: $text-main;
}

.steps-order {
	font-size: 21rpx;
	color: $text-sub;
}

.steps {
	display: flex;
	margin-top: 28rpx;
}

.step {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	min-width: 0;
}

.step-track {
	position: relative;
	width: 100%;
	min-height: 44rpx;
	margin-bottom: 14rpx;
}

.step-dot {
	position: relative;
	z-index: 1;
	width: 44rpx;
	height: 44rpx;
	margin: 0 auto;
	border-radius: 50%;
	background: #eef0f6;
	color: #8a8a8f;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background 200ms ease-out;

	.step.done & {
		background: $brand-yellow;
		color: $text-main;
	}

	.step.active & {
		background: $brand-yellow;
		color: $text-main;
		box-shadow: 0 0 0 6rpx rgba(194,160,82,0.28);
	}
}

.step-index {
	font-size: 22rpx;
	font-weight: 700;
}

/* 连接线绝对定位在圆点右侧，避免负 margin 让第一步圆点跑出容器 */
.step-line {
	position: absolute;
	top: 20rpx;
	left: calc(50% + 22rpx);
	right: calc(-50% + 22rpx);
	height: 4rpx;
	background: #eef0f6;

	.step.done & {
		background: $brand-yellow;
	}
}

.step-label {
	font-size: 21rpx;
	color: $text-sub;
	text-align: center;
	line-height: 1.4;

	.step.done &,
	.step.active & {
		color: $text-main;
		font-weight: 600;
	}
}

.steps-closed {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-top: 24rpx;
	padding: 20rpx;
	border-radius: 16rpx;
	background: #e8eaef;
	font-size: 23rpx;
	color: #5a6270;
	line-height: 1.55;

	&.tone-completed {
		background: #e9f7ef;
		color: #1f9d55;
	}
}

.steps-hint {
	display: block;
	margin-top: 22rpx;
	font-size: 22rpx;
	color: #8a8a8f;
	line-height: 1.6;
}

/* ============ 超时警告 ============ */
.timeout-card {
	display: flex;
	align-items: center;
	gap: 12rpx;
	padding: 22rpx 24rpx;
	background: #fff5f4;
	box-shadow: none;
	border: 1rpx solid #ffd9d4;
}

.timeout-text {
	flex: 1;
	font-size: 23rpx;
	color: #c02c31;
	line-height: 1.55;
}

.timeout-btn {
	flex-shrink: 0;
	padding: 12rpx 28rpx;
	border-radius: 26rpx;
	background: #e5484d;
	color: #fff;
	font-size: 23rpx;
	font-weight: 600;
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.97);
	}

	&.busy {
		opacity: 0.6;
	}
}

/* ============ 关联快照 ============ */
.snapshot-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.snapshot-title {
	font-size: 24rpx;
	font-weight: 600;
	color: $text-sub;
}

.snapshot-link {
	font-size: 23rpx;
	color: #b26b00;
	font-weight: 600;
}

.snapshot-gone {
	font-size: 22rpx;
	color: #b8bdc9;
}

.snapshot-body {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
	margin-top: 16rpx;
}

.snapshot-name {
	flex: 1;
	font-size: 30rpx;
	font-weight: bold;
	color: $text-main;
	line-height: 1.42;
}

.price-tag {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	padding: 8rpx 20rpx;
	border-radius: 24rpx;
	background: $brand-yellow;
	color: $text-main;

	&.negotiable {
		background: $gray-bg;
		color: #666666;
	}
}

.price-text {
	font-size: 26rpx;
	font-weight: bold;
}

.badge-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 16rpx;
}

.badge {
	padding: 6rpx 18rpx;
	border-radius: 20rpx;
	font-size: 21rpx;
	background: $gray-bg;
	color: #666666;
}

.badge-urgent {
	background: #ffe9e6;
	color: #e5484d;
	font-weight: 600;
}

.badge-verified {
	background: rgba(194,160,82,0.28);
	color: $text-main;
}

.snapshot-meta {
	display: flex;
	align-items: center;
	gap: 10rpx;
	margin-top: 16rpx;
	font-size: 22rpx;
	color: $text-sub;
}

/* ============ 金额 ============ */
.section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.section-title {
	font-size: 28rpx;
	font-weight: bold;
	color: $text-main;
}

.section-extra {
	font-size: 21rpx;
	color: $text-sub;
}

.role-chip {
	padding: 6rpx 18rpx;
	border-radius: 20rpx;
	background: $gray-bg;
	color: #666666;
	font-size: 21rpx;
	font-weight: 600;
}

.amount-row {
	display: flex;
	align-items: baseline;
	gap: 14rpx;
	margin-top: 20rpx;
}

.amount-value {
	font-size: 46rpx;
	font-weight: bold;
	color: $text-main;
}

.amount-note {
	flex: 1;
	font-size: 21rpx;
	color: $text-sub;
}

.amount-hint {
	display: block;
	margin-top: 10rpx;
	font-size: 22rpx;
	color: #8a8a8f;
	line-height: 1.6;
}

.counterparty {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-top: 22rpx;
	padding-top: 20rpx;
	border-top: 1rpx solid $line-color;
}

.counterparty-avatar {
	width: 66rpx;
	height: 66rpx;
	border-radius: 50%;
	background: #eef0f6;
	flex-shrink: 0;
}

.counterparty-body {
	flex: 1;
	min-width: 0;
}

.counterparty-name {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: $text-main;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.counterparty-role {
	display: block;
	margin-top: 4rpx;
	font-size: 21rpx;
	color: $text-sub;
}

.verify-badge {
	flex-shrink: 0;
	padding: 6rpx 16rpx;
	border-radius: 18rpx;
	background: #e8eaef;
	color: #5a6270;
	font-size: 20rpx;
	font-weight: 600;

	&.ok {
		background: $brand-yellow;
		color: $text-main;
	}
}

/* ============ 交付凭证 ============ */
.delivery-empty {
	display: block;
	margin-top: 18rpx;
	font-size: 23rpx;
	color: $text-sub;
}

.delivery-note-label {
	display: block;
	margin-top: 18rpx;
	font-size: 22rpx;
	color: $text-sub;
}

.delivery-note {
	display: block;
	margin-top: 8rpx;
	font-size: 25rpx;
	color: #4b5563;
	line-height: 1.65;
	white-space: pre-wrap;
}

.evidence-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
	margin-top: 16rpx;
}

.evidence-item {
	position: relative;
	width: 150rpx;
	height: 150rpx;
	border-radius: 16rpx;
	overflow: hidden;
	background: $gray-bg;
}

.evidence-image {
	width: 100%;
	height: 100%;
	background: #eef0f6;
}

.evidence-file {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	padding: 12rpx;
	box-sizing: border-box;
}

.evidence-file-name {
	font-size: 19rpx;
	color: #666666;
	text-align: center;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	word-break: break-all;
}

.evidence-remove {
	position: absolute;
	top: 6rpx;
	right: 6rpx;
	width: 38rpx;
	height: 38rpx;
	border-radius: 50%;
	background: rgba(26, 26, 26, 0.66);
	color: #fff;
	font-size: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.delivery-form {
	margin-top: 22rpx;
	padding-top: 22rpx;
	border-top: 1rpx solid $line-color;
}

.form-label {
	display: block;
	margin-bottom: 14rpx;
	font-size: 25rpx;
	font-weight: 600;
	color: $text-main;
}

.form-textarea {
	width: 100%;
	min-height: 150rpx;
	padding: 20rpx 24rpx;
	border-radius: 20rpx;
	background: $gray-bg;
	font-size: 25rpx;
	color: $text-main;
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

.upload-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.upload-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 14rpx 30rpx;
	border-radius: 30rpx;
	background: $gray-bg;
	color: $text-main;
	font-size: 24rpx;
	font-weight: 600;
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.97);
	}

	&.busy {
		opacity: 0.6;
	}
}

.upload-hint {
	font-size: 21rpx;
	color: $text-sub;
}

.delivery-submit {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 80rpx;
	margin-top: 24rpx;
	border-radius: 40rpx;
	background: $brand-yellow;
	color: $text-main;
	font-size: 27rpx;
	font-weight: bold;
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.98);
	}

	&.busy {
		opacity: 0.6;
	}
}

/* ============ 轨迹 ============ */
.timeline-empty {
	display: block;
	margin-top: 16rpx;
	font-size: 23rpx;
	color: $text-sub;
}

.timeline {
	margin-top: 20rpx;
}

.timeline-item {
	display: flex;
	gap: 16rpx;
	padding-bottom: 20rpx;

	&:last-child {
		padding-bottom: 0;
	}
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
	color: #4b5563;
	line-height: 1.5;
}

.timeline-time {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: #b8bdc9;
}

.bottom-spacer {
	height: 180rpx;
}

/* ============ 底部固定操作栏 ============ */
.action-bar {
	position: fixed;
	left: 0;
	right: 0;
	z-index: 90;
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 16rpx 24rpx;
	background: #fff;
	box-shadow: 0 -4rpx 16rpx rgba(31, 41, 55, 0.08);
}

.bar-btn {
	flex: 1;
	height: 84rpx;
	line-height: 84rpx;
	text-align: center;
	border-radius: 42rpx;
	font-size: 27rpx;
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.98);
	}

	&.primary {
		flex: 1.4;
		background: $brand-yellow;
		color: $text-main;
		font-weight: bold;
	}

	&.ghost {
		background: $gray-bg;
		color: #666666;
	}

	&.disabled {
		background: #eef0f6;
		color: $text-sub;
	}

	&.busy {
		opacity: 0.6;
	}
}
</style>
