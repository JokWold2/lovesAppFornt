<template>
  <view v-if="profile" class="page app-h5-min-screen">
    <ProfileDetailSections
      :profile="profile"
      :enable-like="true"
      :liked="isLiked"
      :like-count="likeCount"
      @toggle-like="toggleProfileLike"
    />
    <view v-if="canRequestChat" class="chat-request" :class="`chat-request--${chatRequestButton.tone}`" :aria-busy="chatPending" @click="requestChat">{{ chatPending ? t('deck.saving') : chatRequestButton.text }}</view>
  </view>

  <view v-else-if="loading" class="state-box"><text>{{ t('profile.loading') }}</text></view>
  <view v-else class="state-box">
    <text>{{ t('profile.missing') }}</text>
    <view class="btn-back" @tap="goBack">{{ t('profile.back') }}</view>
  </view>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getCandidateProfileApi, getProfileLikesApi, toggleProfileLikeApi } from '@/api/index.js'
import ProfileDetailSections from '@/components/profile/ProfileDetailSections.vue'
import { createChatRequestApi, getChatRequestStatusApi } from '@/api/chat.js'
import { getChatRequestButtonState, getChatRequestEntryState } from '@/utils/chatRequestState.js'
import { decideBlessingApi } from '@/api/membership.js'
import { createBlessingOperations } from '@/utils/blessingInteractions.js'
import { createMembershipRequestId, getMembershipChatPrompt, handleMembershipError, notifyBlessingChanged } from '@/utils/membership.js'
import { t } from '@/utils/localeRuntime.js'
import { getToken } from '@/utils/auth.js'
import { markProfileLikeViewedApi } from '@/api/notifications.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'

// 升级 key，确保此前没有看到引导的用户也能在本次功能发布后看到一次说明。
const GUIDE_KEY = 'PROFILE_LIKE_DOUBLE_TAP_GUIDE_V2'
const profile = ref(null)
const loading = ref(true)
const isLiked = ref(false)
const likeCount = ref(0)
const likePending = ref(false)
const profileId = ref(null)
const canRequestChat = ref(false)
const chatState = ref({ status: 'none', isLiked: false, mutual: false, groupId: null })
const chatPending = ref(false)
let unlikeRequestId = null
let relationshipRevision = 0, likeReadRevision = 0, chatReadRevision = 0
let pageVisible = false, disposed = false, profileGeneration = 0
let profileRequest = null, pendingLikeView = null
const operations = createBlessingOperations({ decide: decideBlessingApi, createRequestId: createMembershipRequestId })
const chatRequestButton = computed(() => getChatRequestButtonState(chatState.value, {
  requestChat: t('profile.requestChat'),
  requestPending: t('profile.requestPending'),
  requestApproved: t('profile.requestApproved'),
  enterGroup: t('deck.enterGroup')
}))

onLoad((options) => {
  profileId.value = options?.id ? Number(options.id) : null
  if (!profileId.value) {
    loading.value = false
    return
  }
  fetchProfile()
})

onShow(() => {
  pageVisible = true
  if (!profileId.value) return
  if (profileRequest) acknowledgeProfileView()
  else fetchProfile()
})

function invalidateProfileView() {
  profileGeneration++
  profileRequest = null
  pendingLikeView = null
}
onHide(() => { pageVisible = false; invalidateProfileView() })
onUnload(disposeProfileView)

function currentProfileRequest(request) {
  return !disposed && request.generation === profileGeneration && request.token === getToken() && request.profileId === profileId.value
}

async function acknowledgeProfileView() {
  const view = pendingLikeView
  if (!pageVisible || !view || !view.token || !currentProfileRequest(view)) return
  // Vue's render tick works on H5, WeChat and App; navigating to this page or
  // receiving JSON alone must never count as having seen someone's profile.
  await nextTick()
  if (!pageVisible || pendingLikeView !== view || !currentProfileRequest(view) || Number(profile.value?.id) !== view.profileId) return
  pendingLikeView = null
  try {
    // The exact relation snapshot prevents an old view from clearing a re-like.
    await markProfileLikeViewedApi(view.profileId, view.likeId)
    if (pageVisible && currentProfileRequest(view)) await refreshUnreadBadge({ force: true })
  } catch (_) { /* Keep the profile usable; a future successful view can retry. */ }
}

