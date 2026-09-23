<template>
	<view class="container">
		<!-- 顶部标题 + 返回信息流入口 -->
		<view class="hero">
			<view class="hero-top">
				<view class="hero-copy">
					<text class="hero-title">{{ t('workspace.title') }}</text>
					<text class="hero-subtitle">{{ t('workspace.tabPosts') }} · {{ t('workspace.tabApplies') }} · {{ t('workspace.tabCollections') }}</text>
				</view>
				<view class="hero-back" @click="goDiscover">
					<uni-icons type="left" size="14" color="#666666"></uni-icons>
					<text>{{ t('workspace.back') }}</text>
				</view>
			</view>

			<!-- 顶部统计看板：认证状态 / 赚取 / 支出 / 评分 -->
			<view class="board">
				<view class="board-verify" :class="{ verified: reputation.isVerified }">
					<uni-icons :type="reputation.isVerified ? 'vip-filled' : 'info-filled'" size="16" :color="reputation.isVerified ? '#1a1a1a' : '#8a8a8f'"></uni-icons>
					<text class="board-verify-text">{{ reputation.isVerified ? t('workspace.statVerified') : t('workspace.statUnverified') }}</text>
				</view>
				<view class="board-grid">
					<view class="board-cell">
						<text class="board-value">￥{{ formatAmount(reputation.earned) }}</text>
						<text class="board-label">{{ t('workspace.statEarned') }}</text>
					</view>
					<view class="board-cell">
						<text class="board-value">￥{{ formatAmount(reputation.spent) }}</text>
						<text class="board-label">{{ t('workspace.statSpent') }}</text>
					</view>
					<view class="board-cell">
						<text class="board-value" :class="{ muted: reputation.score == null }">
							{{ reputation.score == null ? t('workspace.statNoScore') : reputation.score.toFixed(1) }}
						</text>
						<text class="board-label">
							{{ reputation.scoreCount ? t('workspace.scoreCount', { count: reputation.scoreCount }) : t('workspace.statScore') }}
						</text>
					</view>
				</view>
				<text class="board-ongoing" v-if="reputation.ongoingOrders">
					{{ t('workspace.statOngoing') }} · {{ reputation.ongoingOrders }}
				</text>
				<text class="board-hint">{{ t('workspace.statSettledHint') }}</text>
			</view>

			<!-- 三级 Tab：我发布的 / 我的参与 / 我的收藏 -->
			<view class="tab-bar">
				<view
					class="tab-item"
					v-for="tab in tabs"
					:key="tab.key"
					:class="{ active: activeTab === tab.key }"
					@click="switchTab(tab.key)"
				>
					<text class="tab-label">{{ tab.label }}</text>
					<text class="tab-count" v-if="tabCounts[tab.key]">{{ tabCounts[tab.key] }}</text>
				</view>
			</view>

			<!-- 「我发布的」子分类：需求 / 服务 -->
			<view class="kind-bar" v-if="activeTab === 'posts'">
				<text
					class="kind-chip"
					v-for="kind in postKinds"
					:key="kind.key"
					:class="{ active: postKind === kind.key }"
					@click="switchPostKind(kind.key)"
				>{{ kind.label }}</text>
			</view>
		</view>

		<!-- 列表：下拉刷新 + 触底加载，与信息流一致 -->
		<scroll-view
			scroll-y
			class="content-scroll"
			:scroll-top="scrollTop"
			scroll-with-animation="false"
			refresher-enabled
			:refresher-triggered="refreshing"
			refresher-background="#ffffff"
			lower-threshold="120"
			@refresherrefresh="onRefresh"
			@scrolltolower="onLoadMore"
		>
			<!-- 骨架屏 -->
			<view class="card-list" v-if="loading">
				<view class="skeleton-card" v-for="i in 3" :key="i">
					<view class="skeleton-line wide"></view>
					<view class="skeleton-line"></view>
					<view class="skeleton-line short"></view>
					<view class="skeleton-actions">
						<view class="skeleton-pill"></view>
						<view class="skeleton-pill"></view>
					</view>
				</view>
			</view>

			<!-- 首屏失败：明确区分请求失败与空数据 -->
			<view class="state-block" v-else-if="loadError && !currentList.length">
				<uni-icons type="info-filled" size="72" color="#e2e5ee"></uni-icons>
				<text class="state-title">{{ t('workspace.loadFailed') }}</text>
				<view class="state-btn" @click="reload"> {{ t('workspace.retry') }} </view>
			</view>

			<!-- 空状态：缺省图 + 「去发现」引流回列表 -->
			<view class="empty-state" v-else-if="currentList.length === 0">
				<uni-icons type="help-filled" size="96" color="#e5e5e5"></uni-icons>
				<text class="empty-title">{{ emptyState.title }}</text>
				<text class="empty-hint">{{ emptyState.hint }}</text>
				<view class="empty-actions">
					<view class="empty-btn primary" @click="goDiscover">{{ t('workspace.emptyDiscover') }}</view>
					<view class="empty-btn ghost" v-if="activeTab === 'posts'" @click="goPublish">{{ t('workspace.publishEntry') }}</view>
					<view class="empty-btn ghost" v-else-if="collectionError" @click="reload">{{ t('workspace.retry') }}</view>
				</view>
			</view>

			<template v-else>
				<!-- 我发布的 -->
				<view class="card-list" v-if="activeTab === 'posts'">
					<view class="card" :class="post.type === 'demand' ? 'demand-card' : 'service-card'" v-for="item in currentList" :key="item.post.id">
						<view class="card-status" :class="`tone-${item.statusMeta.tone}`">{{ item.statusMeta.text }}</view>

						<view class="card-head">
							<text class="card-title">{{ item.post.title }}</text>
							<view class="price-tag" :class="{ negotiable: item.post.isNegotiable }">
								<text class="price-text">{{ formatPriceLabel(item.post, t) }}</text>
							</view>
						</view>
						<text class="card-desc">{{ item.post.description }}</text>

						<view class="badge-row">
							<text
								class="badge"
								v-for="badge in buildCardBadges(item.post, { t })"
								:key="badge.text"
								:class="`badge-${badge.tone}`"
							>{{ badge.tone === 'tag' ? '#' + badge.text : badge.text }}</text>
						</view>

						<view class="card-meta">
							<text>{{ t('workspace.publishedAt', { time: formatRelativeTime(item.post.createdAt, Date.now(), t) }) }}</text>
							<text class="meta-divider">·</text>
							<text>{{ item.post.type === 'demand' ? t('workspace.postApplyDemand', { count: item.post.applyCount }) : t('workspace.postApplyService', { count: item.post.applyCount }) }}</text>
							<text class="meta-divider">·</text>
							<text>{{ t('workspace.postCollectCount', { count: item.post.collectCount }) }}</text>
						</view>

						<view class="card-actions">
							<view
								class="action-btn"
								v-for="action in item.actions"
								:key="action.action"
								:class="action.tone"
								@click.stop="onPostAction(item, action)"
							>{{ action.label }}</view>
						</view>
					</view>
				</view>

				<!-- 我的参与 -->
				<view class="card-list" v-else-if="activeTab === 'applies'">
					<view class="card" :class="item.post?.type === 'service' ? 'service-card' : 'demand-card'" v-for="item in currentList" :key="item.id" @click="goPostDetail(item.post?.id)">
						<view class="card-status" :class="`tone-${item.statusMeta.tone}`">{{ item.statusMeta.text }}</view>
						<view class="card-head">
							<text class="card-title">{{ item.post?.title }}</text>
							<view class="price-tag" :class="{ negotiable: item.quoteAmount == null }">
								<text class="price-text">{{ item.quoteAmount != null ? `￥${formatAmount(item.quoteAmount)}` : t('workspace.applicantNoQuote') }}</text>
							</view>
						</view>
						<text class="card-desc">{{ item.message }}</text>
						<view class="card-meta">
							<text>{{ formatRelativeTime(item.createdAt, Date.now(), t) }}</text>
							<text class="meta-divider">·</text>
							<text>{{ categoryLabel(item.post?.category, t) }}</text>
							<text class="meta-apply" v-if="item.post?.status === 'closed'">{{ t('workspace.postClosed') }}</text>
						</view>
						<view class="card-actions">
							<view class="action-btn ghost" @click.stop="contactOwner(item.post)">{{ t('workspace.contactNow') }}</view>
							<view class="action-btn primary" @click.stop="goPostDetail(item.post?.id)">{{ t('workspace.actionDetail') }}</view>
						</view>
					</view>
				</view>

				<!-- 我的收藏 -->
				<view class="card-list" v-else>
					<view class="card" :class="post.type === 'demand' ? 'demand-card' : 'service-card'" v-for="post in currentList" :key="post.id">
						<view class="card-head" @click="goPostDetail(post.id)">
							<text class="card-title">{{ post.title }}</text>
							<view class="price-tag" :class="{ negotiable: post.isNegotiable }">
								<text class="price-text">{{ formatPriceLabel(post, t) }}</text>
							</view>
						</view>
						<text class="card-desc" @click="goPostDetail(post.id)">{{ post.description }}</text>
						<view class="badge-row">
							<text
								class="badge"
								v-for="badge in buildCardBadges(post, { t })"
								:key="badge.text"
								:class="`badge-${badge.tone}`"
							>{{ badge.tone === 'tag' ? '#' + badge.text : badge.text }}</text>
						</view>
						<view class="card-meta">
							<text class="meta-author">{{ post.author?.name }}</text>
							<text class="meta-divider">·</text>
							<text>{{ formatRelativeTime(post.createdAt, Date.now(), t) }}</text>
						</view>
						<view class="card-actions">
							<view class="action-btn ghost" @click.stop="toggleCollect(post)">
								<uni-icons type="star-filled" size="15" color="#775E25"></uni-icons>
								<text>{{ t('workspace.uncollect') }}</text>
							</view>
							<view class="action-btn primary" @click.stop="goPostDetail(post.id)">{{ t('workspace.actionDetail') }}</view>
						</view>
					</view>
				</view>

				<view class="list-footer" v-if="loadingMore">
					<uni-icons type="spinner-cycle" size="14" color="#b8bdc9"></uni-icons>
					<text>{{ t('workspace.loadingMore') }}</text>
				</view>
				<view class="list-footer tappable" v-else-if="loadMoreError" @click="onLoadMore">{{ t('workspace.loadMoreFailed') }}</view>
				<view class="list-footer" v-else-if="!hasMore">{{ t('workspace.noMore') }}</view>
			</template>

			<view class="scroll-spacer"></view>
		</scroll-view>

		<!-- 悬浮发布按钮 -->
		<view class="fab" @click="goPublish">
			<uni-icons type="plusempty" size="22" color="#775E25"></uni-icons>
			<text class="fab-text">{{ t('workspace.publishEntry') }}</text>
		</view>

		<!-- 报名者管理面板 -->
		<SlideUpPanel fixed :open="!!applicantTarget" :z-index="210" :label="t('workspace.applicationsTitle')" @dismiss="closeApplicants">
			<view class="sheet">
				<view class="sheet-header">
					<view class="sheet-head-copy">
						<text class="sheet-title">{{ t('workspace.applicationsTitle') }}</text>
						<text class="sheet-subtitle">{{ applicantsCountText }}</text>
					</view>
					<text class="sheet-close" @click="closeApplicants">{{ t('workspace.closeSheet') }}</text>
				</view>

				<scroll-view scroll-y class="sheet-body">
					<view class="applicant-empty" v-if="applicantsLoading">
						<uni-icons type="spinner-cycle" size="18" color="#b8bdc9"></uni-icons>
						<text>{{ t('workspace.loading') }}</text>
					</view>
					<!-- 报名列表请求失败要和「没人报名」区分开，并给出重试 -->
					<view class="applicant-empty is-column" v-else-if="applicantsError">
						<text>{{ t('workspace.applicantsFailed') }}</text>
						<view class="state-btn" @click="loadApplicants">{{ t('workspace.retry') }}</view>
					</view>
					<view class="applicant-empty" v-else-if="applicants.length === 0">{{ t('workspace.applicationsEmpty') }}</view>

					<view class="applicant-item" v-for="item in applicants" :key="item.id">
						<image class="applicant-avatar" :src="avatarOf(item.applicant)" mode="aspectFill"></image>
						<view class="applicant-body">
							<view class="applicant-head">
								<text class="applicant-name">{{ item.applicant?.name }}</text>
								<text class="applicant-status" :class="`tone-${applicantTone(item.status)}`">{{ applicantStatusText(item.status) }}</text>
							</view>
							<text class="applicant-message">{{ item.message }}</text>
							<view class="applicant-foot">
								<text class="applicant-quote">
									{{ item.quoteAmount != null ? t('workspace.applicantQuote', { amount: formatAmount(item.quoteAmount) }) : t('workspace.applicantNoQuote') }}
								</text>
								<text class="applicant-time">{{ formatRelativeTime(item.createdAt, Date.now(), t) }}</text>
							</view>
							<view class="applicant-actions">
								<template v-if="item.status === 'pending'">
									<view class="mini-btn ghost" :class="{ busy: applicantBusy === item.id }" @click="selectApplicant(item, 'reject')">{{ t('workspace.rejectApplicant') }}</view>
									<view class="mini-btn primary" :class="{ busy: applicantBusy === item.id }" @click="selectApplicant(item, 'accept')">{{ t('workspace.selectApplicant') }}</view>
								</template>
								<template v-else-if="item.status === 'accepted'">
									<view class="mini-btn primary" v-if="orderOfItem(item)" @click="goOrder(orderOfItem(item).id)">{{ t('workspace.goEscrow') }}</view>
									<view class="mini-btn primary" v-else :class="{ busy: orderSubmitting }" @click="openOrderSheet(item)">{{ t('workspace.actionAdvance') }}</view>
								</template>
								<view class="mini-btn ghost" v-else @click="goPostDetail(applicantTarget.post.id)">{{ t('workspace.actionDetail') }}</view>
							</view>
						</view>
					</view>
					<view class="sheet-spacer"></view>
				</scroll-view>
			</view>
		</SlideUpPanel>

		<!-- 发起担保交易 -->
		<SlideUpPanel fixed :open="!!orderTarget" :z-index="210" :label="t('workspace.actionAdvance')" @dismiss="closeOrderSheet" @after-close="afterOrderSheetClose">
			<view class="sheet" v-if="orderTarget">
				<view class="sheet-header">
					<text class="sheet-cancel" @click="closeOrderSheet">{{ t('common.cancel') }}</text>
					<text class="sheet-title">{{ t('workspace.actionAdvance') }}</text>
					<text class="sheet-submit" :class="{ disabled: orderSubmitting }" @click="submitOrder">
						{{ orderSubmitting ? t('workspace.orderCreating') : t('escrow.confirm') }}
					</text>
				</view>
				<view class="sheet-body static">
					<text class="order-target">{{ t('workspace.orderTargetLabel', { name: orderTarget.applicant?.name }) }}</text>
					<view class="form-block">
						<text class="form-label">{{ t('workspace.orderAmountLabel') }}</text>
						<input class="form-input" v-model="orderAmount" type="digit" :placeholder="t('workspace.orderAmountPlaceholder')" />
						<text class="form-hint">{{ t('escrow.amountHint') }}</text>
					</view>
					<view class="form-block">
						<text class="form-label">{{ t('workspace.orderRemarkLabel') }}</text>
						<input class="form-input" v-model="orderRemark" maxlength="255" :placeholder="t('workspace.orderRemarkPlaceholder')" />
					</view>
				</view>
			</view>
		</SlideUpPanel>
	</view>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
	getMyDemandHallPostsApi,
	getDemandHallApplicationsApi,
	handleDemandHallApplicationApi,
	createDemandHallOrderApi,
	getDemandHallOrdersApi,
	getDemandHallOrderSummaryApi,
	closeDemandHallPostApi,
	reopenDemandHallPostApi,
	toggleDemandHallCollectApi
} from '@/api/demandHall.js'
import { createChatRequestApi, getChatRequestStatusApi } from '@/api/chat.js'
import { t } from '@/utils/localeRuntime.js'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import {
	formatPriceLabel,
	formatRelativeTime,
	buildCardBadges,
	categoryLabel,
	applicationStatusMeta
} from '@/utils/demandHallPresentation.js'
import {
	WORKSPACE_ROLE_BY_TAB,
	WORKSPACE_TABS,
	buildMyPostGroups,
	buildReputationSummary,
	formatAmount,
	myPostActions,
	myPostStatusMeta,
	workspaceEmptyState
} from '@/utils/demandHallWorkspace.js'

