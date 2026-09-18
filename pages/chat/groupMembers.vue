<template>
  <view class="page app-h5-min-screen">
    <ChatPageHeader :title="t('group.members')">
      <template #action><button v-if="isActiveAdmin" class="header-action" @tap="removeMode = !removeMode">{{ removeMode ? t('chatDesign.done') : t('group.remove') }}</button></template>
    </ChatPageHeader>
    <view class="page-content">
      <view v-if="loading && !group" class="page-state">{{ t('home.loading') }}</view>
      <view v-else-if="loadError" class="page-state" role="alert"><text>{{ loadError }}</text><button class="retry-button" @tap="load">{{ t('chatDesign.retry') }}</button></view>
      <template v-else-if="group">
        <view class="group-summary"><GroupAvatar :avatar-url="group.avatar_url" :members="group.members || []" :size="54" /><view class="group-summary-copy"><text class="group-name">{{ group.name }}</text><text class="member-count">{{ t('group.memberCount', { count: group.members?.length || 0 }) }}</text></view></view>
        <button v-if="isActiveAdmin" class="invite-row" @tap="openPicker"><view class="plus">＋</view><text>{{ t('group.inviteMembers') }}</text><view class="chevron" /></button>
        <view class="member-list">
          <view v-for="member in group.members || []" :key="member.userId" class="member-row">
            <button class="member-open" :aria-label="t('chatDesign.viewProfile') + ' ' + memberName(member)" @tap="viewMember(member)">
              <image v-if="member.avatarUrl" :src="member.avatarUrl" class="avatar" mode="aspectFill" /><view v-else class="avatar fallback">{{ memberName(member).slice(0, 1) }}</view>
              <view class="copy"><text class="name">{{ memberName(member) }}</text><text v-if="member.role === 'admin'" class="admin-tag">{{ t('group.administrator') }}</text><text v-else class="member-label">{{ t('chat.member') }}</text></view>
              <view v-if="!removeMode || !canRemove(member)" class="chevron" />
            </button>
            <button v-if="removeMode && canRemove(member)" class="remove-button" :aria-label="t('group.remove') + ' ' + memberName(member)" @tap="confirmRemove(member)"><view class="minus-icon">−</view></button>
          </view>
          <view v-if="!group.members?.length" class="empty-members">{{ t('chat.noMembers') }}</view>
        </view>
      </template>
    </view>
    <MemberPickerSheet :visible="pickerVisible" :title="t('group.inviteMembers')" :excluded-user-ids="memberIds" :busy="inviting" @close="closePicker" @confirm="addMembers" />
    <ChatSheet :open="removeOpen" :label="t('group.removeTitle')" :busy="removing" @dismiss="closeRemove" @after-close="clearRemoveTarget">
      <view class="sheet-content"><text class="sheet-title">{{ t('group.removeTitle') }}</text><text class="confirmation-copy">{{ t('group.removeContent', { name: memberName(removeTarget) }) }}</text><button class="danger-button" :loading="removing" :disabled="removing || !canRemove(removeTarget)" @tap="removeMember">{{ t('group.remove') }}</button><button class="cancel-button" :disabled="removing" @tap="closeRemove">{{ t('common.cancel') }}</button></view>
    </ChatSheet>
    <ProfileDetailSheet :profile-id="sheetProfileId" :page-visible="sheetPageVisible" :interactions-enabled="false" @closed="closeProfileSheet" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { addChatMemberApi, getChatGroupDetailApi, removeChatGroupMemberApi } from '@/api/chat.js'
import GroupAvatar from '@/components/chat/GroupAvatar.vue'
import ChatPageHeader from '@/components/chat/ChatPageHeader.vue'
import ChatSheet from '@/components/chat/ChatSheet.vue'
import MemberPickerSheet from '@/components/chat/MemberPickerSheet.vue'
import ProfileDetailSheet from '@/components/profile/ProfileDetailSheet.vue'
import { useProfileDetailSheet } from '@/utils/useProfileDetailSheet.js'
import { presentGroupName } from '@/utils/chatGroupPresentation.js'
import { t } from '@/utils/localeRuntime.js'

