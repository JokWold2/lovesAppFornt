<template>
  <view class="cake-page">
    <CakeNavBar
      :title="t('cake.cartTitle')"
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
      @retry="loadAll"
    />
    <CakeStateView
      v-else-if="state === 'empty'"
      state="empty"
      :title="t('cake.cartEmpty')"
      :hint="t('cake.cartEmptyHint')"
      :action-label="t('cake.goShopping')"
      @action="goShopping"
    />

    <template v-else>
      <!-- 商品清单 -->
      <view class="cake-cart-card">
        <view class="cake-cart-card-head">
          <text class="cake-cart-card-title">{{ t('cake.orderItems') }}</text>
          <button v-if="!isBuyNow && lines.length" class="cake-cart-clear" @click="clearCart">{{ t('cake.clearCart') }}</button>
        </view>

        <view v-for="line in lines" :key="line.key" class="cake-cart-line">
          <view class="cake-cart-line-media">
            <image v-if="line.imageUrl && !line.imageFailed" class="cake-cart-line-image" :src="line.imageUrl" mode="aspectFill" :alt="line.title" @error="markImageFailed(line.imageUrl)" />
            <image v-else class="cake-cart-line-image is-placeholder" :src="cakePlaceholderImage(line.categoryCode)" mode="aspectFit" />
          </view>
          <view class="cake-cart-line-body">
            <text class="cake-cart-line-title">{{ line.title }}</text>
            <text v-if="line.spec" class="cake-cart-line-spec">{{ line.spec }}</text>
            <view class="cake-cart-line-footer">
              <view class="cake-cart-line-price">
                <text class="cake-cart-line-symbol">¥</text>
                <text class="cake-cart-line-amount">{{ formatCakeAmount(line.unitPriceCents) }}</text>
              </view>
              <view class="cake-cart-line-stepper">
                <button
                  class="cake-stepper"
                  :disabled="linePendingKey === line.key"
                  :aria-label="t('cake.quantityLabel')"
                  @click="changeQuantity(line, -1)"
                >
                  <uni-icons type="minus" :size="16" color="#26241F" />
                </button>
                <text class="cake-stepper-value">{{ line.quantity }}</text>
                <button
                  class="cake-stepper"
                  :disabled="linePendingKey === line.key || line.quantity >= line.maxQuantity"
                  :aria-label="t('cake.quantityLabel')"
                  @click="changeQuantity(line, 1)"
                >
                  <uni-icons type="plus" :size="16" :color="line.quantity >= line.maxQuantity ? '#C4BFB6' : '#26241F'" />
                </button>
              </view>
            </view>
            <text v-if="line.stock <= 0" class="cake-cart-line-warning">{{ t('cake.stockInsufficient') }}</text>
            <text v-else-if="line.quantity >= line.stock" class="cake-cart-line-warning">{{ t('cake.availableStock', { count: line.stock }) }}</text>
            <text v-else-if="line.quantity >= line.maxQuantity" class="cake-cart-line-warning">{{ t('cake.maxQuantityHint', { count: line.maxQuantity }) }}</text>
          </view>
          <button v-if="!isBuyNow" class="cake-cart-line-remove" :aria-label="t('cake.removeItem')" @click="removeLine(line)">
            <uni-icons type="trash" :size="18" color="#A9A39A" />
          </button>
        </view>
      </view>

      <!-- 取货方式 -->
      <view class="cake-cart-card">
        <text class="cake-cart-label">{{ t('cake.deliveryType') }}</text>
        <view class="cake-segment">
          <view
            v-for="option in deliveryOptions"
            :key="option.key"
            class="cake-segment-item"
            :class="{ 'is-active': deliveryType === option.key }"
            role="button"
            :aria-label="option.label"
            :aria-selected="deliveryType === option.key ? 'true' : 'false'"
            @click="chooseDelivery(option.key)"
          >
            <text class="cake-segment-text">{{ option.label }}</text>
          </view>
        </view>

        <template v-if="deliveryType === 'pickup'">
          <view class="cake-cart-row" role="button" :aria-label="t('cake.selectStore')" @click="openStorePicker">
            <text class="cake-cart-row-label">{{ t('cake.pickupStore') }}</text>
            <view class="cake-cart-row-value">
              <text class="cake-cart-row-text" :class="{ 'is-placeholder': !selectedStore }">
                {{ selectedStore ? selectedStore.name : t('cake.selectStore') }}
              </text>
              <uni-icons type="right" :size="16" color="#A9A39A" />
            </view>
          </view>
          <text v-if="selectedStore?.address" class="cake-cart-hint">{{ selectedStore.address }}</text>
        </template>

        <template v-else>
          <text class="cake-cart-label">{{ t('cake.deliveryAddress') }}</text>
          <textarea
            v-model="address"
            class="cake-cart-textarea"
            :placeholder="t('cake.addressPlaceholder')"
            placeholder-class="cake-cart-placeholder"
            :maxlength="200"
            auto-height
          />
        </template>
      </view>

      <!-- 联系方式 -->
      <view class="cake-cart-card">
        <view class="cake-cart-field">
          <text class="cake-cart-label">{{ t('cake.contactName') }}</text>
          <input
            v-model="contactName"
            class="cake-cart-input"
            type="text"
            :placeholder="t('cake.contactNamePlaceholder')"
            placeholder-class="cake-cart-placeholder"
            :maxlength="60"
          />
        </view>
        <view class="cake-cart-field">
          <text class="cake-cart-label">{{ t('cake.contactPhone') }}</text>
          <input
            v-model="contactPhone"
            class="cake-cart-input"
            type="number"
            :placeholder="t('cake.contactPhonePlaceholder')"
            placeholder-class="cake-cart-placeholder"
            :maxlength="30"
          />
        </view>
        <view class="cake-cart-field">
          <text class="cake-cart-label">{{ t('cake.remarkLabel') }}</text>
          <input
            v-model="remark"
            class="cake-cart-input"
            type="text"
            :placeholder="t('cake.remarkPlaceholder')"
            placeholder-class="cake-cart-placeholder"
            :maxlength="200"
          />
        </view>
      </view>

      <!-- 金额 -->
      <view class="cake-cart-card">
        <text class="cake-cart-card-title">{{ t('cake.orderSummary') }}</text>
        <view class="cake-cart-sum-item">
          <text class="cake-cart-sum-label">{{ t('cake.itemsAmount') }}</text>
          <text class="cake-cart-sum-value">{{ formatCakePrice(totals.itemsAmountCents) }}</text>
        </view>
        <view v-if="totals.discountCents > 0" class="cake-cart-sum-item">
          <text class="cake-cart-sum-label">{{ t('cake.discountLabel') }}</text>
          <text class="cake-cart-sum-value is-discount">-{{ formatCakePrice(totals.discountCents) }}</text>
        </view>
        <view class="cake-cart-sum-item">
          <text class="cake-cart-sum-label">{{ t('cake.shippingLabel') }}</text>
          <text class="cake-cart-sum-value">{{ totals.shippingCents > 0 ? formatCakePrice(totals.shippingCents) : t('cake.freeShipping') }}</text>
        </view>
        <view v-if="deliveryType === 'delivery'" class="cake-cart-shipping-hint">
          {{ shippingHint }}
        </view>
        <view class="cake-cart-sum-item is-total">
          <text class="cake-cart-sum-label is-total">{{ t('cake.payableLabel') }}</text>
          <text class="cake-cart-sum-value is-total">{{ formatCakePrice(totals.payableCents) }}</text>
        </view>
      </view>

      <view class="cake-cart-bottom-space" aria-hidden="true"></view>

      <view class="cake-cart-submit-bar">
        <view class="cake-cart-submit-total">
          <text class="cake-cart-submit-label">{{ t('cake.payableLabel') }}</text>
          <text class="cake-cart-submit-amount">{{ formatCakePrice(totals.payableCents) }}</text>
        </view>
        <button class="cake-cart-submit" :disabled="submitting || !lines.length" @click="submit">
          {{ submitting ? t('cake.submitting') : t('cake.submitOrder') }}
        </button>
      </view>
    </template>

    <!-- 门店选择 -->
    <SlideUpPanel :open="storePickerOpen" fixed :label="t('cake.selectStore')" @dismiss="closeStorePicker">
      <view class="cake-store-picker">
        <view class="cake-store-picker-head">
          <text class="cake-store-picker-title">{{ t('cake.selectStore') }}</text>
          <button class="cake-store-picker-close" :aria-label="t('cake.close')" @click="closeStorePicker">
            <uni-icons type="closeempty" :size="20" color="#6E6961" />
          </button>
        </view>
        <scroll-view class="cake-store-picker-scroll" scroll-y>
          <view v-if="storeState === 'loading'" class="cake-store-picker-state">{{ t('cake.loading') }}</view>
          <view v-else-if="storeState === 'error'" class="cake-store-picker-state">
            <text>{{ t('cake.loadFailed') }}</text>
            <button class="cake-store-picker-retry" @click="loadStores">{{ t('cake.retry') }}</button>
          </view>
          <view v-else-if="!stores.length" class="cake-store-picker-state">{{ t('cake.storesEmpty') }}</view>
          <template v-else>
            <view
              v-for="store in stores"
              :key="store.id"
              class="cake-store-option"
              :class="{ 'is-active': store.id === storeId }"
              role="button"
              :aria-label="store.name"
              @click="chooseStore(store)"
            >
              <view class="cake-store-option-body">
                <text class="cake-store-option-name">{{ store.name }}</text>
                <text class="cake-store-option-address">{{ store.address }}</text>
                <text class="cake-store-option-hours">{{ t('cake.businessHours', { open: store.openTime, close: store.closeTime }) }}</text>
              </view>
              <uni-icons v-if="store.id === storeId" type="checkmarkempty" :size="18" color="#C4551F" />
            </view>
          </template>
        </scroll-view>
      </view>
    </SlideUpPanel>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onPageScroll, onShow } from '@dcloudio/uni-app'
