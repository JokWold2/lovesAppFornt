<template>
	<view class="page">
		<view class="room-head"
			><GroupAvatar :avatar-url="groupAvatarUrl" :members="members" :size="36" />
			><text class="group-name">{{ groupName || "群聊" }}</text
			><text
				v-if="isGroupAdmin && groupStatus === 'active'"
				class="group-manage"
				@tap="openGroupManage"
				>群管理</text
			></view
		>
		<scroll-view
			class="messages"
			scroll-y
			:scroll-with-animation="scrollWithAnimation"
			:scroll-into-view="scrollIntoView"
			:upper-threshold="80"
			@scroll="onMessageScroll"
			@scrolltoupper="loadOlderMessages"
			@scrolltolower="atBottom = true"
		>
			<view v-if="loadingOlder" class="history-loading"><text>加载中…</text></view>
			<template>
				<view v-for="item in displayItems" :key="item.key">
					<view v-if="item.kind === 'time'" class="time-divider">{{
						item.label
					}}</view>
					<ChatMessageBubble
						v-else
						:id="`message-${item.message.id}`"
						:message="item.message"
						:mine="Number(item.message.sender_user_id) === myId"
						@message-long-press="openLongPressMenu"
						@preview-image="previewImage"
					/>
				</view>
			</template>
			<view v-if="!loading && !messages.length" class="empty"
				>还没有消息，开始聊聊吧</view
			>
			<view id="messages-end" class="messages-end" />
		</scroll-view>
		<view
			v-if="latestButtonVisible"
			class="back-to-latest"
			:class="{ 'back-to-latest-leaving': latestButtonLeaving }"
			:style="{ bottom: `${keyboardHeight + 88}px` }"
			@tap="returnToLatest"
			><text class="latest-chevron">⌄</text><text class="latest-chevron">⌄</text></view
		>
		<ChatComposer
			v-if="isGroupMember && groupStatus === 'active'"
			:members="members"
			:reply-message="replyMessage"
			:disabled="sending"
			:keyboard-height="keyboardHeight"
			@send="sendMessage"
			@select-image="sendImage"
			@close-reply="replyMessage = null"
			@keyboard-height="setKeyboardHeight"
			@focus="scrollToLast"
		/>
		<view v-else-if="isGroupMember" class="dissolved-note">该群已解散，仅可查看历史消息</view>
		<ChatLongPressMenu
			:visible="Boolean(menuMessage)"
			:message="menuMessage"
			:anchor="menuAnchor"
			@close="closeLongPressMenu"
			@reply="startReply"
		/>
	</view>
</template>