const { profileId: sheetProfileId, pageVisible: sheetPageVisible, open: openProfileSheet, close: closeProfileSheet } = useProfileDetailSheet()
const groupId = ref(''), group = ref(null), loading = ref(false), loadError = ref('')
const pickerVisible = ref(false), inviting = ref(false), invitedIds = ref([])
const removeMode = ref(false), removeOpen = ref(false), removing = ref(false), removeTarget = ref(null)
const initialAction = ref('')
const myId = computed(() => Number(uni.getStorageSync('USER_INFO')?.id))
const memberIds = computed(() => [...new Set([...(group.value?.members || []).map(member => Number(member.userId)), ...invitedIds.value])])
const isActiveAdmin = computed(() => !loadError.value && group.value?.canManage === true && group.value?.status === 'active')
const memberName = member => String(member?.name || '').trim() || t('profile.user')
const canRemove = member => !!member && isActiveAdmin.value && member.role !== 'admin' && Number(member.userId) !== myId.value

async function load() {
  if (loading.value) return false
  loading.value = true
  try {
    if (!groupId.value) throw new Error('missing-group')
    const data = await getChatGroupDetailApi(groupId.value)
    if (!data?.group) throw new Error('missing-group')
    group.value = { ...data.group, name: presentGroupName(data.group.name) }
    // Optimistic exclusions are only needed until membership is confirmed.
    // Thereafter a later removal must allow that person to be invited again.
    const confirmedIds = new Set((group.value.members || []).map(member => Number(member.userId)))
    invitedIds.value = invitedIds.value.filter(id => !confirmedIds.has(id))
    loadError.value = ''
    if (isActiveAdmin.value && initialAction.value === 'invite') pickerVisible.value = true
    if (isActiveAdmin.value && initialAction.value === 'remove') removeMode.value = true
    initialAction.value = ''
    if (!isActiveAdmin.value) { pickerVisible.value = false; removeMode.value = false; removeOpen.value = false }
    return true
  } catch (error) { loadError.value = error?.error || t('group.loadMembersFailed'); return false }
  finally { loading.value = false }
}
function openPicker() { if (isActiveAdmin.value && !inviting.value) pickerVisible.value = true }
function closePicker() { if (!inviting.value) pickerVisible.value = false }
function viewMember(member) {
  if (pickerVisible.value || removeOpen.value) return
  const id = Number(member.profileId)
  if (!Number.isSafeInteger(id) || id <= 0) return uni.showToast({ title: t('chatDesign.noProfile'), icon: 'none' })
  openProfileSheet(id)
}
async function addMembers(ids) {
  if (!isActiveAdmin.value || inviting.value) return
  const existing = new Set(memberIds.value)
  const pending = [...new Set((Array.isArray(ids) ? ids : []).map(Number))].filter(id => Number.isSafeInteger(id) && id > 0 && !existing.has(id))
  if (!pending.length) return uni.showToast({ title: t('group.selectMembers'), icon: 'none' })
  inviting.value = true
  try {
    const results = await Promise.allSettled(pending.map(id => addChatMemberApi(groupId.value, id)))
    const succeeded = pending.filter((_, index) => results[index].status === 'fulfilled')
    const failed = results.filter(result => result.status === 'rejected')
    // Keep successful additions excluded even if refreshing details fails.
    invitedIds.value = [...new Set([...invitedIds.value, ...succeeded])]
    if (succeeded.length) await load()
    if (!failed.length) {
      pickerVisible.value = false
      uni.showToast({ title: t('group.joined'), icon: 'success' })
    } else {
      // A stale membership snapshot must not permit new mutations. Reopening
      // after retry uses invitedIds to avoid sending successful additions twice.
      if (loadError.value) pickerVisible.value = false
      uni.showToast({ title: succeeded.length ? t('chatDesign.partialInvite') : failed[0].reason?.error || t('group.inviteFailed'), icon: 'none' })
    }
  } finally { inviting.value = false }
}
function confirmRemove(member) {
  if (!canRemove(member) || removing.value) return
  removeTarget.value = member
  removeOpen.value = true
}
function closeRemove() { if (!removing.value) removeOpen.value = false }
function clearRemoveTarget() { if (!removeOpen.value) removeTarget.value = null }
async function removeMember() {
  if (removing.value || !canRemove(removeTarget.value)) return
  removing.value = true
  try {
    const id = Number(removeTarget.value.userId)
    await removeChatGroupMemberApi(groupId.value, id)
    group.value.members = group.value.members.filter(member => Number(member.userId) !== id)
    group.value.memberCount = group.value.members.length
    invitedIds.value = invitedIds.value.filter(memberId => memberId !== id)
    removeOpen.value = false
    uni.showToast({ title: t('group.removed'), icon: 'success' })
  } catch (error) { uni.showToast({ title: error?.error || t('group.removeFailed'), icon: 'none' }) }
  finally { removing.value = false }
}
onLoad(options => { groupId.value = options.id || ''; initialAction.value = options.action || '' })
onShow(() => { if (!pickerVisible.value && !removeOpen.value && !sheetProfileId.value) load() })
</script>

