<template>
  <view class="page">
    <view v-if="loading" class="loading">{{ t('home.loading') }}</view>
    <template v-else-if="group">
      <view class="profile-card">
        <GroupAvatar :avatar-url="group.avatar_url" :members="group.members || []" :size="76" />
        <view class="profile-copy">
          <text class="group-name">{{ group.name }}</text>
          <text class="group-code">{{ t('group.members') }} {{ t('group.memberCount', { count: group.memberCount || 0 }) }}</text>
        </view>
        <text v-if="isActiveAdmin" class="edit-link" @tap="editing = !editing">{{ editing ? t('common.cancel') : t('group.edit') }}</text>
      </view>

      <view v-if="editing && isActiveAdmin" class="card edit-card">
        <text class="card-title">{{ t('group.groupNameAvatar') }}</text>
        <view class="avatar-editor" @tap="chooseAvatar">
          <GroupAvatar :avatar-url="draftAvatarUrl" :members="group.members || []" :size="64" />
          <text>{{ t('group.changeAvatar') }}</text>
        </view>
        <input v-model="draftName" class="name-input" maxlength="60" :placeholder="t('group.groupNamePlaceholder')" />
        <button class="primary-button" :loading="saving" @tap="saveProfile">{{ t('common.save') }}</button>
      </view>

      <view class="card members-card" @tap="openMembers">
        <view class="row-title"><text>{{ t('group.members') }}</text><text class="row-meta">{{ t('group.memberCount', { count: group.memberCount || 0 }) }} 〉</text></view>
        <view class="member-preview">
          <view v-for="member in (group.members || []).slice(0, 4)" :key="member.userId" class="preview-item">
            <image v-if="member.avatarUrl" :src="member.avatarUrl" mode="aspectFill" class="preview-avatar" />
            <view v-else class="preview-avatar fallback">{{ member.name?.slice(0, 1) || '群' }}</view>
            <text>{{ member.name || t('chat.member') }}</text>
          </view>
          <view v-if="isActiveAdmin" class="preview-item">
            <view class="preview-avatar invite">+</view>
            <text>{{ t('group.manage') }}</text>
          </view>
        </view>
      </view>

      <view class="card settings-card">
        <view class="setting-row"><text>{{ t('group.status') }}</text><text :class="group.status === 'dissolved' ? 'status-off' : 'status-on'">{{ group.status === 'dissolved' ? t('group.dissolved') : t('group.normal') }}</text></view>
      </view>
      <button v-if="isActiveAdmin" class="dissolve-button" @tap="confirmDissolve">{{ t('group.dissolve') }}</button>
      <view v-if="group.status === 'dissolved'" class="read-only-note">{{ t('group.dissolvedNote') }}</view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { dissolveChatGroupApi, getChatGroupDetailApi, updateChatGroupApi, uploadChatGroupAvatar } from '@/api/chat.js'
import GroupAvatar from '@/components/chat/GroupAvatar.vue'
import { presentGroupName } from '@/utils/chatGroupPresentation.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'

const groupId = ref('')
const group = ref(null)
const loading = ref(false)
const saving = ref(false)
const editing = ref(false)
const draftName = ref('')
const draftAvatarUrl = ref('')
const isActiveAdmin = computed(() => group.value?.role === 'admin' && group.value?.status === 'active')

