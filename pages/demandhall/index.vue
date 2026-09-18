<template>
	<view class="container app-h5-min-screen">
		<!-- 顶部：板块说明 + 核心双 Tab -->
		<view class="hero">
			<view class="hero-top">
				<view class="hero-title-wrap">
					<text class="hero-title">需求市场</text>
					<text class="hero-subtitle">技能与任务服务 · 求助找帮手 / 提供找活儿</text>
				</view>
				<view class="hero-actions">
					<!-- 个人工作台入口：发布记录、接单记录与收藏统一收在这里 -->
					<view class="workspace-entry" @click="goWorkspace">
						<uni-icons type="person-filled" size="15" color="#1a1a1a"></uni-icons>
						<text class="workspace-entry-text">{{ t('workspace.entry') }}</text>
					</view>
					<view class="hero-stat">
						<text class="hero-stat-num">{{ stats.totalPosts }}</text>
						<text class="hero-stat-label">条信息</text>
					</view>
				</view>
			</view>

			<view class="tab-bar">
				<view
					class="tab-item"
					v-for="tab in tabs"
					:key="tab.key"
					:class="{ active: activeTab === tab.key }"
					@click="switchTab(tab.key)"
				>
					<uni-icons :type="tab.icon" size="15" :color="activeTab === tab.key ? '#1a1a1a' : '#77787d'"></uni-icons>
					<text class="tab-label">{{ tab.label }}</text>
					<text class="tab-count">{{ tab.key === 'demand' ? stats.demandCount : stats.serviceCount }}</text>
				</view>
			</view>
		</view>

		<!-- 搜索 + 下拉筛选 -->
		<view class="filter-bar">
			<view class="search-row">
				<view class="search-box">
					<uni-icons type="search" size="16" color="#b0b0b0"></uni-icons>
					<input
						class="search-input"
						v-model="keyword"
						placeholder="搜索需求、服务、标签关键词"
						confirm-type="search"
						@confirm="onSearchConfirm"
					/>
					<uni-icons v-if="keyword" type="clear" size="16" color="#c0c0c0" @click="clearKeyword"></uni-icons>
				</view>
				<view class="search-btn" @click="onSearchConfirm">搜索</view>
			</view>

			<view class="dropdown-row">
				<view
					class="dropdown-trigger"
					v-for="group in filterGroups"
					:key="group.key"
					:class="{ active: openFilter === group.key, picked: group.picked }"
					@click="toggleFilter(group.key)"
				>
					<text class="dropdown-text">{{ group.label }}</text>
					<uni-icons :type="openFilter === group.key ? 'up' : 'down'" size="12" :color="openFilter === group.key || group.picked ? '#1a1a1a' : '#999999'"></uni-icons>
				</view>
				<view class="dropdown-reset" v-if="hasActiveFilter" @click="resetFilters">重置</view>
			</view>

			<!-- 下拉面板：分类（一级分类白名单） -->
			<view class="filter-panel" v-if="openFilter === 'category'">
				<view class="panel-chips">
					<text
						class="panel-chip"
						v-for="item in categoryOptions"
						:key="item"
						:class="{ active: selectedCategory === item }"
						@click="selectCategory(item)"
					>{{ item }}</text>
				</view>
			</view>

			<!-- 下拉面板：位置 -->
			<view class="filter-panel" v-else-if="openFilter === 'location'">
				<view class="panel-chips">
					<text
						class="panel-chip"
						v-for="item in locationOptions"
						:key="item.value"
						:class="{ active: locationType === item.value }"
						@click="selectLocation(item.value)"
					>{{ item.label }}</text>
				</view>
			</view>

			<!-- 下拉面板：排序 -->
			<view class="filter-panel" v-else-if="openFilter === 'sort'">
				<view class="panel-chips">
					<text
						class="panel-chip"
						v-for="item in sortOptions"
						:key="item.value"
						:class="{ active: sort === item.value }"
						@click="selectSort(item.value)"
					>{{ item.label }}</text>
				</view>
				<text class="panel-hint">选择「距离最近」需要授权定位，按线下区域的远近排序。</text>
			</view>
		</view>

		<!-- 信息流 -->
		<scroll-view
			scroll-y
			class="content-scroll"
			refresher-enabled
			:refresher-triggered="refreshing"
			refresher-background="#ffffff"
			lower-threshold="120"
			@refresherrefresh="onRefresh"
			@scrolltolower="onLoadMore"
		>
			<!-- 标签化聚类：点击标签快速筛选 -->
			<view class="tag-strip" v-if="hotTags.length">
				<text class="tag-chip" :class="{ active: selectedTag === '' }" @click="selectTag('')">全部</text>
				<text
					class="tag-chip"
					v-for="tag in hotTags"
					:key="tag"
					:class="{ active: selectedTag === tag }"
					@click="selectTag(tag)"
				>#{{ tag }}</text>
			</view>

			<!-- 骨架屏 -->
			<view class="card-list" v-if="loading">
				<view class="skeleton-card" v-for="i in 3" :key="i">
					<view class="skeleton-line wide"></view>
					<view class="skeleton-line"></view>
					<view class="skeleton-line short"></view>
					<view class="skeleton-actions">
						<view class="skeleton-pill"></view>
						<view class="skeleton-pill"></view>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-state" v-else-if="posts.length === 0">
				<uni-icons type="help-filled" size="96" color="#e5e5e5"></uni-icons>
				<text class="empty-title">{{ currentTab.emptyText }}</text>
				<text class="empty-hint">换个分类、标签或关键词，也可以直接点右下角发布你的信息</text>
				<view class="empty-reset" @click="resetFilters">重置筛选</view>
			</view>

			<!-- 卡片列表：需求卡与 服务卡 视觉区分 -->
			<view class="card-list" v-else>
				<view
					class="card"
					:class="post.type === 'demand' ? 'demand-card' : 'service-card'"
					v-for="post in posts"
					:key="post.id"
					@click="goDetail(post)"
				>
					<!-- 需求卡：突出任务与赏金 -->
					<template v-if="post.type === 'demand'">
						<view class="card-head">
							<text class="card-title">{{ post.title }}</text>
							<view class="price-tag" :class="{ negotiable: post.isNegotiable }">
								<text class="price-text">{{ formatPriceLabel(post) }}</text>
							</view>
						</view>
						<text class="card-desc">{{ post.description }}</text>
					</template>

					<!-- 服务卡：突出人与专业度 -->
					<template v-else>
						<view class="service-head">
							<image class="service-avatar" :src="avatarOf(post)" mode="aspectFill"></image>
							<view class="service-info">
								<view class="service-name-row">
									<text class="service-name">{{ post.author.name }}</text>
									<text class="verify-badge" v-if="post.requireVerified">V 已认证</text>
								</view>
								<text class="service-reputation">已接 {{ post.applyCount }} 单 · {{ post.viewCount }} 次浏览 · ⭐ 好评服务者</text>
							</view>
							<view class="price-tag service-price">
								<text class="price-text">{{ formatPriceLabel(post) }}</text>
							</view>
						</view>
						<text class="card-title service-title">{{ post.title }}</text>
						<text class="card-desc">{{ post.description }}</text>
					</template>

					<view class="badge-row">
						<text
							class="badge"
							v-for="badge in buildCardBadges(post)"
							:key="badge.text"
							:class="`badge-${badge.tone}`"
							@click.stop="onBadgeClick(badge)"
						>{{ badge.tone === 'tag' ? '#' + badge.text : badge.text }}</text>
					</view>

					<view class="card-meta">
						<text class="meta-author" v-if="post.type === 'service'">{{ formatRelativeTime(post.createdAt) }}发布</text>
						<text class="meta-author" v-else>发布者 {{ post.author.name }}</text>
						<text class="meta-divider">·</text>
						<text class="meta-deadline" v-if="post.type === 'demand' && post.deadline" :class="{ expired: post.deadline.expired }">
							{{ formatDeadlineText(post.deadline) }}
						</text>
						<text class="meta-distance" v-if="post.distanceKm != null">{{ formatDistanceText(post.distanceKm) }}</text>
						<text class="meta-plain" v-if="!post.deadline && post.distanceKm == null">{{ formatRelativeTime(post.createdAt) }}发布</text>
						<text class="meta-apply">已有 {{ post.applyCount }} 人{{ post.type === 'demand' ? '报名' : '接单' }}</text>
					</view>

					<view class="card-actions">
						<view class="action-btn ghost" @click.stop="toggleCollect(post)">
							<uni-icons :type="post.isCollected ? 'star-filled' : 'star'" size="15" :color="post.isCollected ? '#1a1a1a' : '#999999'"></uni-icons>
							<text>{{ post.isCollected ? '已收藏' : '收藏' }}</text>
						</view>
						<view class="action-btn ghost" @click.stop="contact(post)">
							<uni-icons type="chat" size="15" color="#999999"></uni-icons>
							<text>立即沟通</text>
						</view>
						<view
							class="action-btn primary"
							:class="{ done: isActionDone(post) }"
							@click.stop="post.isOwner ? goDetail(post) : openApply(post)"
						>
							<text>{{ postActionText(post) }}</text>
						</view>
					</view>
				</view>

				<view class="list-footer" v-if="loadingMore">
					<uni-icons type="spinner-cycle" size="14" color="#b8bdc9"></uni-icons>
					<text>正在加载更多...</text>
				</view>
				<view class="list-footer" v-else-if="!hasMore">— 已经到底啦 —</view>
			</view>

			<view class="scroll-spacer"></view>
		</scroll-view>

		<!-- 悬浮发布按钮 -->
		<view class="fab" @click="openPublishEntry">
			<uni-icons type="plusempty" size="22" color="#1a1a1a"></uni-icons>
			<text class="fab-text">发布</text>
		</view>

		<!-- 发布入口抽屉 -->
		<view class="sheet-mask app-h5-sheet-mask" v-if="showEntrySheet" @click="showEntrySheet = false">
			<view class="sheet app-h5-sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">发布到需求市场</text>
					<text class="sheet-close" @click="showEntrySheet = false">关闭</text>
				</view>
				<view class="entry-list">
					<view class="entry-item demand" @click="openPublishForm('demand')">
						<view class="entry-icon">
							<uni-icons type="help-filled" size="22" color="#1a1a1a"></uni-icons>
						</view>
						<view class="entry-body">
							<text class="entry-title">发布需求（带赏金）</text>
							<text class="entry-desc">我需要什么：翻译、跑腿、专业技能、生活求助，标注预算与截止时间</text>
						</view>
						<uni-icons type="right" size="16" color="#c0c0c0"></uni-icons>
					</view>
					<view class="entry-item service" @click="openPublishForm('service')">
						<view class="entry-icon">
							<uni-icons type="staff-filled" size="22" color="#1a1a1a"></uni-icons>
						</view>
						<view class="entry-body">
							<text class="entry-title">发布服务（带标价）</text>
							<text class="entry-desc">我能干什么：展示能力与报价，按次 / 小时 / 天计价，等待他人下单</text>
						</view>
						<uni-icons type="right" size="16" color="#c0c0c0"></uni-icons>
					</view>
				</view>
			</view>
		</view>

		<!-- 发布表单抽屉 -->
		<view class="sheet-mask app-h5-sheet-mask" v-if="showPublishForm" @click="closePublishForm">
			<view class="sheet publish-sheet app-h5-sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-cancel" @click="closePublishForm">取消</text>
					<text class="sheet-title">{{ form.type === 'demand' ? '发布需求' : '发布服务' }}</text>
					<text class="sheet-submit" :class="{ disabled: submitting }" @click="submitPublish">{{ submitting ? '发布中...' : '发布' }}</text>
				</view>

				<scroll-view scroll-y class="sheet-body">
					<view class="form-block">
						<text class="form-label">{{ form.type === 'demand' ? '一句话说清你要什么' : '一句话说清你能提供什么' }}<text class="required">*</text></text>
						<input class="form-input" v-model="form.title" maxlength="120" :placeholder="form.type === 'demand' ? '例：急求一份菲律宾当地的租房合同翻译' : '例：提供各语种简历精修服务'" />
					</view>

					<view class="form-block">
						<text class="form-label">详细描述<text class="required">*</text></text>
						<textarea
							class="form-textarea"
							v-model="form.description"
							maxlength="2000"
							auto-height
							:placeholder="form.type === 'demand' ? '说明背景、交付要求与时间节点，减少来回沟通' : '说明你的经验、服务范围与交付方式'"
						></textarea>
						<text class="form-counter">{{ form.description.length }}/2000</text>
					</view>

					<view class="form-block">
						<text class="form-label">一级分类（必选 1-2 个）<text class="required">*</text></text>
						<view class="form-chips">
							<text
								class="form-chip"
								v-for="item in categoryOptions"
								:key="item"
								:class="{ active: form.categories.includes(item) }"
								@click="toggleFormCategory(item)"
							>{{ item }}</text>
						</view>
						<text class="form-hint">第一个分类会作为筛选入口，第二个分类同时作为标签参与聚类。</text>
					</view>

					<view class="form-block">
						<text class="form-label">自定义标签（最多 5 个）</text>
						<view class="form-chips">
							<text
								class="form-chip active"
								v-for="tag in form.tags"
								:key="tag"
								@click="removeFormTag(tag)"
							>#{{ tag }} ✕</text>
						</view>
						<view class="form-inline">
							<input
								class="form-input inline"
								v-model="tagDraft"
								maxlength="30"
								placeholder="输入标签后点添加，例如：急单"
								confirm-type="done"
								@confirm="addFormTag"
							/>
							<view class="inline-btn" @click="addFormTag">添加</view>
						</view>
						<view class="form-chips" v-if="hotTags.length">
							<text
								class="form-chip soft"
								v-for="tag in hotTags.slice(0, 6)"
								:key="tag"
								@click="addFormTag(tag)"
							>#{{ tag }}</text>
						</view>
					</view>

					<view class="form-block">
						<text class="form-label">{{ form.type === 'demand' ? '赏金预算' : '接单报价' }}</text>
						<view class="form-inline">
							<input class="form-input inline" v-model="form.price" type="digit" placeholder="留空表示议价" :disabled="form.isNegotiable" />
							<picker class="form-picker" :range="priceUnitLabels" :value="priceUnitIndex" @change="onPriceUnitChange">
								<view class="picker-value">{{ priceUnitLabels[priceUnitIndex] }}<uni-icons type="down" size="12" color="#999999"></uni-icons></view>
							</picker>
						</view>
						<view class="form-switch-row" @click="form.isNegotiable = !form.isNegotiable">
							<text class="switch-label">价格可议</text>
							<switch :checked="form.isNegotiable" color="#ffce00" style="transform: scale(0.7)" />
						</view>
					</view>

					<view class="form-block">
						<text class="form-label">服务方式<text class="required">*</text></text>
						<view class="form-chips">
							<text class="form-chip" :class="{ active: form.locationType === 'online' }" @click="form.locationType = 'online'">线上远程</text>
							<text class="form-chip" :class="{ active: form.locationType === 'offline' }" @click="form.locationType = 'offline'">线下区域</text>
						</view>
						<input
							v-if="form.locationType === 'offline'"
							class="form-input"
							v-model="form.locationText"
							maxlength="120"
							placeholder="填写线下区域，例如：马尼拉 BGC / 深圳 南山区"
						/>
					</view>

					<view class="form-block" v-if="form.type === 'demand'">
						<text class="form-label">期望完成时间</text>
						<picker mode="date" :value="form.deadlineAt" :start="todayString" @change="onDeadlineChange">
							<view class="picker-value wide">{{ form.deadlineAt || '不设置截止时间' }}<uni-icons type="calendar" size="13" color="#999999"></uni-icons></view>
						</picker>
						<text class="form-hint">设置后会显示「距离结束还有 N 天」，帮助接单方判断优先级。</text>
					</view>

					<view class="form-block">
						<view class="form-switch-row" @click="form.isUrgent = !form.isUrgent">
							<view class="switch-copy">
								<text class="switch-label">标记为急单</text>
								<text class="switch-hint">急单会显示醒目标签，优先被看到</text>
							</view>
							<switch :checked="form.isUrgent" color="#ffce00" style="transform: scale(0.7)" />
						</view>
						<view class="form-switch-row" @click="form.requireVerified = !form.requireVerified">
							<view class="switch-copy">
								<text class="switch-label">需要认证服务者</text>
								<text class="switch-hint">勾选后卡片会展示「需认证」，提示对方资质</text>
							</view>
							<switch :checked="form.requireVerified" color="#ffce00" style="transform: scale(0.7)" />
						</view>
					</view>

					<view class="form-notice">
						<uni-icons type="info" size="14" color="#999999"></uni-icons>
						<text>建议通过平台担保交易完成付款：买家付款到平台托管 → 卖家交付 → 买家确认 → 资金结算给卖家。</text>
					</view>
					<view class="sheet-spacer"></view>
				</scroll-view>
			</view>
		</view>

		<!-- 报名 / 接单弹窗 -->
		<view class="sheet-mask app-h5-sheet-mask" v-if="applyTarget" @click="closeApply">
			<view class="sheet apply-sheet app-h5-sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-cancel" @click="closeApply">取消</text>
					<text class="sheet-title">{{ applyTarget.type === 'demand' ? '报名接单' : '下单预约' }}</text>
					<text class="sheet-submit" :class="{ disabled: applySubmitting }" @click="submitApply">{{ applySubmitting ? '提交中...' : '提交' }}</text>
				</view>
				<view class="sheet-body static">
					<text class="apply-title">{{ applyTarget.title }}</text>
					<view class="form-block">
						<text class="form-label">{{ applyTarget.type === 'demand' ? '报名说明' : '预约说明' }}<text class="required">*</text></text>
						<textarea class="form-textarea" v-model="applyMessage" maxlength="500" auto-height placeholder="说明你的经验、可交付时间或具体需求"></textarea>
						<text class="form-counter">{{ applyMessage.length }}/500</text>
					</view>
					<view class="form-block">
						<text class="form-label">{{ applyTarget.type === 'demand' ? '我的报价（可选）' : '预算金额（可选）' }}</text>
						<input class="form-input" v-model="applyQuote" type="digit" :placeholder="applyTarget.price ? `参考发布者价格 ${formatPriceLabel(applyTarget)}` : '留空表示按发布者价格'" />
					</view>
					<view class="form-notice">
						<uni-icons type="info" size="14" color="#999999"></uni-icons>
						<text>提交后发布者会收到通知，选定后可发起担保交易。</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
	getDemandHallPostsApi,
	getDemandHallHotTagsApi,
	getDemandHallStatsApi,
	createDemandHallPostApi,
	toggleDemandHallCollectApi,
	createDemandHallApplicationApi
} from '@/api/demandHall.js'
import { createChatRequestApi, getChatRequestStatusApi } from '@/api/chat.js'
import { t } from '@/utils/localeRuntime.js'
import {
	DEMAND_HALL_TABS,
	SORT_OPTIONS,
	LOCATION_OPTIONS,
	PRICE_UNIT_OPTIONS,
	DEFAULT_CATEGORIES,
	tabDefinition,
	formatPriceLabel,
	formatDeadlineText,
	formatRelativeTime,
	formatDistanceText,
	buildCardBadges,
	buildListParams,
	buildPublishDefaults,
	validatePublishForm,
	postActionText,
	canApplyToPost
} from '@/utils/demandHallPresentation.js'

