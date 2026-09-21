<template>
	<view class="topics-page app-h5-min-screen">
		<!-- 搜索 + 排序：固定在滚动区上方，滚动话题列表时始终可用 -->
		<view class="topics-toolbar">
			<view class="search-box">
				<uni-icons type="search" size="16" color="#b0b0b0"></uni-icons>
				<input
					class="search-input"
					:value="keyword"
					:placeholder="t('community.searchPlaceholder')"
					confirm-type="search"
					@input="onKeywordInput"
					@confirm="onKeywordConfirm"
				/>
				<uni-icons v-if="keyword" type="clear" size="16" color="#c0c0c0" @click="clearKeyword"></uni-icons>
			</view>

			<view class="sort-bar">
				<view
					class="sort-item"
					v-for="tab in sortTabs"
					:key="tab.key"
					:class="{ active: activeSort === tab.key }"
					@click="switchSort(tab.key)"
				>{{ tab.label }}</view>
			</view>
		</view>

		<scroll-view
			scroll-y
			class="topics-scroll"
			refresher-enabled
			:refresher-triggered="refreshing"
			refresher-background="#ffffff"
			@refresherrefresh="onRefresh"
			@scrolltolower="onLoadMore"
			lower-threshold="120"
		>
			<!-- 热门话题横向滑动区：搜索时让位给结果，避免两处列表打架 -->
			<view class="hot-section" v-if="showHotSection">
				<view class="section-head">
					<text class="section-title">{{ t('community.hotSectionTitle') }}</text>
					<text class="section-hint">{{ t('community.hotSectionHint') }}</text>
				</view>
				<scroll-view scroll-x class="hot-scroll" show-scrollbar="false">
					<view
						class="hot-card"
						v-for="topic in hotTopics"
						:key="'hot-' + topic.id"
						@click="openTopic(topic)"
					>
						<view class="hot-rank" :class="'tier-' + rankTier(topic.rank)">
							<uni-icons v-if="topic.rank <= 3" type="fire-filled" size="12" color="#ffffff"></uni-icons>
							<text class="hot-rank-text">{{ topic.rank }}</text>
						</view>
						<text class="hot-name">#{{ topic.name }}</text>
						<text class="hot-meta">{{ t('community.postCountText', { count: formatCommunityNumber(topic.postCount) }) }}</text>
						<view
							class="follow-btn compact"
							:class="{ followed: topic.followed, busy: topic.following }"
							@click.stop="toggleFollow(topic)"
						>{{ topic.followed ? t('community.followed') : t('community.follow') }}</view>
					</view>
				</scroll-view>
			</view>

			<!-- 骨架屏：首次进入或切换排序时占位 -->
			<view class="topic-list" v-if="loading">
				<view class="skeleton-card" v-for="i in 4" :key="i">
					<view class="skeleton-icon"></view>
					<view class="skeleton-lines">
						<view class="skeleton-line short"></view>
						<view class="skeleton-line shorter"></view>
					</view>
				</view>
			</view>

			<!-- 请求失败：保留可恢复操作，且不把服务错误伪装成空数据 -->
			<view class="state-block" v-else-if="loadFailed">
				<uni-icons type="refresh" size="90" color="#e5e5e5"></uni-icons>
				<text class="state-title">{{ t('community.loadFailed') }}</text>
				<view class="state-btn" @click="reload({ showSkeleton: true })">{{ t('community.retry') }}</view>
			</view>

			<!-- 搜索无结果 -->
			<view class="state-block" v-else-if="!topics.length && isSearching">
				<uni-icons type="search" size="90" color="#e5e5e5"></uni-icons>
				<text class="state-title">{{ t('community.searchEmpty') }}</text>
				<text class="state-hint">{{ t('community.searchEmptyHint') }}</text>
				<view class="state-btn" @click="openCreateModal">{{ t('community.createEntry') }}</view>
			</view>

			<!-- “我关注的”为空：引导去发现热门话题 -->
			<view class="state-block" v-else-if="!topics.length && activeSort === 'following'">
				<uni-icons type="star" size="90" color="#e5e5e5"></uni-icons>
				<text class="state-title">{{ t('community.followingEmpty') }}</text>
				<text class="state-hint">{{ t('community.followingEmptyHint') }}</text>
				<view class="state-btn" @click="switchSort('hot')">{{ t('community.gotoHotTopics') }}</view>
			</view>

			<!-- 普通空状态 -->
			<view class="state-block" v-else-if="!topics.length">
				<uni-icons type="chatboxes-filled" size="90" color="#e5e5e5"></uni-icons>
				<text class="state-title">{{ t('community.topicsEmpty') }}</text>
				<text class="state-hint">{{ t('community.topicsEmptyHint') }}</text>
				<view class="state-btn" @click="openCreateModal">{{ t('community.createEntry') }}</view>
			</view>

			<view class="topic-list" v-else>
				<view class="topic-card" v-for="topic in topics" :key="topic.id" @click="openTopic(topic)">
					<view class="topic-icon" :style="{ backgroundColor: topic.color + '1f' }">
						<uni-icons :type="topic.icon" size="20" :color="topic.color"></uni-icons>
					</view>
					<view class="topic-main">
						<view class="topic-name-row">
							<text class="topic-name">#{{ topic.name }}</text>
							<text class="trend-tag" v-if="showTrend(topic)">🔺 {{ t('community.trendRising', { percent: topic.trend.deltaPercent }) }}</text>
						</view>
						<text class="topic-desc" v-if="topic.description">{{ topic.description }}</text>
						<view class="topic-meta">
							<text>{{ t('community.postCountText', { count: formatCommunityNumber(topic.postCount) }) }}</text>
							<text class="meta-dot">·</text>
							<text>{{ t('community.followerCountText', { count: formatCommunityNumber(topic.followerCount) }) }}</text>
						</view>
					</view>
					<view
						class="follow-btn"
						:class="{ followed: topic.followed, busy: topic.following }"
						@click.stop="toggleFollow(topic)"
					>{{ topic.followed ? t('community.followed') : t('community.follow') }}</view>
				</view>

				<view class="create-entry" @click="openCreateModal">{{ t('community.createEntry') }}</view>

				<view class="load-more-tip" v-if="loadingMore">
					<uni-icons type="spinner-cycle" size="14" color="#bbb"></uni-icons>
					<text>{{ t('community.loadingMore') }}</text>
				</view>
				<view class="load-more-tip retry" v-else-if="loadMoreFailed" @click="loadMore">{{ t('community.retry') }}</view>
				<view class="no-more-tip" v-else-if="!hasMore">{{ t('community.noMore') }}</view>
			</view>

			<view class="scroll-bottom-spacer"></view>
		</scroll-view>

		<!-- 创建话题弹窗 -->
		<view class="modal-mask" v-if="showCreateModal" @click="closeCreateModal">
			<view class="create-modal" @click.stop>
				<text class="modal-title">{{ t('community.createTitle') }}</text>
				<input
					class="modal-input"
					v-model="createForm.name"
					:placeholder="t('community.createNamePlaceholder')"
					maxlength="20"
					confirm-type="done"
				/>
				<input
					class="modal-input"
					v-model="createForm.description"
					:placeholder="t('community.createDescPlaceholder')"
					maxlength="200"
				/>
				<view class="modal-actions">
					<view class="modal-btn ghost" @click="closeCreateModal">{{ t('common.cancel') }}</view>
					<view
						class="modal-btn primary"
						:class="{ disabled: !createForm.name.trim() || creating }"
						@click="submitCreateTopic"
					>{{ creating ? t('community.creating') : t('community.createSubmit') }}</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
	getCommunityTopicsApi,
	getCommunityHotTopicsApi,
	toggleCommunityTopicFollowApi,
	createCommunityTopicApi
} from '@/api/community.js'
import { isLoggedIn } from '@/utils/auth.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import {
	COMMUNITY_TOPICS_ROUTE,
	communityTopicRoute,
	ensureCommunityLogin,
	formatCommunityNumber,
	rankTier
} from '@/utils/communityHub.js'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