<style scoped lang="scss">
.page{min-height:100vh;background:#eeedeb;color:#292825}.page-content{padding:8px 20px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box}
button{margin:0;padding:0;border:0;border-radius:0;background:transparent;color:inherit;font-size:14px;line-height:1.45;text-align:left;box-sizing:border-box}button::after{border:0}button:active{opacity:.76}button[disabled]{opacity:.5}.header-action{padding:12px 5px;color:#918d85;min-height:44px;text-align:center;font-size:12px;overflow-wrap:anywhere}
.group-summary{display:flex;align-items:center;gap:14px;padding:14px 3px 22px}.group-summary-copy{min-width:0;display:flex;flex-direction:column;gap:7px}.group-name{font-size:19px;font-weight:600;overflow-wrap:anywhere}.member-count{color:#918d85;font-size:12px}.invite-row{display:flex;align-items:center;gap:13px;width:100%;margin-bottom:13px;padding:16px;background:#fff;border-radius:23px;font-size:14px}.invite-row>text{flex:1;min-width:0;overflow-wrap:anywhere}.plus{display:flex;width:42px;height:42px;align-items:center;justify-content:center;flex-shrink:0;border-radius:15px;background:#fcf2ce;color:#9e8436;font-size:26px}.member-list{border-radius:23px;overflow:hidden;background:#fff;padding:0 16px}.member-row{display:flex;align-items:center;gap:4px;border-bottom:1px solid #f2f0ec}.member-row:last-child{border-bottom:0}.member-open{display:flex;flex:1;min-width:0;align-items:center;gap:13px;min-height:83px;padding:15px 0}.avatar{width:48px;height:48px;flex-shrink:0;border-radius:50%;overflow:hidden}.fallback{display:flex;align-items:center;justify-content:center;background:#e8e3d8;color:#7d7361;font-size:18px}.copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:6px}.name{font-size:15px;overflow-wrap:anywhere}.admin-tag{align-self:flex-start;max-width:100%;box-sizing:border-box;padding:3px 8px;border-radius:8px;background:#fbf2d7;color:#a38a44;font-size:10px;overflow-wrap:anywhere}.member-label{font-size:11px;color:#918d85}.chevron{width:6px;height:6px;border-right:1.5px solid #a9a59e;border-top:1.5px solid #a9a59e;transform:rotate(45deg);flex-shrink:0;margin-right:3px}.remove-button{display:flex;width:44px;height:48px;align-items:center;justify-content:center;flex-shrink:0;color:#b66663}.minus-icon{width:22px;height:22px;border:1.5px solid #b66663;border-radius:50%;text-align:center;font-size:21px;line-height:19px}.page-state{display:flex;flex-direction:column;align-items:center;gap:16px;padding:64px 12px;text-align:center;font-size:14px;color:#918d85}.retry-button{padding:11px 24px;background:#fff;border-radius:22px;color:#292825}.empty-members{padding:42px 16px;text-align:center;font-size:14px;color:#918d85}.sheet-content{padding:24px 22px calc(20px + env(safe-area-inset-bottom));color:#292825}.sheet-title{display:block;font-size:19px;font-weight:600}.confirmation-copy{display:block;margin:16px 0 22px;color:#918d85;font-size:14px;line-height:1.7}.danger-button,.cancel-button{width:100%;min-height:50px;padding:14px 18px;border-radius:20px;text-align:center;font-size:15px}.danger-button{background:#f6e9e6;color:#b66663}.cancel-button{margin-top:8px;background:#f2f0ed}
</style>
