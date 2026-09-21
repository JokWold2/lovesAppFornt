<template>
  <SlideUpPanel :open="open" fixed :label="t('cake.selectSpec')" @dismiss="emit('dismiss')">
    <view v-if="product" class="cake-sku">
      <view class="cake-sku-head">
        <image
          v-if="imageUrl && !imageFailed"
          class="cake-sku-image"
          :src="imageUrl"
          mode="aspectFill"
          :alt="titleText"
          @error="imageFailed = true"
        />
        <image v-else class="cake-sku-image is-placeholder" :src="placeholder" mode="aspectFit" />
        <view class="cake-sku-head-info">
          <view class="cake-sku-price">
            <text class="cake-sku-symbol">¥</text>
            <text class="cake-sku-amount">{{ amount }}</text>
          </view>
          <text class="cake-sku-stock">{{ t('cake.stockLabel', { count: maxQuantity }) }}</text>
          <text class="cake-sku-subtitle">{{ titleText }}</text>
        </view>
        <button class="cake-sku-close" :aria-label="t('cake.close')" @click="emit('dismiss')">
          <uni-icons type="closeempty" :size="20" color="#6E6961" />
        </button>
      </view>

      <scroll-view v-if="skuOptions.length" class="cake-sku-scroll" scroll-y>
        <text class="cake-sku-label">{{ t('cake.specLabel') }}</text>
        <view class="cake-sku-options">
          <view
            v-for="sku in skuOptions"
            :key="sku.id"
            class="cake-sku-option"
            :class="{ 'is-active': sku.id === selectedSkuId, 'is-disabled': skuSoldOut(sku) }"
            role="button"
            :aria-label="skuText(sku)"
            :aria-disabled="skuSoldOut(sku) ? 'true' : 'false'"
            @click="chooseSku(sku)"
          >
            <text class="cake-sku-option-name">{{ skuText(sku) }}</text>
            <text class="cake-sku-option-price">¥{{ skuAmount(sku) }}</text>
          </view>
        </view>

        <text class="cake-sku-label">{{ t('cake.quantityLabel') }}</text>
        <view class="cake-sku-quantity">
          <button class="cake-stepper" :disabled="quantity <= 1" :aria-label="t('cake.quantityLabel')" @click="step(-1)">
            <uni-icons type="minus" :size="18" :color="quantity <= 1 ? '#C4BFB6' : '#26241F'" />
          </button>
          <text class="cake-stepper-value">{{ quantity }}</text>
          <button class="cake-stepper" :disabled="quantity >= maxQuantity" :aria-label="t('cake.quantityLabel')" @click="step(1)">
            <uni-icons type="plus" :size="18" :color="quantity >= maxQuantity ? '#C4BFB6' : '#26241F'" />
          </button>
        </view>
      </scroll-view>

      <view v-else class="cake-sku-scroll">
        <text class="cake-sku-label">{{ t('cake.quantityLabel') }}</text>
        <view class="cake-sku-quantity">
          <button class="cake-stepper" :disabled="quantity <= 1" :aria-label="t('cake.quantityLabel')" @click="step(-1)">
            <uni-icons type="minus" :size="18" :color="quantity <= 1 ? '#C4BFB6' : '#26241F'" />
          </button>
          <text class="cake-stepper-value">{{ quantity }}</text>
          <button class="cake-stepper" :disabled="quantity >= maxQuantity" :aria-label="t('cake.quantityLabel')" @click="step(1)">
            <uni-icons type="plus" :size="18" :color="quantity >= maxQuantity ? '#C4BFB6' : '#26241F'" />
          </button>
        </view>
      </view>

      <view class="cake-sku-footer">
        <button class="cake-sku-submit" :disabled="!canSubmit" @click="submit">
          {{ submitting ? t('cake.submitting') : confirmLabel }}
        </button>
      </view>
    </view>
  </SlideUpPanel>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import { t } from '@/utils/localeRuntime.js'
import { cakeMaxQuantity, cakePlaceholderImage, formatCakeAmount, pickCakeText, resolveCakeImageUrl } from '@/utils/cake.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  product: { type: Object, default: null },
  locale: { type: String, default: 'zh-Hans' },
  // cart：加入购物车；buy：立即下单
  mode: { type: String, default: 'cart' },
  submitting: { type: Boolean, default: false }
})

const emit = defineEmits(['dismiss', 'confirm'])

const selectedSkuId = ref(0)
const quantity = ref(1)
const imageFailed = ref(false)

