<template>
	<view class="container">
		<!-- 状态栏占位 -->
		<!-- <view
			class="status-bar"
			:style="{ height: statusBarHeight + 'px' }"
		></view> -->

		<!-- 顶部导航栏 -->
		<view class="header-nav">
			<view class="nav-left">
				<!-- 用户头像占位 -->
				<view class="avatar-circle" @click="handleLogout">
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
					:class="{ active: model === '教學' }"
					@click="model = '教學'"
				>
					<text class="tab-text">教學</text>
					<view class="tab-line" v-if="model === '教學'"></view>
				</view>
				<view
					class="nav-tab"
					:class="{ active: model === '為您推薦' }"
					@click="model = '為您推薦'"
				>
					<text class="tab-text">為您推薦</text>
					<view class="tab-line" v-if="model === '為您推薦'"></view>
				</view>
				<view
					class="nav-tab"
					:class="{ active: model === '活動' }"
					@click="model = '活動'"
				>
					<text class="tab-text">活動</text>
					<view class="tab-line" v-if="model === '活動'"></view>
				</view>
			</view>

			<view class="nav-right">
				<!-- 右侧消息图标 -->
				<uni-icons type="mail" size="28" color="#333"></uni-icons>
			</view>
		</view>
		<view v-if="model === '為您推薦'">
			<!-- 搜索栏 -->
			<view class="search-container">
				<view class="search-box">
					<text class="search-placeholder">搜索話題/用戶</text>
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

			<!-- 帖子信息流 (随机资料卡片) -->
			<view class="feed-container" v-if="currentEntryIndex == 1">
				<!-- 首次加载中 -->
				<view
					v-if="loading && profiles.length === 0"
					class="loading-container"
				>
					<text class="loading-text">加载中...</text>
				</view>

				<!-- 空状态 -->
				<view
					v-if="!loading && profiles.length === 0"
					class="empty-state"
				>
					<text class="empty-text">暂时没有更多推荐</text>
				</view>

				<view
					class="post-card"
					v-for="item in profiles"
					:key="item.profileId"
				>
					<!-- 帖子头部: 用户信息 -->
					<view class="post-header">
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
					<view class="post-media" v-if="getMainImage(item)">
						<image
							class="media-img"
							:src="getMainImage(item)"
							mode="aspectFill"
						></image>
					</view>

					<!-- 帖子底部操作栏 -->
					<view class="post-actions">
						<view class="actions-left">
							<view class="action-btn" @click="toggleLike(item)">
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
							<text>加载中...</text>
						</view>
						<template v-else>
							<view
								v-for="c in item.comments"
								:key="c.id"
								class="comment-item"
								@click="startReply(item, c)"
							>
								<text class="comment-author">{{
									c.email
								}}</text>
								<text
									v-if="c.reply_to_email"
									class="comment-reply-arrow"
								>
									回复 {{ c.reply_to_email }}</text
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
								<text>还没有评论，来抢沙发～</text>
							</view>
						</template>

						<!-- 评论输入框 -->
						<view class="comment-input-row">
							<view
								v-if="item.replyTarget"
								class="reply-target-tag"
							>
								<text>回复 {{ item.replyTarget.email }}</text>
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
											? `回复 ${item.replyTarget.email}`
											: '说点什么…'
									"
									@confirm="submitComment(item)"
								/>
								<text
									class="comment-send-btn"
									@click="submitComment(item)"
									>发送</text
								>
							</view>
						</view>
					</view>
				</view>

				<!-- 上滑加载更多状态 -->
				<view v-if="loadingMore" class="load-more-tip">
					<text>加载更多中...</text>
				</view>
				<view
					v-if="!hasMore && profiles.length > 0"
					class="load-more-tip"
				>
					<text>没有更多了</text>
				</view>
			</view>
			<AntiqueCollection v-if="currentEntryIndex == 0" />
			<AuctionActivity v-if="currentEntryIndex == 2" />
			<!-- 右下角悬浮发布按钮 -->
			<view class="fab-button">
				<uni-icons type="plusempty" size="24" color="#000"></uni-icons>
			</view>
		</view>
		<AntiqueCollection v-if="model === '教學'" />
		<AuctionActivity v-if="model === '活動'" />
		<!-- 底部安全区留白 -->
		<view class="safe-area-bottom"></view>
	</view>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import {
	getExploreFeedApi,
	toggleProfileLikeApi,
	getProfileCommentsApi,
	addProfileCommentApi,
} from "@/api/index.js";
import { config } from "@/utils/config.js";
import { ensureTokenValid } from "@/utils/guard.js";
import AntiqueCollection from "./components/Antiquecollection.vue";
import AuctionActivity from "./components/Auctionactivity.vue";
import { clearAuth } from "@/utils/auth.js";
import { unregisterCurrentDevice } from "@/utils/pushNotifications.js";