const loading = ref(true)
const refreshing = ref(false)
const loadingMore = ref(false)
const loadMoreFailed = ref(false)
const loadFailed = ref(false)
const topics = ref([])
const hotTopics = ref([])
const activeSort = ref('hot')
const keyword = ref('')
const page = ref(0)
const total = ref(0)
const hasMore = ref(false)
const showCreateModal = ref(false)
const creating = ref(false)
const createForm = ref({ name: '', description: '' })
// “我关注的”只对已登录用户开放，未登录时不展示该 Tab
const loggedIn = ref(true)
const mounted = ref(false)

let searchTimer = null

const sortTabs = computed(() => ([
	{ key: 'hot', label: t('community.sortHot') },
	{ key: 'latest', label: t('community.sortLatest') },
	{ key: 'following', label: t('community.sortFollowing') }
]).filter(tab => tab.key !== 'following' || loggedIn.value))

const isSearching = computed(() => keyword.value.trim().length > 0)
// 热门横滑区只在“热门”Tab 且没有搜索词时出现，避免和搜索结果重复展示
const showHotSection = computed(() => !isSearching.value && activeSort.value === 'hot' && hotTopics.value.length > 0)

function showTrend(topic) {
	const trend = topic?.trend || {}
	return Boolean(trend.rising && Number(trend.deltaPercent) > 0)
}

