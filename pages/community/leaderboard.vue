<template>
	<view class="leaderboard-page app-h5-min-screen">
		<!-- 榜单类型：热帖榜 / 活跃用户榜 -->
		<view class="type-tabs">
			<view
				class="type-tab"
				v-for="tab in typeTabs"
				:key="tab.key"
				:class="{ active: activeType === tab.key }"
				@click="switchType(tab.key)"
			>
				<uni-icons :type="tab.icon" size="15" :color="activeType === tab.key ? '#1a1a1a' : '#77787d'"></uni-icons>
				<text class="type-label">{{ tab.label }}</text>
			</view>
		</view>

		<!-- 时间范围 + 更新时间说明 -->
		<view class="range-bar">
			<view class="range-pills">
				<view
					class="range-pill"
					v-for="range in rangeTabs"
					:key="range.key"
					:class="{ active: activeRange === range.key }"
					@click="switchRange(range.key)"
				>{{ range.label }}</view>
			</view>
			<text class="refresh-note">{{ refreshNote }}</text>
		</view>

		<scroll-view
			scroll-y
			class="board-scroll"
			:scroll-into-view="scrollIntoView"
			scroll-with-animation
			refresher-enabled
			:refresher-triggered="refreshing"
			refresher-background="#ffffff"
			@refresherrefresh="onRefresh"
			@scrolltolower="onLoadMore"
			lower-threshold="120"
		>
			<!-- 骨架屏：切换榜单 / 时间范围时占位 -->
			<view class="entry-list" v-if="loading">
				<view class="skeleton-row" v-for="i in 5" :key="i">
					<view class="skeleton-rank"></view>
					<view class="skeleton-avatar"></view>
					<view class="skeleton-lines">
						<view class="skeleton-line short"></view>
						<view class="skeleton-line shorter"></view>
					</view>
				</view>
			</view>

			<view class="state-block" v-else-if="loadFailed">
				<uni-icons type="refresh" size="90" color="#e5e5e5"></uni-icons>
				<text class="state-title">{{ t('community.loadFailed') }}</text>
				<view class="state-btn" @click="reload({ showSkeleton: true })">{{ t('community.retry') }}</view>
			</view>

			<!-- 社区刚起步：用引导文案代替空白列表 -->
			<view class="state-block" v-else-if="!entries.length">
				<uni-icons type="medal" size="90" color="#e5e5e5"></uni-icons>
				<text class="state-title">{{ t('community.leaderboardEmpty') }}</text>
				<text class="state-hint">{{ emptyHint }}</text>
				<view class="state-btn" @click="goCommunity">{{ t('community.leaderboardCta') }}</view>
			</view>

			<view class="entry-list" v-else>
				<!-- 热帖榜 -->
				<block v-if="activeType === 'posts'">
					<view
						class="entry-row post-entry"
						v-for="entry in entries"
						:key="'post-' + entry.postId"
						:id="'entry-' + entry.rank"
						:class="'tier-' + rankTier(entry.rank)"
						@click="openPost(entry)"
					>
						<view class="rank-cell">
							<text class="rank-number">{{ entry.rank }}</text>
						</view>
						<view class="post-main">
							<text class="post-excerpt">{{ entry.content }}</text>
							<view class="post-meta">
								<image class="author-avatar" :src="communityAvatarOf(entry)" mode="aspectFill"></image>
								<text class="author-name">{{ entry.username }}</text>
								<view v-if="entry.vip" class="vip-tag">VIP</view>
								<text class="category-tag">{{ entry.category }}</text>
							</view>
							<view class="stat-row">
								<view class="stat-item">
									<uni-icons type="eye" size="13" color="#999999"></uni-icons>
									<text class="stat-text">{{ formatCommunityNumber(entry.viewCount) }}</text>
								</view>
								<view class="stat-item">
									<uni-icons type="heart-filled" size="13" color="#999999"></uni-icons>
									<text class="stat-text">{{ formatCommunityNumber(entry.likeCount) }}</text>
								</view>
								<view class="stat-item">
									<uni-icons type="chatbubble-filled" size="13" color="#999999"></uni-icons>
									<text class="stat-text">{{ formatCommunityNumber(entry.commentCount) }}</text>
								</view>
							</view>
						</view>
						<image v-if="firstImage(entry)" class="post-thumb" :src="firstImage(entry)" mode="aspectFill"></image>
					</view>
				</block>

				<!-- 活跃用户榜 -->
				<block v-else>
					<view
						class="entry-row user-entry"
						v-for="entry in entries"
						:key="'user-' + entry.userId"
						:id="'entry-' + entry.rank"
						:class="'tier-' + rankTier(entry.rank)"
						@click="openProfile(entry)"
					>
						<view class="rank-cell">
							<text class="rank-number">{{ entry.rank }}</text>
						</view>
						<image class="user-avatar" :src="communityAvatarOf(entry)" mode="aspectFill"></image>
						<view class="user-main">
							<view class="user-name-row">
								<text class="user-name">{{ entry.username }}</text>
								<view v-if="entry.vip" class="vip-tag">VIP</view>
								<text class="level-tag">Lv.{{ entry.level }}</text>
							</view>
							<view class="stat-row">
								<text class="stat-pair">{{ t('community.statPost') }} {{ formatCommunityNumber(entry.postCount) }}</text>
								<text class="stat-pair">{{ t('community.statComment') }} {{ formatCommunityNumber(entry.commentCount) }}</text>
								<text class="stat-pair">{{ t('community.statLikeReceived') }} {{ formatCommunityNumber(entry.likeCount) }}</text>
							</view>
						</view>
					</view>
				</block>

				<!-- 数据不足时的冲榜引导，而不是留一片空白 -->
				<view class="board-hint" v-if="!hasEnoughData">{{ t('community.leaderboardEmpty') }}</view>
				<view class="load-more-tip" v-if="loadingMore">
					<uni-icons type="spinner-cycle" size="14" color="#bbb"></uni-icons>
					<text>{{ t('community.loadingMore') }}</text>
				</view>
				<view class="load-more-tip retry" v-else-if="loadMoreFailed" @click="onLoadMore">{{ t('community.retry') }}</view>
				<view class="board-hint" v-else-if="entries.length >= total && entries.length > 0">{{ t('community.noMore') }}</view>
			</view>

			<view class="scroll-bottom-spacer"></view>
		</scroll-view>

		<!-- 我的排名 / 未上榜引导 -->
		<view class="my-rank-bar" :class="{ active: canLocateMine }" @click="locateMine">
			<text class="my-rank-text">{{ myRankBarText }}</text>
			<text class="my-rank-hint" v-if="canLocateMine">{{ t('community.rankJumpHint') }}</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCommunityLeaderboardApi } from '@/api/community.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { getUserInfo } from '@/utils/auth.js'