// 状态栏高度适配
const statusBarHeight = ref(44);
const model = ref("為您推薦");
const userInfo = ref({});

async function handleLogout() {
	await unregisterCurrentDevice();
	clearAuth();
	uni.showToast({ title: "已退出登录", icon: "success" });
	setTimeout(() => {
		uni.reLaunch({ url: "/pages/login/login360" });
	}, 500);
}

onMounted(async () => {
	// 兜底：进入首页时再校验一次 token，避免路由守卫漏掉的过期场景

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
			// 动态获取状态栏高度以适配刘海屏
			statusBarHeight.value = res.statusBarHeight || 44;
		},
	});
	loadFeed({ isRefresh: true });
});

// ------- 瀑布流数据 -------
const profiles = ref([]); // 当前展示的资料卡片列表
const loading = ref(false); // 首次/下拉刷新的加载状态
const loadingMore = ref(false); // 上滑加载更多的状态
const hasMore = ref(true); // 是否还有更多可加载

function getFullImageUrl(path) {
	if (!path) return "";
	if (path.startsWith("http")) return path;
	return config.baseURL + path;
}

// 优先用头像，没有就用资料照片里的第一张
function getMainImage(item) {
	if (item.photos && item.photos.length > 0)
		return getFullImageUrl(
			item.photos[1] ? item.photos[1] : item.photos[0],
		);
	if (item.avatarUrl) return getFullImageUrl(item.avatarUrl);
	return "";
}

function formatLocation(item) {
	return (
		[item.country, item.region].filter(Boolean).join(" · ") ||
		item.occupation ||
		""
	);
}

// 拉取一批资料卡片
// isRefresh = true：下拉刷新，重新随机抽一批（清空 excludeIds）
// isRefresh = false：上滑加载更多，带上已经展示过的 profileId 避免重复
async function loadFeed({ isRefresh }) {
	if (isRefresh) {
		loading.value = true;
	} else {
		if (loadingMore.value || !hasMore.value) return;
		loadingMore.value = true;
	}

	try {
		const excludeIds = isRefresh
			? []
			: profiles.value.map((p) => p.profileId);
		const res = await getExploreFeedApi({ limit: 15, excludeIds });

		const newItems = (res.profiles || []).map((p) => ({
			...p,
			showComments: false,
			commentsLoading: false,
			comments: [],
			replyTarget: null,
			commentDraft: "",
		}));

		if (isRefresh) {
			profiles.value = newItems;
		} else {
			profiles.value = profiles.value.concat(newItems);
		}
		hasMore.value = !!res.hasMore;
	} catch (e) {
		console.error("加载推荐失败", e);
		uni.showToast({ title: "加载失败", icon: "none" });
	} finally {
		loading.value = false;
		loadingMore.value = false;
		uni.stopPullDownRefresh();
	}
}

// 下拉刷新（页面需要在 pages.json 里给这个页面开启 "enablePullDownRefresh": true）
onPullDownRefresh(() => {
	loadFeed({ isRefresh: true });
});

// 上滑触底加载更多（同样依赖 pages.json 的 onReachBottomDistance，默认 50px 即可）
onReachBottom(() => {
	loadFeed({ isRefresh: false });
});

