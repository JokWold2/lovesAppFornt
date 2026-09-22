<template>
  <view class="cake-page">
    <CakeNavBar
      :title="t(navTitleKey)"
      :progress="navProgress"
      :spacer="true"
      :bottom-height="navBottomHeight"
      show-home
      show-search
      :z-index="70"
      @search="toggleSearch"
    >
      <template #bottom>
        <view class="cake-toolbar">
          <!-- 分类 -->
          <scroll-view class="cake-categories" scroll-x :show-scrollbar="false">
            <view class="cake-categories-track">
              <view
                v-for="category in categoryTabs"
                :key="category.code || 'all'"
                class="cake-category"
                :class="{ 'is-active': category.code === activeCategory }"
                role="button"
                :aria-label="category.label"
                :aria-selected="category.code === activeCategory ? 'true' : 'false'"
                @click="chooseCategory(category.code)"
              >
                <text class="cake-category-text">{{ category.label }}</text>
              </view>
            </view>
          </scroll-view>

          <!-- 搜索（点击导航搜索图标展开） -->
          <view v-if="searchOpen" class="cake-search">
            <uni-icons type="search" :size="16" color="#8A857C" />
            <input
              v-model="keyword"
              class="cake-search-input"
              type="text"
              :focus="searchOpen"
              :placeholder="t('cake.searchProductPlaceholder')"
              placeholder-class="cake-search-placeholder"
              confirm-type="search"
              @confirm="applyFilters"
            />
            <button v-if="keyword" class="cake-search-clear" :aria-label="t('cake.cancel')" @click="clearSearch">
              <uni-icons type="closeempty" :size="16" color="#8A857C" />
            </button>
          </view>

          <!-- 排序与布局 -->
          <view class="cake-filters">
            <view class="cake-sorts">
              <view
                v-for="sort in sorts"
                :key="sort.key"
                class="cake-sort"
                :class="{ 'is-active': activeSortKey === sort.key }"
                role="button"
                :aria-label="sort.label"
                @click="chooseSort(sort)"
              >
                <text class="cake-sort-text">{{ sort.label }}</text>
                <view v-if="sort.key === 'price'" class="cake-sort-arrows" aria-hidden="true">
                  <view class="cake-arrow-up" :class="{ 'is-active': activeSortKey === 'price' && sortAsc }"></view>
                  <view class="cake-arrow-down" :class="{ 'is-active': activeSortKey === 'price' && !sortAsc }"></view>
                </view>
                <view v-else-if="activeSortKey === sort.key" class="cake-sort-underline" aria-hidden="true"></view>
              </view>
            </view>
            <button class="cake-layout-toggle" :aria-label="isGrid ? t('cake.listViewLabel') : t('cake.mapViewLabel')" @click="toggleLayout">
              <!-- 纯 CSS 图标：网格=2x2 方块，列表=三条横杠。uni-icons 里没有网格图标。 -->
              <view class="cake-layout-icon" :class="{ 'is-list': !isGrid }" aria-hidden="true">
                <view class="cake-layout-dot"></view>
                <view class="cake-layout-dot"></view>
                <view class="cake-layout-dot"></view>
                <view class="cake-layout-dot"></view>
              </view>
            </button>
          </view>
        </view>
      </template>
    </CakeNavBar>

    <scroll-view
      class="cake-list-scroll"
      scroll-y
      :show-scrollbar="false"
      :lower-threshold="140"
      refresher-enabled
      :refresher-triggered="refreshing"
      @scroll="onScroll"
      @scrolltolower="loadMore"
      @refresherrefresh="refresh"
    >
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
        @retry="loadProducts(true)"
      />

      <CakeStateView
        v-else-if="state === 'empty'"
        state="empty"
        :title="keyword ? t('cake.emptySearch') : t('cake.emptyProducts')"
        :hint="t('cake.emptyProductsHint')"
      />

      <template v-else>
        <view v-if="isGrid" class="cake-grid">
          <CakeProductCard
            v-for="product in products"
            :key="product.id"
            :product="product"
            :locale="locale"
            :pending="addingId === product.id"
            @open="openProduct"
            @add="addProduct"
          />
        </view>
        <view v-else class="cake-rows">
          <CakeProductRow
            v-for="product in products"
            :key="product.id"
            :product="product"
            :locale="locale"
            :pending="addingId === product.id"
            @open="openProduct"
            @add="addProduct"
          />
        </view>

        <view class="cake-list-more">
          <button v-if="loadingMore" class="cake-list-more-btn" disabled>{{ t('cake.loadingMore') }}</button>
          <button v-else-if="moreError" class="cake-list-more-btn is-error" @click="loadMore">{{ t('cake.loadMoreFailed') }}</button>
          <button v-else-if="hasMore" class="cake-list-more-btn" @click="loadMore">{{ t('cake.loadMore') }}</button>
          <text v-else class="cake-list-end">{{ t('cake.noMore') }}</text>
        </view>
      </template>

      <view class="cake-bottom-space" aria-hidden="true"></view>
    </scroll-view>

    <CakeCartFab
      :total-quantity="cartQuantity"
      :items-amount-cents="cartAmountCents"
      @open="openCart"
    />

    <CakeSkuPanel
      :open="skuOpen"
      :product="skuProduct"
      :locale="locale"
      mode="cart"
      :submitting="addingId === skuProduct?.id"
      @dismiss="closeSku"
      @confirm="confirmSku"
    />

    <CakeTabBar :active-key="tabKey" />
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CakeNavBar from '@/components/cake/CakeNavBar.vue'
import CakeTabBar from '@/components/cake/CakeTabBar.vue'
import CakeCartFab from '@/components/cake/CakeCartFab.vue'
import CakeProductCard from '@/components/cake/CakeProductCard.vue'
import CakeProductRow from '@/components/cake/CakeProductRow.vue'
import CakeSkuPanel from '@/components/cake/CakeSkuPanel.vue'
import CakeStateView from '@/components/cake/CakeStateView.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { addCakeCartItemApi, getCakeCartApi, getCakeCategoriesApi, getCakeProductsApi } from '@/api/cake.js'
import { CAKE_ROUTES, cakeCartState, createCakeScrollProgress, goCakePage, pickCakeText } from '@/utils/cake.js'