const PAGE_SIZE = 10

const tabs = computed(() => WORKSPACE_TABS.map(tab => ({ ...tab, label: tabLabel(tab.key) })))
const postKinds = computed(() => [
	{ key: 'demand', label: t('workspace.kindDemand') },
	{ key: 'service', label: t('workspace.kindService') }
])

function tabLabel(key) {
	if (key === 'posts') return t('workspace.tabPosts')
	if (key === 'applies') return t('workspace.tabApplies')
	return t('workspace.tabCollections')
}

const activeTab = ref('posts')
const postKind = ref('demand')

/* ============ 列表状态 ============ */
const posts = ref([])
const applications = ref([])
const collections = ref([])
const orders = ref([])
// 收支 / 单量的服务端聚合结果；接口失败时保持 null，看板退回本地估算。
const orderSummary = ref(null)
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const loadError = ref(false)
const loadMoreError = ref(false)
// 收藏列表同时供统计看板使用，它失败时不能静默当成「没有收藏」，否则看板数字会不对。
const collectionError = ref(false)
const hasMore = ref(true)
const currentPage = ref(0)
const scrollTop = ref(0)

const currentUserId = computed(() => Number(uni.getStorageSync('USER_INFO')?.id) || 0)

/** 我发布的：按子分类过滤后套上状态角标与管理按钮。 */
const myPostItems = computed(() => {
	const groups = buildMyPostGroups(posts.value, orders.value)
	return groups
		.filter(group => group.post.type === postKind.value)
		.map(group => ({
			...group,
			statusMeta: myPostStatusMeta(group.post, { hasActiveOrder: group.orders.some(order => ['created', 'funded', 'delivered'].includes(order.status)), t }),
			actions: myPostActions(group.post, { orderCount: group.post.applyCount, t })
		}))
})

