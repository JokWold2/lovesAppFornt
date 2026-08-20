<template>
  <view class="container">
    <view class="notice-header">
      <text class="title">消息中心</text>
      <view style="position: relative;top: 30rpx; margin-left: 40rpx;">
        <loading2 />
      </view>
    </view>
    <view class="notice-list">

      <view class="list-item" v-for="(item, index) in noticeItems" :key="index"
        :class="{ 'no-border': index === noticeItems.length - 1 }">
        <!-- 左侧头像 -->
        <view class="item-avatar" v-if="index === 0" style="display: flex;justify-content: center;align-items: center;">
          <view style=" width: 100rpx;height: 100rpx;transform: scale(0.25);">
            <loading3 :duration="loadingDuration" />
          </view>
        </view>
        <view class="item-avatar" v-else style="display: flex;justify-content: center;align-items: center;">
          <view style=" width: 100rpx;height: 100rpx;transform: scale(0.25);">
            <loading4 :duration="loadingDuration" />
          </view>
        </view>
        <!-- 中间文字区域 -->
        <view class="item-content">
          <text class="item-title">{{ item.title }}</text>
          <text class="item-note">{{ item.time }}</text>
        </view>
        <!-- 右侧箭头 -->
        <view class="item-arrow">
          <text class="arrow-icon"> > </text>
        </view>
      </view>
    </view>
    <view v-if="isAdmin" class="chat-title">待审核聊天申请</view>
    <view v-if="isAdmin && requests.length" class="notice-list"><view class="list-item" v-for="request in requests" :key="request.id"><view class="item-content"><text class="item-title">申请 #{{ request.id }}</text><text class="item-note">{{ request.message || '无申请说明' }}</text></view><text class="approve" @click="approve(request)">建群</text><text class="reject" @click="reject(request)">拒绝</text></view></view>
    <MemberPickerSheet :visible="!!reviewRequest" title="审核并选择群成员" :show-review-fields="true" @close="reviewRequest = null" @confirm="confirmApprove" />

    <view class="chat-title">群聊会话</view>
    <view class="notice-list" v-if="chatGroups.length">
      <view class="list-item" v-for="group in chatGroups" :key="group.id" @click="openGroup(group.id)">
        <view class="item-avatar group-avatar">群</view>
        <view class="item-content"><text class="item-title">{{ group.name }}</text><text class="item-note">{{ group.last_message || '暂无消息' }}</text></view>
        <text v-if="group.unread_count" class="badge">{{ group.unread_count > 99 ? '99+' : group.unread_count }}</text>
      </view>
    </view>
    <view v-else class="empty-state"><text class="empty-text">暂无群聊会话</text></view>

    <view class="empty-state" v-if="noticeItems.length === 0">
      <uni-icons type="chatboxes-filled" size="60" color="#CCCCCC"></uni-icons>
      <text class="empty-text">暂无消息</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app';
import { getNotificationsApi, markNotificationsReadApi } from '@/api/notifications.js';
import { refreshUnreadBadge } from '@/utils/unreadBadge.js';
import { approveChatRequestApi, getChatGroupsApi, getChatRequestsApi, rejectChatRequestApi } from '@/api/chat.js';
import MemberPickerSheet from '@/components/chat/MemberPickerSheet.vue';
import loading2 from '@/static/loading/loading2.vue';
import loading3 from '@/static/loading/loading3.vue';
import loading4 from '@/static/loading/loading4.vue';

const noticeItems = ref([]);
const chatGroups = ref([]);
const requests = ref([]);
const isAdmin = Number(uni.getStorageSync('USER_INFO')?.loginType) === 5;
const reviewRequest = ref(null);

const loadingDuration = ref(18);

