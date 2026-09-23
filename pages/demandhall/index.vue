<template>
	<view class="container app-h5-min-screen">
		<!-- 顶部：板块说明 + 核心双 Tab（仿首页 index360 的品牌黄 + 药丸导航） -->
		<view class="hero" :class="{ 'is-scrolled': headerScrolled }">
			<view class="hero-surface" aria-hidden="true"></view>
			<view class="hero-top">
				<view class="hero-title-wrap">
					<text class="hero-title">{{ text.title }}</text>
					<text class="hero-subtitle">{{ text.heroSubtitle }}</text>
				</view>
				<view class="hero-actions">
					<view class="workspace-entry" @click="goWorkspace">
						<uni-icons type="person-filled" size="15" color="#775E25"></uni-icons>
						<text class="workspace-entry-text">{{ t('workspace.entry') }}</text>
					</view>
					<text class="hero-stat">{{ stats.totalPosts }} {{ text.entryCount }}</text>
				</view>
			</view>

			<scroll-view class="tab-scroll" scroll-x :show-scrollbar="false">
				<view class="tab-bar">
					<view
						class="tab-pill"
						v-for="tab in tabs"
						:key="tab.key"
						:class="{ active: activeTab === tab.key }"
						@click="switchTab(tab.key)"
					>
						<text class="tab-label">{{ text.tabs[tab.key] }}</text>
						<text class="tab-count">{{ tab.key === 'demand' ? stats.demandCount : stats.serviceCount }}</text>
					</view>
				</view>
			</scroll-view>
		</view>

		<!-- 搜索 + 下拉筛选 -->
		<view class="filter-bar">
			<view class="search-row">
				<view class="search-box">
					<uni-icons type="search" size="16" color="#a49c8d"></uni-icons>
					<input
						class="search-input"
						v-model="keyword"
						:placeholder="text.searchPlaceholder"
						confirm-type="search"
						@confirm="onSearchConfirm"
					/>
					<view class="search-clear" v-if="keyword" :aria-label="text.clearKeyword" @click="clearKeyword">
						<uni-icons type="clear" size="16" color="#c0b8a6"></uni-icons>
					</view>
				</view>
				<view class="search-btn" :aria-label="text.searchAction" @click="onSearchConfirm">
					<uni-icons type="search" size="18" color="#775E25"></uni-icons>
				</view>
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
					<uni-icons :type="openFilter === group.key ? 'up' : 'down'" size="12" :color="openFilter === group.key || group.picked ? '#775E25' : '#a49c8d'"></uni-icons>
				</view>
				<view class="dropdown-reset" v-if="hasActiveFilter" @click="resetFilters">{{ text.filterReset }}</view>
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
					>{{ categoryLabel(item, t) }}</text>
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
					>{{ locationLabel(item.value, t) }}</text>
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
					>{{ sortLabel(item.value, t) }}</text>
				</view>
				<text class="panel-hint">{{ text.sortDistanceHint }}</text>
			</view>
		</view>

		<!-- 信息流 -->
		<scroll-view
			scroll-y
			class="content-scroll"
			:scroll-top="scrollTop"
			scroll-with-animation="false"
			refresher-enabled
			:refresher-triggered="refreshing"
			refresher-background="#f6f5f2"
			lower-threshold="120"
			@refresherrefresh="onRefresh"
			@scroll="onContentScroll"
			@scrolltolower="onLoadMore"
		>
			<!-- 标签化聚类：点击标签快速筛选 -->
			<view class="tag-strip" v-if="hotTags.length">
				<text class="tag-chip" :class="{ active: selectedTag === '' }" @click="selectTag('')">{{ text.tagAll }}</text>
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

			<!-- 首屏失败：明确区分「请求失败」与「没有数据」，并给出可恢复操作 -->
			<view class="state-block" v-else-if="loadError && posts.length === 0">
				<uni-icons type="info-filled" size="72" color="#e8e4da"></uni-icons>
				<text class="state-title">{{ text.loadFailed }}</text>
				<view class="state-btn" @click="retryLoad">{{ text.retry }}</view>
			</view>

			<!-- 空状态 -->
			<view class="empty-state" v-else-if="posts.length === 0">
				<uni-icons type="help-filled" size="96" color="#e8e4da"></uni-icons>
				<text class="empty-title">{{ text.emptyText }}</text>
				<text class="empty-hint">{{ text.emptyHint }}</text>
				<view class="empty-reset" @click="resetFilters">{{ text.resetFilters }}</view>
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
								<text class="price-text">{{ formatPriceLabel(post, t) }}</text>
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
									<text class="service-name">{{ post.author?.name }}</text>
									<text class="verify-badge" v-if="post.requireVerified">{{ text.verifiedShort }}</text>
								</view>
								<text class="service-reputation">{{ text.reputation(post.applyCount, post.viewCount) }}</text>
							</view>
							<view class="price-tag service-price">
								<text class="price-text">{{ formatPriceLabel(post, t) }}</text>
							</view>
						</view>
						<text class="card-title service-title">{{ post.title }}</text>
						<text class="card-desc">{{ post.description }}</text>
					</template>

					<view class="badge-row">
						<text
							class="badge"
							v-for="badge in buildCardBadges(post, { t })"
							:key="badge.text"
							:class="`badge-${badge.tone}`"
							@click.stop="onBadgeClick(badge)"
						>{{ badge.tone === 'tag' ? '#' + badge.text : badge.text }}</text>
					</view>

					<view class="card-meta">
						<text class="meta-author" v-if="post.type === 'service'">{{ text.publishedAt(formatRelativeTime(post.createdAt, Date.now(), t)) }}</text>
						<text class="meta-author" v-else>{{ text.publishedBy(post.author?.name) }}</text>
						<text class="meta-divider">·</text>
						<text class="meta-deadline" v-if="post.type === 'demand' && post.deadline" :class="{ expired: post.deadline.expired }">
							{{ formatDeadlineText(post.deadline, Date.now(), t) }}
						</text>
						<text class="meta-distance" v-if="post.distanceKm != null">{{ formatDistanceText(post.distanceKm, t) }}</text>
						<text class="meta-plain" v-if="!post.deadline && post.distanceKm == null">{{ text.publishedAt(formatRelativeTime(post.createdAt, Date.now(), t)) }}</text>
						<text class="meta-apply">{{ text.appliedCount(post.applyCount, post.type === 'demand' ? text.applyDemandAction : text.applyServiceAction) }}</text>
					</view>

					<view class="card-actions">
						<view class="action-btn ghost" @click.stop="toggleCollect(post)">
							<uni-icons :type="post.isCollected ? 'star-filled' : 'star'" size="15" :color="post.isCollected ? '#775E25' : '#a49c8d'"></uni-icons>
							<text>{{ post.isCollected ? text.collected : text.collect }}</text>
						</view>
						<view class="action-btn ghost" @click.stop="contact(post)">
							<uni-icons type="chat" size="15" color="#a49c8d"></uni-icons>
							<text>{{ text.contact }}</text>
						</view>
						<view
							class="action-btn primary"
							:class="{ done: isActionDone(post) }"
							@click.stop="post.isOwner ? goDetail(post) : openApply(post)"
						>
							<text>{{ postActionText(post, t) }}</text>
						</view>
					</view>
				</view>

				<view class="list-footer" v-if="loadingMore">
					<uni-icons type="spinner-cycle" size="14" color="#b8b3a6"></uni-icons>
					<text>{{ text.loadingMore }}</text>
				</view>
				<view class="list-footer tappable" v-else-if="loadMoreError" @click="loadMore">{{ text.loadMoreFailed }}</view>
				<view class="list-footer" v-else-if="!hasMore">{{ text.noMore }}</view>
			</view>

			<view class="scroll-spacer"></view>
		</scroll-view>

		<!-- 悬浮发布按钮 -->
		<view class="fab" @click="openPublishEntry">
			<uni-icons type="plusempty" size="22" color="#775E25"></uni-icons>
			<text class="fab-text">{{ text.publish }}</text>
		</view>

		<!-- 发布入口抽屉 -->
		<SlideUpPanel fixed :open="showEntrySheet" :z-index="210" :label="text.publishEntryTitle" @dismiss="showEntrySheet = false">
			<view class="sheet">
				<view class="sheet-header">
					<text class="sheet-title">{{ text.publishEntryTitle }}</text>
					<text class="sheet-close" @click="showEntrySheet = false">{{ text.close }}</text>
				</view>
				<view class="entry-list">
					<view class="entry-item demand" @click="openPublishForm('demand')">
						<view class="entry-icon">
							<uni-icons type="help-filled" size="22" color="#775E25"></uni-icons>
						</view>
						<view class="entry-body">
							<text class="entry-title">{{ text.entryDemandTitle }}</text>
							<text class="entry-desc">{{ text.entryDemandDesc }}</text>
						</view>
						<uni-icons type="right" size="16" color="#c9c2b4"></uni-icons>
					</view>
					<view class="entry-item service" @click="openPublishForm('service')">
						<view class="entry-icon">
							<uni-icons type="staff-filled" size="22" color="#775E25"></uni-icons>
						</view>
						<view class="entry-body">
							<text class="entry-title">{{ text.entryServiceTitle }}</text>
							<text class="entry-desc">{{ text.entryServiceDesc }}</text>
						</view>
						<uni-icons type="right" size="16" color="#c9c2b4"></uni-icons>
					</view>
				</view>
			</view>
		</SlideUpPanel>

		<!-- 发布 / 修改表单抽屉：两种场景共用同一套字段与校验 -->
		<SlideUpPanel fixed :open="showPublishForm" :z-index="220" :label="publishFormTitle" @dismiss="closePublishForm" @after-close="afterPublishClose">
			<view class="sheet publish-sheet">
				<view class="sheet-header">
					<text class="sheet-cancel" @click="closePublishForm">{{ text.cancel }}</text>
					<text class="sheet-title">{{ publishFormTitle }}</text>
					<text class="sheet-submit" :class="{ disabled: submitting }" @click="submitPublish">{{ submitting ? text.submitting : publishSubmitText }}</text>
				</view>

				<scroll-view scroll-y class="sheet-body">
					<view class="form-block">
						<text class="form-label">{{ form.type === 'demand' ? text.formHeadlineDemand : text.formHeadlineService }}<text class="required">*</text></text>
						<input class="form-input" v-model="form.title" maxlength="120" :placeholder="form.type === 'demand' ? text.formHeadlineDemandPlaceholder : text.formHeadlineServicePlaceholder" />
					</view>

					<view class="form-block">
						<text class="form-label">{{ text.formDescription }}<text class="required">*</text></text>
						<textarea
							class="form-textarea"
							v-model="form.description"
							maxlength="2000"
							auto-height
							:placeholder="form.type === 'demand' ? text.formDescriptionDemandPlaceholder : text.formDescriptionServicePlaceholder"
						></textarea>
						<text class="form-counter">{{ form.description.length }}/2000</text>
					</view>

					<view class="form-block">
						<text class="form-label">{{ text.formCategory }}<text class="required">*</text></text>
						<view class="form-chips">
							<text
								class="form-chip"
								v-for="item in categoryOptions"
								:key="item"
								:class="{ active: form.categories.includes(item) }"
								@click="toggleFormCategory(item)"
							>{{ categoryLabel(item, t) }}</text>
						</view>
						<text class="form-hint">{{ text.formCategoryHint }}</text>
					</view>

					<view class="form-block">
						<text class="form-label">{{ text.formTags }}</text>
						<view class="form-chips" v-if="form.tags.length">
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
								:placeholder="text.formTagPlaceholder"
								confirm-type="done"
								@confirm="addFormTag"
							/>
							<view class="inline-btn" @click="addFormTag">{{ text.formTagAdd }}</view>
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
						<text class="form-label">{{ form.type === 'demand' ? text.formBudgetDemand : text.formBudgetService }}</text>
						<view class="form-inline">
							<input class="form-input inline" v-model="form.price" type="digit" :placeholder="text.formPricePlaceholder" :disabled="form.isNegotiable" />
							<picker class="form-picker" :range="priceUnitLabels" :value="priceUnitIndex" @change="onPriceUnitChange">
								<view class="picker-value">{{ priceUnitLabels[priceUnitIndex] }}<uni-icons type="down" size="12" color="#a49c8d"></uni-icons></view>
							</picker>
						</view>
						<view class="form-switch-row" @click="form.isNegotiable = !form.isNegotiable">
							<text class="switch-label">{{ text.formNegotiable }}</text>
							<switch :checked="form.isNegotiable" color="var(--bless-primary, #C2A052)" style="transform: scale(0.7)" />
						</view>
					</view>

					<view class="form-block">
						<text class="form-label">{{ text.formLocation }}<text class="required">*</text></text>
						<view class="form-chips">
							<text class="form-chip" :class="{ active: form.locationType === 'online' }" @click="form.locationType = 'online'">{{ locationLabel('online', t) }}</text>
							<text class="form-chip" :class="{ active: form.locationType === 'offline' }" @click="form.locationType = 'offline'">{{ locationLabel('offline', t) }}</text>
						</view>
						<input
							v-if="form.locationType === 'offline'"
							class="form-input"
							v-model="form.locationText"
							maxlength="120"
							:placeholder="text.formLocationPlaceholder"
						/>
					</view>

					<view class="form-block" v-if="form.type === 'demand'">
						<text class="form-label">{{ text.formDeadline }}</text>
						<picker mode="date" :value="form.deadlineAt" :start="todayString" @change="onDeadlineChange">
							<view class="picker-value wide">{{ form.deadlineAt || text.formDeadlineEmpty }}<uni-icons type="calendar" size="13" color="#a49c8d"></uni-icons></view>
						</picker>
						<text class="form-hint">{{ text.formDeadlineHint }}</text>
					</view>

					<view class="form-block">
						<view class="form-switch-row" @click="form.isUrgent = !form.isUrgent">
							<view class="switch-copy">
								<text class="switch-label">{{ text.formUrgent }}</text>
								<text class="switch-hint">{{ text.formUrgentHint }}</text>
							</view>
							<switch :checked="form.isUrgent" color="var(--bless-primary, #C2A052)" style="transform: scale(0.7)" />
						</view>
						<view class="form-switch-row" @click="form.requireVerified = !form.requireVerified">
							<view class="switch-copy">
								<text class="switch-label">{{ text.formVerified }}</text>
								<text class="switch-hint">{{ text.formVerifiedHint }}</text>
							</view>
							<switch :checked="form.requireVerified" color="var(--bless-primary, #C2A052)" style="transform: scale(0.7)" />
						</view>
					</view>

					<view class="form-notice">
						<uni-icons type="info" size="14" color="#a49c8d"></uni-icons>
						<text>{{ text.formNotice }}</text>
					</view>
					<view class="sheet-spacer"></view>
				</scroll-view>
			</view>
		</SlideUpPanel>

		<!-- 报名 / 接单弹窗 -->
		<SlideUpPanel fixed :open="!!applyTarget" :z-index="220" :label="applyTitle" @dismiss="closeApply" @after-close="afterApplyClose">
			<view class="sheet apply-sheet" v-if="applyTarget">
				<view class="sheet-header">
					<text class="sheet-cancel" @click="closeApply">{{ text.cancel }}</text>
					<text class="sheet-title">{{ applyTitle }}</text>
					<text class="sheet-submit" :class="{ disabled: applySubmitting }" @click="submitApply">{{ applySubmitting ? text.applySubmitting : text.applySubmit }}</text>
				</view>
				<view class="sheet-body static">
					<text class="apply-title">{{ applyTarget.title }}</text>
					<view class="form-block">
						<text class="form-label">{{ applyTarget.type === 'demand' ? text.applyMessageLabelDemand : text.applyMessageLabelService }}<text class="required">*</text></text>
						<textarea class="form-textarea" v-model="applyMessage" maxlength="500" auto-height :placeholder="text.applyMessagePlaceholder"></textarea>
						<text class="form-counter">{{ applyMessage.length }}/500</text>
					</view>
					<view class="form-block">
						<text class="form-label">{{ applyTarget.type === 'demand' ? text.applyQuoteDemand : text.applyQuoteService }}</text>
						<input class="form-input" v-model="applyQuote" type="digit" :placeholder="applyTarget.price ? text.applyQuoteReference(formatPriceLabel(applyTarget, t)) : text.applyQuotePlaceholder" />
					</view>
					<view class="form-notice">
						<uni-icons type="info" size="14" color="#a49c8d"></uni-icons>
						<text>{{ text.applyNotice }}</text>
					</view>
				</view>
			</view>
		</SlideUpPanel>
	</view>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
	getDemandHallPostsApi,
	getDemandHallPostApi,
	getDemandHallHotTagsApi,
	getDemandHallStatsApi,
	createDemandHallPostApi,
	updateDemandHallPostApi,
	toggleDemandHallCollectApi,
	createDemandHallApplicationApi
} from '@/api/demandHall.js'
import { createChatRequestApi, getChatRequestStatusApi } from '@/api/chat.js'
import { t } from '@/utils/localeRuntime.js'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import {
	DEMAND_HALL_TABS,
	SORT_OPTIONS,
	LOCATION_OPTIONS,
	PRICE_UNIT_OPTIONS,
	DEFAULT_CATEGORIES,
	ALL_CATEGORY,
	tabLabel,
	tabEmptyText,
	sortLabel,
	locationLabel,
	priceUnitLabel,
	categoryLabel,
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

/* ============ 顶部与文案 ============ */
/** 页面文案集中在这里，模板里只用 text.xxx，切换语言即时生效。 */
const text = computed(() => ({
	title: t('demandHall.heroTitle'),
	heroSubtitle: t('demandHall.heroSubtitle'),
	entryCount: t('demandHall.entryCount'),
	tabs: { demand: tabLabel('demand', t), service: tabLabel('service', t) },
	emptyText: tabEmptyText(activeTab.value, t),
	searchPlaceholder: t('demandHall.searchPlaceholder'),
	searchAction: t('demandHall.searchAction'),
	clearKeyword: t('demandHall.clearKeyword'),
	filterCategory: t('demandHall.filterCategory'),
	filterLocation: t('demandHall.filterLocation'),
	filterReset: t('demandHall.filterReset'),
	sortDistanceHint: t('demandHall.sortDistanceHint'),
	locationDenied: t('demandHall.locationDenied'),
	emptyHint: t('demandHall.emptyHint'),
	resetFilters: t('demandHall.resetFilters'),
	loadFailed: t('demandHall.loadFailed'),
	loadMoreFailed: t('demandHall.loadMoreFailed'),
	retry: t('demandHall.retry'),
	tagAll: t('demandHall.tagAll'),
	loadingMore: t('demandHall.loadingMore'),
	noMore: t('demandHall.noMore'),
	publish: t('demandHall.publish'),
	publishEntryTitle: t('demandHall.publishEntryTitle'),
	close: t('demandHall.close'),
	entryDemandTitle: t('demandHall.entryDemandTitle'),
	entryDemandDesc: t('demandHall.entryDemandDesc'),
	entryServiceTitle: t('demandHall.entryServiceTitle'),
	entryServiceDesc: t('demandHall.entryServiceDesc'),
	formTitleDemand: t('demandHall.formTitleDemand'),
	formTitleService: t('demandHall.formTitleService'),
	formTitleEditDemand: t('demandHall.formTitleEditDemand'),
	formTitleEditService: t('demandHall.formTitleEditService'),
	formSubmitEdit: t('demandHall.formSubmitEdit'),
	formEdited: t('demandHall.formEdited'),
	formEditNotOwner: t('demandHall.formEditNotOwner'),
	cancel: t('demandHall.cancel'),
	submitting: t('demandHall.submitting'),
	formHeadlineDemand: t('demandHall.formHeadlineDemand'),
	formHeadlineService: t('demandHall.formHeadlineService'),
	formHeadlineDemandPlaceholder: t('demandHall.formHeadlineDemandPlaceholder'),
	formHeadlineServicePlaceholder: t('demandHall.formHeadlineServicePlaceholder'),
	formDescription: t('demandHall.formDescription'),
	formDescriptionDemandPlaceholder: t('demandHall.formDescriptionDemandPlaceholder'),
	formDescriptionServicePlaceholder: t('demandHall.formDescriptionServicePlaceholder'),
	formCategory: t('demandHall.formCategory'),
	formCategoryHint: t('demandHall.formCategoryHint'),
	formTags: t('demandHall.formTags'),
	formTagPlaceholder: t('demandHall.formTagPlaceholder'),
	formTagAdd: t('demandHall.formTagAdd'),
	formTagLimit: t('demandHall.formTagLimit'),
	formBudgetDemand: t('demandHall.formBudgetDemand'),
	formBudgetService: t('demandHall.formBudgetService'),
	formPricePlaceholder: t('demandHall.formPricePlaceholder'),
	formNegotiable: t('demandHall.formNegotiable'),
	formLocation: t('demandHall.formLocation'),
	formLocationPlaceholder: t('demandHall.formLocationPlaceholder'),
	formDeadline: t('demandHall.formDeadline'),
	formDeadlineEmpty: t('demandHall.formDeadlineEmpty'),
	formDeadlineHint: t('demandHall.formDeadlineHint'),
	formUrgent: t('demandHall.formUrgent'),
	formUrgentHint: t('demandHall.formUrgentHint'),
	formVerified: t('demandHall.formVerified'),
	formVerifiedHint: t('demandHall.formVerifiedHint'),
	formNotice: t('demandHall.formNotice'),
	formSubmit: t('demandHall.formSubmit'),
	formPublished: t('demandHall.formPublished'),
	applyDemandTitle: t('demandHall.applyDemandTitle'),
	applyServiceTitle: t('demandHall.applyServiceTitle'),
	applyMessageLabelDemand: t('demandHall.applyMessageLabelDemand'),
	applyMessageLabelService: t('demandHall.applyMessageLabelService'),
	applyMessagePlaceholder: t('demandHall.applyMessagePlaceholder'),
	applyQuoteDemand: t('demandHall.applyQuoteDemand'),
	applyQuoteService: t('demandHall.applyQuoteService'),
	applyQuoteReference: price => t('demandHall.applyQuoteReference', { price }),
	applyQuotePlaceholder: t('demandHall.applyQuotePlaceholder'),
	applyNotice: t('demandHall.applyNotice'),
	applySubmit: t('demandHall.applySubmit'),
	applySubmitting: t('demandHall.applySubmitting'),
	applyMessageRequired: t('demandHall.applyMessageRequired'),
	applySubmitted: t('demandHall.applySubmitted'),
	contactSelf: t('demandHall.contactSelf'),
	contactPending: t('demandHall.contactPending'),
	contactTitle: t('demandHall.contactTitle'),
	contactPlaceholder: t('demandHall.contactPlaceholder'),
	contactSend: t('demandHall.contactSend'),
	contactSent: t('demandHall.contactSent'),
	verifiedShort: t('demandHall.verifiedShort'),
	reputation: (count, views) => t('demandHall.reputation', { count, views }),
	publishedBy: name => t('demandHall.publishedBy', { name }),
	publishedAt: time => t('demandHall.publishedAt', { time }),
	appliedCount: (count, action) => t('demandHall.appliedCount', { count, action }),
	applyDemandAction: t('demandHall.applyDemandAction'),
	applyServiceAction: t('demandHall.applyServiceAction'),
	collect: t('demandHall.collect'),
	collected: t('demandHall.collected'),
	contact: t('demandHall.contact')
}))

/* ============ 列表状态 ============ */
const activeTab = ref('demand')
const keyword = ref('')
const selectedCategory = ref(ALL_CATEGORY)
const selectedTag = ref('')
const sort = ref('latest')
const locationType = ref('all')
const openFilter = ref('')
const coords = ref(null)

const posts = ref([])
const loading = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const loadError = ref(false)
const loadMoreError = ref(false)
const hasMore = ref(true)
const currentPage = ref(0)
const headerScrolled = ref(false)
const scrollTop = ref(0)

const stats = ref({ totalPosts: 0, demandCount: 0, serviceCount: 0, applicationCount: 0, categoryCounts: {} })
const hotTags = ref([])
const remoteCategories = ref([])

// 后端返回的分类白名单优先，接口异常时用内置默认值兜底，保证筛选栏始终可用。
const categoryOptions = computed(() => {
	const list = remoteCategories.value.length ? remoteCategories.value : DEFAULT_CATEGORIES
	return [ALL_CATEGORY, ...list]
})
const hasActiveFilter = computed(() => selectedCategory.value !== ALL_CATEGORY || selectedTag.value !== '' || locationType.value !== 'all' || sort.value !== 'latest' || !!keyword.value.trim())
const filterGroups = computed(() => [
	{ key: 'category', label: selectedCategory.value === ALL_CATEGORY ? text.value.filterCategory : categoryLabel(selectedCategory.value, t), picked: selectedCategory.value !== ALL_CATEGORY },
	{ key: 'location', label: locationType.value === 'all' ? text.value.filterLocation : locationLabel(locationType.value, t), picked: locationType.value !== 'all' },
	{ key: 'sort', label: sortLabel(sort.value, t), picked: sort.value !== 'latest' }
])
const priceUnitLabels = computed(() => priceUnitOptions.map(item => priceUnitLabel(item.value, t)))
const applyTitle = computed(() => {
	if (!applyTarget.value) return ''
	return applyTarget.value.type === 'demand' ? text.value.applyDemandTitle : text.value.applyServiceTitle
})

function avatarOf(post) {
	if (post.author?.avatar) return post.author.avatar
	return `https://api.dicebear.com/7.x/miniavs/svg?seed=${encodeURIComponent(post.author?.name || 'user')}`
}

function isActionDone(post) {
	return !!post.isOwner || !!post.hasApplied || post.status === 'closed'
}

/**
 * 切换筛选 / Tab 时把列表滚回顶部。
 * 列表高度变化时旧的 scrollTop 会被钳位，视觉上就是“页面震一下”。
 */
async function resetListScroll() {
	await nextTick()
	scrollTop.value = scrollTop.value === 0 ? 0.0001 : 0
	await nextTick()
	scrollTop.value = 0
}

/* ============ 数据加载 ============ */
async function loadPosts({ reset = false } = {}) {
	const page = reset ? 1 : currentPage.value + 1
	if (!reset && !hasMore.value) return
	if (!reset) loadingMore.value = true
	loadMoreError.value = false
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
		loadError.value = false
	} catch (error) {
		// 请求层已提示错误。首屏失败要落在失败态而不是空数据态，
		// 否则服务端 500 会被显示成「暂时没有求助信息」。
		if (reset) {
			posts.value = []
			loadError.value = true
		} else {
			// 加载更多失败时保留 hasMore，用户点一下就能重试同一页。
			loadMoreError.value = true
		}
	} finally {
		loading.value = false
		loadingMore.value = false
		refreshing.value = false
	}
}