async function load() {
  if (!groupId.value) return
  loading.value = true
  try {
    const data = await getChatGroupDetailApi(groupId.value)
    group.value = data?.group || null
    if (group.value) group.value.name = presentGroupName(group.value.name)
    draftName.value = group.value?.name || ''
    draftAvatarUrl.value = group.value?.avatar_url || ''
  } catch (error) {
    uni.showToast({ title: error?.error || t('group.loadFailed'), icon: 'none' })
  } finally {
    loading.value = false
  }
}
function openMembers() { uni.navigateTo({ url: `/pages/chat/groupMembers?id=${groupId.value}` }) }
async function chooseAvatar() {
  try {
    const result = await new Promise((resolve, reject) => uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: resolve,
      fail: reject
    }))
    const filePath = result?.tempFilePaths?.[0]
    if (!filePath) return
    uni.showLoading({ title: t('group.uploadingAvatar') })
    const uploaded = await uploadChatGroupAvatar(groupId.value, filePath)
    draftAvatarUrl.value = uploaded?.url || ''
    if (group.value) group.value.avatar_url = draftAvatarUrl.value
  } catch (error) {
    if (error?.errMsg?.includes('cancel')) return
    uni.showToast({ title: error?.error || t('group.uploadAvatarFailed'), icon: 'none' })
  } finally { uni.hideLoading() }
}
async function saveProfile() {
  const name = draftName.value.trim()
  if (!name) return uni.showToast({ title: t('group.groupNameRequired'), icon: 'none' })
  saving.value = true
  try {
    const data = await updateChatGroupApi(groupId.value, { name, avatarUrl: draftAvatarUrl.value })
    if (group.value) Object.assign(group.value, data?.group || { name, avatar_url: draftAvatarUrl.value })
    editing.value = false
    uni.showToast({ title: t('common.save'), icon: 'success' })
  } catch (error) { uni.showToast({ title: error?.error || t('group.saveFailed'), icon: 'none' }) } finally { saving.value = false }
}
function confirmDissolve() {
  uni.showModal({ title: t('group.dissolveTitle'), content: t('group.dissolveContent'), cancelText: t('common.cancel'), confirmText: t('group.dissolve'), confirmColor: '#fe0101', success: async result => {
    if (!result.confirm) return
    try {
      await dissolveChatGroupApi(groupId.value)
      await load()
      uni.showToast({ title: t('group.dissolvedSuccess'), icon: 'success' })
    } catch (error) { uni.showToast({ title: error?.error || t('group.dissolveFailed'), icon: 'none' }) }
  } })
}
onLoad(options => { groupId.value = options.id || '' })
onShow(() => { uni.setNavigationBarTitle({ title: t('group.manage') }); load() })
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('group.manage') }))
</script>

<style scoped lang="scss">
.page{min-height:100vh;padding:26rpx;box-sizing:border-box;background:#f4f5f7;color:#1b2230}.loading,.read-only-note{padding:80rpx 24rpx;text-align:center;color:#858c96;font-size:27rpx}.profile-card,.card{border-radius:24rpx;background:#fff;box-shadow:0 8rpx 22rpx rgba(28,35,46,.04)}.profile-card{display:flex;align-items:center;gap:20rpx;padding:30rpx}.profile-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:10rpx}.group-name{overflow:hidden;font-size:35rpx;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.group-code,.row-meta{color:#858c96;font-size:25rpx}.edit-link{padding:12rpx;color:#73747b;font-size:27rpx}.card{margin-top:24rpx;padding:28rpx}.card-title,.row-title{font-size:31rpx;font-weight:700}.avatar-editor{display:flex;align-items:center;gap:20rpx;margin:24rpx 0;color:#73747b;font-size:26rpx}.name-input{height:80rpx;padding:0 20rpx;border-radius:14rpx;background:#f4f5f7;font-size:29rpx}.primary-button{margin:24rpx 0 0;border-radius:14rpx;color:#1b2230;background:#ffcf24;font-size:28rpx}.row-title,.setting-row{display:flex;align-items:center;justify-content:space-between}.member-preview{display:flex;gap:22rpx;margin-top:28rpx;overflow:hidden}.preview-item{width:104rpx;flex:none;display:flex;align-items:center;flex-direction:column;gap:10rpx;color:#727984;font-size:21rpx;text-align:center}.preview-avatar{width:82rpx;height:82rpx;border-radius:50%;overflow:hidden}.fallback,.invite{display:flex;align-items:center;justify-content:center;background:#e1e4e8;color:#737b86;font-size:33rpx}.invite{background:#eff3f8;color:#73747b;font-size:46rpx}.settings-card{padding:0}.setting-row{padding:30rpx 28rpx;font-size:30rpx}.status-on{color:#6fba88;font-size:26rpx}.status-off{color:#fe0101;font-size:26rpx}.dissolve-button{margin:24rpx 0 0;border-radius:18rpx;background:#ffeef1;color:#fe385c;font-size:29rpx;font-weight:600}
</style>