const applyItems = computed(() => applications.value.map(item => ({
	...item,
	statusMeta: applicationStatusMeta(item.status, t) || { text: item.status, tone: 'muted' }
})))

/**
 * 当前 Tab 的列表数据。
 * 统一成数组让模板只写一份分支判断，避免三个 Tab 各写一遍空状态与加载态。
 */
const currentList = computed(() => {
	if (activeTab.value === 'posts') return myPostItems.value
	if (activeTab.value === 'applies') return applyItems.value
	return collections.value
})

const tabCounts = computed(() => ({
	posts: posts.value.length,
	applies: applications.value.length,
	collections: collections.value.length
}))

const reputation = computed(() => buildReputationSummary({
	posts: posts.value,
	orders: orders.value,
	accountLevel: Number(uni.getStorageSync('USER_INFO')?.accountLevel || uni.getStorageSync('USER_INFO')?.account_level || 0),
	userId: currentUserId.value,
	// 收支与单量以服务端聚合为准，本地订单只是当前页帖子的子集。
	summary: orderSummary.value
}))

const emptyState = computed(() => {
	const base = workspaceEmptyState({ tab: activeTab.value, kind: postKind.value })
	// 空状态文案走语言系统，逻辑层只负责判断「哪种空」，文案键在这里映射。
	const keyMap = {
		posts: postKind.value === 'service' ? 'workspace.emptyPostsService' : 'workspace.emptyPostsDemand',
		applies: 'workspace.emptyApplies',
		collections: 'workspace.emptyCollections'
	}
	const hintMap = {
		posts: postKind.value === 'service' ? 'workspace.emptyPostsServiceHint' : 'workspace.emptyPostsDemandHint',
		applies: 'workspace.emptyAppliesHint',
		collections: 'workspace.emptyCollectionsHint'
	}
	return { title: t(keyMap[activeTab.value]), hint: t(hintMap[activeTab.value]), fallbackTitle: base.title }
})

