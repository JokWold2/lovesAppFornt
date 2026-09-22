<template>
  <view class="cake-page app-h5-screen">
    <CakeNavBar
      title=""
      tone="light"
      :progress="navProgress"
      :spacer="false"
      show-back
      :z-index="70"
    >
      <template #right>
        <button class="cake-home-cart" :aria-label="t('cake.cartTitle')" @click="openCart">
          <uni-icons type="cart" :size="20" color="#171717" />
          <text v-if="cartQuantity" class="cake-home-cart-badge">{{ cartBadgeText }}</text>
        </button>
      </template>
    </CakeNavBar>

    <scroll-view class="cake-scroll" scroll-y :show-scrollbar="false" @scroll="onScroll">
      <!-- 1. 顶部活动 Banner -->
      <view class="cake-hero">
        <swiper
          v-if="heroSlides.length > 1"
          class="cake-hero-swiper"
          :autoplay="true"
          :interval="4800"
          :duration="360"
          circular
          @change="onHeroChange"
        >
          <swiper-item v-for="slide in heroSlides" :key="slide.key">
            <view class="cake-hero-title-box">
              <text class="cake-hero-title">{{ slide.title }}</text>
              <text class="cake-hero-subtitle">{{ slide.subtitle }}</text>
            </view>
          </swiper-item>
        </swiper>
        <view v-else class="cake-hero-title-box">
          <text class="cake-hero-title">{{ heroSlides[0].title }}</text>
          <text class="cake-hero-subtitle">{{ heroSlides[0].subtitle }}</text>
        </view>

        <view v-if="heroSlides.length > 1" class="cake-hero-dots" aria-hidden="true">
          <view v-for="(slide, index) in heroSlides" :key="slide.key" class="cake-hero-dot" :class="{ 'is-active': index === heroIndex }"></view>
        </view>

        <!-- 优惠标签 -->
        <view class="cake-hero-terms">
          <view v-for="term in promoTerms" :key="term.title" class="cake-hero-term">
            <text class="cake-hero-term-main">{{ term.title }}</text>
            <text class="cake-hero-term-note">{{ term.note }}</text>
          </view>
        </view>

        <view class="cake-hero-showcase">
          <image class="cake-hero-image" src="/static/cake/promo-mooncake.png" mode="aspectFit" :alt="t('cake.promoImageAlt')" />
        </view>

        <button class="cake-hero-cta" @click="goPromoTransport">{{ t('cake.promoShipping') }}</button>
        <text class="cake-hero-disclaimer">{{ t('cake.promoDisclaimer') }}</text>
      </view>

      <!-- 2. 核心服务入口 -->
      <view class="cake-services">
        <view class="cake-service" role="button" :aria-label="t('cake.serviceCake')" @click="goShop">
          <view class="cake-service-icon"><uni-icons type="gift" :size="26" color="#C4551F" /></view>
          <text class="cake-service-title">{{ t('cake.serviceCake') }}</text>
          <text class="cake-service-note">{{ t('cake.serviceCakeNote') }}</text>
        </view>
        <view class="cake-service-divider" aria-hidden="true"></view>
        <view class="cake-service" role="button" :aria-label="t('cake.serviceBread')" @click="goOrder">
          <view class="cake-service-icon"><uni-icons type="shop" :size="26" color="#C4551F" /></view>
          <text class="cake-service-title">{{ t('cake.serviceBread') }}</text>
          <text class="cake-service-note">{{ t('cake.serviceBreadNote') }}</text>
        </view>
      </view>

      <!-- 3. 点单 / 月饼到家快捷入口 -->
      <view class="cake-quick">
        <view class="cake-quick-row" role="button" @click="goOrder">
          <view class="cake-quick-info">
            <text class="cake-quick-title">{{ t('cake.quickOrder') }}</text>
            <text class="cake-quick-note">{{ t('cake.quickOrderNote') }}</text>
          </view>
          <view class="cake-quick-action">{{ t('cake.goOrder') }}</view>
        </view>
        <view class="cake-quick-line" aria-hidden="true"></view>
        <view class="cake-quick-row" role="button" @click="goTransport">
          <view class="cake-quick-info">
            <text class="cake-quick-title">{{ t('cake.mooncakeHome') }}</text>
            <text class="cake-quick-note">{{ t('cake.mooncakeHomeNote') }}</text>
          </view>
          <view class="cake-quick-action is-solid">{{ t('cake.goBuy') }}</view>
        </view>
      </view>

      <!-- 4. 滚动通知 -->
      <view class="cake-notice">
        <view class="cake-notice-badge"><uni-icons type="info" :size="14" color="#A96A18" /></view>
        <view class="cake-notice-viewport">
          <view class="cake-notice-track">
            <text class="cake-notice-text">{{ t('cake.noticeHeadline') }}</text>
            <text class="cake-notice-text" aria-hidden="true">{{ t('cake.noticeHeadline') }}</text>
          </view>
        </view>
      </view>

      <!-- 5. 资产与会员码 -->
      <view class="cake-assets">
        <view class="cake-asset" role="button" @click="openAccount">
          <text class="cake-asset-label">{{ t('cake.assetBalance') }}</text>
          <text class="cake-asset-value">{{ t('cake.balanceHidden') }}</text>
        </view>
        <view class="cake-asset-line" aria-hidden="true"></view>
        <view class="cake-asset" role="button" @click="openAccount">
          <text class="cake-asset-label">{{ t('cake.assetCoupons') }}</text>
          <text class="cake-asset-value">{{ t('cake.couponsHidden') }}</text>
        </view>
        <view class="cake-asset-line" aria-hidden="true"></view>
        <view class="cake-asset is-code" role="button" @click="openAccount">
          <text class="cake-asset-label">{{ t('cake.assetMemberCode') }}</text>
          <view class="cake-asset-qr"><uni-icons type="scan" :size="20" color="#6E6961" /></view>
        </view>
      </view>

      <!-- 6. 快捷功能 -->
      <view class="cake-links">
        <view v-for="link in quickLinks" :key="link.title" class="cake-link" role="button" :aria-label="link.title" @click="onQuickLink(link)">
          <view class="cake-link-icon"><uni-icons :type="link.icon" :size="24" color="#A96A18" /></view>
          <text class="cake-link-title">{{ link.title }}</text>
          <text class="cake-link-note">{{ link.note }}</text>
        </view>
      </view>

      <!-- 7. 热销推荐 -->
      <view class="cake-section">
        <view class="cake-section-head">
          <text class="cake-section-title">{{ t('cake.hotProducts') }}</text>
          <button class="cake-section-more" @click="goTransport">{{ t('cake.viewAll') }}<uni-icons type="right" :size="14" color="#8A857C" /></button>
        </view>

        <CakeStateView
          v-if="hotState === 'loading'"
          state="loading"
          compact
          :title="t('cake.loading')"
        />
        <CakeStateView
          v-else-if="hotState === 'error'"
          state="error"
          compact
          :title="t('cake.loadFailed')"
          :hint="t('cake.loadMoreFailed')"
          @retry="loadHotProducts"
        />
        <CakeStateView
          v-else-if="hotState === 'empty'"
          state="empty"
          compact
          :title="t('cake.emptyProducts')"
          :hint="t('cake.emptyProductsHint')"
        />
        <view v-else class="cake-grid">
          <CakeProductCard
            v-for="product in hotProducts"
            :key="product.id"
            :product="product"
            :locale="locale"
            :pending="addingId === product.id"
            @open="openProduct"
            @add="addProduct"
          />
        </view>
      </view>

      <!-- 8. 会员活动 -->
      <view class="cake-member" role="button" @click="openMembership">
        <view class="cake-member-left">
          <text class="cake-member-eng">{{ t('cake.memberActivitiesEng') }}</text>
          <text class="cake-member-title">{{ t('cake.memberTitleFirst') }}</text>
          <text class="cake-member-title">{{ t('cake.memberTitleSecond') }}</text>
          <view class="cake-member-btn">{{ t('cake.memberCta') }}</view>
        </view>
        <view class="cake-member-star"><uni-icons type="star-filled" :size="46" color="#F0C558" /></view>
      </view>

      <!-- 9. 等级活动指南 -->
      <view class="cake-section-label">
        <view class="cake-label-line" aria-hidden="true"></view>
        <text class="cake-label-text">{{ t('cake.levelGuide') }}</text>
        <view class="cake-label-line" aria-hidden="true"></view>
      </view>
      <view class="cake-levels">
        <view v-for="(level, index) in levels" :key="level.name" class="cake-level" :style="{ backgroundColor: level.bg, color: level.fg }">
          <view class="cake-level-info">
            <text class="cake-level-name">{{ level.name }}</text>
            <text class="cake-level-eng">{{ level.eng }}</text>
          </view>
          <text class="cake-level-badge">V{{ index + 1 }}</text>
        </view>
      </view>

      <!-- 10. 更多服务 -->
      <view class="cake-section-label">
        <view class="cake-label-line" aria-hidden="true"></view>
        <text class="cake-label-text">{{ t('cake.moreServices') }}</text>
        <view class="cake-label-line" aria-hidden="true"></view>
      </view>
      <view class="cake-more">
        <view class="cake-more-row" role="button" @click="openProfile">
          <text class="cake-more-title">{{ t('cake.completeProfile') }}</text>
          <view class="cake-more-action">
            <text class="cake-more-action-text">{{ t('cake.birthdayReward') }}</text>
            <uni-icons type="right" :size="14" color="#8A857C" />
          </view>
        </view>
      </view>

      <view class="cake-bottom-space" aria-hidden="true"></view>
    </scroll-view>

    <CakeCartFab
      v-if="cartQuantity"
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
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CakeNavBar from '@/components/cake/CakeNavBar.vue'
import CakeCartFab from '@/components/cake/CakeCartFab.vue'
import CakeProductCard from '@/components/cake/CakeProductCard.vue'
import CakeSkuPanel from '@/components/cake/CakeSkuPanel.vue'
import CakeStateView from '@/components/cake/CakeStateView.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { getCakeBannersApi, getCakeCartApi, getCakeProductsApi, addCakeCartItemApi } from '@/api/cake.js'
import {
  CAKE_ROUTES,
  cakeCartState,
  createCakeScrollProgress,
  goCakePage,
  goCakeTab,
  pickCakeText
} from '@/utils/cake.js'