// 列表项补上交互态：following 表示关注请求进行中，用于防止重复点击
function decorateTopic(topic) {
	return { ...topic, following: false }
}

async function loadTopics({ reset = false, showSkeleton = false } = {}) {
	if (reset) {
		loadFailed.value = false
		loadMoreFailed.value = false
		// 下拉刷新沿用主列表页习惯：保留旧内容，不用骨架屏打断
		if (showSkeleton) loading.value = true
	}
	if (!reset && (!hasMore.value || loadingMore.value)) return
	if (!reset) loadingMore.value = true
	const nextPage = reset ? 1 : page.value + 1

	try {
		const data = await getCommunityTopicsApi({
			page: nextPage,
			pageSize: PAGE_SIZE,
			sort: activeSort.value,
			keyword: keyword.value.trim()
		})
		const list = Array.isArray(data?.topics) ? data.topics.map(decorateTopic) : []
		topics.value = reset ? list : [...topics.value, ...list]
		total.value = Number(data?.total || 0)
		hasMore.value = !!data?.hasMore
		page.value = nextPage
	} catch (e) {
		// 请求层已经提示过失败原因，这里只负责区分首屏失败与加载更多失败
		if (reset) {
			topics.value = []
			total.value = 0
			hasMore.value = false
			loadFailed.value = true
		} else {
			loadMoreFailed.value = true
		}
	} finally {
		loading.value = false
		loadingMore.value = false
	}
}

async function loadHotTopics() {
	try {
		const data = await getCommunityHotTopicsApi({ limit: 8 })
		hotTopics.value = Array.isArray(data?.topics) ? data.topics.map(decorateTopic) : []
	} catch (e) {
		// 热门横滑区失败不影响主列表，保留上一次结果即可
	}
}

function reload({ showSkeleton = false } = {}) {
	page.value = 0
	hasMore.value = true
	return loadTopics({ reset: true, showSkeleton })
}

function onKeywordInput(e) {
	keyword.value = e?.detail?.value ?? ''
	clearTimeout(searchTimer)
	searchTimer = setTimeout(() => reload({ showSkeleton: true }), SEARCH_DEBOUNCE_MS)
}

function onKeywordConfirm(e) {
	keyword.value = e?.detail?.value ?? keyword.value
	clearTimeout(searchTimer)
	reload({ showSkeleton: true })
}

function clearKeyword() {
	clearTimeout(searchTimer)
	keyword.value = ''
	reload({ showSkeleton: true })
}

function switchSort(key) {
	if (activeSort.value === key || loading.value) return
	activeSort.value = key
	reload({ showSkeleton: true })
	uni.vibrateShort?.({ fail: () => {} })
}

async function onRefresh() {
	refreshing.value = true
	try {
		await Promise.all([reload(), loadHotTopics()])
	} finally {
		refreshing.value = false
	}
}

