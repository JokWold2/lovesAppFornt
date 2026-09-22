<template>
  <view class="cake-page app-h5-screen">
    <CakeNavBar
      :title="t('cake.orderTitle')"
      :progress="navProgress"
      :spacer="true"
      :bottom-height="84"
      show-back
      show-home
      :z-index="70"
      @height="onNavHeight"
    >
      <template #right>
        <button class="cake-order-locate" :disabled="locating" :aria-label="locating ? t('cake.locating') : t('cake.locateMe')" @click="locate">
          <uni-icons type="navigate" :size="19" :color="locating ? '#C4BFB6' : '#171717'" />
        </button>
      </template>

      <template #bottom>
        <view class="cake-order-toolbar">
          <view class="cake-order-tabs">
            <view
              v-for="tab in tabs"
              :key="tab.key"
              class="cake-order-tab"
              :class="{ 'is-active': tab.key === activeTab }"
              role="button"
              :aria-label="tab.label"
              :aria-selected="tab.key === activeTab ? 'true' : 'false'"
              @click="switchTab(tab.key)"
            >
              <text class="cake-order-tab-text">{{ tab.label }}</text>
              <view v-if="tab.key === activeTab" class="cake-order-tab-underline" aria-hidden="true"></view>
            </view>
          </view>

          <view class="cake-order-searchrow">
            <view class="cake-order-search">
              <view class="cake-order-city" role="button" :aria-label="t('cake.selectCity')" @click="openCityPicker">
                <text class="cake-order-city-text">{{ cityLabel }}</text>
                <uni-icons type="bottom" :size="12" color="#6E6961" />
              </view>
              <view class="cake-order-search-divider" aria-hidden="true"></view>
              <input
                v-model="keyword"
                class="cake-order-input"
                type="text"
                :placeholder="t('cake.searchStorePlaceholder')"
                placeholder-class="cake-order-placeholder"
                confirm-type="search"
                @confirm="onSearchConfirm"
              />
              <button v-if="keyword" class="cake-order-clear" :aria-label="t('cake.cancel')" @click="clearKeyword">
                <uni-icons type="closeempty" :size="16" color="#8A857C" />
              </button>
            </view>
            <button class="cake-order-view-toggle" :aria-label="isMapView ? t('cake.switchToList') : t('cake.switchToMap')" @click="toggleMapView">
              <uni-icons :type="isMapView ? 'list' : 'map-pin'" :size="20" color="#171717" />
            </button>
          </view>
        </view>
      </template>
    </CakeNavBar>

    <!-- ===== 地图模式 ===== -->
    <view v-if="isMapView" class="cake-map" :style="{ height: `${mapHeight}px` }">
      <map
        class="cake-map-canvas"
        :latitude="mapCenter.latitude"
        :longitude="mapCenter.longitude"
        :markers="markers"
        :scale="13"
        :show-location="true"
        @markertap="onMarkerTap"
      ></map>

      <view v-if="!stores.length" class="cake-map-empty">
        <text class="cake-map-empty-text">{{ t('cake.storesEmpty') }}</text>
      </view>

      <view v-if="selectedStore" class="cake-map-panel">
        <CakeStoreCard
          :store="selectedStore"
          :locale="locale"
          :favorite="!!selectedStore.favorite"
          :favorite-pending="favoritePendingId === selectedStore.id"
          @favorite="toggleFavorite"
          @navigate="navigateTo"
          @call="callStore"
          @order="orderAtStore"
          @select="selectStore"
        />
      </view>
    </view>

    <!-- ===== 列表模式 ===== -->
    <template v-else>
      <view v-if="state === 'loading'" class="cake-list">
        <CakeStateView state="loading" :title="t('cake.loading')" />
      </view>

      <view v-else-if="state === 'error'" class="cake-list">
        <CakeStateView
          state="error"
          :title="t('cake.loadFailed')"
          :hint="t('cake.actionFailed')"
          @retry="loadStores(true)"
        />
      </view>

      <view v-else-if="state === 'empty'" class="cake-list">
        <CakeStateView
          state="empty"
          :title="emptyTitle"
          :hint="emptyHint"
          :action-label="emptyActionLabel"
          @action="onEmptyAction"
        />
      </view>

      <view v-else class="cake-list">
        <CakeStoreCard
          v-for="store in stores"
          :key="store.id"
          :store="store"
          :locale="locale"
          :favorite="!!store.favorite"
          :favorite-pending="favoritePendingId === store.id"
          @favorite="toggleFavorite"
          @navigate="navigateTo"
          @call="callStore"
          @order="orderAtStore"
          @select="orderAtStore"
        />

        <view class="cake-list-more">
          <button v-if="loadingMore" class="cake-list-more-btn" disabled>{{ t('cake.loadingMore') }}</button>
          <button v-else-if="moreError" class="cake-list-more-btn is-error" @click="loadStores(false)">{{ t('cake.loadMoreFailed') }}</button>
          <button v-else-if="hasMore" class="cake-list-more-btn" @click="loadStores(false)">{{ t('cake.loadMore') }}</button>
          <text v-else class="cake-list-end">{{ t('cake.noMore') }}</text>
        </view>
      </view>
    </template>

    <view class="cake-bottom-space" aria-hidden="true"></view>

    <!-- 城市选择 -->
    <SlideUpPanel :open="cityPickerOpen" fixed :label="t('cake.selectCity')" @dismiss="closeCityPicker">
      <view class="cake-city">
        <view class="cake-city-head">
          <text class="cake-city-title">{{ t('cake.selectCity') }}</text>
          <button class="cake-city-close" :aria-label="t('cake.close')" @click="closeCityPicker">
            <uni-icons type="closeempty" :size="20" color="#6E6961" />
          </button>
        </view>
        <scroll-view class="cake-city-scroll" scroll-y>
          <view
            v-for="city in cities"
            :key="city.code || 'all'"
            class="cake-city-item"
            :class="{ 'is-active': city.code === cityCode }"
            role="button"
            :aria-label="cityLabelOf(city)"
            @click="chooseCity(city)"
          >
            <text class="cake-city-name">{{ cityLabelOf(city) }}</text>
            <text class="cake-city-count">{{ city.storeCount ? t('cake.mineFavoritesCount', { count: city.storeCount }) : '' }}</text>
            <uni-icons v-if="city.code === cityCode" type="checkmarkempty" :size="18" color="#C4551F" />
          </view>
        </scroll-view>
      </view>
    </SlideUpPanel>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { onPageScroll, onPullDownRefresh } from '@dcloudio/uni-app'