const locale = currentLocale
const { progress: navProgress, update: updateScroll } = createCakeScrollProgress(56)

const banners = ref([])
const heroIndex = ref(0)
const hotProducts = ref([])
const hotState = ref('loading')
const skuOpen = ref(false)
const skuProduct = ref(null)
const addingId = ref(0)

const cartQuantity = computed(() => cakeCartState.totalQuantity.value)
const cartAmountCents = computed(() => cakeCartState.itemsAmountCents.value)
const cartBadgeText = computed(() => (cartQuantity.value > 99 ? '99+' : String(cartQuantity.value)))

// 后端没配 Banner 时用内置活动文案兜底，保证首页永远有内容。
const heroSlides = computed(() => {
  const items = banners.value
    .map(banner => ({
      key: banner.code || banner.id,
      title: pickCakeText(banner.title, locale.value),
      subtitle: pickCakeText(banner.subtitle, locale.value)
    }))
    .filter(item => item.title || item.subtitle)
  if (items.length) return items
  return [{ key: 'fallback', title: t('cake.promoTitle'), subtitle: t('cake.promoSubtitle') }]
})

const promoTerms = computed(() => [
  { title: t('cake.promoTerm1'), note: t('cake.promoTerm1Note') },
  { title: t('cake.promoTerm2'), note: t('cake.promoTerm2Note') },
  { title: t('cake.promoTerm3'), note: t('cake.promoTerm3Note') }
])