function onLoadMore() {
	if (!hasMore.value || loadingMore.value || !topics.value.length) return
	loadMoreFailed.value = false
	loadTopics()
}

// 同一个话题可能同时出现在热门区和主列表，关注状态要一起同步
function syncFollowState(name, followed, followerCount) {
	for (const list of [topics.value, hotTopics.value]) {
		for (const topic of list) {
			if (topic.name !== name) continue
			topic.followed = followed
			topic.followerCount = followerCount
		}
	}
}

async function toggleFollow(topic) {
	if (topic.following) return
	if (!ensureCommunityLogin(t, COMMUNITY_TOPICS_ROUTE)) return

	const previous = { followed: topic.followed, followerCount: topic.followerCount }
	topic.following = true
	// 先按点击结果即时反馈，服务端返回后再以权威计数覆盖
	topic.followed = !previous.followed
	topic.followerCount = Math.max(0, previous.followerCount + (previous.followed ? -1 : 1))

	try {
		const data = await toggleCommunityTopicFollowApi(topic.name)
		const followed = !!data?.followed
		const followerCount = Number(data?.followerCount || 0)
		syncFollowState(topic.name, followed, followerCount)
		if (followed) uni.vibrateShort?.({ fail: () => {} })
		// “我关注的”里取消关注后该话题不再属于本列表，直接移除
		if (activeSort.value === 'following' && !followed) {
			topics.value = topics.value.filter(item => item.name !== topic.name)
			total.value = Math.max(0, total.value - 1)
		}
	} catch (e) {
		topic.followed = previous.followed
		topic.followerCount = previous.followerCount
		uni.showToast({ title: t('community.followFailed'), icon: 'none' })
	} finally {
		topic.following = false
	}
}

function openTopic(topic) {
	uni.navigateTo({ url: communityTopicRoute(topic.name), fail: () => uni.showToast({ title: t('community.openFailed'), icon: 'none' }) })
}

function openCreateModal() {
	if (!ensureCommunityLogin(t, COMMUNITY_TOPICS_ROUTE)) return
	createForm.value = { name: isSearching.value ? keyword.value.trim() : '', description: '' }
	showCreateModal.value = true
}

function closeCreateModal() {
	if (creating.value) return
	showCreateModal.value = false
}