const PAGE_SIZE = 10
const tabs = DEMAND_HALL_TABS
const sortOptions = SORT_OPTIONS
const locationOptions = LOCATION_OPTIONS
const priceUnitOptions = PRICE_UNIT_OPTIONS
const priceUnitLabels = PRICE_UNIT_OPTIONS.map(item => item.label)

/* ============ 列表状态 ============ */
const activeTab = ref('demand')
const keyword = ref('')
const selectedCategory = ref('全部')
const selectedTag = ref('')
const sort = ref('latest')
const locationType = ref('all')
const openFilter = ref('')
const coords = ref(null)

const posts = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const currentPage = ref(0)

const stats = ref({ totalPosts: 0, demandCount: 0, serviceCount: 0, applicationCount: 0, categoryCounts: {} })
const hotTags = ref([])
const remoteCategories = ref([])

const currentTab = computed(() => tabDefinition(activeTab.value))
// 后端返回的分类白名单优先，接口异常时用内置默认值兜底，保证筛选栏始终可用。
const categoryOptions = computed(() => {
	const list = remoteCategories.value.length ? remoteCategories.value : DEFAULT_CATEGORIES
	return ['全部', ...list]
})
const hasActiveFilter = computed(() => selectedCategory.value !== '全部' || selectedTag.value !== '' || locationType.value !== 'all' || sort.value !== 'latest' || !!keyword.value.trim())
const filterGroups = computed(() => [
	{ key: 'category', label: selectedCategory.value === '全部' ? '分类' : selectedCategory.value, picked: selectedCategory.value !== '全部' },
	{ key: 'location', label: locationType.value === 'all' ? '位置' : (locationOptions.find(item => item.value === locationType.value)?.label || '位置'), picked: locationType.value !== 'all' },
	{ key: 'sort', label: sortOptions.find(item => item.value === sort.value)?.label || '排序', picked: sort.value !== 'latest' }
])

