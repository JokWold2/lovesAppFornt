<template>
	<view class="topic-detail-page app-h5-min-screen">
		<scroll-view
			scroll-y
			class="detail-scroll"
			refresher-enabled
			:refresher-triggered="refreshing"
			refresher-background="#ffffff"
			@refresherrefresh="onRefresh"
			@scrolltolower="onLoadMore"
			lower-threshold="120"
		>
			<!-- 话题信息条：帖子数 / 关注数 / 关注按钮 -->
			<view class="topic-bar" v-if="topic">
				<view class="topic-bar-main">
					<view class="topic-icon" :style="{ backgroundColor: topic.color + '1f' }">
						<uni-icons :type="topic.icon" size="22" :color="topic.color"></uni-icons>
					</view>
					<view class="topic-text">
						<view class="topic-name-row">
							<text class="topic-name">#{{ topic.name }}</text>
							<text class="trend-tag" v-if="showTrend">🔺 {{ t('community.trendRising', { percent: topic.trend.deltaPercent }) }}</text>
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
						@click="toggleFollow"
					>{{ topic.followed ? t('community.followed') : t('community.follow') }}</view>
				</view>
			</view>

			<!-- 信息条加载失败：允许重试，不把失败当成没有帖子 -->
			<view class="state-block compact" v-else-if="topicFailed">
				<text class="state-title">{{ t('community.loadFailed') }}</text>
				<view class="state-btn" @click="loadTopic">{{ t('community.retry') }}</view>
			</view>

			<view class="list-title-row">
				<text class="list-title">{{ t('community.topicPostsTitle') }}</text>
			</view>

			<!-- 帖子骨架屏 -->
			<view class="post-list" v-if="loading">
				<view class="skeleton-card" v-for="i in 3" :key="i">
					<view class="skeleton-header">
						<view class="skeleton-avatar"></view>
						<view class="skeleton-lines">
							<view class="skeleton-line short"></view>
							<view class="skeleton-line shorter"></view>
						</view>
					</view>
					<view class="skeleton-line"></view>
					<view class="skeleton-line short"></view>
				</view>
			</view>

			<view class="state-block" v-else-if="listFailed">
				<uni-icons type="refresh" size="90" color="#e5e5e5"></uni-icons>
				<text class="state-title">{{ t('community.loadFailed') }}</text>
				<view class="state-btn" @click="retryList">{{ t('community.retry') }}</view>
			</view>

			<view class="state-block" v-else-if="!posts.length">
				<uni-icons type="chatboxes-filled" size="90" color="#e5e5e5"></uni-icons>
				<text class="state-title">{{ t('community.topicNoPosts') }}</text>
				<text class="state-hint">{{ t('community.topicNoPostsHint') }}</text>
				<view class="state-btn" @click="openPublishModal">{{ t('community.publishWithTopic', { name: topicName }) }}</view>
			</view>

			<view class="post-list" v-else>
				<view class="post-card" v-for="item in posts" :key="item.id">
					<view class="post-header" @click="openPost(item)">
						<image class="avatar-img" :src="communityAvatarOf(item)" mode="aspectFill"></image>
						<view class="user-info">
							<view class="username-row">
								<text class="username">{{ item.username }}</text>
								<view v-if="item.vip" class="vip-tag">VIP</view>
							</view>
							<view class="meta-row">
								<text class="category-pill">{{ item.category }}</text>
								<text class="time">{{ formatCommunityTime(item.createTime) }}</text>
							</view>
						</view>
					</view>

					<view class="post-body" @click="openPost(item)">
						<text class="post-content" :class="{ collapsed: !item.expanded && item.content.length > 90 }">{{ item.content }}</text>
						<text v-if="item.content.length > 90" class="expand-toggle" @click.stop="item.expanded = !item.expanded">
							{{ item.expanded ? t('community.collapse') : t('community.expand') }}
						</text>
						<view v-if="item.images.length" class="image-grid" :class="gridClass(item.images.length)">
							<image
								v-for="(img, i) in item.images"
								:key="i"
								class="grid-image"
								:src="img"
								mode="aspectFill"
								@click.stop="previewImages(item, i)"
							></image>
						</view>
					</view>

					<view class="post-footer">
						<view class="action-item">
							<uni-icons type="eye" size="15" color="#999999"></uni-icons>
							<text class="action-text">{{ formatCommunityNumber(item.viewCount) }}</text>
						</view>
						<view class="action-item">
							<uni-icons type="chatbubble" size="15" color="#999999"></uni-icons>
							<text class="action-text">{{ item.replyCount || 0 }}</text>
						</view>
						<view class="action-item" @click.stop="toggleLike(item)">
							<uni-icons :type="item.liked ? 'heart-filled' : 'heart'" size="15" :color="item.liked ? '#e5484d' : '#999999'"></uni-icons>
							<text class="action-text" :class="{ 'color-red': item.liked }">{{ formatCommunityNumber(item.likeCount) }}</text>
						</view>
					</view>
				</view>

				<view class="load-more-tip" v-if="loadingMore">
					<uni-icons type="spinner-cycle" size="14" color="#bbb"></uni-icons>
					<text>{{ t('community.loadingMore') }}</text>
				</view>
				<view class="load-more-tip retry" v-else-if="loadMoreFailed" @click="loadMore">{{ t('community.retry') }}</view>
				<view class="no-more-tip" v-else-if="!hasMore">{{ t('community.noMore') }}</view>
			</view>

			<view class="scroll-bottom-spacer"></view>
		</scroll-view>

		<!-- 带该话题发帖 -->
		<view class="publish-btn" @click="openPublishModal">
			<uni-icons type="plus" size="22" color="#1a1a1a"></uni-icons>
			<text>{{ t('community.publish') }}</text>
		</view>

		<view class="modal-mask" v-if="showPublishModal" @click="closePublishModal">
			<view class="publish-modal" @click.stop>
				<view class="modal-header">
					<text class="modal-cancel" @click="closePublishModal">{{ t('common.cancel') }}</text>
					<text class="modal-title">{{ t('community.publishWithTopic', { name: topicName }) }}</text>
					<text
						class="modal-submit"
						:class="{ disabled: !publishForm.content.trim() || publishing }"
						@click="submitPost"
					>{{ publishing ? t('community.publishing') : t('community.publish') }}</text>
				</view>

				<scroll-view scroll-y class="modal-body">
					<textarea
						class="publish-textarea"
						v-model="publishForm.content"
						:placeholder="t('community.publishPlaceholder')"
						maxlength="500"
						auto-height
					></textarea>
					<text class="char-count">{{ publishForm.content.length }}/500</text>

					<view class="form-block">
						<text class="form-label">{{ t('community.topicTagLabel') }}</text>
						<view class="form-category-list">
							<text class="form-category-chip active">#{{ topicName }}</text>
						</view>
					</view>

					<view class="form-block">
						<text class="form-label">{{ t('community.categoryLabel') }}</text>
						<view class="form-category-list">
							<text
								class="form-category-chip"
								v-for="category in CATEGORIES"
								:key="category"
								:class="{ active: publishForm.category === category }"
								@click="publishForm.category = category"
							>{{ category }}</text>
						</view>
					</view>

					<view class="form-block">
						<text class="form-label">{{ t('community.imageLabel') }}</text>
						<view class="image-grid form-image-grid">
							<view class="form-image-wrap" v-for="(img, i) in publishForm.images" :key="i">
								<image :src="img" class="grid-image" mode="aspectFill"></image>
								<view class="image-remove" @click="removeImage(i)">✕</view>
							</view>
							<view class="image-add-btn" v-if="publishForm.images.length < 9" @click="chooseImage">
								<uni-icons type="camera" size="24" color="#bbb"></uni-icons>
								<text>{{ publishForm.images.length }}/9</text>
							</view>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
	getCommunityPostsApi,
	getCommunityTopicApi,
	toggleCommunityTopicFollowApi,
	toggleCommunityLikeApi,
	createCommunityPostApi,
	uploadCommunityImagesApi
} from '@/api/community.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import {
	COMMUNITY_TOPIC_DETAIL_ROUTE,
	communityAvatarOf,
	communityPostRoute,
	decodeCommunityParam,
	ensureCommunityLogin,
	formatCommunityNumber,
	formatCommunityTime
} from '@/utils/communityHub.js'

