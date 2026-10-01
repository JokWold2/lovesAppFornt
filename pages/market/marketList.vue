<template>
  <view class="page app-h5-min-screen">
    <view class="title">{{ title }}</view>
    <view v-if="marketLocked" class="access-note" @click="goUpgrade"><uni-icons type="locked" size="16" color="#775E25"/><text>{{ t('marketAccess.banner') }}</text></view>
    <view v-if="loading" class="state">{{ t('home.loading') }}</view>
    <view v-else-if="error" class="state" @click="load">{{ t('marketSearch.failed') }}</view>
    <view v-else-if="!posts.length" class="state">{{ t('market.noContent', { title }) }}</view>
    <view v-else class="waterfall">
      <view v-for="(column, index) in columns" :key="index" class="column">
        <view v-for="post in column" :key="post.id" class="card" @click="openFeed(post)">
          <template v-if="post.membershipLocked">
            <view class="locked-cover-frame"><MarketLockedCover :src="post.lockedPreviewUrl || ''" /></view>
            <view class="card-body"><text class="post-title">{{ t(post.category === 'second_hand' ? 'marketAccess.secondHandLockedTitle' : 'marketAccess.antiqueLockedTitle') }}</text><text class="locked-price">{{ t('marketAccess.priceLocked') }}</text><text class="locked-hint">{{ t('marketAccess.cardHint') }}</text><button class="locked-upgrade" @click.stop="goUpgrade">{{ t('marketAccess.upgrade') }}</button></view>
          </template>
          <template v-else>
            <image v-if="imageOf(post)" class="cover" :src="imageOf(post)" mode="widthFix"/><view v-else class="empty-cover">{{ t('market.noImage') }}</view>
            <view class="card-body"><MarketAuctionStatus :auction="post.auction"/><text class="post-title">{{ post.title }}</text><text class="price">¥ {{ post.price }}</text><view class="foot"><text>{{ post.author_name || t('moment.user') }}</text><text>♡ {{ post.likeCount || 0 }}</text></view></view>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import MarketAuctionStatus from '@/components/market/MarketAuctionStatus.vue'
import MarketLockedCover from '@/components/market/MarketLockedCover.vue'
import { getMarketPostsApi } from '@/api/market.js'
import { marketFeedRoute } from '@/utils/marketNavigation.js'
import { openMembershipUpgrade } from '@/utils/membership.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'

const category = ref('antique'), posts = ref([]), loading = ref(true), error = ref(false), marketLocked = ref(false)
const title = computed(() => category.value === 'antique' ? t('home.antique') : t('home.secondHand'))
const columns = computed(() => [posts.value.filter((_, index) => index % 2 === 0), posts.value.filter((_, index) => index % 2 === 1)])
function imageOf(post) { return Array.isArray(post.images) ? post.images.find(Boolean) || '' : '' }
function goUpgrade() { openMembershipUpgrade('market') }
async function load() {
  loading.value = true; error.value = false
  try {
    const data = await getMarketPostsApi({ category: category.value })
    posts.value = data?.posts || []
    marketLocked.value = !!data?.membershipLocked || posts.value.some(post => post.membershipLocked)
  } catch (cause) {
    if (cause?.code === 'MEMBERSHIP_REQUIRED' && cause?.action === 'market') { marketLocked.value = true; goUpgrade() }
    else error.value = true
  } finally { loading.value = false }
}
function updatePageTitle() { uni.setNavigationBarTitle({ title: title.value }) }
function openFeed(post) { uni.navigateTo({ url: marketFeedRoute(category.value, post.id, post.membershipLocked ? post.lockedPreviewUrl : '') }) }
onLoad(options => { if (options.category === 'second_hand') category.value = 'second_hand'; updatePageTitle() })
onShow(load)
watch(currentLocale, updatePageTitle)
</script>

<style scoped lang="scss">
.page{background:#f5f5f7;padding:20rpx 16rpx}
.title{padding:12rpx 12rpx 24rpx;font-size:38rpx;font-weight:700}
.access-note{display:flex;align-items:center;gap:7px;margin:0 4rpx 18rpx;padding:11px;border-radius:12px;background:#f8f1df;color:#775E25;font-size:12px;line-height:1.5}
.access-note text{flex:1;min-width:0;overflow-wrap:anywhere}
.state{padding:160rpx 24rpx;text-align:center;color:#999;font-size:14px;overflow-wrap:anywhere}
.waterfall{display:flex;align-items:flex-start;gap:16rpx}.column{width:calc(50% - 8rpx);min-width:0}
.card{overflow:hidden;margin-bottom:16rpx;border-radius:18rpx;background:#fff}
.cover{display:block;width:100%;min-height:200rpx;background:#eee}.empty-cover{display:flex;height:260rpx;align-items:center;justify-content:center;background:#eee;color:#999}
.locked-cover-frame{height:174px;overflow:hidden}
.card-body{padding:18rpx}.post-title{display:block;color:#292825;font-size:28rpx;font-weight:600;line-height:1.5;overflow-wrap:anywhere}
.price{display:block;margin-top:10rpx;color:#775E25;font-size:28rpx;font-weight:700}.foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;margin-top:14rpx;color:#999;font-size:21rpx}
.locked-price,.locked-hint{display:block;margin-top:5px;font-size:12px;line-height:1.5;overflow-wrap:anywhere}.locked-price{color:#775E25;font-weight:600}.locked-hint{color:#8b8781;min-height:36px;font-size:11px}
.locked-upgrade{display:flex;align-items:center;justify-content:center;width:100%;min-height:39px;margin:10px 0 0;padding:6px 8px;border:0;border-radius:22px;background:#f1e4bd;color:#775E25;font-size:12px;font-weight:600;line-height:1.35;white-space:normal;overflow-wrap:anywhere;transition:transform 140ms cubic-bezier(.23,1,.32,1)}
.locked-upgrade::after{border:0}.locked-upgrade:active{transform:scale(.97)}
@media (prefers-reduced-motion: reduce){.locked-upgrade{transition:none}}
</style>
<style scoped>
/* #ifdef H5 */
.page { padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); }
/* #endif */
</style>
<style scoped>
/* #ifndef H5 */
.page { min-height: 100vh; }
/* #endif */
</style>