function avatarOf(user) {
	if (user?.avatar) return user.avatar
	return `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(user?.name || 'user')}`
}

/* ============ 数据加载 ============ */
async function fetchTab(tabKey, page) {
	const role = WORKSPACE_ROLE_BY_TAB[tabKey]
	const data = await getMyDemandHallPostsApi({ role, page, pageSize: PAGE_SIZE })
	if (tabKey === 'posts' || tabKey === 'collections') {
		return { list: Array.isArray(data?.posts) ? data.posts : [], hasMore: !!data?.hasMore }
	}
	return { list: Array.isArray(data?.applications) ? data.applications : [], hasMore: !!data?.hasMore }
}

/**
 * 「我发布的」关联的托管订单：只取当前已加载帖子对应的订单。
 * 后端 GET /orders 支持 postIds 过滤，这样既不会因为默认条数上限漏单，
 * 也不用把全部订单拉到前端再匹配。
 */
async function fetchOrdersForPosts() {
	const postIds = posts.value.map(post => Number(post.id)).filter(Boolean)
	if (!postIds.length) return []
	const data = await getDemandHallOrdersApi({ postIds: postIds.join(','), pageSize: 50 })
	return Array.isArray(data?.orders) ? data.orders : []
}

async function loadList({ reset = false } = {}) {
	const page = reset ? 1 : currentPage.value + 1
	if (!reset && !hasMore.value) return
	if (!reset) loadingMore.value = true
	loadMoreError.value = false
	try {
		// 看板数字来自服务端聚合；收藏列表也要跟着刷新，避免三个 Tab 的数字对不上。
		const [target, summaryData, collectionData] = await Promise.all([
			fetchTab(activeTab.value, page),
			getDemandHallOrderSummaryApi().catch(() => null),
			activeTab.value === 'collections'
				? Promise.resolve(null)
				: fetchTab('collections', 1).catch(() => null)
		])
		if (summaryData) orderSummary.value = summaryData
		if (collectionData) {
			collections.value = collectionData.list
			collectionError.value = false
		} else if (activeTab.value !== 'collections') {
			collectionError.value = true
		}

		const { list, hasMore: more } = target
		if (activeTab.value === 'posts') posts.value = reset ? list : [...posts.value, ...list]
		else if (activeTab.value === 'applies') applications.value = reset ? list : [...applications.value, ...list]
		else collections.value = reset ? list : [...collections.value, ...list]
		hasMore.value = more
		currentPage.value = page
		loadError.value = false

		// 「我发布的」卡片的交易角标依赖订单，列表本身成功后就补拉一次；
		// 订单失败不影响列表渲染，只是角标退回「招募中」。
		if (activeTab.value === 'posts') {
			orders.value = await fetchOrdersForPosts().catch(() => orders.value)
		}
	} catch (error) {
		if (reset) {
			loadError.value = true
			hasMore.value = false
		} else {
			loadMoreError.value = true
		}
	} finally {
		loading.value = false
		loadingMore.value = false
		refreshing.value = false
	}
}

function reload() {
	currentPage.value = 0
	hasMore.value = true
	loadError.value = false
	return loadList({ reset: true })
}