import CakeNavBar from '@/components/cake/CakeNavBar.vue'
import CakeStateView from '@/components/cake/CakeStateView.vue'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import {
  clearCakeCartApi,
  createCakeOrderApi,
  getCakeCartApi,
  getCakeProductDetailApi,
  getCakeStoresApi,
  removeCakeCartItemApi,
  updateCakeCartItemApi
} from '@/api/cake.js'
import {
  CAKE_PRICING,
  CAKE_ROUTES,
  cakeCartState,
  cakeMaxQuantity,
  cakePlaceholderImage,
  createCakeScrollProgress,
  estimateCakeTotals,
  formatCakeAmount,
  formatCakePrice,
  goCakePage,
  isStoreOpen,
  isValidCakePhone,
  normalizeTimeText,
  pickCakeText,
  resolveCakeImageUrl
} from '@/utils/cake.js'

const CONTACT_STORAGE_KEY = 'lovesapp.cake.contact'

const locale = currentLocale
const { progress: navProgress, update: updateScroll } = createCakeScrollProgress(48)

const state = ref('loading')
const deliveryType = ref('delivery')
const address = ref('')
const contactName = ref('')
const contactPhone = ref('')
const remark = ref('')
const submitting = ref(false)
const linePendingKey = ref('')
const marketingCode = ref('')

