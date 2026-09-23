<template>
	<view class="container app-h5-min-screen liquid-tab-page" :class="{ 'is-tutorial-home': model === 'tutorial' || model === 'activity', 'is-recommend-home': model === 'recommend', 'is-card-home': model === 'recommend' && currentEntryIndex === 1 && blessingViewMode === 'cards' }" :style="{ '--blessing-header-height': recommendationHeaderHeight + 'px' }">
		<!-- 状态栏占位 -->
		<!-- <view
			class="status-bar"
			:style="{ height: statusBarHeight + 'px' }"
		></view> -->

		<view
			class="recommendation-sticky-placeholder"
			:style="{ height: recommendationHeaderHeight + 'px' }"
		></view>
		<view
			class="recommendation-sticky-header"
			:class="{ 'is-fixed': true, 'is-collapsed': recommendationHeaderFixed }"
            :style="homeHeaderStyle"
		>
            <view class="home-brand-row" :style="{ paddingRight: homeGeometry.contentRight + 'px' }" aria-label="BLESS">
                <image class="home-brand-symbol" src="/static/brand/bless-heart-mark.svg" mode="aspectFit" />
                <text class="home-brand-wordmark">BLESS</text>
            </view>
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

			<scroll-view class="nav-center" scroll-x :show-scrollbar="false"><view class="nav-links">
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
					<text class="tab-text">{{ hs('recommend') }}</text>
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
					<text class="tab-text">{{ hs('finance') }}</text>
				</view>
			</view></scroll-view>

			<view class="nav-right">
				<!-- 右侧消息图标 -->
				<uni-icons type="mail" size="28" color="#333"></uni-icons>
			</view>
			</view>
			<view v-show="model === 'recommend'">
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
                <button class="home-search-trigger" :aria-label="homeSearchLabel" @click="openHomeSearch"><uni-icons type="search" size="22" color="#45413a"/><view v-if="currentEntryIndex === 0 && (featuredKeyword || featuredTypes.length)" class="search-active-dot"/></button>
			</view>
		</view>
		</view>
		<view v-show="model === 'recommend'">
			<MarketPreviewSection v-if="visitedEntries[2]" v-show="currentEntryIndex === 2" ref="antiqueList" :active="model === 'recommend' && currentEntryIndex === 2" category="antique" compact :title="t('home.antique')" />
			<MarketPreviewSection v-if="visitedEntries[3]" v-show="currentEntryIndex === 3" ref="secondHandList" :active="model === 'recommend' && currentEntryIndex === 3" category="second_hand" compact :title="t('home.secondHand')" />
			<!-- 精选混排信息流 -->
			<view class="feed-container" v-show="currentEntryIndex === 0">
                <view v-if="featuredKeyword || featuredTypes.length" class="featured-search-summary" @click="openHomeSearch"><text v-if="featuredKeyword">{{ featuredKeyword }}</text><text v-for="type in featuredTypes" :key="type">{{ hs(type) }}</text><uni-icons type="settings" size="16" color="var(--bless-text, #775E25)"/></view>
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
							:class="{ navigable: featuredCardRoute(item), 'featured-market-card': isFeaturedMarket(item) }"
							v-for="item in columnItems"
							:key="item.feedKey"
							@click="openFeaturedItem(item)"
						>
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
								<text v-if="item.type === 'antique' || item.type === 'second_hand'" class="featured-kind">{{ t(item.type === 'antique' ? 'home.antique' : 'home.secondHand') }}</text>
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

							<view class="featured-footer">
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

							<view class="post-actions">
								<view class="actions-left">
									<view
										class="action-btn"
										v-if="isFeaturedLikeAvailable(item)"
										@click.stop="toggleFeaturedLike(item)"
									>
										<uni-icons :type="item.isLiked ? 'heart-filled' : 'heart'" size="18" :color="item.isLiked ? 'var(--bless-primary, #C2A052)' : '#77787d'" />
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
											type="chatbubble"
											size="18"
											color="#77787d"
										></uni-icons>
										<text class="action-num">{{
											item.commentCount || 0
										}}</text>
									</view>
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
			<view class="blessing-section" v-show="currentEntryIndex === 1">
				<view class="blessing-toolbar" :class="{ 'list-toolbar': blessingViewMode === 'list' }">
					<button class="blessing-quota-inline" :aria-label="remainingQuota" :disabled="membershipLoading" @click="onMembershipQuotaTap"><uni-icons :type="membershipLoadError ? 'refreshempty' : 'heart-filled'" size="14" color="var(--bless-text, #775E25)" /><text>{{ compactLikes }}</text><text class="quota-separator">·</text><uni-icons type="undo" size="16" color="var(--bless-text, #775E25)" /><text>{{ compactRewinds }}</text></button>
					<view class="blessing-view-switch">
						<button :class="{ selected: blessingViewMode === 'cards' }" :aria-label="t('deck.cardMode')" :aria-pressed="blessingViewMode === 'cards'" :disabled="blessingActionBusy" @click="setBlessingViewMode('cards')"><uni-icons type="images" size="17" :color="blessingViewMode === 'cards' ? '#1c1c1e' : '#77787d'" /><text>{{ t('deck.cards') }}</text></button>
						<button :class="{ selected: blessingViewMode === 'list' }" :aria-label="t('deck.listMode')" :aria-pressed="blessingViewMode === 'list'" :disabled="blessingActionBusy" @click="setBlessingViewMode('list')"><uni-icons type="list" size="17" :color="blessingViewMode === 'list' ? '#1c1c1e' : '#77787d'" /><text>{{ t('deck.list') }}</text></button>
					</view>
				</view>
				<BlessingCardDeck
					v-show="blessingViewMode === 'cards'"
					:items="deckProfiles"
					:quota-text="''"
					:quota-loading="membershipLoading"
					:quota-error="membershipLoadError"
					@quota-tap="onMembershipQuotaTap"
					:active="model === 'recommend' && currentEntryIndex === 1 && blessingViewMode === 'cards'"
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

                <view v-for="item in deckProfiles" :key="item.profileId" class="blessing-profile-card">
                  <view class="blessing-profile-header" @click="openBlessingProfile(item)">
                    <image v-if="item.avatarUrl" class="blessing-avatar" :src="getFullImageUrl(item.avatarUrl)" mode="aspectFill" />
                    <view v-else class="blessing-avatar avatar-empty"><uni-icons type="person-filled" size="25" color="#bcb8b0" /></view>
                    <view class="blessing-identity"><view class="blessing-name-row"><text class="blessing-name">{{ item.displayName }}</text><text v-if="getProfileAge(item.birthYear) !== null" class="blessing-age">{{ getProfileAge(item.birthYear) }}</text></view><text class="blessing-location">{{ formatLocation(item) }}</text></view>
                    <uni-icons type="right" size="18" color="#b6b1a8" />
                  </view>
                  <view class="blessing-photo">
                    <swiper v-if="getProfilePhotos(item, config.baseURL).length" class="blessing-photo-swiper" :current="listPhotoIndexes[item.profileId] || 0" :autoplay="false" :circular="false" @change="listPhotoIndexes[item.profileId] = $event.detail.current">
                      <swiper-item v-for="url in getProfilePhotos(item, config.baseURL)" :key="url"><image :src="url" mode="aspectFit" class="blessing-photo-image" :lazy-load="true" @click="openBlessingProfile(item)" /></swiper-item>
                    </swiper>
                    <view v-else class="blessing-no-photo" @click="openBlessingProfile(item)"><uni-icons type="image" size="40" color="#c7c0b3" /><text>{{ t('deck.noPhoto') }}</text></view>
                    <text v-if="getProfilePhotos(item, config.baseURL).length > 1" class="blessing-photo-count">{{ (listPhotoIndexes[item.profileId] || 0) + 1 }}/{{ getProfilePhotos(item, config.baseURL).length }}</text>
                  </view>
                  <view class="blessing-card-footer">
                    <view class="blessing-footer-row"><text class="blessing-facts">{{ item.occupation || '' }}</text><button class="blessing-like" :disabled="item.likeBusy" :aria-label="t('deck.like')" @click.stop="toggleLike(item)"><uni-icons :type="item.isLiked ? 'heart-filled' : 'heart'" size="25" color="var(--bless-text, #775E25)" /><text>{{ item.likeCount || 0 }}</text></button></view>
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
		<TutorialLibrary v-if="tutorialVisited" v-show="model === 'tutorial'" ref="tutorialLibrary" />
		<ActivityLibrary v-if="activityVisited" v-show="model === 'activity'" ref="activityLibrary" />
		<!-- 底部安全区留白 -->
		<view class="safe-area-bottom"></view>
		<LiquidGlassTabBar active-route="pages/index/index360" :hidden="sheetProfileId != null" />
        <SlideUpPanel fixed :open="quotaInfoOpen" :z-index="350" :label="t('home.blessing')" @dismiss="quotaInfoOpen = false">
          <view class="home-search-sheet">
            <view class="sheet-handle" />
            <view class="home-sheet-title"><text>{{ t('home.blessing') }}</text><button :aria-label="hs('close')" @click="quotaInfoOpen = false"><uni-icons type="closeempty" size="24" /></button></view>
            <text class="quota-description">{{ remainingQuota }}</text>
          </view>
        </SlideUpPanel>
        <SlideUpPanel fixed :open="featuredFilterOpen" :z-index="350" :label="hs('featured')" @dismiss="featuredFilterOpen = false">
          <view class="home-search-sheet">
            <view class="sheet-handle"/><view class="home-sheet-title"><text>{{ hs('featured') }}</text><button :aria-label="hs('close')" @click="featuredFilterOpen = false"><uni-icons type="closeempty" size="24"/></button></view>
            <view class="home-keyword"><uni-icons type="search" size="21" color="#918b80"/><input v-model="draftFeaturedKeyword" :placeholder="hs('featured')" maxlength="100" confirm-type="search" @confirm="applyFeaturedSearch"/></view>
            <view class="home-type-heading"><text>{{ hs('types') }}</text><text>{{ hs('hint') }}</text></view>
            <view class="home-type-options"><button :class="{selected: !draftFeaturedTypes.length}" @click="draftFeaturedTypes = []">{{ hs('all') }}</button><button v-for="type in featuredTypeOptions" :key="type" :class="{selected: draftFeaturedTypes.includes(type)}" @click="toggleFeaturedType(type)">{{ hs(type) }}</button></view>
            <view class="home-search-actions"><button @click="resetFeaturedDraft">{{ hs('reset') }}</button><button class="apply" @click="applyFeaturedSearch">{{ hs('apply') }}</button></view>
          </view>
        </SlideUpPanel>
		<ProfileDetailSheet :profile-id="sheetProfileId" :page-visible="sheetPageVisible" @closed="closeProfileSheet" />
	</view>
