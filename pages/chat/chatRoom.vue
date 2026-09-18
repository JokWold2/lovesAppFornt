<template>
	<view class="page app-h5-screen">
		<ChatPageHeader :avatar-header="true">
      <view class="group-copy">
        <GroupAvatar :avatar-url="groupAvatarUrl" :members="members" :size="54" />
        <text class="group-name">{{ groupName || t('inbox.groupChat') }}</text>
        <view class="group-subtitle"><text>{{ t('group.memberCount', { count: members.length }) }}</text><text class="online-count" @tap="openOnlineMembers">· {{ onlineLabel }}</text></view>
      </view>
      <template #action><GlassCircleButton v-if="isGroupMember" class="group-manage" :label="t('inbox.groupManage')" @tap="openGroupManage"><view class="more-dots"><view /><view /><view /></view></GlassCircleButton></template>
    </ChatPageHeader>
    <view class="messages-area">
		<!-- #ifdef H5 -->
		<scroll-view
			ref="h5MessagesRef"
			class="messages messages--h5"
			scroll-y
			:upper-threshold="60"
      :bounces="false"
      @touchstart="onScrollTouchStart"
      @touchend="onScrollTouchEnd"
      @touchcancel="onScrollTouchEnd"
			@scroll="onH5MessageScroll"
			@scrolltoupper="loadOlderMessages"
		>
			<view class="messages-content">
      <view v-if="loadingOlder" class="history-loading history-loading--older"><text>{{ t('inbox.loading') }}</text></view>
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
			<view v-if="loadFailed" class="load-error"><text>{{ t('inbox.loadChatFailed') }}</text><button @tap="load()">{{ t('chatDesign.retry') }}</button></view>
			<view v-if="loading && !messages.length" class="history-loading">{{ t('inbox.loading') }}</view>
			<view v-if="!loadFailed && !loading && !messages.length" class="empty"
				>{{ t('inbox.emptyChat') }}</view
			>
			<view class="messages-end" />
      </view>
		</scroll-view>
		<!-- #endif -->
		<!-- #ifndef H5 -->
		<scroll-view
			class="messages"
			scroll-y
			:scroll-top="scrollTop"
			:scroll-with-animation="scrollWithAnimation"

			:upper-threshold="60"
      :bounces="false"
      @touchstart="onScrollTouchStart"
      @touchend="onScrollTouchEnd"
      @touchcancel="onScrollTouchEnd"
			@scroll="onMessageScroll"
			@scrolltoupper="loadOlderMessages"

		>
			<view class="messages-content">
      <view v-if="loadingOlder" class="history-loading history-loading--older"><text>{{ t('inbox.loading') }}</text></view>
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
			<view v-if="loadFailed" class="load-error"><text>{{ t('inbox.loadChatFailed') }}</text><button @tap="load()">{{ t('chatDesign.retry') }}</button></view>
			<view v-if="loading && !messages.length" class="history-loading">{{ t('inbox.loading') }}</view>
			<view v-if="!loadFailed && !loading && !messages.length" class="empty"
				>{{ t('inbox.emptyChat') }}</view
			>
			<view id="messages-end" class="messages-end" />
      </view>
		</scroll-view>
		<!-- #endif -->
    <view v-if="latestButtonVisible" class="latest-button-anchor">
      <GlassCircleButton class="back-to-latest" :label="t('chatDesign.latest')" @tap="returnToLatest"><view class="latest-arrow" /></GlassCircleButton>
    </view>
    </view>
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
			@focus="handleComposerFocus"
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
import { computed, getCurrentInstance, nextTick, ref, watch } from "vue";
import { onHide, onLoad, onReady, onResize, onShow, onUnload } from "@dcloudio/uni-app";
import {
	getChatGroupMembersApi,
	getChatGroupOnlineMembersApi,
	getChatGroupsApi,
	getChatMessagesApi,
	sendChatMessageApi,
	uploadChatImageApi,
} from "@/api/chat.js";
import GlassCircleButton from "@/components/chat/GlassCircleButton.vue";
import ChatPageHeader from "@/components/chat/ChatPageHeader.vue";
import ChatComposer from "@/components/chat/ChatComposer.vue";
import ChatLongPressMenu from "@/components/chat/ChatLongPressMenu.vue";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble.vue";
import GroupAvatar from "@/components/chat/GroupAvatar.vue";
import GroupMemberSheet from "@/components/chat/GroupMemberSheet.vue";
import {
	buildChatDisplayItems,
	mergeChatMessages,
	readH5MessageScrollMetrics,
	resolveH5MessageScrollElement,
	shouldLoadOlderMessagesFromH5Scroll,
	shouldShowChatLatestButton,
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

const isGroupMember = ref(false);
const scrollTop = ref(0);
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
const loadFailed = ref(false);
const loadingOlder = ref(false);
const hasOlderMessages = ref(true);
const latestButtonVisible = ref(false);
const userScrolledAwayFromBottom = ref(false);
let touchingMessages = false, scrollInteractionRevision = 0, scrollCommandRevision = 0;
let observedScrollTop = 0, observedScrollHeight = 0;
let pageActive = true;
const myId = Number(uni.getStorageSync("USER_INFO")?.id);
const viewportHeight = Math.max(
	0,
	Number(uni.getSystemInfoSync?.().windowHeight || 700) - 150,
);
const messageViewportHeight = ref(viewportHeight);
const pageInstance = getCurrentInstance();
function measureMessageViewport() {
	// Native scroll events do not report clientHeight. Measure the actual flex
	// area so safe-area/header/keyboard heights cannot make history look newest.
	// #ifndef H5
	nextTick(() => uni.createSelectorQuery().in(pageInstance.proxy).select('.messages').boundingClientRect(rect => {
		if (rect?.height > 0) messageViewportHeight.value = rect.height;
	}).exec());
	// #endif
}
onReady(measureMessageViewport);
onResize(measureMessageViewport);
// #ifdef H5
const composerKeyboardHeight = computed(() => 0);
// #endif
// #ifndef H5
const composerKeyboardHeight = computed(() => keyboardHeight.value);
// #endif
let pollTimer = null;
let forceScrollAfterLoad = true;
let refreshAfterLoad = false;
let hasLoadedInitialMessages = false;
const messagePageSize = 15;
const displayItems = computed(() => buildChatDisplayItems(messages.value));
const onlineLabel = computed(() => `${onlineMembers.value.length} ${t('inbox.onlineMembers')}`);
const memberSheetTitle = computed(() => memberSheetUnreadMembers.value !== null ? t('inbox.readMembers') : t('inbox.onlineMembers'));

function getH5MessagesElement() {
	return resolveH5MessageScrollElement(h5MessagesRef.value, {
		documentLike: typeof document !== "undefined" ? document : null,
		getStyle:
			typeof window !== "undefined" && typeof window.getComputedStyle === "function"
				? window.getComputedStyle.bind(window)
				: null,
	});
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

async function captureScrollState() {
  await nextTick();
  // #ifdef H5
  return captureH5ScrollState();
  // #endif
  // #ifndef H5
  return new Promise(resolve => {
    let top = observedScrollTop, height = observedScrollHeight, viewport = messageViewportHeight.value;
    uni.createSelectorQuery().in(pageInstance.proxy)
      .select('.messages').scrollOffset(value => { if (Number.isFinite(value?.scrollTop)) top = value.scrollTop; })
      .select('.messages').boundingClientRect(value => { if (value?.height > 0) viewport = value.height; })
      .select('.messages-content').boundingClientRect(value => { if (value?.height > 0) height = value.height; })
      .exec(() => { messageViewportHeight.value = viewport; resolve({ scrollTop: top, scrollHeight: height, clientHeight: viewport }); });
  });
  // #endif
}

async function applyScrollPosition(target, current, interaction = scrollInteractionRevision) {
  if (!pageActive || interaction !== scrollInteractionRevision) return;
  const command = ++scrollCommandRevision;
  const top = Math.max(0, Number(target) || 0);
  // #ifdef H5
  const element = getH5MessagesElement();
  if (element) element.scrollTo({ top, behavior: 'auto' });
  // #endif
  // #ifndef H5
  // Only explicit commands write this prop. Echoing @scroll into it restarts
  // native animation/overflow locking and fights the user's finger.
  scrollWithAnimation.value = false;
  if (scrollTop.value === top && Math.abs(Number(current) - top) > 1) {
    scrollTop.value = Math.max(0, Number(current) || 0);
    await nextTick();
  }
  if (!pageActive || command !== scrollCommandRevision || interaction !== scrollInteractionRevision) return;
  scrollTop.value = top;
  // #endif
  observedScrollTop = top;
}

async function scrollToLast() {
  if (!messages.value.length) return false;
  const interaction = scrollInteractionRevision;
  const snapshot = await captureScrollState();
  if (!snapshot || interaction !== scrollInteractionRevision || !pageActive) return false;
  const target = Math.max(0, snapshot.scrollHeight - snapshot.clientHeight);
  await applyScrollPosition(target, snapshot.scrollTop, interaction);
  if (interaction !== scrollInteractionRevision || !pageActive) return false;
  atBottom.value = true;
  userScrolledAwayFromBottom.value = false;
  latestButtonVisible.value = false;
  return true;
}
async function load({ silent = false, refreshAfterPending = false } = {}) {
	if (!groupId.value) return;
  if (loading.value) {
    if (refreshAfterPending) refreshAfterLoad = true;
    return;
  }
  const previousLatestId = Number(messages.value[messages.value.length - 1]?.id || 0);
	loading.value = true;
	try {
		const [messageData, groupData, memberData] = await Promise.all([
		getChatMessagesApi(groupId.value, { limit: messagePageSize }),
			getChatGroupsApi(),
			getChatGroupMembersApi(groupId.value),
		]);

		loadFailed.value = false;
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

		groupName.value = presentGroupName(group?.name);


		groupAvatarUrl.value = group?.avatar_url || "";
		groupStatus.value = group?.status || "active";
    const latestId = Number(messages.value[messages.value.length - 1]?.id || 0);
    const hasNewLatest = latestId > previousLatestId;
    // Current intent wins: a gesture cancels following; tapping Latest restores
    // it even if the request began while reading history.
    const following = !touchingMessages && !userScrolledAwayFromBottom.value;
    const shouldFollow = following && (forceScrollAfterLoad || (hasNewLatest && atBottom.value));
    if (shouldFollow && await scrollToLast()) forceScrollAfterLoad = false;
    else if (hasNewLatest && pageActive) {
      // Appending does not necessarily emit scroll. Refresh the floating
      // control from live geometry without moving the reader's position.
      const snapshot = await captureScrollState();
      if (snapshot && pageActive) updateMessageScrollState(snapshot);
    }
		hasLoadedInitialMessages = true;
		refreshUnreadBadge({ force: true }).catch((error) =>
			console.warn("刷新未读角标失败", error),
		);
	} catch (error) {
		loadFailed.value = true;
		if (!silent)
			uni.showToast({
				title: error?.error || t('inbox.loadChatFailed'),
				icon: "none",
			});
	} finally {
		loading.value = false;
    if (refreshAfterLoad && pageActive) {
      refreshAfterLoad = false;
      await load({ silent: true });
    }
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
	memberSheetUnreadMembers.value = null;
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

}
async function loadOlderMessages() {
  if (!hasLoadedInitialMessages || !userScrolledAwayFromBottom.value || !hasOlderMessages.value || loadingOlder.value || !messages.value.length) return;
  loadingOlder.value = true;
  try {
    const data = await getChatMessagesApi(groupId.value, { limit: messagePageSize, beforeId: messages.value[0].id });
    // Read the LIVE position at response time. The user may have moved while
    // waiting for the request; restoring the request-start offset jerks them.
    const before = await captureScrollState();
    const interaction = scrollInteractionRevision;
    const wasFollowingLatest = atBottom.value && !userScrolledAwayFromBottom.value;
    messages.value = mergeChatMessages(messages.value, data?.messages || data?.data?.messages || []);
    hasOlderMessages.value = Boolean(data?.hasMore ?? data?.data?.hasMore);
    const after = await captureScrollState();
    if (before && after && interaction === scrollInteractionRevision) {
      const target = wasFollowingLatest && !userScrolledAwayFromBottom.value ? Math.max(0, after.scrollHeight - after.clientHeight)
        : after.scrollTop + Math.max(0, after.scrollHeight - before.scrollHeight);
      await applyScrollPosition(target, after.scrollTop, interaction);
    }
  } catch (error) {
    uni.showToast({ title: error?.error || t('inbox.loadHistoryFailed'), icon: 'none' });
  } finally { loadingOlder.value = false; }
}
function onScrollTouchStart() {
  touchingMessages = true;
  scrollInteractionRevision++;
  scrollCommandRevision++;
  userScrolledAwayFromBottom.value = true;
  forceScrollAfterLoad = false;
}
function onScrollTouchEnd() {
  touchingMessages = false;
  if (observedScrollTop + messageViewportHeight.value >= observedScrollHeight - 3) userScrolledAwayFromBottom.value = false;
}
function onMessageScroll(event) {
  updateMessageScrollState({ scrollTop: event.detail.scrollTop, scrollHeight: event.detail.scrollHeight, clientHeight: messageViewportHeight.value });
}
function updateMessageScrollState({ scrollTop: top, scrollHeight, clientHeight }) {
  const movingUp = top < observedScrollTop - 1;
  observedScrollTop = Math.max(0, Number(top) || 0);
  observedScrollHeight = Number(scrollHeight) || 0;
  messageViewportHeight.value = clientHeight;
  atBottom.value = shouldStickToBottom({ scrollTop: top, scrollHeight, viewportHeight: clientHeight });
  // A larger viewport (keyboard closing) can clamp scrollTop upwards while
  // still at the real bottom. That is not a gesture away from latest.
  if (!touchingMessages && top + clientHeight >= scrollHeight - 3) userScrolledAwayFromBottom.value = false;
  else if (touchingMessages || movingUp) userScrolledAwayFromBottom.value = true;
  latestButtonVisible.value = shouldShowChatLatestButton({ atBottom: atBottom.value });
}
function onH5MessageScroll(event) {
  const metrics = readH5MessageScrollMetrics({ element: getH5MessagesElement(), event });
  if (!metrics) return;
  updateMessageScrollState(metrics);
  if (shouldLoadOlderMessagesFromH5Scroll({ scrollTop: metrics.scrollTop, hasOlderMessages: hasOlderMessages.value, loadingOlder: loadingOlder.value })) void loadOlderMessages();
}
async function returnToLatest() {
  scrollInteractionRevision++;
  touchingMessages = false;
  userScrolledAwayFromBottom.value = false;
  await scrollToLast();
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
function shouldFollowLatestOnComposerInteraction() {
  return atBottom.value && !userScrolledAwayFromBottom.value && !touchingMessages;
}
function handleComposerFocus() {
	if (!shouldFollowLatestOnComposerInteraction()) return;
	scrollToLast();
}
function setKeyboardHeight(event) {
	keyboardHeight.value = Math.max(
		0,
		Number(unwrapComponentEventPayload(event)) || 0,
	);
	measureMessageViewport();
	if (keyboardHeight.value && shouldFollowLatestOnComposerInteraction()) {
		nextTick(() => scrollToLast());
	}
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
	const interactionWhenSending = scrollInteractionRevision;
	sending.value = true;
	try {
		await sendChatMessageApi(
			groupId.value,
			attachReplyMessage(payload, replyMessage.value),
		);
		replyMessage.value = null;
		if (interactionWhenSending === scrollInteractionRevision) {
			userScrolledAwayFromBottom.value = false;
			forceScrollAfterLoad = true;
		}
		await load({ silent: true, refreshAfterPending: true });
	} catch (error) {
		uni.showToast({ title: error?.error || t('inbox.sendFailed'), icon: "none" });
	} finally {
		sending.value = false;
	}
}
async function sendImage({ imagePath }) {
	if (sending.value) return;
	const interactionWhenSending = scrollInteractionRevision;
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
		if (interactionWhenSending === scrollInteractionRevision) {
			userScrolledAwayFromBottom.value = false;
			forceScrollAfterLoad = true;
		}
		await load({ silent: true, refreshAfterPending: true });
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
	measureMessageViewport();
	uni.setNavigationBarTitle({ title: t('inbox.groupChat') });
  pageActive = true;
  if (!hasLoadedInitialMessages) {
    forceScrollAfterLoad = true;
    userScrolledAwayFromBottom.value = false;
  }
	load();
	startPolling();
});
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('inbox.groupChat') }));
onHide(() => {
	keyboardHeight.value = 0;
  pageActive = false;
  scrollCommandRevision++;
	stopPolling();
});
onUnload(() => {
  pageActive = false;
  scrollCommandRevision++;
	stopPolling();
});
</script>

