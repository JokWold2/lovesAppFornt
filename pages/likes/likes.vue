<template>
  <view class="likes-page app-h5-min-screen liquid-tab-page">
    <view class="likes-chrome" :style="headerStyle">
      <view class="likes-header"><text class="page-title">{{ t('membership.title') }}</text><button class="tier-pill" @click="openMembershipUpgrade()">{{ t('membership.member', { tier: tierName }) }}</button></view>
      <view class="likes-tabs">
        <button :class="{ active: direction === 'incoming' }" @click="switchDirection('incoming')">{{ t('membership.incoming') }} <text v-if="feeds.incoming.total">{{ feeds.incoming.total }}</text></button>
        <button :class="{ active: direction === 'outgoing' }" @click="switchDirection('outgoing')">{{ t('membership.outgoing') }} <text v-if="feeds.outgoing.total">{{ feeds.outgoing.total }}</text></button>
      </view>
    </view>
    <view class="header-spacer" :style="spacerStyle" aria-hidden="true"></view>
    <view class="list-heading"><text>{{ direction === 'incoming' ? t('membership.allLikes') : t('membership.likedPeople') }}</text><text class="list-subtitle">{{ direction === 'outgoing' ? t('membership.mutualHint') : t('membership.incomingHint') }}</text></view>
    <view v-if="membershipError" class="state"><text>{{ membershipError }}</text><button @click="refresh">{{ t('membership.retry') }}</button></view>
    <view v-else-if="!membership || (feed.loading && !feed.items.length)" class="state">{{ t('membership.loadingLikes') }}</view>
    <view v-else-if="feed.error && !feed.items.length" class="state"><text>{{ feed.error }}</text><button @click="loadFeed(true)">{{ t('membership.retry') }}</button></view>
    <view v-else-if="!feed.items.length" class="state empty-state"><image src="/static/membership/mutual-hearts.png" class="empty-heart" mode="aspectFit" /><text class="empty-title">{{ direction === 'incoming' ? t('membership.emptyIncoming') : t('membership.emptyOutgoing') }}</text><text>{{ direction === 'incoming' ? t('membership.emptyIncomingHint') : t('membership.emptyOutgoingHint') }}</text><button @click="goHome">{{ t('membership.browse') }}</button></view>
    <view v-else class="likes-grid">
      <view v-for="(item, index) in feed.items" :key="item.rowKey || item.profileId || index" class="person-card" :class="{ locked: isLocked(item) }" @click="openPerson(item)">
        <image v-if="photoUrl(item)" :src="photoUrl(item)" class="person-photo" mode="aspectFill" @error="onPhotoError(item)" />
        <view v-else class="person-placeholder" :class="`placeholder-${index % 4}`"><uni-icons v-if="!isLocked(item)" type="person" size="54" color="#eee8d6" /></view>
        <view class="person-shade"></view>
        <view v-if="direction === 'incoming' && !isLocked(item) && item.unread" class="person-unread-dot" aria-hidden="true"></view>
        <image v-if="!isLocked(item)" class="relationship-heart" :src="item.mutual ? '/static/membership/mutual-hearts.png' : '/static/membership/single-heart.png'" :aria-label="item.mutual ? t('membership.mutual') : t('membership.oneSided')" mode="aspectFit" />
        <view class="person-caption">
          <template v-if="isLocked(item)"><text class="person-name masked-name">{{ item.maskedDisplayName || '•••' }}</text><text class="locked-caption">{{ t('membership.secretAdmirer') }}</text></template>
          <template v-else><text class="person-name">{{ item.displayName || t('membership.user') }}</text><text class="relationship-label">{{ item.mutual ? t('membership.mutual') : (direction === 'outgoing' ? t('membership.waitingLike') : t('membership.likedYou')) }}</text><button class="apply-button" :disabled="applying !== null" @click.stop="apply(item)">{{ applying === item.userId ? t('membership.processing') : t('membership.applyChat') }}</button></template>
        </view>
      </view>
    </view>
    <view v-if="feed.items.length" class="load-more"><text v-if="feed.loading">{{ t('membership.loading') }}</text><button v-else-if="feed.error" @click="loadFeed(false)">{{ t('membership.retryMore') }}</button><button v-else-if="feed.hasMore" @click="loadFeed(false)">{{ t('membership.more') }}</button><text v-else>{{ t('membership.allShown') }}</text></view>
    <view v-if="membership && direction === 'incoming' && !membership.canViewLikes && !membershipError" class="unlock-dock"><button @click="openMembershipUpgrade('likes')">{{ t('membership.unlockLikes') }}</button></view>
    <LiquidGlassTabBar active-route="pages/likes/likes" :hidden="!!sheetProfileId" />
    <ProfileDetailSheet :profile-id="sheetProfileId" :page-visible="sheetPageVisible" @closed="onProfileSheetClosed" />
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onShow, onHide, onUnload, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import LiquidGlassTabBar from '@/components/navigation/LiquidGlassTabBar.vue'
import { getMembershipApi, getBlessingLikesApi } from '@/api/membership.js'
import { getToken } from '@/utils/auth.js'
import { createChatRequestApi, getChatRequestStatusApi } from '@/api/chat.js'
import { config } from '@/utils/config.js'
import { t } from '@/utils/localeRuntime.js'
import { BLESSING_CHANGED_EVENT, mergeBlessingLikes, getMembershipTierName, getMembershipErrorMessage, getMembershipChatPrompt, handleMembershipError, openMembershipUpgrade } from '@/utils/membership.js'
import { useFixedPageHeader } from '@/utils/useFixedPageHeader.js'
import { useProfileDetailSheet } from '@/utils/useProfileDetailSheet.js'
import ProfileDetailSheet from '@/components/profile/ProfileDetailSheet.vue'
import { consumeIncomingLikesIntent } from '@/utils/likesTabIntent.js'