async function submitCreateTopic() {
	const name = createForm.value.name.trim().replace(/^#+/, '')
	if (!name) {
		uni.showToast({ title: t('community.createNameRequired'), icon: 'none' })
		return
	}
	if (creating.value) return
	creating.value = true
	try {
		await createCommunityTopicApi({ name, description: createForm.value.description.trim() })
		showCreateModal.value = false
		uni.showToast({ title: t('community.createSuccess'), icon: 'success' })
		// 新话题没有帖子，热门区不会出现，直接切到最新并清空搜索让用户看到它
		keyword.value = ''
		activeSort.value = 'latest'
		await Promise.all([reload(), loadHotTopics()])
	} catch (e) {
		// 请求层已提示具体原因（例如“该话题已存在”）
	} finally {
		creating.value = false
	}
}

function updatePageTitle() {
	uni.setNavigationBarTitle({ title: t('community.topicsTitle') })
}

onLoad(options => {
	// 从社区首页入口进来时可能带着默认排序，支持 hot / latest / following
	const sort = typeof options?.sort === 'string' ? options.sort : ''
	if (['hot', 'latest', 'following'].includes(sort)) activeSort.value = sort
	updatePageTitle()
})

onShow(() => {
	// onShow 早于 onMounted 触发，首屏加载交给 onMounted，避免重复请求
	if (!mounted.value) return
	const next = isLoggedIn()
	const changed = next !== loggedIn.value
	loggedIn.value = next
	// 退出登录后停留在“我关注的”会看到空列表，直接退回热门
	if (!next && activeSort.value === 'following') activeSort.value = 'hot'
	if (changed) reload({ showSkeleton: true })
})

onMounted(async () => {
	loggedIn.value = isLoggedIn()
	await Promise.all([loadTopics({ reset: true, showSkeleton: true }), loadHotTopics()])
	mounted.value = true
})

watch(currentLocale, updatePageTitle)
</script>

<style lang="scss" scoped>
// 与首页 / 社区统一的品牌色板
$brand-yellow: var(--bless-primary, #C2A052);
$text-main: #1a1a1a;
$text-sub: #999999;
$gray-bg: #f5f6f8;
$line-color: #f2f2f4;

.topics-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #ffffff;
}

/* ---------- 搜索 + 排序 ---------- */
.topics-toolbar {
	flex-shrink: 0;
	padding: 16rpx 30rpx 12rpx;
	background: #ffffff;

	.search-box {
		display: flex;
		align-items: center;
		gap: 12rpx;
		height: 72rpx;
		padding: 0 26rpx;
		background: $gray-bg;
		border-radius: 36rpx;
	}

	.search-input {
		flex: 1;
		font-size: 27rpx;
		color: $text-main;
	}
}

.sort-bar {
	display: flex;
	gap: 16rpx;
	padding: 20rpx 30rpx 8rpx;

	.sort-item {
		padding: 10rpx 30rpx;
		border-radius: 30rpx;
		background: $gray-bg;
		font-size: 26rpx;
		color: #666666;
		transition: background-color 0.2s ease, color 0.2s ease;

		&.active {
			background: $brand-yellow;
			color: $text-main;
			font-weight: 600;
		}
	}
}

.topics-scroll {
	flex: 1;
	overflow: hidden;
}

.scroll-bottom-spacer {
	height: 120rpx;
}

/* ---------- 热门横滑区 ---------- */
.hot-section {
	padding: 12rpx 0 8rpx;

	.section-head {
		display: flex;
		align-items: baseline;
		gap: 14rpx;
		padding: 0 30rpx 16rpx;
	}

	.section-title {
		font-size: 30rpx;
		font-weight: 700;
		color: $text-main;
	}

	.section-hint {
		font-size: 22rpx;
		color: $text-sub;
	}

	.hot-scroll {
		white-space: nowrap;
		padding: 0 30rpx;
	}

	.hot-card {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-start;
		position: relative;
		width: 260rpx;
		margin-right: 20rpx;
		padding: 26rpx 22rpx 20rpx;
		vertical-align: top;
		background: $gray-bg;
		border-radius: 20rpx;
	}

	.hot-rank {
		position: absolute;
		top: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 4rpx;
		min-width: 56rpx;
		height: 44rpx;
		padding: 0 14rpx;
		border-radius: 0 20rpx 0 20rpx;
		background: #d8d8dc;

		.hot-rank-text {
			font-size: 22rpx;
			font-weight: 700;
			color: #ffffff;
		}

		&.tier-gold {
			background: linear-gradient(135deg, var(--bless-soft, #F1E4BD), var(--bless-pressed, #AA873C));
		}

		&.tier-silver {
			background: linear-gradient(135deg, #d9dee6, #a8b2c0);
		}

		&.tier-bronze {
			background: linear-gradient(135deg, #e8b98a, #c07a3c);
		}

		&.tier-plain {
			background: #c8c8cc;
		}
	}

	.hot-name {
		max-width: 100%;
		font-size: 28rpx;
		font-weight: 700;
		color: $text-main;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.hot-meta {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: $text-sub;
	}
}

/* ---------- 话题列表 ---------- */
.topic-list {
	padding: 12rpx 30rpx 0;
}

.topic-card {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 24rpx 0;
	border-bottom: 1rpx solid $line-color;

	.topic-icon {
		width: 76rpx;
		height: 76rpx;
		border-radius: 22rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.topic-main {
		flex: 1;
		min-width: 0;
	}

	.topic-name-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
		min-width: 0;
	}

	.topic-name {
		font-size: 30rpx;
		font-weight: 700;
		color: $text-main;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.trend-tag {
		flex-shrink: 0;
		padding: 2rpx 12rpx;
		border-radius: 16rpx;
		background: rgba(229, 72, 77, 0.1);
		color: #d9433f;
		font-size: 20rpx;
	}

	.topic-desc {
		display: block;
		margin-top: 8rpx;
		font-size: 24rpx;
		color: #77787d;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.topic-meta {
		display: flex;
		align-items: center;
		gap: 8rpx;
		margin-top: 10rpx;
		font-size: 22rpx;
		color: $text-sub;

		.meta-dot {
			color: #d5d5d8;
		}
	}
}

/* ---------- 关注按钮 ---------- */
.follow-btn {
	flex-shrink: 0;
	min-width: 132rpx;
	padding: 12rpx 26rpx;
	border-radius: 32rpx;
	text-align: center;
	font-size: 24rpx;
	font-weight: 600;
	color: $text-main;
	background: $brand-yellow;
	transition: background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease;

	&.followed {
		background: $gray-bg;
		color: #77787d;
	}

	&.busy {
		opacity: 0.6;
	}

	&.compact {
		margin-top: 18rpx;
		min-width: 0;
		width: 100%;
		padding: 10rpx 0;
	}
}

/* ---------- 骨架屏 ---------- */
.skeleton-card {
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 26rpx 0;
	border-bottom: 1rpx solid $line-color;

	.skeleton-icon {
		width: 76rpx;
		height: 76rpx;
		border-radius: 22rpx;
		background: #eeeef0;
		animation: shimmer 1.4s infinite ease-in-out;
		flex-shrink: 0;
	}

	.skeleton-lines {
		flex: 1;
	}

	.skeleton-line {
		height: 24rpx;
		margin-bottom: 14rpx;
		border-radius: 8rpx;
		background: #eeeef0;
		animation: shimmer 1.4s infinite ease-in-out;

		&.short {
			width: 60%;
		}

		&.shorter {
			width: 35%;
		}
	}
}

@keyframes shimmer {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.5; }
}

/* ---------- 空状态 / 失败状态 ---------- */
.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 140rpx 60rpx;

	.state-title {
		margin: 24rpx 0 10rpx;
		font-size: 30rpx;
		font-weight: 500;
		color: #666666;
		text-align: center;
	}

	.state-hint {
		font-size: 24rpx;
		color: $text-sub;
		text-align: center;
		line-height: 1.6;
	}

	.state-btn {
		margin-top: 32rpx;
		padding: 16rpx 44rpx;
		border-radius: 34rpx;
		background: $brand-yellow;
		color: $text-main;
		font-size: 26rpx;
		font-weight: 600;
	}
}

/* ---------- 创建入口与分页提示 ---------- */
.create-entry {
	margin: 32rpx 0 8rpx;
	padding: 26rpx 0;
	text-align: center;
	font-size: 26rpx;
	font-weight: 600;
	color: var(--bless-text, #775E25);
	background: rgba(194,160,82,0.14);
	border-radius: 20rpx;
}

.load-more-tip,
.no-more-tip {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	padding: 32rpx 0;
	font-size: 24rpx;
	color: $text-sub;

	&.retry {
		color: var(--bless-text, #775E25);
		font-weight: 600;
	}
}

/* ---------- 创建话题弹窗 ---------- */
.modal-mask {
	position: fixed;
	inset: 0;
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 60rpx;
	background: rgba(0, 0, 0, 0.4);
}

.create-modal {
	width: 100%;
	padding: 36rpx 32rpx 28rpx;
	background: #ffffff;
	border-radius: 28rpx;

	.modal-title {
		display: block;
		margin-bottom: 26rpx;
		font-size: 32rpx;
		font-weight: 700;
		color: $text-main;
	}

	.modal-input {
		width: 100%;
		height: 84rpx;
		margin-bottom: 20rpx;
		padding: 0 26rpx;
		background: $gray-bg;
		border-radius: 18rpx;
		font-size: 27rpx;
		color: $text-main;
	}

	.modal-actions {
		display: flex;
		gap: 20rpx;
		margin-top: 12rpx;
	}

	.modal-btn {
		flex: 1;
		padding: 20rpx 0;
		border-radius: 36rpx;
		text-align: center;
		font-size: 27rpx;
		font-weight: 600;

		&.ghost {
			background: $gray-bg;
			color: #666666;
		}

		&.primary {
			background: $brand-yellow;
			color: $text-main;
		}

		&.disabled {
			opacity: 0.5;
		}
	}
}
</style>