// 服务端购物车行
const cartItems = ref([])
const cartTotals = ref({ itemsAmountCents: 0, discountCents: 0, shippingCents: 0, payableCents: 0 })

// 立即购买：不写购物车，单独渲染一行并在下单时走 source=buyNow
const buyNowSpec = ref(null)
const buyNowProduct = ref(null)
const buyNowQuantity = ref(0)

const storePickerOpen = ref(false)
const stores = ref([])
const storeState = ref('idle')
const storeId = ref(0)
let cartRequestId = 0

const deliveryOptions = computed(() => [
  { key: 'pickup', label: t('cake.deliveryPickup') },
  { key: 'delivery', label: t('cake.deliveryDelivery') }
])

// 图片加载失败按 URL 记录，computed 里读它才能触发重新渲染；
// 直接改 computed 返回的临时对象不会让模板更新。
const failedImages = reactive({})
function markImageFailed(url) {
  if (url) failedImages[url] = true
}

const isBuyNow = computed(() => !!buyNowProduct.value)

const lines = computed(() => {
  if (isBuyNow.value) {
    const product = buyNowProduct.value
    const spec = buyNowSpec.value
    const url = resolveCakeImageUrl(product.imageUrl)
    return [{
      key: 'buy-now',
      productId: product.id,
      skuId: spec.skuId,
      quantity: buyNowQuantity.value,
      unitPriceCents: spec.priceCents,
      promo: product.promo || 'none',
      categoryCode: product.categoryCode,
      imageUrl: url,
      imageFailed: !!failedImages[url],
      title: pickCakeText(product.title, locale.value),
      spec: spec.name,
      stock: spec.stock,
      maxQuantity: cakeMaxQuantity(spec.stock)
    }]
  }
  return cartItems.value.map(item => {
    const url = resolveCakeImageUrl(item.imageUrl)
    const stock = Math.max(0, Number(item.stock || 0))
    return {
      key: `cart-${item.id}`,
      cartItemId: item.id,
      productId: item.productId,
      skuId: item.skuId,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      promo: item.promo || 'none',
      categoryCode: item.categoryCode,
      imageUrl: url,
      imageFailed: !!failedImages[url],
      title: pickCakeText(item.title, locale.value),
      spec: pickCakeText(item.spec, locale.value),
      stock,
      maxQuantity: cakeMaxQuantity(stock)
    }
  })
})

