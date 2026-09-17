<template>
	<view class="container app-h5-min-screen liquid-tab-page" :class="{ 'is-card-home': model === 'recommend' && currentEntryIndex === 1 && blessingViewMode === 'cards' }" :style="{ '--blessing-header-height': recommendationHeaderHeight + 'px' }">
		<!-- 状态栏占位 -->
		<!-- <view
			class="status-bar"
			:style="{ height: statusBarHeight + 'px' }"
		></view> -->

		<view
			v-if="recommendationHeaderFixed"
			class="recommendation-sticky-placeholder"
			:style="{ height: recommendationHeaderHeight + 'px' }"
		></view>
		<view
			class="recommendation-sticky-header"
			:class="{ 'is-fixed': recommendationHeaderFixed }"
		>
			<!-- 顶部导航栏 -->
			<view class="header-nav">
			<view class="nav-left">
				<!-- 用户头像占位 -->
				<view class="avatar-circle" @click="openAccountCenter">
					<image
						v-if="userInfo.avatar_url"
						class="avatar-img1"
						:src="userInfo.avatar_url"
						mode="aspectFill"
					></image>
					<uni-icons
						v-else
						type="person-filled"
						color="#ccc"
						size="24"
					></uni-icons>
				</view>
			</view>

			<view class="nav-center">
				<view
					class="nav-tab"
					:class="{ active: model === 'tutorial' }"
					@click="setHomeModel('tutorial')"
				>
					<text class="tab-text">{{ t('home.tutorial') }}</text>
					<view class="tab-line" v-if="model === 'tutorial'"></view>
				</view>
				<view
					class="nav-tab"
					:class="{ active: model === 'recommend' }"
					@click="setHomeModel('recommend')"
				>
					<text class="tab-text">{{ t('home.recommend') }}</text>
					<view class="tab-line" v-if="model === 'recommend'"></view>
				</view>
				<view
					class="nav-tab"
					:class="{ active: model === 'activity' }"
					@click="setHomeModel('activity')"
				>
					<text class="tab-text">{{ t('home.activity') }}</text>
					<view class="tab-line" v-if="model === 'activity'"></view>
				</view>
				<view class="nav-tab" @click="goFinancial">
					<text class="tab-text">财务</text>
				</view>
			</view>

			<view class="nav-right">
				<!-- 右侧消息图标 -->
				<uni-icons type="mail" size="28" color="#333"></uni-icons>
			</view>
			</view>
			<view v-if="model === 'recommend'">
			<!-- 搜索栏 -->
			<view v-if="membership?.canSearch" class="search-container" @click="openSearch">
				<view class="search-box">
					<text class="search-placeholder">{{ t('home.search') }}</text>
				</view>
			</view>

			<!-- 滚动 Tab 栏 (整合了原来所有的页面入口) -->
			<view class="scroll-tabs-wrapper">
				<scroll-view
					class="scroll-tabs"
					scroll-x="true"
					show-scrollbar="false"
				>
					<view class="tabs-content">
						<view
							class="tab-pill"
							v-for="(item, index) in originalEntries"
							v-show="!item.searchOnly || membership?.canSearch"
							:key="index"
							:class="{ active: currentEntryIndex === index }"
							@click="handleEntryClick(index, item.page)"
						>
							<text>{{ item.name }}</text>
						</view>
					</view>
				</scroll-view>
				<!-- 右侧筛选图标 -->
				<view class="filter-icon-box">
					<uni-icons
						type="settings"
						size="22"
						color="#666"
					></uni-icons>
				</view>
			</view>
		</view>
		</view>
		<view v-if="model === 'recommend'">
			<MarketPreviewSection v-if="currentEntryIndex === 2" category="antique" :title="t('home.antique')" />
			<MarketPreviewSection v-if="currentEntryIndex === 3" category="second_hand" :title="t('home.secondHand')" />
			<!-- 精选混排信息流 -->
			<view class="feed-container" v-if="currentEntryIndex === 0">
				<FeedContentState
					v-if="visibleFeaturedItems.length === 0"
					kind="featured"
					:status="featuredLoading || featuredLoadingMore ? 'loading' : (featuredLoadError ? 'error' : 'empty')"
					@action="retryFeaturedFeed"
				/>

				<view class="waterfall-grid">
					<view
						class="waterfall-column"
						v-for="(columnItems, index) in featuredColumns"
						:key="`featured-col-${index}`"
					>
						<view
							class="post-card featured-card"
							:class="{ navigable: featuredCardRoute(item) }"
							v-for="item in columnItems"
							:key="item.feedKey"
							@click="openFeaturedItem(item)"
						>
							<view class="post-header">
								<view class="post-avatar">
									<image
										v-if="item.author && item.author.avatarUrl"
										class="avatar-img"
										:src="getFullImageUrl(item.author.avatarUrl)"
										mode="aspectFill"
									></image>
									<uni-icons
										v-else
										type="person-filled"
										color="#ccc"
										size="28"
									></uni-icons>
								</view>
								<view class="post-user-info">
									<text class="username">{{
										item.author && item.author.name
									}}</text>
									<view
										v-if="
											item.type !== 'antique' &&
											item.type !== 'second_hand'
										"
										class="location-box"
									>
										<text class="location">{{ item.meta }}</text>
									</view>
								</view>
							</view>

							<view
								class="post-media"
								:class="{
									'is-image-loading': !isFeaturedImageLoaded(
										item.feedKey,
									),
								}"
								v-if="featuredItemImage(item)"
							>
								<view
									v-if="!isFeaturedImageLoaded(item.feedKey)"
									class="media-skeleton"
								>
									<view class="skeleton-line skeleton-line-wide"></view>
									<view class="skeleton-line skeleton-line-short"></view>
								</view>
								<image
									class="media-img"
									:src="getFullImageUrl(featuredItemImage(item))"
									mode="widthFix"
									@load="markFeaturedImageLoaded(item.feedKey)"
									@error="markFeaturedImageLoaded(item.feedKey)"
								></image>
							</view>

							<view
								v-if="
									item.type === 'antique' ||
									item.type === 'second_hand'
								"
								class="featured-title"
							>
								<text>{{ item.title }}</text>
							</view>
							<view
								v-if="
									item.type === 'antique' ||
									item.type === 'second_hand'
								"
								class="featured-price"
							>
								<text>¥ {{ item.meta }}</text>
							</view>
							<view
								v-if="item.type === 'moment' || item.summary"
								class="featured-summary"
							>
								<text>{{ item.summary }}</text>
							</view>

							<view class="post-actions">
								<view class="actions-left">
									<view
										class="action-btn"
										v-if="isFeaturedLikeAvailable(item)"
										@click.stop="toggleFeaturedLike(item)"
									>
										<text class="action-icon">{{
											item.isLiked ? '❤️' : '🤍'
										}}</text>
										<text class="action-num">{{
											item.likeCount || 0
										}}</text>
									</view>
									<view
										class="action-btn"
										v-if="
											isFeaturedCommentAvailable(item)
										"
										@click.stop="
											toggleFeaturedCommentPanel(item)
										"
									>
										<uni-icons
											type="chat"
											size="24"
											color="#666"
										></uni-icons>
										<text class="action-num">{{
											item.commentCount || 0
										}}</text>
									</view>
								</view>
							</view>

							<view
								v-if="
									isFeaturedCommentAvailable(item) &&
									item.showComments
								"
								class="meta-box"
								@click.stop
							>
								<view
									v-if="item.commentsLoading"
									class="comment-loading"
								>
					<text>{{ t('home.loading') }}</text>
								</view>
								<template v-else>
									<view
										v-for="c in item.comments"
										:key="c.id"
										class="comment-item"
										@click="startFeaturedReply(item, c)"
									>
										<text class="comment-author">{{
											commentDisplayName(c, t('common.user'))
										}}</text>
										<text
											v-if="commentReplyDisplayName(c, '')"
											class="comment-reply-arrow"
										>
											{{ t('home.replyTo', { name: commentReplyDisplayName(c, t('common.user')) }) }}</text
										>
										<text class="comment-colon">：</text>
										<text class="comment-content">{{
											c.content
										}}</text>
									</view>
									<view
										v-if="
											item.comments &&
											item.comments.length === 0
										"
										class="comment-empty"
									>
										<text>{{ t('home.noComments') }}</text>
									</view>
								</template>

								<view class="comment-input-row">
									<view
										v-if="item.replyTarget"
										class="reply-target-tag"
									>
										<text>
											{{ t('home.replyTo', { name: item.replyTarget.email }) }}
										</text>
										<text
											class="reply-cancel"
											@click="cancelFeaturedReply(item)"
											>×</text
										>
									</view>
									<view class="comment-input-inner">
										<input
											class="comment-input"
											v-model="item.commentDraft"
											confirm-type="send"
											:placeholder="
												item.replyTarget
												? t('home.replyTo', { name: item.replyTarget.email })
												: t('home.saySomething')
											"
											@confirm="submitFeaturedComment(item)"
										/>
										<text
											class="comment-send-btn"
											@click="
												submitFeaturedComment(item)
											"
											>{{ t('home.send') }}</text
										>
									</view>
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="featuredLoadingMore" class="load-more-tip">
					<text>{{ t('home.loadingMore') }}</text>
				</view>
				<button v-if="featuredLoadError && visibleFeaturedItems.length" class="blessing-retry" :disabled="featuredLoading || featuredLoadingMore" @click="retryFeaturedFeed">{{ t('deck.moreFailed') }}</button>
				<view
					v-if="!featuredHasMore && visibleFeaturedItems.length > 0"
					class="load-more-tip"
				>
					<text>{{ t('home.noMore') }}</text>
				</view>
			</view>

			<!-- 祝福：同一份资料数据可切换卡片和原列表。 -->
			<view class="blessing-section" v-if="currentEntryIndex === 1">
				<view class="blessing-toolbar">
					<text class="blessing-heading">{{ t('home.blessing') }}</text>
					<view class="blessing-view-switch">
						<button :class="{ selected: blessingViewMode === 'cards' }" :aria-label="t('deck.cardMode')" :aria-pressed="blessingViewMode === 'cards'" :disabled="blessingActionBusy" @click="setBlessingViewMode('cards')"><uni-icons type="images" size="17" :color="blessingViewMode === 'cards' ? '#1c1c1e' : '#77787d'" /><text>{{ t('deck.cards') }}</text></button>
						<button :class="{ selected: blessingViewMode === 'list' }" :aria-label="t('deck.listMode')" :aria-pressed="blessingViewMode === 'list'" :disabled="blessingActionBusy" @click="setBlessingViewMode('list')"><uni-icons type="list" size="17" :color="blessingViewMode === 'list' ? '#1c1c1e' : '#77787d'" /><text>{{ t('deck.list') }}</text></button>
					</view>
				</view>
				<button class="blessing-quota" :class="{ 'has-error': membershipLoadError }" :disabled="membershipLoading" @click="onMembershipQuotaTap">
					<uni-icons v-if="membershipLoadError" type="refreshempty" size="16" color="#87713b" />
					<text>{{ remainingQuota }}</text>
				</button>
				<BlessingCardDeck
					v-show="blessingViewMode === 'cards'"
					:items="deckProfiles"
					:active="blessingViewMode === 'cards'"
					:loading="loading"
					:loading-more="loadingMore"
					:has-more="hasMore"
					:error="profileLoadError"
					:revision="blessingRevision"
					:decide-profile="decideBlessingProfile"
					:handle-error="handleMembershipError"
					:rewind-available="!!membership?.rewind?.available"
					:rewind-busy="rewindBusy"
					@dismiss="dismissBlessingCard"
					@open="openBlessingProfile"
					@busy-change="onBlessingBusyChange"
					@rewind="rewindBlessingCard"
					@refresh="loadFeed({ isRefresh: true })"
					@retry="retryProfileFeed"
					@load-more="loadFeed({ isRefresh: false })"
				/>
				<view v-show="blessingViewMode === 'list'" class="feed-container blessing-list">
				<FeedContentState
					v-if="deckProfiles.length === 0"
					kind="blessing"
					:status="loading || loadingMore ? 'loading' : (profileLoadError ? 'error' : 'empty')"
					@action="retryProfileFeed"
				/>

				<view
					class="post-card"
					v-for="item in deckProfiles"
					:key="item.profileId"
				>
					<!-- 帖子头部: 用户信息 -->
					<view class="post-header" @click="openBlessingProfile(item)">
						<view class="post-avatar">
							<image
								v-if="item.avatarUrl"
								class="avatar-img"
								:src="getFullImageUrl(item.avatarUrl)"
								mode="aspectFill"
							>
							</image>
							<uni-icons
								v-else
								type="person-filled"
								color="#ccc"
								size="28"
							></uni-icons>
						</view>
						<view class="post-user-info">
							<text class="username">{{ item.displayName }}</text>
							<view class="location-box">
								<text class="location">{{
									formatLocation(item)
								}}</text>
							</view>
						</view>
					</view>

					<!-- 帖子图片 -->
					<view class="post-media" v-if="getMainImage(item)" @click="openBlessingProfile(item)">
						<view v-if="!isImageLoaded(item.profileId)" class="media-skeleton">
							<view class="skeleton-line skeleton-line-wide"></view>
							<view class="skeleton-line skeleton-line-short"></view>
						</view>
						<image
							class="media-img"
							:src="getMainImage(item)"
							mode="widthFix"
							@load="markImageLoaded(item.profileId)"
							@error="markImageLoaded(item.profileId)"
						></image>
					</view>

					<!-- 帖子底部操作栏 -->
					<view class="post-actions">
						<view class="actions-left">
							<view class="action-btn" :class="{ 'is-like-busy': item.likeBusy }" @click="toggleLike(item)">
								<text class="action-icon">{{
									item.isLiked ? "❤️" : "🤍"
								}}</text>
								<text class="action-num">{{
									item.likeCount || 0
								}}</text>
							</view>
							<view
								class="action-btn"
								@click="toggleCommentPanel(item)"
							>
								<uni-icons
									type="chat"
									size="24"
									color="#666"
								></uni-icons>
								<text class="action-num">{{
									item.commentCount || 0
								}}</text>
							</view>
						</view>
					</view>

					<!-- 点赞人 + 评论区：仿朋友圈灰底信息区 -->
					<view v-if="item.showComments" class="meta-box" @click.stop>
						<view
							v-if="item.commentsLoading"
							class="comment-loading"
						>
							<text>{{ t('home.loading') }}</text>
						</view>
						<template v-else>
							<view
								v-for="c in item.comments"
								:key="c.id"
								class="comment-item"
								@click="startReply(item, c)"
							>
								<text class="comment-author">{{
									commentDisplayName(c, t('common.user'))
								}}</text>
								<text
									v-if="commentReplyDisplayName(c, '')"
									class="comment-reply-arrow"
								>
									{{ t('home.replyTo', { name: commentReplyDisplayName(c, t('common.user')) }) }}</text
								>
								<text class="comment-colon">：</text>
								<text class="comment-content">{{
									c.content
								}}</text>
							</view>
							<view
								v-if="
									item.comments && item.comments.length === 0
								"
								class="comment-empty"
							>
								<text>{{ t('home.noComments') }}</text>
							</view>
						</template>

						<!-- 评论输入框 -->
						<view class="comment-input-row">
							<view
								v-if="item.replyTarget"
								class="reply-target-tag"
							>
								<text>{{ t('home.replyTo', { name: item.replyTarget.email }) }}</text>
								<text
									class="reply-cancel"
									@click="cancelReply(item)"
									>×</text
								>
							</view>
							<view class="comment-input-inner">
								<input
									class="comment-input"
									v-model="item.commentDraft"
									confirm-type="send"
									:placeholder="
										item.replyTarget
										? t('home.replyTo', { name: item.replyTarget.email })
										: t('home.saySomething')
									"
									@confirm="submitComment(item)"
								/>
								<text
									class="comment-send-btn"
									@click="submitComment(item)"
									>{{ t('home.send') }}</text
								>
							</view>
						</view>
					</view>
				</view>

				<!-- 上滑加载更多状态 -->
				<view v-if="loadingMore" class="load-more-tip">
					<text>{{ t('home.loadingMore') }}</text>
				</view>
				<view
					v-if="!hasMore && deckProfiles.length > 0"
					class="load-more-tip"
				>
					<text>{{ t('home.noMore') }}</text>
				</view>
				<button v-if="profileLoadError && deckProfiles.length" class="blessing-retry" :disabled="loading || loadingMore" @click="retryProfileFeed">{{ t('deck.moreFailed') }}</button>
				</view>
			</view>
			<!-- <AuctionActivity v-if="currentEntryIndex == 2" /> -->
			<!-- 右下角悬浮按钮：改为回到顶部 -->
			<view v-if="(currentEntryIndex === 0 && visibleFeaturedItems.length) || (currentEntryIndex === 1 && blessingViewMode === 'list' && deckProfiles.length) || currentEntryIndex > 1" class="fab-button app-h5-fixed-bottom" @click="scrollToTop">
				<uni-icons type="arrow-up" size="28" color="#000"></uni-icons>
			</view>
		</view>
		<AntiqueCollection v-if="model === 'tutorial'" />
		<AuctionActivity v-if="model === 'activity'" />
		<!-- 底部安全区留白 -->
		<view class="safe-area-bottom"></view>
		<LiquidGlassTabBar active-route="pages/index/index360" />
	</view>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from "vue";
