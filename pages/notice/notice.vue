<template>
  <view class="page">
    <view class="header"><text>消息</text><uni-icons type="search" size="28" color="#171822" /></view>
    <view class="row" @click="openInteractions"><view class="avatar interaction">⌁</view><view class="main"><text class="name">互动消息</text><text class="summary">{{ interactionSummary }}</text></view><view class="side"><text class="date">{{ interactionDate }}</text><text v-if="interactionUnread" class="badge">{{ badgeText(interactionUnread) }}</text></view></view>
    <view v-if="isAdmin && requests.length" class="row" @click="openRequestReviews"><view class="avatar audit">审</view><view class="main"><text class="name">待审核私聊申请</text><text class="summary">{{ requests.length }} 条申请等待处理</text></view><view class="side"><text class="badge">{{ badgeText(requests.length) }}</text></view></view>
    <view v-for="group in chatGroups" :key="group.id" class="row" @click="openGroup(group.id)"><GroupAvatar class="group-list-avatar" :avatar-url="group.avatar_url" :members="group.members || []" :size="47" /><view class="main"><text class="name">{{ presentGroupName(group.name) }}</text><text class="summary">{{ group.status === 'dissolved' ? '该群已解散' : (group.last_message || '暂无消息') }}</text></view><view class="side"><text v-if="group.unread_count" class="badge">{{ badgeText(group.unread_count) }}</text></view></view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getNotificationsApi } from '@/api/notifications.js'
import { getChatGroupsApi, getChatRequestsApi } from '@/api/chat.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'
import GroupAvatar from '@/components/chat/GroupAvatar.vue'
import { presentGroupName } from '@/utils/chatGroupPresentation.js'
const notifications = ref([]), chatGroups = ref([]), requests = ref([])
const isAdmin = Number(uni.getStorageSync('USER_INFO')?.accountLevel) === 5
const interactions = computed(() => notifications.value.filter(item => item.type !== 'chat_request'))
const interactionUnread = computed(() => interactions.value.filter(item => !item.is_read).length)
const latest = computed(() => interactions.value[0])
const interactionSummary = computed(() => latest.value ? `${latest.value.actor_name || latest.value.actor_email || '用户'} ${latest.value.type.includes('comment') ? '评论了你' : '赞了你'}` : '暂无互动消息')
const interactionDate = computed(() => latest.value?.created_at ? new Date(latest.value.created_at).toLocaleDateString() : '')
function badgeText(value) { return Number(value) > 99 ? '99+' : String(value) }
function openInteractions() { uni.navigateTo({ url: '/pages/notice/interactionMessages' }) }
function openGroup(id) { uni.navigateTo({ url: `/pages/chat/chatRoom?id=${id}` }) }
function openRequestReviews() { uni.navigateTo({ url: '/pages/notice/chatRequestReview' }) }
async function load() { try { const [noticeData, groupData] = await Promise.all([getNotificationsApi({ page: 1, pageSize: 50 }), getChatGroupsApi()]); notifications.value = noticeData?.notifications || []; chatGroups.value = groupData?.groups || []; if (isAdmin) { const requestData = await getChatRequestsApi(); requests.value = (requestData?.requests || []).filter(item => item.status === 'pending' || item.status === 'processing') }; await refreshUnreadBadge() } catch (error) { console.error('加载消息失败', error) } }
onShow(load)
</script>
<style scoped lang="scss">
.page{min-height:100vh;background:#fff;color:#171822}.header{display:flex;align-items:center;justify-content:space-between;padding:34rpx 32rpx 28rpx;font-size:42rpx;font-weight:700}.row{display:flex;align-items:center;gap:22rpx;padding:26rpx 30rpx;border-bottom:1rpx solid #f1f1f1}.avatar{display:flex;align-items:center;justify-content:center;width:94rpx;height:94rpx;flex:0 0 94rpx;border-radius:50%;color:#fff;font-size:44rpx;font-weight:700}.group-list-avatar{flex:0 0 94rpx}.interaction{background:#ff3b87}.audit{background:#ffb728;font-size:32rpx}.main{min-width:0;flex:1;display:flex;flex-direction:column;gap:10rpx}.name{font-size:31rpx;font-weight:700}.summary{overflow:hidden;color:#999;font-size:26rpx;text-overflow:ellipsis;white-space:nowrap}.side{display:flex;min-width:48rpx;align-items:flex-end;flex-direction:column;gap:12rpx}.date{color:#bbb;font-size:21rpx}.badge{display:flex;min-width:34rpx;height:34rpx;padding:0 6rpx;align-items:center;justify-content:center;border-radius:20rpx;background:#ff3a5d;color:#fff;font-size:21rpx}.reject{color:#a65e4c;font-size:22rpx}
</style>