// 购物车金额用后端返回值（含同一套促销规则）；立即购买用本地同规则预估。
const totals = computed(() => {
  if (isBuyNow.value) return estimateCakeTotals(lines.value, deliveryType.value)
  return cartTotals.value
})

const selectedStore = computed(() => stores.value.find(store => store.id === storeId.value) || null)

const shippingHint = computed(() => {
  if (totals.value.shippingCents === 0) return t('cake.freeShippingReached')
  const gap = Math.max(0, CAKE_PRICING.freeShippingThresholdCents - totals.value.itemsAmountCents)
  return t('cake.freeShippingGap', { amount: formatCakePrice(gap) })
})

function handlePageScroll(event) {
  updateScroll(event?.scrollTop)
}

function goShopping() {
  uni.redirectTo({ url: CAKE_ROUTES.transport, fail: () => uni.reLaunch({ url: CAKE_ROUTES.transport }) })
}

function chooseDelivery(key) {
  if (key === deliveryType.value) return
  deliveryType.value = key
  if (key === 'pickup') loadStores()
  if (!isBuyNow.value) loadCart()
}

function openStorePicker() {
  storePickerOpen.value = true
  if (storeState.value === 'idle') loadStores()
}

function closeStorePicker() { storePickerOpen.value = false }

function chooseStore(store) {
  storeId.value = store.id
  storePickerOpen.value = false
}

async function loadStores() {
  storeState.value = 'loading'
  try {
    const data = await getCakeStoresApi({ pageSize: 50 })
    stores.value = (Array.isArray(data?.items) ? data.items : []).map(store => ({
      id: store.id,
      name: pickCakeText(store.name, locale.value),
      address: pickCakeText(store.address, locale.value),
      openTime: normalizeTimeText(store.openTime) || '--:--',
      closeTime: normalizeTimeText(store.closeTime) || '--:--',
      isOpen: isStoreOpen(store)
    }))
    storeState.value = stores.value.length ? 'ready' : 'empty'
  } catch (_) {
    storeState.value = 'error'
  }
}

