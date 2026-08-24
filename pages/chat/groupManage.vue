<template>
  <view class="page">
    <view v-if="loading" class="loading">加载中…</view>
    <template v-else-if="group">
      <view class="profile-card">
        <GroupAvatar :avatar-url="group.avatar_url" :members="group.members || []" :size="76" />
        <view class="profile-copy">
          <text class="group-name">{{ group.name }}</text>
          <text class="group-code">群成员 {{ group.memberCount || 0 }} 人</text>
        </view>
        <text v-if="isActiveAdmin" class="edit-link" @tap="editing = !editing">{{ editing ? '取消' : '编辑' }}</text>
      </view>

      <view v-if="editing && isActiveAdmin" class="card edit-card">
        <text class="card-title">群名称与头像</text>
        <view class="avatar-editor" @tap="chooseAvatar">
          <GroupAvatar :avatar-url="draftAvatarUrl" :members="group.members || []" :size="64" />
          <text>更换头像</text>
        </view>
        <input v-model="draftName" class="name-input" maxlength="60" placeholder="请输入群名称" />
        <button class="primary-button" :loading="saving" @tap="saveProfile">保存</button>
      </view>

      <view class="card members-card" @tap="openMembers">
        <view class="row-title"><text>群聊成员</text><text class="row-meta">{{ group.memberCount || 0 }} 人 〉</text></view>
        <view class="member-preview">
          <view v-for="member in (group.members || []).slice(0, 4)" :key="member.userId" class="preview-item">
            <image v-if="member.avatarUrl" :src="member.avatarUrl" mode="aspectFill" class="preview-avatar" />
            <view v-else class="preview-avatar fallback">{{ member.name?.slice(0, 1) || '群' }}</view>
            <text>{{ member.name || '成员' }}</text>
          </view>
          <view v-if="isActiveAdmin" class="preview-item">
            <view class="preview-avatar invite">+</view>
            <text>管理</text>
          </view>
        </view>
      </view>

      <view class="card settings-card">
        <view class="setting-row"><text>群状态</text><text :class="group.status === 'dissolved' ? 'status-off' : 'status-on'">{{ group.status === 'dissolved' ? '已解散' : '正常' }}</text></view>
        <view v-if="isActiveAdmin" class="setting-row danger" @tap="confirmDissolve"><text>解散群聊</text><text>〉</text></view>
      </view>
      <view v-if="group.status === 'dissolved'" class="read-only-note">该群已解散，原成员仍可查看历史消息。</view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { dissolveChatGroupApi, getChatGroupDetailApi, updateChatGroupApi, uploadChatGroupAvatar } from '@/api/chat.js'
import GroupAvatar from '@/components/chat/GroupAvatar.vue'
import { presentGroupName } from '@/utils/chatGroupPresentation.js'

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
    uni.showToast({ title: error?.error || '加载群管理失败', icon: 'none' })
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
    uni.showLoading({ title: '头像上传中' })
    const uploaded = await uploadChatGroupAvatar(groupId.value, filePath)
    draftAvatarUrl.value = uploaded?.url || ''
    if (group.value) group.value.avatar_url = draftAvatarUrl.value
  } catch (error) {
    if (error?.errMsg?.includes('cancel')) return
    uni.showToast({ title: error?.error || '头像上传失败', icon: 'none' })
  } finally { uni.hideLoading() }
}
async function saveProfile() {
  const name = draftName.value.trim()
  if (!name) return uni.showToast({ title: '请输入群名称', icon: 'none' })
  saving.value = true
  try {
    const data = await updateChatGroupApi(groupId.value, { name, avatarUrl: draftAvatarUrl.value })
    if (group.value) Object.assign(group.value, data?.group || { name, avatar_url: draftAvatarUrl.value })
    editing.value = false
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (error) { uni.showToast({ title: error?.error || '保存失败', icon: 'none' }) } finally { saving.value = false }
}
function confirmDissolve() {
  uni.showModal({ title: '解散群聊', content: '解散后不能继续发送消息，原成员仍可查看历史记录。确认解散吗？', confirmColor: '#d95050', success: async result => {
    if (!result.confirm) return
    try {
      await dissolveChatGroupApi(groupId.value)
      await load()
      uni.showToast({ title: '群聊已解散', icon: 'success' })
    } catch (error) { uni.showToast({ title: error?.error || '解散失败', icon: 'none' }) }
  } })
}
onLoad(options => { groupId.value = options.id || '' })
onShow(load)
</script>

<style scoped lang="scss">
.page{min-height:100vh;padding:26rpx;box-sizing:border-box;background:#f4f5f7;color:#1b2230}.loading,.read-only-note{padding:80rpx 24rpx;text-align:center;color:#858c96;font-size:27rpx}.profile-card,.card{border-radius:24rpx;background:#fff;box-shadow:0 8rpx 22rpx rgba(28,35,46,.04)}.profile-card{display:flex;align-items:center;gap:20rpx;padding:30rpx}.profile-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:10rpx}.group-name{overflow:hidden;font-size:35rpx;font-weight:700;text-overflow:ellipsis;white-space:nowrap}.group-code,.row-meta{color:#858c96;font-size:25rpx}.edit-link{padding:12rpx;color:#1768ae;font-size:27rpx}.card{margin-top:24rpx;padding:28rpx}.card-title,.row-title{font-size:31rpx;font-weight:700}.avatar-editor{display:flex;align-items:center;gap:20rpx;margin:24rpx 0;color:#1768ae;font-size:26rpx}.name-input{height:80rpx;padding:0 20rpx;border-radius:14rpx;background:#f4f5f7;font-size:29rpx}.primary-button{margin:24rpx 0 0;border-radius:14rpx;color:#1b2230;background:#ffcf24;font-size:28rpx}.row-title,.setting-row{display:flex;align-items:center;justify-content:space-between}.member-preview{display:flex;gap:22rpx;margin-top:28rpx;overflow:hidden}.preview-item{width:104rpx;flex:none;display:flex;align-items:center;flex-direction:column;gap:10rpx;color:#727984;font-size:21rpx;text-align:center}.preview-avatar{width:82rpx;height:82rpx;border-radius:50%;overflow:hidden}.fallback,.invite{display:flex;align-items:center;justify-content:center;background:#e1e4e8;color:#737b86;font-size:33rpx}.invite{background:#eff3f8;color:#1768ae;font-size:46rpx}.settings-card{padding:0}.setting-row{padding:30rpx 28rpx;border-bottom:1rpx solid #f0f1f3;font-size:30rpx}.setting-row:last-child{border:0}.status-on{color:#35a263;font-size:26rpx}.status-off,.danger{color:#d95050}.danger{font-weight:600}
</style>