const props = defineProps({
  navTitleKey: { type: String, required: true },
  tabKey: { type: String, required: true },
  // 只展示这些分类（按 code 过滤）；为空表示展示后端返回的全部分类
  categoryCodes: { type: Array, default: () => [] },
  defaultCategoryCode: { type: String, default: '' },
  // 传给结算页的默认取货方式与门店
  mode: { type: String, default: 'delivery' },
  storeId: { type: Number, default: 0 },
  // 活动码（例如 mooncake-free-order），会一路带到下单请求里
  marketing: { type: String, default: '' },
  // 是否把「拍下须知」类卡片一并列出（后端只有传 kind=all 才会返回）
  includeNotice: { type: Boolean, default: false },
  pageSize: { type: Number, default: 20 }
})

const locale = currentLocale
const { progress: navProgress, update: updateScroll } = createCakeScrollProgress(40)

const categories = ref([])
const activeCategory = ref('')
const keyword = ref('')
const searchOpen = ref(false)
const activeSortKey = ref('default')
const sortAsc = ref(true)
const isGrid = ref(true)

// 工具栏高度：分类 ≈34px + 排序 ≈34px（搜索展开时再加 ≈44px），仅用于首帧占位，
// 真实高度由 CakeNavBar 测量后覆盖。
const SEARCH_ROW_HEIGHT = 44
const navBottomHeight = computed(() => 68 + (searchOpen.value ? SEARCH_ROW_HEIGHT : 0))

const products = ref([])
const state = ref('loading')
const page = ref(0)
const hasMore = ref(false)
const loadingMore = ref(false)
const moreError = ref(false)
const refreshing = ref(false)

const addingId = ref(0)
const skuOpen = ref(false)
const skuProduct = ref(null)

const cartQuantity = computed(() => cakeCartState.totalQuantity.value)
const cartAmountCents = computed(() => cakeCartState.itemsAmountCents.value)

const sorts = computed(() => [
  { key: 'default', label: t('cake.sortDefault') },
  { key: 'sales', label: t('cake.sortSales') },
  { key: 'new', label: t('cake.sortNew') },
  { key: 'price', label: t('cake.sortPrice') }
])

const categoryTabs = computed(() => [{ code: '', label: t('cake.categoryAll') }]
  .concat(categories.value.map(category => ({
    code: category.code,
    label: pickCakeText(category.name, locale.value) || category.code
  }))))

