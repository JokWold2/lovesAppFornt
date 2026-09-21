<template>
  <view class="page message-page app-h5-min-screen liquid-tab-page">
    <view class="header" :class="{ 'is-scrolled': headerScrolled }" :style="headerStyle">
      <view class="header-surface" aria-hidden="true" />
      <view class="header-controls" :class="{ 'search-open': searchOpen }">
        <view class="header-title-wrap"><text class="page-title">{{ t('navigation.messages') }}</text></view>
        <view class="search-shell">
          <button class="message-search-toggle" :aria-label="t('inbox.search')" @tap="toggleSearch"><uni-icons type="search" size="24" color="#282623" /></button>
          <input v-model="searchKeyword" class="search-input" :focus="searchOpen" :placeholder="t('inbox.search')" confirm-type="search" @focus="navigationInputActive = true" @blur="navigationInputActive = false" />
          <button v-if="searchOpen" class="message-search-close" :aria-label="t('profileEditor.common.close')" @tap="closeSearch"><uni-icons type="closeempty" size="23" color="#8c867c" /></button>
        </view>
      </view>
    </view>
    <view class="header-spacer" :style="spacerStyle" aria-hidden="true" />
    <view class="message-likes-section">
      <text class="section-title">{{ t('messageInbox.newLikes') }}</text>
      <scroll-view class="likes-rail" scroll-x :show-scrollbar="false" :lower-threshold="100" @scrolltolower="loadMoreLikes">
        <view class="likes-rail-content">
          <button class="like-card received-likes-card" :aria-label="t('messageInbox.receivedLikes')" @click="openIncomingLikes()">
            <view class="like-portrait received-portrait" :class="{ 'is-locked': incomingLocked }">
              <image v-if="incomingPhoto" :src="incomingPhoto" class="like-photo received-photo" mode="aspectFill" @error="markPhotoFailed(incomingPhoto)" />
              <view v-else class="received-placeholder"><uni-icons type="heart-filled" size="39" color="#ecd79d" /></view>
              <view class="received-shade" /><text class="received-count">{{ incomingCount }}</text>
            </view>
            <view class="received-heart"><uni-icons type="heart-filled" size="23" color="#bb921a" /></view>
            <text class="like-card-name">{{ t('messageInbox.likes') }}</text>
          </button>
          <button v-for="member in likesState.mutual.items" :key="member.profileId" class="like-card mutual-card" :data-profile-id="member.profileId" :aria-label="t('messageInbox.viewMutualProfile', { name: memberName(member) })" @click="openProfileSheet(member.profileId)">
            <view class="like-portrait mutual-portrait">
              <image v-if="memberPhoto(member)" :src="memberPhoto(member)" class="like-photo" mode="aspectFill" @error="markPhotoFailed(memberPhoto(member))" />
              <view v-else class="mutual-placeholder"><uni-icons type="person-filled" size="43" color="#aaa08e" /></view>
              <view class="mutual-badge" aria-hidden="true"><image class="mutual-badge-icon" src="/static/membership/mutual-hearts.png" mode="aspectFit" /></view>
            </view>
            <text class="like-card-name">{{ memberName(member) }}</text>
          </button>
          <view v-if="likesState.mutual.loading && !likesState.mutual.items.length" class="rail-status" aria-live="polite"><view class="rail-loading-heart"><uni-icons type="heart" size="29" color="#b5a37f" /></view><text>{{ t('messageInbox.loading') }}</text></view>
          <view v-else-if="likesState.mutual.error" class="rail-status"><text>{{ t('messageInbox.loadFailed') }}</text><button class="likes-retry" @click="retryLikes"><view class="retry-label"><text class="retry-label-text">{{ t('messageInbox.retry') }}</text></view></button></view>
          <view v-else-if="!likesState.mutual.items.length" class="rail-status likes-empty"><view class="rail-loading-heart"><uni-icons type="heart" size="29" color="#b5a37f" /></view><text class="empty-likes-title">{{ t('messageInbox.emptyMutual') }}</text><text class="empty-likes-hint">{{ t('messageInbox.emptyMutualHint') }}</text></view>
          <button v-else-if="likesState.mutual.hasMore" class="rail-more" :disabled="likesState.mutual.loading" @click="loadMoreLikes"><uni-icons type="arrow-right" size="24" color="#807663" /><text>{{ likesState.mutual.loading ? t('messageInbox.loading') : t('messageInbox.more') }}</text></button>
        </view>
      </scroll-view>
      <view v-if="likesState.incoming.error || likesState.membershipError" class="likes-feedback"><text>{{ t('messageInbox.loadFailed') }}</text><button class="likes-retry" @click="retryLikes"><view class="retry-label"><text class="retry-label-text">{{ t('messageInbox.retry') }}</text></view></button></view>
    </view>
    <TradeInboxPanel :groups="filteredChatGroups" :trades="tradeConversations" :search="searchKeyword" :show-interactions="showInteractions" :interaction-unread="interactionUnread" :interaction-summary="interactionSummary" :interaction-date="interactionDate" :is-admin="isAdmin" :request-count="filteredRequests.length" :error="messageError" :notice-count="tradeNoticeCount" @interactions="openInteractions" @reviews="openRequestReviews" @group="openGroup" @retry="load" />    <LiquidGlassTabBar active-route="pages/notice/notice" :input-active="navigationInputActive" :hidden="!!sheetProfileId" />
    <ProfileDetailSheet :profile-id="sheetProfileId" :page-visible="sheetPageVisible" @closed="closeProfileSheet" />
  </view>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { onHide, onShow, onUnload, onPullDownRefresh, onPageScroll } from '@dcloudio/uni-app'