function avatarOf(post) {
	if (post.author?.avatar) return post.author.avatar
	return `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(post.author?.name || 'user')}`
}

function isActionDone(post) {
	return !!post.isOwner || !!post.hasApplied || post.status === 'closed'
}

/* ============ 数据加载 ============ */
async function loadPosts({ reset = false } = {}) {
	const page = reset ? 1 : currentPage.value + 1
	if (!reset && !hasMore.value) return
	if (!reset) loadingMore.value = true
	try {
		const data = await getDemandHallPostsApi(buildListParams({
			tab: activeTab.value,
			category: selectedCategory.value,
			tag: selectedTag.value,
			keyword: keyword.value,
			sort: sort.value,
			locationType: locationType.value,
			coords: coords.value,
			page,
			pageSize: PAGE_SIZE
		}))
		const list = Array.isArray(data?.posts) ? data.posts : []
		posts.value = reset ? list : [...posts.value, ...list]
		hasMore.value = !!data?.hasMore
		currentPage.value = page
	} catch (error) {
		// 请求层已提示错误；首屏失败时清空列表避免展示陈旧数据。
		if (reset) {
			posts.value = []
			hasMore.value = false
		}
	} finally {
		loading.value = false
		loadingMore.value = false
		refreshing.value = false
	}
}

