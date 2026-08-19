<template>
  <view v-if="visible" class="sheet-mask" @tap.self="emit('close')">
    <view class="sheet">
      <view class="sheet-head"><text class="sheet-title">收到的点赞（{{ total }}）</text><text class="close" @tap="emit('close')">×</text></view>
      <scroll-view scroll-y class="likes-list">
        <view v-for="like in likes" :key="`${like.userId}-${like.createdAt}`" class="like-row">
          <image class="avatar" :src="like.avatarUrl || defaultAvatar" mode="aspectFill" />
          <view class="like-info"><text class="name">{{ like.name }}</text><text class="email">{{ like.email }}</text></view>
          <text class="time">{{ formatTime(like.createdAt) }}</text>
        </view>
        <view v-if="!likes.length" class="empty">暂时还没有收到点赞</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
defineProps({ visible: Boolean, likes: { type: Array, default: () => [] }, total: { type: Number, default: 0 } })
const emit = defineEmits(['close'])
const defaultAvatar = '/static/logo.png'

function formatTime(value) {
  const time = new Date(value).getTime()
  if (!time) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000))
  if (seconds < 60) return '刚刚'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.sheet-mask { position: fixed; z-index: 99; inset: 0; background: rgba(0, 0, 0, .45); display: flex; align-items: flex-end; }
.sheet { width: 100%; max-height: 70vh; border-radius: 28rpx 28rpx 0 0; background: #fff; padding-bottom: env(safe-area-inset-bottom); }
.sheet-head { height: 100rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 32rpx; border-bottom: 1rpx solid #eee; }.sheet-title { font-weight: 600; font-size: 30rpx; }.close { font-size: 50rpx; color: #999; line-height: 1; }.likes-list { max-height: calc(70vh - 100rpx); }.like-row { display: flex; align-items: center; gap: 18rpx; padding: 22rpx 32rpx; }.avatar { width: 76rpx; height: 76rpx; border-radius: 50%; background: #eee; }.like-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }.name { font-size: 28rpx; color: #222; }.email, .time { font-size: 22rpx; color: #999; }.time { white-space: nowrap; }.empty { color: #999; text-align: center; padding: 70rpx 0; font-size: 26rpx; }
</style>