const PAGE_SIZE = 10
// 与社区首页保持同一套分类契约（后端 COMMUNITY_CATEGORIES）
const CATEGORIES = ['前端', '后端', '移动端', 'AI', '设计', '职场', '闲聊']

const topicName = ref('')
const topic = ref(null)
const topicFailed = ref(false)
const loading = ref(true)
const refreshing = ref(false)
const loadingMore = ref(false)
const loadMoreFailed = ref(false)
const listFailed = ref(false)
const posts = ref([])
const page = ref(0)
const hasMore = ref(false)
const showPublishModal = ref(false)
const publishing = ref(false)
const publishForm = ref({ content: '', category: '闲聊', images: [] })

const showTrend = computed(() => {
	const trend = topic.value?.trend || {}
	return Boolean(trend.rising && Number(trend.deltaPercent) > 0)
})

function decoratePost(post) {
	return {
		...post,
		images: Array.isArray(post.images) ? post.images : [],
		expanded: false,
		liking: false
	}
}

async function loadTopic() {
	if (!topicName.value) return
	topicFailed.value = false
	try {
		const data = await getCommunityTopicApi(topicName.value)
		if (data?.topic) topic.value = { ...data.topic, following: false }
	} catch (e) {
		// 请求层已提示失败原因，这里只负责给出重试入口
		topicFailed.value = true
	}
}

