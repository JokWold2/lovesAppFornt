<template>
  <view v-if="visible" class="sheet-mask" @tap.self="emit('close')">
    <view class="sheet">
      <view class="sheet-head"><text class="sheet-title">{{ title }}（{{ members.length }}）</text><text class="close" @tap="emit('close')">×</text></view>
      <scroll-view scroll-y class="member-list">
        <view v-for="member in memberCards" :key="member.userId" class="member-row">
          <image v-if="member.avatarUrl" class="member-avatar" :src="member.avatarUrl" mode="aspectFill" />
          <view v-else class="member-avatar member-avatar-fallback">{{ member.name.slice(0, 1) }}</view>
          <view class="member-copy"><text class="member-name">{{ member.name }}</text><text class="member-email">{{ member.email || '暂无邮箱' }}</text></view>
        </view>
        <view v-if="!memberCards.length" class="empty">暂无成员</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { visibleMemberDetails } from '@/utils/groupMemberSheetState.js'

const props = defineProps({ visible: Boolean, title: { type: String, default: '成员' }, members: { type: Array, default: () => [] } })
const emit = defineEmits(['close'])
const memberCards = computed(() => props.members.map(visibleMemberDetails))
</script>

<style scoped>
.sheet-mask { position: fixed; z-index: 1000; inset: 0; display: flex; align-items: flex-end; background: rgba(0,0,0,.45); }.sheet { width: 100%; max-height: 70vh; padding-bottom: env(safe-area-inset-bottom); border-radius: 28rpx 28rpx 0 0; background: #fff; }.sheet-head { display: flex; align-items: center; justify-content: space-between; height: 100rpx; padding: 0 32rpx; border-bottom: 1rpx solid #eee; }.sheet-title { color: #20232b; font-size: 30rpx; font-weight: 600; }.close { padding: 8rpx; color: #999; font-size: 50rpx; line-height: 1; }.member-list { max-height: calc(70vh - 100rpx); }.member-row { display: flex; align-items: center; gap: 18rpx; padding: 22rpx 32rpx; }.member-avatar { width: 76rpx; height: 76rpx; border-radius: 50%; background: #e5e7eb; }.member-avatar-fallback { display: flex; align-items: center; justify-content: center; color: #fff; background: #b7b7b7; font-size: 28rpx; }.member-copy { display: flex; flex: 1; flex-direction: column; min-width: 0; gap: 6rpx; }.member-name { overflow: hidden; color: #222; font-size: 28rpx; text-overflow: ellipsis; white-space: nowrap; }.member-email { overflow: hidden; color: #999; font-size: 23rpx; text-overflow: ellipsis; white-space: nowrap; }.empty { padding: 70rpx 0; color: #999; text-align: center; font-size: 26rpx; }
</style>
