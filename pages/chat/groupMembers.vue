<template>
  <view class="page">
    <view class="group-summary">
      <GroupAvatar :avatar-url="group?.avatar_url" :members="group?.members || []" :size="54" />
      <view class="group-summary-copy"><text class="group-name">{{ group?.name || t('group.members') }}</text><text class="member-count">{{ t('group.memberCount', { count: (group?.members || []).length }) }}</text></view>
    </view>
    <view v-if="isActiveAdmin" class="invite-row" @tap="pickerVisible = true"><text class="plus">＋</text><text>{{ t('group.inviteMembers') }}</text></view>
    <view class="member-list">
      <view v-for="member in group?.members || []" :key="member.userId" class="member-row">
        <image v-if="member.avatarUrl" :src="member.avatarUrl" class="avatar" mode="aspectFill" />
        <view v-else class="avatar fallback">{{ member.name?.slice(0, 1) || '群' }}</view>
        <view class="copy"><text class="name">{{ member.name || t('chat.member') }}</text><text v-if="member.role === 'admin'" class="admin-tag">{{ t('group.administrator') }}</text></view>
        <text v-if="isActiveAdmin && member.role !== 'admin'" class="remove" @tap.stop="confirmRemove(member)">{{ t('group.remove') }}</text>
      </view>
    </view>
    <MemberPickerSheet :visible="pickerVisible" :title="t('group.inviteMembers')" :excluded-user-ids="memberIds" @close="pickerVisible = false" @confirm="addMembers" />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { addChatMemberApi, getChatGroupDetailApi, removeChatGroupMemberApi } from '@/api/chat.js'
import GroupAvatar from '@/components/chat/GroupAvatar.vue'
import MemberPickerSheet from '@/components/chat/MemberPickerSheet.vue'
import { presentGroupName } from '@/utils/chatGroupPresentation.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'

const groupId = ref('')
const group = ref(null)
const pickerVisible = ref(false)
const memberIds = computed(() => (group.value?.members || []).map(member => Number(member.userId)))
const isActiveAdmin = computed(() => group.value?.role === 'admin' && group.value?.status === 'active')
async function load() {
  if (!groupId.value) return
  try {
    const data = await getChatGroupDetailApi(groupId.value)
    group.value = data?.group || null
    if (group.value) group.value.name = presentGroupName(group.value.name)
  }
  catch (error) { uni.showToast({ title: error?.error || t('group.loadMembersFailed'), icon: 'none' }) }
}
async function addMembers(ids) {
  if (!ids?.length) return uni.showToast({ title: t('group.selectMembers'), icon: 'none' })
  uni.showLoading({ title: t('group.inviting') })
  try {
    await Promise.all(ids.map(userId => addChatMemberApi(groupId.value, userId)))
    pickerVisible.value = false
    await load()
    uni.showToast({ title: t('group.joined'), icon: 'success' })
  } catch (error) { uni.showToast({ title: error?.error || t('group.inviteFailed'), icon: 'none' }) } finally { uni.hideLoading() }
}
function confirmRemove(member) {
  uni.showModal({ title: t('group.removeTitle'), content: t('group.removeContent', { name: member.name || t('chat.member') }), cancelText: t('common.cancel'), confirmText: t('group.remove'), confirmColor: '#fe0101', success: async result => {
    if (!result.confirm) return
    try { await removeChatGroupMemberApi(groupId.value, member.userId); await load(); uni.showToast({ title: t('group.removed'), icon: 'success' }) }
    catch (error) { uni.showToast({ title: error?.error || t('group.removeFailed'), icon: 'none' }) }
  } })
}
onLoad(options => { groupId.value = options.id || '' })
onShow(() => { uni.setNavigationBarTitle({ title: t('group.members') }); load() })
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('group.members') }))
</script>

<style scoped lang="scss">
.page{min-height:100vh;background:#f4f5f7;color:#1b2230}.group-summary{display:flex;align-items:center;gap:20rpx;padding:28rpx 30rpx;background:#fff}.group-summary-copy{display:flex;flex-direction:column;gap:8rpx}.group-name{font-size:32rpx;font-weight:700}.member-count{color:#858c96;font-size:24rpx}.invite-row{display:flex;align-items:center;gap:20rpx;margin-top:18rpx;padding:28rpx 30rpx;background:#fff;color:#73747b;font-size:29rpx}.plus{display:flex;width:62rpx;height:62rpx;align-items:center;justify-content:center;border-radius:50%;background:#edf4fc;font-size:42rpx}.member-list{margin-top:18rpx;background:#fff}.member-row{display:flex;align-items:center;gap:20rpx;padding:24rpx 30rpx;border-bottom:1rpx solid #f0f1f3}.avatar{width:80rpx;height:80rpx;border-radius:50%;overflow:hidden}.fallback{display:flex;align-items:center;justify-content:center;background:#dfe3e8;color:#737b86;font-size:30rpx}.copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:7rpx}.name{font-size:30rpx}.admin-tag{display:inline-flex;align-self:flex-start;padding:4rpx 10rpx;border-radius:12rpx;background:#ffeef1;color:#fe385c;font-size:22rpx}.remove{padding:12rpx 8rpx;color:#fe0039;font-size:26rpx}
</style>