async function loadPosts({ reset = false, showSkeleton = false } = {}) {
	if (!topicName.value) return
	if (reset) {
		listFailed.value = false
		loadMoreFailed.value = false
		if (showSkeleton) loading.value = true
	}
	if (!reset && (!hasMore.value || loadingMore.value)) return
	if (!reset) loadingMore.value = true
	const nextPage = reset ? 1 : page.value + 1

	try {
		const data = await getCommunityPostsApi({
			page: nextPage,
			pageSize: PAGE_SIZE,
			tag: topicName.value,
			sort: 'latest'
		})
		const list = Array.isArray(data?.posts) ? data.posts.map(decoratePost) : []
		posts.value = reset ? list : [...posts.value, ...list]
		hasMore.value = !!data?.hasMore
		page.value = nextPage
	} catch (e) {
		if (reset) {
			posts.value = []
			hasMore.value = false
			listFailed.value = true
		} else {
			loadMoreFailed.value = true
		}
	} finally {
		loading.value = false
		loadingMore.value = false
	}
}

function reload({ showSkeleton = false } = {}) {
	page.value = 0
	hasMore.value = true
	return loadPosts({ reset: true, showSkeleton })
}

async function onRefresh() {
	refreshing.value = true
	try {
		await Promise.all([loadTopic(), reload()])
	} finally {
		refreshing.value = false
	}
}

function loadMore() {
	loadMoreFailed.value = false
	loadPosts()
}

// 缺少话题名时页面无法自愈，重试改为退回上一页
function retryList() {
	if (!topicName.value) {
		uni.navigateBack({ fail: () => {} })
		return
	}
	reload({ showSkeleton: true })
}

function onLoadMore() {
	if (!hasMore.value || loadingMore.value || !posts.value.length) return
	loadMore()
}

