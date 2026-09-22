<template>
  <view class="cake-page app-h5-screen">
    <CakeNavBar
      :title="t('cake.detailTitle')"
      :progress="navProgress"
      :spacer="true"
      show-back
      show-home
    />

    <CakeStateView
      v-if="state === 'loading'"
      state="loading"
      :title="t('cake.loading')"
    />
    <CakeStateView
      v-else-if="state === 'error'"
      state="error"
      :title="t('cake.loadFailed')"
      :hint="t('cake.actionFailed')"
      @retry="loadProduct"
    />
    <CakeStateView
      v-else-if="state === 'empty'"
      state="empty"
      :title="t('cake.storeNotFound')"
    />

    <template v-else-if="product">
      <view class="cake-detail-media" :class="{ 'is-notice': isNotice }">
        <image
          v-if="imageUrl && !imageFailed"
          class="cake-detail-image"
          :src="imageUrl"
          mode="aspectFill"
          :alt="titleText"
          @error="imageFailed = true"
        />
        <image v-else-if="!isNotice" class="cake-detail-image is-placeholder" :src="placeholder" mode="aspectFit" />
        <view v-else class="cake-detail-notice">
          <text class="cake-detail-notice-main">{{ t('cake.noticeCardMain') }}</text>
          <text class="cake-detail-notice-sub">{{ t('cake.noticeCardSub') }}</text>
        </view>
      </view>

      <view class="cake-detail-card">
        <view class="cake-detail-price-row">
          <view class="cake-detail-price">
            <text class="cake-detail-symbol">¥</text>
            <text class="cake-detail-amount">{{ amount }}</text>
          </view>
          <text v-if="originalAmount" class="cake-detail-original">¥{{ originalAmount }}</text>
          <text v-if="soldText" class="cake-detail-sold">{{ soldText }}</text>
        </view>

        <text class="cake-detail-title">{{ titleText }}</text>
        <text v-if="subtitleText" class="cake-detail-subtitle">{{ subtitleText }}</text>

        <view v-if="tagTexts.length" class="cake-detail-tags">
          <text v-for="(tag, index) in tagTexts" :key="index" class="cake-detail-tag">{{ tag }}</text>
        </view>

        <view class="cake-detail-stock-row">
          <text class="cake-detail-stock">{{ t('cake.stockLabel', { count: maxQuantity }) }}</text>
          <text v-if="soldOut" class="cake-detail-stock is-warning">{{ t('cake.stockInsufficient') }}</text>
        </view>
      </view>

      <view v-if="skuOptions.length" class="cake-detail-card">
        <text class="cake-detail-label">{{ t('cake.specLabel') }}</text>
        <view class="cake-detail-specs">
          <view
            v-for="sku in skuOptions"
            :key="sku.id"
            class="cake-detail-spec"
            :class="{ 'is-active': sku.id === selectedSkuId, 'is-disabled': skuSoldOut(sku) }"
            role="button"
            :aria-label="skuText(sku)"
            :aria-disabled="skuSoldOut(sku) ? 'true' : 'false'"
            @click="chooseSku(sku)"
          >
            <text class="cake-detail-spec-name">{{ skuText(sku) }}</text>
            <text class="cake-detail-spec-price">¥{{ skuAmount(sku) }}</text>
          </view>
        </view>

        <text class="cake-detail-label">{{ t('cake.quantityLabel') }}</text>
        <view class="cake-detail-quantity">
          <button class="cake-stepper" :disabled="quantity <= 1" :aria-label="t('cake.quantityLabel')" @click="step(-1)">
            <uni-icons type="minus" :size="18" :color="quantity <= 1 ? '#C4BFB6' : '#26241F'" />
          </button>
          <text class="cake-stepper-value">{{ quantity }}</text>
          <button class="cake-stepper" :disabled="quantity >= maxQuantity" :aria-label="t('cake.quantityLabel')" @click="step(1)">
            <uni-icons type="plus" :size="18" :color="quantity >= maxQuantity ? '#C4BFB6' : '#26241F'" />
          </button>
        </view>
      </view>

      <view class="cake-detail-card">
        <text class="cake-detail-label">{{ t('cake.productDescription') }}</text>
        <text class="cake-detail-description">{{ descriptionText || t('cake.noDescription') }}</text>
      </view>

      <view class="cake-detail-bottom-space" aria-hidden="true"></view>

      <view class="cake-detail-actions">
        <button class="cake-detail-cart" :aria-label="t('cake.cartTitle')" @click="openCart">
          <uni-icons type="cart" :size="22" color="#57534B" />
          <text v-if="cartQuantity" class="cake-detail-cart-badge">{{ cartBadgeText }}</text>
        </button>
        <button class="cake-detail-add" :disabled="soldOut || submitting" @click="addToCart">
          {{ submitting === 'cart' ? t('cake.submitting') : t('cake.addToCart') }}
        </button>
        <button class="cake-detail-buy" :disabled="soldOut" @click="buyNow">{{ t('cake.buyNow') }}</button>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onPageScroll } from '@dcloudio/uni-app'