import {
	COMMUNITY_INDEX_ROUTE,
	communityAvatarOf,
	communityPostRoute,
	communityProfileRoute,
	formatCommunityNumber,
	formatCommunityTime,
	rankTier
} from '@/utils/communityHub.js'

const PAGE_LIMIT = 20

const loading = ref(true)
const refreshing = ref(false)
const loadingMore = ref(false)
const loadMoreFailed = ref(false)
const loadFailed = ref(false)
const entries = ref([])
const activeType = ref('posts')
const activeRange = ref('week')
const total = ref(0)
const hasEnoughData = ref(true)
const myRank = ref(null)
const updatedAt = ref(0)
const refreshIntervalMinutes = ref(10)
const scrollIntoView = ref('')

const myUserId = computed(() => {
	const id = Number(getUserInfo()?.id)
	return Number.isInteger(id) && id > 0 ? id : null
})

// 当前用户是否出现在已加载的榜单里：在榜但被滚动出屏幕时提供“点击定位”
const myEntry = computed(() => {
	if (!myUserId.value) return null
	return entries.value.find(entry => entry.userId === myUserId.value) || null
})

const myRankNumber = computed(() => myEntry.value?.rank ?? myRank.value?.rank ?? null)
const canLocateMine = computed(() => Boolean(myEntry.value))