const { profileId: sheetProfileId, pageVisible: sheetPageVisible, open: openProfileSheet, close: closeProfileSheet } = useProfileDetailSheet()
function onProfileSheetClosed() { closeProfileSheet(); refresh() }

const direction = ref('incoming'), membership = ref(null), membershipError = ref(''), applying = ref(null)
const emptyFeed = () => ({ items: [], total: 0, page: 0, hasMore: true, loading: false, error: '', generation: 0 })
const feeds = reactive({ incoming: emptyFeed(), outgoing: emptyFeed() })
const feed = computed(() => feeds[direction.value])
const tierName = computed(() => getMembershipTierName(membership.value?.tierLevel, t))
const headerCopy = computed(() => [t('membership.title'), t('membership.member', { tier: tierName.value }), t('membership.incoming'), t('membership.outgoing'), feeds.incoming.total, feeds.outgoing.total].join('|'))
const { headerStyle, spacerStyle } = useFixedPageHeader('.likes-chrome', 132, headerCopy)
const failedPhotos = reactive({})
let visible = false, refreshGeneration = 0
function isLocked(item) { return !!item.locked || (direction.value === 'incoming' && !membership.value?.canViewLikes) }
function sourcePhotoUrl(item) {
  const photo = isLocked(item) ? item.previewUrl : item.avatarUrl
  if (!photo || typeof photo !== 'string') return ''
  return photo.startsWith('/') ? `${config.baseURL}${photo}` : photo
}
function photoUrl(item) { const url = sourcePhotoUrl(item); return failedPhotos[url] ? '' : url }
function onPhotoError(item) { const url = sourcePhotoUrl(item); if (url) failedPhotos[url] = true }
function goHome() { uni.switchTab({ url: '/pages/index/index360' }) }
function openPerson(item) {
  if (isLocked(item)) return openMembershipUpgrade('likes')
  openProfileSheet(item.profileId)
}
async function refresh() {
  const generation = ++refreshGeneration
  const sessionToken = getToken()
  membershipError.value = ''
  for (const key of Object.keys(failedPhotos)) delete failedPhotos[key]
  // Discard identity-bearing caches before checking a possibly changed account/tier.
  for (const key of ['incoming', 'outgoing']) Object.assign(feeds[key], emptyFeed(), { generation: feeds[key].generation + 1 })
  membership.value = null
  try {
    const data = await getMembershipApi()
    if (generation !== refreshGeneration || sessionToken !== getToken()) return
    membership.value = data
    await loadFeed(true)
  } catch (error) { if (generation === refreshGeneration && sessionToken === getToken()) membershipError.value = getMembershipErrorMessage(error, t, 'likesFailed') }
  finally { uni.stopPullDownRefresh?.() }
}
async function loadFeed(reset) {
  if (!membership.value) return
  const key = direction.value, state = feeds[key]
  if (state.loading || (!reset && !state.hasMore)) return
  const generation = ++state.generation, page = reset ? 1 : state.page + 1
  const sessionToken = getToken()
  state.loading = true; state.error = ''
  try {
    const data = await getBlessingLikesApi({ direction: key, page, pageSize: 20 })
    if (generation !== state.generation || sessionToken !== getToken()) return
    const items = Array.isArray(data?.items) ? data.items : []
    state.items = mergeBlessingLikes(reset ? [] : state.items, items)
    state.total = Number(data?.total || 0); state.page = page; state.hasMore = !!data?.hasMore
  } catch (error) { if (generation === state.generation && sessionToken === getToken()) state.error = getMembershipErrorMessage(error, t, 'loadFailed') }
  finally { if (generation === state.generation) state.loading = false }
}
function switchDirection(value) {
  if (direction.value === value) return
  direction.value = value
  if (value === 'incoming' || !feed.value.page) loadFeed(true)
}
const modal = options => new Promise(resolve => uni.showModal({ confirmText: t('membership.confirm'), cancelText: t('membership.cancel'), ...options, success: resolve, fail: () => resolve({ confirm: false }) }))
async function apply(item) {
  if (applying.value !== null || isLocked(item) || !item.userId) return
  applying.value = item.userId
  try {
    const status = await getChatRequestStatusApi(item.userId)
    if (status.status === 'approved' && status.groupId) return uni.navigateTo({ url: `/pages/chat/chatRoom?id=${status.groupId}` })
    if (['pending', 'processing'].includes(status.status)) return await modal({ title: t('membership.chatPendingTitle'), content: t('membership.chatPending'), showCancel: false })
    const prompt = getMembershipChatPrompt(status, t)
    if (prompt.type !== 'request') {
      const result = await modal({ title: prompt.title, content: prompt.message, confirmText: prompt.confirmText, showCancel: false })
      if (result.confirm && prompt.type === 'like') openPerson(item)
      return
    }
    const result = await modal({ title: t('membership.applyChat'), content: t('membership.chatApply'), editable: true, placeholderText: t('membership.chatNote'), confirmText: t('membership.submit') })
    if (!result.confirm) return
    const submitted = await createChatRequestApi({ targetUserId: item.userId, message: result.content || '' })
    if (submitted?.groupId) return uni.navigateTo({ url: `/pages/chat/chatRoom?id=${submitted.groupId}` })
    uni.showToast({ title: t('membership.submittedChat'), icon: 'none' })
  } catch (error) {
    if (!handleMembershipError(error)) {
      if (['LIKE_REQUIRED', 'MUTUAL_LIKE_REQUIRED'].includes(error?.code)) {
        const prompt = getMembershipChatPrompt({ isLiked: error.code !== 'LIKE_REQUIRED', mutual: false }, t)
        const result = await modal({ title: prompt.title, content: prompt.message, confirmText: prompt.confirmText, showCancel: false })
        if (result.confirm && prompt.type === 'like') openPerson(item)
      } else uni.showToast({ title: getMembershipErrorMessage(error, t, 'chatFailed'), icon: 'none' })
    }
  } finally { applying.value = null }
}
function onChanged() { if (visible) refresh() }
uni.$on?.(BLESSING_CHANGED_EVENT, onChanged)
onShow(() => { visible = true; if (consumeIncomingLikesIntent()) direction.value = 'incoming'; refresh() })
onHide(() => { visible = false })
onUnload(() => { visible = false; refreshGeneration++; feeds.incoming.generation++; feeds.outgoing.generation++; uni.$off?.(BLESSING_CHANGED_EVENT, onChanged) })
onReachBottom(() => loadFeed(false))
onPullDownRefresh(refresh)
</script>

