<template>
  <view v-if="profile" class="page">
    <ProfileDetailSections
      :profile="profile"
      :enable-like="true"
      :liked="isLiked"
      :like-count="likeCount"
      @toggle-like="toggleProfileLike"
    />
    <view v-if="canRequestChat" class="chat-request" @click="requestChat">申请私聊</view>
  </view>

  <view v-else-if="loading" class="state-box"><text>載入中...</text></view>
  <view v-else class="state-box">
    <text>候選人不存在或已被移除</text>
    <view class="btn-back" @tap="goBack">返回</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCandidateProfileApi, getProfileLikesApi, toggleProfileLikeApi } from '@/api/index.js'
import ProfileDetailSections from '@/components/profile/ProfileDetailSections.vue'
import { createChatRequestApi } from '@/api/chat.js'

// 升级 key，确保此前没有看到引导的用户也能在本次功能发布后看到一次说明。
const GUIDE_KEY = 'PROFILE_LIKE_DOUBLE_TAP_GUIDE_V2'
const profile = ref(null)
const loading = ref(true)
const isLiked = ref(false)
const likeCount = ref(0)
const likePending = ref(false)
const profileId = ref(null)
const canRequestChat = ref(false)

onLoad((options) => {
  profileId.value = options?.id ? Number(options.id) : null
  if (!profileId.value) {
    loading.value = false
    return
  }
  fetchProfile()
})

async function fetchProfile() {
  loading.value = true
  try {
    const data = await getCandidateProfileApi(profileId.value)
    profile.value = data?.profile || null
    if (!profile.value) return
    const currentUserId = Number(uni.getStorageSync('USER_INFO')?.id)
    canRequestChat.value = Number(profile.value.user_id) !== currentUserId

    const likeData = await getProfileLikesApi(profile.value.id)
    const likes = Array.isArray(likeData.likes) ? likeData.likes : []
    // const currentUserId = uni.getStorageSync('USER_INFO')?.id

    // 新接口由后端直接提供 isLiked / total；旧线上接口仅返回 likes 时，
    // 用缓存中的当前用户 id 和列表长度兜底，避免返回页面后红心错误变灰。
    isLiked.value = typeof likeData.isLiked === 'boolean'
      ? likeData.isLiked
      : likes.some(like => Number(like.userId ?? like.user_id) === Number(currentUserId))
    likeCount.value = Number(likeData.total ?? likes.length)
    showLikeGuideOnce()
  } catch (error) {
    console.error('加载候选人资料失败', error)
    profile.value = null
    uni.showToast({ title: '載入失敗', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function requestChat() {
  uni.showModal({ title: '申请私聊', editable: true, placeholderText: '可填写申请说明', success: async ({ confirm, content }) => {
    if (!confirm) return
    try {
      await createChatRequestApi({ targetUserId: profile.value.user_id, message: content || '' })
      uni.showToast({ title: '已提交管理员审核', icon: 'success' })
    } catch (error) { uni.showToast({ title: error?.error || '提交失败', icon: 'none' }) }
  } })
}

// 点赞接口返回最终状态。页面先乐观更新，失败时恢复，避免网络波动造成错误显示。
async function toggleProfileLike() {
  if (!profile.value || likePending.value) return
  const previousLiked = isLiked.value
  const previousCount = likeCount.value

  isLiked.value = !previousLiked
  likeCount.value = Math.max(0, previousCount + (isLiked.value ? 1 : -1))
  likePending.value = true

  try {
    const result = await toggleProfileLikeApi(profile.value.id)
    isLiked.value = !!result.isLiked
    likeCount.value = Number(result.likeCount || 0)
  } catch (error) {
    console.error('资料点赞失败', error)
    isLiked.value = previousLiked
    likeCount.value = previousCount
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    likePending.value = false
  }
}

function showLikeGuideOnce() {
  if (uni.getStorageSync(GUIDE_KEY)) return
  // 等页面完成首次渲染后再弹出，避免 App 端页面切换期间的弹窗被吞掉。
  setTimeout(() => {
    uni.showModal({
      title: '点赞提示',
      content: '双击照片可点赞，再次双击可取消点赞。',
      showCancel: false,
      success: () => uni.setStorageSync(GUIDE_KEY, '1')
    })
  }, 250)
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/searchPerson/searchPerson' })
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #fff6df; }
.state-box { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; color: #666; font-size: 28rpx; }
.btn-back { margin-top: 30rpx; padding: 16rpx 60rpx; background: #fff6df; color: #333; border-radius: 8rpx; font-size: 28rpx; }
.chat-request { margin: 24rpx; padding: 22rpx; border-radius: 14rpx; background: #ffce00; color: #222; text-align: center; font-weight: 700; }
</style>