import { onPullDownRefresh, onReachBottom, onPageScroll, onShow, onResize } from "@dcloudio/uni-app";
import {
	getExploreFeedApi,
	getFeaturedFeedApi,
	getCommentsApi,
	toggleLikeMomentApi,
	addCommentApi,
	toggleProfileLikeApi,
	getCandidateProfileApi,
	getProfileCommentsApi,
	addProfileCommentApi,
} from "@/api/index.js";
import { config } from "@/utils/config.js";
import { ensureTokenValid } from "@/utils/guard.js";
import AntiqueCollection from "./components/Antiquecollection.vue";
import AuctionActivity from "./components/Auctionactivity.vue";
import MarketPreviewSection from "@/components/market/MarketPreviewSection.vue";
import BlessingCardDeck from '@/components/profile/BlessingCardDeck.vue';
import FeedContentState from '@/components/feedback/FeedContentState.vue';
import LiquidGlassTabBar from '@/components/navigation/LiquidGlassTabBar.vue';
import { getProfilePhotos, mergeProfileBatch } from '@/utils/blessingDeck.js';
import { createBlessingOperations, filterBlessingCandidates, filterFeaturedBlessings, reconcileBlessingExclusions } from '@/utils/blessingInteractions.js';
import { getMembershipApi, decideBlessingApi, rewindBlessingApi } from '@/api/membership.js';
import { createMembershipRequestId, handleMembershipError, notifyBlessingChanged, openMembershipUpgrade } from '@/utils/membership.js';
import {
	createLatestRequestGuard,
	commentDisplayName,
	commentReplyDisplayName,
	featuredItemImage,
	featuredItemRoute,
} from "@/utils/featuredFeed.js";
import { currentLocale, t, updateTabBarLocale } from '@/utils/localeRuntime.js';

