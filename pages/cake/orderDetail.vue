<template>
  <view class="cake-page">
    <CakeNavBar
      :title="t('cake.orderDetailTitle')"
      :progress="navProgress"
      :spacer="true"
      show-back
      show-home
    />

    <CakeStateView v-if="state === 'loading'" state="loading" :title="t('cake.loading')" />
    <CakeStateView
      v-else-if="state === 'error'"
      state="error"
      :title="t('cake.loadFailed')"
      :hint="t('cake.actionFailed')"
      @retry="loadOrder"
    />
    <CakeStateView v-else-if="state === 'empty'" state="empty" :title="t('cake.storeNotFound')" />

    <template v-else-if="order">
      <view class="cake-detail-status" :class="statusClass">
        <text class="cake-detail-status-text">{{ t(orderStatusKey(order.status)) }}</text>
        <text v-if="order.status === 'created'" class="cake-detail-status-hint">{{ t('cake.payNow') }}</text>
        <text v-else-if="order.status === 'cancelled' && order.cancelReason" class="cake-detail-status-hint">{{ order.cancelReason }}</text>
      </view>

      <view v-if="order.pickupCode && order.deliveryType === 'pickup'" class="cake-detail-code">
        <text class="cake-detail-code-label">{{ t('cake.pickupCodeLabel') }}</text>
        <text class="cake-detail-code-value">{{ order.pickupCode }}</text>
        <text class="cake-detail-code-hint">{{ t('cake.pickupCodeHint') }}</text>
      </view>

      <view class="cake-detail-card">
        <text class="cake-detail-label">{{ order.deliveryType === 'pickup' ? t('cake.storeInfoLabel') : t('cake.deliveryInfo') }}</text>
        <view class="cake-detail-rows">
          <view class="cake-detail-row">
            <text class="cake-detail-row-label">{{ t('cake.deliveryType') }}</text>
            <text class="cake-detail-row-value">{{ order.deliveryType === 'pickup' ? t('cake.deliveryPickup') : t('cake.deliveryDelivery') }}</text>
          </view>
          <view v-if="order.deliveryType === 'pickup'" class="cake-detail-row">
            <text class="cake-detail-row-label">{{ t('cake.pickupStore') }}</text>
            <text class="cake-detail-row-value">{{ storeName || t('cake.pickupStoreFallback') }}</text>
          </view>
          <view v-if="order.address" class="cake-detail-row">
            <text class="cake-detail-row-label">{{ t('cake.deliveryAddress') }}</text>
            <text class="cake-detail-row-value">{{ order.address }}</text>
          </view>
          <view class="cake-detail-row">
            <text class="cake-detail-row-label">{{ t('cake.contactName') }}</text>
            <text class="cake-detail-row-value">{{ order.contactName }}</text>
          </view>
          <view class="cake-detail-row">
            <text class="cake-detail-row-label">{{ t('cake.contactPhone') }}</text>
            <text class="cake-detail-row-value">{{ order.contactPhone }}</text>
          </view>
          <view v-if="order.remark" class="cake-detail-row">
            <text class="cake-detail-row-label">{{ t('cake.remarkLabel') }}</text>
            <text class="cake-detail-row-value">{{ order.remark }}</text>
          </view>
        </view>
      </view>

      <view class="cake-detail-card">
        <text class="cake-detail-label">{{ t('cake.orderItems') }}</text>
        <view v-for="(item, index) in items" :key="index" class="cake-detail-item">
          <view class="cake-detail-item-media">
            <image v-if="item.imageUrl && !failedImages[item.imageUrl]" class="cake-detail-item-image" :src="item.imageUrl" mode="aspectFill" :alt="item.title" @error="markFailed(item.imageUrl)" />
            <image v-else class="cake-detail-item-image is-placeholder" :src="placeholderImage" mode="aspectFit" />
          </view>
          <view class="cake-detail-item-body">
            <text class="cake-detail-item-title">{{ item.title }}</text>
            <text v-if="item.spec" class="cake-detail-item-spec">{{ item.spec }}</text>
          </view>
          <view class="cake-detail-item-price">
            <text class="cake-detail-item-amount">¥{{ formatCakeAmount(item.unitPriceCents) }}</text>
            <text class="cake-detail-item-quantity">×{{ item.quantity }}</text>
          </view>
        </view>
      </view>

      <view class="cake-detail-card">
        <text class="cake-detail-label">{{ t('cake.orderSummary') }}</text>
        <view class="cake-detail-row">
          <text class="cake-detail-row-label">{{ t('cake.itemsAmount') }}</text>
          <text class="cake-detail-row-value">{{ formatCakePrice(order.itemsAmountCents) }}</text>
        </view>
        <view v-if="order.discountCents > 0" class="cake-detail-row">
          <text class="cake-detail-row-label">{{ t('cake.discountLabel') }}</text>
          <text class="cake-detail-row-value is-discount">-{{ formatCakePrice(order.discountCents) }}</text>
        </view>
        <view class="cake-detail-row">
          <text class="cake-detail-row-label">{{ t('cake.shippingLabel') }}</text>
          <text class="cake-detail-row-value">{{ order.shippingCents > 0 ? formatCakePrice(order.shippingCents) : t('cake.freeShipping') }}</text>
        </view>
        <view class="cake-detail-row is-total">
          <text class="cake-detail-row-label is-total">{{ t('cake.payableLabel') }}</text>
          <text class="cake-detail-row-value is-total">{{ formatCakePrice(order.payableCents) }}</text>
        </view>
      </view>

      <view class="cake-detail-card">
        <view class="cake-detail-row">
          <text class="cake-detail-row-label">{{ t('cake.orderNo') }}</text>
          <text class="cake-detail-row-value">{{ order.orderNo }}</text>
        </view>
        <view class="cake-detail-row">
          <text class="cake-detail-row-label">{{ t('cake.orderCreatedAt') }}</text>
          <text class="cake-detail-row-value">{{ order.createdAt }}</text>
        </view>
        <view class="cake-detail-row">
          <text class="cake-detail-row-label">{{ t('cake.quantityLabel') }}</text>
          <text class="cake-detail-row-value">{{ t('cake.orderTotalQuantity', { count: order.totalQuantity || 0 }) }}</text>
        </view>
      </view>

      <view class="cake-detail-bottom-space" aria-hidden="true"></view>

      <view v-if="hasAction" class="cake-detail-actions">
        <button v-if="canCancelOrder(order)" class="cake-detail-ghost" :disabled="!!pending" @click="cancelOrder">{{ t('cake.cancelOrder') }}</button>
        <button v-if="canPayOrder(order)" class="cake-detail-primary" :disabled="!!pending" @click="payOrder">{{ pending === 'pay' ? t('cake.paying') : t('cake.payNow') }}</button>
        <button v-else-if="canConfirmOrder(order)" class="cake-detail-primary" :disabled="!!pending" @click="confirmOrder">{{ t('cake.confirmReceipt') }}</button>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onPageScroll } from '@dcloudio/uni-app'