const sortParam = computed(() => {
  if (activeSortKey.value === 'price') return sortAsc.value ? 'price_asc' : 'price_desc'
  return activeSortKey.value
})

function onScroll(event) {
  updateScroll(event?.detail?.scrollTop)
}

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value && keyword.value) clearSearch()
}

function clearSearch() {
  if (!keyword.value) return
  keyword.value = ''
  applyFilters()
}

function chooseCategory(code) {
  if (code === activeCategory.value) return
  activeCategory.value = code
  loadProducts(true)
}

function chooseSort(sort) {
  if (sort.key === 'price') {
    if (activeSortKey.value === 'price') sortAsc.value = !sortAsc.value
    else { activeSortKey.value = 'price'; sortAsc.value = true }
  } else {
    if (activeSortKey.value === sort.key) return
    activeSortKey.value = sort.key
  }
  loadProducts(true)
}

function toggleLayout() {
  isGrid.value = !isGrid.value
}

function applyFilters() {
  loadProducts(true)
}

async function loadCategories() {
  try {
    const data = await getCakeCategoriesApi()
    const items = Array.isArray(data?.items) ? data.items : []
    // 后端有一个 id=0 / code='all' 的伪分类（等价于不过滤）；页面自己已经渲染了「全部」标签，
    // 直接用会重复，这里剔除掉。
    const real = items.filter(item => item.code !== 'all' && Number(item.id) !== 0)
    const allowed = props.categoryCodes
    categories.value = allowed.length ? real.filter(item => allowed.includes(item.code)) : real
    if (props.defaultCategoryCode && categories.value.some(item => item.code === props.defaultCategoryCode)) {
      activeCategory.value = props.defaultCategoryCode
    }
  } catch (_) {
    // 分类拉取失败时仍然展示全部商品，搜索与排序保持可用。
    categories.value = []
  }
}

async function loadProducts(reset) {
  if (reset) {
    page.value = 0
    moreError.value = false
    state.value = 'loading'
  } else if (!hasMore.value || loadingMore.value) {
    return
  }

  const target = reset ? 1 : page.value + 1
  if (!reset) loadingMore.value = true

  try {
    const data = await getCakeProductsApi({
      categoryCode: activeCategory.value || undefined,
      keyword: keyword.value.trim() || undefined,
      sort: sortParam.value,
      // 不传 kind 时后端只返回普通商品；须知卡片必须显式请求 kind=all。
      kind: props.includeNotice ? 'all' : undefined,
      page: target,
      pageSize: props.pageSize
    })
    const items = Array.isArray(data?.items) ? data.items : []
    products.value = reset ? items : products.value.concat(items)
    page.value = target
    hasMore.value = !!data?.hasMore
    state.value = products.value.length ? 'ready' : 'empty'
  } catch (_) {
    if (reset) state.value = 'error'
    else { moreError.value = true; hasMore.value = true }
  } finally {
    loadingMore.value = false
    refreshing.value = false
  }
}

function loadMore() {
  if (!hasMore.value || loadingMore.value || state.value !== 'ready') return
  loadProducts(false)
}

async function refresh() {
  refreshing.value = true
  await Promise.all([loadCategories(), loadProducts(true), loadCart()])
}

async function loadCart() {
  try {
    const cart = await getCakeCartApi()
    cakeCartState.apply(cart)
  } catch (_) {
    cakeCartState.reset()
  }
}

function marketingQuery() {
  return props.marketing ? `&marketing=${encodeURIComponent(props.marketing)}` : ''
}

function openCart() {
  goCakePage(`${CAKE_ROUTES.cart}?mode=${props.mode}${props.storeId ? `&storeId=${props.storeId}` : ''}${marketingQuery()}`)
}

function openProduct(product) {
  const query = [`id=${product.id}`, `mode=${props.mode}`]
  if (props.storeId) query.push(`storeId=${props.storeId}`)
  if (props.marketing) query.push(`marketing=${encodeURIComponent(props.marketing)}`)
  goCakePage(`${CAKE_ROUTES.detail}?${query.join('&')}`)
}

function closeSku() { skuOpen.value = false }

async function addProduct(product) {
  if (addingId.value) return
  if (Array.isArray(product?.skus) && product.skus.length) {
    skuProduct.value = product
    skuOpen.value = true
    return
  }
  await submitCart(product, 0, 1)
}