function reloadList() {
	currentPage.value = 0
	hasMore.value = true
	return loadPosts({ reset: true })
}

async function loadSideData() {
	try {
		const [tagData, statData] = await Promise.all([getDemandHallHotTagsApi({ limit: 10 }), getDemandHallStatsApi()])
		hotTags.value = Array.isArray(tagData?.tags) ? tagData.tags.filter(Boolean) : []
		remoteCategories.value = Array.isArray(tagData?.categories) ? tagData.categories.filter(Boolean) : []
		stats.value = { ...stats.value, ...(statData || {}) }
	} catch (error) {
		remoteCategories.value = []
	}
}

function onRefresh() {
	refreshing.value = true
	void loadSideData()
	void reloadList()
}

function onLoadMore() {
	void loadPosts()
}

/* ============ 筛选交互 ============ */
function toggleFilter(key) {
	openFilter.value = openFilter.value === key ? '' : key
}

function closeFilter() {
	openFilter.value = ''
}

function switchTab(key) {
	if (activeTab.value === key) return
	activeTab.value = key
	closeFilter()
	reloadList()
	uni.vibrateShort?.({ fail: () => {} })
}

function selectCategory(value) {
	selectedCategory.value = value
	closeFilter()
	reloadList()
}

function selectLocation(value) {
	locationType.value = value
	closeFilter()
	reloadList()
}

function selectTag(tag) {
	const next = selectedTag.value === tag ? '' : tag
	selectedTag.value = next
	reloadList()
}

/** 只有自定义标签可以被点击聚类，属性标签（急单 / 线上完成等）不参与筛选。 */
function onBadgeClick(badge) {
	if (badge?.tone === 'tag') selectTag(badge.text)
}