<script setup>
import { computed, nextTick, ref } from "vue";
import { onHide, onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import {
	getChatGroupMembersApi,
	getChatGroupsApi,
	getChatMessagesApi,
	sendChatMessageApi,
	uploadChatImageApi,
} from "@/api/chat.js";
import ChatComposer from "@/components/chat/ChatComposer.vue";
import ChatLongPressMenu from "@/components/chat/ChatLongPressMenu.vue";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble.vue";
import GroupAvatar from "@/components/chat/GroupAvatar.vue";
import {
	buildChatDisplayItems,
	mergeChatMessages,
	shouldStickToBottom,
} from "@/utils/chatMessageListState.js";
import {
	attachReplyMessage,
	unwrapComponentEventPayload,
} from "@/utils/chatComposerState.js";
import { refreshUnreadBadge } from "@/utils/unreadBadge.js";

const groupId = ref("");
const messages = ref([]);
const members = ref([]);
const isGroupAdmin = ref(false);
const isGroupMember = ref(false);
const scrollIntoView = ref("");
const scrollWithAnimation = ref(false);
const groupName = ref("");
const groupAvatarUrl = ref("");
const groupStatus = ref("active");
const replyMessage = ref(null);
const menuMessage = ref(null);
const menuAnchor = ref(null);
const keyboardHeight = ref(0);
const sending = ref(false);
const atBottom = ref(true);
const loading = ref(false);
const loadingOlder = ref(false);
const hasOlderMessages = ref(true);
const latestButtonVisible = ref(false);
const latestButtonLeaving = ref(false);
const myId = Number(uni.getStorageSync("USER_INFO")?.id);
const viewportHeight = Math.max(
	0,
	Number(uni.getSystemInfoSync?.().windowHeight || 700) - 150,
);
let pollTimer = null;
let latestButtonTimer = null;
let latestButtonLeaveTimer = null;
let forceScrollAfterLoad = true;
let hasLoadedInitialMessages = false;
const messagePageSize = 15;
const displayItems = computed(() => buildChatDisplayItems(messages.value));

function scrollToLast({ animated = true } = {}) {
	if (!messages.value.length) return;
	// Reset first because setting the same target twice does not re-scroll in WeChat.
	scrollWithAnimation.value = animated;
	scrollIntoView.value = "";
	nextTick(() => {
		scrollIntoView.value = "messages-end";
	});
}
async function load({ silent = false } = {}) {
	if (!groupId.value || loading.value) return;
	loading.value = true;
	try {
		const [messageData, groupData, memberData] = await Promise.all([
		getChatMessagesApi(groupId.value, { limit: messagePageSize }),
			getChatGroupsApi(),
			getChatGroupMembersApi(groupId.value),
		]);
		const incomingMessages = messageData?.messages || [];
		messages.value = hasLoadedInitialMessages
			? mergeChatMessages(messages.value, incomingMessages)
			: incomingMessages;
		hasOlderMessages.value = hasLoadedInitialMessages
			? hasOlderMessages.value
			: Boolean(messageData?.hasMore);
		members.value = memberData?.members || [];
		const group = (groupData?.groups || []).find(
			(item) => Number(item.id) === Number(groupId.value),
		);
		isGroupMember.value = Boolean(group);
		isGroupAdmin.value = group?.role === "admin";
		groupName.value = group?.name || "";
		groupAvatarUrl.value = group?.avatar_url || "";
		groupStatus.value = group?.status || "active";
		if (forceScrollAfterLoad || atBottom.value) {
			scrollToLast({ animated: hasLoadedInitialMessages });
		}
		forceScrollAfterLoad = false;
		hasLoadedInitialMessages = true;
		refreshUnreadBadge().catch((error) =>
			console.warn("刷新未读角标失败", error),
		);
	} catch (error) {
		if (!silent)
			uni.showToast({
				title: error?.error || "加载群聊失败",
				icon: "none",
			});
	} finally {
		loading.value = false;
	}
}
async function loadOlderMessages() {
	if (!hasOlderMessages.value || loadingOlder.value || !messages.value.length) return;
	loadingOlder.value = true;
	try {
		const oldestMessage = messages.value[0];
		const data = await getChatMessagesApi(groupId.value, {
			limit: messagePageSize,
			beforeId: oldestMessage.id,
		});
		messages.value = mergeChatMessages(messages.value, data?.messages || []);
		hasOlderMessages.value = Boolean(data?.hasMore);
	} catch (error) {
		uni.showToast({ title: error?.error || "加载历史消息失败", icon: "none" });
	} finally {
		loadingOlder.value = false;
	}
}
function onMessageScroll(event) {
	atBottom.value = shouldStickToBottom({
		scrollTop: event.detail.scrollTop,
		scrollHeight: event.detail.scrollHeight,
		viewportHeight: Math.max(0, viewportHeight - keyboardHeight.value),
	});
	if (!atBottom.value) showLatestButton();
}
function showLatestButton() {
	latestButtonVisible.value = true;
	latestButtonLeaving.value = false;
	clearTimeout(latestButtonTimer);
	clearTimeout(latestButtonLeaveTimer);
	latestButtonTimer = setTimeout(hideLatestButton, 3000);
}
function hideLatestButton() {
	latestButtonLeaving.value = true;
	latestButtonLeaveTimer = setTimeout(() => {
		latestButtonVisible.value = false;
		latestButtonLeaving.value = false;
	}, 260);
}
function returnToLatest() {
	atBottom.value = true;
	clearTimeout(latestButtonTimer);
	clearTimeout(latestButtonLeaveTimer);
	latestButtonVisible.value = false;
	latestButtonLeaving.value = false;
	scrollToLast({ animated: true });
}
function startPolling() {
	if (!pollTimer) pollTimer = setInterval(() => load({ silent: true }), 5000);
}
function stopPolling() {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
}
function setKeyboardHeight(event) {
	keyboardHeight.value = Math.max(
		0,
		Number(unwrapComponentEventPayload(event)) || 0,
	);
	if (keyboardHeight.value) nextTick(() => scrollToLast({ animated: true }));
}
function closeLongPressMenu() {
	menuMessage.value = null;
	menuAnchor.value = null;
}
function openLongPressMenu(event) {
	const payload = unwrapComponentEventPayload(event);
	menuMessage.value = payload?.message || payload;
	menuAnchor.value = payload?.anchor || null;
}
function startReply(message) {
	replyMessage.value = unwrapComponentEventPayload(message);
	closeLongPressMenu();
}
function previewImage(url) {
	uni.previewImage({ urls: [url], current: url });
}
function openGroupManage() {
	uni.navigateTo({ url: `/pages/chat/groupManage?id=${groupId.value}` });
}
async function sendMessage(payload) {
	if (sending.value) return;
	sending.value = true;
	try {
		await sendChatMessageApi(
			groupId.value,
			attachReplyMessage(payload, replyMessage.value),
		);
		replyMessage.value = null;
		forceScrollAfterLoad = true;
		await load({ silent: true });
	} catch (error) {
		uni.showToast({ title: error?.error || "发送失败", icon: "none" });
	} finally {
		sending.value = false;
	}
}
async function sendImage({ imagePath }) {
	if (sending.value) return;
	sending.value = true;
	uni.showLoading({ title: "图片上传中" });
	try {
		const uploaded = await uploadChatImageApi(groupId.value, imagePath);
		await sendChatMessageApi(groupId.value, {
			content: "",
			messageType: "image",
			mediaUrl: uploaded.url,
			mentions: [],
			replyToMessageId: replyMessage.value?.id || null,
		});
		replyMessage.value = null;
		forceScrollAfterLoad = true;
		await load({ silent: true });
	} catch (error) {
		uni.showToast({ title: error?.error || "图片上传失败", icon: "none" });
	} finally {
		uni.hideLoading();
		sending.value = false;
	}
}
onLoad((options) => {
	groupId.value = options.id;
});
onShow(() => {
	forceScrollAfterLoad = true;
	load();
	startPolling();
});
	onHide(() => {
	keyboardHeight.value = 0;
	clearTimeout(latestButtonTimer);
	clearTimeout(latestButtonLeaveTimer);
	stopPolling();
});
onUnload(() => {
	clearTimeout(latestButtonTimer);
	clearTimeout(latestButtonLeaveTimer);
	stopPolling();
});
</script>

<style scoped>
.page {
	height: 100vh;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: #efefef;
}
.room-head {
	display: flex;
	align-items: center;
	gap: 14rpx;
	padding: 18rpx 24rpx;
	background: #f6f7f8;
}
.group-name {
	flex: 1;
	overflow: hidden;
	color: #1d2230;
	font-size: 30rpx;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.group-manage {
	padding: 10rpx 14rpx;
	border-radius: 14rpx;
	color: #1768ae;
	background: #fff;
	font-size: 24rpx;
}
.messages {
	flex: 1;
	min-height: 0;
	box-sizing: border-box;
	padding: 16rpx 24rpx;
}
.time-divider {
	margin: 22rpx auto;
	color: #7d838c;
	text-align: center;
	font-size: 23rpx;
}
.empty {
	padding-top: 160rpx;
	color: #8a8f96;
	text-align: center;
	font-size: 28rpx;
}
.messages-end {
	height: 1px;
}
.history-loading {
	padding: 18rpx 0;
	color: #7d838c;
	text-align: center;
	font-size: 23rpx;
}
.back-to-latest {
	position: absolute;
	left: 50%;
	z-index: 4;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 76rpx;
	height: 76rpx;
	border-radius: 50%;
	color: #1d2230;
	background: #fff;
	box-shadow: 0 8rpx 18rpx rgba(34, 40, 51, 0.16);
	transform: translateX(-50%);
	transition: transform 260ms ease-in, opacity 260ms ease-in;
}
.latest-chevron {
	display: block;
	height: 24rpx;
	font-size: 52rpx;
	font-weight: 600;
	line-height: 20rpx;
}
.latest-chevron + .latest-chevron {
	margin-top: -2rpx;
}
.back-to-latest-leaving {
	opacity: 0;
	transform: translate(-50%, 72rpx);
}
.dissolved-note {
	flex: 0 0 auto;
	padding: 24rpx;
	color: #7d838c;
	background: #f7f8f9;
	text-align: center;
	font-size: 25rpx;
}
</style>
