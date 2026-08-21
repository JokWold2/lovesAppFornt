<template>
  <view class="interaction-page">
    <view v-if="loading" class="state">加载中...</view>
    <view v-else-if="!items.length" class="state">暂时没有互动消息</view>
    <view v-else>
      <view v-for="item in items" :key="item.id" class="interaction-item" @click="openItem(item)">
        <image v-if="item.actor_avatar_url" class="avatar" :src="item.actor_avatar_url" mode="aspectFill" />
        <view v-else class="avatar placeholder">人</view>
        <view class="content"><text class="title">{{ item.actor_name || item.actor_email || '用户' }} {{ typeLabel(item) }}</text><text v-if="item.content" class="text">{{ item.content }}</text><text class="time">{{ formatTime(item.created_at) }}</text><view v-if="item.type.endsWith('_comment')" class="reply">回复评论</view></view>
        <image v-if="item.target_image_url" class="thumbnail" :src="item.target_image_url" mode="aspectFill" />
      </view>
    </view>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getNotificationsApi, markNotificationsReadApi } from '@/api/notifications.js'
import { refreshUnreadBadge } from '@/utils/unreadBadge.js'
import { interactionRoute } from '@/utils/interactionNavigation.js'
const items = ref([]), loading = ref(true)
const labels = { market_like: '赞了你的市场内容', market_comment: '评论了你的市场内容', profile_like: '赞了你的资料', profile_comment: '评论了你的资料', moment_like: '赞了你的动态', moment_comment: '评论了你的动态' }
function typeLabel(item) { return labels[item.type] || '与你互动' }
function formatTime(value) { return value ? new Date(value).toLocaleString() : '' }
function openItem(item) { const route = interactionRoute(item); if (route) uni.navigateTo({ url: route }) }
async function load() { loading.value = true; try { const data = await getNotificationsApi({ page: 1, pageSize: 50 }); items.value = (data?.notifications || []).filter(item => item.type !== 'chat_request'); const unreadIds = items.value.filter(item => !item.is_read).map(item => item.id); if (unreadIds.length) await markNotificationsReadApi(unreadIds); await refreshUnreadBadge() } catch (error) { uni.showToast({ title: '互动消息加载失败', icon: 'none' }) } finally { loading.value = false } }
onShow(load)
</script>
<style scoped lang="scss">
.interaction-page{min-height:100vh;background:#fff}.state{padding:150rpx 0;text-align:center;color:#999}.interaction-item{display:flex;gap:22rpx;padding:28rpx 30rpx;border-bottom:1rpx solid #f0f0f0}.avatar{width:92rpx;height:92rpx;flex:0 0 92rpx;border-radius:50%;background:#eee}.placeholder{display:flex;align-items:center;justify-content:center;color:#999}.content{min-width:0;flex:1}.title{display:block;color:#1e2029;font-size:30rpx;font-weight:700}.text{display:block;margin-top:10rpx;color:#333;font-size:28rpx}.time{display:block;margin-top:10rpx;color:#aaa;font-size:22rpx}.reply{display:inline-block;margin-top:14rpx;padding:8rpx 18rpx;border-radius:24rpx;background:#f5f5f6;color:#666;font-size:22rpx}.thumbnail{width:112rpx;height:112rpx;flex:0 0 112rpx;border-radius:10rpx;background:#eee}
</style>