async function loadCart() {
  const requestId = ++cartRequestId
  const data = await getCakeCartApi({ deliveryType: deliveryType.value }).catch(() => null)
  // 丢弃过期响应，避免快速切换取货方式时旧结果覆盖新结果。
  if (requestId !== cartRequestId) return
  if (!data) {
    if (!isBuyNow.value) state.value = 'error'
    return
  }
  cartItems.value = Array.isArray(data.items) ? data.items : []
  cartTotals.value = {
    itemsAmountCents: Number(data.itemsAmountCents || 0),
    discountCents: Number(data.discountCents || 0),
    shippingCents: Number(data.shippingCents || 0),
    payableCents: Number(data.payableCents || 0)
  }
  cakeCartState.apply(data)
  state.value = cartItems.value.length || isBuyNow.value ? 'ready' : 'empty'
}

async function loadBuyNow() {
  const spec = buyNowSpec.value
  if (!spec) return
  try {
    const data = await getCakeProductDetailApi(spec.productId)
    const product = data?.product
    if (!product) { buyNowProduct.value = null; return }
    const sku = (Array.isArray(product.skus) ? product.skus : []).find(item => item.id === spec.skuId) || null
    buyNowProduct.value = product
    buyNowQuantity.value = Math.max(1, spec.quantity)
    buyNowSpec.value = {
      skuId: spec.skuId,
      name: sku ? (pickCakeText(sku.name, locale.value) || t('cake.specDefault')) : '',
      priceCents: Number(sku?.priceCents ?? product.priceCents ?? 0),
      // 库存上限取规格库存，没有规格时用商品库存；0 表示不可售。
      stock: Math.max(0, Number(sku?.stock ?? product.stock ?? 0))
    }
  } catch (_) {
    buyNowProduct.value = null
    state.value = 'error'
  }
}

async function changeQuantity(line, delta) {
  if (isBuyNow.value) {
    const next = buyNowQuantity.value + delta
    if (next < 1 || next > buyNowSpec.value.stock) return
    buyNowQuantity.value = next
    return
  }
  if (linePendingKey.value) return
  const next = line.quantity + delta
  if (next < 1) return
  if (next > line.maxQuantity) {
    uni.showToast({ title: t('cake.maxQuantityHint', { count: line.maxQuantity }), icon: 'none' })
    return
  }
  linePendingKey.value = line.key
  try {
    await updateCakeCartItemApi(line.cartItemId, next)
    await loadCart()
  } catch (_) {
    uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  } finally {
    linePendingKey.value = ''
  }
}

function confirmModal(options) {
  return new Promise(resolve => uni.showModal({
    confirmText: t('cake.confirm'),
    cancelText: t('cake.cancel'),
    ...options,
    success: result => resolve(!!result.confirm),
    fail: () => resolve(false)
  }))
}

async function removeLine(line) {
  if (linePendingKey.value) return
  const confirmed = await confirmModal({ title: t('cake.removeItem'), content: t('cake.removeItemConfirm', { name: line.title }) })
  if (!confirmed) return
  linePendingKey.value = line.key
  try {
    await removeCakeCartItemApi(line.cartItemId)
    await loadCart()
  } catch (_) {
    uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  } finally {
    linePendingKey.value = ''
  }
}

async function clearCart() {
  const confirmed = await confirmModal({ title: t('cake.clearCart'), content: t('cake.clearCartConfirm') })
  if (!confirmed) return
  try {
    await clearCakeCartApi()
    await loadCart()
  } catch (_) {
    uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  }
}

