<template>
	<view class="page">
		<view class="header" :class="{ 'search-open': searchOpen }">
			<view class="header-title-wrap"
				><text class="page-title">{{ t('navigation.messages') }}</text></view
			>
			<view class="search-shell">
				<uni-icons
					class="search-trigger"
					type="search"
					size="25"
					color="#171822"
					@tap="toggleSearch"
				/>
				<input
					v-model="searchKeyword"
					class="search-input"
					:focus="searchOpen"
					:placeholder="t('inbox.search')"
					confirm-type="search"
				/>
				<uni-icons
					v-if="searchOpen"
					class="search-close"
					type="closeempty"
					size="20"
					color="#8c9199"
					@tap="closeSearch"
				/>
			</view>
		</view>

		<view v-if="showInteractions" class="row" @click="openInteractions"
			><view class="avatar interaction">⌁</view
			><view class="main"
				><text class="name">{{ t('inbox.interactions') }}</text
				><text class="summary">{{ interactionSummary }}</text></view
			><view class="side"
				><text class="date">{{ interactionDate }}</text
				><text v-if="interactionUnread" class="badge">{{
					badgeText(interactionUnread)
				}}</text></view
			></view
		>
		<view
			v-if="isAdmin && filteredRequests.length"
			class="row"
			@click="openRequestReviews"
			><view class="avatar audit">✓</view
			><view class="main"
				><text class="name">{{ t('inbox.pendingRequests') }}</text
				><text class="summary"
					>{{ t('inbox.requestsWaiting', { count: filteredRequests.length }) }}</text
				></view
			><view class="side"
				><text class="badge">{{
					badgeText(filteredRequests.length)
				}}</text></view
			></view
		>
		<view
			v-for="group in filteredChatGroups"
			:key="group.id"
			class="row"
			@click="openGroup(group.id)"
			><GroupAvatar
				class="group-list-avatar"
				:avatar-url="group.avatar_url"
				:members="group.members || []"
				:size="47"
			/><view class="main"
				><text class="name">{{ presentGroupName(group.name) }}</text
				><text class="summary">{{
					group.status === "dissolved"
						? t('inbox.dissolved')
						: group.last_message || t('inbox.noMessages')
				}}</text></view
			><view class="side"
				><text v-if="group.last_message_at" class="date">{{
					formatConversationTime(group.last_message_at)
				}}</text
				><text
					v-if="hasUnreadMessages(group.unread_count)"
					class="badge"
					>{{ badgeText(group.unread_count) }}</text
				></view
			></view
		>
		<view v-if="hasSearchKeyword && !hasSearchResults" class="search-empty"
			>{{ t('inbox.noMatching') }}</view
		>
	</view>
</template>
<script setup>
import { computed, ref, watch } from "vue";
import { onHide, onShow, onUnload } from "@dcloudio/uni-app";
import { getNotificationsApi } from "@/api/notifications.js";
import { getChatGroupsApi, getChatRequestsApi } from "@/api/chat.js";
import { refreshUnreadBadge } from "@/utils/unreadBadge.js";
import GroupAvatar from "@/components/chat/GroupAvatar.vue";
import { presentGroupName } from "@/utils/chatGroupPresentation.js";
import { formatConversationTime } from "@/utils/chatMessagePresentation.js";
import { hasUnreadMessages } from "@/utils/unreadBadgeState.js";
import { currentLocale, t, updateTabBarLocale } from '@/utils/localeRuntime.js';

const notifications = ref([]),
	chatGroups = ref([]),
	requests = ref([]);
const searchOpen = ref(false),
	searchKeyword = ref("");
const isAdmin = Number(uni.getStorageSync("USER_INFO")?.accountLevel) === 5;
const interactions = computed(() =>
	notifications.value.filter((item) => item.type !== "chat_request"),
);
const interactionUnread = computed(
	() => interactions.value.filter((item) => !item.is_read).length,
);
const latest = computed(() => interactions.value[0]);
const interactionSummary = computed(() =>
	latest.value
		? `${latest.value.actor_name || latest.value.actor_email || t('inbox.user')} ${latest.value.type.includes("comment") ? t('inbox.commented') : t('inbox.liked')}`
		: t('inbox.noInteractions'),
);
const interactionDate = computed(() =>
	latest.value?.created_at
		? new Date(latest.value.created_at).toLocaleDateString()
		: "",
);
const hasSearchKeyword = computed(() => Boolean(searchKeyword.value.trim()));
const showInteractions = computed(
	() =>
		!hasSearchKeyword.value ||
		matchesSearch(t('inbox.interactions'), interactionSummary.value),
);
const filteredRequests = computed(() =>
	requests.value.filter(() =>
		matchesSearch(
			t('inbox.pendingRequests'),
			t('inbox.requestsWaiting', { count: requests.value.length }),
		),
	),
);
const filteredChatGroups = computed(() =>
	chatGroups.value.filter((group) =>
		matchesSearch(
			presentGroupName(group.name),
			group.status === "dissolved"
				? t('inbox.dissolved')
				: group.last_message || t('inbox.noMessages'),
		),
	),
);
const hasSearchResults = computed(
	() =>
		showInteractions.value ||
		filteredRequests.value.length > 0 ||
		filteredChatGroups.value.length > 0,
);

