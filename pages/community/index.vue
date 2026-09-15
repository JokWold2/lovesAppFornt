<template>
	<view class="container">
		<!-- 社区顶部标题 -->
		<view class="page-header">
			<text class="header-title" @click="goHome">社区</text>
			<uni-icons type="back" size="20" color="#fff" @click="goHome"></uni-icons>
		</view>

		<!-- 搜索栏 -->
		<view class="search-bar">
			<input 
				class="search-input" 
				placeholder="搜索话题、帖子..."
				@confirm="onSearchConfirm"
				@input="onSearchInput"
				v-model="searchKeyword"
			/>
			<uni-icons type="search" size="20" color="#999"></uni-icons>
		</view>

		<!-- 内容区域 -->
		<scroll-view scroll-y class="content-scroll">
			<!-- 轮播公告 -->
			<view class="notice-carousel">
				<swiper 
					class="swiper-wrapper" 
					:autoplay="true" 
					:interval="3000" 
					:duration="500"
					:circular="true"
					:indicator-dots="true"
					indicator-active-color="#667eea"
					indicator-color="rgba(255,255,255,0.6)"
					:current="currentNoticeIndex"
					@change="onNoticeChange"
				>
					<swiper-item v-for="(notice, index) in notices" :key="index">
						<view class="notice-item" @click="onNoticeClick(notice)">
							<view class="notice-icon">
								<uni-icons type="info-filled" size="22" color="#fff"></uni-icons>
							</view>
							<text class="notice-text">{{ notice.title }}</text>
							<view class="notice-arrow">
								<uni-icons type="right" size="16" color="#fff"></uni-icons>
							</view>
						</view>
					</swiper-item>
				</swiper>
			</view>

			<!-- 分类导航 -->
			<view class="category-nav">
				<view 
					class="category-item" 
					v-for="(cat, index) in categories" 
					:key="index"
					@click="switchCategory(cat.name)"
				>
					<view :class="['category-icon', { active: activeCategory === cat.name }]">
						<uni-icons :type="cat.icon" size="28" :color="activeCategory === cat.name ? '#fff' : cat.color"></uni-icons>
					</view>
					<text :class="['category-name', { active: activeCategory === cat.name }]">{{ cat.name }}</text>
				</view>
			</view>

			<!-- 分类切换 Tab -->
			<view class="tab-bar">
				<view 
					v-for="tab in tabs" 
					:key="tab.key"
					:class="['tab-item', { active: activeTab === tab.key }]"
					@click="switchTab(tab.key)"
				>
					<text>{{ tab.label }}</text>
					<view v-if="activeTab === tab.key" class="tab-indicator"></view>
				</view>
			</view>

			<!-- 帖子列表 -->
			<view class="post-list">
				<view 
					v-if="filteredPosts.length === 0"
					class="empty-state"
				>
					<uni-icons type="info" size="60" color="#ccc"></uni-icons>
					<text class="empty-text">暂无帖子</text>
					<text class="empty-hint">换个分类试试吧</text>
				</view>

				<view 
					class="post-card" 
					v-for="(item, index) in filteredPosts" 
					:key="item.id"
					@click="openPost(item)"
				>
					<view class="post-header">
						<image 
							class="avatar-img" 
							:src="item.avatar"
							mode="aspectFill"
						></image>
						<view class="user-info">
							<text class="username">{{ item.username }}</text>
							<text class="time">{{ formatTime(item.createTime) }}</text>
						</view>
						<view class="post-category-badge">
							<text>{{ getCategoryLabel(item.category) }}</text>
						</view>
					</view>
					<text class="post-title">{{ item.title }}</text>
					<text class="post-content">{{ item.content }}</text>
					<view class="post-header">
						<image 
							class="avatar-img" 
							:src="item.avatar"
							mode="aspectFill"
						></image>
						<view class="user-info">
							<text class="username">{{ item.username }}</text>
							<text class="time">{{ formatTime(item.createTime) }}</text>
						</view>
					</view>
					<text class="post-content">{{ item.content }}</text>
					<view class="post-footer">
						<view class="post-tags">
							<text class="post-tag" v-for="(tag, ti) in item.tags" :key="ti">#{{ tag }}</text>
						</view>
						<view class="action-bar">
							<view class="action-item">
								<uni-icons type="eye" size="16"></uni-icons>
								<text class="action-text">{{ item.viewCount }}</text>
							</view>
							<view class="action-item">
								<uni-icons type="star" size="16"></uni-icons>
								<text class="action-text">{{ item.likeCount }}</text>
							</view>
							<view class="action-item">
								<uni-icons type="chatbox" size="16"></uni-icons>
								<text class="action-text">{{ item.replyCount || 0 }}</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 加载更多 -->
				<view v-if="loadingMore" class="load-more-tip">
					<text>加载中...</text>
				</view>
				<view v-if="!hasMore && posts.length > 0" class="no-more-tip">
					<text>没有更多了</text>
				</view>
			</view>
		</scroll-view>

		<!-- 底部发布按钮 -->
		<view class="publish-btn" @click="publishPost">
			<uni-icons type="plus" size="24"></uni-icons>
			<text>发布新帖子</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