/** 「距离最近」需要坐标；定位失败时退回最新排序，避免给出错误的排序结果。 */
function ensureCoords() {
	if (coords.value) return Promise.resolve(coords.value)
	return new Promise(resolve => {
		uni.getLocation({
			type: 'gcj02',
			success: result => {
				coords.value = { latitude: result.latitude, longitude: result.longitude }
				resolve(coords.value)
			},
			fail: () => resolve(null)
		})
	})
}

async function selectSort(value) {
	if (value === 'distance') {
		const position = await ensureCoords()
		if (!position) {
			sort.value = 'latest'
			closeFilter()
			uni.showToast({ title: '未获取到定位，已按最新发布排序', icon: 'none' })
			reloadList()
			return
		}
	}
	sort.value = value
	closeFilter()
	reloadList()
}

function onSearchConfirm() {
	closeFilter()
	reloadList()
}

function clearKeyword() {
	keyword.value = ''
	reloadList()
}

function resetFilters() {
	keyword.value = ''
	selectedCategory.value = '全部'
	selectedTag.value = ''
	locationType.value = 'all'
	sort.value = 'latest'
	closeFilter()
	reloadList()
}

/* ============ 收藏 / 报名 ============ */
async function toggleCollect(post) {
	const previous = post.isCollected
	post.isCollected = !previous
	post.collectCount = Math.max(0, Number(post.collectCount || 0) + (post.isCollected ? 1 : -1))
	try {
		const result = await toggleDemandHallCollectApi(post.id)
		post.isCollected = !!result?.isCollected
		post.collectCount = Number(result?.collectCount ?? post.collectCount)
	} catch (error) {
		post.isCollected = previous
		post.collectCount = Math.max(0, Number(post.collectCount || 0) + (previous ? 1 : -1))
	}
}

const applyTarget = ref(null)
const applyMessage = ref('')
const applyQuote = ref('')
const applySubmitting = ref(false)

function openApply(post) {
	const blocked = canApplyToPost(post)
	if (blocked) {
		uni.showToast({ title: blocked, icon: 'none' })
		return
	}
	applyTarget.value = post
	applyMessage.value = ''
	applyQuote.value = post.price != null ? String(post.price) : ''
}

function closeApply() {
	applyTarget.value = null
	applySubmitting.value = false
}

async function submitApply() {
	const post = applyTarget.value
	if (!post || applySubmitting.value) return
	if (!applyMessage.value.trim()) {
		uni.showToast({ title: '请填写说明', icon: 'none' })
		return
	}
	applySubmitting.value = true
	try {
		await createDemandHallApplicationApi(post.id, {
			message: applyMessage.value.trim(),
			quoteAmount: applyQuote.value === '' ? null : applyQuote.value
		})
		post.hasApplied = true
		post.myApplicationStatus = 'pending'
		post.applyCount = Number(post.applyCount || 0) + 1
		uni.showToast({ title: '已提交，等待发布者处理', icon: 'success' })
		closeApply()
	} catch (error) {
		applySubmitting.value = false
	}
}

/* ============ 立即沟通（接入应用内 IM） ============ */
function buildContactMessage(post) {
	const link = `pages/demandhall/detail?id=${post.id}`
	return `你好，我在需求市场看到「${post.title}」，想和你沟通一下。\n信息卡：${link}`
}

async function contact(post) {
	const currentUserId = Number(uni.getStorageSync('USER_INFO')?.id)
	if (currentUserId && Number(post.userId) === currentUserId) {
		uni.showToast({ title: '这是你发布的内容', icon: 'none' })
		return
	}
	try {
		const status = await getChatRequestStatusApi(post.userId)
		if (status?.status === 'approved' && status.groupId) {
			uni.navigateTo({ url: `/pages/chat/chatRoom?id=${status.groupId}` })
			return
		}
		if (status?.status === 'pending' || status?.status === 'processing') {
			uni.showToast({ title: '私聊申请审核中，请稍候', icon: 'none' })
			return
		}
		uni.showModal({
			title: '申请私聊',
			editable: true,
			placeholderText: '说明来意，通过后即可聊天',
			content: buildContactMessage(post),
			cancelText: '取消',
			confirmText: '发送申请',
			success: async ({ confirm, content }) => {
				if (!confirm) return
				try {
					await createChatRequestApi({ targetUserId: post.userId, message: (content || buildContactMessage(post)).slice(0, 500) })
					uni.showToast({ title: '申请已提交，审核通过后可聊天', icon: 'success' })
				} catch (error) { /* 请求层已提示 */ }
			}
		})
	} catch (error) { /* 请求层已提示 */ }
}

function goDetail(post) {
	uni.navigateTo({ url: `/pages/demandhall/detail?id=${post.id}` })
}

/** 进入个人工作台；带上当前 Tab 让「去发现」返回时落在同一分类。 */
function goWorkspace() {
	uni.navigateTo({ url: `/pages/demandhall/workspace?tab=posts` })
}

/* ============ 发布 ============ */
const showEntrySheet = ref(false)
const showPublishForm = ref(false)
const submitting = ref(false)
const tagDraft = ref('')
const form = ref(buildPublishDefaults('demand'))
const priceUnitIndex = computed(() => Math.max(0, priceUnitOptions.findIndex(item => item.value === form.value.priceUnit)))
const todayString = computed(() => {
	const now = new Date()
	const pad = value => String(value).padStart(2, '0')
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
})

function openPublishEntry() {
	openFilter.value = ''
	showEntrySheet.value = true
}

function openPublishForm(type) {
	showEntrySheet.value = false
	form.value = buildPublishDefaults(type)
	tagDraft.value = ''
	// 一级分类必选，默认预填当前筛选分类（没有筛选时取第一个分类），减少操作步骤。
	const preset = selectedCategory.value !== '全部' ? selectedCategory.value : (categoryOptions.value[1] || DEFAULT_CATEGORIES[0])
	form.value.categories = [preset]
	showPublishForm.value = true
}

function closePublishForm() {
	showPublishForm.value = false
	submitting.value = false
}