const typeTabs = computed(() => ([
	{ key: 'posts', label: t('community.tabPosts'), icon: 'fire-filled' },
	{ key: 'users', label: t('community.tabUsers'), icon: 'medal' }
]))

const rangeTabs = computed(() => ([
	{ key: 'today', label: t('community.rangeToday') },
	{ key: 'week', label: t('community.rangeWeek') }
]))

const refreshNote = computed(() => {
	const base = t('community.refreshNote', { minutes: refreshIntervalMinutes.value })
	const time = formatCommunityTime(updatedAt.value)
	return time ? `${base} · ${t('community.updatedAt', { time })}` : base
})

const emptyHint = computed(() => (activeType.value === 'posts'
	? t('community.leaderboardEmptyPosts')
	: t('community.leaderboardEmptyUsers')))

const myRankBarText = computed(() => {
	if (myRankNumber.value) return t('community.myRankText', { rank: myRankNumber.value })
	return t('community.rankUnlisted')
})

function firstImage(entry) {
	return Array.isArray(entry?.images) ? (entry.images.find(Boolean) || '') : ''
}

async function loadBoard({ showSkeleton = false, extend = false } = {}) {
	if (showSkeleton) loading.value = true
	if (!extend) {
		loadFailed.value = false
		loadMoreFailed.value = false
	}
	try {
		const data = await getCommunityLeaderboardApi({
			type: activeType.value,
			range: activeRange.value,
			limit: PAGE_LIMIT + (extend ? entries.value.length : 0)
		})
		entries.value = Array.isArray(data?.entries) ? data.entries : []
		total.value = Number(data?.total || 0)
		hasEnoughData.value = data?.hasEnoughData !== false
		myRank.value = data?.myRank || null
		updatedAt.value = Number(data?.updatedAt || 0)
		refreshIntervalMinutes.value = Number(data?.refreshIntervalMinutes || 10)
	} catch (e) {
		// 请求层已提示失败原因：首屏失败给出重试，加载更多失败时保留已有榜单
		if (extend) {
			loadMoreFailed.value = true
		} else {
			entries.value = []
			myRank.value = null
			loadFailed.value = true
		}
	} finally {
		loading.value = false
		loadingMore.value = false
	}
}

function reload({ showSkeleton = false } = {}) {
	scrollIntoView.value = ''
	return loadBoard({ showSkeleton })
}

function switchType(key) {
	if (activeType.value === key || loading.value) return
	activeType.value = key
	reload({ showSkeleton: true })
	uni.vibrateShort?.({ fail: () => {} })
}

function switchRange(key) {
	if (activeRange.value === key || loading.value) return
	activeRange.value = key
	reload({ showSkeleton: true })
	uni.vibrateShort?.({ fail: () => {} })
}

async function onRefresh() {
	refreshing.value = true
	try {
		await loadBoard()
	} finally {
		refreshing.value = false
	}
}

// 榜单只展示前若干名，触底时扩大 limit 继续往下看
async function onLoadMore() {
	if (loading.value || loadingMore.value || !entries.value.length) return
	if (entries.value.length >= total.value) return
	loadingMore.value = true
	await loadBoard({ extend: true })
}

function locateMine() {
	if (!canLocateMine.value) return
	const entry = myEntry.value
	const target = `entry-${entry.rank}`
	// 同一个 id 连点两次时先清空，保证仍能触发滚动
	scrollIntoView.value = ''
	setTimeout(() => { scrollIntoView.value = target }, 30)
}

function openPost(entry) {
	uni.navigateTo({ url: communityPostRoute(entry.postId), fail: () => uni.showToast({ title: t('community.openFailed'), icon: 'none' }) })
}

function openProfile(entry) {
	if (!entry.profileId) {
		uni.showToast({ title: t('community.openFailed'), icon: 'none' })
		return
	}
	uni.navigateTo({ url: communityProfileRoute(entry.profileId), fail: () => uni.showToast({ title: t('community.openFailed'), icon: 'none' }) })
}

