<template>
  <view class="page">
    <view class="room-head"><view class="group-avatar">群</view><text class="group-name">{{ groupName || '群聊' }}</text><text v-if="isGroupAdmin" class="add-member" @tap="pickerVisible = true">＋ 拉成员</text></view>
    <scroll-view class="messages" scroll-y :scroll-into-view="scrollIntoView" @scroll="onMessageScroll" @scrolltolower="atBottom = true">
      <template v-for="item in displayItems" :key="item.key">
        <view v-if="item.kind === 'time'" class="time-divider">{{ item.label }}</view>
        <ChatMessageBubble v-else :id="`message-${item.message.id}`" :message="item.message" :mine="Number(item.message.sender_user_id) === myId" @longpress="openLongPressMenu" @preview-image="previewImage" />
      </template>
      <view v-if="!loading && !messages.length" class="empty">还没有消息，开始聊聊吧</view>
    </scroll-view>
    <ChatComposer v-if="isGroupMember" :members="members" :reply-message="replyMessage" :disabled="sending" @send="sendMessage" @select-image="sendImage" @close-reply="replyMessage = null" />
    <MemberPickerSheet :visible="pickerVisible" title="选择要拉入群聊的成员" @close="pickerVisible = false" @confirm="addMembers" />
    <ChatLongPressMenu :visible="Boolean(menuMessage)" :message="menuMessage" @close="menuMessage = null" @reply="startReply" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onHide, onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { addChatMemberApi, getChatGroupMembersApi, getChatGroupsApi, getChatMessagesApi, sendChatMessageApi, uploadChatImageApi } from '@/api/chat.js'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatLongPressMenu from '@/components/chat/ChatLongPressMenu.vue'
import ChatMessageBubble from '@/components/chat/ChatMessageBubble.vue'
import MemberPickerSheet from '@/components/chat/MemberPickerSheet.vue'
import { buildChatDisplayItems, shouldStickToBottom } from '@/utils/chatMessageListState.js'
import { attachReplyMessage, unwrapComponentEventPayload } from '@/utils/chatComposerState.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'

const groupId = ref(''); const messages = ref([]); const members = ref([]); const pickerVisible = ref(false); const isGroupAdmin = ref(false); const isGroupMember = ref(false); const scrollIntoView = ref(''); const groupName = ref(''); const replyMessage = ref(null); const menuMessage = ref(null); const sending = ref(false); const atBottom = ref(true); const loading = ref(false)
const myId = Number(uni.getStorageSync('USER_INFO')?.id); const viewportHeight = Math.max(0, Number(uni.getSystemInfoSync?.().windowHeight || 700) - 150); let pollTimer = null; let forceScrollAfterLoad = true
const displayItems = computed(() => buildChatDisplayItems(messages.value))

function scrollToLast() { const lastMessage = messages.value.at(-1); if (lastMessage) scrollIntoView.value = `message-${lastMessage.id}` }
async function load({ silent = false } = {}) {
  if (!groupId.value || loading.value) return
  loading.value = true
  try {
    const [messageData, groupData, memberData] = await Promise.all([getChatMessagesApi(groupId.value), getChatGroupsApi(), getChatGroupMembersApi(groupId.value)])
    messages.value = messageData?.messages || []; members.value = memberData?.members || []
    const group = (groupData?.groups || []).find(item => Number(item.id) === Number(groupId.value))
    isGroupMember.value = Boolean(group); isGroupAdmin.value = group?.role === 'admin'; groupName.value = group?.name || ''
    if (forceScrollAfterLoad || atBottom.value) scrollToLast()
    forceScrollAfterLoad = false
    refreshUnreadBadge().catch(error => console.warn('刷新未读角标失败', error))
  } catch (error) { if (!silent) uni.showToast({ title: error?.error || '加载群聊失败', icon: 'none' }) } finally { loading.value = false }
}
function onMessageScroll(event) { atBottom.value = shouldStickToBottom({ scrollTop: event.detail.scrollTop, scrollHeight: event.detail.scrollHeight, viewportHeight }) }
function startPolling() { if (!pollTimer) pollTimer = setInterval(() => load({ silent: true }), 5000) }
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }
function openLongPressMenu(message) { menuMessage.value = unwrapComponentEventPayload(message) }
function startReply(message) { replyMessage.value = unwrapComponentEventPayload(message); menuMessage.value = null }
function previewImage(url) { uni.previewImage({ urls: [url], current: url }) }
async function sendMessage(payload) { if (sending.value) return; sending.value = true; try { await sendChatMessageApi(groupId.value, attachReplyMessage(payload, replyMessage.value)); replyMessage.value = null; forceScrollAfterLoad = true; await load({ silent: true }) } catch (error) { uni.showToast({ title: error?.error || '发送失败', icon: 'none' }) } finally { sending.value = false } }
async function sendImage({ imagePath }) { if (sending.value) return; sending.value = true; uni.showLoading({ title: '图片上传中' }); try { const uploaded = await uploadChatImageApi(groupId.value, imagePath); await sendChatMessageApi(groupId.value, { content: '', messageType: 'image', mediaUrl: uploaded.url, mentions: [], replyToMessageId: replyMessage.value?.id || null }); replyMessage.value = null; forceScrollAfterLoad = true; await load({ silent: true }) } catch (error) { uni.showToast({ title: error?.error || '图片上传失败', icon: 'none' }) } finally { uni.hideLoading(); sending.value = false } }
async function addMembers(memberIds) { if (!memberIds.length) { pickerVisible.value = false; return } try { await Promise.all(memberIds.map(userId => addChatMemberApi(groupId.value, userId))); pickerVisible.value = false; await load({ silent: true }); uni.showToast({ title: '成员已加入', icon: 'success' }) } catch (error) { uni.showToast({ title: error?.error || '添加成员失败', icon: 'none' }) } }

onLoad(options => { groupId.value = options.id })
onShow(() => { forceScrollAfterLoad = true; load(); startPolling() })
onHide(stopPolling); onUnload(stopPolling)
</script>

<style scoped>
.page { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #efefef; }.room-head { display: flex; align-items: center; gap: 14rpx; padding: 18rpx 24rpx; background: #f6f7f8; }.group-avatar { display: flex; align-items: center; justify-content: center; width: 56rpx; height: 56rpx; border-radius: 50%; color: #fff; background: #aab0b8; font-size: 22rpx; }.group-name { flex: 1; overflow: hidden; color: #1d2230; font-size: 30rpx; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }.add-member { padding: 10rpx 14rpx; border-radius: 14rpx; color: #1768ae; background: #fff; font-size: 24rpx; }.messages { flex: 1; min-height: 0; box-sizing: border-box; padding: 16rpx 24rpx; }.time-divider { margin: 22rpx auto; color: #7d838c; text-align: center; font-size: 23rpx; }.empty { padding-top: 160rpx; color: #8a8f96; text-align: center; font-size: 28rpx; }
</style>