import CakeNavBar from '@/components/cake/CakeNavBar.vue'
import CakeStoreCard from '@/components/cake/CakeStoreCard.vue'
import CakeStateView from '@/components/cake/CakeStateView.vue'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { getCakeCitiesApi, getCakeStoresApi, setCakeStoreFavoriteApi } from '@/api/cake.js'
import { CAKE_ROUTES, createCakeScrollProgress, getCakeLocation, goCakePage, pickCakeText } from '@/utils/cake.js'

const locale = currentLocale
const { progress: navProgress, update: updateScroll } = createCakeScrollProgress(40)

const PAGE_SIZE = 20
// 地图要精确占满导航栏之外的剩余高度：高度由 CakeNavBar 实测后回传，不用固定值硬凑。
const navHeightPx = ref(0)
const windowHeight = ref(0)
try { windowHeight.value = Number(uni.getWindowInfo?.().windowHeight || uni.getSystemInfoSync?.().windowHeight || 0) } catch (_) { windowHeight.value = 0 }
const mapHeight = computed(() => Math.max(320, windowHeight.value - (navHeightPx.value || 128)))

function onNavHeight(height) {
  navHeightPx.value = Number(height) || 0
}

const tabs = computed(() => [
  { key: 'nearby', label: t('cake.navNearby') },
  { key: 'favorite', label: t('cake.navFavorite') }
])

const activeTab = ref('nearby')
const isMapView = ref(false)
const keyword = ref('')
const cityCode = ref('')
const cities = ref([])
const cityPickerOpen = ref(false)