function matchesSearch(...values) {
	const keyword = searchKeyword.value.trim().toLocaleLowerCase();
	return (
		!keyword ||
		values.some((value) =>
			String(value || "")
				.toLocaleLowerCase()
				.includes(keyword),
		)
	);
}
function toggleSearch() {
	searchOpen.value = true;
}
function closeSearch() {
	searchOpen.value = false;
	searchKeyword.value = "";
}
function badgeText(value) {
	return Number(value) > 99 ? "99+" : String(value);
}
function openInteractions() {
	uni.navigateTo({ url: "/pages/notice/interactionMessages" });
}
function openGroup(id) {
	uni.navigateTo({ url: `/pages/chat/chatRoom?id=${id}` });
}
function openRequestReviews() {
	uni.navigateTo({ url: "/pages/notice/chatRequestReview" });
}
async function load() {
	try {
		const [noticeData, groupData] = await Promise.all([
			getNotificationsApi({ page: 1, pageSize: 50 }),
			getChatGroupsApi(),
		]);
		notifications.value = noticeData?.notifications || [];
		chatGroups.value = groupData?.groups || [];
		if (isAdmin) {
			const requestData = await getChatRequestsApi();
			requests.value = (requestData?.requests || []).filter(
				(item) =>
					item.status === "pending" || item.status === "processing",
			);
		}
		await refreshUnreadBadge();
	} catch (error) {
		console.error("加载消息失败", error);
	}
}
let messagePollTimer = null;
function startMessagePolling() {
	if (!messagePollTimer) messagePollTimer = setInterval(load, 5000);
}
function stopMessagePolling() {
	if (messagePollTimer) {
		clearInterval(messagePollTimer);
		messagePollTimer = null;
	}
}
onShow(() => {
	updateTabBarLocale();
	uni.setNavigationBarTitle({ title: t('navigation.messages') });
	load();
	startMessagePolling();
});
onHide(stopMessagePolling);
onUnload(stopMessagePolling);
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('navigation.messages') }));
</script>
<style scoped lang="scss">
.page {
	min-height: 100vh;
	background: #fff;
	color: #171822;
}
.header {
	display: flex;
	flex-flow: row wrap;
	align-items: center;
	padding: 28rpx 32rpx 22rpx;
}
.header-title-wrap {
	order: 1;
	flex: 1;
	transition:
		transform 180ms ease,
		opacity 180ms ease;
}
.page-title {
	font-size: 42rpx;
	font-weight: 700;
}
.search-shell {
	order: 2;
	display: flex;
	width: 64rpx;
	height: 64rpx;
	align-items: center;
	justify-content: flex-end;
	overflow: hidden;
	border-radius: 28rpx;
	background: transparent;
	transition:
		width 720ms ease,
		opacity 180ms ease,
		transform 720ms ease;
}
.search-trigger {
	flex: 0 0 52rpx;
	text-align: center;
}
.search-input {
	min-width: 0;
	max-width: 0;
	height: 64rpx;
	flex: 1;
	opacity: 0;
	color: #171822;
	font-size: 27rpx;
	transition:
		max-width 720ms ease,
		opacity 180ms ease;
}
.search-close {
	flex: 0 0 52rpx;
	text-align: center;
}
.search-open .search-shell {
	order: 1;
	width: 100%;
	justify-content: flex-start;
	background: #f3f4f5;
	transform: translateX(0);
}
.search-open .search-input {
	max-width: 100%;
	opacity: 1;
}
.search-open .header-title-wrap {
	order: 2;
	flex-basis: 100%;
	padding-top: 20rpx;
	transform: translateY(4rpx);
	opacity: 0.92;
}
.row {
	display: flex;
	align-items: center;
	gap: 22rpx;
	padding: 26rpx 30rpx;
	border-bottom: 1rpx solid #f1f1f1;
}
.avatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 94rpx;
	height: 94rpx;
	flex: 0 0 94rpx;
	border-radius: 50%;
	color: #fff;
	font-size: 44rpx;
	font-weight: 700;
}
.group-list-avatar {
	flex: 0 0 94rpx;
}
.interaction {
	background: #ff3b87;
}
.audit {
	background: #ffb728;
	font-size: 32rpx;
}
.main {
	min-width: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}
.name {
	font-size: 31rpx;
	font-weight: 700;
}
.summary {
	overflow: hidden;
	color: #999;
	font-size: 26rpx;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.side {
	display: flex;
	min-width: 48rpx;
	align-items: flex-end;
	flex-direction: column;
	gap: 12rpx;
}
.date {
	color: #bbb;
	font-size: 21rpx;
}
.badge {
	display: flex;
	min-width: 34rpx;
	height: 34rpx;
	padding: 0 6rpx;
	align-items: center;
	justify-content: center;
	border-radius: 20rpx;
	background: #ff3a5d;
	color: #fff;
	font-size: 21rpx;
}
.search-empty {
	padding: 92rpx 0;
	color: #9aa0a8;
	text-align: center;
	font-size: 27rpx;
}
</style>
