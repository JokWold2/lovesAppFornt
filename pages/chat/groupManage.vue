<template>
  <view class="page app-h5-min-screen">
    <ChatPageHeader :title="t('inbox.groupManage')" />
    <view class="page-content">
      <view v-if="loading && !group" class="page-state">{{ t('home.loading') }}</view>
      <view v-else-if="loadError" class="page-state" role="alert"><text>{{ loadError }}</text><button class="retry-button" @tap="load">{{ t('chatDesign.retry') }}</button></view>
      <template v-else-if="group">
        <view class="group-hero"><GroupAvatar :avatar-url="group.avatar_url" :members="group.members || []" :size="76" /><text class="group-name">{{ group.name }}</text><text class="muted">{{ t('group.memberCount', { count: memberCount }) }}</text></view>
        <view class="card members-card">
          <button class="section-link" @tap="openMembers()"><text>{{ t('group.members') }}</text><view class="link-tail"><text>{{ t('chatDesign.viewAll') }}</text><view class="chevron" /></view></button>
          <view v-if="group.members?.length" class="member-preview">
            <button v-for="member in group.members.slice(0, 4)" :key="member.userId" class="preview-item" :aria-label="t('chatDesign.viewProfile') + ' ' + memberName(member)" @tap="viewMember(member)">
              <image v-if="member.avatarUrl" :src="member.avatarUrl" mode="aspectFill" class="preview-avatar" /><view v-else class="preview-avatar fallback">{{ memberName(member).slice(0, 1) }}</view><text>{{ memberName(member) }}</text>
            </button>
          </view>
          <view v-else class="empty-members">{{ t('chat.noMembers') }}</view>
        </view>
        <view class="card settings-card">
          <button class="setting-row" :disabled="!isActiveAdmin" @tap="openEditor"><text>{{ t('group.groupNameAvatar') }}</text><view v-if="isActiveAdmin" class="link-tail"><text>{{ t('group.edit') }}</text><view class="chevron" /></view></button>
          <view class="setting-row"><text>{{ t('group.status') }}</text><text :class="group.status === 'dissolved' ? 'status-off' : 'status-on'">{{ group.status === 'dissolved' ? t('group.dissolved') : t('group.normal') }}</text></view>
        </view>
        <view v-if="isActiveAdmin" class="card admin-actions">
          <button class="action-row" @tap="openMembers('invite')"><view class="action-icon">＋</view><text>{{ t('group.inviteMembers') }}</text><view class="chevron" /></button>
          <button class="action-row" @tap="openMembers('remove')"><view class="action-icon quiet">−</view><text>{{ t('chatDesign.removeMembers') }}</text><view class="chevron" /></button>
        </view>
        <button v-if="isActiveAdmin" class="dissolve-button" @tap="dissolveOpen = true">{{ t('group.dissolve') }}</button>
        <view v-if="group.status === 'dissolved'" class="read-only-note">{{ t('group.dissolvedNote') }}</view>
      </template>
    </view>
    <ChatSheet :open="editing" :label="t('group.groupNameAvatar')" :busy="saving || uploading" @dismiss="closeEditor">
      <view class="sheet-content">
        <view class="sheet-heading"><text>{{ t('group.groupNameAvatar') }}</text><button class="close-button" :disabled="saving || uploading" :aria-label="t('chatDesign.close')" @tap="closeEditor">×</button></view>
        <button class="avatar-editor" :disabled="saving || uploading || !isActiveAdmin" @tap="chooseAvatar"><GroupAvatar :avatar-url="draftAvatarUrl" :members="group?.members || []" :size="64" /><text>{{ uploading ? t('group.uploadingAvatar') : t('group.changeAvatar') }}</text></button>
        <input v-model="draftName" class="name-input" maxlength="60" :disabled="saving || uploading" :placeholder="t('group.groupNamePlaceholder')" :aria-label="t('group.groupNamePlaceholder')" />
        <button class="primary-button" :loading="saving" :disabled="saving || uploading || !isActiveAdmin" @tap="saveProfile">{{ t('common.save') }}</button>
      </view>
    </ChatSheet>
    <ChatSheet :open="dissolveOpen" :label="t('group.dissolveTitle')" :busy="dissolving" @dismiss="closeDissolve">
      <view class="sheet-content"><text class="sheet-title">{{ t('group.dissolveTitle') }}</text><text class="confirmation-copy">{{ t('group.dissolveContent') }}</text><button class="danger-button" :loading="dissolving" :disabled="dissolving || !isActiveAdmin" @tap="dissolve">{{ t('group.dissolve') }}</button><button class="cancel-button" :disabled="dissolving" @tap="closeDissolve">{{ t('common.cancel') }}</button></view>
    </ChatSheet>
    <ProfileDetailSheet :profile-id="sheetProfileId" :page-visible="sheetPageVisible" :interactions-enabled="false" @closed="closeProfileSheet" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { dissolveChatGroupApi, getChatGroupDetailApi, updateChatGroupApi, uploadChatGroupAvatar } from '@/api/chat.js'