const quickLinks = computed(() => [
  { title: t('cake.quickRecharge'), note: t('cake.quickRechargeNote'), icon: 'wallet', route: CAKE_ROUTES.account },
  { title: t('cake.quickCommunity'), note: t('cake.quickCommunityNote'), icon: 'gift', route: CAKE_ROUTES.transport },
  { title: t('cake.quickPoints'), note: t('cake.quickPointsNote'), icon: 'star', route: CAKE_ROUTES.shop },
  { title: t('cake.quickMember'), note: t('cake.quickMemberNote'), icon: 'person', route: CAKE_ROUTES.account }
])

// 等级卡片用一条暖色梯度，替换原来的六种随机配色，视觉更统一。
const levels = computed(() => [
  { name: t('cake.levelFirstMeet'), eng: t('cake.levelFirstMeetEn'), bg: '#F6EEE1', fg: '#6B4A2E' },
  { name: t('cake.levelCompany'), eng: t('cake.levelCompanyEn'), bg: '#EEDFC4', fg: '#5A4315' },
  { name: t('cake.levelCompanion'), eng: t('cake.levelCompanionEn'), bg: '#E3C8A4', fg: '#4F3512' },
  { name: t('cake.levelEnjoyment'), eng: t('cake.levelEnjoymentEn'), bg: '#D3A97C', fg: '#3F2708' },
  { name: t('cake.levelBelonging'), eng: t('cake.levelBelongingEn'), bg: '#B98A5C', fg: '#FFF6E9' },
  { name: t('cake.levelExclusive'), eng: t('cake.levelExclusiveEn'), bg: '#8C6240', fg: '#FFF3E4' }
])

