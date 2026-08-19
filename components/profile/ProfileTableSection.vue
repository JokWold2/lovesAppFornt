<template>
  <view class="section">
    <view class="section-title">{{ title }}</view>
    <view class="table">
      <view v-for="row in rows" :key="row.label" class="tr">
        <view class="th">{{ row.label }}</view>
        <view class="td">{{ row.value || '—' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] }
})
</script>

<style scoped lang="scss">
$primary-color: #fff6df;
$border-color: #e0e0e0;
.section { background: #fff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 30rpx; box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, .05); }
.section-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 24rpx; padding-left: 16rpx; border-left: 8rpx solid $primary-color; }
.table { width: 100%; border-top: 1px solid $border-color; border-left: 1px solid $border-color; border-radius: 4rpx; overflow: hidden; }
.tr { display: flex; width: 100%; }
.th, .td { padding: 16rpx 20rpx; font-size: 28rpx; border-right: 1px solid $border-color; border-bottom: 1px solid $border-color; word-break: break-all; }
.th { background: rgba(255, 246, 223, .1); color: #333; font-weight: bold; width: 35%; flex-shrink: 0; }
.td { color: #333; width: 65%; background: #fff; }
</style>