// ------- 点赞 -------
async function toggleLike(item) {
	const prevLiked = item.isLiked;
	const prevCount = item.likeCount || 0;
	// 乐观更新
	item.isLiked = !prevLiked;
	item.likeCount = prevCount + (item.isLiked ? 1 : -1);

	try {
		const res = await toggleProfileLikeApi(item.profileId);
		item.isLiked = res.isLiked;
		item.likeCount = res.likeCount;
	} catch (e) {
		console.error("点赞失败", e);
		item.isLiked = prevLiked;
		item.likeCount = prevCount;
		uni.showToast({ title: "操作失败，请重试", icon: "none" });
	}
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
		uni.showToast({ title: "获取评论失败", icon: "none" });
	} finally {
		item.commentsLoading = false;
	}
}

function startReply(item, comment) {
	item.replyTarget = { userId: comment.user_id, email: comment.email };
}

function cancelReply(item) {
	item.replyTarget = null;
}

async function submitComment(item) {
	const text = (item.commentDraft || "").trim();
	if (!text) return;
	try {
		const res = await addProfileCommentApi(
			item.profileId,
			text,
			item.replyTarget?.userId,
		);
		item.comments.push(res.comment);
		item.commentCount = (item.commentCount || 0) + 1;
		item.commentDraft = "";
		item.replyTarget = null;
	} catch (e) {
		console.error("评论失败", e);
		uni.showToast({ title: "评论失败", icon: "none" });
	}
}

// 将原本分散在九宫格和列表里的所有入口整合到一个数组中
const originalEntries = ref([
	{ name: "精选", page: "/pages/choose/index" },
	{ name: "祝福", page: "/pages/wishes/index" },
	{ name: "古董", page: "/pages/market/marketList?category=antique" },
	{ name: "二手市场", page: "/pages/market/marketList?category=second_hand" },
	// { name: "分析工具", page: "/pages/analysis/index" },
	// { name: "通知", page: "/pages/notification/index" },
	{ name: "搜尋候選人", page: "/pages/searchPerson/searchPerson" },
	// { name: "關心管理", page: "/pages/care/index" },
	// { name: "家庭交流管理", page: "/pages/family/index" },
	// { name: "初用者", page: "/pages/my/myFile/myFile" },
	// { name: "祝福子女政策", page: "/pages/policy/index" },
	// { name: "註冊", page: "/pages/auth/register" },
	// { name: "協助者手冊", page: "/pages/manual/helper" },
	// { name: "會員手冊", page: "/pages/manual/member" },
	// { name: "連絡", page: "/pages/contact/index" },
]);

// 当前选中的滚动 Tab 索引
const currentEntryIndex = ref(1);

// 点击入口跳转
const handleEntryClick = (index, url) => {
	if (index == 4) {
		uni.navigateTo({
			url: url,
		});
		return;
	}
	currentEntryIndex.value = index;
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
	min-height: 100vh;
	position: relative;
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
		gap: 40rpx;
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

	.scroll-tabs {
		flex: 1;
		overflow: hidden;
		white-space: nowrap;

		// 隐藏滚动条
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

/* --- 4. 帖子信息流区 --- */
.feed-container {
	padding: 10rpx 30rpx;
}

.loading-container,
.empty-state {
	display: flex;
	justify-content: center;
	padding: 100rpx 0;
	color: $text-sub;
	font-size: 28rpx;
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

	// 头部用户信息
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

			.username {
				font-size: 32rpx;
				font-weight: bold;
				color: $text-main;
				line-height: 1.2;
			}

			.location-box {
				display: flex;
				align-items: center;
				margin-top: 4rpx;

				.location {
					font-size: 24rpx;
					color: $text-sub;
				}
			}
		}
	}

	// 媒体大图
	.post-media {
		width: 100%;
		height: 700rpx;
		border-radius: 20rpx;
		overflow: hidden;
		position: relative;

		.media-img {
			width: 100%;
			height: 100%;
			background-color: #f0f0f0;
		}
	}

	// 底部互动操作
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

	// 点赞/评论 灰底信息区
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

/* --- 5. 悬浮按钮 (FAB) --- */
.fab-button {
	position: fixed;
	right: 40rpx;
	bottom: 200rpx; // 避开TabBar
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

.safe-area-bottom {
	height: env(safe-area-inset-bottom);
}
</style>