async function fetchProfile() {
  const request = { generation: ++profileGeneration, token: getToken(), profileId: profileId.value }
  profileRequest = request
  pendingLikeView = null
  loading.value = true
  try {
    const data = await getCandidateProfileApi(request.profileId)
    if (!currentProfileRequest(request)) return
    profile.value = data?.profile || null
    if (!profile.value) return
    const likeId = Number(data?.incomingLikeId)
    if (Number.isSafeInteger(likeId) && likeId > 0 && Number(profile.value.id) === request.profileId) {
      pendingLikeView = { ...request, likeId }
      acknowledgeProfileView()
    }
    let storedUser = uni.getStorageSync('USER_INFO')
    if (typeof storedUser === 'string') { try { storedUser = JSON.parse(storedUser) } catch (_) { storedUser = null } }
    const currentUserId = Number(storedUser?.id ?? storedUser?.userId)
    canRequestChat.value = Number(profile.value.user_id) !== currentUserId

    if (canRequestChat.value) {
      await refreshChatState().catch(() => {})
    }

    if (!currentProfileRequest(request)) return
    await refreshLikeState().catch(() => {})
    if (pageVisible && currentProfileRequest(request)) showLikeGuideOnce()
  } catch (error) {
    if (!currentProfileRequest(request)) return
    console.error('加载候选人资料失败', error)
    profile.value = null
    uni.showToast({ title: t('profile.loadFailed'), icon: 'none' })
  } finally {
    if (profileRequest === request) { profileRequest = null; loading.value = false }
  }
}

async function refreshLikeState() {
  if (!profile.value) return null
  const generation = profileGeneration, token = getToken()
  const relationship = relationshipRevision, request = ++likeReadRevision
  const data = await getProfileLikesApi(profile.value.id)
  if (generation !== profileGeneration || token !== getToken() || relationship !== relationshipRevision || request !== likeReadRevision || likePending.value) return null
  isLiked.value = data.isLiked === true
  likeCount.value = Number(data.total ?? data.likeCount ?? 0)
}

async function refreshChatState() {
  if (!profile.value) return null
  const generation = profileGeneration, token = getToken()
  const relationship = relationshipRevision, request = ++chatReadRevision
  const data = await getChatRequestStatusApi(profile.value.user_id)
  if (generation !== profileGeneration || token !== getToken() || relationship !== relationshipRevision || request !== chatReadRevision || likePending.value) return null
  chatState.value = { status: 'none', groupId: null, ...data }
  if (typeof data.isLiked === 'boolean') isLiked.value = data.isLiked
  return chatState.value
}

function showDialog(options) {
  return new Promise(resolve => uni.showModal({ ...options, success: resolve, fail: () => resolve({ confirm: false }) }))
}

async function showChatGate(state) {
  const prompt = getMembershipChatPrompt(state, t)
  if (prompt.type === 'request') return false
  const response = await showDialog({ title: prompt.title, content: prompt.message, showCancel: false, confirmText: prompt.confirmText })
  if (response.confirm && prompt.type === 'like') uni.pageScrollTo({ selector: '.like-button', duration: 250 })
  return true
}

async function requestChat() {
  if (chatPending.value || likePending.value || !profile.value) return
  chatPending.value = true
  try {
    const state = await refreshChatState()
    if (!state) return
    const entry = getChatRequestEntryState(state)
    if (entry === 'group') return uni.navigateTo({ url: `/pages/chat/chatRoom?id=${encodeURIComponent(state.groupId)}` })
    if (entry === 'pending') return uni.showToast({ title: t('profile.requestPending'), icon: 'none' })
    if (await showChatGate(state)) return
    const { confirm, content } = await showDialog({ title: t('profile.requestTitle'), editable: true, placeholderText: t('profile.requestPlaceholder'), cancelText: t('membership.cancel'), confirmText: t('membership.confirm') })
    if (!confirm) return
    const result = await createChatRequestApi({ targetUserId: profile.value.user_id, message: content || '' })
    if (result.groupId) uni.navigateTo({ url: `/pages/chat/chatRoom?id=${encodeURIComponent(result.groupId)}` })
    else {
      chatState.value = { ...state, status: result.status || 'pending' }
      uni.showToast({ title: t('profile.requestSubmitted'), icon: 'success' })
    }
  } catch (error) {
    if (error?.code === 'LIKE_REQUIRED' || error?.code === 'MUTUAL_LIKE_REQUIRED') {
      const latest = await refreshChatState().catch(() => ({ isLiked: error.code !== 'LIKE_REQUIRED', mutual: false }))
      if (latest && !await showChatGate(latest)) uni.showToast({ title: t('profile.requestFailed'), icon: 'none' })
    } else if (!handleMembershipError(error)) uni.showToast({ title: t('profile.requestFailed'), icon: 'none' })
  } finally { chatPending.value = false }
}