function onScroll(event) {
  updateScroll(event?.detail?.scrollTop)
}

function onHeroChange(event) {
  heroIndex.value = Number(event?.detail?.current || 0)
}

function goShop() { goCakeTab(CAKE_ROUTES.shop) }
function goOrder() { goCakeTab(CAKE_ROUTES.order) }
function goTransport() { goCakeTab(CAKE_ROUTES.transport) }
// 从活动位进入的订单带上活动码，后端据此记录「下单月饼抽免单」的参与来源。
function goPromoTransport() { goCakeTab(`${CAKE_ROUTES.transport}?marketing=mooncake-free-order`) }
function openCart() { goCakePage(CAKE_ROUTES.cart) }
function openAccount() { goCakePage(CAKE_ROUTES.account) }
function openProfile() { goCakePage('/pages/my/myLifeShowEdit/myLifeShowEdit') }
function openMembership() { goCakePage('/pages/membership/upgrade') }

function onQuickLink(link) {
  if (link.route === CAKE_ROUTES.account) return openAccount()
  if (link.route === CAKE_ROUTES.transport) return goTransport()
  if (link.route === CAKE_ROUTES.shop) return goShop()
  return undefined
}

function openProduct(product) {
  goCakePage(`${CAKE_ROUTES.detail}?id=${product.id}`)
}

function closeSku() { skuOpen.value = false }