function toggleFormCategory(category) {
	const list = form.value.categories
	if (list.includes(category)) {
		form.value.categories = list.filter(item => item !== category)
		return
	}
	// 产品约束：1-2 个一级分类，超出时替换掉最早选择的一个。
	if (list.length >= 2) form.value.categories = [list[1], category]
	else form.value.categories = [...list, category]
}

function addFormTag(tag) {
	// 输入框 @confirm 与按钮 @click 都会传入事件对象，这里只接受字符串来源。
	const raw = typeof tag === 'string' ? tag : tagDraft.value
	const value = String(raw || '').trim().replace(/^#+/, '')
	tagDraft.value = ''
	if (!value) return
	if (form.value.tags.includes(value)) return
	if (form.value.tags.length >= 5) {
		uni.showToast({ title: '最多 5 个标签', icon: 'none' })
		return
	}
	form.value.tags = [...form.value.tags, value]
}

function removeFormTag(tag) {
	form.value.tags = form.value.tags.filter(item => item !== tag)
}

function onPriceUnitChange(event) {
	form.value.priceUnit = priceUnitOptions[Number(event.detail.value)]?.value || 'total'
}

function onDeadlineChange(event) {
	form.value.deadlineAt = event.detail.value
}

async function submitPublish() {
	if (submitting.value) return
	const current = form.value
	const error = validatePublishForm(current)
	if (error) {
		uni.showToast({ title: error, icon: 'none' })
		return
	}
	submitting.value = true
	try {
		await createDemandHallPostApi({
			type: current.type,
			title: current.title.trim(),
			description: current.description.trim(),
			categories: current.categories,
			tags: current.tags,
			price: current.isNegotiable || current.price === '' ? null : current.price,
			priceUnit: current.priceUnit,
			isNegotiable: current.isNegotiable || current.price === '',
			locationType: current.locationType,
			locationText: current.locationText.trim(),
			deadlineAt: current.type === 'demand' && current.deadlineAt ? new Date(`${current.deadlineAt}T23:59:59`).getTime() : null,
			isUrgent: current.isUrgent,
			requireVerified: current.requireVerified
		})
		const publishedType = current.type
		closePublishForm()
		uni.showToast({ title: '发布成功', icon: 'success' })
		if (activeTab.value !== publishedType) activeTab.value = publishedType
		void loadSideData()
		reloadList()
	} catch (error) {
		submitting.value = false
	}
}

onLoad(options => {
	if (options?.tab === 'service' || options?.tab === 'demand') activeTab.value = options.tab
	void loadSideData()
	void loadPosts({ reset: true })
	// 工作台的「发布」入口带 compose=1 过来，落地即打开发布抽屉，少一次点击。
	if (options?.compose) setTimeout(() => { showEntrySheet.value = true }, 300)
})

onShow(() => {
	// 从详情页返回时同步报名 / 收藏的最新状态，避免卡片展示过期数据。
	if (currentPage.value > 0) {
		void loadSideData()
		void reloadList()
	}
})
</script>

<style scoped lang="scss">
// 与首页 index360 统一的品牌色板
$brand-yellow: #ffce00;
$bg-color: #ffffff;
$text-main: #1a1a1a;
$text-sub: #999999;
$gray-bg: #f5f6f8;
$line-color: #f2f2f4;

.container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $bg-color;
	position: relative;
}

/* ============ 顶部标题 + 双 Tab（白底导航风格） ============ */
.hero {
	flex-shrink: 0;
	padding: 20rpx 30rpx 0;
	background: $bg-color;
}

.hero-top {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
}

.hero-title-wrap {
	flex: 1;
	min-width: 0;
}

.hero-title {
	display: block;
	font-size: 40rpx;
	font-weight: bold;
	color: $text-main;
	letter-spacing: 1rpx;
}

.hero-subtitle {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: $text-sub;
}

.hero-stat {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	padding-top: 6rpx;
}

.hero-actions {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 12rpx;
	flex-shrink: 0;
}

/* 个人工作台入口：与品牌黄一致的可点击胶囊 */
.workspace-entry {
	display: flex;
	align-items: center;
	gap: 8rpx;
	height: 60rpx;
	padding: 0 24rpx;
	border-radius: 30rpx;
	background: $brand-yellow;
	box-shadow: 0 4rpx 12rpx rgba(255, 206, 0, 0.35);
	transition: transform 160ms ease-out;

	&:active {
		transform: scale(0.96);
	}
}

.workspace-entry-text {
	font-size: 24rpx;
	font-weight: bold;
	color: $text-main;
}

.hero-stat-num {
	font-size: 32rpx;
	font-weight: bold;
	color: $text-main;
}

.hero-stat-label {
	font-size: 20rpx;
	color: $text-sub;
}

.tab-bar {
	display: flex;
	gap: 4rpx;
	margin-top: 24rpx;
	padding: 4rpx;
	border-radius: 24rpx;
	background: #e9e9ec;
}

.tab-item {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	height: 70rpx;
	border-radius: 20rpx;
	transition: background 0.2s;

	&.active {
		background: $brand-yellow;
		box-shadow: 0 4rpx 12rpx rgba(255, 206, 0, 0.35);

		.tab-label {
			color: $text-main;
			font-weight: bold;
		}

		.tab-count {
			background: rgba(26, 26, 26, 0.12);
			color: $text-main;
		}
	}
}

.tab-label {
	font-size: 27rpx;
	color: #77787d;
	font-weight: 600;
}

.tab-count {
	min-width: 42rpx;
	height: 34rpx;
	padding: 0 10rpx;
	border-radius: 17rpx;
	background: rgba(26, 26, 26, 0.06);
	color: #77787d;
	font-size: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* ============ 搜索与筛选 ============ */
.filter-bar {
	flex-shrink: 0;
	padding: 18rpx 30rpx 14rpx;
	background: $bg-color;
}

.search-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.search-box {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 12rpx;
	height: 72rpx;
	padding: 0 26rpx;
	border-radius: 36rpx;
	background: $gray-bg;
}

.search-input {
	flex: 1;
	font-size: 27rpx;
	color: $text-main;
}

.search-btn {
	padding: 0 32rpx;
	height: 72rpx;
	line-height: 72rpx;
	border-radius: 36rpx;
	background: $brand-yellow;
	color: $text-main;
	font-size: 26rpx;
	font-weight: bold;
}

.dropdown-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-top: 16rpx;
}

