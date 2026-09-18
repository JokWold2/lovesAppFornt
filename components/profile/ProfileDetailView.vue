<template>
  <view class="profile-page">
    <view class="profile-chrome" :style="headerStyle">
      <view class="profile-header">
        <view class="profile-heading">
          <text class="profile-name">{{ profileName }}</text>
          <text v-if="profileAge" class="profile-age">{{ profileAge }}</text>
        </view>
        <button class="profile-back" :aria-label="t('profile.back')" @click="goBack">
          <uni-icons type="arrowthindown" size="25" color="#fff" />
        </button>
      </view>
    </view>
    <scroll-view class="profile-scroll" scroll-y :bounces="false" @touchmove.stop>
    <view class="profile-header-spacer" :style="spacerStyle" aria-hidden="true"></view>
    <ProfileDetailSections v-if="profile"
      presentation="cards"
      :profile="profile"
      :enable-like="interactionsEnabled"
      :liked="isLiked"
      :like-count="likeCount"
      @toggle-like="toggleProfileLike"
    />
    <view v-else-if="loading" class="state-box" :aria-busy="true"><text>{{ t('profile.loading') }}</text></view>
    <view v-else class="state-box">
      <uni-icons type="person" size="40" color="#a19c94" />
      <text>{{ t('profile.missing') }}</text>
      <button class="btn-back" @click="goBack">{{ t('profile.back') }}</button>
    </view>
    <view class="profile-content-bottom" :class="{ 'profile-content-bottom--read-only': !interactionsEnabled }" aria-hidden="true"></view>
    </scroll-view>
    <view v-if="profile && interactionsEnabled" class="profile-actions">
      <view class="profile-actions-inner">
        <button class="like-button profile-like" :class="{ 'profile-like--active': isLiked }" :disabled="!canRequestChat || likePending || chatPending" :aria-pressed="isLiked" :aria-label="t('deck.like')" @click="toggleProfileLike">
          <uni-icons :type="isLiked ? 'heart-filled' : 'heart'" size="30" :color="isLiked ? '#e8413a' : '#282725'" />
          <text v-if="likeCount > 0" class="profile-like-count">{{ likeCount }}</text>
        </button>
        <button v-if="canRequestChat" class="chat-request" :class="`chat-request--${chatRequestButton.tone}`" :disabled="chatPending || likePending" :aria-busy="chatPending" @click="requestChat">
          <uni-icons type="chatbubble" size="22" color="currentColor" />
          <text>{{ chatPending ? t('deck.saving') : chatRequestButton.text }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
import { useFixedPageHeader } from '@/utils/useFixedPageHeader.js'

const props = defineProps({
  id: { type: [Number, String], default: null },
  visible: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
  interactionsEnabled: { type: Boolean, default: true }
})
const emit = defineEmits(['close'])

// 升级 key，确保此前没有看到引导的用户也能在本次功能发布后看到一次说明。
const GUIDE_KEY = 'PROFILE_LIKE_DOUBLE_TAP_GUIDE_V2'
const profile = ref(null)
const profileName = computed(() => {
  const p = profile.value || {}
  return [p.native_last_name, p.native_first_name].filter(Boolean).join(' ') ||
    [p.en_last_name, p.en_first_name].filter(Boolean).join(' ') || t('inbox.user')
})
const profileAge = computed(() => {
  const year = Number(profile.value?.birth_year)
  const age = new Date().getFullYear() - year
  return year > 0 && age > 0 && age < 130 ? age : ''
})
const { headerStyle: fixedHeaderStyle, spacerStyle } = useFixedPageHeader('.profile-chrome', 76, profileName)
const headerStyle = computed(() => props.embedded ? { ...fixedHeaderStyle.value, paddingTop: '0px' } : fixedHeaderStyle.value)
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
let guideTimer = null
const operations = createBlessingOperations({ decide: decideBlessingApi, createRequestId: createMembershipRequestId })
const chatRequestButton = computed(() => getChatRequestButtonState(chatState.value, {
  requestChat: t('profile.requestChat'),
  requestPending: t('profile.requestPending'),
  requestApproved: t('profile.requestApproved'),
  enterGroup: t('deck.enterGroup')
}))

watch([() => props.id, () => props.visible, () => props.interactionsEnabled], ([id, visible]) => {
  const parsedId = Number(id)
  const nextId = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : null
  pageVisible = visible === true
  invalidateProfileView()
  if (nextId !== profileId.value) {
    profileId.value = nextId
    profile.value = null
    isLiked.value = false
    likeCount.value = 0
    canRequestChat.value = false
    chatState.value = { status: 'none', isLiked: false, mutual: false, groupId: null }
    unlikeRequestId = null
  }
  if (!pageVisible || !profileId.value || disposed) {
    // Entry waits for the sheet animation before fetching or acknowledging.
    // A valid person still awaiting that first fetch is not a missing profile.
    loading.value = !disposed && !!profileId.value && !profile.value
    return
  }
  fetchProfile()
}, { immediate: true, flush: 'sync' })

function invalidateProfileView() {
  profileGeneration++
  profileRequest = null
  pendingLikeView = null
  likePending.value = false
  chatPending.value = false
  if (guideTimer !== null) { clearTimeout(guideTimer); guideTimer = null }
}

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
    canRequestChat.value = props.interactionsEnabled && Number(profile.value.user_id) !== currentUserId

    // Group members are viewed as information only. Preserve profile loading
    // and viewed-notification checks without starting relationship workflows.
    if (!props.interactionsEnabled) return

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
  if (!props.interactionsEnabled || !profile.value) return null
  const generation = profileGeneration, token = getToken()
  const relationship = relationshipRevision, request = ++likeReadRevision
  const data = await getProfileLikesApi(profile.value.id)
  if (generation !== profileGeneration || token !== getToken() || relationship !== relationshipRevision || request !== likeReadRevision || likePending.value) return null
  isLiked.value = data.isLiked === true
  likeCount.value = Number(data.total ?? data.likeCount ?? 0)
}

