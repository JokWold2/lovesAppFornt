<template>
  <view class="cake-page">
    <CakeNavBar
      :title="t('cake.ordersTitle')"
      :progress="navProgress"
      :spacer="true"
      :bottom-height="36"
      show-back
      show-home
    >
      <template #bottom>
        <scroll-view class="cake-tabs" scroll-x :show-scrollbar="false">
          <view class="cake-tabs-track">
            <view
              v-for="tab in tabs"
              :key="tab.key"
              class="cake-tab"
              :class="{ 'is-active': tab.key === activeStatus }"
              role="button"
              :aria-label="tab.label"
              :aria-selected="tab.key === activeStatus ? 'true' : 'false'"
              @click="chooseStatus(tab.key)"
            >
              <text class="cake-tab-text">{{ tab.label }}</text>
              <text v-if="countFor(tab.key)" class="cake-tab-count">{{ countFor(tab.key) }}</text>
              <view v-if="tab.key === activeStatus" class="cake-tab-underline" aria-hidden="true"></view>
            </view>
          </view>
        </scroll-view>
      </template>
    </CakeNavBar>

    <CakeStateView v-if="state === 'loading'" state="loading" :title="t('cake.loading')" />
    <CakeStateView
      v-else-if="state === 'error'"
      state="error"
      :title="t('cake.loadFailed')"
      :hint="t('cake.actionFailed')"
      @retry="loadOrders(true)"
    />
    <CakeStateView
      v-else-if="state === 'empty'"
      state="empty"
      :title="t('cake.ordersEmpty')"
      :hint="t('cake.ordersEmptyHint')"
      :action-label="t('cake.goShopping')"
      @action="goShopping"
    />

    <template v-else>
      <view class="cake-orders">
        <CakeOrderCard
          v-for="order in orders"
          :key="order.id"
          :order="order"
          :locale="locale"
          :pending="pendingId === order.id"
          @open="openOrder"
          @pay="payOrder"
          @cancel="cancelOrder"
          @confirm="confirmOrder"
        />
      </view>
      <view class="cake-orders-more">
        <button v-if="loadingMore" class="cake-orders-more-btn" disabled>{{ t('cake.loadingMore') }}</button>
        <button v-else-if="moreError" class="cake-orders-more-btn is-error" @click="loadOrders(false)">{{ t('cake.loadMoreFailed') }}</button>
        <button v-else-if="hasMore" class="cake-orders-more-btn" @click="loadOrders(false)">{{ t('cake.loadMore') }}</button>
        <text v-else class="cake-orders-end">{{ t('cake.noMore') }}</text>
      </view>
    </template>

    <view class="cake-bottom-space" aria-hidden="true"></view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onPageScroll, onPullDownRefresh } from '@dcloudio/uni-app'
import CakeNavBar from '@/components/cake/CakeNavBar.vue'
import CakeOrderCard from '@/components/cake/CakeOrderCard.vue'
import CakeStateView from '@/components/cake/CakeStateView.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { cancelCakeOrderApi, confirmCakeOrderApi, getCakeOrdersApi, payCakeOrderApi } from '@/api/cake.js'
import { CAKE_ORDER_TABS, CAKE_ROUTES, createCakeRequestId, createCakeScrollProgress, goCakePage } from '@/utils/cake.js'

const locale = currentLocale
const { progress: navProgress, update: updateScroll } = createCakeScrollProgress(40)

const PAGE_SIZE = 10

const tabs = computed(() => CAKE_ORDER_TABS.map(tab => ({ key: tab.key, label: t(tab.labelKey) })))

const activeStatus = ref('all')
const orders = ref([])
const counts = ref({})
const state = ref('loading')
const page = ref(0)
const hasMore = ref(false)
const loadingMore = ref(false)
const moreError = ref(false)
const pendingId = ref(0)
// 每个订单保留同一个幂等号，重复点击支付不会被后端当成两笔。
const payRequestIds = new Map()

function handlePageScroll(event) {
  updateScroll(event?.scrollTop)
}

function countFor(key) {
  const value = Number(counts.value?.[key] || 0)
  return value > 0 ? value : 0
}

function chooseStatus(key) {
  if (key === activeStatus.value) return
  activeStatus.value = key
  loadOrders(true)
}

async function loadOrders(reset) {
  if (reset) {
    page.value = 0
    moreError.value = false
    state.value = 'loading'
  } else if (loadingMore.value || !hasMore.value) {
    return
  }

  const target = reset ? 1 : page.value + 1
  if (!reset) loadingMore.value = true

  try {
    const data = await getCakeOrdersApi({ status: activeStatus.value, page: target, pageSize: PAGE_SIZE })
    const items = Array.isArray(data?.items) ? data.items : []
    orders.value = reset ? items : orders.value.concat(items)
    page.value = target
    hasMore.value = !!data?.hasMore
    counts.value = data?.counts || counts.value
    state.value = orders.value.length ? 'ready' : 'empty'
  } catch (_) {
    if (reset) state.value = 'error'
    else { moreError.value = true; hasMore.value = true }
  } finally {
    loadingMore.value = false
    uni.stopPullDownRefresh?.()
  }
}