function onRefresh() {
	refreshing.value = true
	void reload()
}

function onLoadMore() {
	void loadList()
}

/**
 * 切换 Tab 时把列表滚回顶部。
 * 列表高度变化时旧的 scrollTop 会被钳位，视觉上就是“页面震一下”。
 */
async function resetListScroll() {
	await nextTick()
	scrollTop.value = scrollTop.value === 0 ? 0.0001 : 0
	await nextTick()
	scrollTop.value = 0
}

function switchTab(key) {
	if (activeTab.value === key) return
	activeTab.value = key
	// 切 Tab 后列表内容完全不同，先回到骨架屏再拉数据，避免展示上一个 Tab 的卡片。
	loading.value = true
	void resetListScroll()
	reload()
}

function switchPostKind(key) {
	if (postKind.value === key) return
	postKind.value = key
	void resetListScroll()
}

/* ============ 我发布的管理动作 ============ */
function onPostAction(item, action) {
	if (action.action === 'applications') {
		openApplicants(item.post)
		return
	}
	if (action.action === 'edit') {
		goEditPost(item.post.id)
		return
	}
	if (action.action === 'close') {
		void updatePostStatus(item.post, true)
		return
	}
	if (action.action === 'reopen') {
		void updatePostStatus(item.post, false)
	}
}

/**
 * 修改走信息流页的发布抽屉（同一套字段与校验），带上 editId 过去即可回填；
 * 提交成功后返回这里，工作台的列表会重新拉取。
 */
function goEditPost(id) {
	if (!id) return
	uni.navigateTo({ url: `/pages/demandhall/index?editId=${id}` })
}

async function updatePostStatus(post, shouldClose) {
	const confirmed = await confirmDialog({
		title: shouldClose ? t('workspace.closeConfirmTitle') : t('workspace.reopenConfirmTitle'),
		content: shouldClose ? t('workspace.closeConfirmContent') : t('workspace.reopenConfirmContent')
	})
	if (!confirmed) return
	try {
		if (shouldClose) {
			await closeDemandHallPostApi(post.id)
			post.status = 'closed'
			uni.showToast({ title: t('workspace.closeDone'), icon: 'success' })
		} else {
			const result = await reopenDemandHallPostApi(post.id)
			post.status = result?.post?.status || 'active'
			uni.showToast({ title: t('workspace.reopenDone'), icon: 'success' })
		}
		await reload()
	} catch (error) { /* 请求层已提示 */ }
}

/* ============ 报名者管理面板 ============ */
const applicantTarget = ref(null)
const applicants = ref([])
const applicantsLoading = ref(false)
const applicantsError = ref(false)
const applicantBusy = ref(0)
const orderSubmitting = ref(false)

const applicantsCountText = computed(() => t('workspace.applicationsCount', { count: applicants.value.length }))

function applicantTone(status) {
	return status === 'accepted' ? 'done' : status === 'pending' ? 'pending' : 'muted'
}

function applicantStatusText(status) {
	const key = { pending: 'workspace.applicantPending', accepted: 'workspace.applicantAccepted', rejected: 'workspace.applicantRejected', cancelled: 'workspace.applicantCancelled' }[status]
	return key ? t(key) : t('workspace.applicantPending')
}

/** 该报名者对应的托管订单：已发起过就直接进入订单页，不重复创建。 */
function orderOfItem(item) {
	const postId = applicantTarget.value?.post?.id
	if (postId == null) return null
	return orders.value.find(order =>
		Number(order.postId) === Number(postId) &&
		[order.buyerUserId, order.sellerUserId].includes(Number(item.applicantUserId))
	) || null
}

async function openApplicants(post) {
	applicantTarget.value = { post }
	applicants.value = []
	applicantsError.value = false
	applicantsLoading.value = true
	await loadApplicants()
}

async function loadApplicants() {
	const postId = applicantTarget.value?.post?.id
	if (!postId) return
	applicantsLoading.value = true
	applicantsError.value = false
	try {
		const data = await getDemandHallApplicationsApi(postId)
		applicants.value = Array.isArray(data?.applications) ? data.applications : []
	} catch (error) {
		// 请求失败不能显示成「还没有人报名」，否则发布者会以为无人应答。
		applicants.value = []
		applicantsError.value = true
	} finally {
		applicantsLoading.value = false
	}
}

function closeApplicants() {
	applicantTarget.value = null
	applicants.value = []
	applicantsError.value = false
	applicantBusy.value = 0
}

async function selectApplicant(item, action) {
	if (applicantBusy.value) return
	applicantBusy.value = item.id
	try {
		await handleDemandHallApplicationApi(item.id, { action })
		uni.showToast({ title: action === 'accept' ? t('workspace.applicantSelected') : t('common.confirm'), icon: 'success' })
		// 选定需求后帖子会被结单，这里同步刷新面板与列表状态角标。
		await Promise.all([loadApplicants(), reload()])
	} catch (error) { /* 请求层已提示 */ } finally {
		applicantBusy.value = 0
	}
}

/* ============ 发起担保交易 ============ */
const orderTarget = ref(null)
const orderAmount = ref('')
const orderRemark = ref('')

function openOrderSheet(item) {
	orderTarget.value = item
	orderAmount.value = item.quoteAmount != null ? String(item.quoteAmount) : (applicantTarget.value?.post?.price != null ? String(applicantTarget.value.post.price) : '')
	orderRemark.value = ''
}

function closeOrderSheet() {
	orderTarget.value = null
}

function afterOrderSheetClose() {
	orderAmount.value = ''
	orderRemark.value = ''
	orderSubmitting.value = false
}