import CakeNavBar from '@/components/cake/CakeNavBar.vue'
import CakeStateView from '@/components/cake/CakeStateView.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { cancelCakeOrderApi, confirmCakeOrderApi, getCakeOrderDetailApi, payCakeOrderApi } from '@/api/cake.js'
import {
  cakePlaceholderImage,
  canCancelOrder,
  canConfirmOrder,
  canPayOrder,
  createCakeRequestId,
  createCakeScrollProgress,
  formatCakeAmount,
  formatCakePrice,
  orderStatusKey,
  pickCakeText,
  resolveCakeImageUrl
} from '@/utils/cake.js'

const locale = currentLocale
const { progress: navProgress, update: updateScroll } = createCakeScrollProgress(48)

const order = ref(null)
const state = ref('loading')
const pending = ref('')
const failedImages = reactive({})
let orderId = 0
let payRequestId = ''

const items = computed(() => (Array.isArray(order.value?.items) ? order.value.items : []).map(item => ({
  title: pickCakeText(item.title, locale.value),
  spec: pickCakeText(item.spec, locale.value),
  unitPriceCents: Number(item.unitPriceCents || 0),
  quantity: Number(item.quantity || 0),
  imageUrl: resolveCakeImageUrl(item.imageUrl)
})))

const storeName = computed(() => pickCakeText(order.value?.storeName, locale.value))
const placeholderImage = computed(() => cakePlaceholderImage(''))
const hasAction = computed(() => !!order.value && (canPayOrder(order.value) || canCancelOrder(order.value) || canConfirmOrder(order.value)))

const statusClass = computed(() => ({
  'is-pending': order.value?.status === 'created',
  'is-active': ['paid', 'preparing', 'shipped'].includes(order.value?.status),
  'is-done': order.value?.status === 'completed',
  'is-cancelled': order.value?.status === 'cancelled'
}))

function markFailed(url) {
  if (url) failedImages[url] = true
}

function handlePageScroll(event) {
  updateScroll(event?.scrollTop)
}