import GroupAvatar from '@/components/chat/GroupAvatar.vue'
import ChatPageHeader from '@/components/chat/ChatPageHeader.vue'
import ChatSheet from '@/components/chat/ChatSheet.vue'
import ProfileDetailSheet from '@/components/profile/ProfileDetailSheet.vue'
import { useProfileDetailSheet } from '@/utils/useProfileDetailSheet.js'
import { presentGroupName } from '@/utils/chatGroupPresentation.js'
import { t } from '@/utils/localeRuntime.js'

const { profileId: sheetProfileId, pageVisible: sheetPageVisible, open: openProfileSheet, close: closeProfileSheet } = useProfileDetailSheet()
const groupId = ref(''), group = ref(null), loading = ref(false), loadError = ref('')
const saving = ref(false), uploading = ref(false), editing = ref(false), dissolving = ref(false), dissolveOpen = ref(false)
const draftName = ref(''), draftAvatarUrl = ref('')
const isActiveAdmin = computed(() => !loadError.value && group.value?.canManage === true && group.value?.status === 'active')
const memberCount = computed(() => group.value?.memberCount ?? group.value?.members?.length ?? 0)
const memberName = member => String(member?.name || '').trim() || t('profile.user')

async function load() {
  if (loading.value) return
  loading.value = true
  try {
    if (!groupId.value) throw new Error('missing-group')
    const data = await getChatGroupDetailApi(groupId.value)
    if (!data?.group) throw new Error('missing-group')
    group.value = { ...data.group, name: presentGroupName(data.group.name) }
    loadError.value = ''
    return true
  } catch (error) { loadError.value = error?.error || t('group.loadFailed'); return false }
  finally { loading.value = false }
}
function openMembers(action = '') {
  if (action && !isActiveAdmin.value) return
  uni.navigateTo({ url: '/pages/chat/groupMembers?id=' + encodeURIComponent(groupId.value) + (action ? '&action=' + action : '') })
}
function viewMember(member) {
  const id = Number(member.profileId)
  if (!Number.isSafeInteger(id) || id <= 0) return uni.showToast({ title: t('chatDesign.noProfile'), icon: 'none' })
  openProfileSheet(id)
}
function openEditor() {
  if (!isActiveAdmin.value || saving.value || uploading.value) return
  draftName.value = group.value.name || ''
  draftAvatarUrl.value = group.value.avatar_url || ''
  editing.value = true
}
function closeEditor() { if (!saving.value && !uploading.value) editing.value = false }
function closeDissolve() { if (!dissolving.value) dissolveOpen.value = false }
async function chooseAvatar() {
  if (!isActiveAdmin.value || uploading.value || saving.value) return
  uploading.value = true
  try {
    const result = await new Promise((resolve, reject) => uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: resolve, fail: reject }))
    const filePath = result?.tempFilePaths?.[0]
    if (!filePath) return
    const uploaded = await uploadChatGroupAvatar(groupId.value, filePath)
    if (!uploaded?.url) throw new Error('missing-avatar')
    draftAvatarUrl.value = uploaded.url
    // Uploading persists the avatar immediately in the existing API.
    if (group.value) group.value.avatar_url = uploaded.url
  } catch (error) {
    if (!error?.errMsg?.includes('cancel')) uni.showToast({ title: error?.error || t('group.uploadAvatarFailed'), icon: 'none' })
  } finally { uploading.value = false }
}
async function saveProfile() {
  if (!isActiveAdmin.value || saving.value || uploading.value) return
  const name = draftName.value.trim()
  if (!name) return uni.showToast({ title: t('group.groupNameRequired'), icon: 'none' })
  saving.value = true
  try {
    const data = await updateChatGroupApi(groupId.value, { name, avatarUrl: draftAvatarUrl.value })
    Object.assign(group.value, { name, avatar_url: draftAvatarUrl.value }, data?.group || {})
    editing.value = false
    uni.showToast({ title: t('common.save'), icon: 'success' })
  } catch (error) { uni.showToast({ title: error?.error || t('group.saveFailed'), icon: 'none' }) }
  finally { saving.value = false }
}
async function dissolve() {
  if (!isActiveAdmin.value || dissolving.value) return
  dissolving.value = true
  try {
    await dissolveChatGroupApi(groupId.value)
    group.value.status = 'dissolved'
    group.value.canManage = false
    dissolveOpen.value = false
    uni.showToast({ title: t('group.dissolvedSuccess'), icon: 'success' })
  } catch (error) { uni.showToast({ title: error?.error || t('group.dissolveFailed'), icon: 'none' }) }
  finally { dissolving.value = false }
}
onLoad(options => { groupId.value = options.id || '' })
onShow(() => { if (!editing.value && !dissolveOpen.value && !sheetProfileId.value) load() })
</script>