// 空榜时把用户带回社区发帖，而不是停留在空白榜单
function goCommunity() {
	uni.navigateBack({ fail: () => uni.navigateTo({ url: COMMUNITY_INDEX_ROUTE, fail: () => {} }) })
}

function updatePageTitle() {
	uni.setNavigationBarTitle({ title: t('community.leaderboardTitle') })
}

onLoad(options => {
	if (options?.type === 'users' || options?.type === 'posts') activeType.value = options.type
	if (options?.range === 'today' || options?.range === 'week') activeRange.value = options.range
	updatePageTitle()
})

onMounted(() => loadBoard({ showSkeleton: true }))

watch(currentLocale, updatePageTitle)
</script>

<style lang="scss" scoped>
$brand-yellow: var(--bless-primary, #C2A052);
$text-main: #1a1a1a;
$text-sub: #999999;
$gray-bg: #f5f6f8;
$line-color: #f2f2f4;

.leaderboard-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: #ffffff;
}

/* ---------- 榜单类型 Tab ---------- */
.type-tabs {
	display: flex;
	flex-shrink: 0;
	margin: 20rpx 30rpx 0;
	padding: 6rpx;
	border-radius: 26rpx;
	background: #e9e9ec;

	.type-tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		height: 72rpx;
		border-radius: 22rpx;
		transition: background-color 0.2s ease, box-shadow 0.2s ease;

		.type-label {
			font-size: 28rpx;
			font-weight: 600;
			color: #77787d;
		}

		&.active {
			background: #ffffff;
			box-shadow: 0 1px 4px rgba(15, 15, 20, 0.08);

			.type-label {
				color: $text-main;
			}
		}
	}
}

/* ---------- 时间范围 ---------- */
.range-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-shrink: 0;
	padding: 20rpx 30rpx 12rpx;

	.range-pills {
		display: flex;
		gap: 14rpx;
	}

	.range-pill {
		padding: 8rpx 28rpx;
		border-radius: 28rpx;
		background: $gray-bg;
		font-size: 25rpx;
		color: #666666;
		transition: background-color 0.2s ease, color 0.2s ease;

		&.active {
			background: $brand-yellow;
			color: $text-main;
			font-weight: 600;
		}
	}

	.refresh-note {
		flex: 1;
		margin-left: 20rpx;
		text-align: right;
		font-size: 20rpx;
		color: $text-sub;
	}
}

.board-scroll {
	flex: 1;
	overflow: hidden;
}

.scroll-bottom-spacer {
	height: 160rpx;
}

/* ---------- 榜单条目 ---------- */
.entry-list {
	padding: 8rpx 30rpx 0;
}

.entry-row {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-top: 18rpx;
	padding: 24rpx 22rpx;
	background: #ffffff;
	border-radius: 20rpx;
	box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.05);

	.rank-cell {
		width: 56rpx;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.rank-number {
		font-size: 34rpx;
		font-weight: 800;
		color: #c2c2c6;
	}
}