async function addProduct(product) {
  if (addingId.value) return
  // 有规格的商品先让用户选规格，避免直接加到购物车后还要回购物车改。
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

async function loadHotProducts() {
  hotState.value = 'loading'
  try {
    const data = await getCakeProductsApi({ sort: 'sales', pageSize: 4 })
    hotProducts.value = Array.isArray(data?.items) ? data.items : []
    hotState.value = hotProducts.value.length ? 'ready' : 'empty'
  } catch (_) {
    hotState.value = 'error'
  }
}

async function loadBanners() {
  try {
    const data = await getCakeBannersApi()
    banners.value = Array.isArray(data?.items) ? data.items : []
  } catch (_) {
    // Banner 是装饰性内容，失败时静默使用内置文案，不打扰用户。
    banners.value = []
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

onMounted(() => {
  loadBanners()
  loadHotProducts()
})

// 从详情页 / 购物车返回时刷新角标，避免数量与实际不一致。
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

/* H5 下 vh 会把地址栏高度算进来，页面顶部被顶掉一截；
   与站内其它全屏页统一，按真实可视区高度布局。
   app-h5-screen 只在 H5 模板上生效，选择器权重也高于上面的基础规则，
   所以这段不会影响小程序 / App。 */
/* #ifdef H5 */
.cake-page.app-h5-screen {
  width: auto;
  height: auto;
  min-height: 0;
  box-sizing: border-box;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 导航栏是透明的，正文压在下面；顶部按导航栏高度留白，避免标题贴边。 */
.cake-hero { padding-top: 150rpx; }
/* #endif */

.cake-scroll { flex: 1; height: 0; min-height: 0; }

.cake-home-cart {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  margin: 0;
  padding: 0;
  min-height: 72rpx;
  line-height: 1;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-home-cart-badge {
  position: absolute;
  top: -2rpx;
  right: -6rpx;
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

/* 1. Hero */
.cake-hero {
  background: linear-gradient(180deg, #D8BFA1 0%, #E7D6BE 46%, #F7F5F1 100%);
  padding: 0 32rpx 44rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cake-hero-swiper { width: 100%; height: 152rpx; }

.cake-hero-title-box {
  height: 152rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.cake-hero-title {
  font-size: 58rpx;
  line-height: 1.2;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: -1rpx;
  text-align: center;
  text-shadow: 0 4rpx 12rpx rgba(90, 62, 34, 0.18);
  overflow-wrap: anywhere;
}

.cake-hero-subtitle {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #FFFFFF;
  opacity: 0.92;
  text-align: center;
}

.cake-hero-dots {
  display: flex;
  gap: 8rpx;
  margin-top: 4rpx;
}

.cake-hero-dot {
  width: 12rpx;
  height: 6rpx;
  border-radius: 4rpx;
  background: rgba(255, 255, 255, 0.5);
  transition-property: width, background-color;
  transition-duration: 160ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-hero-dot.is-active { width: 28rpx; background: #FFFFFF; }

.cake-hero-terms {
  display: flex;
  gap: 14rpx;
  width: 100%;
  margin-top: 26rpx;
}

.cake-hero-term {
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.46);
  border: 1rpx solid rgba(140, 106, 79, 0.28);
  border-radius: 14rpx;
  padding: 12rpx 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cake-hero-term-main {
  font-size: 24rpx;
  font-weight: 700;
  color: #5C3D22;
  text-align: center;
  overflow-wrap: anywhere;
}

.cake-hero-term-note {
  margin-top: 4rpx;
  font-size: 18rpx;
  color: #7A5A3A;
  text-align: center;
  overflow-wrap: anywhere;
}

.cake-hero-showcase {
  width: 100%;
  height: 320rpx;
  margin-top: 30rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.34);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.cake-hero-image { width: 100%; height: 100%; }

.cake-hero-cta {
  margin: 32rpx 0 0;
  min-height: 88rpx;
  line-height: 88rpx;
  padding: 0 64rpx;
  border-radius: 44rpx;
  background: #7A5334;
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-hero-cta:active { transform: scale(0.97); }

.cake-hero-disclaimer {
  margin-top: 16rpx;
  font-size: 20rpx;
  color: #8A6E52;
  text-align: center;
}

/* 2. 服务入口 */
.cake-services {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 28rpx 28rpx 0 0;
  margin-top: -24rpx;
  padding: 36rpx 0 28rpx;
  position: relative;
  z-index: 2;
}

.cake-service {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 0 20rpx;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-service:active { transform: scale(0.97); }

.cake-service-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 26rpx;
  background: #FDF3EC;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-service-title {
  font-size: 32rpx;
  font-weight: 650;
  color: #26241F;
  text-align: center;
}

.cake-service-note {
  font-size: 22rpx;
  color: #8A857C;
  text-align: center;
}

.cake-service-divider { width: 1rpx; height: 96rpx; background: #EFEBE4; }

/* 3. 快捷入口 */
.cake-quick {
  background: #FFFFFF;
  padding: 0 28rpx 28rpx;
}

.cake-quick-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 26rpx 24rpx;
  background: #FBF9F5;
  border: 1rpx solid #F0EBE2;
  border-radius: 20rpx;
  transition-property: transform, background-color;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-quick-row:active { transform: scale(0.99); background: #F5F1E9; }

.cake-quick-line { height: 16rpx; }

.cake-quick-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.cake-quick-title { font-size: 28rpx; font-weight: 650; color: #26241F; }

.cake-quick-note { margin-top: 6rpx; font-size: 22rpx; color: #8A857C; }

.cake-quick-action {
  flex: 0 0 auto;
  font-size: 22rpx;
  padding: 8rpx 22rpx;
  border-radius: 26rpx;
  background: #FFFFFF;
  color: #7A5334;
  border: 1rpx solid #7A5334;
}

.cake-quick-action.is-solid { background: #7A5334; color: #FFFFFF; border-color: #7A5334; }

/* 4. 通知 */
.cake-notice {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #FDF6E7;
  padding: 16rpx 28rpx;
  overflow: hidden;
}

.cake-notice-badge {
  flex: 0 0 auto;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #F7E4BC;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-notice-viewport { flex: 1; min-width: 0; overflow: hidden; }

.cake-notice-track {
  display: flex;
  align-items: center;
  gap: 60rpx;
  white-space: nowrap;
  animation: cake-notice-marquee 26s linear infinite;
}

.cake-notice-text { font-size: 22rpx; color: #6B4A2E; }

@keyframes cake-notice-marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(-50% - 30rpx)); }
}

/* 5. 资产 */
.cake-assets {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  padding: 26rpx 0;
}

.cake-asset {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.cake-asset-label { font-size: 22rpx; color: #8A857C; }

.cake-asset-value { font-size: 30rpx; font-weight: 700; color: #26241F; }

.cake-asset-qr {
  width: 44rpx;
  height: 44rpx;
  border-radius: 10rpx;
  background: #F1EEE8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-asset-line { width: 1rpx; height: 52rpx; background: #EFEBE4; }

/* 6. 快捷功能 */
.cake-links {
  display: flex;
  background: #FFFFFF;
  padding: 8rpx 16rpx 32rpx;
}

.cake-link {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 0 6rpx;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-link:active { transform: scale(0.95); }

.cake-link-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #FBF3E4;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cake-link-title { font-size: 24rpx; font-weight: 600; color: #26241F; text-align: center; overflow-wrap: anywhere; }

.cake-link-note { font-size: 18rpx; color: #B4442A; text-align: center; overflow-wrap: anywhere; }

/* 7. 通用区块 */
.cake-section { margin-top: 20rpx; background: #FFFFFF; padding: 28rpx 28rpx 32rpx; }

.cake-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.cake-section-title { font-size: 32rpx; font-weight: 700; color: #26241F; }

.cake-section-more {
  margin: 0;
  padding: 0 4rpx;
  min-height: 48rpx;
  line-height: 48rpx;
  background: transparent;
  color: #8A857C;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
}

/* 两列卡片：用 grid 固定列宽，避免 `> *` 通用选择器（微信 WXSS 编译器不支持，会报 error at token `*`）。
   20rpx 列间距下每列约等于原来的 48.5% 宽度。 */
.cake-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.cake-section-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin: 32rpx 0 22rpx;
  padding: 0 28rpx;
}

.cake-label-line { flex: 1; max-width: 120rpx; height: 1rpx; background: #DED8CD; }

.cake-label-text {
  font-size: 24rpx;
  color: #8A857C;
  text-align: center;
  overflow-wrap: anywhere;
}

/* 8. 会员活动 */
.cake-member {
  margin: 20rpx 28rpx 0;
  padding: 32rpx 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(120deg, #FFF8F0 0%, #FBEDDD 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  transition-property: transform;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.cake-member:active { transform: scale(0.99); }

.cake-member-left { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.cake-member-eng { font-size: 18rpx; font-weight: 700; color: #A98C63; letter-spacing: 1rpx; }

.cake-member-title { margin-top: 8rpx; font-size: 34rpx; font-weight: 700; color: #33291D; line-height: 1.35; overflow-wrap: anywhere; }

.cake-member-btn {
  align-self: flex-start;
  margin-top: 20rpx;
  padding: 10rpx 26rpx;
  border-radius: 30rpx;
  background: #E4B27C;
  color: #FFFFFF;
  font-size: 22rpx;
}

.cake-member-star {
  flex: 0 0 auto;
  width: 132rpx;
  height: 132rpx;
  border-radius: 28rpx;
  background: #FBE9C8;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 9. 等级 */
.cake-levels {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 18rpx 0;
  padding: 0 28rpx;
}

.cake-level {
  width: 48.5%;
  min-height: 132rpx;
  border-radius: 20rpx;
  padding: 22rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.cake-level-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }

.cake-level-name { font-size: 30rpx; font-weight: 700; overflow-wrap: anywhere; }

.cake-level-eng { margin-top: 6rpx; font-size: 18rpx; opacity: 0.78; overflow-wrap: anywhere; }

.cake-level-badge {
  flex: 0 0 auto;
  font-size: 26rpx;
  font-weight: 700;
  font-style: italic;
  border: 2rpx solid currentColor;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
}

/* 10. 更多 */
.cake-more { padding: 0 28rpx; }

.cake-more-row {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 32rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.cake-more-title { font-size: 30rpx; font-weight: 650; color: #26241F; }

.cake-more-action { display: flex; align-items: center; gap: 6rpx; }

.cake-more-action-text { font-size: 24rpx; color: #8A857C; }

.cake-bottom-space { height: 48rpx; }

button::after { border: 0; }

@media (prefers-reduced-motion: reduce) {
  .cake-notice-track { animation: none; }
  .cake-hero-cta,
  .cake-service,
  .cake-quick-row,
  .cake-link,
  .cake-member,
  .cake-hero-dot { transition-duration: 0ms; }
}
</style>