// 状态定义
const searchKeyword = ref("");
const selectedTag = ref("");
const loadingMore = ref(false);
const hasMore = ref(true);

// 分类导航数据
const activeCategory = ref("全部");
const categories = ref([
	{ name: "全部", icon: "browser", color: "#667eea" },
	{ name: "前端", icon: "code-working", color: "#10ac84" },
	{ name: "后端", icon: "compose", color: "#e6a23c" },
	{ name: "移动端", icon: "phone", color: "#f56c6c" },
	{ name: "AI", icon: "cpu", color: "#764ba2" },
	{ name: "设计", icon: "map", color: "#48c78e" },
	{ name: "职场", icon: "contact", color: "#695de9" },
	{ name: "闲聊", icon: "chat", color: "#ffd23d" }
]);

// Tab 切换
const activeTab = ref("latest");
const tabs = ref([
	{ key: "latest", label: "最新" },
	{ key: "hot", label: "热门" },
	{ key: "essence", label: "精华" }
]);

// 分类导航
function switchCategory(name) {
	activeCategory.value = name;
	uni.showToast({ title: `分类：${name}`, icon: "none" });
}

// Tab 切换
function switchTab(key) {
	activeTab.value = key;
}

// 获取分类标签文字
function getCategoryLabel(cat) {
	return categories.value.find(c => c.name === cat)?.name || cat;
}

// 过滤后的帖子列表
const filteredPosts = computed(() => {
	let result = posts.value;

	// 按分类过滤
	if (activeCategory.value !== "全部") {
		result = result.filter(p => p.category === activeCategory.value);
	}

	// 按 Tab 排序/过滤
	if (activeTab.value === "hot") {
		result = [...result].sort((a, b) => (b.likeCount + b.viewCount) - (a.likeCount + a.viewCount));
	} else if (activeTab.value === "essence") {
		result = result.filter(p => p.isEssence);
	} else {
		// latest — 按时间倒序
		result = [...result].sort((a, b) => b.createTime - a.createTime);
	}

	return result;
});

// 轮播公告
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
	uni.showToast({ title: notice.title.slice(0, 10) + "...", icon: "none" });
	// TODO: 根据 notice.type 跳转到对应详情页
}

// 热门话题标签
const tags = ref([
	"技术分享", "创业经验", "生活随笔", "美食探索", 
	"旅行故事", "摄影作品", "设计讨论", "行业交流"
]);

// 模拟帖子数据
const posts = ref([
	{
		id: 1,
		username: "张三",
		avatar: "/static/default-avatar.png",
		content: "今天学习了一个新的前端框架，真的很强大！大家有什么好推荐的学习资源吗？#前端开发 #技术分享",
		createTime: Date.now() - 3600000,
		viewCount: 128,
		likeCount: 25
	},
	{
		id: 2,
		username: "李四",
		avatar: "/static/default-avatar.png",
		content: "分享一篇我写的文章，关于如何利用 AI 工具提升工作效率。感兴趣的朋友可以看下！🔥",
		createTime: Date.now() - 7200000,
		viewCount: 89,
		likeCount: 18
	},
	{
		id: 3,
		username: "王五",
		avatar: "/static/default-avatar.png",
		content: "周末去了香山，红叶景色太美了！📷分享几张随手拍的照片。#摄影 #香山#",
		createTime: Date.now() - 10800000,
		viewCount: 256,
		likeCount: 67
	}
]);