</template>

<script setup>
import { toggleMarketLikeApi, getMarketCommentsApi, addMarketCommentApi } from '@/api/market.js';
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from "vue";
import { onPullDownRefresh, onReachBottom, onPageScroll, onShow, onResize, onBackPress, onHide } from "@dcloudio/uni-app";
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
import TutorialLibrary from "./components/TutorialLibrary.vue";
import { consumeTutorialHomeTarget } from '@/utils/tutorials.js';
import ActivityLibrary from "./components/ActivityLibrary.vue";
import MarketPreviewSection from "@/components/market/MarketPreviewSection.vue";
import BlessingCardDeck from '@/components/profile/BlessingCardDeck.vue';
import ProfileDetailSheet from '@/components/profile/ProfileDetailSheet.vue';
import { useProfileDetailSheet } from '@/utils/useProfileDetailSheet.js';
import FeedContentState from '@/components/feedback/FeedContentState.vue';
import LiquidGlassTabBar from '@/components/navigation/LiquidGlassTabBar.vue';
import { getProfileAge, getProfilePhotos, mergeProfileBatch } from '@/utils/blessingDeck.js';
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
import SlideUpPanel from '@/components/common/SlideUpPanel.vue';
import { readChatHeaderGeometry } from '@/utils/chatHeaderLayout.js';
import { homeSearchMessages } from '@/utils/homeSearchMessages.js';
import { currentLocale, t, updateTabBarLocale } from '@/utils/localeRuntime.js';