<style scoped>
.page {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background: #eeedeb;
}
/* #ifndef H5 */
.page {
	height: 100vh;
}
/* #endif */
.messages-area{position:relative;flex:1;min-height:0;overflow:hidden;}
.group-copy{display:flex;flex:1;align-items:center;flex-direction:column;min-width:0;gap:5px;padding:0 0 2px;}
.group-name{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18px;font-weight:600;color:#292825;}
.group-subtitle{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:5px;color:#918d85;font-size:11px;font-weight:400;}
.online-count{padding:4px 0;}
.more-dots{display:flex;align-items:center;justify-content:center;gap:4px;}.more-dots>view{width:5px;height:5px;border-radius:50%;background:currentColor;}
.load-error{padding:18px;color:#918d85;text-align:center;font-size:13px;}.load-error button{margin-top:10px;width:fit-content;background:#fff;border-radius:22px;font-size:13px;}
.messages{width:100%;height:100%;min-height:0;box-sizing:border-box;overflow-anchor:none;}
.messages-content{position:relative;padding:8px 14px 12px;box-sizing:border-box;overflow-anchor:none;}
.history-loading--older{position:absolute;top:0;left:0;right:0;z-index:2;padding:8px!important;background:rgba(238,237,235,.94);pointer-events:none;}
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
.latest-button-anchor{position:absolute;right:16px;bottom:12px;z-index:10;}
.latest-arrow{position:relative;width:16px;height:19px;color:#686359;}
.latest-arrow::before{content:"";position:absolute;left:7px;top:1px;width:2px;height:14px;border-radius:2px;background:currentColor;}
.latest-arrow::after{content:"";position:absolute;left:3px;bottom:4px;width:8px;height:8px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);border-radius:1px;}
.dissolved-note {
	flex: 0 0 auto;
	padding: 24rpx;
	color: #7d838c;
	background: #eeedeb;
	text-align: center;
	font-size: 25rpx;
}
@media(prefers-reduced-motion:reduce){.back-to-latest{transition:none;}}
</style>
