<template>
  <view class="market-section">
    <view class="search"><uni-icons type="search" size="23" color="#555"/><input v-model="keyword" :placeholder="t(category === 'antique' ? 'marketSearch.antique' : 'marketSearch.secondHand')" maxlength="100" confirm-type="search" @confirm="search"/><view v-if="keyword" class="clear" @click="clearSearch"><uni-icons type="clear" size="18" color="#aaa"/></view><view class="search-submit" @click="search"><uni-icons type="arrow-right" size="24" color="#333"/></view></view>
    <view class="toolbar"><view @click="openFilters">{{ t('marketSearch.' + sort) }} <uni-icons type="bottom" size="12"/></view><view @click="openFilters"><uni-icons type="settings" size="18"/> {{ t('marketSearch.filter') }}<text v-if="hasPrice" class="dot"> •</text></view></view>
    <view v-if="loading && !posts.length" class="state">{{ t('home.loading') }}</view>
    <view v-else-if="error && !posts.length" class="state" @click="load(true)">{{ t('marketSearch.failed') }}</view>
    <view v-else-if="!posts.length" class="state">{{ t('marketSearch.empty') }}</view>
    <view v-else class="waterfall">
      <view v-for="(column, index) in columns" :key="index" class="column">
        <view v-for="post in column" :key="post.id" class="card" @click="openPost(post.id)">
          <image v-if="imageOf(post)" class="cover" :src="imageOf(post)" mode="widthFix"/><view v-else class="empty-cover">{{ t('market.noImage') }}</view>
          <view class="card-body"><MarketAuctionStatus :auction="post.auction"/><text class="post-title ellipsis">{{ post.title }}</text><text class="price">¥ {{ post.price }}</text><text v-if="post.description" class="description ellipsis">{{ post.description }}</text>
            <view class="foot"><view class="author"><image v-if="post.author_avatar_url" :src="post.author_avatar_url" mode="aspectFill"/><view v-else class="avatar-placeholder"><uni-icons type="person-filled" size="16" color="#bbb"/></view><text class="ellipsis">{{ post.author_name || t('moment.user') }}</text></view>
              <view class="actions"><view @click.stop="like(post)"><uni-icons :type="post.isLiked ? 'heart-filled' : 'heart'" size="18" :color="post.isLiked ? '#c49b22' : '#96969c'"/><text>{{ post.likeCount || 0 }}</text></view><view @click.stop="openPost(post.id, true)"><uni-icons type="chatbubble" size="18" color="#96969c"/><text>{{ post.commentCount || 0 }}</text></view></view>
            </view>
          </view>
        </view>
      </view>
    </view>
    <view v-if="posts.length && (hasMore || error)" class="load-more" @click="load(false)">{{ loading ? t('home.loading') : error ? t('marketSearch.failed') : t('marketSearch.more') }}</view>
    <SlideUpPanel fixed :open="filterOpen" :z-index="300" :label="t('marketSearch.filter')" @dismiss="filterOpen = false">
      <view class="filter-sheet"><view class="handle"/><view class="sheet-title"><text>{{ t('marketSearch.filter') }}</text><view @click="filterOpen = false"><uni-icons type="closeempty" size="24"/></view></view>
        <text class="field-label">{{ t('marketSearch.range') }}</text><view class="price-fields"><view><text>¥</text><input v-model="draftMin" type="digit" maxlength="12" :placeholder="t('marketSearch.min')"/></view><text>–</text><view><text>¥</text><input v-model="draftMax" type="digit" maxlength="12" :placeholder="t('marketSearch.max')"/></view></view>
        <text class="field-label">{{ t('marketSearch.sort') }}</text><view class="sort-options"><view v-for="option in sorts" :key="option" :class="{ selected: draftSort === option }" @click="draftSort = option">{{ t('marketSearch.' + option) }}</view></view>
        <view class="sheet-actions"><view @click="resetDraft">{{ t('marketSearch.reset') }}</view><view class="confirm" @click="applyFilters">{{ t('marketSearch.confirm') }}</view></view>
      </view>
    </SlideUpPanel>
  </view>