import CakeNavBar from '@/components/cake/CakeNavBar.vue'
import CakeStateView from '@/components/cake/CakeStateView.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { addCakeCartItemApi, getCakeCartApi, getCakeProductDetailApi } from '@/api/cake.js'
import {
  CAKE_ROUTES,
  cakeCartState,
  cakeMaxQuantity,
  cakePlaceholderImage,
  createCakeScrollProgress,
  formatCakeAmount,
  goCakePage,
  pickCakeText,
  resolveCakeImageUrl
} from '@/utils/cake.js'

const locale = currentLocale
const { progress: navProgress, update: updateScroll } = createCakeScrollProgress(48)

const product = ref(null)
const state = ref('loading')
const quantity = ref(1)
const selectedSkuId = ref(0)
const submitting = ref('')
const imageFailed = ref(false)
const mode = ref('delivery')
const storeId = ref(0)
const marketing = ref('')
let productId = 0

const skuOptions = computed(() => (Array.isArray(product.value?.skus) ? product.value.skus : []))
const selectedSku = computed(() => skuOptions.value.find(sku => sku.id === selectedSkuId.value) || null)
const isNotice = computed(() => product.value?.kind === 'notice')
const titleText = computed(() => pickCakeText(product.value?.title, locale.value))
const subtitleText = computed(() => pickCakeText(product.value?.subtitle, locale.value))
const descriptionText = computed(() => pickCakeText(product.value?.description, locale.value))
const imageUrl = computed(() => resolveCakeImageUrl(product.value?.imageUrl))
const placeholder = computed(() => cakePlaceholderImage(product.value?.categoryCode))
const amount = computed(() => formatCakeAmount(selectedSku.value?.priceCents ?? product.value?.priceCents))
const originalAmount = computed(() => {
  const original = Number(product.value?.originalPriceCents || 0)
  return original > Number(product.value?.priceCents || 0) ? formatCakeAmount(original) : ''
})
const tagTexts = computed(() => (Array.isArray(product.value?.tags) ? product.value.tags : [])
  .map(tag => pickCakeText(tag, locale.value))
  .filter(Boolean))
const maxQuantity = computed(() => cakeMaxQuantity(selectedSku.value?.stock ?? product.value?.stock))
const soldOut = computed(() => maxQuantity.value <= 0)
const soldText = computed(() => {
  const sold = Number(product.value?.soldCount || 0)
  return sold > 0 ? t('cake.soldCount', { count: sold }) : ''
})
const cartQuantity = computed(() => cakeCartState.totalQuantity.value)
const cartBadgeText = computed(() => (cartQuantity.value > 99 ? '99+' : String(cartQuantity.value)))

function handlePageScroll(event) {
  updateScroll(event?.scrollTop)
}

function skuText(sku) {
  return pickCakeText(sku?.name, locale.value) || t('cake.specDefault')
}