import { getNotificationsApi } from '@/api/notifications.js'
import { getChatGroupsApi, getChatRequestsApi } from '@/api/chat.js'
import { getMembershipApi, getBlessingLikesApi } from '@/api/membership.js'
import { getToken } from '@/utils/auth.js'
import { config } from '@/utils/config.js'
import { interactionSummary as notificationSummary } from '@/utils/interactionNavigation.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'
import { presentGroupName } from '@/utils/chatGroupPresentation.js'
import { formatConversationTime } from '@/utils/chatMessagePresentation.js'
import { hasUnreadMessages } from '@/utils/unreadBadgeState.js'
import { currentLocale, t, updateTabBarLocale } from '@/utils/localeRuntime.js'
import { BLESSING_CHANGED_EVENT } from '@/utils/membership.js'
import { openIncomingLikes } from '@/utils/likesTabIntent.js'
import { useProfileDetailSheet } from '@/utils/useProfileDetailSheet.js'
import { createMessageLikesState } from '@/utils/messageLikesState.js'
import { messageLikePhoto } from '@/utils/messageLikePhoto.js'
import { useFixedPageHeader } from '@/utils/useFixedPageHeader.js'
import GroupAvatar from '@/components/chat/GroupAvatar.vue'
import TradeInboxPanel from '@/components/market/TradeInboxPanel.vue'
import {getTradeConversationsApi,getTradeNoticesApi} from '@/api/marketTrades.js'
import LiquidGlassTabBar from '@/components/navigation/LiquidGlassTabBar.vue'
import ProfileDetailSheet from '@/components/profile/ProfileDetailSheet.vue'