const { profileId: sheetProfileId, pageVisible: sheetPageVisible, open: openProfileSheet, close: closeProfileSheet } = useProfileDetailSheet();
onShow(() => {
	updateTabBarLocale();
	refreshMembership().catch(() => {});
	const tutorialTarget = consumeTutorialHomeTarget();
	if (tutorialTarget === 'tutorial') setHomeModel('tutorial');
	else if (['blessing', 'antique', 'second_hand'].includes(tutorialTarget)) {
		setHomeModel('recommend');
		handleEntryClick({ blessing: 1, antique: 2, second_hand: 3 }[tutorialTarget]);
		uni.pageScrollTo({ scrollTop: 0, duration: 0 });
	}
});

// 状态栏高度适配
const statusBarHeight = ref(44);
const model = ref("recommend");
const tutorialVisited = ref(false), tutorialLibrary = ref(null);
const activityVisited = ref(false), activityLibrary = ref(null);
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

const listPhotoIndexes = ref({});

const quotaInfoOpen = ref(false);
const compactQuotaAmount = kind => {
	if (membershipLoading.value) return '…';
	if (membershipLoadError.value) return '—';
	const value = membership.value?.usage?.[kind]?.remaining;
	return value === null ? '∞' : String(value ?? '—');
};
const compactLikes = computed(() => compactQuotaAmount('like'));
const compactRewinds = computed(() => compactQuotaAmount('rewind'));
const remainingQuota = computed(() => {
	if (!membership.value?.usage) return t(membershipLoadError.value ? 'deck.quotaRetry' : 'deck.quotaLoading');
	const amount = value => value === null ? t('deck.unlimited') : String(value ?? '—');
	return t('deck.quota', { likes: amount(membership.value.usage.like?.remaining), rewinds: amount(membership.value.usage.rewind?.remaining) });
});