/** 首屏 / 下拉刷新失败后的重试入口。 */
function retryLoad() {
	loading.value = true
	void loadSideData()
	return reloadList()
}

/** 加载更多失败后的重试入口（复用同一页）。 */
function loadMore() {
	void loadPosts()
}

function reloadList({ scrollUp = false } = {}) {
	currentPage.value = 0
	hasMore.value = true
	loadError.value = false
	loadMoreError.value = false
	if (scrollUp) void resetListScroll()
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

function onContentScroll(event) {
	headerScrolled.value = Number(event?.detail?.scrollTop) > 4
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
	reloadList({ scrollUp: true })
}

function selectCategory(value) {
	selectedCategory.value = value
	closeFilter()
	reloadList({ scrollUp: true })
}

function selectLocation(value) {
	locationType.value = value
	closeFilter()
	reloadList({ scrollUp: true })
}

function selectTag(tag) {
	const next = selectedTag.value === tag ? '' : tag
	selectedTag.value = next
	reloadList({ scrollUp: true })
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
			uni.showToast({ title: text.value.locationDenied, icon: 'none' })
			reloadList({ scrollUp: true })
			return
		}
	}
	sort.value = value
	closeFilter()
	reloadList({ scrollUp: true })
}

function onSearchConfirm() {
	closeFilter()
	reloadList({ scrollUp: true })
}

