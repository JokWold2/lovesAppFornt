<template>
 <view class="interaction-page" :style="{paddingTop:navHeight+'px'}">
  <view class="interaction-nav" :style="{paddingTop:geometry.contentTop+'px',paddingRight:geometry.contentRight+'px',backgroundColor:'rgba(243,242,239,'+(0.85+scrollProgress*0.12)+')',backdropFilter:'blur('+(scrollProgress*12)+'px)',WebkitBackdropFilter:'blur('+(scrollProgress*12)+'px)'}">
   <button class="back" hover-class="pressed" @click="back" :aria-label="t('blessAuth.back')"><uni-icons type="left" size="24" color="#35342f" /></button>
   <text class="page-title">{{ t('inbox.interactions') }}</text>
  </view>
  <view class="interaction-body">
   <view v-if="loading && !items.length" class="state"><uni-icons type="chatboxes" size="36" color="#c4b391" /><text>{{ t('inbox.loading') }}</text></view>
   <view v-else-if="failed" class="state"><text>{{ t('inbox.loadChatFailed') }}</text><button class="retry" @click="load">{{ t('deck.retry') }}</button></view>
   <view v-else-if="!items.length" class="state"><uni-icons type="chatboxes" size="40" color="#c4b391" /><text>{{ t('inbox.noInteractions') }}</text></view>
   <view v-for="item in items" :key="item.id" class="interaction-item" hover-class="item-pressed" @click="openItem(item)">
    <view class="avatar-wrap"><image v-if="!isLockedBlessingNotification(item) && item.actor_avatar_url" class="avatar" :src="item.actor_avatar_url" mode="aspectFill" /><view v-else class="avatar placeholder"><uni-icons type="person-filled" size="25" color="#b8b2a7" /></view><view class="type-badge"><uni-icons :type="messageIcon(item)" size="12" color="var(--bless-text, #775E25)" /></view></view>
    <view class="content"><text class="title">{{ summary(item) }}</text><text v-if="!isLockedBlessingNotification(item) && item.content" class="message-text">{{ item.content }}</text><view class="meta-row"><text class="time">{{ formatTime(item.created_at) }}</text><view v-if="item.type?.endsWith('_comment')" class="reply"><uni-icons type="chat" size="13" color="var(--bless-text, #775E25)" /><text>{{ t('moment.reply') }}</text></view></view></view>
    <image v-if="!isLockedBlessingNotification(item) && item.target_image_url" class="thumbnail" :src="item.target_image_url" mode="aspectFill" />
   </view>
  </view>
 </view>