async function toggleFollow() {
	if (!topic.value || topic.value.following) return
	if (!ensureCommunityLogin(t, COMMUNITY_TOPIC_DETAIL_ROUTE)) return

	const previous = { followed: topic.value.followed, followerCount: topic.value.followerCount }
	topic.value.following = true
	topic.value.followed = !previous.followed
	topic.value.followerCount = Math.max(0, previous.followerCount + (previous.followed ? -1 : 1))

	try {
		const data = await toggleCommunityTopicFollowApi(topic.value.name)
		topic.value.followed = !!data?.followed
		topic.value.followerCount = Number(data?.followerCount || 0)
		if (topic.value.followed) uni.vibrateShort?.({ fail: () => {} })
	} catch (e) {
		topic.value.followed = previous.followed
		topic.value.followerCount = previous.followerCount
		uni.showToast({ title: t('community.followFailed'), icon: 'none' })
	} finally {
		topic.value.following = false
	}
}

async function toggleLike(item) {
	if (item.liking) return
	if (!ensureCommunityLogin(t, COMMUNITY_TOPIC_DETAIL_ROUTE)) return
	item.liking = true
	try {
		const data = await toggleCommunityLikeApi(item.id)
		item.liked = !!data?.isLiked
		item.likeCount = Number(data?.likeCount || 0)
		if (item.liked) uni.vibrateShort?.({ fail: () => {} })
	} catch (e) {
		// 请求层已提示失败原因
	} finally {
		item.liking = false
	}
}

function openPost(item) {
	uni.navigateTo({ url: communityPostRoute(item.id), fail: () => uni.showToast({ title: t('community.openFailed'), icon: 'none' }) })
}

function previewImages(item, index) {
	uni.previewImage({ urls: item.images, current: index })
}

function gridClass(count) {
	if (count === 1) return 'grid-1'
	if (count === 2 || count === 4) return 'grid-2'
	return 'grid-3'
}

function updatePageTitle() {
	uni.setNavigationBarTitle({ title: topicName.value ? `#${topicName.value}` : t('community.topicDetailTitle') })
}

function openPublishModal() {
	if (!ensureCommunityLogin(t, COMMUNITY_TOPIC_DETAIL_ROUTE)) return
	publishForm.value = { content: '', category: '闲聊', images: [] }
	showPublishModal.value = true
}

function closePublishModal() {
	if (publishing.value) return
	showPublishModal.value = false
}

function chooseImage() {
	uni.chooseImage({
		count: 9 - publishForm.value.images.length,
		sizeType: ['compressed'],
		success: (res) => {
			publishForm.value.images.push(...res.tempFilePaths)
		}
	})
}

function removeImage(index) {
	publishForm.value.images.splice(index, 1)
}

async function submitPost() {
	const content = publishForm.value.content.trim()
	if (!content) {
		uni.showToast({ title: t('community.contentRequired'), icon: 'none' })
		return
	}
	if (publishing.value) return
	publishing.value = true
	uni.showLoading({ title: t('community.publishing'), mask: true })
	try {
		let images = []
		if (publishForm.value.images.length > 0) {
			try {
				images = await uploadCommunityImagesApi(publishForm.value.images)
			} catch (e) {
				uni.hideLoading()
				uni.showToast({ title: t('community.publishFailed'), icon: 'none' })
				return
			}
		}
		// 话题固定带上当前话题，避免用户在详情页发的帖子跑到别的话题下
		await createCommunityPostApi({
			content,
			category: publishForm.value.category,
			tags: [topicName.value],
			images
		})
		showPublishModal.value = false
		publishForm.value = { content: '', category: '闲聊', images: [] }
		await Promise.all([reload(), loadTopic()])
		uni.hideLoading()
		uni.showToast({ title: t('community.publishSuccess'), icon: 'success' })
	} catch (e) {
		uni.hideLoading()
	} finally {
		publishing.value = false
	}
}

onLoad(options => {
	topicName.value = decodeCommunityParam(options?.name)
	updatePageTitle()
})

onMounted(async () => {
	if (!topicName.value) {
		loading.value = false
		listFailed.value = true
		return
	}
	await Promise.all([loadTopic(), loadPosts({ reset: true, showSkeleton: true })])
})

