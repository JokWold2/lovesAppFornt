<template>
	<view class="page app-h5-screen">
		<view class="room-head">
			<GroupAvatar :avatar-url="groupAvatarUrl" :members="members" :size="36" />
			<view class="group-copy"><text class="group-name">{{ groupName || t('inbox.groupChat') }}</text><text class="online-count" @tap="openOnlineMembers">{{ onlineLabel }}</text></view>
			<text
				v-if="isGroupAdmin && groupStatus === 'active'"
				class="group-manage"
				@tap="openGroupManage"
			>{{ t('inbox.groupManage') }}</text>
		</view>
		<!-- #ifdef H5 -->
		<view ref="h5MessagesRef" class="messages messages--h5 app-h5-scroll" @scroll="onH5MessageScroll">
			<view v-if="loadingOlder" class="history-loading"><text>{{ t('inbox.loading') }}</text></view>
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
					@show-read-members="openReadMembers"
				/>
			</view>
			<view v-if="!loading && !messages.length" class="empty"
				>{{ t('inbox.emptyChat') }}</view
			>
			<view class="messages-end" />
		</view>
		<!-- #endif -->
		<!-- #ifndef H5 -->
		<scroll-view
			class="messages"
			scroll-y
			:scroll-top="scrollTop"
			:scroll-with-animation="scrollWithAnimation"
			:scroll-into-view="scrollIntoView"
			:upper-threshold="80"
			@scroll="onMessageScroll"
			@scrolltoupper="loadOlderMessages"
			@scrolltolower="atBottom = true"
		>
			<view v-if="loadingOlder" class="history-loading"><text>{{ t('inbox.loading') }}</text></view>
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
						@show-read-members="openReadMembers"
					/>
				</view>
			</template>
			<view v-if="!loading && !messages.length" class="empty"
				>{{ t('inbox.emptyChat') }}</view
			>
			<view id="messages-end" class="messages-end" />
		</scroll-view>
		<!-- #endif -->
		<view
			v-if="latestButtonVisible"
			class="back-to-latest"
			:class="{ 'back-to-latest-leaving': latestButtonLeaving }"
			:style="{ bottom: `${latestButtonBottomOffset}px` }"
			@tap="returnToLatest"
			><text class="latest-chevron">⌄</text><text class="latest-chevron">⌄</text></view
		>
		<ChatComposer
			v-if="isGroupMember && groupStatus === 'active'"
			:members="members"
			:reply-message="replyMessage"
			:disabled="sending"
			:keyboard-height="composerKeyboardHeight"
			@send="sendMessage"
			@select-image="sendImage"
			@close-reply="replyMessage = null"
			@keyboard-height="setKeyboardHeight"
			@focus="scrollToLast"
		/>
		<view v-else-if="isGroupMember" class="dissolved-note">{{ t('inbox.dissolvedNote') }}</view>
		<ChatLongPressMenu
			:visible="Boolean(menuMessage)"
			:message="menuMessage"
			:anchor="menuAnchor"
			@close="closeLongPressMenu"
			@reply="startReply"
		/>
		<GroupMemberSheet :visible="Boolean(memberSheet)" :title="memberSheetTitle" :members="memberSheetMembers" :unread-members="memberSheetUnreadMembers" @close="closeMemberSheet" />
	</view>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { onHide, onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import {
	getChatGroupMembersApi,
	getChatGroupOnlineMembersApi,
	getChatGroupsApi,
	getChatMessagesApi,
	sendChatMessageApi,
	uploadChatImageApi,
} from "@/api/chat.js";
import ChatComposer from "@/components/chat/ChatComposer.vue";
import ChatLongPressMenu from "@/components/chat/ChatLongPressMenu.vue";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble.vue";
import GroupAvatar from "@/components/chat/GroupAvatar.vue";
import GroupMemberSheet from "@/components/chat/GroupMemberSheet.vue";
import {
	buildChatDisplayItems,
	mergeChatMessages,
	shouldAutoScrollOnChatLoad,
	shouldLoadOlderMessagesFromH5Scroll,
	shouldShowChatLatestButton,
	shouldStickToBottomAfterChatLoad,
	shouldStickToBottom,
} from "@/utils/chatMessageListState.js";
import {
	attachReplyMessage,
	unwrapComponentEventPayload,
} from "@/utils/chatComposerState.js";
import { presentGroupName } from "@/utils/chatGroupPresentation.js";
import { refreshUnreadBadge } from "@/utils/unreadBadge.js";
import { currentLocale, t } from '@/utils/localeRuntime.js';

const groupId = ref("");
const messages = ref([]);
const members = ref([]);
const onlineMembers = ref([]);
const memberSheet = ref(null);
const memberSheetMembers = ref([]);
const memberSheetUnreadMembers = ref(null);
const isGroupAdmin = ref(false);
const isGroupMember = ref(false);
const scrollTop = ref(0);
const scrollIntoView = ref("");
const scrollWithAnimation = ref(false);
const h5MessagesRef = ref(null);
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
const h5UserScrolledAwayFromBottom = ref(false);
const myId = Number(uni.getStorageSync("USER_INFO")?.id);
const viewportHeight = Math.max(
	0,
	Number(uni.getSystemInfoSync?.().windowHeight || 700) - 150,
);
// #ifdef H5
const composerKeyboardHeight = computed(() => 0);
const latestButtonBottomOffset = computed(() => 128);
// #endif
// #ifndef H5
const composerKeyboardHeight = computed(() => keyboardHeight.value);
const latestButtonBottomOffset = computed(() => Number(keyboardHeight.value) + 88);
// #endif
let pollTimer = null;
let latestButtonTimer = null;
let latestButtonLeaveTimer = null;
let forceScrollAfterLoad = true;
let forceScrollReason = "initial";
let hasLoadedInitialMessages = false;
const messagePageSize = 15;
const displayItems = computed(() => buildChatDisplayItems(messages.value));
const onlineLabel = computed(() => `${onlineMembers.value.length} ${t('inbox.onlineMembers')}`);
const memberSheetTitle = computed(() => memberSheet.value === 'read' ? t('inbox.readMembers') : t('inbox.onlineMembers'));

function getH5MessagesElement() {
	let element = h5MessagesRef.value?.$el || h5MessagesRef.value;
	if (!element && typeof document !== "undefined") {
		element = document.querySelector(".messages--h5");
	}
	return element || null;
}

function captureH5ScrollState() {
	const element = getH5MessagesElement();
	if (!element) return null;
	return {
		scrollTop: Number(element.scrollTop) || 0,
		scrollHeight: Number(element.scrollHeight) || 0,
		clientHeight: Number(element.clientHeight) || 0,
	};
}

function restoreH5ScrollState(snapshot) {
	if (!snapshot) return;
	nextTick(() => {
		const element = getH5MessagesElement();
		if (!element) return;
		const maxScrollTop = Math.max(0, (Number(element.scrollHeight) || 0) - (Number(element.clientHeight) || 0));
		const nextScrollTop = Number(snapshot.scrollTop) || 0;
		element.scrollTo({
			top: Math.min(maxScrollTop, Math.max(0, nextScrollTop)),
			behavior: "auto",
		});
	});
}

function scrollToLast({ animated = true } = {}) {
	if (!messages.value.length) return;
	// #ifdef H5
	nextTick(() => {
		const element = h5MessagesRef.value?.$el || h5MessagesRef.value;
		if (!element) return;
		element.scrollTo({
			top: element.scrollHeight,
			behavior: animated ? "smooth" : "auto",
		});
	});
	return;
	// #endif
	// #ifndef H5
	// Reset first because setting the same target twice does not re-scroll in WeChat.
	scrollWithAnimation.value = animated;
	scrollIntoView.value = "";
	nextTick(() => {
		scrollIntoView.value = "messages-end";
	});
	// #endif
}
async function load({ silent = false } = {}) {
	if (!groupId.value || loading.value) return;
	// #ifdef H5
	const preLoadH5ScrollState = captureH5ScrollState();
	const preLoadAtBottom = preLoadH5ScrollState
		? shouldStickToBottom({
			scrollTop: preLoadH5ScrollState.scrollTop,
			scrollHeight: preLoadH5ScrollState.scrollHeight,
			viewportHeight: preLoadH5ScrollState.clientHeight,
		})
		: true;
	// #endif
	loading.value = true;
	try {
		const [messageData, groupData, memberData] = await Promise.all([
		getChatMessagesApi(groupId.value, { limit: messagePageSize }),
			getChatGroupsApi(),
			getChatGroupMembersApi(groupId.value),
		]);
		const incomingMessages = messageData?.messages || messageData?.data?.messages || [];
		messages.value = hasLoadedInitialMessages
			? mergeChatMessages(messages.value, incomingMessages)
			: mergeChatMessages([], incomingMessages);
		hasOlderMessages.value = hasLoadedInitialMessages
			? hasOlderMessages.value
			: Boolean(messageData?.hasMore ?? messageData?.data?.hasMore);
		members.value = memberData?.members || [];
		void loadOnlineMembers({ silent: true });
		const group = (groupData?.groups || []).find(
			(item) => Number(item.id) === Number(groupId.value),
		);
		isGroupMember.value = Boolean(group);
		isGroupAdmin.value = group?.role === "admin";
		groupName.value = presentGroupName(group?.name);
		console.log(groupName.value, "groupName.value");

		groupAvatarUrl.value = group?.avatar_url || "";
		groupStatus.value = group?.status || "active";
		const shouldForceAfterSending = forceScrollAfterLoad && forceScrollReason === "send";
		// #ifdef H5
		const h5UserScrolled = h5UserScrolledAwayFromBottom.value;
		const h5AtBottom = atBottom.value;
		// #endif
		const shouldAutoScroll = shouldForceAfterSending || (
			// #ifdef H5
			shouldStickToBottomAfterChatLoad({
				forceScroll: forceScrollAfterLoad,
				requestStartedAtBottom: preLoadAtBottom,
				atBottom: h5AtBottom,
				userScrolled: h5UserScrolled,
			})
			// #endif
			// #ifndef H5
			shouldAutoScrollOnChatLoad({
				forceScroll: forceScrollAfterLoad,
				atBottom: atBottom.value,
				userScrolled: h5UserScrolledAwayFromBottom.value,
			})
			// #endif
		);
		if (shouldAutoScroll) {
			// H5 background refresh must not keep a smooth-scroll animation alive
			// while the user is reading older messages.
			// #ifdef H5
			scrollToLast({ animated: false });
			// #endif
			// #ifndef H5
			scrollToLast({ animated: hasLoadedInitialMessages });
			// #endif
			// #ifdef H5
			h5UserScrolledAwayFromBottom.value = false;
			// #endif
		} else {
			// #ifdef H5
			h5UserScrolledAwayFromBottom.value = !h5AtBottom;
			if (!preLoadAtBottom) restoreH5ScrollState(preLoadH5ScrollState);
			// #endif
		}
		forceScrollAfterLoad = false;
		forceScrollReason = null;
		hasLoadedInitialMessages = true;
		refreshUnreadBadge().catch((error) =>
			console.warn("刷新未读角标失败", error),
		);
	} catch (error) {
		if (!silent)
			uni.showToast({
				title: error?.error || t('inbox.loadChatFailed'),
				icon: "none",
			});
	} finally {
		loading.value = false;
	}
}

async function loadOnlineMembers({ silent = false } = {}) {
	if (!groupId.value) return;
	try {
		const data = await getChatGroupOnlineMembersApi(groupId.value);
		onlineMembers.value = data?.members || [];
		if (memberSheet.value === 'online') memberSheetMembers.value = onlineMembers.value;
	} catch (error) {
		if (!silent) uni.showToast({ title: error?.error || t('inbox.loadOnlineFailed'), icon: 'none' });
	}
}

async function openOnlineMembers() {
	memberSheet.value = 'online';
	memberSheetMembers.value = onlineMembers.value;
	await loadOnlineMembers();
}

function openReadMembers(message) {
	memberSheet.value = 'read';
	memberSheetMembers.value = message?.readBy || [];
	memberSheetUnreadMembers.value = message?.unreadBy || [];
}

function closeMemberSheet() {
	memberSheet.value = null;
	memberSheetMembers.value = [];
	memberSheetUnreadMembers.value = null;
}
async function loadOlderMessages() {
	if (!hasOlderMessages.value || loadingOlder.value || !messages.value.length) return;
	// #ifdef H5
	const previousH5ScrollState = captureH5ScrollState();
	// #endif
	loadingOlder.value = true;
	try {
		const oldestMessage = messages.value[0];
		const data = await getChatMessagesApi(groupId.value, {
			limit: messagePageSize,
			beforeId: oldestMessage.id,
		});
		messages.value = mergeChatMessages(messages.value, data?.messages || data?.data?.messages || []);
		hasOlderMessages.value = Boolean(data?.hasMore ?? data?.data?.hasMore);
		// #ifdef H5
		if (previousH5ScrollState) {
			nextTick(() => {
				const element = getH5MessagesElement();
				if (!element) return;
				element.scrollTop = previousH5ScrollState.scrollTop
					+ Math.max(0, (Number(element.scrollHeight) || 0) - previousH5ScrollState.scrollHeight);
			});
		}
		// #endif
	} catch (error) {
		uni.showToast({ title: error?.error || t('inbox.loadHistoryFailed'), icon: "none" });
	} finally {
		loadingOlder.value = false;
	}
}
function onMessageScroll(event) {
	scrollTop.value = event.detail.scrollTop;
	atBottom.value = shouldStickToBottom({
		scrollTop: event.detail.scrollTop,
		scrollHeight: event.detail.scrollHeight,
		viewportHeight: Math.max(0, viewportHeight - keyboardHeight.value),
	});
	if (!atBottom.value) showLatestButton();
}
function updateMessageScrollState({ scrollTop, scrollHeight, clientHeight }) {
	atBottom.value = shouldStickToBottom({
		scrollTop,
		scrollHeight,
		viewportHeight: clientHeight,
	});
	h5UserScrolledAwayFromBottom.value = !atBottom.value;
	if (shouldShowChatLatestButton({ atBottom: atBottom.value })) {
		showLatestButton();
	} else {
		latestButtonVisible.value = false;
		latestButtonLeaving.value = false;
	}
	if (shouldLoadOlderMessagesFromH5Scroll({
		scrollTop,
		hasOlderMessages: hasOlderMessages.value,
		loadingOlder: loadingOlder.value,
	})) void loadOlderMessages();
}

function onH5MessageScroll(event) {
	const target = event?.currentTarget || event?.target || h5MessagesRef.value;
	updateMessageScrollState({
		scrollTop: Number(target?.scrollTop || 0),
		scrollHeight: Number(target?.scrollHeight || 0),
		clientHeight: Number(target?.clientHeight || 0),
	});
}
function showLatestButton() {
	latestButtonVisible.value = true;
	latestButtonLeaving.value = false;
	clearTimeout(latestButtonTimer);
	clearTimeout(latestButtonLeaveTimer);
	// #ifdef H5
	return;
	// #endif
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
	h5UserScrolledAwayFromBottom.value = false;
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
		forceScrollReason = "send";
		await load({ silent: true });
	} catch (error) {
		uni.showToast({ title: error?.error || t('inbox.sendFailed'), icon: "none" });
	} finally {
		sending.value = false;
	}
}
async function sendImage({ imagePath }) {
	if (sending.value) return;
	sending.value = true;
	uni.showLoading({ title: t('inbox.uploadingImage') });
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
		forceScrollReason = "send";
		await load({ silent: true });
	} catch (error) {
		uni.showToast({ title: error?.error || t('inbox.uploadImageFailed'), icon: "none" });
	} finally {
		uni.hideLoading();
		sending.value = false;
	}
}
onLoad((options) => {
	groupId.value = options.id;
});
onShow(() => {
	uni.setNavigationBarTitle({ title: t('inbox.groupChat') });
	latestButtonVisible.value = false;
	latestButtonLeaving.value = false;
	forceScrollAfterLoad = true;
	forceScrollReason = "initial";
	h5UserScrolledAwayFromBottom.value = false;
	load();
	startPolling();
});
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('inbox.groupChat') }));
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
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: #efefef;
}
/* #ifndef H5 */
.page {
	height: 100vh;
}
/* #endif */
/* #ifdef H5 */
.messages--h5 {
	width: 100%;
}
/* #endif */
.room-head {
	display: flex;
	align-items: center;
	gap: 14rpx;
	padding: 18rpx 24rpx;
	background: #f6f7f8;
}
.group-copy { display: flex; flex: 1; flex-direction: column; min-width: 0; gap: 4rpx; }
.group-name {
	overflow: hidden;
	color: #1d2230;
	font-size: 30rpx;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.online-count { align-self: flex-start; color: #7d838c; font-size: 22rpx; }
.group-manage {
	padding: 10rpx 14rpx;
	border-radius: 14rpx;
	color: #73747b;
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
	z-index: 9999;
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
	pointer-events: auto;
}
/* #ifdef H5 */
.back-to-latest {
	position: fixed;
}
/* #endif */
.latest-chevron {
	display: block;
	font-size: 36rpx;
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
