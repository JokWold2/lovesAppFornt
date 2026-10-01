<template>
  <view class="cake-state" :class="{ 'is-compact': compact }">
    <!-- 加载中：用骨架而不是转圈，避免列表区域出现突兀的空洞 -->
    <template v-if="state === 'loading'">
      <view class="cake-state-skeleton">
        <view v-for="index in 3" :key="index" class="cake-skeleton-row" :style="{ animationDelay: `${index * 90}ms` }"></view>
      </view>
      <text v-if="title" class="cake-state-title">{{ title }}</text>
    </template>

    <template v-else-if="state === 'error'">
      <view class="cake-state-badge is-error"><uni-icons type="info" :size="26" color="#B4442A" /></view>
      <text class="cake-state-title">{{ title }}</text>
      <text v-if="hint" class="cake-state-hint">{{ hint }}</text>
      <button class="cake-state-action" :disabled="pending" @click="emit('retry')">{{ pending ? t('cake.loading') : retryLabel }}</button>
    </template>

    <template v-else>
      <view class="cake-state-badge"><uni-icons type="shop" :size="26" color="#A79F92" /></view>
      <text class="cake-state-title">{{ title }}</text>
      <text v-if="hint" class="cake-state-hint">{{ hint }}</text>
      <button v-if="actionLabel" class="cake-state-action" @click="emit('action')">{{ actionLabel }}</button>
    </template>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { t } from '@/utils/localeRuntime.js'

const props = defineProps({
  state: { type: String, default: 'loading' },
  title: { type: String, default: '' },
  hint: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  retryLabel: { type: String, default: '' },
  pending: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }
})

const emit = defineEmits(['retry', 'action'])

const retryLabel = computed(() => props.retryLabel || t('cake.retry'))
</script>

<style scoped lang="scss">
.cake-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
  text-align: center;
}

.cake-state.is-compact { padding: 64rpx 40rpx; }

.cake-state-badge {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: #F1EEE8;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}

.cake-state-badge.is-error { background: #FBEDE8; }

.cake-state-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #26241F;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.cake-state-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8A857C;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.cake-state-action {
  margin: 36rpx 0 0;
  min-height: 80rpx;
  line-height: 80rpx;
  padding: 0 48rpx;
  border-radius: 40rpx;
  background: #26241F;
  color: #FFF;
  font-size: 28rpx;
  transition-property: transform, opacity;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-state-action:active { transform: scale(0.97); }

.cake-state-action[disabled] { opacity: 0.5; }

.cake-state-skeleton {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.cake-skeleton-row {
  height: 120rpx;
  border-radius: 20rpx;
  background: linear-gradient(90deg, #F1EEE8 25%, #F7F5F1 50%, #F1EEE8 75%);
  background-size: 400% 100%;
  animation: cake-skeleton-shimmer 1400ms ease-in-out infinite;
}

@keyframes cake-skeleton-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .cake-skeleton-row { animation: none; }
  .cake-state-action { transition-duration: 0ms; }
}
</style>
