<template>
  <view class="interaction-page">
    <view v-if="loading" class="state">{{ t('inbox.loading') }}</view>
    <view v-else-if="!items.length" class="state">{{ t('inbox.noInteractions') }}</view>
    <view v-else>
      <view v-for="item in items" :key="item.id" class="interaction-item" @click="openItem(item)">
        <image v-if="item.actor_avatar_url" class="avatar" :src="item.actor_avatar_url" mode="aspectFill" />
        <view v-else class="avatar placeholder">{{ t('inbox.user').slice(0, 1) }}</view>
        <view class="content"><text class="title">{{ item.actor_name || item.actor_email || t('inbox.user') }} {{ typeLabel(item) }}</text><text v-if="item.content" class="text">{{ item.content }}</text><text class="time">{{ formatTime(item.created_at) }}</text><view v-if="item.type.endsWith('_comment')" class="reply">{{ t('moment.reply') }}</view></view>
        <image v-if="item.target_image_url" class="thumbnail" :src="item.target_image_url" mode="aspectFill" />
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getNotificationsApi, markNotificationsReadApi } from '@/api/notifications.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'
import { interactionRoute } from '@/utils/interactionNavigation.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
const items = ref([]), loading = ref(true)
function typeLabel(item) { return item.type?.includes('comment') ? t('inbox.commented') : t('inbox.liked') }
function formatTime(value) { return value ? new Date(value).toLocaleString() : '' }
function openItem(item) { const route = interactionRoute(item); if (route) uni.navigateTo({ url: route }) }
async function load() { loading.value = true; try { const data = await getNotificationsApi({ page: 1, pageSize: 50 }); items.value = (data?.notifications || []).filter(item => item.type !== 'chat_request'); const unreadIds = items.value.filter(item => !item.is_read).map(item => item.id); if (unreadIds.length) await markNotificationsReadApi(unreadIds); await refreshUnreadBadge() } catch (error) { uni.showToast({ title: t('inbox.loadChatFailed'), icon: 'none' }) } finally { loading.value = false } }
onShow(() => { uni.setNavigationBarTitle({ title: t('inbox.interactions') }); load() })
watch(currentLocale, () => uni.setNavigationBarTitle({ title: t('inbox.interactions') }))
</script>
<style scoped lang="scss">
.interaction-page{min-height:100vh;background:#fff}.state{padding:150rpx 0;text-align:center;color:#999}.interaction-item{display:flex;gap:22rpx;padding:28rpx 30rpx;border-bottom:1rpx solid #f0f0f0}.avatar{width:92rpx;height:92rpx;flex:0 0 92rpx;border-radius:50%;background:#eee}.placeholder{display:flex;align-items:center;justify-content:center;color:#999}.content{min-width:0;flex:1}.title{display:block;color:#1e2029;font-size:30rpx;font-weight:700}.text{display:block;margin-top:10rpx;color:#333;font-size:28rpx}.time{display:block;margin-top:10rpx;color:#aaa;font-size:22rpx}.reply{display:inline-block;margin-top:14rpx;padding:8rpx 18rpx;border-radius:24rpx;background:#f5f5f6;color:#666;font-size:22rpx}.thumbnail{width:112rpx;height:112rpx;flex:0 0 112rpx;border-radius:10rpx;background:#eee}
</style>
