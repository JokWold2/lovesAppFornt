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
					:indicator-active-color="#667eea"
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
					class="category-item-wrapper" 
					v-for="(cat, index) in categories" 
					:key="index"
					@click="switchCategory(cat.name)"
					:touchstart="onCategoryTouchStart"
					:touchend="onCategoryTouchEnd"
				>
					<view 
						class="category-item active-border-{{ index === 0 ? 'l' : index === categories.length - 1 ? 'r' : 'none' }}"
						:class="{ active: activeCategory === cat.name }"
					>
						<image 
							class="category-icon-img"
							:src="getCategoryIcon(cat.icon, activeCategory === cat.name ? '#fff' : cat.color)"
							mode="aspectFit"
						></image>
						<text class="category-name-text">{{ cat.name }}</text>
						<view v-if="activeCategory === cat.name" class="hot-badge">
							<uni-icons type="fire-filled" size="12" color="#fff"></uni-icons>
						</view>
					</view>
				</view>
			</view>

			<!-- 分类切换 Tab -->
			<view class="tab-bar">
				<scroll-view 
					class="slider-container"
					enable-back-to-top
					show-scrollbar="false"
				>
					<view 
						class="slider-tab active-slide-{{ activeTab === 'hot' ? 'center' : '' }}"
						v-for="tab in tabs" 
						:key="tab.key"
						:class="{ active: activeTab === tab.key }"
						@click="switchTab(tab.key)"
					>
						<text class="tab-label">{{ tab.label }}</text>
						<view class="tab-indicator-wrapper">
							<view class="tab-indicator active-indicator"></view>
						</view>
					</view>
				</scroll-view>
			</view>

			<!-- 帖子列表 -->
			<scroll-view scroll-y class="post-scroll">
				<view 
					v-if="filteredPosts.length === 0"
					class="empty-state"
				>
					<uni-icons type="chat-box-filled" size="120" color="#f0f0f0"></uni-icons>
					<text class="empty-text">{{ activeCategory !== '全部' ? `暂无「${activeCategory}」的帖子` : "暂无帖子，快来发布第一条吧！" }}</text>
					<text class="empty-hint">换个分类或试试搜索关键词</text>
				</view>

				<view 
					class="post-item" 
					v-for="(item, index) in filteredPosts" 
					:key="`post-${item.id}-${index}`"
				>
					<view class="post-card" @click="openPost(item)">
						<view class="post-header">
							<image 
								class="avatar-img" 
								:src="item.avatar"
								mode="aspectFill"
							></image>
							<view class="user-info">
								<text class="username">{{ item.username }}</text>
								<view v-if="isActiveCategory('前端')" class="category-badge">
									<uni-icons type="code-filled" size="12" color="#667eea"></uni-icons>
								</view>
								<text class="time">{{ formatTime(item.createTime) }}</text>
							</view>
						</view>
						<text class="post-content">{{ item.content }}</text>
						<view class="post-footer">
							<view class="post-tags" v-if="item.tags && item.tags.length > 0">
								<text class="post-tag" v-for="(tag, ti) in item.tags" :key="ti">#{{ tag }}</text>
							</view>
							<view class="action-bar">
								<view class="action-item">
									<uni-icons type="eye-filled" size="14"></uni-icons>
									<text class="action-text">{{ formatNumber(item.viewCount) }}</text>
								</view>
								<view class="action-item">
									<uni-icons type="heart-filled" size="14"></uni-icons>
									<text class="action-text color-red">{{ formatNumber(item.likeCount) }}</text>
								</view>
								<view class="action-item">
									<uni-icons type="chatbubble-oval-filled" size="14"></uni-icons>
									<text class="action-text">{{ item.replyCount || 0 }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
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

// 分类图标资源
const categoryIcons = {
	"全部": "/static/icons/all.png",
	"前端": "/static/icons/frontend.png",
	"后端": "/static/icons/backend.png",
	"移动端": "/static/icons/mobile.png",
	"AI": "/static/icons/ai.png",
	"设计": "/static/icons/design.png",
	"职场": "/static/icons/career.png",
	"闲聊": "/static/icons/chill.png",
	default: "/static/icons/code-filled@2x.png"
};

// 分类触摸处理（可选的点击反馈）
function onCategoryTouchStart(e) {
	console.log('category touch start');
}

function onCategoryTouchEnd(e) {
	console.log('category touch end');
}

// 分类导航
function switchCategory(name) {
	activeCategory.value = name;
	uni.showToast({ 
		title: `查看${name}的帖子`, 
		icon: "none",
		duration: 1500,
		mask: true
	});
	
	// 添加动画效果
	let animationFrames = 10;
	const interval = setInterval(() => {
		animationFrames -= 1;
		if (animationFrames <= 0) {
			clearInterval(interval);
		}
	}, 50);
}

// Tab 切换
function switchTab(key) {
	activeTab.value = key;
}

// 获取分类图标（使用 uni.getImageInfo 处理或占位）
function getCategoryIcon(iconName, color) {
	if (!iconName || !categoryIcons[iconName]) {
		return `/static/icons/code-filled@2x.png`;
	}
	return categoryIcons[iconName];
}

// 格式化数字（带千分位）
function formatNumber(num) {
	if (num >= 10000) {
		return (num / 10000).toFixed(1) + '万';
	} else if (num >= 1000) {
		return (num / 1000).toFixed(1) + 'k';
	}
	return num.toString();
}

// 获取分类标签文字（简化处理）
function getCategoryLabel(catName) {
	const labelMap = {
		"前端": "前端开发",
		"后端": "后端技术",
		"移动端": "移动开发",
		"AI": "人工智能",
		"设计": "UI/UX 设计",
		"职场": "职业发展",
		"闲聊": "轻松聊天"
	};
	return labelMap[catName] || catName;
}

// 检查是否为特定分类
function isActiveCategory(category) {
	return activeCategory.value === category || activeCategory.value === '全部';
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

// 模拟帖子数据（包含分类字段）
const posts = ref([
	{
		id: 1,
		category: "前端",
		username: "张三",
		vip: true,
		avatar: "/static/default-avatar.png",
		content: "今天学习了一个新的前端框架 React 19，性能提升太明显了！大家有什么好的学习路线推荐吗？📚 #React 学习 #前端技术",
		createTime: Date.now() - 3600000,
		viewCount: 1285,
		likeCount: 253,
		replyCount: 47
	},
	{
		id: 2,
		category: "AI",
		username: "李四",
		vip: false,
		avatar: "/static/default-avatar.png",
		content: "分享一篇我写的文章，关于如何利用 AI 工具提升工作效率。从代码生成到设计原型，全流程的自动化实践🔥 #AItool #效率 #生产力工具",
		createTime: Date.now() - 7200000,
		viewCount: 8942,
		likeCount: 1876,
		replyCount: 328
	},
	{
		id: 3,
		category: "前端",
		username: "王五",
		vip: true,
		avatar: "/static/default-avatar.png",
		content: "周末看了《星际穿越》，科幻电影中的视觉艺术让人震撼！🎬分享几张截图，大家最喜欢的场景是？ #星际穿越 #影评",
		createTime: Date.now() - 10800000,
		viewCount: 3562,
		likeCount: 671,
		replyCount: 89
	},
	{
		id: 4,
		category: "移动端",
		username: "赵六",
		vip: false,
		avatar: "/static/default-avatar.png",
		content: "Flutter 和 React Native 对比：开发效率 vs 性能表现的深度评测。附代码示例和最佳实践建议📱 #跨平台开发 Flutter RN",
		createTime: Date.now() - 14400000,
		viewCount: 2156,
		likeCount: 432,
		replyCount: 67
	},
	{
		id: 5,
		category: "后端",
		username: "孙七",
		vip: true,
		avatar: "/static/default-avatar.png",
		content: "微服务架构下的分布式事务解决方案：TCC、Saga、本地消息表等模式对比分析，附实际项目案例分享🔧 #微服务 #分布式 #中间件",
		createTime: Date.now() - 18000000,
		viewCount: 5678,
		likeCount: 923,
		replyCount: 156
	},
	{
		id: 6,
		category: "设计",
		username: "周八",
		vip: false,
		avatar: "/static/default-avatar.png",
		content: "分享一套我设计的移动端 UI 组件库，包含 200+ 常用控件。开源地址在评论区🎨 #UI设计 #设计规范 #开源项目",
		createTime: Date.now() - 21600000,
		viewCount: 4321,
		likeCount: 789,
		replyCount: 145
	},
	{
		id: 7,
		category: "职场",
		username: "吴九",
		vip: true,
		avatar: "/static/default-avatar.png",
		content: "从初级工程师到架构师，我走过的路。关于技术选型、团队建设和个人成长的思考💼 #职业发展 #架构师成长路径",
		createTime: Date.now() - 25200000,
		viewCount: 9876,
		likeCount: 1543,
		replyCount: 287
	},
	{
		id: 8,
		category: "闲聊",
		username: "郑十",
		vip: false,
		avatar: "/static/default-avatar.png",
		content: "今天加班到晚上十点，公司楼下的那家深夜食堂味道还是一如既往的好！大家附近哪家店值得推荐？🍜 #深夜食堂 #美食推荐",
		createTime: Date.now() - 28800000,
		viewCount: 1234,
		likeCount: 567,
		replyCount: 92
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
	overflow-y: auto;
}

/* 分类导航 */
.category-nav {
	display: flex;
	justify-content: center;
	padding: 30rpx 0;
}

.category-item-wrapper {
	display: inline-flex;
	position: relative;
	margin-bottom: -12rpx;
}

.category-item {
	display: flex;
	align-items: center;
	min-width: max-content;
	padding: 18rpx 36rpx;
	background-color: #fff;
	border-radius: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(102,126,234,0.15);
	margin: 0 8rpx;
	transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
	position: relative;
	overflow: hidden;
	
	&::before {
		content: '';
		position: absolute;
		left: -20rpx;
		top: 50%;
		transform: translateY(-50%);
		width: 8rpx;
		height: 46rpx;
		background-color: #eee;
		border-radius: 4rpx;
		transition: all 0.3s ease;
	}
	
	&::after {
		content: '';
		position: absolute;
		right: -20rpx;
		top: 50%;
		transform: translateY(-50%);
		width: 8rpx;
		height: 46rpx;
		background-color: #eee;
		border-radius: 4rpx;
		transition: all 0.3s ease;
	}
	
	&.active-border-l::before {
		left: auto;
		right: -20rpx;
		background-color: #667eea;
		width: 0;
		animation: expandBorderL 0.3s ease forwards;
	}
	
	&.active-border-r::after {
		right: auto;
		left: -20rpx;
		background-color: #764ba2;
		width: 0;
		animation: expandBorderR 0.3s ease forwards;
	}
	
	&.active-border-none::before,
	&.active-border-none::after {
		display: none;
	}
	
	&.active {
		transform: scale(1.05);
		box-shadow: 0 8rpx 24rpx rgba(102,126,234,0.3);
		
		.category-icon-img {
			filter: brightness(0) saturate(0) invert(29%) sepia(93%) saturate(5634%) hue-rotate(228deg) brightness(107%) contrast(95%);
		}
		
		.category-name-text,
		.hot-badge {
			color: #fff;
		}
	}

	.category-icon-img {
		width: 36rpx;
		height: 36rpx;
		margin-right: 12rpx;
		border-radius: 8rpx;
	}
	
	.category-name-text {
		font-size: 28rpx;
		font-weight: 500;
		color: #333;
		transition: color 0.3s ease;
		
		&:empty {
			min-width: 48rpx;
		}
	}
	
	.hot-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-left: 6rpx;
		transform: scale(0);
		transition: transform 0.3s cubic-bezier(0.34,1.56,0.6,1);
		
		&.active {
			transform: scale(1);
		}
		
		uni-icons {
			font-size: 12rpx;
		}
	}
}

@keyframes expandBorderL {
	to { width: 46rpx; left: auto; right: -20rpx; }
}

@keyframes expandBorderR {
	to { width: 46rpx; right: auto; left: -20rpx; }
}

/* TAB 切换条 */
.tab-bar {
	position: relative;
	padding: 0 20rpx;
	background-color: #fff;
	margin-top: 8rpx;
	
	.slider-container {
		display: flex;
		align-items: center;
		overflow: hidden;
		height: 68rpx;
		
		.slider-tab {
			flex: 1;
			max-width: calc(33.33% - 20rpx);
			min-height: 56rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			background-color: transparent;
			border-radius: 34rpx 34rpx 0 0;
			margin: 0 -4rpx;
			position: relative;
			transition: all 0.4s cubic-bezier(0.25,1,0.5,1);
			
			&.active-slide-center {
				max-width: calc(100% - 20rpx);
			}
			
			.tab-label {
				font-size: 28rpx;
				font-weight: 600;
				color: #999;
				transition: color 0.4s ease;
			}
			
			&.active {
				background-color: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				
				.tab-label {
					color: #fff;
				}
				
				.active-indicator {
					width: 40rpx;
					box-shadow: 0 -8rpx 20rpx rgba(102,126,234,0.5);
				}
			}
			
			.tab-indicator-wrapper {
				position: absolute;
				bottom: -24rpx;
				left: 50%;
				transform: translateX(-50%) scale(0);
				opacity: 0;
				transition: all 0.4s cubic-bezier(0.34,1.56,0.6,1);
			}
			
			&.active .tab-indicator-wrapper {
				transform: translateX(-50%) scale(1);
				opacity: 1;
				
				.active-indicator {
					width: 32rpx;
				}
			}
		}
	}
	
	.tab-indicator-anim {
		position: absolute;
		height: 56rpx;
		border-radius: 28rpx;
		filter: blur(4rpx);
	}
}

/* 帖子列表滚动区 */
.post-scroll {
	padding-top: 10rpx;
	padding-bottom: 20rpx;
}

/* 帖子卡片 */
.post-item {
	background-color: #fff;
	margin-bottom: 20rpx;
	border-radius: 20rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
	transition: box-shadow 0.3s ease, transform 0.3s ease;
	
	&:active {
		transform: scale(0.98);
	}
	
	.post-card {
		padding: 28rpx 30rpx;
	}
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 160rpx 0;
	
	uni-icons {
		margin-bottom: 28rpx;
		opacity: 0.5;
	}
	
	.empty-text {
		font-size: 32rpx;
		font-weight: 500;
		color: #666;
		margin-bottom: 12rpx;
		text-align: center;
		padding: 0 48rpx;
		line-height: 1.5;
	}
	
	.empty-hint {
		font-size: 26rpx;
		color: #999;
		margin-top: 16rpx;
	}
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
	padding: 0 16rpx;
	gap: 20rpx;

	.post-item, .post-card {
		background-color: #fff;
		border-radius: 20rpx;
		padding: 28rpx 30rpx;
		box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
		
		.post-header {
			display: flex;
			align-items: center;
			margin-bottom: 16rpx;
			
			.avatar-img {
				width: 84rpx;
				height: 84rpx;
				border-radius: 50%;
				background-color: #f0f0f0;
			}
			
			.user-info {
				flex: 1;
				padding-left: 24rpx;
				
				.username {
					font-size: 32rpx;
					color: #333;
					font-weight: 500;
					line-height: 1.4;
					
					&::before {
						content: '@';
						margin-right: 6rpx;
						color: #999;
						font-size: 28rpx;
					}
				}
				
				.vip-tag {
					display: inline-block;
					background-color: linear-gradient(135deg, #f56c6c 0%, #4facfe 100%);
					color: #fff;
					font-size: 20rpx;
					padding: 4rpx 12rpx;
					border-radius: 8rpx;
					margin-top: 8rpx;
					box-shadow: 0 2rpx 6rpx rgba(79,172,254,0.3);
				}
				
				.time {
					font-size: 24rpx;
					color: #bbb;
					margin-top: 6rpx;
				}
				
				.category-badge {
					position: absolute;
					right: 0;
					top: 14rpx;
					
					uni-icons {
						font-size: 14rpx !important;
					}
				}
			}
		}
		
		.post-title {
			font-size: 30rpx;
			font-weight: 600;
			color: #222;
			line-height: 1.5;
			margin-bottom: 16rpx;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		
		.post-content {
			font-size: 28rpx;
			color: #555;
			line-height: 1.9;
			white-space: pre-wrap;
			margin-bottom: 20rpx;
			display: -webkit-box;
			-webkit-line-clamp: 6;
			-webkit-box-orient: vertical;
			overflow: hidden;
			
			.tag {
				background-color: rgba(102,126,234,.08);
				color: #667eea;
				font-size: 24rpx;
				padding: 4rpx 10rpx;
				border-radius: 20rpx;
				vertical-align: middle;
			}
		}
		
		.post-footer {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding-top: 16rpx;
			border-top: 8rpx solid #f5f5f5;
			
			.action-bar {
				display: flex;
				gap: 24rpx;
				
				.action-item {
					display: flex;
					align-items: center;
					font-size: 24rpx;
					color: #999;
					
					uni-icons {
						margin-right: 6rpx;
						font-size: 18rpx;
					}
					
					&.color-red {
						color: #ff5c5c;
						uni-icons {
							color: #ff5c5c;
						}
					}
				}
			}
			
			.post-tags {
				display: flex;
				flex-wrap: wrap;
				gap: 8rpx;
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