// Only apply the authoritative response; a rejected quota must leave the heart unchanged.
async function toggleProfileLike() {
  if (!profile.value || likePending.value || chatPending.value || !canRequestChat.value) return
  relationshipRevision++
  likePending.value = true

  try {
    const result = isLiked.value
      ? await toggleProfileLikeApi(profile.value.id, false, unlikeRequestId ||= createMembershipRequestId())
      : await operations.decide({ profileId: profile.value.id }, 'like', 'detail')
    unlikeRequestId = null
    isLiked.value = !!result.isLiked
    likeCount.value = Number(result.likeCount || 0)
    notifyBlessingChanged({ ...result, profileId: profile.value.id, source: 'detail' })
  } catch (error) {
    console.error('资料点赞失败', error)
    if (error?.code) unlikeRequestId = null
    if (!handleMembershipError(error)) uni.showToast({ title: t('profile.actionFailed'), icon: 'none' })
  } finally {
    // Reads begun either before or during the mutation cannot represent its
    // final state. Start a fresh chat read only after releasing the write lock.
    relationshipRevision++
    likePending.value = false
    refreshChatState().catch(() => {})
  }
}

function onBlessingChanged(change) {
  if (String(change?.profileId) !== String(profileId.value)) return
  relationshipRevision++
  if (typeof change.isLiked === 'boolean') isLiked.value = change.isLiked
  if (typeof change.likeCount === 'number') likeCount.value = change.likeCount
  chatState.value = { ...chatState.value, isLiked: isLiked.value, mutual: change.mutual === true }
}
uni.$on('blessing:changed', onBlessingChanged)
function onAuthSessionChanged() {
  invalidateProfileView()
  profile.value = null
  canRequestChat.value = false
  loading.value = false
  if (pageVisible && getToken() && profileId.value) fetchProfile()
}
function disposeProfileView() {
  if (disposed) return
  disposed = true
  pageVisible = false
  invalidateProfileView()
  uni.$off('blessing:changed', onBlessingChanged)
  uni.$off('auth-session-changed', onAuthSessionChanged)
}
uni.$on('auth-session-changed', onAuthSessionChanged)
onBeforeUnmount(disposeProfileView)

function showLikeGuideOnce() {
  if (uni.getStorageSync(GUIDE_KEY)) return
  // 等页面完成首次渲染后再弹出，避免 App 端页面切换期间的弹窗被吞掉。
  setTimeout(() => {
    uni.showModal({
      title: t('profile.likeGuideTitle'),
      content: t('profile.likeGuideContent'),
      showCancel: false,
      confirmText: t('membership.confirm'),
      success: () => uni.setStorageSync(GUIDE_KEY, '1')
    })
  }, 250)
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index360' })
}
</script>

<style scoped lang="scss">
/* #ifndef H5 */
.page { min-height: 100vh; background: #fff6df; }
/* #endif */
/* #ifdef H5 */
.page { background: #fff6df; }
/* #endif */
.state-box { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; color: #666; font-size: 28rpx; }
.btn-back { margin-top: 30rpx; padding: 16rpx 60rpx; background: #fff6df; color: #333; border-radius: 8rpx; font-size: 28rpx; }
.chat-request { margin: 24rpx; padding: 22rpx; border-radius: 14rpx; background: #ffce00; color: #222; text-align: center; font-weight: 700; }
.chat-request--muted { background: #d9d9d9; color: #888; }
.chat-request--approved { background: #69a978; color: #fff; }
</style>
<style scoped>
/* #ifndef H5 */
.page { min-height: 100vh; }
/* #endif */
</style>
