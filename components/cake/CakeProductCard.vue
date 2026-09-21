<template>
  <view class="cake-card" :class="{ 'is-notice': isNotice }" role="button" :aria-label="titleText" @click="emit('open', product)">
    <view class="cake-card-media" :class="{ 'is-notice': isNotice }">
      <image
        v-if="imageUrl && !imageFailed"
        class="cake-card-image"
        :src="imageUrl"
        mode="aspectFill"
        :alt="titleText"
        @error="imageFailed = true"
      />
      <image v-else-if="!isNotice" class="cake-card-image is-placeholder" :src="placeholder" mode="aspectFit" />
      <view v-else class="cake-card-notice">
        <text class="cake-card-notice-main">{{ t('cake.noticeCardMain') }}</text>
        <text class="cake-card-notice-sub">{{ t('cake.noticeCardSub') }}</text>
      </view>
      <view v-if="isNotice" class="cake-card-flag">{{ t('cake.noticeCardMain') }}{{ t('cake.noticeCardSub') }}</view>
    </view>

    <view class="cake-card-body">
      <text class="cake-card-title">{{ titleText }}</text>
      <text v-if="subtitleText" class="cake-card-subtitle">{{ subtitleText }}</text>

      <view v-if="tagTexts.length" class="cake-card-tags">
        <text v-for="(tag, index) in tagTexts" :key="index" class="cake-card-tag">{{ tag }}</text>
      </view>

      <view class="cake-card-footer">
        <view class="cake-card-price-box">
          <view class="cake-card-price">
            <text class="cake-card-symbol">¥</text>
            <text class="cake-card-amount">{{ amount }}</text>
          </view>
          <text v-if="originalAmount" class="cake-card-original">¥{{ originalAmount }}</text>
        </view>
        <button
          class="cake-card-add"
          :class="{ 'is-busy': pending }"
          :disabled="pending || soldOut"
          :aria-label="soldOut ? t('cake.stockInsufficient') : t('cake.addToCart')"
          @click.stop="emit('add', product)"
        >
          <uni-icons v-if="!pending" type="plus" :size="18" color="#FFFFFF" />
          <text v-else class="cake-card-add-text">{{ t('cake.loading') }}</text>
        </button>
      </view>

      <text v-if="soldText" class="cake-card-sold">{{ soldText }}</text>
      <text v-else-if="soldOut" class="cake-card-sold is-warning">{{ t('cake.stockInsufficient') }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { t } from '@/utils/localeRuntime.js'
import { cakePlaceholderImage, formatCakeAmount, pickCakeText, resolveCakeImageUrl } from '@/utils/cake.js'

const props = defineProps({
  product: { type: Object, required: true },
  locale: { type: String, default: 'zh-Hans' },
  pending: { type: Boolean, default: false }
})

const emit = defineEmits(['open', 'add'])

const imageFailed = ref(false)
const isNotice = computed(() => props.product?.kind === 'notice')
const titleText = computed(() => pickCakeText(props.product?.title, props.locale))
const subtitleText = computed(() => pickCakeText(props.product?.subtitle, props.locale))
const imageUrl = computed(() => resolveCakeImageUrl(props.product?.imageUrl))
const placeholder = computed(() => cakePlaceholderImage(props.product?.categoryCode))
const amount = computed(() => formatCakeAmount(props.product?.priceCents))
const originalAmount = computed(() => {
  const original = Number(props.product?.originalPriceCents || 0)
  return original > Number(props.product?.priceCents || 0) ? formatCakeAmount(original) : ''
})
const tagTexts = computed(() => (Array.isArray(props.product?.tags) ? props.product.tags : [])
  .map(tag => pickCakeText(tag, props.locale))
  .filter(Boolean))
const soldOut = computed(() => Number(props.product?.stock ?? 1) <= 0)
const soldText = computed(() => {
  const sold = Number(props.product?.soldCount || 0)
  return sold > 0 ? t('cake.soldCount', { count: sold }) : ''
})

// 列表复用同一个组件，商品换了要重新给图片一次机会。
watch(() => props.product?.id, () => { imageFailed.value = false })
</script>

<style scoped lang="scss">
.cake-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-card:active { transform: scale(0.985); }

.cake-card-media {
  position: relative;
  width: 100%;
  height: 320rpx;
  background: #F4F1EB;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cake-card-media.is-notice { background: #F7E6C9; }

.cake-card-image { width: 100%; height: 100%; }

.cake-card-image.is-placeholder { width: 60%; height: 60%; }

.cake-card-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.cake-card-notice-main,
.cake-card-notice-sub {
  font-size: 64rpx;
  line-height: 1.05;
  font-weight: 700;
  color: #C79A55;
}

.cake-card-flag {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.82);
  color: #9A7638;
  font-size: 18rpx;
}

.cake-card-body {
  padding: 20rpx 20rpx 22rpx;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.cake-card-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.42;
  color: #26241F;
  overflow-wrap: anywhere;
}

.cake-card-subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8A857C;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cake-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}

.cake-card-tag {
  font-size: 18rpx;
  line-height: 1.5;
  color: #B4552A;
  border: 1rpx solid #E7BCA4;
  background: #FDF3EC;
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
}

.cake-card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: auto;
  padding-top: 18rpx;
}

.cake-card-price-box {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  min-width: 0;
}

.cake-card-price {
  display: flex;
  align-items: baseline;
  color: #C4551F;
}

.cake-card-symbol { font-size: 20rpx; font-weight: 600; }

.cake-card-amount { font-size: 36rpx; font-weight: 700; letter-spacing: -0.6rpx; }

.cake-card-original {
  font-size: 22rpx;
  color: #A9A39A;
  text-decoration: line-through;
}

.cake-card-add {
  flex: 0 0 auto;
  width: 60rpx;
  height: 60rpx;
  margin: 0;
  padding: 0;
  min-height: 60rpx;
  line-height: 1;
  border-radius: 50%;
  background: #C4551F;
  display: flex;
  align-items: center;
  justify-content: center;
  transition-property: transform, background-color, opacity;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-card-add:active { transform: scale(0.92); background: #A8451A; }

.cake-card-add[disabled] { background: #DCD7CE; }

.cake-card-add-text { font-size: 18rpx; color: #FFFFFF; }

.cake-card-sold {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #A9A39A;
}

.cake-card-sold.is-warning { color: #B4442A; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-card,
  .cake-card-add { transition-duration: 0ms; }
}
</style>