let homeShown = false;
onShow(() => {
	updateTabBarLocale();
	refreshMembership().catch(() => {});
	if (homeShown && !blessingActionBusy.value && !rewindBusy.value) {
		loadFeed({ isRefresh: true });
		if (featuredItems.value.length) loadFeaturedFeed({ isRefresh: true });
	}
	homeShown = true;
});

// 状态栏高度适配
const statusBarHeight = ref(44);
const model = ref("recommend");
const userInfo = ref({});
const blessingViewMode = ref('cards');
const blessingActionBusy = ref(false);
const blessingRevision = ref(0);
const reviewedProfileIds = ref([]);
const localDecisionVersions = new Map();
let localDecisionVersion = 0;
const pendingProfileIds = new Set();
const profileLoadError = ref(false);
let profileRetryRefresh = true;
const profileRequestGuard = createLatestRequestGuard();
const membership = ref(null);
const membershipLoadError = ref(false);
const membershipLoading = ref(false);
const rewindBusy = ref(false);
const activeProfileId = ref(null);
const cardSnapshots = new Map();
const operations = createBlessingOperations({ decide: decideBlessingApi, rewind: rewindBlessingApi, refreshMembership, createRequestId: createMembershipRequestId });
let membershipRevision = 0;
async function refreshMembership() {
	const revision = ++membershipRevision;
	membershipLoadError.value = false;
	membershipLoading.value = true;
	try {
		const data = await getMembershipApi();
		if (revision === membershipRevision) membership.value = data;
		return data;
	} catch (error) {
		if (revision === membershipRevision) { membership.value = null; membershipLoadError.value = true; }
		throw error;
	} finally {
		if (revision === membershipRevision) membershipLoading.value = false;
	}
}

const remainingQuota = computed(() => {
	if (!membership.value?.usage) return t(membershipLoadError.value ? 'deck.quotaRetry' : 'deck.quotaLoading');
	const amount = value => value === null ? t('deck.unlimited') : String(value ?? '—');
	return t('deck.quota', { likes: amount(membership.value.usage.like?.remaining), rewinds: amount(membership.value.usage.rewind?.remaining) });
});

function onMembershipQuotaTap() {
	if (membershipLoading.value) return;
	if (!membership.value || membershipLoadError.value) refreshMembership().catch(() => {});
	else openMembershipUpgrade();
}
const recommendationHeaderFixed = ref(false);
const recommendationHeaderHeight = ref(0);

function measureRecommendationHeader() {
	nextTick(() => {
		uni.createSelectorQuery()
			.select(".recommendation-sticky-header")
			.boundingClientRect((rect) => {
				if (rect && rect.height) {
					recommendationHeaderHeight.value = rect.height;
				}
			})
			.exec();
	});
}