function skuAmount(sku) {
  return formatCakeAmount(sku?.priceCents ?? product.value?.priceCents)
}

function skuSoldOut(sku) {
  return Number(sku?.stock ?? 0) <= 0
}

function chooseSku(sku) {
  if (skuSoldOut(sku)) return
  selectedSkuId.value = sku.id
  // 换规格后数量可能超过新规格的上限，及时收回。
  quantity.value = Math.min(quantity.value, Math.max(1, cakeMaxQuantity(sku.stock)))
}

function step(delta) {
  const next = quantity.value + delta
  if (next < 1 || next > maxQuantity.value) return
  quantity.value = next
}

async function loadProduct() {
  if (!productId) { state.value = 'empty'; return }
  state.value = 'loading'
  try {
    const data = await getCakeProductDetailApi(productId)
    product.value = data?.product || null
    if (!product.value) { state.value = 'empty'; return }
    const firstAvailable = skuOptions.value.find(sku => !skuSoldOut(sku))
    selectedSkuId.value = firstAvailable?.id || 0
    quantity.value = 1
    state.value = 'ready'
  } catch (_) {
    state.value = 'error'
  }
}

async function loadCart() {
  try {
    const cart = await getCakeCartApi()
    cakeCartState.apply(cart)
  } catch (_) {
    cakeCartState.reset()
  }
}

function cartQuery() {
  const query = [`mode=${mode.value}`]
  if (storeId.value) query.push(`storeId=${storeId.value}`)
  if (marketing.value) query.push(`marketing=${encodeURIComponent(marketing.value)}`)
  return query.join('&')
}

function openCart() {
  goCakePage(`${CAKE_ROUTES.cart}?${cartQuery()}`)
}

async function addToCart() {
  if (soldOut.value || submitting.value) return
  submitting.value = 'cart'
  try {
    const cart = await addCakeCartItemApi(productId, selectedSkuId.value || 0, quantity.value)
    cakeCartState.apply(cart)
    uni.showToast({ title: t('cake.addedToCart'), icon: 'none' })
  } catch (_) {
    uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  } finally {
    submitting.value = ''
  }
}

// 立即购买走 source=buyNow，不写购物车；结算页只展示这一件商品。
function buyNow() {
  if (soldOut.value) return
  const items = `${productId}-${selectedSkuId.value || 0}-${quantity.value}`
  goCakePage(`${CAKE_ROUTES.cart}?buyNow=${items}&${cartQuery()}`)
}

onLoad(options => {
  productId = Number(options?.id) || 0
  if (options?.mode === 'pickup' || options?.mode === 'delivery') mode.value = options.mode
  const id = Number(options?.storeId)
  if (Number.isFinite(id) && id > 0) storeId.value = id
  if (options?.marketing) marketing.value = String(options.marketing)
  loadProduct()
  loadCart()
})
</script>

<style scoped lang="scss">
.cake-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: #F7F5F1;
}

/* H5 下 vh 会把地址栏高度算进来，页面顶部被顶掉一截；
   与站内其它全屏页统一，按真实可视区高度布局。 */
