<template>
  <view class="cake-store" role="button" :aria-label="nameText" @click="emit('select', store)">
    <view class="cake-store-head">
      <text class="cake-store-name">{{ nameText }}</text>
      <text v-if="distanceText" class="cake-store-distance">{{ t('cake.distanceAway', { distance: distanceText }) }}</text>
    </view>

    <view class="cake-store-meta">
      <text class="cake-store-status" :class="statusClass">{{ t(statusKey) }}</text>
      <text class="cake-store-hours">{{ t('cake.businessHours', { open: openTime, close: closeTime }) }}</text>
    </view>

    <text class="cake-store-address">{{ addressText }}</text>

    <view v-if="serviceLabels.length || phone" class="cake-store-tags">
      <text v-for="(label, index) in serviceLabels" :key="index" class="cake-store-tag">{{ label }}</text>
      <text v-if="phone" class="cake-store-tag is-plain">{{ phone }}</text>
    </view>

    <view class="cake-store-actions">
      <button
        class="cake-store-favorite"
        :disabled="favoritePending"
        :aria-label="favorite ? t('cake.favoriteRemoved') : t('cake.favoriteAdded')"
        @click.stop="emit('favorite', store)"
      >
        <uni-icons :type="favorite ? 'heart-filled' : 'heart'" :size="20" :color="favorite ? '#C4551F' : '#8A857C'" />
      </button>
      <button v-if="phone" class="cake-store-ghost" @click.stop="emit('call', store)">{{ t('cake.callStore') }}</button>
      <button class="cake-store-ghost" @click.stop="emit('navigate', store)">{{ t('cake.navigate') }}</button>
      <button class="cake-store-primary" :disabled="!isOpen" @click.stop="emit('order', store)">
        {{ isOpen ? t('cake.orderHere') : t('cake.storeClosed') }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '@/utils/localeRuntime.js'
import { formatCakeDistance, isStoreOpen, normalizeTimeText, pickCakeText, storeServiceKeys, storeStatusKey } from '@/utils/cake.js'

const props = defineProps({
  store: { type: Object, required: true },
  locale: { type: String, default: 'zh-Hans' },
  favorite: { type: Boolean, default: false },
  favoritePending: { type: Boolean, default: false }
})

const emit = defineEmits(['favorite', 'navigate', 'call', 'order', 'select'])

const nameText = computed(() => pickCakeText(props.store?.name, props.locale))
const addressText = computed(() => pickCakeText(props.store?.address, props.locale))
const distanceText = computed(() => formatCakeDistance(props.store?.distanceMeters))
const statusKey = computed(() => storeStatusKey(props.store))
const statusClass = computed(() => ({
  'is-open': statusKey.value === 'cake.storeOpen',
  'is-soon': statusKey.value === 'cake.storeClosingSoon',
  'is-closed': statusKey.value === 'cake.storeClosed'
}))
const openTime = computed(() => normalizeTimeText(props.store?.openTime) || '--:--')
const closeTime = computed(() => normalizeTimeText(props.store?.closeTime) || '--:--')
const phone = computed(() => String(props.store?.phone || ''))
const serviceLabels = computed(() => storeServiceKeys(props.store).map(key => t(key)))
const isOpen = computed(() => isStoreOpen(props.store))
</script>

<style scoped lang="scss">
.cake-store {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-store:active { transform: scale(0.99); }

.cake-store-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
}

.cake-store-name {
  flex: 1;
  min-width: 0;
  font-size: 32rpx;
  font-weight: 650;
  color: #26241F;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.cake-store-distance {
  flex: 0 0 auto;
  font-size: 22rpx;
  color: #8A857C;
}

.cake-store-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.cake-store-status {
  font-size: 20rpx;
  line-height: 1.6;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.cake-store-status.is-open { background: #EAF4EA; color: #3E7A3E; }

.cake-store-status.is-soon { background: #FCF1E2; color: #A96A18; }

.cake-store-status.is-closed { background: #F2F0EC; color: #8A857C; }

.cake-store-hours { font-size: 22rpx; color: #6E6961; }

.cake-store-address {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.55;
  color: #6E6961;
  overflow-wrap: anywhere;
}

.cake-store-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}

.cake-store-tag {
  font-size: 20rpx;
  line-height: 1.6;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #F5F2EC;
  color: #6E6961;
}

.cake-store-tag.is-plain { background: transparent; padding: 0; color: #A9A39A; }

.cake-store-actions {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 24rpx;
}

.cake-store-favorite {
  flex: 0 0 auto;
  width: 68rpx;
  height: 68rpx;
  margin: 0;
  padding: 0;
  min-height: 68rpx;
  line-height: 1;
  border-radius: 50%;
  background: #F5F2EC;
  display: flex;
  align-items: center;
  justify-content: center;
  transition-property: transform, background-color;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-store-favorite:active { transform: scale(0.92); }

.cake-store-ghost {
  flex: 0 0 auto;
  margin: 0;
  min-height: 68rpx;
  line-height: 68rpx;
  padding: 0 24rpx;
  border-radius: 34rpx;
  background: #F5F2EC;
  color: #26241F;
  font-size: 24rpx;
}

.cake-store-primary {
  flex: 1;
  min-width: 0;
  margin: 0 0 0 auto;
  min-height: 68rpx;
  line-height: 68rpx;
  padding: 0 30rpx;
  border-radius: 34rpx;
  background: #C4551F;
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 600;
}

.cake-store-primary[disabled] { background: #DCD7CE; color: #FFFFFF; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-store,
  .cake-store-favorite { transition-duration: 0ms; }
}
</style>