async function submitOrder() {
	if (orderSubmitting.value || !orderTarget.value) return
	const amount = Number(orderAmount.value)
	if (!Number.isFinite(amount) || amount <= 0) {
		uni.showToast({ title: t('workspace.orderAmountInvalid'), icon: 'none' })
		return
	}
	orderSubmitting.value = true
	try {
		const result = await createDemandHallOrderApi({
			postId: applicantTarget.value.post.id,
			counterpartyUserId: orderTarget.value.applicantUserId,
			amount,
			remark: orderRemark.value.trim()
		})
		const orderId = result?.orderId
		closeOrderSheet()
		uni.showToast({ title: t('workspace.orderCreated'), icon: 'success' })
		await reload()
		if (orderId) uni.navigateTo({ url: `/pages/demandhall/orderDetail?id=${orderId}` })
	} catch (error) {
		orderSubmitting.value = false
	}
}

/* ============ 收藏 / 沟通 / 跳转 ============ */
async function toggleCollect(post) {
	const previous = post.isCollected
	post.isCollected = !previous
	// 收藏列表里取消收藏后直接把卡片移除，避免留在列表里却显示「取消收藏」。
	collections.value = collections.value.filter(item => item.id !== post.id)
	try {
		await toggleDemandHallCollectApi(post.id)
	} catch (error) {
		post.isCollected = previous
		reload()
	}
}

function buildContactMessage(post) {
	// 预填的私聊文案同样要走语言系统，否则英文 / 俄语界面下会发出中文消息。
	const link = `pages/demandhall/detail?id=${post?.id}`
	return `${t('demandHall.contactCardPrefix', { title: post?.title || '' })}\n${t('workspace.contactCardLink', { link })}`
}

async function contactOwner(post) {
	if (!post) return
	try {
		const status = await getChatRequestStatusApi(post.userId)
		if (status?.status === 'approved' && status.groupId) {
			uni.navigateTo({ url: `/pages/chat/chatRoom?id=${status.groupId}` })
			return
		}
		if (status?.status === 'pending' || status?.status === 'processing') {
			uni.showToast({ title: t('workspace.contactPending'), icon: 'none' })
			return
		}
		uni.showModal({
			title: t('workspace.contactTitle'),
			editable: true,
			placeholderText: t('workspace.contactPlaceholder'),
			content: buildContactMessage(post),
			confirmText: t('workspace.contactSend'),
			success: async ({ confirm, content }) => {
				if (!confirm) return
				try {
					await createChatRequestApi({ targetUserId: post.userId, message: (content || buildContactMessage(post)).slice(0, 500) })
					uni.showToast({ title: t('workspace.contactSent'), icon: 'success' })
				} catch (error) { /* 请求层已提示 */ }
			}
		})
	} catch (error) { /* 请求层已提示 */ }
}

function goPostDetail(id) {
	if (!id) return
	uni.navigateTo({ url: `/pages/demandhall/detail?id=${id}` })
}

function goOrder(id) {
	uni.navigateTo({ url: `/pages/demandhall/orderDetail?id=${id}` })
}

function goDiscover() {
	const url = `/pages/demandhall/index?tab=${postKind.value}`
	// 从入口页进来时直接返回，避免在导航栈里堆叠同一个列表页。
	const stack = typeof getCurrentPages === 'function' ? getCurrentPages() : []
	const previous = stack[stack.length - 2]
	if (previous?.route === 'pages/demandhall/index') {
		uni.navigateBack()
		return
	}
	uni.navigateTo({ url })
}

function goPublish() {
	uni.navigateTo({ url: '/pages/demandhall/index?compose=1' })
}

function confirmDialog({ title, content }) {
	return new Promise(resolve => {
		uni.showModal({
			title,
			content,
			success: ({ confirm }) => resolve(confirm),
			fail: () => resolve(false)
		})
	})
}

onLoad(options => {
	if (options?.tab && WORKSPACE_TABS.some(tab => tab.key === options.tab)) activeTab.value = options.tab
	void reload()
})

onShow(() => {
	// 从订单页 / 详情页返回时同步订单状态与状态角标。
	if (currentPage.value > 0) void reload()
})
</script>

<style scoped lang="scss">
// 与首页 index360 统一的品牌色板
$brand-yellow: var(--bless-primary, #C2A052);
$brand-soft: var(--bless-soft, #F1E4BD);
$brand-ink: var(--bless-text, #775E25);
$text-main: #292825;
$text-sub: #8b8984;
$text-muted: #a49c8d;
$gray-bg: #f4f3f1;
$line-color: #f0eeea;

.container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: #f6f5f2;
	position: relative;
}

/* ============ 顶部 ============ */
.hero {
	flex-shrink: 0;
	padding: 20rpx 30rpx 0;
	background: #f6f5f2;
}

.hero-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
}

.hero-copy {
	flex: 1;
	min-width: 0;
}

.hero-title {
	display: block;
	font-size: 40rpx;
	font-weight: bold;
	color: $text-main;
	letter-spacing: 1rpx;
}

.hero-subtitle {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: $text-sub;
}

.hero-back {
	display: flex;
	align-items: center;
	gap: 6rpx;
	flex-shrink: 0;
	height: 56rpx;
	padding: 0 20rpx;
	border-radius: 28rpx;
	background: $gray-bg;
	font-size: 22rpx;
	color: #666666;
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.97);
	}
}

/* ============ 统计看板 ============ */
.board {
	margin-top: 22rpx;
	padding: 24rpx 24rpx 20rpx;
	border-radius: 22rpx;
	background: $gray-bg;
}

.board-verify {
	display: inline-flex;
	align-items: center;
	gap: 8rpx;
	padding: 8rpx 20rpx;
	border-radius: 24rpx;
	background: #ecebe7;
	color: #6f6a63;

	&.verified {
		background: $brand-soft;
		color: $brand-ink;
	}
}

.board-verify-text {
	font-size: 22rpx;
	font-weight: 600;
}

.board-grid {
	display: flex;
	margin-top: 20rpx;
}

.board-cell {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6rpx;
	min-width: 0;
}

.board-value {
	font-size: 30rpx;
	font-weight: bold;
	color: $text-main;

	&.muted {
		font-size: 24rpx;
		color: $text-sub;
		font-weight: 600;
	}
}

