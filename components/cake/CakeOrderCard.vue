<template>
  <view class="cake-order" role="button" :aria-label="order.orderNo" @click="emit('open', order)">
    <view class="cake-order-head">
      <text class="cake-order-no">{{ t('cake.orderNo') }} {{ order.orderNo }}</text>
      <text class="cake-order-status" :class="statusClass">{{ t(orderStatusKey(order.status)) }}</text>
    </view>

    <view class="cake-order-meta">
      <text class="cake-order-meta-text">{{ fulfilmentText }}</text>
      <text v-if="order.createdAt" class="cake-order-meta-time">{{ order.createdAt }}</text>
    </view>

    <view class="cake-order-items">
      <view v-for="(item, index) in visibleItems" :key="index" class="cake-order-item">
        <view class="cake-order-item-media">
          <image v-if="item.imageUrl && !failedImages[item.imageUrl]" class="cake-order-item-image" :src="item.imageUrl" mode="aspectFill" :alt="item.title" @error="markFailed(item.imageUrl)" />
          <image v-else class="cake-order-item-image is-placeholder" :src="placeholderImage" mode="aspectFit" />
        </view>
        <view class="cake-order-item-body">
          <text class="cake-order-item-title">{{ item.title }}</text>
          <text v-if="item.spec" class="cake-order-item-spec">{{ item.spec }}</text>
        </view>
        <view class="cake-order-item-price">
          <text class="cake-order-item-amount">¥{{ formatCakeAmount(item.unitPriceCents) }}</text>
          <text class="cake-order-item-quantity">×{{ item.quantity }}</text>
        </view>
      </view>
      <text v-if="hiddenCount > 0" class="cake-order-more">{{ t('cake.orderTotalQuantity', { count: order.totalQuantity }) }}</text>
    </view>

    <view class="cake-order-footer">
      <view class="cake-order-total">
        <text class="cake-order-total-label">{{ t('cake.payableLabel') }}</text>
        <text class="cake-order-total-amount">{{ formatCakePrice(order.payableCents) }}</text>
      </view>
      <view class="cake-order-actions">
        <button v-if="canCancelOrder(order)" class="cake-order-ghost" :disabled="pending" @click.stop="emit('cancel', order)">{{ t('cake.cancelOrder') }}</button>
        <button v-if="canPayOrder(order)" class="cake-order-primary" :disabled="pending" @click.stop="emit('pay', order)">{{ pending ? t('cake.paying') : t('cake.payNow') }}</button>
        <button v-else-if="canConfirmOrder(order)" class="cake-order-primary" :disabled="pending" @click.stop="emit('confirm', order)">{{ t('cake.confirmReceipt') }}</button>
        <button v-else class="cake-order-ghost" @click.stop="emit('open', order)">{{ t('cake.viewDetail') }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { t } from '@/utils/localeRuntime.js'
import {
  cakePlaceholderImage,
  canCancelOrder,
  canConfirmOrder,
  canPayOrder,
  formatCakeAmount,
  formatCakePrice,
  orderStatusKey,
  pickCakeText,
  resolveCakeImageUrl
} from '@/utils/cake.js'

const props = defineProps({
  order: { type: Object, required: true },
  locale: { type: String, default: 'zh-Hans' },
  pending: { type: Boolean, default: false }
})

const emit = defineEmits(['open', 'pay', 'cancel', 'confirm'])

const failedImages = reactive({})
const MAX_VISIBLE = 2

const items = computed(() => (Array.isArray(props.order?.items) ? props.order.items : []).map(item => ({
  title: pickCakeText(item.title, props.locale),
  spec: pickCakeText(item.spec, props.locale),
  unitPriceCents: Number(item.unitPriceCents || 0),
  quantity: Number(item.quantity || 0),
  imageUrl: resolveCakeImageUrl(item.imageUrl)
})))

const visibleItems = computed(() => items.value.slice(0, MAX_VISIBLE))
const hiddenCount = computed(() => Math.max(0, items.value.length - MAX_VISIBLE))
const placeholderImage = computed(() => cakePlaceholderImage(''))

const statusClass = computed(() => ({
  'is-pending': props.order?.status === 'created',
  'is-active': ['paid', 'preparing', 'shipped'].includes(props.order?.status),
  'is-done': props.order?.status === 'completed',
  'is-cancelled': props.order?.status === 'cancelled'
}))

const fulfilmentText = computed(() => {
  const storeName = pickCakeText(props.order?.storeName, props.locale)
  const type = props.order?.deliveryType === 'pickup' ? t('cake.deliveryPickup') : t('cake.deliveryDelivery')
  return storeName ? `${type} · ${storeName}` : type
})

function markFailed(url) {
  if (url) failedImages[url] = true
}
</script>

<style scoped lang="scss">
.cake-order {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 26rpx;
  display: flex;
  flex-direction: column;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-order:active { transform: scale(0.995); }

.cake-order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.cake-order-no {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  color: #8A857C;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cake-order-status {
  flex: 0 0 auto;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.cake-order-status.is-pending { background: #FDF3EC; color: #B4552A; }

.cake-order-status.is-active { background: #FCF1E2; color: #A96A18; }

.cake-order-status.is-done { background: #EAF4EA; color: #3E7A3E; }

.cake-order-status.is-cancelled { background: #F2F0EC; color: #8A857C; }

.cake-order-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 12rpx;
}

.cake-order-meta-text { font-size: 24rpx; color: #57534B; }

.cake-order-meta-time { font-size: 20rpx; color: #A9A39A; }

.cake-order-items {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F2EFE9;
}

.cake-order-item { display: flex; gap: 18rpx; }

.cake-order-item-media {
  flex: 0 0 auto;
  width: 120rpx;
  height: 120rpx;
  border-radius: 14rpx;
  background: #F4F1EB;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-order-item-image { width: 100%; height: 100%; }

.cake-order-item-image.is-placeholder { width: 62%; height: 62%; }

.cake-order-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }

.cake-order-item-title {
  font-size: 26rpx;
  line-height: 1.4;
  color: #26241F;
  overflow-wrap: anywhere;
}

.cake-order-item-spec { font-size: 22rpx; color: #8A857C; overflow-wrap: anywhere; }

.cake-order-item-price {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.cake-order-item-amount { font-size: 26rpx; color: #26241F; }

.cake-order-item-quantity { font-size: 22rpx; color: #A9A39A; }

.cake-order-more { font-size: 22rpx; color: #A9A39A; }

.cake-order-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 22rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F2EFE9;
}

.cake-order-total { display: flex; align-items: baseline; gap: 8rpx; min-width: 0; }

.cake-order-total-label { font-size: 22rpx; color: #8A857C; }

.cake-order-total-amount { font-size: 34rpx; font-weight: 700; color: #C4551F; }

.cake-order-actions { display: flex; align-items: center; gap: 14rpx; }

.cake-order-ghost,
.cake-order-primary {
  margin: 0;
  min-height: 68rpx;
  line-height: 68rpx;
  padding: 0 28rpx;
  border-radius: 34rpx;
  font-size: 24rpx;
  transition-property: transform, opacity;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-order-ghost { background: #F5F2EC; color: #57534B; }

.cake-order-primary { background: #C4551F; color: #FFFFFF; font-weight: 600; }

.cake-order-ghost:active,
.cake-order-primary:active { transform: scale(0.96); }

.cake-order-ghost[disabled],
.cake-order-primary[disabled] { opacity: 0.5; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-order,
  .cake-order-ghost,
  .cake-order-primary { transition-duration: 0ms; }
}
</style>