function onMembershipQuotaTap() {
	if (membershipLoading.value) return;
	if (!membership.value || membershipLoadError.value) refreshMembership().catch(() => {});
	else quotaInfoOpen.value = true;
}
const hs = key => (homeSearchMessages[currentLocale.value] || homeSearchMessages.en)[key] || homeSearchMessages.en[key];
let homePlatform = '';
// #ifdef MP-WEIXIN
homePlatform = 'mp-weixin';
// #endif
const homeGeometry = ref(readChatHeaderGeometry(uni, { clearCapsule: false }, homePlatform));
const headerScroll = ref(0);
const homeHeaderStyle = computed(() => ({ paddingTop: homeGeometry.value.contentTop + 'px', backgroundColor: 'rgba(245,245,247,' + (.92 + Math.min(headerScroll.value / 80, 1) * .06) + ')', backdropFilter: 'blur(' + Math.min(headerScroll.value / 4, 12) + 'px)', WebkitBackdropFilter: 'blur(' + Math.min(headerScroll.value / 4, 12) + 'px)' }));
const featuredFilterOpen = ref(false), featuredKeyword = ref(''), featuredTypes = ref([]);
const draftFeaturedKeyword = ref(''), draftFeaturedTypes = ref([]);
const featuredTypeOptions = ['moment', 'blessing', 'antique', 'second_hand'];
const homeSearchLabel = computed(() => currentEntryIndex.value === 0 ? hs('featured') : currentEntryIndex.value === 1 ? hs('people') : t(currentEntryIndex.value === 2 ? 'marketSearch.antique' : 'marketSearch.secondHand'));
function openHomeSearch() {
 if (currentEntryIndex.value === 0) { draftFeaturedKeyword.value = featuredKeyword.value; draftFeaturedTypes.value = [...featuredTypes.value]; featuredFilterOpen.value = true; }
 else if (currentEntryIndex.value === 1) openSearch();
 else (currentEntryIndex.value === 2 ? antiqueList.value : secondHandList.value)?.openFilters();
}
function toggleFeaturedType(type) { draftFeaturedTypes.value = draftFeaturedTypes.value.includes(type) ? draftFeaturedTypes.value.filter(item => item !== type) : [...draftFeaturedTypes.value, type]; }
function resetFeaturedDraft() { draftFeaturedKeyword.value = ''; draftFeaturedTypes.value = []; }
function applyFeaturedSearch() {
 featuredKeyword.value = draftFeaturedKeyword.value.trim(); featuredTypes.value = [...draftFeaturedTypes.value]; featuredFilterOpen.value = false;
 featuredItems.value = []; loadFeaturedFeed({ isRefresh: true }); uni.pageScrollTo({ scrollTop: 0, duration: 0 });
}
onBackPress(() => { if (quotaInfoOpen.value) { quotaInfoOpen.value = false; return true; } if (featuredFilterOpen.value) { featuredFilterOpen.value = false; return true; } });
onHide(() => { featuredFilterOpen.value = false; quotaInfoOpen.value = false; });
const recommendationHeaderFixed = ref(false);
const recommendationHeaderHeight = ref(homeGeometry.value.contentTop + 161);