// 格式化时间
function formatTime(time) {
	const now = Date.now();
	const diff = now - time;
	
	if (diff < 60000) return "刚刚";
	if (diff < 3600000) return Math.floor(diff / 60000) + "分钟前";
	if (diff < 86400000) return Math.floor(diff / 3600000) + "小时前";
	
	const date = new Date(time);
	const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
	return `${weekDays[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
}

// 返回首页
function goHome() {
	uni.navigateTo({ url: '/pages/index/index360' });
}

// 搜索确认
function onSearchConfirm(e) {
	const keyword = e.detail.value.trim();
	if (keyword) {
		uni.showToast({ title: `搜索：${keyword}`, icon: 'none' });
		// TODO: 实际调用搜索接口
	}
	searchKeyword.value = "";
}

// 搜索输入
function onSearchInput(e) {
	const value = e.detail.value.trim();
	if (value !== searchKeyword.value && !tags.value.includes(value)) {
		// 添加新话题标签
		tags.value.push(value);
		selectedTag.value = value;
	}
}

// 选择话题标签
function selectTag(tag) {
	selectedTag.value = tag;
	uni.showToast({ title: `切换至：${tag}`, icon: 'none' });
}

// 显示所有标签
function showAllTags() {
	uni.showActionSheet({
		itemList: tags.value,
		success: (res) => {
			if (!res.tappedIndex === -1) {
				selectTag(tags.value[res.tappedIndex]);
			}
		}
	});
}

// 打开帖子
function openPost(item) {
	uni.navigateTo({ 
		url: `/pages/post/detail?id=${item.id}`,
		fail: () => {
			uni.showToast({ title: '页面跳转失败', icon: 'none' });
		}
	});
}

// 发布新帖子
function publishPost() {
	const content = uni.getInput({
		title: '发布新帖子',
		placeholder: '分享你的想法和故事...',
		success: (res) => {
			if (res.content) {
				posts.value.unshift({
					id: Date.now(),
					username: "我",
					avatar: "/static/my-avatar.png",
					content: res.content,
					createTime: Date.now(),
					viewCount: 0,
					likeCount: 0
				});
				uni.showToast({ title: '发布成功', icon: 'success' });
			}
		},
		fail: () => {
			uni.showToast({ title: '取消发布', icon: 'none' });
		}
	});
}

onMounted(() => {
	console.log('社区页面初始化');
});
</script>

<style lang="scss" scoped>
.container {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background-color: #f5f5f5;
}

.page-header {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background: linear-gradient(95deg, #667eea 0%, #764ba2 100%);
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.1);
	
	.header-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #fff;
		margin-right: 16rpx;
	}
	
	.page-header uni-icons {
		cursor: pointer;
	}
}

.search-bar {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background-color: #fff;
	box-shadow: 0 2rpx 5rpx rgba(0,0,0,0.05);
	
	.search-input {
		flex: 1;
		font-size: 28rpx;
		padding-left: 20rpx;
		border: none;
		background: transparent;
	}
}

.content-scroll {
	flex: 1;
	padding-bottom: 120rpx;
}

/* 轮播公告 */
.notice-carousel {
	margin: 24rpx 30rpx;
	height: 88rpx;
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
		height: 88rpx;
		padding: 0 28rpx;
		background: linear-gradient(95deg, #667eea 0%, #764ba2 100%);

		.notice-icon {
			margin-right: 16rpx;
			flex-shrink: 0;
		}

		.notice-text {
			flex: 1;
			font-size: 28rpx;
			color: #fff;
			line-height: 1.4;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.notice-arrow {
			margin-left: 12rpx;
			flex-shrink: 0;
			opacity: 0.8;
		}
	}
}

.welcome-banner {
	margin: 40rpx 30rpx 20rpx;
	background-color: #fff;
	border-radius: 16rpx;
	
	.banner-text {
		display: block;
		font-size: 30rpx;
		color: #666;
		line-height: 1.6;
		text-align: center;
	}
}

.section-header {
	display: flex;
	align-items: center;
	padding: 24rpx 30rpx 16rpx;
	
	.section-title {
		font-size: 32rpx;
		font-weight: 600;
		color: #333;
	}
	
	.more-link {
		margin-left: auto;
		font-size: 26rpx;
		color: #999;
		cursor: pointer;
	}
}

.tags-container {
	display: flex;
	flex-wrap: wrap;
	padding: 0 30rpx 24rpx;
	gap: 12rpx;
	
	.tag-item {
		background-color: #fff;
		border-radius: 32rpx;
		padding: 12rpx 28rpx;
		box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.05);
		
		.tag-text {
			font-size: 26rpx;
			color: #666;
			
			&.active {
				color: #667eea;
				font-weight: 600;
			}
		}
	}
}

.post-list {
	padding: 0 30rpx;
	gap: 24rpx;
	
	.post-card {
		background-color: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
	}
	
	.post-header {
		display: flex;
		align-items: center;
		margin-bottom: 16rpx;
		
		.avatar-img {
			width: 80rpx;
			height: 80rpx;
			border-radius: 50%;
			margin-right: 20rpx;
		}
		
		.user-info {
			flex: 1;
			display: flex;
			flex-direction: column;
			
			.username {
				font-size: 30rpx;
				color: #333;
				font-weight: 500;
			}
			
			.time {
				font-size: 24rpx;
				color: #999;
				margin-top: 6rpx;
			}
		}
	}
	
	.post-content {
		font-size: 28rpx;
		color: #555;
		line-height: 1.8;
		white-space: pre-wrap;
		margin-bottom: 16rpx;
	}
	
	.post-footer {
		display: flex;
		gap: 32rpx;
		
		.action-item {
			display: flex;
			align-items: center;
			font-size: 24rpx;
			color: #999;
			
			& uni-icons {
				margin-right: 6rpx;
				color: #ccc;
			}
		}
	}
	
	.load-more-tip, .no-more-tip {
		text-align: center;
		padding: 40rpx 0;
		font-size: 26rpx;
		color: #bbb;
	}
}

.publish-btn {
	position: fixed;
	bottom: 30rpx;
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 240rpx;
	height: 90rpx;
	background: linear-gradient(95deg, #667eea 0%, #764ba2 100%);
	border-radius: 80rpx;
	box-shadow: 0 8rpx 20rpx rgba(102,126,234,0.4);
	gap: 12rpx;
	
	& uni-icons {
		color: #fff;
	}
	
	text {
		font-size: 32rpx;
		color: #fff;
		font-weight: 600;
	}
}
</style>
