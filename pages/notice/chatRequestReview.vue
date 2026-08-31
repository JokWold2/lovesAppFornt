<template>
  <view class="page app-h5-min-screen">
    <view v-if="!pendingRequests.length" class="empty">{{ t('review.noPending') }}</view>
    <view v-for="request in pendingRequests" :key="request.id" class="request-card">
      <view class="people"><view><image class="avatar" :src="request.applicant_avatar_url || defaultAvatar" /><text>{{ request.applicant_name || t('review.applicant') }}</text></view><text class="arrow">→</text><view><image class="avatar" :src="request.target_avatar_url || defaultAvatar" /><text>{{ request.target_name || t('review.target') }}</text></view></view>
      <text v-if="request.message" class="message">{{ t('review.note', { message: request.message }) }}</text><text class="time">{{ formatTime(request.created_at) }}</text>
      <view class="actions"><button class="reject" @tap="openReject(request)">{{ t('review.reject') }}</button><button class="approve" @tap="reviewRequest = request">{{ t('review.approve') }}</button></view>
    </view>
    <MemberPickerSheet v-if="reviewRequest" :visible="true" :excluded-user-ids="[reviewRequest.applicant_user_id, reviewRequest.target_user_id]" :title="t('review.pickMembers')" :show-review-fields="true" @close="reviewRequest = null" @confirm="approve" />
    <view v-if="rejectRequest" class="mask app-h5-sheet-mask" @tap="rejectRequest = null">
      <view class="reject-sheet app-h5-sheet" @tap.stop>
        <text class="title">{{ t('review.rejectTitle') }}</text>
        <textarea v-model="rejectReason" class="reason app-h5-scroll" maxlength="500" :placeholder="t('review.rejectPlaceholder')" />
        <view class="actions"><button @tap="rejectRequest = null">{{ t('common.cancel') }}</button><button class="reject-confirm" @tap="reject">{{ t('review.confirmReject') }}</button></view>
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { approveChatRequestApi, getChatRequestsApi, rejectChatRequestApi } from '@/api/chat.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'
import MemberPickerSheet from '@/components/chat/MemberPickerSheet.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
const requests = ref([]), reviewRequest = ref(null), rejectRequest = ref(null), rejectReason = ref('')
const defaultAvatar = '/static/logo.png'
const pendingRequests = computed(() => requests.value.filter(item => item.status === 'pending'))
function formatTime(value) { return value ? new Date(value).toLocaleString() : '' }
async function load() { const data = await getChatRequestsApi(); requests.value = data?.requests || []; await refreshUnreadBadge() }
function openReject(request) { rejectRequest.value = request; rejectReason.value = '' }
async function reject() { if (!rejectReason.value.trim()) return uni.showToast({ title: t('review.rejectReasonRequired'), icon: 'none' }); try { await rejectChatRequestApi(rejectRequest.value.id, { reviewMessage: rejectReason.value.trim() }); rejectRequest.value = null; await load() } catch (error) { uni.showToast({ title: error?.error || t('review.rejectFailed'), icon: 'none' }) } }
async function approve(payload) { try { const result = await approveChatRequestApi(reviewRequest.value.id, payload); reviewRequest.value = null; await load(); uni.navigateTo({ url: `/pages/chat/chatRoom?id=${result.groupId}` }) } catch (error) { uni.showToast({ title: error?.error || t('review.approveFailed'), icon: 'none' }) } }
onShow(() => { uni.setNavigationBarTitle({ title: t('review.approve') }); load() })
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('review.approve') }))
</script>
<style scoped lang="scss">
.page{min-height:100vh;padding:24rpx;background:#f7f7f7}.request-card{margin-bottom:20rpx;padding:24rpx;border-radius:18rpx;background:#fff}.people,.people view,.actions{display:flex;align-items:center}.people{gap:24rpx}.people view{gap:10rpx;flex:1}.avatar{width:64rpx;height:64rpx;border-radius:50%;background:#eee}.arrow{color:#999}.message,.time{display:block;margin-top:18rpx}.message{color:#333}.time{font-size:23rpx;color:#999}.actions{justify-content:flex-end;gap:18rpx;margin-top:22rpx}.actions button{margin:0;font-size:25rpx}.approve,.reject-confirm{color:#333;background:#ffce00}.reject{color:#a33;background:#fff0f0}.empty{padding-top:200rpx;text-align:center;color:#999}.mask{position:fixed;inset:0;display:flex;align-items:flex-end;background:rgba(0,0,0,.45)}.reject-sheet{display:flex;width:100%;min-height:0;flex-direction:column;padding:30rpx;box-sizing:border-box;border-radius:28rpx 28rpx 0 0;background:#fff}.reject-sheet .actions{flex:0 0 auto}.title{flex:0 0 auto;font-size:32rpx;font-weight:700}.reason{display:block;width:100%;min-height:0;margin-top:22rpx;padding:18rpx;box-sizing:border-box;border-radius:12rpx;background:#f5f5f5}
/* #ifdef H5 */
.mask { bottom: var(--app-viewport-bottom-offset, 0px); }
.reject-sheet { padding-bottom: calc(30rpx + env(safe-area-inset-bottom)); }
.page { padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); }
/* #endif */
</style>