function measureRecommendationHeader() {
	nextTick(() => {
		uni.createSelectorQuery()
			.select(".recommendation-sticky-header")
			.boundingClientRect((rect) => {
				if (rect && rect.height) {
					recommendationHeaderHeight.value = rect.height + (recommendationHeaderFixed.value ? 56 : 0);
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
onResize(() => { homeGeometry.value = readChatHeaderGeometry(uni, { clearCapsule: false }, homePlatform); measureRecommendationHeader(); });

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
	openProfileSheet(profile.profileId);
}

function syncProfileLikeState(profile) {
	for (const item of profiles.value) if (String(item.profileId) === String(profile.profileId)) { item.isLiked = profile.isLiked; item.likeCount = profile.likeCount; item.mutual = profile.mutual; }
	for (const item of featuredItems.value) if (item.type === 'blessing' && String(item.id) === String(profile.profileId)) { item.isLiked = profile.isLiked; item.likeCount = profile.likeCount; item.mutual = profile.mutual; }
}

function setHomeModel(mode) {
 if (blessingActionBusy.value || rewindBusy.value) return;
 if (mode === 'tutorial') tutorialVisited.value = true;
 if (mode === 'activity') activityVisited.value = true;
 model.value = mode;
 recommendationHeaderFixed.value = false;
 measureRecommendationHeader();
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
uni.$on('auth-session-changed', closeProfileSheet);
onBeforeUnmount(() => {
	uni.$off('blessing:changed', onBlessingChanged);
	uni.$off('auth-session-changed', closeProfileSheet);
});

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
            keyword: featuredKeyword.value, types: featuredTypes.value,
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
	if (item.type === 'blessing') { openBlessingProfile({ profileId: item.id }); return; }
	uni.navigateTo({ url: route });
}

onPullDownRefresh(async () => {
 if (model.value === 'activity') { try { await activityLibrary.value?.refresh(); } finally { uni.stopPullDownRefresh(); } return; }
	if (model.value === 'tutorial') {
		try { await tutorialLibrary.value?.refresh(); }
		finally { uni.stopPullDownRefresh(); }
		return;
	}
	if (model.value !== 'recommend') { uni.stopPullDownRefresh(); return; }
	refreshMembership().catch(() => {});
	if (currentEntryIndex.value === 0) {
		loadFeaturedFeed({ isRefresh: true });
	} else if (currentEntryIndex.value === 1) {
		loadFeed({ isRefresh: true });
	} else if (currentEntryIndex.value === 2 || currentEntryIndex.value === 3) {
		try { await (currentEntryIndex.value === 2 ? antiqueList.value : secondHandList.value)?.refresh(); }
		finally { uni.stopPullDownRefresh(); }
	} else {
		uni.stopPullDownRefresh();
	}
});

onPageScroll(({ scrollTop }) => {
    headerScroll.value = Math.max(0, scrollTop);
	recommendationHeaderFixed.value =
		model.value === "recommend" && !(currentEntryIndex.value === 1 && blessingViewMode.value === 'cards') && scrollTop > 80;
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

function isFeaturedMarket(item) { return item.type === 'antique' || item.type === 'second_hand'; }
function isFeaturedLikeAvailable(item) {
	return item.type === "blessing" || item.type === "moment" || isFeaturedMarket(item);
}

function isFeaturedCommentAvailable(item) {
	return item.type === "moment" || isFeaturedMarket(item);
}

function getFeaturedLikeApi(item) {
	if (isFeaturedMarket(item)) return toggleMarketLikeApi;
	if (item.type === "moment") return toggleLikeMomentApi;
	if (item.type === "blessing") return toggleProfileLikeApi;
	return null;
}

function getFeaturedCommentsApi(item) {
	if (isFeaturedMarket(item)) return getMarketCommentsApi;
	if (item.type === "moment") return getCommentsApi;
	if (item.type === "blessing") return getProfileCommentsApi;
	return null;
}

function getFeaturedAddCommentApi(item) {
	if (isFeaturedMarket(item)) return addMarketCommentApi;
	if (item.type === "moment") return addCommentApi;
	if (item.type === "blessing") return addProfileCommentApi;
	return null;
}

async function toggleFeaturedLike(item) {
	if (item.featuredLikePending) return;
	if (item.type === 'blessing') {
		const profile = { profileId: item.id, isLiked: item.isLiked, likeCount: item.likeCount };
		await toggleLike(profile, 'featured');
		return;
	}
	const likeApi = getFeaturedLikeApi(item);
	if (!likeApi) return;

	const prevLiked = item.isLiked;
	item.featuredLikePending = true;
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
	} finally { item.featuredLikePending = false; }
}

function toggleFeaturedCommentPanel(item) {
	const route = featuredItemRoute(item);
	if (!route || !isFeaturedCommentAvailable(item)) return;
	uni.navigateTo({ url: `${route}${route.includes('?') ? '&' : '?'}openComments=1` });
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
		commentId: comment.id,
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
		const res = isFeaturedMarket(item)
			? await submitApi(item.id, { content: text, replyToCommentId: item.replyTarget?.commentId })
			: item.type === 'blessing'
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
	{ name: hs('community'), page: "/pages/community/index" },
	{ name: hs('requests'), page: "/pages/demandhall/index" },
]);

const currentEntryIndex = ref(1);
const visitedEntries = ref({ 1: true });
const antiqueList = ref(null), secondHandList = ref(null);

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
	const firstVisit = !visitedEntries.value[index];
	visitedEntries.value[index] = true;
	currentEntryIndex.value = index;
	recommendationHeaderFixed.value = false;
	measureRecommendationHeader();
	if (
		index === 0 && firstVisit &&
		!featuredLoading.value
	) {
		loadFeaturedFeed({ isRefresh: true });
	}
};
</script>

<style scoped lang="scss">
// Insta360 风格品牌色
$brand-yellow: var(--bless-primary, #C2A052);
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
		background-color: #ffffff;
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
			background-color: #ffffff;
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
	box-shadow: 0 8rpx 16rpx rgba(194,160,82,0.4);
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
	--blessing-card-height: max(280px, min(680px, calc(100vh - var(--window-top, 0px) - var(--blessing-header-height, 180px) - 150px - env(safe-area-inset-bottom))));
	/* #ifdef H5 */
	--blessing-card-height: max(280px, min(680px, calc(var(--app-layout-viewport-height, 100dvh) - var(--window-top, 0px) - var(--blessing-header-height, 180px) - 150px - env(safe-area-inset-bottom))));
	/* #endif */
}
.blessing-toolbar { max-width: 460px; margin: 0 auto 4px; min-height: 48px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.blessing-quota { max-width: 460px; width: 100%; min-height: 44px; padding: 8px 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 14px; font-size: 12px; line-height: 1.6; color: var(--bless-text, #775E25); background: transparent; }
.blessing-quota::after { border: 0; }
.blessing-quota.has-error { background: #faf6e9; }
.blessing-quota[disabled] { color: #8b8983; background: transparent; }
.blessing-view-switch { display: flex; padding: 3px; border-radius: 24px; background: #e9e9ec; }
.blessing-view-switch button { min-width: 66px; height: 38px; margin: 0; padding: 0 11px; display: flex; align-items: center; justify-content: center; gap: 5px; border-radius: 22px; font-size: 12px; line-height: 1.2; color: #77787d; background: transparent; transition: background 180ms; }
.blessing-view-switch button::after { border: none; }
.blessing-view-switch button.selected { color: #1c1c1e; background: #fff; box-shadow: 0 1px 4px rgba(15,15,20,.08); }
.blessing-view-switch button[disabled] { opacity: .55; }
.blessing-list { padding: 8px 0 0; }
.blessing-retry { margin: 12px auto; padding: 12px 18px; max-width: 320px; min-height: 44px; font-size: 13px; line-height: 1.5; color: var(--bless-text, #775E25); text-align: center; background: #faf6e9; border: 0; border-radius: 22px; transition: transform 140ms cubic-bezier(.23,1,.32,1); }
.blessing-retry::after { border: 0; }
.blessing-retry:active { transform: scale(.97); }
.is-like-busy { opacity: .5; pointer-events: none; }
.container.is-tutorial-home { background: #f5f5f7; }
.container.is-card-home { background: #f5f5f7; overflow-x: hidden; }
.container.is-recommend-home,
.is-recommend-home .recommendation-sticky-header,
.is-recommend-home .header-nav,
.is-recommend-home .search-container,
.is-recommend-home .scroll-tabs-wrapper { background: #f5f5f7; }
.is-card-home .recommendation-sticky-header, .is-card-home .header-nav { background: #f5f5f7; }
.is-card-home .header-nav { padding-top: 12px; padding-bottom: 7px; }
.is-card-home .safe-area-bottom { display: none; }
.is-card-home .scroll-tabs-wrapper { padding-top: 4px; padding-bottom: 4px; background: transparent; }
.fab-button { --app-fixed-bottom-base: calc(108px + env(safe-area-inset-bottom)); bottom: calc(108px + env(safe-area-inset-bottom)); }
@media (prefers-reduced-motion: reduce) { .blessing-view-switch button { transition: none; } }

.blessing-toolbar{gap:6px;margin-bottom:12px}
/* Both modes use compact language-independent counts; full labels live in the sheet. */
.blessing-quota-inline{display:flex;align-items:center;justify-content:center;gap:6px;flex:0 0 auto;margin:0;padding:0 12px;min-height:40px;border-radius:20px;background:var(--bless-soft, #F1E4BD);color:var(--bless-text, #775E25);font-size:13px;line-height:1.2;white-space:nowrap}
.blessing-quota-inline::after{border:0}
.blessing-quota-inline text{flex-shrink:0;white-space:nowrap}
.quota-separator{opacity:.5}
.quota-description{display:block;font-size:15px;line-height:1.7;overflow-wrap:break-word;padding:8px 0 20px}
.blessing-view-switch button{min-width:44px;padding:0 8px;white-space:nowrap}
@media(max-width:380px){.blessing-view-switch button text{display:none}.blessing-view-switch button{width:44px;padding:0}}
.blessing-view-switch{flex-shrink:0}


.blessing-list{max-width:460px;margin:0 auto;padding-top:0}
.blessing-profile-card{background:white;border-radius:24px;overflow:hidden;margin-bottom:16px;box-shadow:0 4px 16px rgba(53,46,31,.025)}
.blessing-profile-header{display:flex;align-items:center;gap:10px;padding:14px}
.blessing-avatar{width:44px;height:44px;border-radius:50%;flex-shrink:0;background:#f3f2ef}
.avatar-empty{display:flex;align-items:center;justify-content:center}
.blessing-identity{flex:1;min-width:0}.blessing-name-row{display:flex;align-items:baseline;gap:8px}
.blessing-name{font-size:17px;font-weight:600;color:#2e2d29;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.blessing-age{font-size:16px;color:#929088;flex-shrink:0}
.blessing-location{display:block;margin-top:4px;font-size:12px;color:#99948a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.blessing-photo{position:relative;margin:0 8px;height:440px;height:min(120vw,560px);border-radius:18px;overflow:hidden;background:#efede8}
.blessing-photo-swiper{width:100%;height:100%}
.blessing-photo-image{width:100%;height:100%;display:block}.blessing-no-photo{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-size:13px;color:#a49b8b}
.blessing-photo-count{position:absolute;bottom:12px;right:12px;color:white;background:rgba(35,33,28,.42);border-radius:16px;padding:4px 10px;font-size:12px}
.blessing-card-footer{padding:12px 16px 10px}.blessing-bio{display:block;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:14px;color:#555148;line-height:1.6}
.blessing-footer-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.blessing-facts{flex:1;min-width:0;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:12px;color:#9b968d}
.blessing-like{flex-shrink:0;display:flex;align-items:center;gap:6px;padding:6px 0 6px 12px;min-height:44px;margin:0;background:transparent;color:var(--bless-text, #775E25);font-size:14px;line-height:1.3}.blessing-like::after{border:0}.blessing-like[disabled]{opacity:.5}

</style>
<style scoped>
.post-card.featured-card{padding:0;border-radius:18px;background:#fff;box-shadow:0 2px 8px rgba(45,42,34,.025);}
.post-card.featured-card .post-media{border-radius:18px 18px 12px 12px;margin:0;}
.post-card.featured-card .media-img{display:block;width:100%;}
.featured-kind{position:absolute;top:9px;right:9px;max-width:calc(100% - 34px);padding:3px 7px;border:1px solid rgba(255,255,255,.7);border-radius:8px;background:rgba(45,42,34,.28);color:#fff;font-size:10px;line-height:1.4;overflow-wrap:anywhere;}
.post-card.featured-card .featured-title,.post-card.featured-card .featured-summary{margin:9px 10px 0;font-size:14px;font-weight:500;line-height:1.5;color:#292825;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere;}
.post-card.featured-card .featured-price{margin:4px 10px 0;font-size:14px;font-weight:600;color:var(--bless-text, #775E25);}
.post-card.featured-card.featured-market-card .featured-summary{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-line-clamp:unset;}
.featured-footer{display:flex;align-items:center;flex-wrap:wrap;gap:2px 6px;padding:6px 10px 8px;min-width:0;}
.post-card.featured-card .post-header{flex:1 1 52px;min-width:0;margin:0;gap:5px;}
.post-card.featured-card .post-header .post-avatar{flex:0 0 23px;width:23px;height:23px;margin:0;}
.post-card.featured-card .post-header .username{font-size:11px;font-weight:400;line-height:1.4;color:#8b8984;}
.post-card.featured-card .post-header .location-box{display:none;}
.post-card.featured-card .post-actions{flex:none;margin:0;padding:0;}
.post-card.featured-card .post-actions .actions-left{gap:8px;}
.post-card.featured-card .post-actions .action-btn{min-height:36px;gap:3px;}
.post-card.featured-card .post-actions .action-num{margin:0;font-size:10px;color:#8b8984;}
.post-card.featured-card .meta-box{margin:0 8px 8px;padding:10px;border-radius:12px;background:#f7f7f5;}
@media(max-width:350px){.featured-footer{padding-left:8px;padding-right:8px;}.post-card.featured-card .post-actions .actions-left{gap:5px;}}
/* #ifndef H5 */
.container { min-height: 100vh; }
/* #endif */
</style>

<style scoped>
.recommendation-sticky-header.is-fixed{top:0!important;z-index:100;box-sizing:border-box;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);}
.recommendation-sticky-header::after{content:"";position:absolute;top:100%;left:0;right:0;height:8px;background:linear-gradient(rgba(245,245,247,.65),transparent);pointer-events:none}
.recommendation-sticky-header .header-nav{height:56px;box-sizing:border-box;padding:4px 16px!important;gap:16px;background:transparent!important;overflow:hidden;}
.recommendation-sticky-header.is-collapsed .header-nav{height:0;padding-top:0!important;padding-bottom:0!important;opacity:0;pointer-events:none;}
.header-nav .nav-left .avatar-circle{width:36px;height:36px}.header-nav .nav-center{flex:1;min-width:0;width:0;white-space:nowrap;}.header-nav .nav-center .nav-tab,.header-nav .nav-center .nav-tab.active{font-size:16px;flex-shrink:0;padding:10px 0}.header-nav .nav-center .nav-tab .tab-line{background:var(--bless-primary, #C2A052);width:22px;height:3px;bottom:3px}.header-nav .nav-right{display:none;}
.recommendation-sticky-header .scroll-tabs-wrapper{padding:7px 12px 10px;gap:8px;background:transparent!important;}.scroll-tabs-wrapper .scroll-tabs{min-width:0;width:0}.scroll-tabs-wrapper .scroll-tabs .tabs-content{padding-right:0}.scroll-tabs-wrapper .scroll-tabs .tab-pill{height:36px;padding:0 14px;margin-right:8px;white-space:nowrap;background:#fff;flex-shrink:0}.scroll-tabs-wrapper .scroll-tabs .tab-pill text{font-size:14px;white-space:nowrap}.scroll-tabs-wrapper .scroll-tabs .tab-pill.active{background:var(--bless-soft, #F1E4BD);}
.home-search-trigger{position:relative;margin:0;padding:0;width:44px;height:44px;flex-shrink:0;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center}.home-search-trigger::after{border:0}.search-active-dot{position:absolute;right:7px;top:7px;width:6px;height:6px;border-radius:50%;background:var(--bless-primary, #C2A052);}
.home-search-sheet{padding:10px 20px calc(24px + env(safe-area-inset-bottom));background:#fff;max-height:80vh;overflow-y:auto;box-sizing:border-box;}.sheet-handle{width:36px;height:4px;border-radius:3px;background:#ddd;margin:0 auto 14px}.home-sheet-title{display:flex;align-items:center;justify-content:space-between;font-size:20px;font-weight:600;gap:12px}.home-sheet-title button{margin:0;padding:0;width:44px;height:44px;background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0}.home-search-sheet button::after{border:0;}.home-keyword{display:flex;align-items:center;gap:10px;border-radius:24px;background:#f4f3f1;padding:12px 16px;margin-top:18px}.home-keyword input{flex:1;min-width:0;font-size:15px;height:28px}.home-type-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:26px 0 14px;font-size:15px;font-weight:600}.home-type-heading text+text{font-size:12px;font-weight:400;color:#99948b}.home-type-options{display:flex;flex-wrap:wrap;gap:10px}.home-type-options button{margin:0;min-width:70px;padding:10px 16px;line-height:1.5;font-size:14px;border-radius:24px;background:#f5f4f2;color:#777168}.home-type-options button.selected{background:var(--bless-soft, #F1E4BD);color:var(--bless-text, #775E25)}.home-search-actions{display:flex;gap:12px;margin-top:32px}.home-search-actions button{flex:1;margin:0;padding:13px 12px;line-height:1.5;font-size:15px;border-radius:22px;background:#f3f2ef;color:#655d51}.home-search-actions .apply{flex:1.6;background:var(--bless-primary, #C2A052);color:white}.featured-search-summary{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:0 4px 12px;color:var(--bless-text, #775E25);font-size:12px}.featured-search-summary text{background:var(--bless-soft, #F1E4BD);padding:5px 9px;border-radius:12px;max-width:100%;overflow-wrap:anywhere;}
</style>

<style scoped>
.home-brand-row{height:44px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding-left:16px;overflow:hidden;}
.home-brand-symbol{width:44px;height:36px;flex-shrink:0;}
.home-brand-wordmark{font-size:24px;line-height:32px;font-weight:800;letter-spacing:3px;color:#35322e;white-space:nowrap;}
.header-nav .nav-left{flex-shrink:0;}
.header-nav .nav-center .nav-links{display:inline-flex;align-items:center;gap:22px;padding-right:10px;}
.home-search-trigger{overflow:visible;}
.home-search-trigger::before{content:"";position:absolute;right:100%;top:-2px;bottom:-2px;width:12px;background:linear-gradient(90deg,rgba(245,245,247,0),#f5f5f7);pointer-events:none;}
@media(max-width:350px){.home-brand-row{gap:6px;}.home-brand-wordmark{font-size:22px;letter-spacing:2px;}.header-nav .nav-center .nav-links{gap:18px;}}
.recommendation-sticky-header .header-nav{transition:height 180ms cubic-bezier(.23,1,.32,1),opacity 150ms ease-out;}
@media(prefers-reduced-motion:reduce){.recommendation-sticky-header .header-nav{transition:none;}}
</style>