function openAccountCenter() {
	uni.navigateTo({ url: "/pages/account/accountCenter" });
}

function goFinancial() {
	uni.navigateTo({ url: "/pages/index/components/financialList" });
}

function updatePageTitle() {
	uni.setNavigationBarTitle({ title: t('navigation.home') });
}

onMounted(async () => {
	const storedUserInfo = uni.getStorageSync("USER_INFO");
	if (storedUserInfo) {
		console.log("userInfo", storedUserInfo);
		userInfo.value =
			typeof storedUserInfo === "string"
				? JSON.parse(storedUserInfo)
				: storedUserInfo;
	}
	uni.getSystemInfo({
		success: (res) => {
			console.log("System Info:", res);
			statusBarHeight.value = res.statusBarHeight || 44;
		},
	});
	measureRecommendationHeader();
	updatePageTitle();
	loadFeed({ isRefresh: true });
});

watch(currentLocale, updatePageTitle);
onResize(measureRecommendationHeader);

// ------- 回到顶部 -------
function scrollToTop() {
	uni.pageScrollTo({
		scrollTop: 0,
		duration: 300,
	});
}

// ------- 祝福瀑布流数据 -------
const profiles = ref([]);
const loadedImageIds = ref(new Set());
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const deckProfiles = computed(() => filterBlessingCandidates(profiles.value, reviewedProfileIds.value, userInfo.value?.id ?? userInfo.value?.userId, activeProfileId.value));

function setBlessingViewMode(mode) {
	if (blessingActionBusy.value || rewindBusy.value) return;
	blessingViewMode.value = mode;
	uni.pageScrollTo({ scrollTop: 0, duration: 0 });
	measureRecommendationHeader();
}

function openBlessingProfile(profile) {
	uni.navigateTo({
		url: `/pages/searchPerson/personShow/personShow?id=${encodeURIComponent(profile.profileId)}`,
		fail: () => uni.showToast({ title: t('home.actionFailed'), icon: 'none' })
	});
}

function syncProfileLikeState(profile) {
	for (const item of profiles.value) if (String(item.profileId) === String(profile.profileId)) { item.isLiked = profile.isLiked; item.likeCount = profile.likeCount; item.mutual = profile.mutual; }
	for (const item of featuredItems.value) if (item.type === 'blessing' && String(item.id) === String(profile.profileId)) { item.isLiked = profile.isLiked; item.likeCount = profile.likeCount; item.mutual = profile.mutual; }
}

function setHomeModel(mode) {
	if (!blessingActionBusy.value && !rewindBusy.value) model.value = mode;
}

async function decideBlessingProfile(profile, decision) {
	activeProfileId.value = profile.profileId;
	cardSnapshots.set(String(profile.profileId), { ...profile });
	const result = await operations.decide(profile, decision, 'card');
	refreshMembership().catch(() => {});
	return result;
}

function onBlessingBusyChange(busy) {
	blessingActionBusy.value = busy;
	if (!busy) activeProfileId.value = null;
}

function retryProfileFeed() {
	if (loading.value || loadingMore.value) return;
	if (!membership.value && !membershipLoading.value) refreshMembership().catch(() => {});
	return loadFeed({ isRefresh: profileLoadError.value ? profileRetryRefresh : true });
}

function dismissBlessingCard({ profileId, direction, revision, result }) {
	if (revision !== blessingRevision.value) return;
	activeProfileId.value = null;
	notifyBlessingChanged({ ...result, profileId, decision: direction, source: 'card' });
}

function onBlessingChanged(change = {}) {
	if (change.profileId != null) {
		const id = String(change.profileId);
		localDecisionVersions.set(id, ++localDecisionVersion);
		syncProfileLikeState(change);
		if (change.rewound) reviewedProfileIds.value = reviewedProfileIds.value.filter(value => value !== id);
		else if (change.isLiked || change.decision === 'pass') reviewedProfileIds.value = [...new Set([...reviewedProfileIds.value, id])];
	}
	refreshMembership().catch(() => {});
}
uni.$on('blessing:changed', onBlessingChanged);
onBeforeUnmount(() => uni.$off('blessing:changed', onBlessingChanged));

async function rewindBlessingCard() {
	if (blessingActionBusy.value || rewindBusy.value || loading.value || loadingMore.value || !membership.value?.rewind?.available) return;
	rewindBusy.value = true;
	try {
		const { result, membership: freshMembership } = await operations.rewind(membership.value.rewind.actionId);
		membership.value = freshMembership;
		activeProfileId.value = null;
		let restored = cardSnapshots.get(String(result.profileId)) || profiles.value.find(item => String(item.profileId) === String(result.profileId));
		if (!restored) {
			try {
				const response = await getCandidateProfileApi(result.profileId);
				const p = response.profile;
				if (p) restored = { ...p, profileId: p.id, userId: p.user_id, displayName: [p.native_first_name || p.en_first_name, p.native_last_name || p.en_last_name].filter(Boolean).join(' '), avatarUrl: p.avatar_url, birthYear: p.birth_year, subRegion: p.sub_region, bio: p.bio || p.Selfintroduction };
			} catch (_) { /* A refresh can recover a restored profile if details are temporarily unavailable. */ }
		}
		if (restored) profiles.value = [{ ...restored, ...result, showComments: false, comments: restored.comments || [], commentDraft: '' }, ...profiles.value.filter(item => String(item.profileId) !== String(result.profileId))];
		blessingRevision.value++;
		notifyBlessingChanged({ ...result, rewound: true, source: 'card' });
		if (!restored) { rewindBusy.value = false; await loadFeed({ isRefresh: true }); }
	} catch (error) {
		if (!handleMembershipError(error)) uni.showToast({ title: t('deck.rewindFailed'), icon: 'none' });
		refreshMembership().catch(() => {});
	} finally { rewindBusy.value = false; }
}

async function openSearch() {
	try {
		const latest = await refreshMembership();
		if (!latest.canSearch) return openMembershipUpgrade('search');
		uni.navigateTo({ url: '/pages/searchPerson/searchPerson' });
	} catch (error) { if (!handleMembershipError(error)) uni.showToast({ title: t('home.actionFailed'), icon: 'none' }); }
}

// ------- 精选混排瀑布流数据 -------
const featuredItems = ref([]);
const featuredImageKeys = ref(new Set());
const featuredSeed = ref("");
const featuredCursor = ref("");
const featuredLoading = ref(false);
const featuredLoadingMore = ref(false);
const featuredLoadError = ref(false);
const featuredHasMore = ref(true);
const featuredRequestGuard = createLatestRequestGuard();
const visibleFeaturedItems = computed(() => filterFeaturedBlessings(featuredItems.value, reviewedProfileIds.value));
let featuredCommittedState = {
	seed: "",
	cursor: "",
	hasMore: true,
	imageKeys: new Set(),
};