/* 前三名用金银铜底色突出层级 */
.entry-row.tier-gold {
	background: linear-gradient(135deg, rgba(194, 160, 82, 0.35), rgba(255, 255, 255, 0.9) 55%);

	.rank-number {
		color: var(--bless-text, #775E25);
	}
}

.entry-row.tier-silver {
	background: linear-gradient(135deg, rgba(217, 222, 230, 0.55), rgba(255, 255, 255, 0.9) 55%);

	.rank-number {
		color: #8c98a8;
	}
}

.entry-row.tier-bronze {
	background: linear-gradient(135deg, rgba(232, 185, 138, 0.45), rgba(255, 255, 255, 0.9) 55%);

	.rank-number {
		color: #b0703a;
	}
}

/* ---------- 热帖榜条目 ---------- */
.post-entry {
	.post-main {
		flex: 1;
		min-width: 0;
	}

	.post-excerpt {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		font-size: 28rpx;
		line-height: 1.5;
		color: #333333;
		word-break: break-word;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 10rpx;
		margin-top: 14rpx;
	}

	.author-avatar {
		width: 34rpx;
		height: 34rpx;
		border-radius: 50%;
		background: #eeeef0;
		flex-shrink: 0;
	}

	.author-name {
		max-width: 200rpx;
		font-size: 23rpx;
		color: #576b95;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.category-tag {
		padding: 2rpx 12rpx;
		border-radius: 14rpx;
		background: rgba(194,160,82,0.35);
		font-size: 20rpx;
		font-weight: 600;
		color: $text-main;
	}

	.stat-row {
		display: flex;
		gap: 24rpx;
		margin-top: 12rpx;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 5rpx;
	}

	.stat-text {
		font-size: 21rpx;
		color: $text-sub;
	}

	.post-thumb {
		width: 140rpx;
		height: 140rpx;
		border-radius: 16rpx;
		background: #f0f0f0;
		flex-shrink: 0;
	}
}

/* ---------- 活跃用户榜条目 ---------- */
.user-entry {
	.user-avatar {
		width: 84rpx;
		height: 84rpx;
		border-radius: 50%;
		background: #eeeef0;
		flex-shrink: 0;
	}

	.user-main {
		flex: 1;
		min-width: 0;
	}

	.user-name-row {
		display: flex;
		align-items: center;
		gap: 10rpx;
		min-width: 0;
	}

	.user-name {
		font-size: 30rpx;
		font-weight: 700;
		color: $text-main;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.level-tag {
		padding: 2rpx 10rpx;
		border-radius: 12rpx;
		background: $gray-bg;
		font-size: 20rpx;
		color: #77787d;
	}

	.stat-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8rpx 22rpx;
		margin-top: 12rpx;
	}

	.stat-pair {
		font-size: 22rpx;
		color: $text-sub;
	}
}

.vip-tag {
	padding: 3rpx 10rpx;
	border-radius: 8rpx;
	background: $brand-yellow;
	font-size: 18rpx;
	font-weight: 600;
	color: $text-main;
	flex-shrink: 0;
}

/* ---------- 骨架屏 ---------- */
.skeleton-row {
	display: flex;
	align-items: center;
	gap: 20rpx;
	margin-top: 18rpx;
	padding: 24rpx 22rpx;
	background: #ffffff;
	border-radius: 20rpx;
	box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.05);

	.skeleton-rank {
		width: 40rpx;
		height: 32rpx;
		border-radius: 8rpx;
		background: #eeeef0;
		animation: shimmer 1.4s infinite ease-in-out;
		flex-shrink: 0;
	}

	.skeleton-avatar {
		width: 84rpx;
		height: 84rpx;
		border-radius: 50%;
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
			width: 70%;
		}

		&.shorter {
			width: 40%;
		}
	}
}

@keyframes shimmer {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.5; }
}

/* ---------- 状态区 ---------- */
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

.board-hint,
.load-more-tip {
	padding: 34rpx 0 20rpx;
	text-align: center;
	font-size: 24rpx;
	color: $text-sub;
}

.board-hint {
	color: var(--bless-text, #775E25);
}

.load-more-tip {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;

	&.retry {
		color: #d9433f;
		font-weight: 600;
	}
}

/* ---------- 我的排名 ---------- */
.my-rank-bar {
	position: fixed;
	left: 30rpx;
	right: 30rpx;
	--app-fixed-bottom-base: calc(env(safe-area-inset-bottom) + 30rpx);
	bottom: calc(var(--app-fixed-bottom-base) + var(--app-viewport-bottom-offset, 0px));
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 14rpx;
	padding: 20rpx 30rpx;
	border-radius: 40rpx;
	background: rgba(255, 255, 255, 0.96);
	box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.12);
	border: 1rpx solid $line-color;
	z-index: 90;

	&.active {
		background: $brand-yellow;
		border-color: $brand-yellow;
	}

	.my-rank-text {
		font-size: 26rpx;
		font-weight: 600;
		color: $text-main;
	}

	.my-rank-hint {
		font-size: 22rpx;
		color: rgba(26, 26, 26, 0.6);
	}
}
</style>