.board-label {
	font-size: 20rpx;
	color: $text-sub;
	text-align: center;
}

.board-ongoing {
	display: block;
	margin-top: 16rpx;
	padding-top: 16rpx;
	border-top: 1rpx solid $line-color;
	font-size: 21rpx;
	color: #b26b00;
	font-weight: 600;
}

.board-hint {
	display: block;
	margin-top: 12rpx;
	font-size: 20rpx;
	color: $text-sub;
	line-height: 1.5;
}

/* ============ Tab ============ */
.tab-bar {
	display: flex;
	gap: 4rpx;
	margin-top: 22rpx;
	padding: 4rpx;
	border-radius: 24rpx;
	background: #f0eeea;
}

.tab-item {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	height: 70rpx;
	border-radius: 20rpx;
	transition: background 0.2s;

	&.active {
		background: $brand-yellow;
		box-shadow: 0 4rpx 12rpx rgba(194,160,82,0.35);

		.tab-label {
			color: $brand-ink;
			font-weight: 650;
		}

		.tab-count {
			background: rgba(119, 94, 37, .14);
			color: $brand-ink;
		}
	}
}

.tab-label {
	font-size: 26rpx;
	color: $text-sub;
	font-weight: 600;
}

.tab-count {
	min-width: 36rpx;
	height: 32rpx;
	padding: 0 10rpx;
	border-radius: 16rpx;
	background: #f0eeea;
	color: $text-sub;
	font-size: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.kind-bar {
	display: flex;
	gap: 14rpx;
	margin-top: 18rpx;
}

.kind-chip {
	padding: 10rpx 30rpx;
	border-radius: 28rpx;
	background: $gray-bg;
	font-size: 23rpx;
	color: #666666;
	transition: background 0.2s;

	&.active {
		background: $brand-soft;
		color: $brand-ink;
		font-weight: 600;
	}
}

/* ============ 列表 ============ */
.content-scroll {
	flex: 1;
	overflow: hidden;
}

.card-list {
	padding: 18rpx 30rpx 0;
}

.card {
	position: relative;
	background: #fff;
	border-radius: 20rpx;
	padding: 30rpx 26rpx 26rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.05);
	border-left: 8rpx solid $brand-yellow;
}

.demand-card {
	border-left-color: $brand-yellow;
}

.service-card {
	border-left-color: $brand-soft;
}

/* 状态角标：招募中 / 进行中 / 已完结 / 已关闭 */
.card-status {
	position: absolute;
	top: 0;
	right: 0;
	padding: 8rpx 22rpx;
	border-radius: 0 20rpx 0 20rpx;
	font-size: 21rpx;
	font-weight: 600;
	background: #ecebe7;
	color: #6f6a63;

	&.tone-recruiting {
		background: $brand-soft;
		color: $brand-ink;
	}

	&.tone-ongoing {
		background: #eaf2ff;
		color: #2f7cf6;
	}

	&.tone-completed {
		background: #e9f7ef;
		color: #1f9d55;
	}

	&.tone-closed,
	&.tone-muted {
		background: #ecebe7;
		color: #6f6a63;
	}

	&.tone-pending {
		background: #fff1e8;
		color: #f2542d;
	}

	&.tone-done {
		background: #e9f7ef;
		color: #1f9d55;
	}
}

.card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
	// 给右上角状态角标留出空间
	padding-right: 130rpx;
}

.card-title {
	flex: 1;
	font-size: 30rpx;
	font-weight: bold;
	color: $text-main;
	line-height: 1.42;
}

.card-desc {
	margin-top: 12rpx;
	font-size: 25rpx;
	color: #666666;
	line-height: 1.55;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
}

.price-tag {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	padding: 8rpx 20rpx;
	border-radius: 24rpx;
	background: $brand-yellow;
	color: $brand-ink;

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
	margin-top: 18rpx;
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

.badge-online {
	background: #e9f7ef;
	color: #1f9d55;
}

.badge-location {
	background: $gray-bg;
	color: #666666;
}

.badge-verified {
	background: rgba(194,160,82,0.28);
	color: $text-main;
}

.badge-tag {
	background: $gray-bg;
	color: #8a8a8f;
}

.badge-muted {
	background: #ecebe7;
	color: #6f6a63;
	font-weight: 600;
}

.badge-neutral {
	background: $gray-bg;
	color: #666666;
}

.card-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10rpx;
	margin-top: 18rpx;
	font-size: 22rpx;
	color: $text-sub;
}

.meta-divider {
	color: #d8d8dc;
}

.meta-apply {
	margin-left: auto;
	color: $text-sub;
}

.card-actions {
	display: flex;
	align-items: center;
	gap: 14rpx;
	margin-top: 22rpx;
	padding-top: 20rpx;
	border-top: 1rpx solid $line-color;
}

.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	height: 68rpx;
	border-radius: 34rpx;
	font-size: 24rpx;
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.97);
	}

	&.ghost {
		flex: 1;
		background: $gray-bg;
		color: #666666;
	}

	&.primary {
		flex: 1.4;
		background: $brand-soft;
		color: $brand-ink;
		font-weight: bold;
	}
}

.list-footer {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	padding: 26rpx 0;
	font-size: 23rpx;
	color: #b8bdc9;

	&.tappable {
		color: #b26b00;
		font-weight: 600;
	}
}

.scroll-spacer {
	height: 200rpx;
}

/* ============ 骨架屏 / 状态块 ============ */
.skeleton-card {
	background: #fff;
	border-radius: 20rpx;
	padding: 26rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.skeleton-line {
	height: 24rpx;
	border-radius: 12rpx;
	background: #f0f1f5;
	margin-bottom: 16rpx;

	&.wide {
		width: 70%;
		height: 30rpx;
	}

	&.short {
		width: 40%;
	}
}

.skeleton-actions {
	display: flex;
	gap: 16rpx;
	margin-top: 22rpx;
}

.skeleton-pill {
	flex: 1;
	height: 60rpx;
	border-radius: 30rpx;
	background: $gray-bg;
}

.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 18rpx;
	padding: 160rpx 60rpx;
}