const stores = ref([])
const selectedStore = ref(null)
const state = ref('loading')
const loadingMore = ref(false)
const moreError = ref(false)
const hasMore = ref(false)
const page = ref(0)
const favoritePendingId = ref(0)
const locating = ref(false)
const coordinates = ref(null)

// 空状态的文案取决于「为什么空」，不要一律显示同一句话。
const emptyTitle = computed(() => {
  if (keyword.value) return activeTab.value === 'favorite' ? t('cake.noFavoriteMatch') : t('cake.emptySearch')
  return activeTab.value === 'favorite' ? t('cake.noFavoriteStores') : t('cake.noStoresInCity')
})

const emptyHint = computed(() => {
  if (keyword.value) return t('cake.emptyProductsHint')
  return activeTab.value === 'favorite' ? t('cake.noFavoriteHint') : t('cake.noStoresInCityHint')
})

const emptyActionLabel = computed(() => (activeTab.value === 'favorite'
  ? (keyword.value ? '' : t('cake.goShopping'))
  : t('cake.chooseOtherCity')))

const cityLabel = computed(() => {
  if (!cityCode.value) return t('cake.allCities')
  const match = cities.value.find(city => city.code === cityCode.value)
  return match ? cityLabelOf(match) : t('cake.allCities')
})

const mapCenter = computed(() => {
  if (coordinates.value) return coordinates.value
  const first = stores.value.find(store => Number.isFinite(store.latitude) && Number.isFinite(store.longitude))
  if (first) return { latitude: Number(first.latitude), longitude: Number(first.longitude) }
  return { latitude: 22.5431, longitude: 114.0579 }
})

const markers = computed(() => stores.value
  .filter(store => Number.isFinite(store.latitude) && Number.isFinite(store.longitude))
  .map(store => ({
    id: store.id,
    latitude: Number(store.latitude),
    longitude: Number(store.longitude),
    title: pickCakeText(store.name, locale.value),
    iconPath: '/static/img/icon-location.png',
    width: 26,
    height: 26,
    callout: {
      content: pickCakeText(store.name, locale.value),
      color: '#26241F',
      fontSize: 12,
      borderRadius: 6,
      bgColor: '#FFFFFF',
      padding: 6,
      display: 'BYCLICK'
    }
  })))

function cityLabelOf(city) {
  const text = pickCakeText(city?.name, locale.value)
  return text || t('cake.allCities')
}

function handlePageScroll(event) {
  updateScroll(event?.scrollTop)
}

function switchTab(key) {
  if (key === activeTab.value) return
  activeTab.value = key
  loadStores(true)
}

function openCityPicker() { cityPickerOpen.value = true }
function closeCityPicker() { cityPickerOpen.value = false }

function chooseCity(city) {
  cityPickerOpen.value = false
  const next = city.code || ''
  if (next === cityCode.value) return
  cityCode.value = next
  selectedStore.value = null
  loadStores(true)
}

function onSearchConfirm() {
  loadStores(true)
}

function clearKeyword() {
  if (!keyword.value) return
  keyword.value = ''
  loadStores(true)
}

function toggleMapView() {
  isMapView.value = !isMapView.value
  if (isMapView.value && !selectedStore.value) selectedStore.value = stores.value[0] || null
}

async function locate() {
  if (locating.value) return
  locating.value = true
  try {
    const position = await getCakeLocation()
    if (!position) {
      uni.showToast({ title: t('cake.locateFailed'), icon: 'none' })
      return
    }
    coordinates.value = position
    // 定位成功后切回「附近」并清掉收藏筛选，否则结果会被过滤成空。
    if (activeTab.value !== 'nearby') activeTab.value = 'nearby'
    uni.showToast({ title: t('cake.locationApplied'), icon: 'none' })
    await loadStores(true)
  } finally {
    locating.value = false
  }
}