const skuOptions = computed(() => (Array.isArray(props.product?.skus) ? props.product.skus : []))
const selectedSku = computed(() => skuOptions.value.find(sku => sku.id === selectedSkuId.value) || null)
const titleText = computed(() => pickCakeText(props.product?.title, props.locale))
const imageUrl = computed(() => resolveCakeImageUrl(props.product?.imageUrl))
const placeholder = computed(() => cakePlaceholderImage(props.product?.categoryCode))
const maxQuantity = computed(() => cakeMaxQuantity(selectedSku.value?.stock ?? props.product?.stock))
const amount = computed(() => formatCakeAmount(selectedSku.value?.priceCents ?? props.product?.priceCents))
const canSubmit = computed(() => !!props.product && !props.submitting && maxQuantity.value > 0)
const confirmLabel = computed(() => (props.mode === 'buy' ? t('cake.buyNow') : t('cake.addToCart')))

function skuText(sku) {
  return pickCakeText(sku?.name, props.locale) || t('cake.specDefault')
}

function skuAmount(sku) {
  return formatCakeAmount(sku?.priceCents ?? props.product?.priceCents)
}

function skuSoldOut(sku) {
  return Number(sku?.stock ?? 0) <= 0
}

function chooseSku(sku) {
  if (skuSoldOut(sku)) return
  selectedSkuId.value = sku.id
}

function step(delta) {
  const next = quantity.value + delta
  if (next < 1 || next > maxQuantity.value) return
  quantity.value = next
}

function submit() {
  if (!canSubmit.value) return
  emit('confirm', { skuId: selectedSkuId.value || 0, quantity: quantity.value })
}

// 每次打开都回到默认规格与数量 1，避免沿用上一个商品的选择。
watch(() => [props.open, props.product?.id], ([open]) => {
  if (!open) return
  quantity.value = 1
  imageFailed.value = false
  const firstAvailable = skuOptions.value.find(sku => !skuSoldOut(sku))
  selectedSkuId.value = firstAvailable?.id || 0
}, { immediate: true })
</script>

<style scoped lang="scss">
.cake-sku {
  display: flex;
  flex-direction: column;
  max-height: 76vh;
  background: #F7F5F1;
}

.cake-sku-head {
  position: relative;
  display: flex;
  gap: 20rpx;
  padding: 32rpx 30rpx 24rpx;
}

.cake-sku-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 18rpx;
  background: #EFEBE4;
  flex: 0 0 auto;
}

.cake-sku-image.is-placeholder { padding: 20rpx; box-sizing: border-box; }

.cake-sku-head-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding-right: 56rpx;
}

.cake-sku-price { display: flex; align-items: baseline; color: #C4551F; }

.cake-sku-symbol { font-size: 22rpx; font-weight: 600; }

.cake-sku-amount { font-size: 44rpx; font-weight: 700; letter-spacing: -0.8rpx; }

.cake-sku-stock {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8A857C;
}

.cake-sku-subtitle {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.45;
  color: #57534B;
  overflow-wrap: anywhere;
}

.cake-sku-close {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  width: 60rpx;
  height: 60rpx;
  margin: 0;
  padding: 0;
  min-height: 60rpx;
  line-height: 1;
  border-radius: 50%;
  background: #EFEBE4;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-sku-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 30rpx;
  box-sizing: border-box;
}

.cake-sku-label {
  display: block;
  margin: 18rpx 0 14rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #57534B;
}

.cake-sku-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.cake-sku-option {
  min-width: 180rpx;
  padding: 16rpx 22rpx;
  border-radius: 16rpx;
  border: 2rpx solid #E4DFD6;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  transition-property: border-color, background-color, transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-sku-option:active { transform: scale(0.97); }

.cake-sku-option.is-active { border-color: #C4551F; background: #FDF3EC; }

.cake-sku-option.is-disabled { opacity: 0.42; }

.cake-sku-option-name {
  font-size: 26rpx;
  color: #26241F;
  overflow-wrap: anywhere;
}

.cake-sku-option-price {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #C4551F;
}

.cake-sku-quantity {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 24rpx;
}

.cake-stepper {
  width: 68rpx;
  height: 68rpx;
  margin: 0;
  padding: 0;
  min-height: 68rpx;
  line-height: 1;
  border-radius: 50%;
  background: #EFEBE4;
  display: flex;
  align-items: center;
  justify-content: center;
  transition-property: transform, background-color;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-stepper:active { transform: scale(0.92); }

.cake-stepper-value {
  min-width: 96rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  color: #26241F;
}

.cake-sku-footer {
  padding: 20rpx 30rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1rpx solid #EDE9E2;
}

.cake-sku-submit {
  width: 100%;
  margin: 0;
  min-height: 92rpx;
  line-height: 92rpx;
  border-radius: 46rpx;
  background: #C4551F;
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  transition-property: transform, opacity;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-sku-submit:active { transform: scale(0.985); }

.cake-sku-submit[disabled] { background: #DCD7CE; color: #FFFFFF; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-sku-option,
  .cake-stepper,
  .cake-sku-submit { transition-duration: 0ms; }
}
</style>
