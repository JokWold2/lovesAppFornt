<template>
  <view class="page">
    <view v-if="!pendingRequests.length" class="empty">暂时没有待审核申请</view>
    <view v-for="request in pendingRequests" :key="request.id" class="request-card">
      <view class="people"><view><image class="avatar" :src="request.applicant_avatar_url || defaultAvatar" /><text>{{ request.applicant_name || '申请人' }}</text></view><text class="arrow">→</text><view><image class="avatar" :src="request.target_avatar_url || defaultAvatar" /><text>{{ request.target_name || '联系对象' }}</text></view></view>
      <text v-if="request.message" class="message">申请说明：{{ request.message }}</text><text class="time">{{ formatTime(request.created_at) }}</text>
      <view class="actions"><button class="reject" @tap="openReject(request)">拒绝</button><button class="approve" @tap="reviewRequest = request">审核并建群</button></view>
    </view>
    <MemberPickerSheet v-if="reviewRequest" :visible="true" :excluded-user-ids="[reviewRequest.applicant_user_id, reviewRequest.target_user_id]" title="审核并选择群成员" :show-review-fields="true" @close="reviewRequest = null" @confirm="approve" />
    <view v-if="rejectRequest" class="mask" @tap="rejectRequest = null"><view class="reject-sheet" @tap.stop><text class="title">拒绝申请</text><textarea v-model="rejectReason" class="reason" maxlength="500" placeholder="请填写拒绝理由" /><view class="actions"><button @tap="rejectRequest = null">取消</button><button class="reject-confirm" @tap="reject">确认拒绝</button></view></view></view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { approveChatRequestApi, getChatRequestsApi, rejectChatRequestApi } from '@/api/chat.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'
import MemberPickerSheet from '@/components/chat/MemberPickerSheet.vue'
const requests = ref([]), reviewRequest = ref(null), rejectRequest = ref(null), rejectReason = ref('')
const defaultAvatar = '/static/logo.png'
const pendingRequests = computed(() => requests.value.filter(item => item.status === 'pending'))
function formatTime(value) { return value ? new Date(value).toLocaleString() : '' }
async function load() { const data = await getChatRequestsApi(); requests.value = data?.requests || []; await refreshUnreadBadge() }
function openReject(request) { rejectRequest.value = request; rejectReason.value = '' }
async function reject() { if (!rejectReason.value.trim()) return uni.showToast({ title: '请填写拒绝理由', icon: 'none' }); try { await rejectChatRequestApi(rejectRequest.value.id, { reviewMessage: rejectReason.value.trim() }); rejectRequest.value = null; await load() } catch (error) { uni.showToast({ title: error?.error || '拒绝失败', icon: 'none' }) } }
async function approve(payload) { try { const result = await approveChatRequestApi(reviewRequest.value.id, payload); reviewRequest.value = null; await load(); uni.navigateTo({ url: `/pages/chat/chatRoom?id=${result.groupId}` }) } catch (error) { uni.showToast({ title: error?.error || '审核失败', icon: 'none' }) } }
onShow(load)
</script>
<style scoped lang="scss">
.page{min-height:100vh;padding:24rpx;background:#f7f7f7}.request-card{margin-bottom:20rpx;padding:24rpx;border-radius:18rpx;background:#fff}.people,.people view,.actions{display:flex;align-items:center}.people{gap:24rpx}.people view{gap:10rpx;flex:1}.avatar{width:64rpx;height:64rpx;border-radius:50%;background:#eee}.arrow{color:#999}.message,.time{display:block;margin-top:18rpx}.message{color:#333}.time{font-size:23rpx;color:#999}.actions{justify-content:flex-end;gap:18rpx;margin-top:22rpx}.actions button{margin:0;font-size:25rpx}.approve,.reject-confirm{color:#333;background:#ffce00}.reject{color:#a33;background:#fff0f0}.empty{padding-top:200rpx;text-align:center;color:#999}.mask{position:fixed;inset:0;display:flex;align-items:flex-end;background:rgba(0,0,0,.45)}.reject-sheet{width:100%;padding:30rpx;box-sizing:border-box;border-radius:28rpx 28rpx 0 0;background:#fff}.title{font-size:32rpx;font-weight:700}.reason{display:block;width:100%;min-height:180rpx;margin-top:22rpx;padding:18rpx;box-sizing:border-box;border-radius:12rpx;background:#f5f5f5}
</style>