<style scoped lang="scss">
.page{min-height:100vh;background:#eeedeb;color:#292825}.page-content{padding:8px 20px calc(28px + env(safe-area-inset-bottom));box-sizing:border-box}
button{margin:0;padding:0;border:0;border-radius:0;background:transparent;color:inherit;font-size:14px;line-height:1.45;text-align:left;box-sizing:border-box}button::after{border:0}button[disabled]{color:inherit;background:transparent;opacity:.5}button:active{opacity:.76}
.group-hero{display:flex;flex-direction:column;align-items:center;padding:9px 0 25px;gap:7px}.group-name{max-width:100%;margin-top:6px;font-size:22px;font-weight:600;text-align:center;overflow-wrap:anywhere}.muted{font-size:12px;color:#918d85}.card{margin-bottom:12px;background:#fff;border-radius:23px;overflow:hidden}.members-card{padding:0 16px 18px}.section-link,.setting-row{display:flex;width:100%;min-height:56px;align-items:center;justify-content:space-between;gap:12px}.section-link{font-weight:600}.link-tail{display:flex;align-items:center;gap:8px;color:#918d85;font-size:12px;flex-shrink:0;font-weight:400}.chevron{width:6px;height:6px;border-right:1.5px solid #a9a59e;border-top:1.5px solid #a9a59e;transform:rotate(45deg);flex-shrink:0;margin-right:3px}.member-preview{display:flex;gap:8px}.preview-item{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;min-width:0;max-width:25%;font-size:11px;color:#777269}.preview-item>text{width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}.preview-avatar{width:48px;height:48px;border-radius:50%;flex-shrink:0}.fallback{display:flex;align-items:center;justify-content:center;background:#e8e3d8;color:#7d7361;font-size:18px}.setting-row{padding:17px 18px;font-size:14px;box-sizing:border-box}.section-link>text,.setting-row>text{min-width:0;white-space:normal;overflow-wrap:anywhere}.section-link>text:first-child,.setting-row>text:first-child{flex:1}.setting-row>text:last-child:not(:first-child){max-width:45%;text-align:right}.section-link>.link-tail,.setting-row>.link-tail{max-width:50%;min-width:0;flex-shrink:1}.link-tail>text{min-width:0;white-space:normal;overflow-wrap:anywhere}.setting-row+.setting-row{border-top:1px solid #f2f0ec}.setting-row[disabled]{opacity:1}.status-on{color:#838c77;font-size:12px}.status-off{color:#b46b69;font-size:12px}.action-row{display:flex;align-items:center;gap:12px;width:100%;min-height:68px;padding:14px 17px}.action-row+.action-row{border-top:1px solid #f2f0ec}.action-row>text{flex:1;min-width:0;overflow-wrap:anywhere}.action-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:13px;background:var(--bless-soft, #F1E4BD);color:var(--bless-text, #775E25);font-size:25px;flex-shrink:0}.action-icon.quiet{background:#f2f0ec;color:#8d887e}.dissolve-button{width:100%;min-height:52px;margin-top:20px;border-radius:20px;background:#f6e9e6;color:#b66663;text-align:center;padding:14px;font-weight:500}.page-state,.read-only-note{display:flex;flex-direction:column;align-items:center;gap:16px;padding:64px 12px;text-align:center;font-size:14px;color:#918d85}.read-only-note{padding:18px 8px;line-height:1.6}.empty-members{padding:15px 0;text-align:center;color:#918d85;font-size:13px}.retry-button{padding:11px 24px;background:#fff;border-radius:22px;color:#292825}.sheet-content{padding:20px 22px calc(20px + env(safe-area-inset-bottom));color:#292825}.sheet-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:18px;font-weight:600}.close-button{width:44px;height:44px;border-radius:50%;font-size:25px;text-align:center;background:#f3f1ee}.avatar-editor{display:flex;align-items:center;gap:16px;width:100%;padding:22px 0;color:#918d85}.name-input{height:50px;padding:0 16px;border-radius:16px;background:#f2f0ed;font-size:15px}.primary-button,.danger-button,.cancel-button{width:100%;padding:14px 18px;margin-top:16px;border-radius:20px;text-align:center;font-size:15px;min-height:50px}.primary-button{background:var(--bless-primary, #C2A052);font-weight:600}.danger-button{background:#f6e9e6;color:#b66663}.cancel-button{margin-top:8px;background:#f2f0ed}.sheet-title{display:block;font-size:19px;font-weight:600}.confirmation-copy{display:block;margin:16px 0 22px;color:#918d85;font-size:14px;line-height:1.7}.primary-button[disabled],.danger-button[disabled],.cancel-button[disabled]{background:#eeeae2}
</style>