</template>
<script setup>
import { ref, watch, computed } from 'vue'
import { onShow, onHide, onUnload, onPageScroll, onResize } from '@dcloudio/uni-app'
import { getNotificationsApi, markInteractionsReadApi } from '@/api/notifications.js'
import { getToken } from '@/utils/auth.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'
import { interactionRoute, interactionSummary, isLockedBlessingNotification } from '@/utils/interactionNavigation.js'
import { isTabBarRoute } from '@/utils/tabBarState.js'
import { readChatHeaderGeometry } from '@/utils/chatHeaderLayout.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
let platform = ''
// #ifdef MP-WEIXIN
platform = 'mp-weixin'
// #endif
const geometry = ref(readChatHeaderGeometry(uni, { clearCapsule: false }, platform))
const navHeight = computed(() => geometry.value.contentTop + 56)
const scrollProgress = ref(0)
const items = ref([]), loading = ref(true), failed = ref(false)
function back() { if (getCurrentPages().length > 1) uni.navigateBack(); else uni.switchTab({ url: '/pages/notice/notice' }) }
function messageIcon(item) { return item.type?.endsWith('_like') ? 'heart-filled' : item.type?.endsWith('_comment') ? 'chat' : 'notification' }
function summary(item) {
 if (item.type?.endsWith('_like') || item.type?.endsWith('_comment')) return interactionSummary(item, t)
 return typeLabel(item)
}
onPageScroll(e => { scrollProgress.value = Math.min(1, Math.max(0, e.scrollTop / 48)) })
onResize(() => { geometry.value = readChatHeaderGeometry(uni, { clearCapsule: false }, platform) })
// 需求市场的通知类型与点赞/评论不同，单独给出文案，避免被显示成“赞了你”。
function typeLabel(item) {
  if (item.type === 'demand_hall_application') return t('inbox.demandHallApplied')
  if (item.type === 'demand_hall_application_result' || item.type === 'demand_hall_order') return t('inbox.demandHallUpdated')
  return t('inbox.interactions')
}
let visible = false, generation = 0
function formatTime(value) { return value ? new Date(value).toLocaleString() : '' }
function openItem(item) {
  const route = interactionRoute(item)
  if (!route) return
  if (isTabBarRoute(route)) uni.switchTab({ url: route })
  else uni.navigateTo({ url: route })
}
async function load() {
  const request = ++generation, token = getToken()
  const current = () => visible && request === generation && token && token === getToken()
  loading.value = true
  failed.value = false
  try {
    const data = await getNotificationsApi({ page: 1, pageSize: 50 })
    if (!current()) return
    items.value = (data?.notifications || []).filter(item => item.type !== 'chat_request')
    const throughId = Number(data?.interactionReadThroughId || 0)
    if (Number.isSafeInteger(throughId) && throughId > 0) {
      try {
        // A message visit does not mark any liker profile as viewed.
        await markInteractionsReadApi(throughId)
      } catch (_) { return }
    }
    if (current()) await refreshUnreadBadge({ force: true })
  } catch (error) {
    if (current()) failed.value = true
  } finally { if (request === generation) loading.value = false }
}
onShow(() => { visible = true; uni.setNavigationBarTitle({ title: t('inbox.interactions') }); load() })
onHide(() => { visible = false; generation++ })
onUnload(() => { visible = false; generation++ })
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('inbox.interactions') }))
</script>
<style scoped>
.interaction-page{min-height:100vh;box-sizing:border-box;background:#f3f2ef;color:#34322e;padding-bottom:calc(24px + env(safe-area-inset-bottom))}
.interaction-nav{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;gap:16px;padding-left:20px;padding-bottom:12px;min-height:44px}
.interaction-nav::after{content:"";position:absolute;top:100%;left:0;right:0;height:8px;background:linear-gradient(rgba(243,242,239,.5),transparent);pointer-events:none}
.back{margin:0;padding:0;width:44px;height:44px;flex-shrink:0;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(48,42,30,.04)}
.back::after,.retry::after{border:0}.page-title{font-size:19px;font-weight:650;line-height:1.3;overflow-wrap:break-word}
.interaction-body{padding:14px 16px;max-width:560px;margin:auto}
.interaction-item{display:flex;align-items:flex-start;gap:12px;padding:17px 15px;background:#fff;border-radius:22px;margin-bottom:12px;box-shadow:0 3px 14px rgba(55,47,30,.025)}
.avatar-wrap{position:relative;width:46px;height:46px;flex-shrink:0}.avatar{width:46px;height:46px;border-radius:50%;background:#f0eeea}.placeholder{display:flex;align-items:center;justify-content:center}
.type-badge{position:absolute;bottom:-2px;right:-3px;width:20px;height:20px;border:2px solid white;border-radius:50%;background:#f8f0dd;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.content{min-width:0;flex:1}.title{display:block;font-size:15px;font-weight:600;line-height:1.5;color:#33312d;overflow-wrap:anywhere}.message-text{display:block;margin-top:7px;color:#716c63;font-size:14px;line-height:1.65;overflow-wrap:anywhere}
.meta-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin-top:10px}.time{color:#aaa49a;font-size:11px;line-height:1.5}.reply{display:flex;align-items:center;gap:4px;padding:5px 10px;background:#f6f2e9;color:var(--bless-text, #775E25);border-radius:16px;font-size:11px}
.thumbnail{width:58px;height:66px;border-radius:12px;flex-shrink:0;background:#efede8;margin-top:2px}.state{padding:72px 20px;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center;color:#9a9285;font-size:14px;line-height:1.7}.retry{padding:10px 26px;margin:0;background:#f2e5cf;color:#61543b;border-radius:20px;font-size:14px}.pressed,.item-pressed{opacity:.8}
@media(max-width:350px){.interaction-body{padding-left:12px;padding-right:12px}.interaction-item{gap:9px;padding:15px 12px}.thumbnail{width:48px;height:58px}}
</style>