async function loadOrder() {
  if (!orderId) { state.value = 'empty'; return }
  state.value = 'loading'
  try {
    const data = await getCakeOrderDetailApi(orderId)
    order.value = data?.order || null
    state.value = order.value ? 'ready' : 'empty'
  } catch (_) {
    state.value = 'error'
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

async function payOrder() {
  if (pending.value || !order.value) return
  const confirmed = await confirmModal({
    title: t('cake.payConfirmTitle'),
    content: t('cake.payConfirmContent', { amount: (Number(order.value.payableCents || 0) / 100).toFixed(2) })
  })
  if (!confirmed) return

  pending.value = 'pay'
  if (!payRequestId) payRequestId = createCakeRequestId()
  try {
    const data = await payCakeOrderApi(orderId, payRequestId)
    payRequestId = ''
    order.value = data?.order || order.value
    uni.showToast({ title: t('cake.orderPaid'), icon: 'none' })
  } catch (error) {
    const message = Number(error?.code) === 409 ? t('cake.stockInsufficient') : t('cake.actionFailed')
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    pending.value = ''
  }
}

async function cancelOrder() {
  if (pending.value || !order.value) return
  const confirmed = await confirmModal({ title: t('cake.cancelOrder'), content: t('cake.cancelOrderConfirm') })
  if (!confirmed) return

  pending.value = 'cancel'
  try {
    const data = await cancelCakeOrderApi(orderId)
    order.value = data?.order || order.value
    uni.showToast({ title: t('cake.orderCancelled'), icon: 'none' })
  } catch (_) {
    uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  } finally {
    pending.value = ''
  }
}

async function confirmOrder() {
  if (pending.value || !order.value) return
  const confirmed = await confirmModal({
    title: t('cake.confirmReceipt'),
    content: t('cake.orderTotalQuantity', { count: order.value.totalQuantity || 0 })
  })
  if (!confirmed) return

  pending.value = 'confirm'
  try {
    const data = await confirmCakeOrderApi(orderId)
    order.value = data?.order || order.value
    uni.showToast({ title: t('cake.orderCompletedToast'), icon: 'none' })
  } catch (_) {
    uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  } finally {
    pending.value = ''
  }
}

onLoad(options => {
  orderId = Number(options?.id) || 0
  loadOrder()
})
</script>

<style scoped lang="scss">
.cake-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: #F7F5F1;
}

.cake-detail-status {
  margin: 20rpx 24rpx 0;
  padding: 36rpx 28rpx;
  border-radius: 24rpx;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.cake-detail-status-text { font-size: 40rpx; font-weight: 700; color: #26241F; }

.cake-detail-status-hint { font-size: 24rpx; color: #8A857C; overflow-wrap: anywhere; }

.cake-detail-status.is-pending .cake-detail-status-text { color: #B4552A; }

.cake-detail-status.is-active .cake-detail-status-text { color: #A96A18; }

.cake-detail-status.is-done .cake-detail-status-text { color: #3E7A3E; }

.cake-detail-status.is-cancelled .cake-detail-status-text { color: #8A857C; }

.cake-detail-code {
  margin: 20rpx 24rpx 0;
  padding: 36rpx 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(120deg, #FDF6E7 0%, #FBEAD2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.cake-detail-code-label { font-size: 24rpx; color: #A98C63; }

.cake-detail-code-value {
  font-size: 72rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  color: #7A5334;
  line-height: 1.1;
}

.cake-detail-code-hint { font-size: 22rpx; color: #A98C63; text-align: center; }

.cake-detail-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
}

.cake-detail-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #57534B;
  margin-bottom: 18rpx;
}

.cake-detail-rows { display: flex; flex-direction: column; }

.cake-detail-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  padding: 14rpx 0;
}

.cake-detail-row.is-total { border-top: 1rpx solid #F2EFE9; margin-top: 8rpx; padding-top: 22rpx; }

.cake-detail-row-label { flex: 0 0 auto; font-size: 25rpx; color: #8A857C; }

.cake-detail-row-label.is-total { font-size: 28rpx; font-weight: 600; color: #26241F; }

.cake-detail-row-value {
  flex: 1;
  min-width: 0;
  font-size: 25rpx;
  color: #26241F;
  text-align: right;
  overflow-wrap: anywhere;
}

.cake-detail-row-value.is-discount { color: #B4552A; }

.cake-detail-row-value.is-total { font-size: 36rpx; font-weight: 700; color: #C4551F; }

.cake-detail-item { display: flex; gap: 18rpx; padding: 16rpx 0; }

.cake-detail-item + .cake-detail-item { border-top: 1rpx solid #F2EFE9; }

.cake-detail-item-media {
  flex: 0 0 auto;
  width: 132rpx;
  height: 132rpx;
  border-radius: 14rpx;
  background: #F4F1EB;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-detail-item-image { width: 100%; height: 100%; }

.cake-detail-item-image.is-placeholder { width: 62%; height: 62%; }

.cake-detail-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }

.cake-detail-item-title { font-size: 26rpx; line-height: 1.4; color: #26241F; overflow-wrap: anywhere; }

.cake-detail-item-spec { font-size: 22rpx; color: #8A857C; overflow-wrap: anywhere; }

.cake-detail-item-price { flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 4rpx; }

.cake-detail-item-amount { font-size: 26rpx; color: #26241F; }

.cake-detail-item-quantity { font-size: 22rpx; color: #A9A39A; }

.cake-detail-bottom-space { height: 180rpx; }

.cake-detail-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: flex-end;
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

.cake-detail-ghost,
.cake-detail-primary {
  margin: 0;
  min-height: 88rpx;
  line-height: 88rpx;
  padding: 0 44rpx;
  border-radius: 44rpx;
  font-size: 28rpx;
  transition-property: transform, opacity;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-detail-ghost { background: #F5F2EC; color: #57534B; }

.cake-detail-primary { background: #C4551F; color: #FFFFFF; font-weight: 600; }

.cake-detail-ghost:active,
.cake-detail-primary:active { transform: scale(0.97); }

.cake-detail-ghost[disabled],
.cake-detail-primary[disabled] { opacity: 0.5; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-detail-ghost,
  .cake-detail-primary { transition-duration: 0ms; }
}
</style>