.state-title {
	font-size: 26rpx;
	color: #666666;
	text-align: center;
}

.state-btn {
	margin-top: 8rpx;
	padding: 14rpx 44rpx;
	border-radius: 32rpx;
	background: $brand-yellow;
	color: $brand-ink;
	font-size: 25rpx;
	font-weight: 600;
}

/* ============ 空状态 ============ */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16rpx;
	padding: 120rpx 60rpx;
}

.empty-title {
	font-size: 28rpx;
	color: #666666;
	font-weight: 600;
}

.empty-hint {
	font-size: 23rpx;
	color: $text-sub;
	text-align: center;
	line-height: 1.6;
}

.empty-actions {
	display: flex;
	gap: 18rpx;
	margin-top: 14rpx;
}

.empty-btn {
	padding: 14rpx 44rpx;
	border-radius: 32rpx;
	font-size: 25rpx;
	font-weight: 600;
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.97);
	}

	&.primary {
		background: $brand-soft;
		color: $brand-ink;
	}

	&.ghost {
		background: $gray-bg;
		color: #666666;
	}
}

/* ============ 悬浮发布按钮 ============ */
.fab {
	position: fixed;
	right: 32rpx;
	--app-fixed-bottom-base: calc(env(safe-area-inset-bottom) + 60rpx);
	bottom: calc(var(--app-fixed-bottom-base) + var(--app-viewport-bottom-offset, 0px));
	z-index: 90;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	width: 150rpx;
	height: 92rpx;
	border-radius: 46rpx;
	background: $brand-yellow;
	box-shadow: 0 8rpx 20rpx rgba(194, 160, 82, .38);
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.97);
	}
}

.fab-text {
	font-size: 27rpx;
	color: $brand-ink;
	font-weight: 600;
}

/* ============ 底部抽屉（SlideUpPanel 内容） ============ */
.sheet {
	width: 100%;
	background: #fff;
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

.sheet-head-copy {
	flex: 1;
	min-width: 0;
}

.sheet-title {
	display: block;
	font-size: 30rpx;
	font-weight: bold;
	color: $text-main;
}

.sheet-subtitle {
	display: block;
	margin-top: 6rpx;
	font-size: 21rpx;
	color: $text-sub;
}

.sheet-cancel,
.sheet-close {
	font-size: 27rpx;
	color: $text-sub;
}

.sheet-submit {
	font-size: 26rpx;
	color: $brand-ink;
	font-weight: 600;
	background: $brand-yellow;
	padding: 8rpx 26rpx;
	border-radius: 30rpx;

	&.disabled {
		background: $gray-bg;
		color: #c0c0c0;
	}
}

.sheet-body {
	flex: 1;
	min-height: 0;
	padding: 22rpx 28rpx;

	&.static {
		padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
	}
}

.sheet-spacer {
	height: 40rpx;
}

.applicant-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	padding: 80rpx 0;
	font-size: 24rpx;
	color: $text-sub;
	text-align: center;

	// 失败态是「说明 + 重试按钮」，竖排避免长语言下挤在一行。
	&.is-column {
		flex-direction: column;
		gap: 20rpx;
		padding: 60rpx 24rpx;
		overflow-wrap: anywhere;
	}
}

.applicant-item {
	display: flex;
	gap: 18rpx;
	padding: 24rpx 0;
	border-bottom: 1rpx solid $line-color;

	&:last-child {
		border-bottom: none;
	}
}

.applicant-avatar {
	width: 74rpx;
	height: 74rpx;
	border-radius: 50%;
	background: #ece9e2;
	flex-shrink: 0;
}

.applicant-body {
	flex: 1;
	min-width: 0;
}

.applicant-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}

.applicant-name {
	font-size: 26rpx;
	font-weight: 600;
	color: $text-main;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.applicant-status {
	flex-shrink: 0;
	padding: 4rpx 16rpx;
	border-radius: 18rpx;
	font-size: 20rpx;
	background: #ecebe7;
	color: #6f6a63;

	&.tone-pending {
		background: #fff1e8;
		color: #f2542d;
	}

	&.tone-done {
		background: #e9f7ef;
		color: #1f9d55;
	}
}

.applicant-message {
	display: block;
	margin-top: 10rpx;
	font-size: 24rpx;
	color: #6f6a63;
	line-height: 1.6;
	overflow-wrap: anywhere;
}

.applicant-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
	margin-top: 12rpx;
	font-size: 21rpx;
	color: $text-sub;
}

.applicant-quote {
	color: #b26b00;
	font-weight: 600;
}

.applicant-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
	margin-top: 16rpx;
}

.mini-btn {
	padding: 12rpx 30rpx;
	border-radius: 26rpx;
	font-size: 24rpx;
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.97);
	}

	&.busy {
		opacity: 0.6;
	}

	&.ghost {
		background: $gray-bg;
		color: #666666;
	}

	&.primary {
		background: $brand-soft;
		color: $brand-ink;
		font-weight: 600;
	}
}

.order-target {
	display: block;
	margin-bottom: 22rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: $text-main;
}

.form-block {
	margin-bottom: 30rpx;
}

.form-label {
	display: block;
	margin-bottom: 14rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: $text-main;
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

.form-hint {
	display: block;
	margin-top: 12rpx;
	font-size: 21rpx;
	color: $text-sub;
	line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
	.hero-back,
	.tab-item,
	.kind-chip,
	.action-btn,
	.empty-btn,
	.mini-btn,
	.fab {
		transition: none;
	}

	.hero-back:active,
	.action-btn:active,
	.empty-btn:active,
	.mini-btn:active,
	.fab:active {
		transform: none;
	}
}
</style>