watch(currentLocale, updatePageTitle)
</script>

<style lang="scss" scoped>
$brand-yellow: var(--bless-primary, #C2A052);
$text-main: #1a1a1a;
$text-sub: #999999;
$gray-bg: #f5f6f8;
$line-color: #f2f2f4;

.topic-detail-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: #ffffff;
}

.detail-scroll {
	flex: 1;
	overflow: hidden;
}

.scroll-bottom-spacer {
	height: 200rpx;
}

/* ---------- 话题信息条 ---------- */
.topic-bar {
	padding: 28rpx 30rpx 22rpx;
	border-bottom: 1rpx solid $line-color;

	.topic-bar-main {
		display: flex;
		align-items: center;
		gap: 20rpx;
	}

	.topic-icon {
		width: 88rpx;
		height: 88rpx;
		border-radius: 26rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.topic-text {
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
		font-size: 34rpx;
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
}

.list-title-row {
	padding: 24rpx 30rpx 8rpx;
}

.list-title {
	font-size: 28rpx;
	font-weight: 700;
	color: $text-main;
}

/* ---------- 帖子列表 ---------- */
.post-list {
	padding: 0 30rpx;
}

.post-card {
	margin-top: 20rpx;
	padding: 24rpx 26rpx 18rpx;
	background: #ffffff;
	border-radius: 20rpx;
	box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.05);
}

.post-header {
	display: flex;
	align-items: center;

	.avatar-img {
		width: 70rpx;
		height: 70rpx;
		border-radius: 50%;
		background: #e8e8e8;
		flex-shrink: 0;
	}

	.user-info {
		flex: 1;
		padding-left: 20rpx;
		min-width: 0;
	}

	.username-row {
		display: flex;
		align-items: center;
		gap: 10rpx;
	}

	.username {
		font-size: 30rpx;
		font-weight: 700;
		color: $text-main;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.vip-tag {
		padding: 3rpx 10rpx;
		border-radius: 8rpx;
		background: $brand-yellow;
		font-size: 18rpx;
		font-weight: 600;
		color: $text-main;
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: 14rpx;
		margin-top: 6rpx;
	}

	.category-pill {
		padding: 2rpx 14rpx;
		border-radius: 16rpx;
		background: rgba(194,160,82,0.35);
		font-size: 22rpx;
		font-weight: 600;
		color: $text-main;
	}

	.time {
		font-size: 22rpx;
		color: $text-sub;
	}
}

.post-body {
	padding-top: 20rpx;

	.post-content {
		font-size: 28rpx;
		line-height: 1.7;
		color: #333333;
		white-space: pre-wrap;
		word-break: break-word;

		&.collapsed {
			display: -webkit-box;
			-webkit-line-clamp: 3;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
	}

	.expand-toggle {
		display: inline-block;
		margin-top: 8rpx;
		font-size: 24rpx;
		color: var(--bless-text, #775E25);
	}

	.image-grid {
		display: grid;
		gap: 8rpx;
		margin-top: 18rpx;

		&.grid-1 {
			grid-template-columns: 1fr;
			max-width: 400rpx;

			.grid-image {
				height: 320rpx;
			}
		}

		&.grid-2 {
			grid-template-columns: repeat(2, 1fr);

			.grid-image {
				height: 200rpx;
			}
		}

		&.grid-3 {
			grid-template-columns: repeat(3, 1fr);

			.grid-image {
				height: 180rpx;
			}
		}

		.grid-image {
			width: 100%;
			border-radius: 12rpx;
			background: #f0f0f0;
		}
	}
}

.post-footer {
	display: flex;
	justify-content: space-around;
	margin-top: 20rpx;
	padding-top: 16rpx;
	border-top: 1rpx solid $line-color;

	.action-item {
		display: flex;
		align-items: center;
		gap: 6rpx;
	}

	.action-text {
		font-size: 24rpx;
		color: $text-sub;

		&.color-red {
			color: #e5484d;
		}
	}
}

/* ---------- 骨架屏 ---------- */
.skeleton-card {
	margin-top: 20rpx;
	padding: 26rpx;
	background: #ffffff;
	border-radius: 20rpx;

	.skeleton-header {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.skeleton-avatar {
		width: 80rpx;
		height: 80rpx;
		margin-right: 20rpx;
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

/* ---------- 空 / 失败状态 ---------- */
.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 120rpx 60rpx;

	&.compact {
		padding: 60rpx;
	}

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

/* ---------- 发布按钮与弹窗 ---------- */
.publish-btn {
	position: fixed;
	right: 30rpx;
	--app-fixed-bottom-base: calc(env(safe-area-inset-bottom) + 40rpx);
	bottom: calc(var(--app-fixed-bottom-base) + var(--app-viewport-bottom-offset, 0px));
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	width: 150rpx;
	height: 92rpx;
	background-color: $brand-yellow;
	border-radius: 46rpx;
	box-shadow: 0 8rpx 20rpx rgba(194,160,82,0.45);
	z-index: 90;

	text {
		font-size: 26rpx;
		font-weight: 700;
		color: $text-main;
	}
}

.modal-mask {
	position: fixed;
	inset: 0;
	z-index: 200;
	display: flex;
	align-items: flex-end;
	background: rgba(0, 0, 0, 0.4);
}

.publish-modal {
	width: 100%;
	max-height: 88vh;
	display: flex;
	flex-direction: column;
	background: #ffffff;
	border-radius: 28rpx 28rpx 0 0;

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 26rpx 28rpx;
		border-bottom: 1rpx solid $line-color;

		.modal-title {
			flex: 1;
			padding: 0 16rpx;
			font-size: 28rpx;
			font-weight: 700;
			color: $text-main;
			text-align: center;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.modal-cancel {
			font-size: 28rpx;
			color: $text-sub;
		}

		.modal-submit {
			padding: 8rpx 26rpx;
			border-radius: 30rpx;
			background: $brand-yellow;
			font-size: 26rpx;
			font-weight: 600;
			color: $text-main;

			&.disabled {
				background: $gray-bg;
				color: #c0c0c0;
			}
		}
	}

	.modal-body {
		padding: 28rpx;
		max-height: 70vh;
	}

	.publish-textarea {
		width: 100%;
		min-height: 180rpx;
		font-size: 28rpx;
		line-height: 1.6;
		color: $text-main;
	}

	.char-count {
		display: block;
		margin: 8rpx 0 24rpx;
		text-align: right;
		font-size: 22rpx;
		color: $text-sub;
	}

	.form-block {
		margin-bottom: 32rpx;
	}

	.form-label {
		display: block;
		margin-bottom: 16rpx;
		font-size: 26rpx;
		font-weight: 600;
		color: #666666;
	}

	.form-category-list {
		display: flex;
		flex-wrap: wrap;
		gap: 14rpx;
	}

	.form-category-chip {
		padding: 12rpx 28rpx;
		border-radius: 30rpx;
		background: $gray-bg;
		font-size: 24rpx;
		color: #666666;

		&.active {
			background: $brand-yellow;
			color: $text-main;
			font-weight: 600;
		}
	}

	.form-image-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
	}

	.form-image-wrap {
		position: relative;
		width: 160rpx;
		height: 160rpx;

		.grid-image {
			width: 100%;
			height: 100%;
			border-radius: 12rpx;
		}

		.image-remove {
			position: absolute;
			top: -12rpx;
			right: -12rpx;
			width: 40rpx;
			height: 40rpx;
			border-radius: 50%;
			background: rgba(0, 0, 0, 0.5);
			color: #ffffff;
			font-size: 22rpx;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	.image-add-btn {
		width: 160rpx;
		height: 160rpx;
		border-radius: 12rpx;
		border: 2rpx dashed #dddddd;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8rpx;

		text {
			font-size: 20rpx;
			color: $text-sub;
		}
	}
}
</style>