<style scoped lang="scss">
.likes-page { --liquid-tabbar-space:185px;min-height:100vh;box-sizing:border-box;background:#f6f5f2;color:#1c1c1b;padding:0 18px calc(185px + env(safe-area-inset-bottom)); }.likes-chrome { position:fixed;z-index:40;top:0;left:0;right:0;box-sizing:border-box;padding-right:18px;padding-left:18px;background:#f6f5f2; }
.header-spacer { width:100%;flex-shrink:0;pointer-events:none; }
.likes-header { display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:76px;padding:12px 2px;box-sizing:border-box; }.page-title { min-width:0;font-size:30px;font-weight:650;line-height:1.2;overflow-wrap:break-word; }.tier-pill { flex:0 1 auto;max-width:52%;min-height:44px;padding:8px 13px;margin:0;border:1px solid #d9cda9;border-radius:24px;color:#856b26;background:transparent;font-size:11px;line-height:1.45;display:flex;align-items:center;justify-content:center;text-align:center;white-space:normal;overflow-wrap:break-word;box-sizing:border-box; }button::after { border:0; }.likes-tabs { display:flex;border-bottom:1px solid #e1dfd9;margin:0 -18px;padding:0 18px; }.likes-tabs button { flex:1;min-width:0;min-height:56px;margin:0;padding:12px 8px;line-height:22px;border-radius:0;font-size:15px;background:transparent;color:#8e887e;border-bottom:2px solid transparent;white-space:normal;overflow-wrap:break-word;box-sizing:border-box; }.likes-tabs button.active { color:#1c1c1b;font-weight:650;border-bottom-color:#d5a71c; }.likes-tabs button text { margin-left:5px;font-size:11px; }.list-heading { padding:24px 2px 18px;display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:19px; }.list-subtitle { font-size:10px;color:#9c9588; }.likes-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }.person-card { height:272px;position:relative;overflow:hidden;border-radius:24px;background:#b9aea1; }.person-photo,.person-placeholder,.person-shade { position:absolute;inset:0;width:100%;height:100%; }.person-placeholder { display:flex;align-items:center;justify-content:center;background:linear-gradient(140deg,#777967,#c7b6a0); }.placeholder-1 { background:linear-gradient(130deg,#88552f,#e7c38b); }.placeholder-2 { background:linear-gradient(160deg,#748682,#c2ccc0); }.placeholder-3 { background:linear-gradient(140deg,#8b7368,#d0afa8); }.person-shade { background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.12) 50%,rgba(0,0,0,.78));pointer-events:none; }.relationship-heart { position:absolute;top:14px;right:12px;width:31px;height:31px; }.person-caption { position:absolute;bottom:15px;left:13px;right:13px;color:#fff; }.person-name { display:block;font-size:19px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.relationship-label { display:block;font-size:10px;color:#e2daca;margin-top:5px; }.apply-button { display:block;margin:13px 0 0;padding:0;line-height:32px;border-radius:20px;font-size:11px;color:#302719;background:#f7d05b; }.apply-button[disabled] { opacity:.6; }.masked-name { letter-spacing:1px; }.locked-caption { display:block;margin-top:7px;font-size:11px;color:#f0ebe1; }.unlock-dock { position:fixed;z-index:15;left:24px;right:24px;bottom:calc(94px + env(safe-area-inset-bottom)); }.unlock-dock button { border-radius:32px;background:#efbd00;color:#191912;font-size:16px;line-height:55px;font-weight:550;box-shadow:0 6px 24px rgba(41,33,7,.12); }.state { display:flex;flex-direction:column;align-items:center;gap:16px;padding:78px 22px;color:#938a7e;font-size:13px;text-align:center;line-height:1.8; }.state button { border-radius:24px;background:#e8c357;padding:0 28px;font-size:13px;color:#2b271d; }.empty-heart { width:60px;height:60px;opacity:.6; }.empty-title { color:#403b33;font-size:20px; }.load-more { text-align:center;margin:24px 0;font-size:11px;color:#999; }.load-more button { background:transparent;font-size:12px;color:#897b5a; }
.apply-button { width:100%; }
.person-unread-dot { position:absolute;top:14px;left:14px;z-index:1;width:12px;height:12px;border:2px solid #fff;border-radius:50%;box-sizing:border-box;background:#e53935;pointer-events:none; }
.tier-pill { transition:transform 140ms cubic-bezier(.23,1,.32,1); }
.tier-pill:active { transform:scale(.97); }
@media (max-width:350px) { .page-title { font-size:26px; }.tier-pill { padding-right:10px;padding-left:10px; } }
@media (prefers-reduced-motion:reduce) { .tier-pill { transition:none; } }
@media (min-width:600px) { .likes-page,.likes-chrome { max-width:660px;margin:0 auto; }.person-card { height:350px; }.unlock-dock { max-width:560px;margin:0 auto; } }
</style>