async function confirmSku({ skuId, quantity }) {
  await submitCart(skuProduct.value, skuId, quantity)
}

async function submitCart(product, skuId, quantity) {
  if (!product || addingId.value) return
  addingId.value = product.id
  try {
    const cart = await addCakeCartItemApi(product.id, skuId, quantity)
    cakeCartState.apply(cart)
    skuOpen.value = false
    uni.showToast({ title: t('cake.addedToCart'), icon: 'none' })
  } catch (_) {
    uni.showToast({ title: t('cake.actionFailed'), icon: 'none' })
  } finally {
    addingId.value = 0
  }
}

onMounted(async () => {
  await loadCategories()
  loadProducts(true)
  loadCart()
})

// 从详情页/购物车返回后同步角标
onShow(() => { loadCart() })
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

.cake-toolbar { background: #F7F5F1; border-bottom: 1rpx solid #EDE9E2; }

.cake-categories { width: 100%; white-space: nowrap; }

.cake-categories-track { display: inline-flex; padding: 8rpx 24rpx; gap: 14rpx; }

.cake-category {
  padding: 10rpx 26rpx;
  border-radius: 30rpx;
  background: #FFFFFF;
  transition-property: background-color, transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-category:active { transform: scale(0.96); }

.cake-category.is-active { background: #C4551F; }

.cake-category-text { font-size: 26rpx; color: #57534B; }

.cake-category.is-active .cake-category-text { color: #FFFFFF; font-weight: 600; }

.cake-search {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 76rpx;
  margin: 0 24rpx 8rpx;
  padding: 0 22rpx;
  box-sizing: border-box;
  border-radius: 38rpx;
  background: #FFFFFF;
}

.cake-search-input { flex: 1; min-width: 0; font-size: 24rpx; color: #26241F; }

.cake-search-placeholder { color: #A9A39A; }

.cake-search-clear {
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

.cake-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 6rpx 24rpx 10rpx;
}

.cake-sorts { display: flex; align-items: center; gap: 36rpx; }

.cake-sort {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 0 12rpx;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-sort:active { transform: scale(0.96); }

.cake-sort-text { font-size: 26rpx; color: #8A857C; }

.cake-sort.is-active .cake-sort-text { color: #26241F; font-weight: 600; }

.cake-sort-underline {
  position: absolute;
  left: 50%;
  bottom: 2rpx;
  transform: translateX(-50%);
  width: 36rpx;
  height: 5rpx;
  border-radius: 4rpx;
  background: #C4551F;
}

.cake-sort-arrows { display: flex; flex-direction: column; gap: 4rpx; }

.cake-arrow-up { border: 7rpx solid transparent; border-bottom-color: #C4BFB6; }

.cake-arrow-up.is-active { border-bottom-color: #C4551F; }

.cake-arrow-down { border: 7rpx solid transparent; border-top-color: #C4BFB6; }

.cake-arrow-down.is-active { border-top-color: #C4551F; }

.cake-layout-toggle {
  flex: 0 0 auto;
  width: 64rpx;
  height: 64rpx;
  margin: 0;
  padding: 0;
  min-height: 64rpx;
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

.cake-layout-toggle:active { transform: scale(0.94); }

.cake-layout-icon {
  width: 30rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
}

.cake-layout-icon.is-list { flex-direction: column; }

.cake-layout-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 3rpx;
  background: #57534B;
  transition-property: width, height;
  transition-duration: 120ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-layout-icon.is-list .cake-layout-dot { width: 30rpx; height: 5rpx; }

.cake-list-scroll { flex: 1; height: 0; min-height: 0; }

/* 两列卡片：用 grid 固定列宽，避免 `> *` 通用选择器（微信 WXSS 编译器不支持，会报 error at token `*`）。
   20rpx 列间距下每列约等于原来的 48.6% 宽度，一行一张卡片时仍靠左。 */
.cake-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
  padding: 24rpx 24rpx 0;
}

.cake-rows { display: flex; flex-direction: column; gap: 20rpx; padding: 24rpx 24rpx 0; }

.cake-list-more { display: flex; align-items: center; justify-content: center; padding: 30rpx 0 10rpx; }

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

.cake-bottom-space { height: 200rpx; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-category,
  .cake-sort { transition-duration: 0ms; }
}
</style>
