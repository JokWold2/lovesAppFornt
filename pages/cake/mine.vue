<template>
  <view class="cake-page app-h5-screen">
    <CakeNavBar
      :title="t('cake.mineTitle')"
      :progress="navProgress"
      :spacer="true"
      show-back
      show-home
      :z-index="70"
    />

    <scroll-view class="cake-scroll" scroll-y :show-scrollbar="false" @scroll="onScroll">
      <!-- 资产 -->
      <view class="cake-mine-assets">
        <text class="cake-mine-assets-title">{{ t('cake.mineAssets') }}</text>
        <view class="cake-mine-assets-row">
          <view class="cake-mine-asset" role="button" @click="openAccount">
            <text class="cake-mine-asset-label">{{ t('cake.assetBalance') }}</text>
            <text class="cake-mine-asset-value">{{ t('cake.balanceHidden') }}</text>
          </view>
          <view class="cake-mine-asset-line" aria-hidden="true"></view>
          <view class="cake-mine-asset" role="button" @click="openAccount">
            <text class="cake-mine-asset-label">{{ t('cake.assetCoupons') }}</text>
            <text class="cake-mine-asset-value">{{ t('cake.couponsHidden') }}</text>
          </view>
          <view class="cake-mine-asset-line" aria-hidden="true"></view>
          <view class="cake-mine-asset" role="button" @click="openAccount">
            <text class="cake-mine-asset-label">{{ t('cake.assetMemberCode') }}</text>
            <view class="cake-mine-qr"><uni-icons type="scan" :size="20" color="#6E6961" /></view>
          </view>
        </view>
      </view>

      <!-- 订单状态入口 -->
      <view class="cake-mine-card">
        <view class="cake-mine-card-head">
          <text class="cake-mine-card-title">{{ t('cake.mineOrders') }}</text>
          <button class="cake-mine-card-more" @click="openOrders('all')">
            <text class="cake-mine-card-more-text">{{ t('cake.viewAll') }}</text>
            <uni-icons type="right" :size="14" color="#8A857C" />
          </button>
        </view>
        <view class="cake-mine-orders">
          <view
            v-for="entry in orderEntries"
            :key="entry.key"
            class="cake-mine-order"
            role="button"
            :aria-label="entry.label"
            @click="openOrders(entry.key)"
          >
            <view class="cake-mine-order-icon">
              <uni-icons :type="entry.icon" :size="22" color="#A96A18" />
              <text v-if="entry.count" class="cake-mine-order-count">{{ entry.count > 99 ? '99+' : entry.count }}</text>
            </view>
            <text class="cake-mine-order-label">{{ entry.label }}</text>
          </view>
        </view>
      </view>

      <!-- 常用入口 -->
      <view class="cake-mine-card">
        <view class="cake-mine-row" role="button" @click="openCart">
          <text class="cake-mine-row-label">{{ t('cake.mineCart') }}</text>
          <view class="cake-mine-row-value">
            <text class="cake-mine-row-text">{{ t('cake.mineCartCount', { count: cartQuantity }) }}</text>
            <uni-icons type="right" :size="16" color="#A9A39A" />
          </view>
        </view>
        <view class="cake-mine-row" role="button" @click="openOrderPage">
          <text class="cake-mine-row-label">{{ t('cake.mineFavorites') }}</text>
          <view class="cake-mine-row-value">
            <text class="cake-mine-row-text">{{ t('cake.mineFavoritesCount', { count: favoriteCount }) }}</text>
            <uni-icons type="right" :size="16" color="#A9A39A" />
          </view>
        </view>
        <view class="cake-mine-row" role="button" @click="goTransport">
          <text class="cake-mine-row-label">{{ t('cake.promotionEntry') }}</text>
          <view class="cake-mine-row-value">
            <text class="cake-mine-row-text">{{ t('cake.mooncakeHome') }}</text>
            <uni-icons type="right" :size="16" color="#A9A39A" />
          </view>
        </view>
        <view class="cake-mine-row" role="button" @click="openAccount">
          <text class="cake-mine-row-label">{{ t('cake.goToAccount') }}</text>
          <uni-icons type="right" :size="16" color="#A9A39A" />
        </view>
      </view>

      <view class="cake-bottom-space" aria-hidden="true"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CakeNavBar from '@/components/cake/CakeNavBar.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { getCakeCartApi, getCakeFavoritesApi, getCakeOrdersApi } from '@/api/cake.js'
import { CAKE_ROUTES, cakeCartState, createCakeScrollProgress, goCakePage, goCakeTab } from '@/utils/cake.js'

const locale = currentLocale
const { progress: navProgress, update: updateScroll } = createCakeScrollProgress(40)

