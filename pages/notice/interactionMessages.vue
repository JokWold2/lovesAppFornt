<template>
  <view class="interaction-page app-h5-min-screen">
    <view v-if="loading" class="state">{{ t('inbox.loading') }}</view>
    <view v-else-if="!items.length" class="state">{{ t('inbox.noInteractions') }}</view>
    <view v-else>
      <view v-for="item in items" :key="item.id" class="interaction-item" @click="openItem(item)">
        <image v-if="!isLockedBlessingNotification(item) && item.actor_avatar_url" class="avatar" :src="item.actor_avatar_url" mode="aspectFill" />
        <view v-else class="avatar placeholder">{{ t('inbox.user').slice(0, 1) }}</view>
        <view class="content"><text class="title">{{ interactionSummary(item, t) }}</text><text v-if="!isLockedBlessingNotification(item) && item.content" class="text">{{ item.content }}</text><text class="time">{{ formatTime(item.created_at) }}</text><view v-if="item.type.endsWith('_comment')" class="reply">{{ t('moment.reply') }}</view></view>
        <image v-if="!isLockedBlessingNotification(item) && item.target_image_url" class="thumbnail" :src="item.target_image_url" mode="aspectFill" />
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, watch } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getNotificationsApi, markInteractionsReadApi } from '@/api/notifications.js'
import { getToken } from '@/utils/auth.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'
import { interactionRoute, interactionSummary, isLockedBlessingNotification } from '@/utils/interactionNavigation.js'
import { isTabBarRoute } from '@/utils/tabBarState.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
const items = ref([]), loading = ref(true)
// 需求市场的通知类型与点赞/评论不同，单独给出文案，避免被显示成“赞了你”。
function typeLabel(item) {
  if (item.type === 'demand_hall_application') return t('inbox.demandHallApplied')
  if (item.type === 'demand_hall_application_result' || item.type === 'demand_hall_order') return t('inbox.demandHallUpdated')
  return item.type?.includes('comment') ? t('inbox.commented') : t('inbox.liked')
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
    if (current()) uni.showToast({ title: t('inbox.loadChatFailed'), icon: 'none' })
  } finally { if (request === generation) loading.value = false }
}
onShow(() => { visible = true; uni.setNavigationBarTitle({ title: t('inbox.interactions') }); load() })
onHide(() => { visible = false; generation++ })
onUnload(() => { visible = false; generation++ })
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('inbox.interactions') }))
</script>
<style scoped lang="scss">
/* #ifndef H5 */
.interaction-page{min-height:100vh;background:#fff}
/* #endif */
.interaction-page{background:#fff}.state{padding:150rpx 0;text-align:center;color:#999}.interaction-item{display:flex;gap:22rpx;padding:28rpx 30rpx;border-bottom:1rpx solid #f0f0f0}.avatar{width:92rpx;height:92rpx;flex:0 0 92rpx;border-radius:50%;background:#eee}.placeholder{display:flex;align-items:center;justify-content:center;color:#999}.content{min-width:0;flex:1}.title{display:block;color:#1e2029;font-size:30rpx;font-weight:700}.text{display:block;margin-top:10rpx;color:#333;font-size:28rpx}.time{display:block;margin-top:10rpx;color:#aaa;font-size:22rpx}.reply{display:inline-block;margin-top:14rpx;padding:8rpx 18rpx;border-radius:24rpx;background:#f5f5f6;color:#666;font-size:22rpx}.thumbnail{width:112rpx;height:112rpx;flex:0 0 112rpx;border-radius:10rpx;background:#eee}
</style>
<style scoped>
/* #ifndef H5 */
.interaction-page { min-height: 100vh; }
/* #endif */
</style>