const { profileId: sheetProfileId, pageVisible: sheetPageVisible, open: openProfileSheet, close: closeProfileSheet } = useProfileDetailSheet()
const notifications = ref([]), chatGroups = ref([]), requests = ref([]), tradeConversations = ref([]), tradeNoticeCount = ref(0)
const searchOpen = ref(false), searchKeyword = ref(''), navigationInputActive = ref(false)
const headerScrolled = ref(false)
const headerLayoutKey = computed(() => `${currentLocale.value}|${searchOpen.value}`)
const { headerStyle, spacerStyle } = useFixedPageHeader('.header', 64, headerLayoutKey)
onPageScroll(event => { headerScrolled.value = Number(event.scrollTop) > 0 })
const interactionUnread = ref(0), messageError = ref(false), failedPhotos = reactive({})
const accountLevel = ref(Number(uni.getStorageSync('USER_INFO')?.accountLevel))
const isAdmin = computed(() => accountLevel.value === 5)
const likesState = ref({ membership:null, incoming:{item:null,total:0,loading:true,error:null}, mutual:{items:[],total:0,page:0,hasMore:false,loading:true,error:null}, membershipError:null })
const likes = createMessageLikesState({ getToken, getMembership:getMembershipApi, getIncoming:params => getBlessingLikesApi({ ...params, direction:'incoming' }), getMutual:params => getBlessingLikesApi({ ...params, direction:'mutual' }), onChange:snapshot => { likesState.value = snapshot } })
const incomingLocked = computed(() => !likesState.value.membership?.canViewLikes || !!likesState.value.incoming.item?.locked)
const incomingPhoto = computed(() => messageLikePhoto(likesState.value.incoming.item, incomingLocked.value, availablePhoto))
const incomingCount = computed(() => likesState.value.incoming.error ? '—' : likesState.value.incoming.loading && !likesState.value.incoming.item ? '·' : badgeText(likesState.value.incoming.total))
const interactions = computed(() => notifications.value.filter(item => item.type !== 'chat_request'))
const latest = computed(() => interactions.value[0])
const interactionSummary = computed(() => notificationSummary(latest.value, t))
const interactionDate = computed(() => latest.value?.created_at ? formatConversationTime(latest.value.created_at) : '')
const hasSearchKeyword = computed(() => Boolean(searchKeyword.value.trim()))
const showInteractions = computed(() => !hasSearchKeyword.value || matchesSearch(t('inbox.interactions'), interactionSummary.value))
const filteredRequests = computed(() => requests.value.filter(() => matchesSearch(t('inbox.pendingRequests'), t('inbox.requestsWaiting', { count:requests.value.length }))))
const filteredChatGroups = computed(() => chatGroups.value.filter(group => matchesSearch(presentGroupName(group.name), group.status === 'dissolved' ? t('inbox.dissolved') : group.last_message || t('inbox.noMessages'))))
const hasSearchResults = computed(() => showInteractions.value || (isAdmin.value && filteredRequests.value.length > 0) || filteredChatGroups.value.length > 0)
function fullPhoto(value) { if (typeof value !== 'string' || !value.trim()) return ''; const url = value.trim(); return url.startsWith('/') ? `${config.baseURL}${url}` : url }
function availablePhoto(value) { const url = fullPhoto(value); return failedPhotos[url] ? '' : url }
function memberPhoto(member) { return messageLikePhoto(member, false, availablePhoto) }
function memberName(member) { return (typeof member?.displayName === 'string' && member.displayName.trim()) || t('messageInbox.mutualNameFallback') }
function markPhotoFailed(url) { if (url) failedPhotos[url] = true }
function matchesSearch(...values) { const keyword = searchKeyword.value.trim().toLocaleLowerCase(); return !keyword || values.some(value => String(value || '').toLocaleLowerCase().includes(keyword)) }
function toggleSearch() { searchOpen.value = true }
function closeSearch() { searchOpen.value = false; searchKeyword.value = ''; navigationInputActive.value = false; uni.hideKeyboard?.() }
function badgeText(value) { const count = Math.max(0, Math.floor(Number(value) || 0)); return count > 99 ? '99+' : String(count) }
function openInteractions() { uni.navigateTo({ url:'/pages/notice/interactionMessages' }) }
function openGroup(id) { uni.navigateTo({ url:`/pages/chat/chatRoom?id=${id}` }) }
function openRequestReviews() { uni.navigateTo({ url:'/pages/notice/chatRequestReview' }) }
function loadMoreLikes() { if (visible && !sheetProfileId.value) likes.loadMore() }
function retryLikes() { for (const key of Object.keys(failedPhotos)) delete failedPhotos[key]; refreshLikes(true) }
let visible = false, disposed = false, generation = 0, messageLoading = false, lastToken = '', lastLikesRefresh = 0, lastLikeUnread = null
function refreshLikes(force = false) {
  if (!visible || disposed || sheetProfileId.value || (!force && Date.now() - lastLikesRefresh < 20000)) return Promise.resolve()
  lastLikesRefresh = Date.now()
  return likes.refresh()
}
function clearMessageCache() { tradeConversations.value=[]; tradeNoticeCount.value=0; notifications.value = []; chatGroups.value = []; requests.value = []; interactionUnread.value = 0; lastLikeUnread = null; messageError.value = false; lastLikesRefresh = 0; for (const key of Object.keys(failedPhotos)) delete failedPhotos[key] }
function applyUnreadSummary(unread) {
  if (Number.isFinite(Number(unread?.interactionUnread))) interactionUnread.value = Math.max(0, Math.floor(Number(unread.interactionUnread)))
  const next = Number(unread?.profileLikeUnread)
  if (Number.isFinite(next)) { if (lastLikeUnread !== null && next !== lastLikeUnread) refreshLikes(true); lastLikeUnread = next }
}
function load() {
  if (!visible || disposed || sheetProfileId.value) return
  const token = getToken()
  if (token !== lastToken) { generation++; messageLoading = false; clearMessageCache(); lastToken = token }
  refreshLikes()
  if (!token || messageLoading) return
  const request = ++generation
  const current = () => !disposed && visible && request === generation && token === getToken()
  messageLoading = true
  messageError.value = false
  // Apply each response as it arrives; a slow notification/badge request must
  // never hold back existing conversations. Keep callbacks in separate scopes
  // to avoid WeChat's async transform hoisting minified locals over API imports.
  const update = (fetch, apply, reportError = true) => Promise.resolve().then(fetch).then(response => {
    if (current()) apply(response)
  }).catch(() => { if (current() && reportError) messageError.value = true })
  return Promise.allSettled([
    update(() => getNotificationsApi({ page:1, pageSize:50 }), response => {
      if (!Array.isArray(response?.notifications)) throw new Error('Invalid notifications response')
      notifications.value = response.notifications
    }),
    update(getChatGroupsApi, response => {
      if (!Array.isArray(response?.groups)) throw new Error('Invalid chat groups response')
      chatGroups.value = response.groups
    }),
    update(() => isAdmin.value ? getChatRequestsApi() : { requests:[] }, response => {
      if (!Array.isArray(response?.requests)) throw new Error('Invalid chat requests response')
      requests.value = response.requests.filter(item => ['pending','processing'].includes(item.status))
    }),
    update(getTradeConversationsApi, response => { tradeConversations.value=response.conversations||[] }),
    update(getTradeNoticesApi, response => { tradeNoticeCount.value=(response.notices||[]).filter(n=>!n.is_read).length }),
    update(refreshUnreadBadge, applyUnreadSummary, false)
  ]).finally(() => { if (request === generation) messageLoading = false })
}
let messagePollTimer = null
function startMessagePolling() { if (!messagePollTimer) messagePollTimer = setInterval(load, 5000) }
function stopMessagePolling() { visible = false; generation++; messageLoading = false; if (messagePollTimer) { clearInterval(messagePollTimer); messagePollTimer = null } }
function blessingChanged() { lastLikesRefresh = 0; if (visible && !sheetProfileId.value) refreshLikes(true) }
function sessionChanged() { generation++; messageLoading = false; clearMessageCache(); lastToken = ''; accountLevel.value = Number(uni.getStorageSync('USER_INFO')?.accountLevel); likes.refresh(); if (visible) load() }
uni.$on?.(BLESSING_CHANGED_EVENT, blessingChanged)
uni.$on?.('auth-session-changed', sessionChanged)
onShow(() => { visible = true; navigationInputActive.value = false; accountLevel.value = Number(uni.getStorageSync('USER_INFO')?.accountLevel); updateTabBarLocale(); uni.setNavigationBarTitle({ title:t('navigation.messages') }); lastLikesRefresh = 0; load(); startMessagePolling() })
onHide(stopMessagePolling)
onUnload(() => { stopMessagePolling(); disposed = true; likes.dispose(); uni.$off?.(BLESSING_CHANGED_EVENT, blessingChanged); uni.$off?.('auth-session-changed', sessionChanged) })
onPullDownRefresh(async () => { try { await Promise.allSettled([load(), refreshLikes(true)]) } finally { uni.stopPullDownRefresh?.() } })
watch(currentLocale, () => uni.setNavigationBarTitle({ title:t('navigation.messages') }))
</script>