function describe(item) {
  const labels = { moment_like: '赞了你的动态', moment_comment: '评论了你的动态', profile_like: '赞了你的资料', profile_comment: '评论了你的资料', market_like: '赞了你的市场内容', market_comment: '评论了你的市场内容', chat_request: '提交了聊天申请', chat_request_approved: '同意了聊天申请', chat_request_rejected: '处理了聊天申请', group_member_added: '将你加入了群聊' };
  return `${item.actor_name || item.actor_email || '用户'} ${labels[item.type] || '有一条新互动'}${item.content ? `：${item.content}` : ''}`;
}
async function loadNotifications() {
  try {
    const data = await getNotificationsApi({ page: 1, pageSize: 50 });
    const list = Array.isArray(data?.notifications) ? data.notifications : [];
    noticeItems.value = list.map(item => ({ id: item.id, title: describe(item), time: item.created_at ? new Date(item.created_at).toLocaleString() : '', unread: !item.is_read }));
    const unreadIds = list.filter(item => !item.is_read).map(item => item.id);
    if (unreadIds.length) await markNotificationsReadApi(unreadIds);
    await refreshUnreadBadge();
    const groupData = await getChatGroupsApi();
    chatGroups.value = Array.isArray(groupData?.groups) ? groupData.groups : [];
    if (isAdmin) { const requestData = await getChatRequestsApi(); requests.value = (requestData?.requests || []).filter(item => item.status === 'pending'); }
  } catch (error) { console.error('加载互动消息失败', error); }
}
function openGroup(id) { uni.navigateTo({ url: `/pages/chat/chatRoom?id=${id}` }); }
function approve(request) { reviewRequest.value = request; }
async function confirmApprove(payload) { try { const result = await approveChatRequestApi(reviewRequest.value.id, payload); requests.value = requests.value.filter(item => item.id !== reviewRequest.value.id); reviewRequest.value = null; uni.navigateTo({ url: `/pages/chat/chatRoom?id=${result.groupId}` }); } catch (e) { uni.showToast({ title: e?.error || '审核失败', icon: 'none' }); } }
async function reject(request) { uni.showModal({ title: '拒绝申请', editable: true, placeholderText: '填写审核回复（可选）', success: async result => { if (!result.confirm) return; try { await rejectChatRequestApi(request.id, { reviewMessage: result.content || '' }); requests.value = requests.value.filter(item => item.id !== request.id); } catch (e) { uni.showToast({ title: e?.error || '操作失败', icon: 'none' }); } } }); }
onShow(loadNotifications);
onPullDownRefresh(async () => { loadingDuration.value = 2; await loadNotifications(); uni.stopPullDownRefresh(); });
</script>

<style scoped lang="scss">
$primary-color: #fff6df;
$background-color: #fff6df;
$text-color-black: #333;

.notice-list {
  background-color: #ffffff;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #eee;
  box-sizing: border-box;

  &.no-border {
    border-bottom: none;
  }
}

// 左侧大头像 thumb-size="lg"
.item-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 8rpx;
  overflow: hidden;
  margin-right: 24rpx;
  flex-shrink: 0;

  .avatar-img {
    width: 100%;
    height: 100%;
  }
}

// 标题+备注区域
.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8rpx;

  .item-title {
    font-size: 32rpx;
    color: #333;
  }

  .item-note {
    font-size: 26rpx;
    color: #999;
  }
}

// 右侧箭头 show-arrow
.item-arrow {
  flex-shrink: 0;

  .arrow-icon {
    font-size: 36rpx;
    color: #c8c9cc;
  }
}

.container {
  min-height: 100vh;
  background-color: $background-color;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.notice-header {
  display: flex;
  background-color: #FFFFFF;
  padding: 20px 15px;
  margin-bottom: 15px;

  .title {
    font-size: 20px;
    font-weight: bold;
    color: #ffce00;
  }
}

.notice-list {
  margin: 0 15px;
  background-color: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 100px;

  .empty-text {
    margin-top: 20px;
    font-size: 16px;
    color: #CCCCCC;
  }
}
.chat-title { margin: 30rpx 15rpx 16rpx; font-size: 30rpx; font-weight: 700; color: #333; }
.group-avatar { display:flex; align-items:center; justify-content:center; background:#ffce00; color:#333; font-weight:700; }
.badge { background:#f33; color:#fff; min-width:34rpx; padding:4rpx 8rpx; border-radius:30rpx; text-align:center; font-size:22rpx; }
.approve,.reject{padding:12rpx;color:#333}.approve{background:#ffce00;border-radius:10rpx}.reject{color:#d33}
</style>