/* #ifdef H5 */
.cake-page.app-h5-screen {
  min-height: 0;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
/* #endif */

.cake-detail-media {
  width: 100%;
  height: 640rpx;
  background: #F4F1EB;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cake-detail-media.is-notice { background: #F7E6C9; }

.cake-detail-image { width: 100%; height: 100%; }

.cake-detail-image.is-placeholder { width: 46%; height: 46%; }

.cake-detail-notice { display: flex; flex-direction: column; align-items: center; }

.cake-detail-notice-main,
.cake-detail-notice-sub { font-size: 110rpx; line-height: 1.05; font-weight: 700; color: #C79A55; }

.cake-detail-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
}

.cake-detail-price-row { display: flex; align-items: baseline; gap: 14rpx; flex-wrap: wrap; }

.cake-detail-price { display: flex; align-items: baseline; color: #C4551F; }

.cake-detail-symbol { font-size: 26rpx; font-weight: 600; }

.cake-detail-amount { font-size: 56rpx; font-weight: 700; letter-spacing: -1rpx; }

.cake-detail-original { font-size: 24rpx; color: #A9A39A; text-decoration: line-through; }

.cake-detail-sold { font-size: 22rpx; color: #A9A39A; }

.cake-detail-title {
  display: block;
  margin-top: 18rpx;
  font-size: 34rpx;
  font-weight: 650;
  line-height: 1.45;
  color: #26241F;
  overflow-wrap: anywhere;
}

.cake-detail-subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #8A857C;
  overflow-wrap: anywhere;
}

.cake-detail-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 18rpx; }

.cake-detail-tag {
  font-size: 20rpx;
  line-height: 1.6;
  color: #B4552A;
  border: 1rpx solid #E7BCA4;
  background: #FDF3EC;
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}

.cake-detail-stock-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 18rpx;
}

.cake-detail-stock { font-size: 22rpx; color: #8A857C; }

.cake-detail-stock.is-warning { color: #B4442A; }

.cake-detail-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #57534B;
  margin-bottom: 16rpx;
}

.cake-detail-specs { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 28rpx; }

.cake-detail-spec {
  min-width: 200rpx;
  padding: 16rpx 24rpx;
  border-radius: 16rpx;
  border: 2rpx solid #E4DFD6;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  transition-property: border-color, background-color, transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-detail-spec:active { transform: scale(0.97); }

.cake-detail-spec.is-active { border-color: #C4551F; background: #FDF3EC; }

.cake-detail-spec.is-disabled { opacity: 0.42; }

.cake-detail-spec-name { font-size: 26rpx; color: #26241F; overflow-wrap: anywhere; }

.cake-detail-spec-price { margin-top: 6rpx; font-size: 22rpx; color: #C4551F; }

.cake-detail-quantity { display: flex; align-items: center; gap: 8rpx; }

.cake-stepper {
  width: 68rpx;
  height: 68rpx;
  margin: 0;
  padding: 0;
  min-height: 68rpx;
  line-height: 1;
  border-radius: 50%;
  background: #F1EEE8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-stepper:active { transform: scale(0.92); }

.cake-stepper-value { min-width: 96rpx; text-align: center; font-size: 30rpx; font-weight: 600; color: #26241F; }

.cake-detail-description {
  display: block;
  font-size: 26rpx;
  line-height: 1.75;
  color: #57534B;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.cake-detail-bottom-space { height: 180rpx; }

.cake-detail-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.94);
  border-top: 1rpx solid #EDE9E2;
}

@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .cake-detail-actions {
    background: rgba(255, 255, 255, 0.82);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }
}

.cake-detail-cart {
  position: relative;
  flex: 0 0 auto;
  width: 92rpx;
  height: 92rpx;
  margin: 0;
  padding: 0;
  min-height: 92rpx;
  line-height: 1;
  border-radius: 50%;
  background: #F5F2EC;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-detail-cart-badge {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 6rpx;
  box-sizing: border-box;
  border-radius: 15rpx;
  background: #E0552B;
  color: #FFFFFF;
  font-size: 18rpx;
  line-height: 30rpx;
  text-align: center;
}

.cake-detail-add,
.cake-detail-buy {
  flex: 1;
  min-width: 0;
  margin: 0;
  min-height: 92rpx;
  line-height: 92rpx;
  border-radius: 46rpx;
  font-size: 28rpx;
  font-weight: 600;
  transition-property: transform, opacity;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-detail-add { background: #FBE7D9; color: #B4552A; }

.cake-detail-buy { background: #C4551F; color: #FFFFFF; }

.cake-detail-add:active,
.cake-detail-buy:active { transform: scale(0.98); }

.cake-detail-add[disabled],
.cake-detail-buy[disabled] { background: #DCD7CE; color: #FFFFFF; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-detail-spec,
  .cake-stepper,
  .cake-detail-add,
  .cake-detail-buy { transition-duration: 0ms; }
}
</style>