function clearKeyword() {
	keyword.value = ''
	reloadList({ scrollUp: true })
}

function resetFilters() {
	keyword.value = ''
	selectedCategory.value = ALL_CATEGORY
	selectedTag.value = ''
	locationType.value = 'all'
	sort.value = 'latest'
	closeFilter()
	reloadList({ scrollUp: true })
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
	const blocked = canApplyToPost(post, t)
	if (blocked) {
		uni.showToast({ title: blocked, icon: 'none' })
		return
	}
	applyTarget.value = post
	applyMessage.value = ''
	applyQuote.value = post.price != null ? String(post.price) : ''
}

function closeApply() {
	// 收起动画结束后再清空内容，避免面板在收起过程中被瞬间抽空。
	applySubmitting.value = false
	applyTarget.value = null
}

function afterApplyClose() {
	applyMessage.value = ''
	applyQuote.value = ''
}

async function submitApply() {
	const post = applyTarget.value
	if (!post || applySubmitting.value) return
	if (!applyMessage.value.trim()) {
		uni.showToast({ title: text.value.applyMessageRequired, icon: 'none' })
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
		uni.showToast({ title: text.value.applySubmitted, icon: 'success' })
		closeApply()
	} catch (error) {
		applySubmitting.value = false
	}
}

/* ============ 立即沟通（接入应用内 IM） ============ */
function buildContactMessage(post) {
	const link = `pages/demandhall/detail?id=${post.id}`
	return `${t('demandHall.contactCardPrefix', { title: post.title })}\n${link}`
}