const counts = ref({})
const favoriteCount = ref(0)

const cartQuantity = computed(() => cakeCartState.totalQuantity.value)

const orderEntries = computed(() => [
  { key: 'pending', label: t('cake.orderTabPending'), icon: 'wallet', count: Number(counts.value?.pending || 0) },
  { key: 'paid', label: t('cake.orderTabPaid'), icon: 'navigate', count: Number(counts.value?.paid || 0) },
  { key: 'completed', label: t('cake.orderTabCompleted'), icon: 'checkmarkempty', count: Number(counts.value?.completed || 0) },
  { key: 'cancelled', label: t('cake.orderTabCancelled'), icon: 'closeempty', count: Number(counts.value?.cancelled || 0) }
])

function onScroll(event) {
  updateScroll(event?.detail?.scrollTop)
}

function openOrders(status) {
  goCakePage(`${CAKE_ROUTES.orders}?status=${status}`)
}

function openOrderPage() {
  goCakeTab(CAKE_ROUTES.order)
}

function openCart() {
  goCakePage(CAKE_ROUTES.cart)
}

function openAccount() {
  goCakePage(CAKE_ROUTES.account)
}

function goTransport() {
  goCakeTab(CAKE_ROUTES.transport)
}

async function loadSummary() {
  const [orderResult, favoriteResult, cartResult] = await Promise.all([
    getCakeOrdersApi({ status: 'all', page: 1, pageSize: 1 }).catch(() => null),
    getCakeFavoritesApi().catch(() => null),
    getCakeCartApi().catch(() => null)
  ])
  if (orderResult?.counts) counts.value = orderResult.counts
  if (favoriteResult) favoriteCount.value = Array.isArray(favoriteResult.storeIds) ? favoriteResult.storeIds.length : 0
  if (cartResult) cakeCartState.apply(cartResult)
}

onMounted(loadSummary)

// 从下单 / 收藏等页面返回后刷新数量，避免角标与实际不一致。
onShow(() => { loadSummary() })
</script>

<style scoped lang="scss">
.cake-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F7F5F1;
  overflow: hidden;
}

/* H5 下 vh 会把地址栏高度算进来，页面顶部被顶掉一截；
   与站内其它全屏页统一，按真实可视区高度布局。 */
/* #ifdef H5 */
.cake-page.app-h5-screen {
  width: auto;
  height: auto;
  min-height: 0;
  box-sizing: border-box;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
/* #endif */

.cake-scroll { flex: 1; height: 0; min-height: 0; }

.cake-mine-assets {
  margin: 20rpx 24rpx 0;
  padding: 32rpx 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(120deg, #FDF6E7 0%, #F7E9D3 100%);
}

.cake-mine-assets-title { display: block; font-size: 26rpx; font-weight: 650; color: #7A5334; }

.cake-mine-assets-row { display: flex; align-items: center; margin-top: 24rpx; }

.cake-mine-asset { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }

.cake-mine-asset-label { font-size: 22rpx; color: #A98C63; }

.cake-mine-asset-value { font-size: 32rpx; font-weight: 700; color: #4F3512; }

.cake-mine-asset-line { width: 1rpx; height: 56rpx; background: rgba(169, 140, 99, 0.32); }

.cake-mine-qr {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-mine-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
}

.cake-mine-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.cake-mine-card-title { font-size: 30rpx; font-weight: 650; color: #26241F; }

.cake-mine-card-more {
  margin: 0;
  padding: 0 4rpx;
  min-height: 48rpx;
  line-height: 48rpx;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.cake-mine-card-more-text { font-size: 22rpx; color: #8A857C; }

.cake-mine-orders { display: flex; align-items: flex-start; }

.cake-mine-order {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-mine-order:active { transform: scale(0.95); }

.cake-mine-order-icon {
  position: relative;
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  background: #FBF3E4;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-mine-order-count {
  position: absolute;
  top: -4rpx;
  right: -8rpx;
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

.cake-mine-order-label {
  font-size: 22rpx;
  color: #57534B;
  text-align: center;
  overflow-wrap: anywhere;
}

.cake-mine-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 24rpx 0;
  border-top: 1rpx solid #F2EFE9;
}

.cake-mine-row:first-child { border-top: 0; padding-top: 0; }

.cake-mine-row-label { font-size: 28rpx; color: #26241F; }

.cake-mine-row-value { display: flex; align-items: center; gap: 6rpx; min-width: 0; }

.cake-mine-row-text { font-size: 24rpx; color: #8A857C; }

.cake-bottom-space { height: 48rpx; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-mine-order { transition-duration: 0ms; }
}
</style>
