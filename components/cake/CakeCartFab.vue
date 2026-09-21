<template>
  <view class="cake-fab-host" :style="{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom))`, zIndex }">
    <view
      class="cake-fab"
      :class="{ 'is-empty': !totalQuantity }"
      role="button"
      :aria-label="totalQuantity ? t('cake.cartItemCount', { count: totalQuantity }) : t('cake.cartTitle')"
      @click="emit('open')"
    >
      <view class="cake-fab-icon">
        <uni-icons type="cart" :size="24" color="#FFFFFF" />
        <text v-if="totalQuantity" class="cake-fab-badge">{{ badgeText }}</text>
      </view>
      <view v-if="totalQuantity" class="cake-fab-info">
        <text class="cake-fab-amount">{{ amountText }}</text>
        <text class="cake-fab-caption">{{ t('cake.cartItemCount', { count: totalQuantity }) }}</text>
      </view>
      <text v-else class="cake-fab-empty-text">{{ t('cake.cartTitle') }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '@/utils/localeRuntime.js'
import { formatCakePrice } from '@/utils/cake.js'

const props = defineProps({
  totalQuantity: { type: Number, default: 0 },
  itemsAmountCents: { type: Number, default: 0 },
  // 底部导航（108rpx ≈ 54px）之上留一点间隙，安全区在样式里用 env() 叠加
  bottomOffset: { type: Number, default: 66 },
  zIndex: { type: Number, default: 55 }
})

const emit = defineEmits(['open'])

const badgeText = computed(() => (props.totalQuantity > 99 ? '99+' : String(props.totalQuantity)))
const amountText = computed(() => formatCakePrice(props.itemsAmountCents))
</script>

<style scoped lang="scss">
.cake-fab-host {
  position: fixed;
  right: 28rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none;
}

.cake-fab {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 26rpx 14rpx 18rpx;
  border-radius: 60rpx;
  background: #26241F;
  box-shadow: 0 10rpx 28rpx rgba(38, 36, 31, 0.22);
  transition-property: transform, background-color;
  transition-duration: 120ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-fab.is-empty { padding: 16rpx; border-radius: 50%; }

.cake-fab:active { transform: scale(0.96); }

.cake-fab-icon {
  position: relative;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-fab-badge {
  position: absolute;
  top: -6rpx;
  right: -10rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  box-sizing: border-box;
  border-radius: 16rpx;
  background: #E0552B;
  color: #FFFFFF;
  font-size: 20rpx;
  line-height: 32rpx;
  text-align: center;
}

.cake-fab-info { display: flex; flex-direction: column; }

.cake-fab-amount {
  font-size: 28rpx;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.2;
}

.cake-fab-caption {
  font-size: 18rpx;
  color: rgba(255, 255, 255, 0.66);
  line-height: 1.3;
}

.cake-fab-empty-text {
  font-size: 26rpx;
  color: #FFFFFF;
  padding-right: 8rpx;
}

@media (prefers-reduced-motion: reduce) {
  .cake-fab { transition-duration: 0ms; }
}
</style>
