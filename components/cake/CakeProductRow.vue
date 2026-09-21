<template>
  <view class="cake-row" :class="{ 'is-notice': isNotice }" role="button" :aria-label="titleText" @click="emit('open', product)">
    <view class="cake-row-media" :class="{ 'is-notice': isNotice }">
      <image
        v-if="imageUrl && !imageFailed"
        class="cake-row-image"
        :src="imageUrl"
        mode="aspectFill"
        :alt="titleText"
        @error="imageFailed = true"
      />
      <image v-else-if="!isNotice" class="cake-row-image is-placeholder" :src="placeholder" mode="aspectFit" />
      <view v-else class="cake-row-notice">
        <text class="cake-row-notice-main">{{ t('cake.noticeCardMain') }}</text>
        <text class="cake-row-notice-sub">{{ t('cake.noticeCardSub') }}</text>
      </view>
    </view>

    <view class="cake-row-body">
      <text class="cake-row-title">{{ titleText }}</text>
      <text v-if="subtitleText" class="cake-row-subtitle">{{ subtitleText }}</text>

      <view v-if="tagTexts.length" class="cake-row-tags">
        <text v-for="(tag, index) in tagTexts" :key="index" class="cake-row-tag">{{ tag }}</text>
      </view>

      <view class="cake-row-footer">
        <view class="cake-row-price-box">
          <view class="cake-row-price">
            <text class="cake-row-symbol">¥</text>
            <text class="cake-row-amount">{{ amount }}</text>
          </view>
          <text v-if="originalAmount" class="cake-row-original">¥{{ originalAmount }}</text>
          <text v-if="soldText" class="cake-row-sold">{{ soldText }}</text>
        </view>
        <button
          class="cake-row-add"
          :disabled="pending || soldOut"
          :aria-label="soldOut ? t('cake.stockInsufficient') : t('cake.addToCart')"
          @click.stop="emit('add', product)"
        >
          <uni-icons v-if="!pending" type="plus" :size="18" color="#FFFFFF" />
          <text v-else class="cake-row-add-text">{{ t('cake.loading') }}</text>
        </button>
      </view>
      <text v-if="soldOut" class="cake-row-warning">{{ t('cake.stockInsufficient') }}</text>
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

watch(() => props.product?.id, () => { imageFailed.value = false })
</script>

<style scoped lang="scss">
.cake-row {
  display: flex;
  gap: 20rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 20rpx;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-row:active { transform: scale(0.99); }

.cake-row-media {
  position: relative;
  flex: 0 0 auto;
  width: 200rpx;
  height: 200rpx;
  border-radius: 18rpx;
  background: #F4F1EB;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-row-media.is-notice { background: #F7E6C9; }

.cake-row-image { width: 100%; height: 100%; }

.cake-row-image.is-placeholder { width: 62%; height: 62%; }

.cake-row-notice { display: flex; flex-direction: column; align-items: center; }

.cake-row-notice-main,
.cake-row-notice-sub { font-size: 40rpx; line-height: 1.05; font-weight: 700; color: #C79A55; }

.cake-row-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.cake-row-title {
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

.cake-row-subtitle {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8A857C;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cake-row-tags { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 10rpx; }

.cake-row-tag {
  font-size: 18rpx;
  line-height: 1.5;
  color: #B4552A;
  border: 1rpx solid #E7BCA4;
  background: #FDF3EC;
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
}

.cake-row-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: auto;
  padding-top: 12rpx;
}

.cake-row-price-box { display: flex; align-items: baseline; gap: 8rpx; min-width: 0; flex-wrap: wrap; }

.cake-row-price { display: flex; align-items: baseline; color: #C4551F; }

.cake-row-symbol { font-size: 20rpx; font-weight: 600; }

.cake-row-amount { font-size: 34rpx; font-weight: 700; letter-spacing: -0.6rpx; }

.cake-row-original { font-size: 20rpx; color: #A9A39A; text-decoration: line-through; }

.cake-row-sold { font-size: 20rpx; color: #A9A39A; }

.cake-row-add {
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
  transition-property: transform, background-color;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-row-add:active { transform: scale(0.92); }

.cake-row-add[disabled] { background: #DCD7CE; }

.cake-row-add-text { font-size: 18rpx; color: #FFFFFF; }

.cake-row-warning { margin-top: 8rpx; font-size: 20rpx; color: #B4442A; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-row,
  .cake-row-add { transition-duration: 0ms; }
}
</style>