function replaceOrder(order) {
  if (!order?.id) return
  const index = orders.value.findIndex(item => item.id === order.id)
  if (index >= 0) orders.value.splice(index, 1, order)
  // 状态变化会影响各分组计数，重新拉一次让标签上的数字保持准确。
  refreshCounts()
}

async function refreshCounts() {
  try {
    const data = await getCakeOrdersApi({ status: 'all', page: 1, pageSize: 1 })
    counts.value = data?.counts || counts.value
  } catch (_) { /* 计数失败不影响列表本身 */ }
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

async function payOrder(order) {
  if (pendingId.value) return
  const confirmed = await confirmModal({
    title: t('cake.payConfirmTitle'),
    content: t('cake.payConfirmContent', { amount: (Number(order.payableCents || 0) / 100).toFixed(2) })
  })
  if (!confirmed) return

  pendingId.value = order.id
  if (!payRequestIds.has(order.id)) payRequestIds.set(order.id, createCakeRequestId())
  try {
    const data = await payCakeOrderApi(order.id, payRequestIds.get(order.id))
    payRequestIds.delete(order.id)
    replaceOrder(data?.order)
    uni.showToast({ title: t('cake.orderPaid'), icon: 'none' })
  } catch (error) {
    const message = Number(error?.code) === 409 ? t('cake.stockInsufficient') : t('cake.actionFailed')
    uni.showToast({ title: message, icon: 'none' })
  } finally {
    pendingId.value = 0
  }
}

async function cancelOrder(order) {
  if (pendingId.value) return
  const confirmed = await confirmModal({ title: t('cake.cancelOrder'), content: t('cake.cancelOrderConfirm') })
  if (!confirmed) return

  pendingId.value = order.id
  try {
    const data = await cancelCakeOrderApi(order.id)
    replaceOrder(data?.order)
    uni.showToast({ title: t('cake.orderCancelled'), icon: 'none' })
  } catch (_) {
    uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  } finally {
    pendingId.value = 0
  }
}

async function confirmOrder(order) {
  if (pendingId.value) return
  const confirmed = await confirmModal({ title: t('cake.confirmReceipt'), content: t('cake.orderTotalQuantity', { count: order.totalQuantity || 0 }) })
  if (!confirmed) return

  pendingId.value = order.id
  try {
    const data = await confirmCakeOrderApi(order.id)
    replaceOrder(data?.order)
    uni.showToast({ title: t('cake.orderCompletedToast'), icon: 'none' })
  } catch (_) {
    uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  } finally {
    pendingId.value = 0
  }
}

function openOrder(order) {
  goCakePage(`${CAKE_ROUTES.orderDetail}?id=${order.id}`)
}

function goShopping() {
  uni.redirectTo({ url: CAKE_ROUTES.transport, fail: () => uni.reLaunch({ url: CAKE_ROUTES.transport }) })
}

onLoad(options => {
  const status = String(options?.status || 'all')
  if (CAKE_ORDER_TABS.some(tab => tab.key === status)) activeStatus.value = status
  loadOrders(true)
})

onPullDownRefresh(() => { loadOrders(true) })
</script>

<style scoped lang="scss">
.cake-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: #F7F5F1;
}

.cake-tabs { width: 100%; white-space: nowrap; background: #F7F5F1; border-bottom: 1rpx solid #EDE9E2; }

.cake-tabs-track { display: inline-flex; padding: 0 24rpx; gap: 32rpx; }

.cake-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 0 14rpx;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-tab:active { transform: scale(0.96); }

.cake-tab-text { font-size: 27rpx; color: #8A857C; }

.cake-tab.is-active .cake-tab-text { color: #26241F; font-weight: 600; }

.cake-tab-count { font-size: 20rpx; color: #C4551F; }

.cake-tab-underline {
  position: absolute;
  left: 50%;
  bottom: 2rpx;
  transform: translateX(-50%);
  width: 36rpx;
  height: 5rpx;
  border-radius: 4rpx;
  background: #C4551F;
}

.cake-orders {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 24rpx 24rpx 0;
}

.cake-orders-more { display: flex; align-items: center; justify-content: center; padding: 30rpx 0 10rpx; }

.cake-orders-more-btn {
  margin: 0;
  min-height: 76rpx;
  line-height: 76rpx;
  padding: 0 48rpx;
  border-radius: 38rpx;
  background: #FFFFFF;
  color: #57534B;
  font-size: 26rpx;
}

.cake-orders-more-btn.is-error { color: #B4442A; }

.cake-orders-end { font-size: 24rpx; color: #A9A39A; }

.cake-bottom-space { height: 120rpx; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-tab { transition-duration: 0ms; }
}
</style>