async function contact(post) {
	const currentUserId = Number(uni.getStorageSync('USER_INFO')?.id)
	if (currentUserId && Number(post.userId) === currentUserId) {
		uni.showToast({ title: text.value.contactSelf, icon: 'none' })
		return
	}
	try {
		const status = await getChatRequestStatusApi(post.userId)
		if (status?.status === 'approved' && status.groupId) {
			uni.navigateTo({ url: `/pages/chat/chatRoom?id=${status.groupId}` })
			return
		}
		if (status?.status === 'pending' || status?.status === 'processing') {
			uni.showToast({ title: text.value.contactPending, icon: 'none' })
			return
		}
		uni.showModal({
			title: text.value.contactTitle,
			editable: true,
			placeholderText: text.value.contactPlaceholder,
			content: buildContactMessage(post),
			cancelText: text.value.cancel,
			confirmText: text.value.contactSend,
			success: async ({ confirm, content }) => {
				if (!confirm) return
				try {
					await createChatRequestApi({ targetUserId: post.userId, message: (content || buildContactMessage(post)).slice(0, 500) })
					uni.showToast({ title: text.value.contactSent, icon: 'success' })
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

/* ============ 发布 / 修改 ============ */
const showEntrySheet = ref(false)
const showPublishForm = ref(false)
const submitting = ref(false)
const tagDraft = ref('')
const form = ref(buildPublishDefaults('demand'))
/** 非空表示当前抽屉处于「修改」模式；发布与修改共用同一套字段与校验。 */
const editingId = ref(null)
const isEditing = computed(() => editingId.value != null)
const publishFormTitle = computed(() => {
	if (isEditing.value) return form.value.type === 'demand' ? text.value.formTitleEditDemand : text.value.formTitleEditService
	return form.value.type === 'demand' ? text.value.formTitleDemand : text.value.formTitleService
})
const publishSubmitText = computed(() => (isEditing.value ? text.value.formSubmitEdit : text.value.formSubmit))
const priceUnitIndex = computed(() => Math.max(0, priceUnitOptions.findIndex(item => item.value === form.value.priceUnit)))
const todayString = computed(() => {
	const now = new Date()
	const pad = value => String(value).padStart(2, '0')
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
})

function openPublishEntry() {
	openFilter.value = ''
	editingId.value = null
	showEntrySheet.value = true
}

function openPublishForm(type) {
	showEntrySheet.value = false
	editingId.value = null
	form.value = buildPublishDefaults(type)
	tagDraft.value = ''
	// 一级分类必选，默认预填当前筛选分类（没有筛选时取第一个分类），减少操作步骤。
	const preset = selectedCategory.value !== ALL_CATEGORY ? selectedCategory.value : (categoryOptions.value[1] || DEFAULT_CATEGORIES[0])
	form.value.categories = [preset]
	showPublishForm.value = true
}

/**
 * 打开发布表单的「修改」模式：把已有信息回填到同一套字段里。
 * 入口来自工作台 / 详情页的「修改」按钮（带 editId=N 跳过来）。
 */
async function openEditForm(id) {
	const postId = Number(id)
	if (!postId) return
	openFilter.value = ''
	try {
		const data = await getDemandHallPostApi(postId)
		const target = data?.post
		if (!target) {
			uni.showToast({ title: text.value.loadFailed, icon: 'none' })
			return
		}
		if (!target.isOwner) {
			uni.showToast({ title: text.value.formEditNotOwner, icon: 'none' })
			return
		}
		const defaults = buildPublishDefaults(target.type)
		form.value = {
			...defaults,
			type: target.type,
			title: target.title || '',
			description: target.description || '',
			categories: target.category ? [target.category] : [],
			tags: Array.isArray(target.tags) ? [...target.tags] : [],
			price: target.price == null ? '' : String(target.price),
			priceUnit: target.priceUnit || 'total',
			isNegotiable: !!target.isNegotiable,
			locationType: target.locationType || 'online',
			locationText: target.locationText || '',
			// 沿用原坐标，避免「距离最近」排序因为一次编辑而丢失位置。
			latitude: target.latitude ?? null,
			longitude: target.longitude ?? null,
			isUrgent: !!target.isUrgent,
			requireVerified: !!target.requireVerified,
			// 已过期的截止时间不能回填：后端只接受未来时间，否则用户不改这一项就保存不了。
			deadlineAt: target.deadline?.expired ? '' : formatDateInput(target.deadlineAt)
		}
		editingId.value = postId
		tagDraft.value = ''
		showPublishForm.value = true
	} catch (error) {
		// 请求层已提示；失败时保持列表原样，不打开表单。
	}
}

/** 时间戳 -> picker 需要的 YYYY-MM-DD。 */
function formatDateInput(timestamp) {
	const value = Number(timestamp)
	if (!Number.isFinite(value) || value <= 0) return ''
	const date = new Date(value)
	const pad = item => String(item).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function closePublishForm() {
	showPublishForm.value = false
}

function afterPublishClose() {
	submitting.value = false
	tagDraft.value = ''
	// 收起动画结束后再清掉编辑目标，避免面板在收起过程中切换标题。
	editingId.value = null
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
		uni.showToast({ title: text.value.formTagLimit, icon: 'none' })
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

/**
 * 线下信息补坐标：有坐标的帖子才能参与「距离最近」排序。
 * 定位失败不阻塞发布，只是这条信息不参与距离排序。
 */
async function resolvePublishCoords() {
	const current = form.value
	if (current.locationType !== 'offline') return { latitude: null, longitude: null }
	const latitude = Number(current.latitude)
	const longitude = Number(current.longitude)
	if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude }
	const position = await ensureCoords()
	return position ? { latitude: position.latitude, longitude: position.longitude } : { latitude: null, longitude: null }
}

async function submitPublish() {
	if (submitting.value) return
	const current = form.value
	const error = validatePublishForm(current, t)
	if (error) {
		uni.showToast({ title: error, icon: 'none' })
		return
	}
	submitting.value = true
	try {
		const position = await resolvePublishCoords()
		const payload = {
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
			latitude: position.latitude,
			longitude: position.longitude,
			deadlineAt: current.type === 'demand' && current.deadlineAt ? new Date(`${current.deadlineAt}T23:59:59`).getTime() : null,
			isUrgent: current.isUrgent,
			requireVerified: current.requireVerified
		}
		const editedId = editingId.value
		if (editedId) await updateDemandHallPostApi(editedId, payload)
		else await createDemandHallPostApi(payload)
		const publishedType = current.type
		closePublishForm()
		uni.showToast({ title: editedId ? text.value.formEdited : text.value.formPublished, icon: 'success' })
		if (activeTab.value !== publishedType) activeTab.value = publishedType
		void loadSideData()
		reloadList({ scrollUp: true })
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
	// 工作台 / 详情页的「修改」入口带 editId 过来，落地即打开修改抽屉。
	if (options?.editId) setTimeout(() => { void openEditForm(options.editId) }, 300)
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
$brand-yellow: var(--bless-primary, #C2A052);
$brand-soft: var(--bless-soft, #F1E4BD);
$brand-ink: var(--bless-text, #775E25);
$bg-color: #f6f5f2;
$surface: #ffffff;
$text-main: #292825;
$text-sub: #8b8984;
$text-muted: #a49c8d;
$gray-bg: #f4f3f1;
$line-color: #f0eeea;

.container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: $bg-color;
	position: relative;
}

/* ============ 顶部标题 + 双 Tab（品牌黄 / 毛玻璃导航） ============ */
.hero {
	position: relative;
	flex-shrink: 0;
	// 背景交给 hero-surface：H5 上它承担毛玻璃，其余端保持纯色。
	background: transparent;
}

.hero-surface {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	z-index: 0;
	background: $bg-color;
	pointer-events: none;
}

.hero-top,
.tab-scroll {
	position: relative;
	z-index: 1;
}

.hero-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
	padding: 20rpx 30rpx 0;
}

.hero-title-wrap {
	flex: 1 1 0;
	min-width: 0;
	overflow: hidden;
}

.hero-title {
	display: block;
	font-size: 44rpx;
	font-weight: 650;
	color: $text-main;
	letter-spacing: -1rpx;
}

.hero-subtitle {
	display: block;
	max-width: 100%;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: $text-sub;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.hero-actions {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 10rpx;
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
	transition: transform 140ms cubic-bezier(.23, 1, .32, 1), background-color 140ms ease-out;

	&:active {
		transform: scale(.96);
		background: var(--bless-pressed, #AA873C);
	}
}

.workspace-entry-text {
	font-size: 24rpx;
	font-weight: 600;
	color: $brand-ink;
}

.hero-stat {
	font-size: 20rpx;
	color: $text-muted;
}

.tab-scroll {
	width: 100%;
	padding: 18rpx 0 16rpx;
	white-space: nowrap;

	::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
		color: transparent;
	}
}

.tab-bar {
	display: inline-flex;
	align-items: center;
	padding: 0 30rpx;
}

.tab-pill {
	display: inline-flex;
	align-items: center;
	gap: 10rpx;
	height: 68rpx;
	padding: 0 30rpx;
	margin-right: 16rpx;
	border-radius: 34rpx;
	background: $surface;
	flex-shrink: 0;
	transition: background-color 160ms ease-out, transform 140ms cubic-bezier(.23, 1, .32, 1);

	&:active {
		transform: scale(.97);
	}

	&.active {
		background: $brand-soft;

		.tab-label {
			color: $brand-ink;
			font-weight: 650;
		}

		.tab-count {
			background: rgba(119, 94, 37, .14);
			color: $brand-ink;
		}
	}
}

.tab-label {
	font-size: 28rpx;
	font-weight: 500;
	color: $text-main;
}

.tab-count {
	min-width: 40rpx;
	height: 32rpx;
	padding: 0 10rpx;
	border-radius: 16rpx;
	background: $gray-bg;
	color: $text-sub;
	font-size: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

/* ============ 搜索与筛选 ============ */
.filter-bar {
	flex-shrink: 0;
	padding: 0 30rpx 14rpx;
	background: $bg-color;
}

.search-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.search-box {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 12rpx;
	height: 76rpx;
	padding: 0 26rpx;
	border-radius: 38rpx;
	background: $surface;
	box-sizing: border-box;
}

.search-input {
	flex: 1;
	min-width: 0;
	font-size: 27rpx;
	color: $text-main;
}

.search-clear {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48rpx;
	height: 48rpx;
	flex-shrink: 0;
}

.search-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 76rpx;
	height: 76rpx;
	flex-shrink: 0;
	border-radius: 50%;
	background: $brand-yellow;
	transition: transform 140ms cubic-bezier(.23, 1, .32, 1);

	&:active {
		transform: scale(.95);
	}
}

.dropdown-row {
	display: flex;
	align-items: center;
	gap: 14rpx;
	margin-top: 16rpx;
}

.dropdown-trigger {
	display: flex;
	align-items: center;
	gap: 8rpx;
	height: 62rpx;
	padding: 0 24rpx;
	border-radius: 31rpx;
	background: $surface;
	max-width: 300rpx;
	transition: background-color 160ms ease-out;

	&.active,
	&.picked {
		background: $brand-soft;
	}
}

.dropdown-text {
	font-size: 24rpx;
	color: $text-sub;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;

	.active &,
	.picked & {
		color: $brand-ink;
		font-weight: 600;
	}
}

.dropdown-reset {
	margin-left: auto;
	padding: 10rpx 0 10rpx 10rpx;
	font-size: 24rpx;
	color: $text-muted;
}

.filter-panel {
	margin-top: 16rpx;
	padding: 20rpx;
	border-radius: 24rpx;
	background: $surface;
}

.panel-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
}

.panel-chip {
	padding: 12rpx 28rpx;
	border-radius: 30rpx;
	background: $gray-bg;
	font-size: 24rpx;
	color: #655d51;

	&.active {
		background: $brand-soft;
		color: $brand-ink;
		font-weight: 600;
	}
}

.panel-hint {
	display: block;
	margin-top: 14rpx;
	font-size: 21rpx;
	color: $text-muted;
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
	padding: 6rpx 30rpx 4rpx;
}

.tag-chip {
	padding: 10rpx 24rpx;
	border-radius: 28rpx;
	background: $surface;
	font-size: 22rpx;
	color: #655d51;

	&.active {
		background: $brand-soft;
		color: $brand-ink;
		font-weight: 600;
	}
}

.card-list {
	padding: 18rpx 30rpx 0;
}

.card {
	background: $surface;
	border-radius: 24rpx;
	padding: 26rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 10rpx rgba(45, 42, 34, .04);
	border-left: 8rpx solid $brand-yellow;
}

/* 需求卡 / 服务卡共用同一视觉语言，仅用左侧色条区分语义 */
.demand-card {
	border-left-color: $brand-yellow;
}

.service-card {
	border-left-color: $brand-soft;
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
	font-weight: 600;
	color: $text-main;
	line-height: 1.42;
	overflow-wrap: anywhere;
}

.service-title {
	display: block;
	margin-top: 18rpx;
}

.card-desc {
	margin-top: 12rpx;
	font-size: 25rpx;
	color: #6f6a63;
	line-height: 1.55;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow-wrap: anywhere;
}

.price-tag {
	display: flex;
	align-items: center;
	gap: 6rpx;
	flex-shrink: 0;
	max-width: 46%;
	padding: 8rpx 20rpx;
	border-radius: 24rpx;
	background: $brand-soft;
	color: $brand-ink;

	&.negotiable {
		background: $gray-bg;
		color: $text-sub;
	}
}

.service-price {
	background: $brand-soft;
	color: $brand-ink;
}

.price-text {
	font-size: 28rpx;
	font-weight: 650;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
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
	background: #ece9e2;
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
	min-width: 0;
}

.service-name {
	font-size: 30rpx;
	font-weight: 600;
	color: $text-main;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.verify-badge {
	flex-shrink: 0;
	padding: 2rpx 12rpx;
	border-radius: 10rpx;
	background: $brand-soft;
	color: $brand-ink;
	font-size: 19rpx;
	font-weight: 600;
}

.service-reputation {
	display: block;
	margin-top: 6rpx;
	font-size: 22rpx;
	color: $text-sub;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
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
	color: #655d51;
	max-width: 100%;
	overflow-wrap: anywhere;
}

.badge-urgent {
	background: #ffe9e6;
	color: #e5484d;
	font-weight: 600;
}

.badge-online {
	background: $brand-soft;
	color: $brand-ink;
}

.badge-location {
	background: $gray-bg;
	color: #655d51;
}

.badge-verified {
	background: rgba(194, 160, 82, .22);
	color: $brand-ink;
}

.badge-tag {
	background: $gray-bg;
	color: $text-sub;
}

.badge-neutral {
	background: $gray-bg;
	color: #655d51;
}

.badge-muted {
	background: #ecebe7;
	color: #6f6a63;
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
	color: #d9d5cc;
}

.meta-deadline {
	color: #a1791f;
	font-weight: 600;

	&.expired {
		color: $text-muted;
	}
}

.meta-distance {
	color: #6f6a63;
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
	transition: transform 140ms cubic-bezier(.23, 1, .32, 1), background-color 140ms ease-out;

	&:active {
		transform: scale(.97);
	}

	&.ghost {
		flex: 1;
		background: $gray-bg;
		color: #655d51;
	}

	&.primary {
		flex: 1.3;
		background: $brand-yellow;
		color: $brand-ink;
		font-weight: 600;
	}

	&.primary.done {
		background: #ecebe7;
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
	color: $text-muted;

	&.tappable {
		color: #a1791f;
		font-weight: 600;
	}
}

/* ============ 请求失败状态：与空数据区分开 ============ */
.state-block {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 18rpx;
	padding: 150rpx 60rpx;
}

.state-title {
	font-size: 26rpx;
	color: $text-sub;
	text-align: center;
	line-height: 1.6;
}

.state-btn {
	margin-top: 8rpx;
	padding: 14rpx 44rpx;
	border-radius: 32rpx;
	background: $brand-yellow;
	color: $brand-ink;
	font-size: 25rpx;
	font-weight: 600;
}

.scroll-spacer {
	height: 200rpx;
}

/* 骨架屏 */
.skeleton-card {
	background: $surface;
	border-radius: 24rpx;
	padding: 26rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 10rpx rgba(45, 42, 34, .03);
}

.skeleton-line {
	height: 24rpx;
	border-radius: 12rpx;
	background: #f0eeea;
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
	color: #6f6a63;
	font-weight: 600;
	text-align: center;
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
	background: $brand-soft;
	color: $brand-ink;
	font-size: 25rpx;
	font-weight: 600;
}

/* ============ 悬浮发布按钮（首页 FAB 风格） ============ */
.fab {
	position: fixed;
	right: 32rpx;
	--app-fixed-bottom-base: 120rpx;
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
	box-shadow: 0 8rpx 20rpx rgba(194, 160, 82, .38);
	transition: transform 140ms cubic-bezier(.23, 1, .32, 1);

	&:active {
		transform: scale(.96);
	}
}

.fab-text {
	font-size: 27rpx;
	color: $brand-ink;
	font-weight: 600;
}

/* ============ 底部抽屉（SlideUpPanel 内容） ============ */
.sheet {
	width: 100%;
	background: $surface;
	display: flex;
	flex-direction: column;
	max-height: 84vh;
	box-sizing: border-box;
	overflow: hidden;
}

.publish-sheet {
	max-height: 86vh;
}

.sheet-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	padding: 26rpx 28rpx;
	border-bottom: 1rpx solid $line-color;
	flex-shrink: 0;
}

.sheet-title {
	flex: 1;
	min-width: 0;
	text-align: center;
	font-size: 30rpx;
	font-weight: 600;
	color: $text-main;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.sheet-cancel,
.sheet-close {
	flex-shrink: 0;
	font-size: 27rpx;
	color: $text-sub;
}

.sheet-submit {
	flex-shrink: 0;
	font-size: 26rpx;
	color: $brand-ink;
	font-weight: 600;
	background: $brand-yellow;
	padding: 8rpx 26rpx;
	border-radius: 30rpx;

	&.disabled {
		background: $gray-bg;
		color: $text-muted;
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
	border-radius: 24rpx;
	background: $gray-bg;
	transition: transform 140ms cubic-bezier(.23, 1, .32, 1);

	&:last-child {
		margin-bottom: 0;
	}

	&:active {
		transform: scale(.98);
	}
}

.entry-icon {
	width: 76rpx;
	height: 76rpx;
	border-radius: 50%;
	background: $brand-soft;
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
	font-weight: 600;
	color: $text-main;
	overflow-wrap: anywhere;
}

.entry-desc {
	display: block;
	margin-top: 8rpx;
	font-size: 22rpx;
	color: $text-sub;
	line-height: 1.5;
	overflow-wrap: anywhere;
}

.sheet-body {
	flex: 1;
	min-height: 0;
	padding: 22rpx 28rpx;
	box-sizing: border-box;

	&.static {
		padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
	}
}

.sheet-spacer {
	height: 40rpx;
}

/* ============ 表单控件：统一盒模型，窄屏不溢出 ============ */
.form-block {
	margin-bottom: 30rpx;
	min-width: 0;
}

.form-label {
	display: block;
	margin-bottom: 14rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: $text-main;
	overflow-wrap: anywhere;
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

	// 行内输入框由 flex 决定宽度，避免 width:100% 与同排按钮叠加后撑破容器。
	&.inline {
		flex: 1 1 0;
		width: auto;
		min-width: 0;
	}
}

.form-textarea {
	width: 100%;
	min-height: 160rpx;
	padding: 20rpx 24rpx;
	border-radius: 24rpx;
	background: $gray-bg;
	font-size: 26rpx;
	color: $text-main;
	line-height: 1.55;
	box-sizing: border-box;
	overflow-wrap: anywhere;
}

.form-counter {
	display: block;
	margin-top: 8rpx;
	text-align: right;
	font-size: 21rpx;
	color: $text-muted;
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
	color: #655d51;
	max-width: 100%;
	overflow-wrap: anywhere;

	&.active {
		background: $brand-soft;
		color: $brand-ink;
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
	color: $text-muted;
	line-height: 1.5;
	overflow-wrap: anywhere;
}

.form-inline {
	display: flex;
	align-items: center;
	gap: 16rpx;
	min-width: 0;

	& + .form-chips {
		margin-top: 16rpx;
	}
}

.inline-btn {
	flex-shrink: 0;
	padding: 0 32rpx;
	height: 80rpx;
	line-height: 80rpx;
	border-radius: 40rpx;
	background: $brand-yellow;
	color: $brand-ink;
	font-size: 25rpx;
	font-weight: 600;
}

.form-picker {
	flex: 0 0 auto;
	max-width: 40%;
}

.picker-value {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8rpx;
	height: 80rpx;
	padding: 0 24rpx;
	border-radius: 40rpx;
	background: $gray-bg;
	font-size: 25rpx;
	color: #655d51;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	box-sizing: border-box;

	&.wide {
		width: 100%;
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
	min-width: 0;
}

.switch-label {
	font-size: 25rpx;
	color: $text-main;
}

.switch-hint {
	display: block;
	margin-top: 6rpx;
	font-size: 21rpx;
	color: $text-muted;
	overflow-wrap: anywhere;
}

.form-notice {
	display: flex;
	align-items: flex-start;
	gap: 12rpx;
	padding: 20rpx;
	border-radius: 20rpx;
	background: $gray-bg;
	font-size: 22rpx;
	color: $text-sub;
	line-height: 1.6;

	text {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}
}

.apply-title {
	display: block;
	margin-bottom: 22rpx;
	font-size: 28rpx;
	font-weight: 600;
	color: $text-main;
	line-height: 1.45;
	overflow-wrap: anywhere;
}

/* 毛玻璃只覆盖导航栏与紧邻下缘，滚动时渐显、回到顶部渐隐 */
/* #ifdef H5 */
@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
	.hero-surface {
		background: rgba(246, 245, 242, .82);
		-webkit-backdrop-filter: blur(14px);
		backdrop-filter: blur(14px);
		opacity: 0;
		transition: opacity 200ms ease-out;
	}

	.hero.is-scrolled .hero-surface {
		opacity: 1;
		bottom: -10px;
		-webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 10px), transparent);
		mask-image: linear-gradient(to bottom, #000 calc(100% - 10px), transparent);
	}
}

/* #endif */

@media (min-width: 680px) {
	.hero,
	.filter-bar {
		max-width: 660px;
		width: 100%;
		margin: 0 auto;
	}
}

@media (max-width: 350px) {
	.hero-title {
		font-size: 40rpx;
	}

	.hero-subtitle {
		font-size: 20rpx;
	}
}

@media (prefers-reduced-motion: reduce) {
	.workspace-entry,
	.tab-pill,
	.search-btn,
	.action-btn,
	.fab,
	.entry-item,
	.hero-surface {
		transition: none;
	}

	.workspace-entry:active,
	.tab-pill:active,
	.search-btn:active,
	.action-btn:active,
	.fab:active,
	.entry-item:active {
		transform: none;
	}
}
</style>