// 提交前的本地校验：把问题定位到具体字段，而不是笼统地提示失败。
function validate() {
  if (!lines.value.length) return t('cake.cartEmptyOnSubmit')
  const unavailable = lines.value.find(line => line.stock <= 0 || line.quantity > line.stock)
  if (unavailable) return t('cake.cartUnavailable')
  if (deliveryType.value === 'pickup' && !storeId.value) return t('cake.storeRequired')
  if (deliveryType.value === 'delivery' && !address.value.trim()) return t('cake.addressRequired')
  if (!contactName.value.trim()) return t('cake.contactNameRequired')
  if (!isValidCakePhone(contactPhone.value)) return t('cake.contactPhoneRequired')
  return ''
}

async function submit() {
  if (submitting.value) return
  const problem = validate()
  if (problem) {
    uni.showToast({ title: problem, icon: 'none' })
    return
  }

  submitting.value = true
  const payload = {
    deliveryType: deliveryType.value,
    contactName: contactName.value.trim(),
    contactPhone: contactPhone.value.trim(),
    remark: remark.value.trim() || undefined,
    source: isBuyNow.value ? 'buyNow' : 'cart'
  }
  if (marketingCode.value) payload.marketingCode = marketingCode.value
  if (deliveryType.value === 'pickup') payload.storeId = storeId.value
  if (deliveryType.value === 'delivery') payload.address = address.value.trim()
  if (isBuyNow.value) {
    payload.items = [{ productId: buyNowProduct.value.id, skuId: buyNowSpec.value.skuId, quantity: buyNowQuantity.value }]
  }

  try {
    const data = await createCakeOrderApi(payload)
    const orderId = data?.order?.id
    try {
      uni.setStorageSync(CONTACT_STORAGE_KEY, {
        name: payload.contactName,
        phone: payload.contactPhone,
        address: deliveryType.value === 'delivery' ? payload.address : ''
      })
    } catch (_) { /* 本地缓存失败不影响下单结果 */ }
    if (!isBuyNow.value) {
      cakeCartState.reset()
      cartItems.value = []
    }
    uni.showToast({ title: t('cake.orderSubmitted'), icon: 'none' })
    // 用 redirectTo 替换结算页，返回时不会回到已提交的购物车。
    const target = orderId ? `${CAKE_ROUTES.orderDetail}?id=${orderId}` : CAKE_ROUTES.orders
    uni.redirectTo({ url: target, fail: () => uni.reLaunch({ url: target }) })
  } catch (error) {
    // 后端业务提示只有中文；这里按错误码映射到当前语言的文案，避免出现未翻译的中文。
    const message = Number(error?.code) === 409 ? t('cake.stockInsufficient') : t('cake.actionFailed')
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function restoreContact() {
  try {
    const saved = uni.getStorageSync(CONTACT_STORAGE_KEY)
    if (!saved || typeof saved !== 'object') return
    if (saved.name) contactName.value = String(saved.name)
    if (saved.phone) contactPhone.value = String(saved.phone)
    if (saved.address) address.value = String(saved.address)
  } catch (_) { /* 忽略本地缓存异常 */ }
}

async function loadAll() {
  state.value = 'loading'
  if (isBuyNow.value) await loadBuyNow()
  if (state.value !== 'error') await loadCart()
  if (deliveryType.value === 'pickup') loadStores()
}

onLoad(async options => {
  const id = Number(options?.storeId)
  if (Number.isFinite(id) && id > 0) storeId.value = id
  if (options?.mode === 'pickup' || options?.mode === 'delivery') deliveryType.value = options.mode
  if (options?.marketing) marketingCode.value = String(options.marketing)

  // buyNow 形如 12-5-2（商品 id - 规格 id - 数量）
  const raw = String(options?.buyNow || '')
  const parts = raw.split('-').map(value => Number(value))
  if (parts.length === 3 && parts.every(value => Number.isFinite(value) && value >= 0) && parts[0] > 0 && parts[2] > 0) {
    buyNowSpec.value = { productId: parts[0], skuId: parts[1] || 0, quantity: parts[2], name: '', priceCents: 0, stock: 1 }
  }

  restoreContact()
  await loadAll()
})

onShow(() => {
  // 从门店选择等页面返回时刷新，首次进入由 onLoad 负责。
  if (state.value === 'ready') loadCart()
})
</script>

<style scoped lang="scss">
.cake-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: #F7F5F1;
  padding-bottom: 200rpx;
}

.cake-cart-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
}