async function loadStores(reset) {
  if (reset) {
    page.value = 0
    moreError.value = false
    state.value = 'loading'
  } else {
    if (loadingMore.value || !hasMore.value) return
    loadingMore.value = true
    moreError.value = false
  }

  const target = reset ? 1 : page.value + 1
  try {
    const data = await getCakeStoresApi({
      cityCode: cityCode.value || undefined,
      keyword: keyword.value.trim() || undefined,
      favoriteOnly: activeTab.value === 'favorite',
      latitude: coordinates.value?.latitude,
      longitude: coordinates.value?.longitude,
      page: target,
      pageSize: PAGE_SIZE
    })
    const items = Array.isArray(data?.items) ? data.items : []
    stores.value = reset ? items : stores.value.concat(items)
    page.value = target
    hasMore.value = !!data?.hasMore
    state.value = stores.value.length ? 'ready' : 'empty'
    if (isMapView.value) {
      const stillThere = stores.value.find(store => store.id === selectedStore.value?.id)
      selectedStore.value = stillThere || stores.value[0] || null
    }
  } catch (error) {
    if (reset) state.value = 'error'
    else { moreError.value = true; hasMore.value = true }
  } finally {
    loadingMore.value = false
    uni.stopPullDownRefresh?.()
  }
}

async function loadCities() {
  try {
    const data = await getCakeCitiesApi()
    const items = Array.isArray(data?.items) ? data.items : []
    // 「全部城市」始终可用，避免后端没有城市数据时选择器是空的。
    cities.value = [{ code: '', name: null, storeCount: 0 }].concat(items)
    if (!cityCode.value && items.length) cityCode.value = items[0].code
  } catch (_) {
    cities.value = [{ code: '', name: null, storeCount: 0 }]
  }
}

async function toggleFavorite(store) {
  if (!store || favoritePendingId.value) return
  favoritePendingId.value = store.id
  const next = !store.favorite
  try {
    await setCakeStoreFavoriteApi(store.id, next)
    store.favorite = next
    if (!next && activeTab.value === 'favorite') {
      stores.value = stores.value.filter(item => item.id !== store.id)
      if (selectedStore.value?.id === store.id) selectedStore.value = stores.value[0] || null
      if (!stores.value.length) state.value = 'empty'
    }
    uni.showToast({ title: next ? t('cake.favoriteAdded') : t('cake.favoriteRemoved'), icon: 'none' })
  } catch (_) {
    uni.showToast({ title: t('cake.favoriteFailed'), icon: 'none' })
  } finally {
    favoritePendingId.value = 0
  }
}

function navigateTo(store) {
  if (!Number.isFinite(store?.latitude) || !Number.isFinite(store?.longitude)) return
  uni.openLocation({
    latitude: Number(store.latitude),
    longitude: Number(store.longitude),
    name: pickCakeText(store.name, locale.value),
    address: pickCakeText(store.address, locale.value),
    fail: () => uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  })
}

function callStore(store) {
  if (!store?.phone) return
  uni.makePhoneCall({ phoneNumber: String(store.phone), fail: () => {} })
}

function orderAtStore(store) {
  if (!store) return
  goCakePage(`${CAKE_ROUTES.shop}?storeId=${store.id}&mode=pickup`)
}

// 地图面板里的卡片已被选中，点卡片只保持选中，下单走「去点单」按钮。
function selectStore(store) {
  if (store) selectedStore.value = store
}

function onMarkerTap(event) {
  const id = Number(event?.detail?.markerId)
  const match = stores.value.find(store => store.id === id)
  if (match) selectedStore.value = match
}

function onEmptyAction() {
  if (activeTab.value === 'favorite') {
    if (keyword.value) { clearKeyword(); return }
    switchTab('nearby')
    return
  }
  openCityPicker()
}

onMounted(async () => {
  await loadCities()
  await loadStores(true)
})

onPullDownRefresh(() => { loadStores(true) })
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