.dropdown-trigger {
	display: flex;
	align-items: center;
	gap: 8rpx;
	height: 60rpx;
	padding: 0 24rpx;
	border-radius: 30rpx;
	background: $gray-bg;
	max-width: 300rpx;

	&.active,
	&.picked {
		background: $brand-yellow;
	}
}

.dropdown-text {
	font-size: 24rpx;
	color: #666666;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;

	.active &,
	.picked & {
		color: $text-main;
		font-weight: 600;
	}
}

.dropdown-reset {
	margin-left: auto;
	font-size: 24rpx;
	color: $text-sub;
}

.filter-panel {
	margin-top: 16rpx;
	padding: 20rpx;
	border-radius: 18rpx;
	background: $gray-bg;
}

.panel-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
}

.panel-chip {
	padding: 12rpx 28rpx;
	border-radius: 30rpx;
	background: #fff;
	font-size: 24rpx;
	color: #666666;

	&.active {
		background: $brand-yellow;
		color: $text-main;
		font-weight: 600;
	}
}

.panel-hint {
	display: block;
	margin-top: 14rpx;
	font-size: 21rpx;
	color: $text-sub;
}

/* ============ 信息流 ============ */
.content-scroll {
	flex: 1;
	overflow: hidden;
}

.tag-strip {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
	padding: 4rpx 30rpx 6rpx;
}

.tag-chip {
	padding: 10rpx 24rpx;
	border-radius: 28rpx;
	background: $gray-bg;
	font-size: 22rpx;
	color: #666666;

	&.active {
		background: $brand-yellow;
		color: $text-main;
		font-weight: 600;
	}
}

.card-list {
	padding: 18rpx 30rpx 0;
}

.card {
	background: #fff;
	border-radius: 20rpx;
	padding: 26rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.05);
	border-left: 8rpx solid $brand-yellow;
}

/* 需求卡 / 服务卡共用同一视觉语言，仅用左侧色条区分语义 */
.demand-card {
	border-left-color: $brand-yellow;
}

.service-card {
	border-left-color: #1a1a1a;
}

.card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.card-title {
	flex: 1;
	font-size: 30rpx;
	font-weight: bold;
	color: $text-main;
	line-height: 1.42;
}

.service-title {
	display: block;
	margin-top: 18rpx;
}

.card-desc {
	margin-top: 12rpx;
	font-size: 25rpx;
	color: #666666;
	line-height: 1.55;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
}

.price-tag {
	display: flex;
	align-items: center;
	gap: 6rpx;
	flex-shrink: 0;
	padding: 8rpx 20rpx;
	border-radius: 24rpx;
	background: $brand-yellow;
	color: $text-main;

	&.negotiable {
		background: $gray-bg;
		color: #666666;
	}
}

.service-price {
	background: $brand-yellow;
	color: $text-main;
}

.price-text {
	font-size: 28rpx;
	font-weight: bold;
}

.service-head {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.service-avatar {
	width: 70rpx;
	height: 70rpx;
	border-radius: 50%;
	background: #e8e8e8;
	flex-shrink: 0;
}

.service-info {
	flex: 1;
	min-width: 0;
}

.service-name-row {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.service-name {
	font-size: 30rpx;
	font-weight: bold;
	color: $text-main;
}

.verify-badge {
	padding: 2rpx 12rpx;
	border-radius: 10rpx;
	background: $brand-yellow;
	color: $text-main;
	font-size: 19rpx;
	font-weight: 600;
}

.service-reputation {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: $text-sub;
}

.badge-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 18rpx;
}

.badge {
	padding: 6rpx 18rpx;
	border-radius: 20rpx;
	font-size: 21rpx;
	background: $gray-bg;
	color: #666666;
}

.badge-urgent {
	background: #ffe9e6;
	color: #e5484d;
	font-weight: 600;
}

.badge-online {
	background: #e9f7ef;
	color: #1f9d55;
}

.badge-location {
	background: $gray-bg;
	color: #666666;
}

.badge-verified {
	background: rgba(255, 206, 0, 0.28);
	color: $text-main;
}

.badge-tag {
	background: $gray-bg;
	color: #8a8a8f;
}

.badge-muted {
	background: #e8eaef;
	color: #5a6270;
	font-weight: 600;
}

.card-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10rpx;
	margin-top: 18rpx;
	font-size: 22rpx;
	color: $text-sub;
}

.meta-author,
.meta-plain {
	color: $text-sub;
}

.meta-divider {
	color: #d8d8dc;
}

.meta-deadline {
	color: #b26b00;
	font-weight: 600;

	&.expired {
		color: #b8bdc9;
	}
}

.meta-distance {
	color: #666666;
}

.meta-apply {
	margin-left: auto;
	color: $text-sub;
}

.card-actions {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-top: 22rpx;
	padding-top: 20rpx;
	border-top: 1rpx solid $line-color;
}

.action-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	height: 68rpx;
	border-radius: 34rpx;
	font-size: 25rpx;

	&.ghost {
		flex: 1;
		background: $gray-bg;
		color: #666666;
	}

	&.primary {
		flex: 1.3;
		background: $brand-yellow;
		color: $text-main;
		font-weight: bold;
	}

	&.primary.done {
		background: #eef0f6;
		color: $text-sub;
	}
}

.list-footer {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	padding: 26rpx 0;
	font-size: 23rpx;
	color: #b8bdc9;
}

.scroll-spacer {
	height: 200rpx;
}