async function refreshChatState() {
  if (!props.interactionsEnabled || !profile.value) return null
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
  // The like control is always visible in the fixed action bar.
  await showDialog({ title: prompt.title, content: prompt.message, showCancel: false, confirmText: prompt.confirmText })
  return true
}

async function requestChat() {
  if (!props.interactionsEnabled || !pageVisible || chatPending.value || likePending.value || !profile.value) return
  const request = { generation: profileGeneration, token: getToken(), profileId: profileId.value }
  const targetUserId = profile.value.user_id
  chatPending.value = true
  try {
    const state = await refreshChatState()
    if (!state || !currentProfileRequest(request)) return
    const entry = getChatRequestEntryState(state)
    if (entry === 'group') return uni.navigateTo({ url: `/pages/chat/chatRoom?id=${encodeURIComponent(state.groupId)}` })
    if (entry === 'pending') return uni.showToast({ title: t('profile.requestPending'), icon: 'none' })
    if (await showChatGate(state) || !currentProfileRequest(request)) return
    const { confirm, content } = await showDialog({ title: t('profile.requestTitle'), editable: true, placeholderText: t('profile.requestPlaceholder'), cancelText: t('membership.cancel'), confirmText: t('membership.confirm') })
    if (!confirm || !currentProfileRequest(request)) return
    const result = await createChatRequestApi({ targetUserId, message: content || '' })
    if (!currentProfileRequest(request)) return
    if (result.groupId) uni.navigateTo({ url: `/pages/chat/chatRoom?id=${encodeURIComponent(result.groupId)}` })
    else {
      chatState.value = { ...state, status: result.status || 'pending' }
      uni.showToast({ title: t('profile.requestSubmitted'), icon: 'success' })
    }
  } catch (error) {
    if (!currentProfileRequest(request)) return
    if (error?.code === 'LIKE_REQUIRED' || error?.code === 'MUTUAL_LIKE_REQUIRED') {
      const latest = await refreshChatState().catch(() => ({ isLiked: error.code !== 'LIKE_REQUIRED', mutual: false }))
      if (!currentProfileRequest(request)) return
      if (latest && !await showChatGate(latest)) uni.showToast({ title: t('profile.requestFailed'), icon: 'none' })
    } else if (!handleMembershipError(error)) uni.showToast({ title: t('profile.requestFailed'), icon: 'none' })
  } finally { if (currentProfileRequest(request)) chatPending.value = false }
}

// Only apply the authoritative response; a rejected quota must leave the heart unchanged.
async function toggleProfileLike() {
  if (!props.interactionsEnabled || !pageVisible || !profile.value || likePending.value || chatPending.value || !canRequestChat.value) return
  const request = { generation: profileGeneration, token: getToken(), profileId: profileId.value }
  relationshipRevision++
  likePending.value = true

  try {
    const result = isLiked.value
      ? await toggleProfileLikeApi(request.profileId, false, unlikeRequestId ||= createMembershipRequestId())
      : await operations.decide({ profileId: request.profileId }, 'like', 'detail')
    if (!currentProfileRequest(request)) {
      if (request.token === getToken()) notifyBlessingChanged({ ...result, profileId: request.profileId, source: 'detail' })
      return
    }
    unlikeRequestId = null
    isLiked.value = !!result.isLiked
    likeCount.value = Number(result.likeCount || 0)
    notifyBlessingChanged({ ...result, profileId: request.profileId, source: 'detail' })
  } catch (error) {
    if (!currentProfileRequest(request)) return
    console.error('资料点赞失败', error)
    if (error?.code) unlikeRequestId = null
    if (!handleMembershipError(error)) uni.showToast({ title: t('profile.actionFailed'), icon: 'none' })
  } finally {
    // Reads begun either before or during the mutation cannot represent its
    // final state. Start a fresh chat read only after releasing the write lock.
    if (currentProfileRequest(request)) {
      relationshipRevision++
      likePending.value = false
      refreshChatState().catch(() => {})
    }
  }
}