<style scoped>
.message-page{background:#efeeeb;color:#262421;min-height:100vh;display:flex;flex-direction:column;box-sizing:border-box;}.message-page.liquid-tab-page{padding-bottom:0;}button{margin:0;box-sizing:border-box;border:0;background:none;color:inherit;padding:0;line-height:1.45;transition:transform 140ms cubic-bezier(.23,1,.32,1);}button::after{border:0;}button:active{transform:scale(.975);}button :deep(.uni-icons){pointer-events:none;}.header{position:fixed;top:0;left:0;right:0;z-index:40;box-sizing:border-box;}.header-controls{position:relative;display:flex;flex-flow:row nowrap;align-items:center;gap:8px;padding:8px 20px 10px;}.header-spacer{flex-shrink:0;pointer-events:none;}.header-surface{position:absolute;top:0;left:0;right:0;bottom:0;z-index:-1;background:#efeeeb;pointer-events:none;}.header-surface::after{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:#efeeeb;opacity:1;transition:opacity 160ms ease;}.header.is-scrolled .header-surface::after{opacity:0;}.header-controls.search-open{flex-wrap:wrap;}.header-title-wrap{order:1;flex:1;min-width:0;overflow:hidden;white-space:nowrap;}.page-title{display:block;white-space:nowrap;font-size:32px;font-weight:650;line-height:1.4;letter-spacing:-.8px;}.search-shell{order:2;display:flex;align-items:center;justify-content:flex-end;width:46px;min-height:46px;overflow:hidden;border-radius:28px;background:transparent;transition:width 220ms cubic-bezier(.32,.72,0,1);}.message-search-toggle,.message-search-close{display:flex;align-items:center;justify-content:center;flex:0 0 46px;min-height:46px;border-radius:50%;}.message-search-toggle{background:#faf9f7;}.search-input{min-width:0;max-width:0;width:0;height:46px;opacity:0;flex:1;font-size:16px;transition:opacity 160ms ease;}.message-search-close{flex-basis:44px;}.search-open .search-shell{order:1;width:100%;justify-content:flex-start;background:#f8f7f5;}.search-open .search-input{width:100%;max-width:100%;opacity:1;}.search-open .header-title-wrap{order:2;flex-basis:100%;}.section-title{display:block;font-size:16px;font-weight:550;line-height:1.5;overflow-wrap:anywhere;}.message-likes-section>.section-title{padding:0 20px 8px;}.likes-rail{width:100%;white-space:nowrap;}.likes-rail-content{display:flex;align-items:flex-start;gap:12px;padding:1px 20px 12px;box-sizing:border-box;min-width:100%;width:max-content;}.like-card{position:relative;display:block;flex:0 0 116px;width:116px;overflow:visible;border-radius:20px;white-space:normal;text-align:center;}.like-portrait{position:relative;width:116px;height:154px;border-radius:21px;overflow:hidden;background:#d4cdc0;box-sizing:border-box;}.like-photo,.mutual-placeholder,.received-placeholder,.received-shade{position:absolute;inset:0;width:100%;height:100%;}.like-photo{pointer-events:none;}.received-portrait{border:3px solid #f3ce64;padding:3px;background:#faf6e8;}.received-portrait .received-photo,.received-placeholder,.received-shade{top:3px;left:3px;width:calc(100% - 6px);height:calc(100% - 6px);border-radius:15px;}.received-placeholder{display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#d2b16f,#b0874b 50%,#827057);}.received-shade{background:linear-gradient(180deg,rgba(26,19,7,.03),rgba(31,21,7,.16));pointer-events:none;}.received-count{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);min-width:42px;min-height:42px;border-radius:50%;padding:9px 8px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:#ffdc70;color:#302616;font-size:14px;font-weight:650;line-height:24px;font-variant-numeric:tabular-nums;}.received-heart{position:absolute;left:calc(50% - 17px);top:139px;width:34px;height:28px;display:flex;justify-content:center;align-items:center;background:#f8f4e7;border-radius:18px;}.like-card-name{display:block;max-width:100%;margin-top:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:1.6;}.received-likes-card .like-card-name{margin-top:13px;}.mutual-badge{position:absolute;top:8px;right:8px;display:flex;align-items:center;justify-content:center;width:29px;height:29px;border-radius:50%;background:#fffaf0;box-shadow:0 2px 7px rgba(68,57,25,.08);pointer-events:none;}.mutual-badge-icon{width:21px;height:21px;pointer-events:none;}.mutual-placeholder{display:flex;align-items:center;justify-content:center;background:linear-gradient(150deg,#e8e2d7,#d4cbba);}.rail-status{width:165px;flex:0 0 165px;min-height:154px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;padding:12px 8px;box-sizing:border-box;white-space:normal;text-align:center;color:#8e8473;font-size:12px;line-height:1.65;}.rail-loading-heart{width:43px;height:43px;display:flex;align-items:center;justify-content:center;}.empty-likes-title{font-size:13px;color:#796f60;}.empty-likes-hint{font-size:11px;color:#a3998b;}.likes-retry{display:flex;align-items:center;justify-content:center;flex-shrink:0;max-width:100%;min-height:44px;min-width:56px;padding:6px 0;background:transparent;border-radius:20px;white-space:normal;font-size:12px;color:#6d5930;line-height:20px;}.retry-label{display:flex;align-items:center;justify-content:center;box-sizing:border-box;max-width:100%;min-height:32px;min-width:56px;padding:6px 12px;border-radius:18px;background:#fff;pointer-events:none;}.retry-label-text{display:block;line-height:20px;text-align:center;overflow-wrap:anywhere;}.rail-more{width:85px;flex:0 0 85px;min-height:154px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;white-space:normal;font-size:12px;color:#8e8473;padding:15px 8px;}.likes-feedback{display:flex;align-items:center;justify-content:center;gap:8px;padding:0 20px 8px;font-size:12px;color:#a28a5b;}.messages-panel{flex:1;min-height:0;padding:14px 20px 20px;padding-bottom:calc(20px + var(--liquid-tabbar-space,96px));padding-bottom:calc(20px + var(--liquid-tabbar-space,96px) + env(safe-area-inset-bottom));border-radius:30px 30px 0 0;background:#fff;box-sizing:border-box;}.messages-title{margin-bottom:2px;}.row{position:relative;display:flex;width:100%;align-items:center;gap:12px;min-height:72px;padding:10px 0;text-align:left;white-space:normal;}.row+.row:before{content:'';position:absolute;top:0;left:64px;right:0;height:1px;background:#eae7e1;}.avatar{display:flex;align-items:center;justify-content:center;width:52px;height:52px;flex:0 0 52px;border-radius:50%;color:#fff;}.interaction-icon{background:#f4c600;}.audit{background:#e9dfc4;}.group-list-avatar{flex:0 0 52px;}.main{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px;}.name{display:block;font-size:17px;font-weight:550;line-height:1.5;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.summary{display:block;overflow:hidden;color:#918b81;font-size:12px;line-height:1.6;text-overflow:ellipsis;white-space:nowrap;}.side{display:flex;min-width:26px;max-width:66px;align-items:flex-end;flex-direction:column;gap:8px;flex-shrink:0;}.date{color:#a7a095;font-size:10px;line-height:1.4;overflow-wrap:anywhere;text-align:right;}.badge{display:flex;align-items:center;justify-content:center;min-width:19px;height:19px;padding:0 5px;box-sizing:border-box;border-radius:12px;background:#e8453c;color:#fff;font-size:10px;line-height:19px;font-weight:550;font-variant-numeric:tabular-nums;}.message-error{display:flex;align-items:center;justify-content:center;gap:12px;padding:18px 0;color:#a38b63;font-size:12px;line-height:1.6;}.message-error .retry-label{background:#eeebe4;}.search-empty{padding:50px 10px;text-align:center;color:#9b9285;font-size:13px;line-height:1.7;}
@media(max-width:350px){.header-controls{padding-left:16px;padding-right:16px;}.page-title{font-size:29px;}.message-likes-section>.section-title{padding-left:16px;}.likes-rail-content{padding-left:16px;padding-right:16px;}.messages-panel{padding-left:16px;padding-right:16px;}.row{gap:11px;}.name{font-size:15px;}.summary{font-size:11px;}.side{max-width:52px;}}
@media(min-width:680px){.message-page,.header{max-width:660px;margin:0 auto;}}
.group-list-avatar :deep(.group-avatar-cell){font-size:12px;}
.group-list-avatar :deep(.group-avatar-empty){font-size:18px;}
/* #ifdef H5 */
.message-page{min-height:var(--app-layout-viewport-height, 100vh);}
/* #endif */
@media(prefers-reduced-motion:reduce){button,.search-shell,.search-input,.header-surface::after{transition:none;}button:active{transform:none;}}
@supports ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){
  .header-surface{background:rgba(239,238,235,.8);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);}
  .header.is-scrolled .header-surface{bottom:-8px;-webkit-mask-image:linear-gradient(to bottom,#000 calc(100% - 8px),transparent);mask-image:linear-gradient(to bottom,#000 calc(100% - 8px),transparent);}
}
</style>