const featuredColumns = computed(() => {
	const columns = [
		{ items: [], height: 0 },
		{ items: [], height: 0 },
	];

	const estimateFeaturedCardHeight = (item) => {
		const hasImage = !!featuredItemImage(item);
		const imageHeight = hasImage ? 420 : 180;
		const summaryLength = String(item.summary || "").length;
		const summaryLines = Math.min(6, Math.max(1, Math.ceil(summaryLength / 22)));
		const summaryHeight = summaryLines * 38;
		const titleHeight = item.type === "antique" || item.type === "second_hand" ? 60 : 0;
		const actionHeight = 90;
		const paddingHeight = 80;
		return imageHeight + summaryHeight + titleHeight + actionHeight + paddingHeight;
	};

	for (const item of visibleFeaturedItems.value) {
		const targetColumn =
			columns[0].height <= columns[1].height ? columns[0] : columns[1];
		targetColumn.items.push(item);
		targetColumn.height += estimateFeaturedCardHeight(item);
	}

	return [columns[0].items, columns[1].items];
});

function getFullImageUrl(path) {
	if (!path) return "";
	if (path.startsWith("http")) return path;
	return config.baseURL + path;
}

function getMainImage(item) {
	const photos = getProfilePhotos(item, config.baseURL);
	return photos[1] || photos[0] || '';
}

function isImageLoaded(profileId) {
	return loadedImageIds.value.has(String(profileId));
}

function markImageLoaded(profileId) {
	const next = new Set(loadedImageIds.value);
	next.add(String(profileId));
	loadedImageIds.value = next;
}

function isFeaturedImageLoaded(feedKey) {
	return featuredImageKeys.value.has(String(feedKey));
}

function markFeaturedImageLoaded(feedKey) {
	const next = new Set(featuredImageKeys.value);
	next.add(String(feedKey));
	featuredImageKeys.value = next;
}

function normalizeFeaturedItem(item) {
	return {
		...item,
		showComments: false,
		commentsLoading: false,
		comments: [],
		replyTarget: null,
		commentDraft: "",
	};
}

function formatLocation(item) {
	return (
		[item.country, item.region].filter(Boolean).join(" · ") ||
		item.occupation ||
		""
	);
}

async function loadFeed({ isRefresh }) {
	if (isRefresh && (blessingActionBusy.value || rewindBusy.value)) { uni.stopPullDownRefresh(); return; }
	if (!isRefresh && (loading.value || loadingMore.value || !hasMore.value)) return;
	const requestId = profileRequestGuard.begin();
	const decisionsBeforeRequest = localDecisionVersion;
	profileLoadError.value = false;
	if (isRefresh) {
		loading.value = true;
		loadingMore.value = false;
	} else {
		loadingMore.value = true;
	}

	try {
		const excludeIds = isRefresh
			? []
			: profiles.value.map((p) => p.profileId);
		const res = await getExploreFeedApi({ limit: 15, excludeIds });
		if (!profileRequestGuard.isCurrent(requestId)) return;

		const newItems = (res.profiles || []).map((p) => ({
			...p,
			showComments: false,
			commentsLoading: false,
			comments: [],
			replyTarget: null,
			commentDraft: "",
		}));

		reviewedProfileIds.value = reconcileBlessingExclusions(reviewedProfileIds.value, newItems, reviewedProfileIds.value.filter(id => (localDecisionVersions.get(id) || 0) > decisionsBeforeRequest));
		if (isRefresh) {
			profiles.value = mergeProfileBatch([], newItems);
			loadedImageIds.value = new Set();
			blessingRevision.value++;
		} else {
			const merged = mergeProfileBatch(profiles.value, newItems);
			if (merged.length === profiles.value.length) res.hasMore = false;
			profiles.value = merged;
		}
		hasMore.value = !!res.hasMore;
	} catch (e) {
		if (!profileRequestGuard.isCurrent(requestId)) return;
		profileLoadError.value = true;
		profileRetryRefresh = isRefresh;
		console.error("加载推荐失败", e);
		uni.showToast({ title: t('home.loadFailed'), icon: "none" });
	} finally {
		if (profileRequestGuard.isCurrent(requestId)) {
			loading.value = false;
			loadingMore.value = false;
			uni.stopPullDownRefresh();
		}
	}
}

function mergeFeaturedItems(items) {
	const seen = new Set(featuredItems.value.map((item) => item.feedKey));
	return featuredItems.value.concat(
		items.filter((item) => {
			if (seen.has(item.feedKey)) return false;
			seen.add(item.feedKey);
			return true;
		}),
	);
}

let featuredRetryRefresh = true;
function retryFeaturedFeed() {
	if (featuredLoading.value || featuredLoadingMore.value) return;
	if (!membership.value && !membershipLoading.value) refreshMembership().catch(() => {});
	return loadFeaturedFeed({ isRefresh: featuredLoadError.value ? featuredRetryRefresh : true });
}

async function loadFeaturedFeed({ isRefresh }) {
	if (!isRefresh && (featuredLoading.value || featuredLoadingMore.value || !featuredHasMore.value)) {
		return;
	}

	const requestId = featuredRequestGuard.begin();
	const decisionsBeforeRequest = localDecisionVersion;
	featuredLoadError.value = false;

	if (isRefresh) {
		featuredLoading.value = true;
		featuredLoadingMore.value = false;
		featuredSeed.value = '';
		featuredCursor.value = '';
		featuredHasMore.value = true;
		featuredImageKeys.value = new Set();
	} else {
		featuredLoadingMore.value = true;
	}

	try {
		const res = await getFeaturedFeedApi({
			limit: 15,
			seed: isRefresh ? undefined : featuredSeed.value,
			cursor: isRefresh ? undefined : featuredCursor.value,
		});
		if (!featuredRequestGuard.isCurrent(requestId)) return;
		const items = (res.items || []).map(normalizeFeaturedItem);
		reviewedProfileIds.value = reconcileBlessingExclusions(reviewedProfileIds.value, items.filter(item => item.type === 'blessing').map(item => ({ profileId: item.id, isLiked: item.isLiked })), reviewedProfileIds.value.filter(id => (localDecisionVersions.get(id) || 0) > decisionsBeforeRequest));

		featuredItems.value = isRefresh ? items : mergeFeaturedItems(items);
		featuredSeed.value = res.seed || featuredSeed.value;
		featuredCursor.value = res.nextCursor || '';
		featuredHasMore.value = !!res.hasMore;
		featuredCommittedState = {
			seed: featuredSeed.value,
			cursor: featuredCursor.value,
			hasMore: featuredHasMore.value,
			imageKeys: featuredImageKeys.value,
		};
	} catch (e) {
		if (!featuredRequestGuard.isCurrent(requestId)) return;
		featuredLoadError.value = true;
		featuredRetryRefresh = isRefresh;
		featuredSeed.value = featuredCommittedState.seed;
		featuredCursor.value = featuredCommittedState.cursor;
		featuredHasMore.value = featuredCommittedState.hasMore;
		featuredImageKeys.value = featuredCommittedState.imageKeys;
		console.error("加载精选失败", e);
		uni.showToast({ title: t('home.loadFailed'), icon: "none" });
	} finally {
		if (!featuredRequestGuard.isCurrent(requestId)) return;
		featuredLoading.value = false;
		featuredLoadingMore.value = false;
		uni.stopPullDownRefresh();
	}
}

function featuredCardRoute(item) {
	return featuredItemRoute(item);
}

function openFeaturedItem(item) {
	const route = featuredItemRoute(item);
	if (!route) return;
	uni.navigateTo({ url: route });
}

onPullDownRefresh(() => {
	refreshMembership().catch(() => {});
	if (currentEntryIndex.value === 0) {
		loadFeaturedFeed({ isRefresh: true });
	} else if (currentEntryIndex.value === 1) {
		loadFeed({ isRefresh: true });
	} else {
		uni.stopPullDownRefresh();
	}
});