function onBlessingChanged(change) {
  if (!props.interactionsEnabled) return
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
  if (!props.interactionsEnabled || guideTimer !== null || uni.getStorageSync(GUIDE_KEY)) return
  const request = { generation: profileGeneration, token: getToken(), profileId: profileId.value }
  // 等页面完成首次渲染后再弹出，避免 App 端页面切换期间的弹窗被吞掉。
  guideTimer = setTimeout(() => {
    guideTimer = null
    if (!props.interactionsEnabled || !pageVisible || !currentProfileRequest(request)) return
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
  emit('close')
}
</script>

<style scoped lang="scss">
.profile-page { position: relative; height: 100%; width: 100%; overflow: hidden; background: #f5f4f1; color: #21201e; }
.profile-scroll { height: 100%; overscroll-behavior-y: contain; }
.profile-content-bottom { height: calc(122px + env(safe-area-inset-bottom)); }
.profile-content-bottom--read-only { height: calc(24px + env(safe-area-inset-bottom)); }
.profile-chrome { position: absolute; top: 0; left: 0; right: 0; z-index: 40; background: #f5f4f1; }
.profile-header { max-width: 680px; min-height: 76px; box-sizing: border-box; margin: 0 auto; padding: 16px 22px; display: flex; align-items: center; gap: 18px; }
.profile-heading { flex: 1; min-width: 0; display: flex; align-items: baseline; flex-wrap: wrap; column-gap: 10px; row-gap: 2px; }
.profile-name { min-width: 0; font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -.7px; overflow-wrap: anywhere; word-break: break-word; }
.profile-age { font-size: 27px; font-weight: 400; line-height: 1.2; color: #5f5b56; }
.profile-back { flex: 0 0 44px; width: 44px; height: 44px; padding: 0; margin: 0; border-radius: 50%; background: #242321; display: flex; align-items: center; justify-content: center; }
.profile-back::after, .profile-like::after, .chat-request::after, .btn-back::after { border: 0; }
.state-box { display: flex; gap: 16px; padding: 40px 24px; box-sizing: border-box; flex-direction: column; align-items: center; justify-content: center; min-height: 55vh; color: #77716a; font-size: 15px; line-height: 1.6; text-align: center; }
.btn-back { margin: 8px 0 0; padding: 0 32px; min-height: 44px; line-height: 44px; background: #fff; color: #292725; border-radius: 28px; font-size: 15px; }
.profile-actions { position: absolute; left: 0; right: 0; bottom: 0; z-index: 45; padding: 22px 20px calc(18px + env(safe-area-inset-bottom)); background: linear-gradient(180deg, rgba(245,244,241,0), rgba(245,244,241,.97) 40%); }
.profile-actions-inner { max-width: 510px; margin: 0 auto; display: flex; align-items: center; gap: 14px; }
.profile-like { position: relative; overflow: visible; margin: 0; padding: 0; flex: 0 0 64px; width: 64px; height: 64px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background: #fff; box-shadow: 0 3px 16px rgba(39,32,20,.07); }
.profile-like--active { background: #fff6f3; }
.profile-like-count { position: absolute; min-width: 15px; max-width: 64px; right: -3px; top: -2px; padding: 2px 6px; box-sizing: border-box; border: 2px solid #f5f4f1; border-radius: 15px; background: #2d2b28; color: #fff; font-size: 10px; font-weight: 600; line-height: 15px; overflow-wrap: anywhere; }
.chat-request { min-width: 0; flex: 1; min-height: 60px; margin: 0; padding: 14px 18px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; gap: 9px; border-radius: 34px; background: #ffd451; color: #29261d; text-align: center; font-size: 16px; font-weight: 600; line-height: 1.4; box-shadow: 0 3px 16px rgba(39,32,20,.06); }
.chat-request text { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
.chat-request--muted { background: #e5e2dc; color: #6f6960; }
.chat-request--approved { background: #dce9df; color: #2e6041; }
.profile-back, .profile-like, .chat-request, .btn-back { transition: transform 150ms cubic-bezier(.23,1,.32,1), opacity 150ms ease-out; }
.profile-back:active, .profile-like:not([disabled]):active, .chat-request:not([disabled]):active, .btn-back:active { transform: scale(.97); }
.profile-like[disabled], .chat-request[disabled] { opacity: .58; }
@media (prefers-reduced-motion: reduce) { .profile-back, .profile-like, .chat-request, .btn-back { transition: none; } }
@media (max-width: 350px) { .profile-header { padding: 14px 18px; gap: 12px; }.profile-name { font-size: 25px; }.profile-age { font-size: 24px; }.profile-actions { padding-left: 16px; padding-right: 16px; }.profile-actions-inner { gap: 10px; }.chat-request { padding: 12px 14px; font-size: 15px; } }
</style>