.cake-cart-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.cake-cart-card-title { font-size: 30rpx; font-weight: 650; color: #26241F; }

.cake-cart-clear {
  margin: 0;
  padding: 0 8rpx;
  min-height: 48rpx;
  line-height: 48rpx;
  background: transparent;
  color: #8A857C;
  font-size: 24rpx;
}

.cake-cart-line {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
  border-top: 1rpx solid #F2EFE9;
}

.cake-cart-line:first-of-type { border-top: 0; padding-top: 0; }

.cake-cart-line-media {
  flex: 0 0 auto;
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  background: #F4F1EB;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-cart-line-image { width: 100%; height: 100%; }

.cake-cart-line-image.is-placeholder { width: 62%; height: 62%; }

.cake-cart-line-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.cake-cart-line-title {
  font-size: 27rpx;
  font-weight: 600;
  line-height: 1.4;
  color: #26241F;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.cake-cart-line-spec {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8A857C;
  overflow-wrap: anywhere;
}

.cake-cart-line-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: auto;
  padding-top: 16rpx;
}

.cake-cart-line-price { display: flex; align-items: baseline; color: #C4551F; }

.cake-cart-line-symbol { font-size: 20rpx; font-weight: 600; }

.cake-cart-line-amount { font-size: 32rpx; font-weight: 700; }

.cake-cart-line-stepper { display: flex; align-items: center; gap: 6rpx; }

.cake-stepper {
  width: 56rpx;
  height: 56rpx;
  margin: 0;
  padding: 0;
  min-height: 56rpx;
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

.cake-stepper:active { transform: scale(0.9); }

.cake-stepper-value { min-width: 60rpx; text-align: center; font-size: 28rpx; font-weight: 600; color: #26241F; }

.cake-cart-line-warning { margin-top: 8rpx; font-size: 20rpx; color: #B4442A; }

.cake-cart-line-remove {
  flex: 0 0 auto;
  align-self: flex-start;
  width: 56rpx;
  height: 56rpx;
  margin: 0;
  padding: 0;
  min-height: 56rpx;
  line-height: 1;
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-cart-label {
  display: block;
  font-size: 24rpx;
  color: #8A857C;
  margin-bottom: 14rpx;
}

.cake-segment {
  display: flex;
  gap: 12rpx;
  padding: 6rpx;
  border-radius: 20rpx;
  background: #F5F2EC;
  margin-bottom: 24rpx;
}

.cake-segment-item {
  flex: 1;
  min-width: 0;
  padding: 18rpx 12rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition-property: background-color, transform;
  transition-duration: 120ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-segment-item:active { transform: scale(0.98); }

.cake-segment-item.is-active { background: #FFFFFF; }

.cake-segment-text { font-size: 26rpx; color: #6E6961; text-align: center; overflow-wrap: anywhere; }

.cake-segment-item.is-active .cake-segment-text { color: #26241F; font-weight: 600; }

.cake-cart-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 0;
  border-top: 1rpx solid #F2EFE9;
}

.cake-cart-row-label { font-size: 26rpx; color: #57534B; }

.cake-cart-row-value { display: flex; align-items: center; gap: 6rpx; min-width: 0; }

.cake-cart-row-text {
  font-size: 26rpx;
  color: #26241F;
  max-width: 380rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cake-cart-row-text.is-placeholder { color: #A9A39A; }

.cake-cart-hint { display: block; font-size: 22rpx; color: #A9A39A; line-height: 1.6; overflow-wrap: anywhere; }

.cake-cart-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 120rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #F7F5F1;
  font-size: 26rpx;
  color: #26241F;
  line-height: 1.6;
}

.cake-cart-placeholder { color: #A9A39A; }

.cake-cart-field { margin-bottom: 24rpx; }

.cake-cart-field:last-child { margin-bottom: 0; }

.cake-cart-input {
  width: 100%;
  box-sizing: border-box;
  height: 84rpx;
  padding: 0 20rpx;
  border-radius: 16rpx;
  background: #F7F5F1;
  font-size: 26rpx;
  color: #26241F;
}

.cake-cart-sum-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
}

.cake-cart-sum-item.is-total { border-top: 1rpx solid #F2EFE9; margin-top: 8rpx; padding-top: 22rpx; }

.cake-cart-sum-label { font-size: 26rpx; color: #6E6961; }

.cake-cart-sum-label.is-total { font-size: 28rpx; font-weight: 600; color: #26241F; }

.cake-cart-sum-value { font-size: 26rpx; color: #26241F; }

.cake-cart-sum-value.is-discount { color: #B4552A; }

.cake-cart-sum-value.is-total { font-size: 36rpx; font-weight: 700; color: #C4551F; }

.cake-cart-shipping-hint { font-size: 20rpx; color: #A9A39A; padding-bottom: 8rpx; }

.cake-cart-bottom-space { height: 40rpx; }

.cake-cart-submit-bar {
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
  .cake-cart-submit-bar {
    background: rgba(255, 255, 255, 0.82);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }
}

.cake-cart-submit-total { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.cake-cart-submit-label { font-size: 20rpx; color: #8A857C; }

.cake-cart-submit-amount { font-size: 38rpx; font-weight: 700; color: #C4551F; line-height: 1.2; }

.cake-cart-submit {
  flex: 0 0 auto;
  margin: 0;
  min-height: 92rpx;
  line-height: 92rpx;
  padding: 0 56rpx;
  border-radius: 46rpx;
  background: #C4551F;
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  transition-property: transform, opacity;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-cart-submit:active { transform: scale(0.98); }

.cake-cart-submit[disabled] { background: #DCD7CE; color: #FFFFFF; }

/* 门店选择面板 */
.cake-store-picker { display: flex; flex-direction: column; max-height: 72vh; background: #F7F5F1; }

.cake-store-picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 30rpx 20rpx;
}

.cake-store-picker-title { font-size: 32rpx; font-weight: 650; color: #26241F; }

.cake-store-picker-close {
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

.cake-store-picker-scroll { flex: 1; min-height: 0; padding: 0 30rpx; box-sizing: border-box; }

.cake-store-picker-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  padding: 60rpx 0;
  font-size: 26rpx;
  color: #8A857C;
}

.cake-store-picker-retry {
  margin: 0;
  min-height: 72rpx;
  line-height: 72rpx;
  padding: 0 40rpx;
  border-radius: 36rpx;
  background: #26241F;
  color: #FFFFFF;
  font-size: 26rpx;
}

.cake-store-option {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: #FFFFFF;
  border-radius: 18rpx;
  margin-bottom: 16rpx;
  transition-property: background-color, transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-store-option:active { transform: scale(0.99); }

.cake-store-option.is-active { background: #FDF3EC; }

.cake-store-option-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }

.cake-store-option-name { font-size: 28rpx; font-weight: 600; color: #26241F; overflow-wrap: anywhere; }

.cake-store-option-address { font-size: 22rpx; color: #6E6961; line-height: 1.5; overflow-wrap: anywhere; }

.cake-store-option-hours { font-size: 20rpx; color: #A9A39A; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-stepper,
  .cake-segment-item,
  .cake-cart-submit,
  .cake-store-option { transition-duration: 0ms; }
}
</style>