.cake-order-locate {
  width: 72rpx;
  height: 72rpx;
  margin: 0;
  padding: 0;
  min-height: 72rpx;
  line-height: 1;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  transition-property: transform, background-color;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-order-locate:active { transform: scale(0.94); }

.cake-order-toolbar {
  background: #F7F5F1;
  border-bottom: 1rpx solid #EDE9E2;
}

.cake-order-tabs {
  display: flex;
  gap: 44rpx;
  padding: 6rpx 32rpx 0;
}

.cake-order-tab {
  position: relative;
  padding: 12rpx 0 14rpx;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-order-tab:active { transform: scale(0.96); }

.cake-order-tab-text { font-size: 30rpx; color: #8A857C; }

.cake-order-tab.is-active .cake-order-tab-text { color: #26241F; font-weight: 650; }

.cake-order-tab-underline {
  position: absolute;
  left: 50%;
  bottom: 4rpx;
  transform: translateX(-50%);
  width: 40rpx;
  height: 5rpx;
  border-radius: 4rpx;
  background: #C4551F;
}

.cake-order-searchrow {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 28rpx 16rpx;
}

.cake-order-search {
  flex: 1;
  min-width: 0;
  height: 76rpx;
  border-radius: 38rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  box-sizing: border-box;
}

.cake-order-city {
  flex: 0 0 auto;
  max-width: 200rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.cake-order-city-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #26241F;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cake-order-search-divider { width: 1rpx; height: 28rpx; background: #E4DFD6; margin: 0 16rpx; }

.cake-order-input { flex: 1; min-width: 0; font-size: 24rpx; color: #26241F; }

.cake-order-placeholder { color: #A9A39A; }

.cake-order-clear {
  flex: 0 0 auto;
  width: 44rpx;
  height: 44rpx;
  margin: 0;
  padding: 0;
  min-height: 44rpx;
  line-height: 1;
  border-radius: 50%;
  background: #F1EEE8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-order-view-toggle {
  flex: 0 0 auto;
  width: 76rpx;
  height: 76rpx;
  margin: 0;
  padding: 0;
  min-height: 76rpx;
  line-height: 1;
  border-radius: 50%;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-order-view-toggle:active { transform: scale(0.94); }

/* 列表 */
.cake-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 24rpx 28rpx 0;
}

.cake-list-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0 8rpx;
}

.cake-list-more-btn {
  margin: 0;
  min-height: 76rpx;
  line-height: 76rpx;
  padding: 0 48rpx;
  border-radius: 38rpx;
  background: #FFFFFF;
  color: #57534B;
  font-size: 26rpx;
}

.cake-list-more-btn.is-error { color: #B4442A; }

.cake-list-end { font-size: 24rpx; color: #A9A39A; }

/* 地图 */
.cake-map { position: relative; width: 100%; }

.cake-map-canvas { width: 100%; height: 100%; }

.cake-map-empty {
  position: absolute;
  top: 24rpx;
  left: 50%;
  transform: translateX(-50%);
  padding: 12rpx 28rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.92);
}

.cake-map-empty-text { font-size: 24rpx; color: #6E6961; }

.cake-map-panel {
  position: absolute;
  left: 28rpx;
  right: 28rpx;
  bottom: 28rpx;
  border-radius: 24rpx;
  box-shadow: 0 12rpx 32rpx rgba(38, 36, 31, 0.16);
}

/* 城市选择 */
.cake-city { display: flex; flex-direction: column; max-height: 70vh; background: #F7F5F1; }

.cake-city-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 30rpx 20rpx;
}

.cake-city-title { font-size: 32rpx; font-weight: 650; color: #26241F; }

.cake-city-close {
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

.cake-city-scroll { flex: 1; min-height: 0; padding: 0 30rpx; box-sizing: border-box; }

.cake-city-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 26rpx 24rpx;
  background: #FFFFFF;
  border-radius: 18rpx;
  margin-bottom: 16rpx;
  transition-property: background-color, transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-city-item:active { transform: scale(0.99); }

.cake-city-item.is-active { background: #FDF3EC; }

.cake-city-name { flex: 1; min-width: 0; font-size: 28rpx; color: #26241F; overflow-wrap: anywhere; }

.cake-city-count { font-size: 22rpx; color: #A9A39A; }

.cake-bottom-space { height: 48rpx; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-order-tab,
  .cake-order-locate,
  .cake-order-view-toggle,
  .cake-city-item { transition-duration: 0ms; }
}
</style>