</template>
<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { onBackPress } from '@dcloudio/uni-app'
import MarketAuctionStatus from '@/components/market/MarketAuctionStatus.vue'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import { getMarketPostsApi, toggleMarketLikeApi } from '@/api/market.js'
import { t } from '@/utils/localeRuntime.js'
import { marketFeedRoute } from '@/utils/marketNavigation.js'
const props = defineProps({ category: { type: String, required: true }, title: String })
const posts = ref([]), loading = ref(false), error = ref(false), hasMore = ref(false), page = ref(1)
const keyword = ref(''), appliedKeyword = ref(''), minPrice = ref(''), maxPrice = ref(''), sort = ref('latest')
const filterOpen = ref(false), draftMin = ref(''), draftMax = ref(''), draftSort = ref('latest')
const sorts = ['latest', 'price_asc', 'price_desc'], pendingLikes = new Set()
let revision = 0
const columns = computed(() => [posts.value.filter((_, i) => i % 2 === 0), posts.value.filter((_, i) => i % 2 === 1)])
const hasPrice = computed(() => minPrice.value !== '' || maxPrice.value !== '')
function imageOf(post) { return Array.isArray(post.images) ? post.images.find(Boolean) || '' : '' }
function openPost(id, comments = false) { uni.navigateTo({ url: marketFeedRoute(props.category, id) + (comments ? '&openComments=1' : '') }) }
async function load(reset = false) {
  if (!reset && (loading.value || (!hasMore.value && !error.value))) return
  const current = ++revision, nextPage = reset ? 1 : page.value + 1
  if (reset) { posts.value = []; page.value = 0 }
  loading.value = true; error.value = false
  try {
    const data = await getMarketPostsApi({ category: props.category, keyword: appliedKeyword.value, minPrice: minPrice.value, maxPrice: maxPrice.value, sort: sort.value, page: nextPage, pageSize: 20 })
    if (current !== revision) return
    posts.value = reset ? data.posts || [] : [...posts.value, ...(data.posts || [])]
    page.value = nextPage; hasMore.value = !!data.hasMore
  } catch (_) { if (current === revision) error.value = true }
  finally { if (current === revision) loading.value = false }
}
function search() { appliedKeyword.value = keyword.value.trim(); load(true) }
function clearSearch() { keyword.value = ''; search() }
function openFilters() { draftMin.value = minPrice.value; draftMax.value = maxPrice.value; draftSort.value = sort.value; filterOpen.value = true }
function resetDraft() { draftMin.value = ''; draftMax.value = ''; draftSort.value = 'latest' }
function applyFilters() {
  const min = draftMin.value.trim(), max = draftMax.value.trim()
  if ([min, max].some(v => v !== '' && (!/^\d+(\.\d{1,2})?$/.test(v) || !Number.isFinite(Number(v)))) || (min !== '' && max !== '' && Number(min) > Number(max))) {
    uni.showToast({ title: t('marketSearch.invalid'), icon: 'none' }); return
  }
  minPrice.value = min; maxPrice.value = max; sort.value = draftSort.value; filterOpen.value = false; search()
}
async function like(post) {
  if (pendingLikes.has(post.id)) return
  pendingLikes.add(post.id)
  try { const data = await toggleMarketLikeApi(post.id); post.isLiked = data.isLiked; post.likeCount = data.likeCount }
  catch (_) { uni.showToast({ title: t('home.actionFailed'), icon: 'none' }) }
  finally { pendingLikes.delete(post.id) }
}
onBackPress(() => { if (filterOpen.value) { filterOpen.value = false; return true } })
watch(() => props.category, () => { keyword.value = ''; appliedKeyword.value = ''; minPrice.value = ''; maxPrice.value = ''; sort.value = 'latest'; filterOpen.value = false; load(true) }, { immediate: true })
onBeforeUnmount(() => { revision++ })
</script>
<style scoped>
.market-section{padding:12px 12px 100px;background:#f5f5f7}.search{display:flex;align-items:center;gap:9px;background:#fff;border-radius:30px;padding:8px 9px 8px 16px}.search input{flex:1;min-width:0;font-size:14px;height:32px}.clear{padding:6px}.search-submit{width:36px;height:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#ffce00;border-radius:50%}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 2px;color:#454545;font-size:13px}.toolbar>view{padding:6px 0;display:flex;align-items:center;gap:4px}.dot{color:#c49b22}.waterfall{display:flex;align-items:flex-start;gap:10px}.column{width:calc(50% - 5px);min-width:0}.card{background:#fff;border-radius:18px;overflow:hidden;margin-bottom:10px}.cover{display:block;width:100%;background:#eeedef}.empty-cover{height:150px;display:flex;align-items:center;justify-content:center;background:#eeedef;color:#999;font-size:12px}.card-body{padding:9px 10px 8px}.ellipsis{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.post-title{font-size:14px;font-weight:600;color:#292825;line-height:1.5}.price{display:block;color:#c49b22;font-size:15px;font-weight:700;margin-top:3px}.description{color:#939298;font-size:12px;margin-top:6px;line-height:1.5}.foot{display:flex;flex-wrap:wrap;align-items:center;gap:3px 6px;margin-top:7px;font-size:10px;color:#96969c}.author{display:flex;align-items:center;gap:4px;min-width:0;flex:1 1 48px}.author image,.avatar-placeholder{width:22px;height:22px;border-radius:50%;flex-shrink:0;background:#f4f4f4}.avatar-placeholder{display:flex;align-items:center;justify-content:center}.actions{display:flex;align-items:center;gap:6px;margin-left:auto}.actions>view{display:flex;align-items:center;gap:3px;min-height:30px}.state,.load-more{text-align:center;padding:30px 12px;color:#999;font-size:14px}.load-more{padding:16px}.filter-sheet{background:#fff;padding:10px 20px 24px;padding-bottom:calc(24px + env(safe-area-inset-bottom));max-height:80vh;overflow-y:auto;box-sizing:border-box}.handle{width:36px;height:4px;border-radius:3px;background:#d6d6dc;margin:0 auto 18px}.sheet-title{display:flex;align-items:center;justify-content:space-between;font-size:20px;font-weight:600;margin-bottom:24px}.sheet-title>view{padding:6px}.field-label{display:block;font-size:15px;font-weight:600;margin:20px 0 12px}.price-fields{display:flex;align-items:center;gap:10px}.price-fields>view{display:flex;align-items:center;gap:8px;flex:1;min-width:0;background:#f5f5f7;border-radius:16px;padding:14px 12px}.price-fields input{width:100%;min-width:0;font-size:14px}.sort-options{display:flex;flex-wrap:wrap;gap:8px}.sort-options>view{border:1px solid #eee;border-radius:24px;padding:12px 14px;font-size:13px}.sort-options .selected{background:#ffce00;border-color:#ffce00}.sheet-actions{display:flex;gap:12px;margin-top:32px}.sheet-actions>view{flex:1;text-align:center;border:1px solid #ddd;border-radius:28px;padding:14px 10px;font-size:15px}.sheet-actions .confirm{background:#ffce00;border-color:#ffce00;flex:1.3}.search-submit:active,.sheet-actions>view:active{opacity:.8}
</style>