onPageScroll(({ scrollTop }) => {
	recommendationHeaderFixed.value =
		model.value === "recommend" && !(currentEntryIndex.value === 1 && blessingViewMode.value === 'cards') && scrollTop > 8;
});

onReachBottom(() => {
	if (model.value !== 'recommend') return;
	if (currentEntryIndex.value === 0) {
		loadFeaturedFeed({ isRefresh: false });
	} else if (currentEntryIndex.value === 1 && blessingViewMode.value === 'list') {
		loadFeed({ isRefresh: false });
	}
});

// ------- 点赞 -------
async function toggleLike(item, source = 'list') {
	const id = String(item.profileId);
	if (pendingProfileIds.has(id) || blessingActionBusy.value || rewindBusy.value) return;
	pendingProfileIds.add(id);
	item.likeBusy = true;
	try {
		const result = item.isLiked
			? await toggleProfileLikeApi(item.profileId, false)
			: await operations.decide(item, 'like', source);
		notifyBlessingChanged({ ...result, profileId: item.profileId, source });
	} catch (e) {
		console.error("点赞失败", e);
		if (!handleMembershipError(e)) uni.showToast({ title: t('home.actionFailed'), icon: "none" });
	} finally {
		item.likeBusy = false;
		pendingProfileIds.delete(id);
	}
}

function isFeaturedLikeAvailable(item) {
	return item.type === "blessing" || item.type === "moment";
}

function isFeaturedCommentAvailable(item) {
	return item.type === "blessing" || item.type === "moment";
}

function getFeaturedLikeApi(item) {
	if (item.type === "moment") return toggleLikeMomentApi;
	if (item.type === "blessing") return toggleProfileLikeApi;
	return null;
}

function getFeaturedCommentsApi(item) {
	if (item.type === "moment") return getCommentsApi;
	if (item.type === "blessing") return getProfileCommentsApi;
	return null;
}

function getFeaturedAddCommentApi(item) {
	if (item.type === "moment") return addCommentApi;
	if (item.type === "blessing") return addProfileCommentApi;
	return null;
}

async function toggleFeaturedLike(item) {
	if (item.type === 'blessing') {
		const profile = { profileId: item.id, isLiked: item.isLiked, likeCount: item.likeCount };
		await toggleLike(profile, 'featured');
		return;
	}
	const likeApi = getFeaturedLikeApi(item);
	if (!likeApi) return;

	const prevLiked = item.isLiked;
	const prevCount = item.likeCount || 0;
	item.isLiked = !prevLiked;
	item.likeCount = prevCount + (item.isLiked ? 1 : -1);

	try {
		const res = await likeApi(item.id);
		item.isLiked = !!res.isLiked;
		item.likeCount = Number(res.likeCount || 0);
	} catch (e) {
		console.error("精选点赞失败", e);
		item.isLiked = prevLiked;
		item.likeCount = prevCount;
		uni.showToast({ title: t('home.actionFailed'), icon: "none" });
	}
}

function toggleFeaturedCommentPanel(item) {
	item.showComments = !item.showComments;
	if (
		item.showComments &&
		item.comments.length === 0 &&
		!item.commentsLoading
	) {
		loadFeaturedComments(item);
	}
}

async function loadFeaturedComments(item) {
	const loadCommentsApi = getFeaturedCommentsApi(item);
	if (!loadCommentsApi) return;

	item.commentsLoading = true;
	try {
		const res = await loadCommentsApi(item.id);
		item.comments = res.comments || [];
	} catch (e) {
		console.error("获取精选评论失败", e);
		uni.showToast({ title: t('home.getCommentsFailed'), icon: "none" });
	} finally {
		item.commentsLoading = false;
	}
}

function startFeaturedReply(item, comment) {
	item.replyTarget = {
		userId: comment.user_id,
		email: commentDisplayName(comment, t('common.user')),
	};
}

function cancelFeaturedReply(item) {
	item.replyTarget = null;
}

async function submitFeaturedComment(item) {
	const submitApi = getFeaturedAddCommentApi(item);
	if (!submitApi || item.commentSubmitting) return;

	const text = (item.commentDraft || "").trim();
	if (!text) return;
	item.commentSubmitting = true;
	try {
		const res = item.type === 'blessing'
			? await submitApi(item.id, text, item.replyTarget?.userId, commentRequestId(item, text))
			: await submitApi(item.id, text, item.replyTarget?.userId);
		item.comments.push(res.comment);
		item.commentCount = (item.commentCount || 0) + 1;
		item.commentDraft = "";
		item.replyTarget = null;
		item.showComments = false;
		item.commentRequest = null;
		if (item.type === 'blessing') refreshMembership().catch(() => {});
	} catch (e) {
		console.error("发表精选评论失败", e);
		if (e?.code) item.commentRequest = null;
		if (item.type !== 'blessing' || !handleMembershipError(e)) uni.showToast({ title: t('home.commentFailed'), icon: "none" });
	} finally { item.commentSubmitting = false; }
}

// ------- 评论 -------
function toggleCommentPanel(item) {
	item.showComments = !item.showComments;
	if (
		item.showComments &&
		item.comments.length === 0 &&
		!item.commentsLoading
	) {
		loadComments(item);
	}
}

async function loadComments(item) {
	item.commentsLoading = true;
	try {
		const res = await getProfileCommentsApi(item.profileId);
		item.comments = res.comments || [];
	} catch (e) {
		console.error("获取评论失败", e);
		uni.showToast({ title: t('home.getCommentsFailed'), icon: "none" });
	} finally {
		item.commentsLoading = false;
	}
}

function startReply(item, comment) {
	item.replyTarget = {
		userId: comment.user_id,
		email: commentDisplayName(comment, t('common.user')),
	};
}

function cancelReply(item) {
	item.replyTarget = null;
}

async function submitComment(item) {
	const text = (item.commentDraft || "").trim();
	if (!text || item.commentSubmitting) return;
	item.commentSubmitting = true;
	try {
		const res = await addProfileCommentApi(
			item.profileId,
			text,
			item.replyTarget?.userId,
			commentRequestId(item, text),
		);
		item.comments.push(res.comment);
		item.commentCount = (item.commentCount || 0) + 1;
		item.commentDraft = "";
		item.replyTarget = null;
		item.commentRequest = null;
		refreshMembership().catch(() => {});
	} catch (e) {
		console.error("评论失败", e);
		if (e?.code) item.commentRequest = null;
		if (!handleMembershipError(e)) uni.showToast({ title: t('home.commentFailed'), icon: "none" });
	} finally { item.commentSubmitting = false; }
}

function commentRequestId(item, text) {
	const fingerprint = JSON.stringify([text, item.replyTarget?.userId || null]);
	if (item.commentRequest?.fingerprint !== fingerprint) item.commentRequest = { fingerprint, id: createMembershipRequestId() };
	return item.commentRequest.id;
}

const originalEntries = computed(() => [
	{ name: t('home.featured'), page: "/pages/choose/index" },
	{ name: t('home.blessing'), page: "/pages/wishes/index" },
	{ name: t('home.antique'), page: "/pages/market/marketList?category=antique" },
	{ name: t('home.secondHand'), page: "/pages/market/marketList?category=second_hand" },
	{ name: t('home.searchPeople'), page: "/pages/searchPerson/searchPerson", searchOnly: true },
	{ name: '社区', page: "/pages/community/index" },
	{ name: '需求市场', page: "/pages/demandhall/index" },
]);