/* 骨架屏 */
.skeleton-card {
	background: #fff;
	border-radius: 20rpx;
	padding: 26rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

.skeleton-line {
	height: 24rpx;
	border-radius: 12rpx;
	background: #f0f1f5;
	margin-bottom: 16rpx;

	&.wide {
		width: 70%;
		height: 30rpx;
	}

	&.short {
		width: 40%;
	}
}

.skeleton-actions {
	display: flex;
	gap: 16rpx;
	margin-top: 22rpx;
}

.skeleton-pill {
	flex: 1;
	height: 60rpx;
	border-radius: 30rpx;
	background: $gray-bg;
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16rpx;
	padding: 140rpx 60rpx;
}

.empty-title {
	font-size: 28rpx;
	color: #666666;
	font-weight: 600;
}

.empty-hint {
	font-size: 23rpx;
	color: $text-sub;
	text-align: center;
	line-height: 1.6;
}

.empty-reset {
	margin-top: 12rpx;
	padding: 14rpx 44rpx;
	border-radius: 32rpx;
	background: $brand-yellow;
	color: $text-main;
	font-size: 25rpx;
	font-weight: 600;
}

/* ============ 悬浮发布按钮（首页 FAB 风格） ============ */
.fab {
	position: fixed;
	right: 32rpx;
	--app-fixed-bottom-base: calc(env(safe-area-inset-bottom) + 120rpx);
	bottom: calc(var(--app-fixed-bottom-base) + var(--app-viewport-bottom-offset, 0px));
	z-index: 90;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	width: 150rpx;
	height: 92rpx;
	border-radius: 46rpx;
	background: $brand-yellow;
	box-shadow: 0 8rpx 20rpx rgba(255, 206, 0, 0.45);
}

.fab-text {
	font-size: 27rpx;
	color: $text-main;
	font-weight: bold;
}

/* ============ 底部抽屉 ============ */
.sheet-mask {
	position: fixed;
	inset: 0;
	z-index: 200;
	display: flex;
	align-items: flex-end;
	background: rgba(0, 0, 0, 0.42);
}

.sheet {
	width: 100%;
	background: #fff;
	border-radius: 28rpx 28rpx 0 0;
	display: flex;
	flex-direction: column;
	max-height: 88vh;
}

.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 26rpx 28rpx;
	border-bottom: 1rpx solid $line-color;
	flex-shrink: 0;
}

.sheet-title {
	font-size: 30rpx;
	font-weight: bold;
	color: $text-main;
}

.sheet-cancel,
.sheet-close {
	font-size: 27rpx;
	color: $text-sub;
}

.sheet-submit {
	font-size: 26rpx;
	color: $text-main;
	font-weight: 600;
	background: $brand-yellow;
	padding: 8rpx 26rpx;
	border-radius: 30rpx;

	&.disabled {
		background: $gray-bg;
		color: #c0c0c0;
	}
}

.entry-list {
	padding: 24rpx;
}

.entry-item {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 26rpx 22rpx;
	margin-bottom: 18rpx;
	border-radius: 20rpx;
	background: $gray-bg;
}

.entry-icon {
	width: 76rpx;
	height: 76rpx;
	border-radius: 50%;
	background: $brand-yellow;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.entry-body {
	flex: 1;
	min-width: 0;
}

.entry-title {
	display: block;
	font-size: 28rpx;
	font-weight: bold;
	color: $text-main;
}

.entry-desc {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #8a8a8f;
	line-height: 1.5;
}

.sheet-body {
	flex: 1;
	min-height: 0;
	padding: 22rpx 28rpx;

	&.static {
		padding-bottom: 40rpx;
	}
}

.apply-sheet .sheet-body.static {
	padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
}

.sheet-spacer {
	height: 40rpx;
}

.form-block {
	margin-bottom: 30rpx;
}

.form-label {
	display: block;
	margin-bottom: 14rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: $text-main;
}

.required {
	margin-left: 6rpx;
	color: #e5484d;
}

.form-input {
	width: 100%;
	height: 80rpx;
	padding: 0 24rpx;
	border-radius: 40rpx;
	background: $gray-bg;
	font-size: 26rpx;
	color: $text-main;
	box-sizing: border-box;

	&.inline {
		flex: 1;
	}
}

.form-textarea {
	width: 100%;
	min-height: 160rpx;
	padding: 20rpx 24rpx;
	border-radius: 20rpx;
	background: $gray-bg;
	font-size: 26rpx;
	color: $text-main;
	line-height: 1.55;
	box-sizing: border-box;
}

.form-counter {
	display: block;
	margin-top: 8rpx;
	text-align: right;
	font-size: 21rpx;
	color: #b8bdc9;
}

.form-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
}

.form-chip {
	padding: 12rpx 26rpx;
	border-radius: 30rpx;
	background: $gray-bg;
	font-size: 24rpx;
	color: #666666;

	&.active {
		background: $brand-yellow;
		color: $text-main;
		font-weight: 600;
	}

	&.soft {
		background: $gray-bg;
	}
}

.form-hint {
	display: block;
	margin-top: 12rpx;
	font-size: 21rpx;
	color: $text-sub;
	line-height: 1.5;
}

.form-inline {
	display: flex;
	align-items: center;
	gap: 16rpx;

	& + .form-chips {
		margin-top: 16rpx;
	}
}

.inline-btn {
	padding: 0 32rpx;
	height: 80rpx;
	line-height: 80rpx;
	border-radius: 40rpx;
	background: $brand-yellow;
	color: $text-main;
	font-size: 25rpx;
	font-weight: 600;
}

.form-picker {
	flex-shrink: 0;
}

.picker-value {
	display: flex;
	align-items: center;
	gap: 8rpx;
	height: 80rpx;
	padding: 0 24rpx;
	border-radius: 40rpx;
	background: $gray-bg;
	font-size: 25rpx;
	color: #666666;

	&.wide {
		justify-content: space-between;
	}
}

.form-switch-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	padding: 14rpx 0;
}

.switch-copy {
	flex: 1;
}

.switch-label {
	font-size: 25rpx;
	color: $text-main;
}

.switch-hint {
	display: block;
	margin-top: 6rpx;
	font-size: 21rpx;
	color: $text-sub;
}

.form-notice {
	display: flex;
	gap: 12rpx;
	padding: 20rpx;
	border-radius: 16rpx;
	background: $gray-bg;
	font-size: 22rpx;
	color: #8a8a8f;
	line-height: 1.6;
}

.apply-title {
	display: block;
	margin-bottom: 22rpx;
	font-size: 28rpx;
	font-weight: bold;
	color: $text-main;
	line-height: 1.45;
}
</style>

<style scoped>
/* #ifdef H5 */
.publish-sheet {
	max-height: calc(100dvh - var(--window-top, 44px) - 24px);
}
/* #endif */
</style>
