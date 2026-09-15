<template>
	<view class="container">
		<!-- 社区顶部标题 -->
		<view class="page-header" @click="goHome">
			<text class="header-title">社区</text>
			<uni-icons type="back" size="20" color="#fff"></uni-icons>
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
			<!-- 欢迎横幅 -->
			<view class="welcome-banner">
				<text class="banner-text">欢迎来到社区！分享你的想法和故事</text>
			</view>

			<!-- 热门话题标签 -->
			<view class="section-header">
				<text class="section-title">热门话题</text>
				<text class="more-link" @click="showAllTags">查看更多</text>
			</view>
			<view class="tags-container">
				<view 
					class="tag-item" 
					v-for="(tag, index) in tags" 
					:key="index"
					@click="selectTag(tag)"
				>
					<text :class="['tag-text', { active: selectedTag === tag }]">{{ tag }}</text>
				</view>
			</view>

			<!-- 帖子列表 -->
			<view class="section-header">
				<text class="section-title">最新帖子</text>
			</view>
			<view class="post-list">
				<view 
					class="post-card" 
					v-for="(item, index) in posts" 
					:key="index"
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
					</view>
					<text class="post-content">{{ item.content }}</text>
					<view class="post-footer">
						<view class="action-item">
							<uni-icons type="eye" size="16"></uni-icons>
							<text class="action-text">{{ item.viewCount }}</text>
						</view>
						<view class="action-item">
							<uni-icons type="star" size="16"></uni-icons>
							<text class="action-text">{{ item.likeCount }}</text>
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
import { ref, onMounted } from "vue";

// 状态定义
const searchKeyword = ref("");
const selectedTag = ref("");
const loadingMore = ref(false);
const hasMore = ref(true);

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