const currentEntryIndex = ref(1);

watch(() => [visibleFeaturedItems.value.length, featuredLoading.value, featuredLoadingMore.value, currentEntryIndex.value, model.value], () => {
	if (model.value === 'recommend' && currentEntryIndex.value === 0 && visibleFeaturedItems.value.length === 0
		&& featuredHasMore.value && !featuredLoading.value && !featuredLoadingMore.value && !featuredLoadError.value) loadFeaturedFeed({ isRefresh: false });
}, { flush: 'post' });

watch(() => [deckProfiles.value.length, loading.value, loadingMore.value, currentEntryIndex.value, blessingViewMode.value, model.value], () => {
	const needsMore = blessingViewMode.value === 'cards' ? deckProfiles.value.length <= 3 : deckProfiles.value.length === 0;
	if (model.value === 'recommend' && currentEntryIndex.value === 1 && needsMore
		&& hasMore.value && !loading.value && !loadingMore.value && !profileLoadError.value && !rewindBusy.value) {
		loadFeed({ isRefresh: false });
	}
}, { flush: 'post' });

const handleEntryClick = (index, url) => {
	if (blessingActionBusy.value || rewindBusy.value) return;
	if (url === '/pages/searchPerson/searchPerson') { openSearch(); return; }
	if (index >= 4) {
		uni.navigateTo({
			url: url,
		});
		return;
	}
	currentEntryIndex.value = index;
	recommendationHeaderFixed.value = false;
	measureRecommendationHeader();
	if (
		index === 0 &&
		featuredItems.value.length === 0 &&
		!featuredSeed.value &&
		!featuredLoading.value
	) {
		loadFeaturedFeed({ isRefresh: true });
	}
};
</script>

<style scoped lang="scss">
// Insta360 风格品牌色
$brand-yellow: #ffce00;
$bg-color: #ffffff;
$text-main: #1a1a1a;
$text-sub: #999999;
$gray-bg: #f5f6f8;

.container {
	background-color: $bg-color;
	/* #ifndef H5 */
	min-height: 100vh;
	/* #endif */
	padding-bottom: calc(300rpx + env(safe-area-inset-bottom));
	position: relative;
}
/* #ifdef H5 */
.container { padding-bottom: calc(300rpx + env(safe-area-inset-bottom)); }
/* #endif */

.recommendation-sticky-header {
	background-color: $bg-color;

	&.is-fixed {
		position: fixed;
		top: 0;
		right: 0;
		left: 0;
		z-index: 100;
		width: 100%;
		box-sizing: border-box;
	}
}

/* --- 1. 顶部导航栏 --- */
.header-nav {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 30rpx;
	background-color: $bg-color;

	.nav-left {
		.avatar-circle {
			width: 70rpx;
			height: 70rpx;
			border-radius: 50%;
			background-color: #e8e8e8;
			display: flex;
			justify-content: center;
			align-items: center;
			.avatar-img1 {
				width: 100%;
				height: 100%;
				border-radius: 50%;
			}
		}
	}

	.nav-center {
		display: flex;
		gap: 32rpx;
		align-items: center;

		.nav-tab {
			font-size: 32rpx;
			color: $text-sub;
			position: relative;
			padding-bottom: 10rpx;

			&.active {
				color: $text-main;
				font-weight: bold;
				font-size: 34rpx;
			}

			.tab-line {
				position: absolute;
				bottom: 0;
				left: 50%;
				transform: translateX(-50%);
				width: 40rpx;
				height: 6rpx;
				border-radius: 4rpx;
				background-color: $brand-yellow;
			}
		}
	}
}

/* --- 2. 搜索栏 --- */
.search-container {
	padding: 10rpx 30rpx 20rpx;
	background-color: $bg-color; /* 新增背景色，避免透缝 */

	.search-box {
		width: 100%;
		height: 72rpx;
		background-color: $gray-bg;
		border-radius: 36rpx;
		display: flex;
		justify-content: center;
		align-items: center;

		.search-placeholder {
			font-size: 28rpx;
			color: #b0b0b0;
		}
	}
}

/* --- 3. 横向滚动 Tab (原业务入口) --- */
.scroll-tabs-wrapper {
	display: flex;
	align-items: center;
	padding: 0 0 20rpx 30rpx;
	background-color: $bg-color; /* 新增背景色，避免透缝 */

	.scroll-tabs {
		flex: 1;
		overflow: hidden;
		white-space: nowrap;

		::-webkit-scrollbar {
			display: none;
			width: 0;
			height: 0;
			color: transparent;
		}

		.tabs-content {
			display: inline-flex;
			padding-right: 20rpx;
		}

		.tab-pill {
			height: 64rpx;
			padding: 0 32rpx;
			background-color: $gray-bg;
			border-radius: 32rpx;
			display: flex;
			justify-content: center;
			align-items: center;
			margin-right: 20rpx;

			text {
				font-size: 28rpx;
				color: $text-main;
				font-weight: 500;
			}

			&.active {
				background-color: $brand-yellow;

				text {
					font-weight: bold;
				}
			}
		}
	}

	.filter-icon-box {
		width: 80rpx;
		display: flex;
		justify-content: center;
		align-items: center;
		background: linear-gradient(
			270deg,
			#ffffff 60%,
			rgba(255, 255, 255, 0) 100%
		);
		position: relative;
		z-index: 2;
	}
}

/* #ifdef H5 */
.recommendation-sticky-header.is-fixed {
	top: var(--window-top, 44px);
}

.scroll-tabs-wrapper {
	.scroll-tabs {
		.tabs-content {
			flex-wrap: nowrap;
		}

		.tab-pill {
			flex: 0 0 auto;
			white-space: nowrap;

			text {
				white-space: nowrap;
			}
		}
	}
}
/* #endif */

/* --- 4. 帖子信息流区 --- */
.feed-container {
	padding: 10rpx 30rpx;
	box-sizing: border-box;
}

.waterfall-grid {
	display: flex;
	align-items: flex-start;
	gap: 20rpx;
	width: 100%;
	max-width: 100%;
	box-sizing: border-box;
}

