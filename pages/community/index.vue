<template>
	<view class="container">
		<!-- 顶部标题 -->
		<view class="page-header">
			<view class="header-left" @click="goHome">
				<uni-icons type="back" size="20" color="#fff"></uni-icons>
			</view>
			<text class="header-title">社区</text>
			<view class="header-right" @click="goMessages">
				<uni-icons type="chat-filled" size="20" color="#fff"></uni-icons>
				<view v-if="unreadCount > 0" class="header-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</view>
			</view>
		</view>

		<!-- 搜索栏 -->
		<view class="search-bar">
			<view class="search-input-wrap">
				<uni-icons type="search" size="18" color="#999"></uni-icons>
				<input
					class="search-input"
					placeholder="搜索话题、帖子、用户..."
					confirm-type="search"
					@confirm="onSearchConfirm"
					@input="onSearchInput"
					@focus="showSearchPanel = true"
					v-model="searchKeyword"
				/>
				<uni-icons v-if="searchKeyword" type="clear" size="16" color="#ccc" @click="clearSearch"></uni-icons>
			</view>
			<text class="search-cancel" v-if="showSearchPanel" @click="closeSearchPanel">取消</text>
		</view>

		<!-- 搜索面板：历史记录 + 热门标签 -->
		<view class="search-panel" v-if="showSearchPanel">
			<view class="panel-section" v-if="searchHistory.length">
				<view class="panel-title-row">
					<text class="panel-title">搜索历史</text>
					<uni-icons type="trash" size="16" color="#999" @click="clearHistory"></uni-icons>
				</view>
				<view class="history-list">
					<text
						class="history-chip"
						v-for="(kw, i) in searchHistory"
						:key="i"
						@click="applyHistoryKeyword(kw)"
					>{{ kw }}</text>
				</view>
			</view>
			<view class="panel-section">
				<text class="panel-title">热门话题</text>
				<view class="history-list">
					<text
						class="history-chip hot"
						v-for="(tag, i) in tags"
						:key="i"
						@click="applyHistoryKeyword(tag)"
					>🔥{{ tag }}</text>
				</view>
			</view>
		</view>

		<!-- 主内容滚动区（统一一个滚动容器，支持下拉刷新 + 触底加载） -->
		<scroll-view
			v-if="!showSearchPanel"
			scroll-y
			class="content-scroll"
			refresher-enabled
			:refresher-triggered="refreshing"
			refresher-background="#f5f5f5"
			@refresherrefresh="onRefresh"
			@scrolltolower="onLoadMore"
			lower-threshold="120"
			@scroll="onScroll"
			:scroll-top="scrollTopTarget"
		>
			<!-- 轮播公告 -->
			<view class="notice-carousel">
				<swiper
					class="swiper-wrapper"
					:autoplay="true"
					:interval="3500"
					:duration="500"
					:circular="true"
					:indicator-dots="true"
					indicator-active-color="#fff"
					indicator-color="rgba(255,255,255,0.5)"
					:current="currentNoticeIndex"
					@change="onNoticeChange"
				>
					<swiper-item v-for="notice in notices" :key="notice.id">
						<view class="notice-item" @click="onNoticeClick(notice)">
							<view class="notice-icon">
								<uni-icons type="sound-filled" size="18" color="#fff"></uni-icons>
							</view>
							<text class="notice-text">{{ notice.title }}</text>
							<uni-icons type="right" size="14" color="rgba(255,255,255,0.85)"></uni-icons>
						</view>
					</swiper-item>
				</swiper>
			</view>

			<!-- 社区概览数据条 -->
			<view class="stats-bar">
				<view class="stats-item">
					<text class="stats-num">{{ formatNumber(totalPosts) }}</text>
					<text class="stats-label">帖子</text>
				</view>
				<view class="stats-divider"></view>
				<view class="stats-item">
					<text class="stats-num">{{ formatNumber(totalViews) }}</text>
					<text class="stats-label">浏览</text>
				</view>
				<view class="stats-divider"></view>
				<view class="stats-item">
					<text class="stats-num">{{ onlineCount }}</text>
					<text class="stats-label">在线</text>
				</view>
				<view class="stats-divider"></view>
				<view class="stats-item" @click="publishPost">
					<text class="stats-num accent">+ 发帖</text>
					<text class="stats-label">分享想法</text>
				</view>
			</view>

			<!-- 分类导航 -->
			<scroll-view scroll-x class="category-nav" show-scrollbar="false" enable-flex>
				<view
					class="category-item"
					v-for="cat in categories"
					:key="cat.name"
					:class="{ active: activeCategory === cat.name }"
					:style="activeCategory === cat.name ? { background: `linear-gradient(135deg, ${cat.color}, ${shade(cat.color)})` } : {}"
					@click="switchCategory(cat.name)"
				>
					<uni-icons
						:type="cat.icon"
						size="16"
						:color="activeCategory === cat.name ? '#fff' : cat.color"
					></uni-icons>
					<text class="category-name-text" :class="{ 'text-active': activeCategory === cat.name }">{{ cat.name }}</text>
					<view class="category-count" v-if="categoryCount(cat.name) > 0">{{ categoryCount(cat.name) }}</view>
				</view>
			</scroll-view>

			<!-- 热门标签筛选 -->
			<view class="tags-container" v-if="tags.length">
				<text
					class="tag-item"
					:class="{ active: selectedTag === '' }"
					@click="selectTag('')"
				>全部话题</text>
				<text
					class="tag-item"
					v-for="tag in tags"
					:key="tag"
					:class="{ active: selectedTag === tag }"
					@click="selectTag(tag)"
				>#{{ tag }}</text>
			</view>

			<!-- Tab 切换 -->
			<view class="tab-bar">
				<view
					class="slider-tab"
					v-for="tab in tabs"
					:key="tab.key"
					:class="{ active: activeTab === tab.key }"
					@click="switchTab(tab.key)"
				>
					<uni-icons v-if="tab.icon" :type="tab.icon" size="14" :color="activeTab === tab.key ? '#fff' : '#999'"></uni-icons>
					<text class="tab-label">{{ tab.label }}</text>
				</view>
			</view>

			<!-- 骨架屏 -->
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
					<view class="skeleton-line"></view>
					<view class="skeleton-line short"></view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-else-if="posts.length === 0" class="empty-state">
				<uni-icons type="chatboxes-filled" size="100" color="#e5e5e5"></uni-icons>
				<text class="empty-text">{{ emptyStateText }}</text>
				<text class="empty-hint">换个分类、话题或试试其他关键词</text>
				<view class="empty-reset-btn" @click="resetFilters">重置筛选</view>
			</view>

			<!-- 帖子列表 -->
			<view class="post-list" v-else>
				<view
					class="post-item"
					v-for="item in posts"
					:key="item.id"
				>
					<view class="post-card">
						<view class="post-header">
							<image class="avatar-img" :src="item.avatar" mode="aspectFill" @click="openProfile(item)"></image>
							<view class="user-info" @click="openProfile(item)">
								<view class="username-row">
									<text class="username">{{ item.username }}</text>
									<view v-if="item.vip" class="vip-tag">VIP</view>
									<view v-if="item.isEssence" class="essence-tag">精华</view>
								</view>
								<view class="meta-row">
									<text class="category-pill" :style="{ color: categoryColor(item.category) }">{{ item.category }}</text>
									<text class="time">{{ formatTime(item.createTime) }}</text>
								</view>
							</view>
							<uni-icons type="more-filled" size="18" color="#bbb" @click.stop="openMoreMenu(item)"></uni-icons>
						</view>

						<view class="post-body" @click="openPost(item)">
							<text
								class="post-content"
								:class="{ collapsed: !item.expanded && item.content.length > 90 }"
							>{{ item.content }}</text>
							<text
								v-if="item.content.length > 90"
								class="expand-toggle"
								@click.stop="toggleExpand(item)"
							>{{ item.expanded ? '收起' : '展开全文' }}</text>

							<!-- 图片九宫格 -->
							<view v-if="item.images && item.images.length" class="image-grid" :class="gridClass(item.images.length)">
								<image
									v-for="(img, i) in item.images"
									:key="i"
									:src="img"
									class="grid-image"
									mode="aspectFill"
									@click.stop="previewImages(item, i)"
								></image>
							</view>
						</view>

						<view class="post-tags" v-if="item.tags && item.tags.length">
							<text class="post-tag" v-for="tag in item.tags" :key="tag" @click="selectTag(tag)">#{{ tag }}</text>
						</view>

						<view class="post-footer">
							<view class="action-bar">
								<view class="action-item">
									<uni-icons type="eye" size="15" color="#999"></uni-icons>
									<text class="action-text">{{ formatNumber(item.viewCount) }}</text>
								</view>
								<view class="action-item" @click.stop="toggleComments(item)">
									<uni-icons :type="item.showComments ? 'chatbubble-filled' : 'chatbubble'" size="15" :color="item.showComments ? '#667eea' : '#999'"></uni-icons>
									<text class="action-text" :class="{ 'color-primary': item.showComments }">{{ item.replyCount || 0 }}</text>
								</view>
								<view class="action-item" @click.stop="toggleLike(item)">
									<uni-icons :type="item.liked ? 'heart-filled' : 'heart'" size="15" :color="item.liked ? '#ff5c5c' : '#999'"></uni-icons>
									<text class="action-text" :class="{ 'color-red': item.liked }">{{ formatNumber(item.likeCount) }}</text>
								</view>
								<view class="action-item" @click.stop="toggleCollect(item)">
									<uni-icons :type="item.collected ? 'star-filled' : 'star'" size="15" :color="item.collected ? '#ffb400' : '#999'"></uni-icons>
									<text class="action-text" :class="{ 'color-gold': item.collected }">收藏</text>
								</view>
								<view class="action-item" @click.stop="sharePost(item)">
									<uni-icons type="redo" size="15" color="#999"></uni-icons>
									<text class="action-text">分享</text>
								</view>
							</view>
						</view>

						<!-- 评论展开面板：一级评论 + 回复预览 -->
						<view class="comments-panel" v-if="item.showComments">
							<view class="comments-empty" v-if="item.commentsLoading">
								<text>评论加载中...</text>
							</view>
							<view class="comments-empty" v-else-if="!item.comments || item.comments.length === 0">
								<text>还没有评论，来抢沙发～</text>
							</view>

							<view class="comment-floor" v-for="floor in visibleFloors(item)" :key="floor.id">
								<view class="comment-row">
									<image class="comment-avatar" :src="floor.avatar" mode="aspectFill"></image>
									<view class="comment-main">
										<view class="comment-top">
											<text class="comment-username">{{ floor.username }}</text>
										</view>
										<text class="comment-content">{{ floor.content }}</text>
										<view class="comment-actions">
											<text class="comment-time">{{ formatTime(floor.createTime) }}</text>
											<text class="comment-action-btn" @click="openReplyBox(item, floor)">回复</text>
											<view class="comment-like" @click="toggleCommentLike(floor)">
												<uni-icons :type="floor.liked ? 'heart-filled' : 'heart'" size="12" :color="floor.liked ? '#ff5c5c' : '#bbb'"></uni-icons>
												<text v-if="floor.likeCount > 0" :class="{ 'color-red': floor.liked }">{{ floor.likeCount }}</text>
											</view>
										</view>
									</view>
								</view>

								<view class="reply-list" v-if="floor.replies && floor.replies.length">
									<view class="comment-row reply-row" v-for="reply in floor.replies" :key="reply.id">
										<image class="comment-avatar small" :src="reply.avatar" mode="aspectFill"></image>
										<view class="comment-main">
											<view class="comment-top">
												<text class="comment-username">{{ reply.username }}</text>
												<text class="comment-replyto" v-if="reply.replyToUsername">回复 @{{ reply.replyToUsername }}</text>
											</view>
											<text class="comment-content">{{ reply.content }}</text>
											<view class="comment-actions">
												<text class="comment-time">{{ formatTime(reply.createTime) }}</text>
												<text class="comment-action-btn" @click="openReplyBox(item, reply)">回复</text>
												<view class="comment-like" @click="toggleCommentLike(reply)">
													<uni-icons :type="reply.liked ? 'heart-filled' : 'heart'" size="12" :color="reply.liked ? '#ff5c5c' : '#bbb'"></uni-icons>
													<text v-if="reply.likeCount > 0" :class="{ 'color-red': reply.liked }">{{ reply.likeCount }}</text>
												</view>
											</view>
										</view>
									</view>
								</view>

								<text
									v-if="floor.replyCount > floor.replies.length"
									class="comment-toggle-all"
									@click="expandReplies(item, floor)"
								>{{ floor.loadingReplies ? '回复加载中...' : `查看全部${floor.replyCount}条回复` }}</text>
							</view>

							<text
								v-if="item.commentHasMore"
								class="comment-toggle-all"
								@click="loadMoreComments(item)"
							>{{ item.commentsLoadingMore ? '加载中...' : '加载更多评论' }}</text>

							<view class="comment-input-row" @click="openReplyBox(item)">
								<image class="comment-avatar small" :src="avatarFor('我')" mode="aspectFill"></image>
								<view class="comment-input-fake">说点什么，友善评论...</view>
							</view>
						</view>
					</view>
				</view>

				<!-- 加载更多 / 没有更多 -->
				<view class="load-more-tip" v-if="loadingMore">
					<uni-icons type="spinner-cycle" size="14" color="#bbb"></uni-icons>
					<text>正在加载更多...</text>
				</view>
				<view class="no-more-tip" v-else-if="!hasMore">
					— 已经到底啦 —
				</view>
			</view>

			<view class="scroll-bottom-spacer"></view>
		</scroll-view>

		<!-- 回到顶部 -->
		<view class="back-to-top" v-if="showBackToTop && !showSearchPanel" @click="scrollToTop">
			<uni-icons type="arrow-up" size="20" color="#667eea"></uni-icons>
		</view>

		<!-- 底部发布按钮 -->
		<view class="publish-btn" v-if="!showSearchPanel" @click="publishPost">
			<uni-icons type="plus" size="22" color="#fff"></uni-icons>
			<text>发布</text>
		</view>

		<!-- 发布弹窗 -->
		<view class="modal-mask" v-if="showPublishModal" @click="closePublishModal">
			<view class="publish-modal" @click.stop>
				<view class="modal-header">
					<text class="modal-cancel" @click="closePublishModal">取消</text>
					<text class="modal-title">发布新帖子</text>
					<text
						class="modal-submit"
						:class="{ disabled: !publishForm.content.trim() || submitting }"
						@click="submitPost"
					>{{ submitting ? '发布中...' : '发布' }}</text>
				</view>

				<scroll-view scroll-y class="modal-body">
					<textarea
						class="publish-textarea"
						v-model="publishForm.content"
						placeholder="分享你的想法、经验或故事..."
						maxlength="500"
						auto-height
					></textarea>
					<text class="char-count">{{ publishForm.content.length }}/500</text>

					<view class="form-block">
						<text class="form-label">选择分类</text>
						<view class="form-category-list">
							<text
								class="form-category-chip"
								v-for="cat in publishableCategories"
								:key="cat.name"
								:class="{ active: publishForm.category === cat.name }"
								@click="publishForm.category = cat.name"
							>{{ cat.name }}</text>
						</view>
					</view>

					<view class="form-block">
						<text class="form-label">添加话题标签（最多3个）</text>
						<view class="form-category-list">
							<text
								class="form-category-chip"
								v-for="tag in tags"
								:key="tag"
								:class="{ active: publishForm.tags.includes(tag) }"
								@click="toggleFormTag(tag)"
							>#{{ tag }}</text>
						</view>
					</view>

					<view class="form-block">
						<text class="form-label">图片（最多9张）</text>
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

		<!-- 评论回复弹出框 -->
		<view class="modal-mask reply-mask" v-if="replyModal.visible" @click="closeReplyBox">
			<view class="reply-modal" @click.stop>
				<view class="reply-target-tip" v-if="replyModal.target">
					<text>回复 @{{ replyModal.target.username }}</text>
					<text class="reply-target-clear" @click="clearReplyTarget">✕ 取消</text>
				</view>
				<view class="reply-input-row">
					<input
						class="reply-input"
						v-model="replyContent"
						:focus="replyInputFocus"
						:placeholder="replyModal.target ? `回复 @${replyModal.target.username}` : '友善评论，理性讨论'"
						confirm-type="send"
						@confirm="submitReply"
					/>
					<text
						class="reply-send-btn"
						:class="{ disabled: !replyContent.trim() || submittingReply }"
						@click="submitReply"
					>{{ submittingReply ? '发送中' : '发送' }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import {
	getCommunityHotTagsApi,
	getCommunityStatsApi,
	getCommunityPostsApi,
	getCommunityPostApi,
	createCommunityPostApi,
	deleteCommunityPostApi,
	toggleCommunityLikeApi,
	toggleCommunityCollectApi,
	getCommunityCommentsApi,
	addCommunityCommentApi,
	getCommunityCommentRepliesApi,
	toggleCommunityCommentLikeApi,
	uploadCommunityImagesApi
} from "@/api/community.js";
import { getUnreadCountApi } from "@/api/notifications.js";
import { getUserInfo } from "@/utils/auth.js";

/* 后端无数据时兜底展示的热门话题（与后端 DEFAULT_HOT_TAGS 保持一致） */
const DEFAULT_TAGS = ["技术分享", "创业经验", "生活随笔", "美食探索", "旅行故事", "摄影作品", "设计讨论", "行业交流"];
const SEARCH_HISTORY_KEY = "COMMUNITY_SEARCH_HISTORY";

/* ============ 基础状态 ============ */
const loading = ref(true);
const refreshing = ref(false);
const loadingMore = ref(false);
const submitting = ref(false);
const showSearchPanel = ref(false);
const showBackToTop = ref(false);
const scrollTopTarget = ref(0);
const unreadCount = ref(0);
const pageSize = 10;
const currentPage = ref(1);
const hasMore = ref(false);
const totalCount = ref(0);

/* ============ 搜索 ============ */
const searchKeyword = ref("");
const searchHistory = ref(loadSearchHistory());
let searchDebounceTimer = null;

function loadSearchHistory() {
	try {
		const cached = uni.getStorageSync(SEARCH_HISTORY_KEY);
		return Array.isArray(cached) ? cached.filter(item => typeof item === "string").slice(0, 8) : [];
	} catch (e) {
		return [];
	}
}

function persistSearchHistory() {
	try {
		uni.setStorageSync(SEARCH_HISTORY_KEY, searchHistory.value);
	} catch (e) { /* 存储失败不影响搜索 */ }
}

// 输入即搜索：防抖 350ms，避免每个字符都打一次接口
function onSearchInput() {
	clearTimeout(searchDebounceTimer);
	searchDebounceTimer = setTimeout(() => {
		reloadList();
	}, 350);
}

function onSearchConfirm(e) {
	const keyword = (e?.detail?.value ?? searchKeyword.value).trim();
	searchKeyword.value = keyword;
	if (keyword && !searchHistory.value.includes(keyword)) {
		searchHistory.value.unshift(keyword);
		if (searchHistory.value.length > 8) searchHistory.value.pop();
		persistSearchHistory();
	}
	showSearchPanel.value = false;
	reloadList();
}

function applyHistoryKeyword(kw) {
	searchKeyword.value = kw;
	onSearchConfirm({ detail: { value: kw } });
}

function clearSearch() {
	clearTimeout(searchDebounceTimer);
	searchKeyword.value = "";
	reloadList();
}

function clearHistory() {
	searchHistory.value = [];
	persistSearchHistory();
}

// 取消搜索只收起面板，已生效的筛选条件保留
function closeSearchPanel() {
	showSearchPanel.value = false;
}

/* ============ 分类导航 ============ */
const activeCategory = ref("全部");
const categories = ref([
	{ name: "全部", icon: "list", color: "#667eea" },
	{ name: "前端", icon: "compose", color: "#10ac84" },
	{ name: "后端", icon: "gear", color: "#e6a23c" },
	{ name: "移动端", icon: "phone", color: "#f56c6c" },
	{ name: "AI", icon: "auth", color: "#764ba2" },
	{ name: "设计", icon: "color", color: "#48c78e" },
	{ name: "职场", icon: "staff", color: "#695de9" },
	{ name: "闲聊", icon: "chat-filled", color: "#ffb020" }
]);
const publishableCategories = computed(() => categories.value.filter(c => c.name !== "全部"));

function switchCategory(name) {
	if (activeCategory.value === name) return;
	activeCategory.value = name;
	reloadList();
	uni.vibrateShort?.({ fail: () => {} });
}

function categoryColor(name) {
	return categories.value.find(c => c.name === name)?.color || "#999";
}

// 分类数量来自后端统计接口的 categoryCounts
function categoryCount(name) {
	if (name === "全部") return totalCount.value;
	return categoryCounts.value[name] || 0;
}

function shade(hex) {
	// 简单生成渐变第二色（加深），用于分类高亮背景
	try {
		const n = parseInt(hex.replace("#", ""), 16);
		let r = Math.max(0, (n >> 16) - 25);
		let g = Math.max(0, ((n >> 8) & 0xff) - 25);
		let b = Math.max(0, (n & 0xff) - 25);
		return `rgb(${r},${g},${b})`;
	} catch (e) {
		return hex;
	}
}

/* ============ 话题标签 ============ */
const selectedTag = ref("");
const tags = ref([]);

// 标签由后端按热度返回，接口异常时退回默认标签，保证筛选栏可用
async function loadTags() {
	try {
		const data = await getCommunityHotTagsApi({ limit: 8 });
		const list = Array.isArray(data?.tags) ? data.tags.filter(tag => typeof tag === "string" && tag) : [];
		tags.value = list.length > 0 ? list : DEFAULT_TAGS;
	} catch (e) {
		tags.value = DEFAULT_TAGS;
	}
}

function selectTag(tag) {
	const next = selectedTag.value === tag ? "" : tag;
	if (next === selectedTag.value) return;
	selectedTag.value = next;
	reloadList();
}

/* ============ Tab 切换 ============ */
const activeTab = ref("latest");
const tabs = ref([
	{ key: "latest", label: "最新", icon: "calendar" },
	{ key: "hot", label: "热门", icon: "fire-filled" },
	{ key: "essence", label: "精华", icon: "medal" }
]);

function switchTab(key) {
	if (activeTab.value === key) return;
	activeTab.value = key;
	reloadList();
}

/* ============ 帖子数据（全部来自后端） ============ */
function avatarFor(name) {
	return `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(name)}`;
}

const posts = ref([]);
const totalPosts = ref(0);
const totalViews = ref(0);
const onlineCount = ref(0);
const categoryCounts = ref({});

const COMMENT_PAGE_SIZE = 10;

// 列表字段由后端返回，这里只补齐页面用的展开 / 评论面板 / 互动中的交互状态
function decoratePost(post) {
	return {
		...post,
		images: Array.isArray(post.images) ? post.images : [],
		tags: Array.isArray(post.tags) ? post.tags : [],
		expanded: false,
		liking: false,
		collecting: false,
		showComments: false,
		commentsLoaded: false,
		commentsLoading: false,
		commentsLoadingMore: false,
		comments: [],
		commentPage: 0,
		commentHasMore: false,
		viewed: false
	};
}

function buildListParams(page) {
	const params = { page, pageSize, sort: activeTab.value };
	if (activeCategory.value !== "全部") params.category = activeCategory.value;
	if (selectedTag.value) params.tag = selectedTag.value;
	const keyword = searchKeyword.value.trim();
	if (keyword) params.keyword = keyword;
	return params;
}

// reset = true 时回到第一页并整体替换列表（切换筛选 / 搜索 / 下拉刷新）
async function loadPosts({ reset = false } = {}) {
	const page = reset ? 1 : currentPage.value + 1;
	if (!reset && !hasMore.value) return;
	if (!reset) loadingMore.value = true;
	try {
		const data = await getCommunityPostsApi(buildListParams(page));
		const list = Array.isArray(data?.posts) ? data.posts.map(decoratePost) : [];
		posts.value = reset ? list : [...posts.value, ...list];
		totalCount.value = Number(data?.total || 0);
		hasMore.value = !!data?.hasMore;
		currentPage.value = page;
	} catch (e) {
		// 请求层已提示错误；首屏失败时清空列表避免展示陈旧数据
		if (reset) {
			posts.value = [];
			totalCount.value = 0;
			hasMore.value = false;
		}
	} finally {
		loading.value = false;
		loadingMore.value = false;
	}
}

function reloadList() {
	currentPage.value = 0;
	hasMore.value = true;
	return loadPosts({ reset: true });
}

async function loadStats() {
	try {
		const data = await getCommunityStatsApi();
		totalPosts.value = Number(data?.totalPosts || 0);
		totalViews.value = Number(data?.totalViews || 0);
		onlineCount.value = Number(data?.onlineCount || 0);
		categoryCounts.value = data?.categoryCounts && typeof data.categoryCounts === "object" ? data.categoryCounts : {};
	} catch (e) {
		// 统计失败时保留上一次的数值，不影响帖子浏览
	}
}

async function loadUnreadCount() {
	try {
		const data = await getUnreadCountApi();
		unreadCount.value = Number(data?.totalUnread || 0);
	} catch (e) {
		unreadCount.value = 0;
	}
}

async function loadAll() {
	await Promise.all([loadPosts({ reset: true }), loadStats(), loadTags()]);
}

const emptyStateText = computed(() => {
	if (searchKeyword.value) return `没有找到与「${searchKeyword.value}」相关的帖子`;
	if (activeCategory.value !== "全部") return `暂无「${activeCategory.value}」分类的帖子`;
	if (selectedTag.value) return `暂无「#${selectedTag.value}」话题的帖子`;
	return "暂无帖子，快来发布第一条吧！";
});

function resetFilters() {
	activeCategory.value = "全部";
	activeTab.value = "latest";
	selectedTag.value = "";
	searchKeyword.value = "";
	reloadList();
}

function gridClass(count) {
	if (count === 1) return "grid-1";
	if (count === 2 || count === 4) return "grid-2";
	return "grid-3";
}

function toggleExpand(item) {
	item.expanded = !item.expanded;
}

/* ============ 轮播公告 ============ */
const currentNoticeIndex = ref(0);
const notices = ref([
	{ id: 1, title: "📢 社区新规：请遵守文明发帖，共同维护社区秩序", type: "rule" },
	{ id: 2, title: "🎉 社区活动：本周六晚8点线上技术分享，欢迎参加！", type: "activity" },
	{ id: 3, title: "🔥 精选帖子：关于如何利用AI提升工作效率的干货分享", type: "feature" },
	{ id: 4, title: "🎊 恭喜用户「张三」成为本月最佳贡献者！", type: "honor" }
]);

function onNoticeChange(e) {
	currentNoticeIndex.value = e.detail.current;
}

function onNoticeClick(notice) {
	uni.showToast({ title: notice.title.slice(0, 12) + "...", icon: "none" });
}

/* ============ 帖子互动 ============ */
// 点赞：以服务端返回的计数为准，避免本地自增自减产生漂移
async function toggleLike(item) {
	if (item.liking) return;
	item.liking = true;
	try {
		const data = await toggleCommunityLikeApi(item.id);
		item.liked = !!data?.isLiked;
		item.likeCount = Number(data?.likeCount || 0);
		if (item.liked) uni.vibrateShort?.({ fail: () => {} });
	} catch (e) {
		// 请求层已提示失败原因
	} finally {
		item.liking = false;
	}
}

async function toggleCollect(item) {
	if (item.collecting) return;
	item.collecting = true;
	try {
		const data = await toggleCommunityCollectApi(item.id);
		item.collected = !!data?.isCollected;
		item.collectCount = Number(data?.collectCount || 0);
		uni.showToast({ title: item.collected ? "已收藏" : "已取消收藏", icon: "none", duration: 800 });
	} catch (e) {
		// 请求层已提示失败原因
	} finally {
		item.collecting = false;
	}
}

function sharePost(item) {
	uni.showActionSheet({
		itemList: ["分享给好友", "分享到朋友圈", "复制链接"],
		success: (res) => {
			const opts = ["已分享给好友", "已分享到朋友圈", "链接已复制"];
			uni.showToast({ title: opts[res.tapIndex], icon: "none" });
		}
	});
}

function previewImages(item, index) {
	uni.previewImage({ urls: item.images, current: index });
}

function isMyPost(item) {
	const currentUserId = Number(getUserInfo()?.id);
	return Number.isInteger(currentUserId) && currentUserId === Number(item.userId);
}

async function deletePost(item) {
	try {
		await deleteCommunityPostApi(item.id);
		posts.value = posts.value.filter(post => post.id !== item.id);
		totalCount.value = Math.max(totalCount.value - 1, 0);
		totalPosts.value = Math.max(totalPosts.value - 1, 0);
		uni.showToast({ title: "已删除", icon: "success" });
		loadStats();
	} catch (e) {
		// 请求层已提示失败原因
	}
}

function openMoreMenu(item) {
	const isMine = isMyPost(item);
	const itemList = isMine ? ["删除", "举报"] : ["屏蔽TA", "举报"];
	uni.showActionSheet({
		itemList,
		success: (res) => {
			const tapped = itemList[res.tapIndex];
			if (tapped === "删除") {
				uni.showModal({
					title: "确认删除",
					content: "删除后无法恢复，是否继续？",
					success: (r) => {
						if (r.confirm) deletePost(item);
					}
				});
				return;
			}
			uni.showToast({ title: `已${tapped}`, icon: "none" });
		}
	});
}

function openProfile(item) {
	uni.navigateTo({
		url: `/pages/profile/detail?username=${encodeURIComponent(item.username)}`,
		fail: () => uni.showToast({ title: "个人主页开发中", icon: "none" })
	});
}

// 详情接口会累加浏览量，同一帖子本次只记一次
async function openPost(item) {
	if (!item.viewed) {
		item.viewed = true;
		try {
			const data = await getCommunityPostApi(item.id);
			if (data?.post) {
				item.viewCount = data.post.viewCount;
				totalViews.value += 1;
			}
		} catch (e) {
			item.viewed = false;
		}
	}
	uni.navigateTo({
		url: `/pages/post/detail?id=${item.id}`,
		fail: () => uni.showToast({ title: "帖子详情页开发中", icon: "none" })
	});
}

/* ============ 评论 / 回复 ============ */
const replyModal = ref({ visible: false, postId: null, target: null });
const replyContent = ref("");
const replyInputFocus = ref(false);
const submittingReply = ref(false);

async function toggleComments(item) {
	item.showComments = !item.showComments;
	if (item.showComments && !item.commentsLoaded) await loadComments(item, { reset: true });
}

// 加载中或尚未加载时返回空数组，避免闪现旧的评论内容
function visibleFloors(item) {
	if (item.commentsLoading) return [];
	return item.comments || [];
}

// reset = true 拉第一页并整体替换；否则追加下一页一级评论
async function loadComments(item, { reset = false } = {}) {
	if (!reset && !item.commentHasMore) return;
	const page = reset ? 1 : (item.commentPage || 1) + 1;
	if (reset) item.commentsLoading = true;
	else item.commentsLoadingMore = true;
	try {
		const data = await getCommunityCommentsApi(item.id, { page, pageSize: COMMENT_PAGE_SIZE });
		const list = Array.isArray(data?.comments) ? data.comments : [];
		item.comments = reset ? list : [...(item.comments || []), ...list];
		item.commentPage = page;
		item.commentHasMore = !!data?.hasMore;
		item.commentsLoaded = true;
		// commentCount 含回复，用后端总数同步帖子上的评论角标
		if (typeof data?.commentCount === "number") item.replyCount = data.commentCount;
	} catch (e) {
		if (reset) item.comments = [];
	} finally {
		item.commentsLoading = false;
		item.commentsLoadingMore = false;
	}
}

function loadMoreComments(item) {
	return loadComments(item);
}

// 一级评论按时间正序分页，新评论会落在最后一页；逐页翻到目标楼层，最多 5 页
async function ensureFloorVisible(item, floorId) {
	for (let i = 0; i < 5; i += 1) {
		if ((item.comments || []).some(floor => floor.id === floorId)) return true;
		if (!item.commentHasMore) return false;
		await loadComments(item);
	}
	return false;
}

// 展开某个一级评论下的全部回复（分页拉取后一次性覆盖预览）
async function expandReplies(item, floor) {
	if (floor.loadingReplies) return;
	floor.loadingReplies = true;
	try {
		const all = [];
		for (let page = 1; page <= 10; page += 1) {
			const data = await getCommunityCommentRepliesApi(item.id, floor.id, { page, pageSize: 50 });
			const list = Array.isArray(data?.replies) ? data.replies : [];
			all.push(...list);
			if (!data?.hasMore || list.length === 0) break;
		}
		floor.replies = all;
	} catch (e) {
		// 请求层已提示失败原因
	} finally {
		floor.loadingReplies = false;
	}
}

async function toggleCommentLike(comment) {
	if (comment.liking) return;
	comment.liking = true;
	try {
		const data = await toggleCommunityCommentLikeApi(comment.id);
		comment.liked = !!data?.isLiked;
		comment.likeCount = Number(data?.likeCount || 0);
	} catch (e) {
		// 请求层已提示失败原因
	} finally {
		comment.liking = false;
	}
}

// target 为空表示直接评论帖子本身；传入某条评论则表示回复该条评论
function openReplyBox(item, comment = null) {
	replyModal.value = {
		visible: true,
		postId: item.id,
		target: comment ? { commentId: comment.id, username: comment.username } : null
	};
	replyContent.value = "";
	replyInputFocus.value = false;
	nextTick(() => {
		replyInputFocus.value = true;
	});
}

function clearReplyTarget() {
	replyModal.value.target = null;
}

function closeReplyBox() {
	replyModal.value.visible = false;
	replyInputFocus.value = false;
	replyContent.value = "";
}

async function submitReply() {
	const content = replyContent.value.trim();
	if (!content) {
		uni.showToast({ title: "请输入回复内容", icon: "none" });
		return;
	}
	const target = replyModal.value.target;
	const post = posts.value.find(p => p.id === replyModal.value.postId);
	if (!post || submittingReply.value) return;

	submittingReply.value = true;
	try {
		const data = await addCommunityCommentApi(post.id, {
			content,
			replyToCommentId: target?.commentId ?? null
		});
		if (typeof data?.commentCount === "number") post.replyCount = data.commentCount;
		post.showComments = true;
		closeReplyBox();
		await loadComments(post, { reset: true });
		// 新评论 / 新回复可能不在已加载的页里，先翻到所属楼层再展开回复
		await ensureFloorVisible(post, data?.rootCommentId);
		const floor = (post.comments || []).find(item => item.id === data?.rootCommentId);
		if (floor && floor.replyCount > floor.replies.length) await expandReplies(post, floor);
		uni.showToast({ title: "评论成功", icon: "success", duration: 600 });
	} catch (e) {
		// 请求层已提示失败原因
	} finally {
		submittingReply.value = false;
	}
}

/* ============ 发布 ============ */
const showPublishModal = ref(false);
const publishForm = ref({ content: "", category: "闲聊", tags: [], images: [] });

function publishPost() {
	showPublishModal.value = true;
}

function closePublishModal() {
	showPublishModal.value = false;
}

function toggleFormTag(tag) {
	const idx = publishForm.value.tags.indexOf(tag);
	if (idx > -1) {
		publishForm.value.tags.splice(idx, 1);
	} else if (publishForm.value.tags.length < 3) {
		publishForm.value.tags.push(tag);
	} else {
		uni.showToast({ title: "最多选择3个标签", icon: "none" });
	}
}

function chooseImage() {
	uni.chooseImage({
		count: 9 - publishForm.value.images.length,
		sizeType: ["compressed"],
		success: (res) => {
			publishForm.value.images.push(...res.tempFilePaths);
		}
	});
}

function removeImage(index) {
	publishForm.value.images.splice(index, 1);
}

async function submitPost() {
	const content = publishForm.value.content.trim();
	if (!content) {
		uni.showToast({ title: "请输入帖子内容", icon: "none" });
		return;
	}
	if (submitting.value) return;
	submitting.value = true;
	uni.showLoading({ title: "发布中...", mask: true });

	try {
		// 先上传图片拿到 OSS 地址，再提交帖子
		let images = [];
		if (publishForm.value.images.length > 0) {
			try {
				images = await uploadCommunityImagesApi(publishForm.value.images);
			} catch (e) {
				uni.hideLoading();
				uni.showToast({ title: "图片上传失败，请重试", icon: "none" });
				return;
			}
		}

		await createCommunityPostApi({
			content,
			category: publishForm.value.category,
			tags: [...publishForm.value.tags],
			images
		});

		publishForm.value = { content: "", category: "闲聊", tags: [], images: [] };
		showPublishModal.value = false;
		// 新帖在“最新”列表首位，回到默认筛选并刷新
		activeTab.value = "latest";
		activeCategory.value = "全部";
		selectedTag.value = "";
		searchKeyword.value = "";
		await Promise.all([reloadList(), loadStats(), loadTags()]);
		uni.hideLoading();
		uni.showToast({ title: "发布成功", icon: "success" });
	} catch (e) {
		// 请求层已提示失败原因
		uni.hideLoading();
	} finally {
		submitting.value = false;
	}
}

/* ============ 刷新 / 加载更多 / 滚动 ============ */
async function onRefresh() {
	refreshing.value = true;
	try {
		await Promise.all([reloadList(), loadStats(), loadTags(), loadUnreadCount()]);
	} finally {
		refreshing.value = false;
	}
}

function onLoadMore() {
	if (!hasMore.value || loadingMore.value) return;
	loadPosts();
}

function onScroll(e) {
	showBackToTop.value = e.detail.scrollTop > 600;
}

function scrollToTop() {
	scrollTopTarget.value = scrollTopTarget.value === 0 ? 0.0001 : 0;
	nextTick(() => {
		scrollTopTarget.value = 0;
	});
}

/* ============ 工具函数 ============ */
function formatNumber(num) {
	if (num >= 10000) return (num / 10000).toFixed(1) + "万";
	if (num >= 1000) return (num / 1000).toFixed(1) + "k";
	return String(num);
}

function formatTime(time) {
	const diff = Date.now() - time;
	if (diff < 60000) return "刚刚";
	if (diff < 3600000) return Math.floor(diff / 60000) + "分钟前";
	if (diff < 86400000) return Math.floor(diff / 3600000) + "小时前";
	const date = new Date(time);
	const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
	return `${weekDays[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
}

function goHome() {
	uni.navigateBack({
		fail: () => uni.reLaunch({ url: "/pages/index/index360" })
	});
}

function goMessages() {
	uni.switchTab({
		url: "/pages/notice/notice",
		fail: () => uni.showToast({ title: "消息中心开发中", icon: "none" })
	});
}

onMounted(() => {
	loadAll();
	loadUnreadCount();
});
</script>

<style lang="scss" scoped>
.container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #f5f5f5;
	position: relative;
}

/* 顶部 */
.page-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 24rpx;
	background: linear-gradient(95deg, #667eea 0%, #764ba2 100%);
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
	flex-shrink: 0;

	.header-left,
	.header-right {
		width: 60rpx;
		display: flex;
		align-items: center;
		position: relative;
	}

	.header-right {
		justify-content: flex-end;
	}

	.header-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #fff;
	}

	.header-badge {
		position: absolute;
		top: -10rpx;
		right: -4rpx;
		min-width: 30rpx;
		height: 30rpx;
		padding: 0 6rpx;
		border-radius: 15rpx;
		background: #ff4d4f;
		color: #fff;
		font-size: 18rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2rpx solid #764ba2;
	}
}

/* 搜索栏 */
.search-bar {
	display: flex;
	align-items: center;
	padding: 16rpx 24rpx;
	background-color: #fff;
	box-shadow: 0 2rpx 5rpx rgba(0, 0, 0, 0.05);
	flex-shrink: 0;

	.search-input-wrap {
		flex: 1;
		display: flex;
		align-items: center;
		background: #f2f3f7;
		border-radius: 36rpx;
		padding: 14rpx 24rpx;
		gap: 12rpx;
	}

	.search-input {
		flex: 1;
		font-size: 26rpx;
	}

	.search-cancel {
		margin-left: 20rpx;
		font-size: 28rpx;
		color: #667eea;
		flex-shrink: 0;
	}
}

/* 搜索面板 */
.search-panel {
	flex: 1;
	background: #fff;
	padding: 24rpx;
	overflow-y: auto;

	.panel-section {
		margin-bottom: 32rpx;
	}

	.panel-title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16rpx;
	}

	.panel-title {
		font-size: 26rpx;
		color: #999;
		font-weight: 600;
		margin-bottom: 16rpx;
		display: block;
	}

	.history-list {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
	}

	.history-chip {
		background: #f2f3f7;
		color: #555;
		font-size: 24rpx;
		padding: 12rpx 24rpx;
		border-radius: 28rpx;

		&.hot {
			background: rgba(102, 126, 234, 0.08);
			color: #667eea;
		}
	}
}

/* 主滚动区 */
.content-scroll {
	flex: 1;
	overflow: hidden;
}

.scroll-bottom-spacer {
	height: 140rpx;
}

/* 公告轮播 */
.notice-carousel {
	margin: 20rpx 24rpx;
	height: 84rpx;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.25);

	.swiper-wrapper {
		width: 100%;
		height: 100%;
	}

	.notice-item {
		display: flex;
		align-items: center;
		height: 84rpx;
		padding: 0 24rpx;
		background: linear-gradient(95deg, #667eea 0%, #764ba2 100%);
		gap: 14rpx;

		.notice-icon {
			flex-shrink: 0;
		}

		.notice-text {
			flex: 1;
			font-size: 26rpx;
			color: #fff;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
}

/* 数据条 */
.stats-bar {
	display: flex;
	align-items: center;
	margin: 0 24rpx 20rpx;
	background: #fff;
	border-radius: 16rpx;
	padding: 22rpx 0;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);

	.stats-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6rpx;
	}

	.stats-num {
		font-size: 30rpx;
		font-weight: 700;
		color: #333;

		&.accent {
			color: #667eea;
		}
	}

	.stats-label {
		font-size: 22rpx;
		color: #999;
	}

	.stats-divider {
		width: 1px;
		height: 40rpx;
		background: #eee;
	}
}

/* 分类导航 */
.category-nav {
	white-space: nowrap;
	padding: 0 24rpx 20rpx;

	.category-item {
		display: inline-flex;
		align-items: center;
		gap: 8rpx;
		padding: 14rpx 26rpx;
		background-color: #fff;
		border-radius: 30rpx;
		margin-right: 16rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
		position: relative;
		transition: all 0.25s ease;

		&.active {
			box-shadow: 0 6rpx 16rpx rgba(102, 126, 234, 0.3);
			transform: translateY(-2rpx);
		}

		.category-name-text {
			font-size: 26rpx;
			color: #333;

			&.text-active {
				color: #fff;
				font-weight: 600;
			}
		}

		.category-count {
			font-size: 18rpx;
			color: #bbb;
			margin-left: 4rpx;
		}
	}
}

/* 话题标签 */
.tags-container {
	display: flex;
	flex-wrap: wrap;
	padding: 0 24rpx 20rpx;
	gap: 14rpx;

	.tag-item {
		background-color: #fff;
		border-radius: 28rpx;
		padding: 10rpx 24rpx;
		font-size: 24rpx;
		color: #666;
		box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.04);

		&.active {
			background: rgba(102, 126, 234, 0.1);
			color: #667eea;
			font-weight: 600;
		}
	}
}

/* Tab 切换条 */
.tab-bar {
	display: flex;
	background-color: #fff;
	margin: 0 24rpx 20rpx;
	border-radius: 16rpx;
	padding: 8rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.04);

	.slider-tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8rpx;
		padding: 16rpx 0;
		border-radius: 12rpx;
		transition: all 0.25s ease;

		.tab-label {
			font-size: 26rpx;
			font-weight: 600;
			color: #999;
		}

		&.active {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.35);

			.tab-label {
				color: #fff;
			}
		}
	}
}

/* 骨架屏 */
.skeleton-card {
	background: #fff;
	border-radius: 20rpx;
	padding: 28rpx;
	margin: 0 24rpx 20rpx;

	.skeleton-header {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.skeleton-avatar {
		width: 84rpx;
		height: 84rpx;
		border-radius: 50%;
		background: #eee;
		margin-right: 20rpx;
		animation: shimmer 1.4s infinite ease-in-out;
	}

	.skeleton-lines {
		flex: 1;
	}

	.skeleton-line {
		height: 24rpx;
		background: #eee;
		border-radius: 8rpx;
		margin-bottom: 14rpx;
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

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 140rpx 0;

	.empty-text {
		font-size: 30rpx;
		font-weight: 500;
		color: #666;
		margin: 24rpx 0 10rpx;
		text-align: center;
		padding: 0 48rpx;
	}

	.empty-hint {
		font-size: 24rpx;
		color: #999;
	}

	.empty-reset-btn {
		margin-top: 32rpx;
		padding: 14rpx 40rpx;
		background: rgba(102, 126, 234, 0.1);
		color: #667eea;
		border-radius: 30rpx;
		font-size: 26rpx;
	}
}

/* 帖子列表 */
.post-list {
	padding: 0 24rpx;
}

.post-item {
	margin-bottom: 20rpx;
}

.post-card {
	background-color: #fff;
	border-radius: 20rpx;
	padding: 26rpx 28rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);

	.post-header {
		display: flex;
		align-items: center;
		margin-bottom: 18rpx;

		.avatar-img {
			width: 80rpx;
			height: 80rpx;
			border-radius: 50%;
			background-color: #f0f0f0;
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
			color: #333;
			font-weight: 600;
		}

		.vip-tag {
			font-size: 18rpx;
			color: #fff;
			background: linear-gradient(135deg, #f56c6c 0%, #4facfe 100%);
			padding: 3rpx 10rpx;
			border-radius: 8rpx;
		}

		.essence-tag {
			font-size: 18rpx;
			color: #fff;
			background: linear-gradient(135deg, #ffb020, #ff7a45);
			padding: 3rpx 10rpx;
			border-radius: 8rpx;
		}

		.meta-row {
			display: flex;
			align-items: center;
			gap: 14rpx;
			margin-top: 6rpx;
		}

		.category-pill {
			font-size: 22rpx;
			font-weight: 600;
		}

		.time {
			font-size: 22rpx;
			color: #bbb;
		}
	}

	.post-content {
		font-size: 28rpx;
		color: #444;
		line-height: 1.75;
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
		font-size: 24rpx;
		color: #667eea;
		margin-top: 8rpx;
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

	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 10rpx;
		margin-top: 18rpx;

		.post-tag {
			background: rgba(102, 126, 234, 0.08);
			color: #667eea;
			font-size: 22rpx;
			padding: 6rpx 16rpx;
			border-radius: 20rpx;
		}
	}

	.post-footer {
		padding-top: 18rpx;
		margin-top: 18rpx;
		border-top: 1px solid #f5f5f5;

		.action-bar {
			display: flex;
			justify-content: space-between;
		}

		.action-item {
			display: flex;
			align-items: center;
			gap: 6rpx;
			font-size: 24rpx;
			color: #999;

			.color-red {
				color: #ff5c5c;
			}

			.color-gold {
				color: #ffb400;
			}
		}
	}
}

/* 评论面板 */
.comments-panel {
	margin-top: 18rpx;
	padding-top: 18rpx;
	border-top: 1px solid #f5f5f5;
	background: #fafafc;
	border-radius: 12rpx;
	padding: 18rpx 20rpx;

	.comments-empty {
		text-align: center;
		font-size: 24rpx;
		color: #bbb;
		padding: 16rpx 0;
	}

	.comment-floor {
		padding: 4rpx 0;

		& + .comment-floor {
			border-top: 1px solid #f0f0f2;
		}
	}

	.comment-row {
		display: flex;
		gap: 16rpx;
		padding: 14rpx 0;

		& + .comment-row {
			border-top: 1px solid #f0f0f2;
		}
	}

	/* 回复统一缩进挂在所属一级评论下，最多两层 */
	.reply-list {
		margin: 4rpx 0 4rpx 72rpx;
		padding-left: 18rpx;
		border-left: 2rpx solid #ececf2;

		.comment-row {
			padding: 10rpx 0;
		}
	}

	.comment-avatar {
		width: 56rpx;
		height: 56rpx;
		border-radius: 50%;
		background: #eee;
		flex-shrink: 0;

		&.small {
			width: 48rpx;
			height: 48rpx;
		}
	}

	.comment-main {
		flex: 1;
		min-width: 0;
	}

	.comment-top {
		display: flex;
		align-items: center;
		gap: 10rpx;
	}

	.comment-username {
		font-size: 25rpx;
		color: #667eea;
		font-weight: 600;
	}

	.comment-replyto {
		font-size: 22rpx;
		color: #999;
	}

	.comment-content {
		display: block;
		font-size: 26rpx;
		color: #444;
		line-height: 1.6;
		margin-top: 6rpx;
		word-break: break-word;
	}

	.comment-actions {
		display: flex;
		align-items: center;
		gap: 20rpx;
		margin-top: 8rpx;
	}

	.comment-time {
		font-size: 21rpx;
		color: #bbb;
	}

	.comment-action-btn {
		font-size: 22rpx;
		color: #999;
	}

	.comment-like {
		display: flex;
		align-items: center;
		gap: 4rpx;
		font-size: 21rpx;
		color: #bbb;
	}

	.comment-toggle-all {
		display: block;
		text-align: center;
		font-size: 24rpx;
		color: #667eea;
		padding: 16rpx 0 6rpx;
	}

	.comment-input-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-top: 14rpx;
		padding-top: 14rpx;
		border-top: 1px solid #f0f0f2;
	}

	.comment-input-fake {
		flex: 1;
		background: #fff;
		border-radius: 30rpx;
		padding: 12rpx 24rpx;
		font-size: 24rpx;
		color: #bbb;
	}
}

.color-primary {
	color: #667eea !important;
}

/* 回复弹出框 */
.reply-mask {
	align-items: flex-end;
	background: rgba(0, 0, 0, 0.15);
}

.reply-modal {
	width: 100%;
	background: #fff;
	border-radius: 24rpx 24rpx 0 0;
	padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
	box-shadow: 0 -6rpx 24rpx rgba(0, 0, 0, 0.08);

	.reply-target-tip {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 22rpx;
		color: #667eea;
		margin-bottom: 12rpx;
	}

	.reply-target-clear {
		color: #bbb;
	}

	.reply-input-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		background: #f2f3f7;
		border-radius: 36rpx;
		padding: 8rpx 10rpx 8rpx 28rpx;
	}

	.reply-input {
		flex: 1;
		font-size: 26rpx;
		height: 60rpx;
	}

	.reply-send-btn {
		flex-shrink: 0;
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: #fff;
		font-size: 24rpx;
		font-weight: 600;
		padding: 14rpx 28rpx;
		border-radius: 30rpx;

		&.disabled {
			opacity: 0.5;
		}
	}
}

.load-more-tip,
.no-more-tip {
	text-align: center;
	padding: 32rpx 0;
	font-size: 24rpx;
	color: #bbb;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
}

/* 回到顶部 */
.back-to-top {
	position: fixed;
	right: 30rpx;
	bottom: 220rpx;
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.12);
	z-index: 90;
}

/* 发布按钮 */
.publish-btn {
	position: fixed;
	right: 30rpx;
	bottom: 100rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	width: 140rpx;
	height: 88rpx;
	background: linear-gradient(95deg, #667eea 0%, #764ba2 100%);
	border-radius: 50rpx;
	box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.4);
	z-index: 90;

	text {
		font-size: 26rpx;
		color: #fff;
		font-weight: 600;
	}
}

/* 发布弹窗 */
.modal-mask {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: flex-end;
	z-index: 200;
}

.publish-modal {
	width: 100%;
	max-height: 88vh;
	background: #fff;
	border-radius: 28rpx 28rpx 0 0;
	display: flex;
	flex-direction: column;

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 26rpx 28rpx;
		border-bottom: 1px solid #f2f2f2;

		.modal-title {
			font-size: 30rpx;
			font-weight: 600;
			color: #333;
		}

		.modal-cancel {
			font-size: 28rpx;
			color: #999;
		}

		.modal-submit {
			font-size: 28rpx;
			color: #667eea;
			font-weight: 600;

			&.disabled {
				color: #ccc;
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
	}

	.char-count {
		display: block;
		text-align: right;
		font-size: 22rpx;
		color: #bbb;
		margin: 8rpx 0 24rpx;
	}

	.form-block {
		margin-bottom: 32rpx;
	}

	.form-label {
		display: block;
		font-size: 26rpx;
		color: #666;
		margin-bottom: 16rpx;
		font-weight: 600;
	}

	.form-category-list {
		display: flex;
		flex-wrap: wrap;
		gap: 14rpx;
	}

	.form-category-chip {
		padding: 12rpx 26rpx;
		background: #f2f3f7;
		border-radius: 28rpx;
		font-size: 24rpx;
		color: #666;

		&.active {
			background: rgba(102, 126, 234, 0.12);
			color: #667eea;
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
			color: #fff;
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
		border: 2rpx dashed #ddd;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8rpx;

		text {
			font-size: 20rpx;
			color: #bbb;
		}
	}
}
</style>