.waterfall-column {
	flex: 1 1 0;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.load-more-tip {
	text-align: center;
	padding: 30rpx 0;
	color: $text-sub;
	font-size: 24rpx;
}

.avatar-img {
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
}

.post-card {
	margin-bottom: 40rpx;

	&.navigable {
		cursor: pointer;
	}

	&.featured-card {
		margin-bottom: 0;
		padding: 20rpx;
		box-sizing: border-box;
		background-color: #ffffff;
		border-radius: 20rpx;
		box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.05);
		overflow: hidden;

		.post-media {
			min-height: 0;

			&.is-image-loading {
				min-height: 260rpx;
			}
		}

		.post-avatar {
			flex: 0 0 70rpx;

			.avatar-img {
				width: 100%;
				height: 100%;
			}
		}
	}

	.post-header {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;

		.post-avatar {
			width: 70rpx;
			height: 70rpx;
			border-radius: 50%;
			background-color: #e8e8e8;
			display: flex;
			justify-content: center;
			align-items: center;
			margin-right: 20rpx;
			overflow: hidden;
		}

		.post-user-info {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-width: 0;

			.username {
				display: block;
				font-size: 32rpx;
				font-weight: bold;
				color: $text-main;
				line-height: 1.2;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.location-box {
				display: flex;
				align-items: center;
				margin-top: 4rpx;

				.location {
					display: block;
					font-size: 24rpx;
					color: $text-sub;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
			}
		}
	}

	.post-media {
		width: 100%;
		min-height: 420rpx;
		border-radius: 20rpx;
		overflow: hidden;
		position: relative;

		.media-skeleton {
			position: absolute;
			z-index: 1;
			inset: 0;
			display: flex;
			flex-direction: column;
			justify-content: flex-end;
			gap: 16rpx;
			padding: 30rpx;
			box-sizing: border-box;
			background: linear-gradient(100deg, #eeeeee 30%, #f6f6f6 50%, #eeeeee 70%);
			background-size: 200% 100%;
			animation: media-skeleton-shimmer 1.2s infinite;
		}

		.skeleton-line {
			height: 22rpx;
			border-radius: 12rpx;
			background: rgba(255, 255, 255, 0.72);
		}

		.skeleton-line-wide { width: 58%; }
		.skeleton-line-short { width: 32%; }

		.media-img {
			width: 100%;
			height: auto;
			display: block;
			background-color: #f0f0f0;
		}
	}

	.post-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 24rpx;

		.actions-left {
			display: flex;
			align-items: center;
			gap: 30rpx;

			.action-btn {
				display: flex;
				align-items: center;

				.action-icon {
					font-size: 32rpx;
				}

				.action-num {
					font-size: 26rpx;
					color: $text-sub;
					margin-left: 8rpx;
				}
			}
		}
	}

	.featured-title,
	.featured-summary {
		margin-top: 18rpx;
		font-size: 28rpx;
		line-height: 1.5;
		color: $text-main;
	}

	.featured-title {
		font-size: 30rpx;
		font-weight: bold;
	}

	.featured-price {
		margin-top: 10rpx;
		font-size: 28rpx;
		font-weight: bold;
		color: #dc5b3f;
	}

	.featured-summary {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}

	.meta-box {
		margin-top: 16rpx;
		padding: 16rpx 20rpx;
		background-color: #f7f7f7;
		border-radius: 8rpx;
	}

	.comment-loading,
	.comment-empty {
		font-size: 24rpx;
		color: $text-sub;
		padding: 10rpx 0;
	}

	.comment-item {
		font-size: 26rpx;
		color: #333;
		line-height: 1.6;
		margin-bottom: 6rpx;

		.comment-author,
		.comment-reply-arrow {
			color: #576b95;
		}
	}

	.comment-input-row {
		margin-top: 10rpx;

		.reply-target-tag {
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: 24rpx;
			color: #888888;
			margin-bottom: 8rpx;
			padding: 0 6rpx;

			.reply-cancel {
				color: #aaaaaa;
				font-size: 32rpx;
				padding: 0 10rpx;
			}
		}

		.comment-input-inner {
			display: flex;
			align-items: center;
			gap: 16rpx;

			.comment-input {
				flex: 1;
				height: 60rpx;
				background-color: #ffffff;
				border-radius: 30rpx;
				padding: 0 20rpx;
				font-size: 26rpx;
			}

			.comment-send-btn {
				color: $text-main;
				font-size: 28rpx;
				flex-shrink: 0;
			}
		}
	}
}

@keyframes media-skeleton-shimmer {
	from { background-position: 100% 0; }
	to { background-position: -100% 0; }
}

/* --- 5. 悬浮按钮 (FAB) — 改为回到顶部 --- */
.fab-button {
	position: fixed;
	right: 40rpx;
	--app-fixed-bottom-base: calc(var(--window-bottom, 50px) + 24rpx);
	width: 100rpx;
	height: 100rpx;
	background-color: $brand-yellow;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	box-shadow: 0 8rpx 16rpx rgba(255, 206, 0, 0.4);
	z-index: 99;
}
/* #ifndef H5 */
.fab-button { bottom: 200rpx; }
/* #endif */

.safe-area-bottom {
	height: env(safe-area-inset-bottom);
}
.container.liquid-tab-page {
	padding-bottom: calc(104px + env(safe-area-inset-bottom));
}
.blessing-section {
	padding: 0 12px;
	--blessing-card-height: max(280px, min(680px, calc(100vh - var(--window-top, 0px) - var(--blessing-header-height, 180px) - 180px - env(safe-area-inset-bottom))));
	/* #ifdef H5 */
	--blessing-card-height: max(280px, min(680px, calc(var(--app-layout-viewport-height, 100dvh) - var(--window-top, 0px) - var(--blessing-header-height, 180px) - 180px - env(safe-area-inset-bottom))));
	/* #endif */
}
.blessing-toolbar { max-width: 460px; margin: 0 auto 4px; min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.blessing-heading { font-size: 16px; font-weight: 600; letter-spacing: .5px; color: #28292d; padding-left: 5px; }
.blessing-quota { max-width: 460px; width: 100%; min-height: 44px; padding: 8px 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 14px; font-size: 12px; line-height: 1.6; color: #87713b; background: transparent; }
.blessing-quota::after { border: 0; }
.blessing-quota.has-error { background: #faf6e9; }
.blessing-quota[disabled] { color: #8b8983; background: transparent; }
.blessing-view-switch { display: flex; padding: 3px; border-radius: 24px; background: #e9e9ec; }
.blessing-view-switch button { min-width: 66px; height: 38px; margin: 0; padding: 0 11px; display: flex; align-items: center; justify-content: center; gap: 5px; border-radius: 22px; font-size: 12px; line-height: 1.2; color: #77787d; background: transparent; transition: background 180ms; }
.blessing-view-switch button::after { border: none; }
.blessing-view-switch button.selected { color: #1c1c1e; background: #fff; box-shadow: 0 1px 4px rgba(15,15,20,.08); }
.blessing-view-switch button[disabled] { opacity: .55; }
.blessing-list { padding: 8px 0 0; }
.blessing-retry { margin: 12px auto; padding: 12px 18px; max-width: 320px; min-height: 44px; font-size: 13px; line-height: 1.5; color: #6c592e; text-align: center; background: #faf6e9; border: 0; border-radius: 22px; transition: transform 140ms cubic-bezier(.23,1,.32,1); }
.blessing-retry::after { border: 0; }
.blessing-retry:active { transform: scale(.97); }
.is-like-busy { opacity: .5; pointer-events: none; }
.container.is-card-home { background: #f5f5f7; overflow-x: hidden; }
.is-card-home .recommendation-sticky-header, .is-card-home .header-nav { background: #f5f5f7; }
.is-card-home .header-nav { padding-top: 12px; padding-bottom: 7px; }
.is-card-home .search-container, .is-card-home .filter-icon-box, .is-card-home .safe-area-bottom { display: none; }
.is-card-home .scroll-tabs-wrapper { padding-top: 4px; padding-bottom: 4px; background: transparent; }
.fab-button { --app-fixed-bottom-base: calc(108px + env(safe-area-inset-bottom)); bottom: calc(108px + env(safe-area-inset-bottom)); }
@media (prefers-reduced-motion: reduce) { .blessing-view-switch button { transition: none; } }
</style>
<style scoped>
/* #ifndef H5 */
.container { min-height: 100vh; }
/* #endif */
</style>
