<template>
  <view class="page app-h5-screen">
    <view class="search-fixed-panel" :class="{ 'search-fixed-panel--scrolled': headerScrollTop > 0 }">
      <ChatPageHeader glass :title="t('search.title')" :scroll-top="headerScrollTop" />
      <view v-if="canSearch" class="search-controls">
        <view class="name-search-card">
          <view class="search-field">
            <view class="search-icon" aria-hidden="true" />
            <input v-model="form.name" class="name-input" :placeholder="t('search.nameSearchPlaceholder')" confirm-type="search" @confirm="onSearch" />
            <button class="search-submit" :disabled="searching" :aria-label="t('search.search')" hover-class="search-submit--pressed" @tap="onSearch"><view class="search-arrow" /></button>
          </view>
          <text class="filter-label">{{ t('search.genderMultiple') }}</text>
          <view class="primary-chips">
            <button v-for="option in genderOptions" :key="option" class="primary-chip" :class="{ selected: form.gender.includes(option) }" hover-class="chip-pressed" @tap="toggle(form.gender, option)">
              <view v-if="form.gender.includes(option)" class="chip-check" /><text>{{ choiceLabel(option) }}</text>
            </button>
            <button class="primary-chip" :class="{ selected: form.gender.length === 0 }" hover-class="chip-pressed" @tap="clearGender"><text>{{ t('search.unrestricted') }}</text></button>
          </view>
        </view>

        <button class="more-filter-row" hover-class="more-filter-row--pressed" @tap="openAdvancedFilters">
          <view class="sliders-icon" aria-hidden="true"><view /><view /><view /></view>
          <text class="more-filter-label">{{ t('search.moreFilters') }}</text>
          <text v-if="advancedCount" class="selected-count">{{ t('search.selectedCount', { count: advancedCount }) }}</text>
          <view class="chevron" />
        </button>
      </view>
    </view>

    <view v-if="!canSearch" class="search-membership-gate">
      <text>{{ entitlementLoading ? t('home.loading') : t('deck.searchLocked') }}</text>
      <button v-if="!entitlementLoading" class="membership-button" hover-class="press-scale" @tap="openMembershipUpgrade('search')">{{ t('deck.viewMembership') }}</button>
    </view>

    <scroll-view v-else scroll-y class="results-scroll app-h5-scroll" :scroll-into-view="contentScrollIntoView" scroll-with-animation @scroll="onContentScroll">
      <view class="results-content">
      <view id="search-results" class="results-section">
        <view class="results-heading"><text>{{ t('search.searchResults') }}</text><text v-if="hasSearched && !searching" class="results-total">{{ t('search.total', { count: total }) }}</text></view>
        <view v-if="searching && results.length === 0" class="state-card"><text>{{ t('search.searching') }}</text></view>
        <view v-else-if="!hasSearched" class="state-card"><text>{{ t('search.searchHint') }}</text></view>
        <view v-else-if="results.length === 0" class="state-card"><text>{{ t('search.noResults') }}</text></view>
        <view v-else class="result-list">
          <button v-for="item in results" :key="item.id" class="result-item" hover-class="result-item--pressed" @tap="onResultClick(item)">
            <view class="result-avatar"><image v-if="item.avatar_url" :src="item.avatar_url" mode="aspectFill" class="avatar-img" /><text v-else>{{ candidateInitial(item) }}</text></view>
            <view class="result-info"><text class="result-name">{{ candidateName(item) }}</text><text class="result-meta">{{ candidateMeta(item) }}</text><text v-if="candidateDetail(item)" class="result-detail">{{ candidateDetail(item) }}</text></view>
            <view class="chevron" />
          </button>
          <button v-if="results.length < total" class="load-more" :disabled="searching" @tap="loadMore">{{ searching ? t('search.searching') : t('search.loadMore') }}</button>
          <text v-else class="all-loaded">{{ t('search.allLoaded') }}</text>
        </view>
      </view>
      <view class="scroll-spacer" />
      </view>
    </scroll-view>

    <ChatSheet :open="showAdvancedFilters" :label="t('search.moreFilters')" :busy="searching" @dismiss="closeAdvancedFilters">
      <view class="advanced-sheet">
        <view class="sheet-header">
          <view><text class="sheet-title">{{ t('search.moreFilters') }}</text><text v-if="advancedCount" class="sheet-count">{{ t('search.selectedCount', { count: advancedCount }) }}</text></view>
          <button class="sheet-close" :aria-label="t('search.close')" @tap="closeAdvancedFilters">×</button>
        </view>
        <scroll-view scroll-y class="advanced-scroll app-h5-scroll">
          <view class="sheet-section">
            <text class="sheet-label">{{ t('search.generation') }}</text>
            <view class="filter-chips"><button v-for="option in generationOptions" :key="option" class="filter-chip" :class="{ selected: form.generation.includes(option) }" @tap="toggle(form.generation, option)"><view v-if="form.generation.includes(option)" class="chip-check" /><text>{{ choiceLabel(option) }}</text></button></view>
          </view>
          <view class="sheet-section">
            <text class="sheet-label">{{ t('search.status') }}</text>
            <view class="filter-chips"><button v-for="option in statusOptions" :key="option" class="filter-chip" :class="{ selected: form.status.includes(option) }" @tap="toggle(form.status, option)"><view v-if="form.status.includes(option)" class="chip-check" /><text>{{ choiceLabel(option) }}</text></button></view>
          </view>
          <view class="sheet-section">
            <text class="sheet-label">{{ t('search.preferredCountry') }}</text>
            <view class="filter-chips"><button v-for="option in countryOptions" :key="option" class="filter-chip" :class="{ selected: form.preferredCountries.includes(option) }" @tap="toggle(form.preferredCountries, option)"><view v-if="form.preferredCountries.includes(option)" class="chip-check" /><text>{{ choiceLabel(option) }}</text></button></view>
          </view>
          <view class="sheet-section range-section">
            <text class="sheet-label">{{ t('search.ageRange') }}</text>
            <view class="range-row"><picker class="range-picker" mode="selector" :range="ageOptionLabels" @change="event => form.ageMin = ageOptions[event.detail.value]"><view class="range-value">{{ choiceLabel(form.ageMin || '全部') }}</view></picker><text class="range-separator">—</text><picker class="range-picker" mode="selector" :range="ageOptionLabels" @change="event => form.ageMax = ageOptions[event.detail.value]"><view class="range-value">{{ choiceLabel(form.ageMax || '全部') }}</view></picker></view>
          </view>
          <view class="sheet-section range-section">
            <text class="sheet-label">{{ t('search.heightRange') }}</text>
            <view class="range-row"><picker class="range-picker" mode="selector" :range="heightOptionLabels" @change="event => form.heightMin = heightOptions[event.detail.value]"><view class="range-value">{{ choiceLabel(form.heightMin || '全部') }}</view></picker><text class="range-separator">—</text><picker class="range-picker" mode="selector" :range="heightOptionLabels" @change="event => form.heightMax = heightOptions[event.detail.value]"><view class="range-value">{{ choiceLabel(form.heightMax || '全部') }}</view></picker></view>
          </view>
          <view class="sheet-section"><button class="toggle-row" @tap="form.topGun = !form.topGun"><text>{{ t('search.topGun') }}</text><view class="square-check" :class="{ selected: form.topGun }"><view v-if="form.topGun" /></view></button></view>
          <view class="sheet-section"><text class="sheet-label">{{ t('search.jobs') }}</text><view class="filter-chips"><button v-for="option in jobOptions" :key="option" class="filter-chip" :class="{ selected: form.jobs.includes(option) }" @tap="toggle(form.jobs, option)"><view v-if="form.jobs.includes(option)" class="chip-check" /><text>{{ choiceLabel(option) }}</text></button></view></view>
          <view class="sheet-section"><text class="sheet-label">{{ t('search.faith') }}</text><view class="filter-chips"><button v-for="option in faithOptions" :key="option" class="filter-chip" :class="{ selected: form.faithLife.includes(option) }" @tap="toggle(form.faithLife, option)"><view v-if="form.faithLife.includes(option)" class="chip-check" /><text>{{ choiceLabel(option) }}</text></button></view></view>
          <view class="sheet-section"><button class="toggle-row" @tap="form.wantBlessing2026 = !form.wantBlessing2026"><text>{{ t('search.blessing2026') }}</text><view class="square-check" :class="{ selected: form.wantBlessing2026 }"><view v-if="form.wantBlessing2026" /></view></button></view>
          <view class="sheet-section tools-section">
            <view class="tools-heading"><text class="sheet-label">{{ t('search.tools') }}</text><button class="recommend-link" @tap="onFindRecommend">{{ t('search.recommend') }}</button></view>
            <text class="tools-description">{{ t('search.toolsDescription') }}</text>
            <view class="tool-row"><button class="toggle-row" @tap="form.tools.hands.enabled = !form.tools.hands.enabled"><text>{{ t('search.hands') }}</text><view class="square-check" :class="{ selected: form.tools.hands.enabled }"><view v-if="form.tools.hands.enabled" /></view></button><view v-if="form.tools.hands.enabled" class="filter-chips sub-options"><button v-for="option in ['右拇指', '左拇指']" :key="option" class="filter-chip" :class="{ selected: form.tools.hands.value === option }" @tap="form.tools.hands.value = option"><text>{{ choiceLabel(option) }}</text></button></view></view>
            <view class="tool-row"><button class="toggle-row" @tap="form.tools.yinyang.enabled = !form.tools.yinyang.enabled"><text>{{ t('search.yinYang') }}</text><view class="square-check" :class="{ selected: form.tools.yinyang.enabled }"><view v-if="form.tools.yinyang.enabled" /></view></button><view v-if="form.tools.yinyang.enabled" class="filter-chips sub-options"><button v-for="option in ['陽', '陰']" :key="option" class="filter-chip" :class="{ selected: form.tools.yinyang.value === option }" @tap="form.tools.yinyang.value = option"><text>{{ choiceLabel(option) }}</text></button></view></view>
            <view class="tool-row"><button class="toggle-row" @tap="form.tools.fiveElements.enabled = !form.tools.fiveElements.enabled"><text>{{ t('search.fiveElements') }}</text><view class="square-check" :class="{ selected: form.tools.fiveElements.enabled }"><view v-if="form.tools.fiveElements.enabled" /></view></button><view v-if="form.tools.fiveElements.enabled" class="filter-chips sub-options"><button v-for="option in fiveElementOptions" :key="option" class="filter-chip" :class="{ selected: form.tools.fiveElements.values.includes(option) }" @tap="toggle(form.tools.fiveElements.values, option)"><text>{{ choiceLabel(option) }}</text></button></view></view>
            <view class="tool-row"><button class="toggle-row" @tap="form.tools.enneagram.enabled = !form.tools.enneagram.enabled"><text>{{ t('search.enneagram') }}</text><view class="square-check" :class="{ selected: form.tools.enneagram.enabled }"><view v-if="form.tools.enneagram.enabled" /></view></button><view v-if="form.tools.enneagram.enabled" class="filter-chips sub-options"><button v-for="option in enneagramOptions" :key="option" class="filter-chip" :class="{ selected: form.tools.enneagram.values.includes(option) }" @tap="toggle(form.tools.enneagram.values, option)"><text>{{ choiceLabel(option) }}</text></button></view></view>
            <view class="tool-row"><button class="toggle-row" @tap="form.tools.mbti.enabled = !form.tools.mbti.enabled"><text>MBTI</text><view class="square-check" :class="{ selected: form.tools.mbti.enabled }"><view v-if="form.tools.mbti.enabled" /></view></button><picker v-if="form.tools.mbti.enabled" class="mbti-picker" mode="selector" :range="mbtiOptions" @change="event => form.tools.mbti.value = mbtiOptions[event.detail.value]"><view class="range-value">{{ form.tools.mbti.value || t('search.select') }}</view></picker></view>
          </view>
          <view class="sheet-scroll-spacer" />
        </scroll-view>
        <view class="sheet-actions"><button class="reset-button" hover-class="press-scale" @tap="onReset">{{ t('search.reset') }}</button><button class="apply-button" :disabled="searching" hover-class="press-scale" @tap="applyAdvancedFilters">{{ searching ? t('search.searching') : t('search.applyFilters') }}</button></view>
      </view>
    </ChatSheet>
    <ProfileDetailSheet :profile-id="sheetProfileId" :page-visible="sheetPageVisible" @closed="closeProfileSheet" />
  </view>
</template>

<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { searchCandidatesApi } from '@/api/index.js'
import { getMembershipApi } from '@/api/membership.js'
import ChatPageHeader from '@/components/chat/ChatPageHeader.vue'
import ChatSheet from '@/components/chat/ChatSheet.vue'
import ProfileDetailSheet from '@/components/profile/ProfileDetailSheet.vue'
import { handleMembershipError, openMembershipUpgrade } from '@/utils/membership.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { searchOptionLabel } from '@/utils/searchPresentation.js'
import { buildSearchPayload, countAdvancedFilters, createSearchForm } from '@/utils/searchCandidateFilters.js'
import { useProfileDetailSheet } from '@/utils/useProfileDetailSheet.js'

const { profileId: sheetProfileId, pageVisible: sheetPageVisible, open: openProfileSheet, close: closeProfileSheet } = useProfileDetailSheet()
const form = reactive(createSearchForm())
const genderOptions = ['女', '男']
const generationOptions = ['祝福子女', '一世會員']
const statusOptions = ['申請者', '候選人']
const countryOptions = ['Korea', 'Japan(+Taiwan)', 'North America', 'Latin America', 'Asia', 'Europe(+Middle East)', 'Africa']
const jobOptions = ['公職幹部', '學生', '上班族', '自營商', '公務員', '專業人員', '職業軍人', '其他']
const faithOptions = ['非常傳統', '有彈性', '妥協']
const fiveElementOptions = ['木', '火', '土', '金', '水']
const enneagramOptions = ['1: 改革型', '2: 助人型', '3: 成就型', '4: 藝術型', '5: 智慧型', '6: 忠誠型', '7: 遠見型', '8: 領導型', '9: 和平型']
const mbtiOptions = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']
const ageOptions = ['全部', ...Array.from({ length: 63 }, (_, index) => `${18 + index}`)]
const heightOptions = ['全部', ...Array.from({ length: 71 }, (_, index) => `${140 + index}`)]
const choiceLabel = value => searchOptionLabel(currentLocale.value, value)
const ageOptionLabels = computed(() => ageOptions.map(choiceLabel))
const heightOptionLabels = computed(() => heightOptions.map(choiceLabel))
const advancedCount = computed(() => countAdvancedFilters(form))
const PAGE_SIZE = 20
const searching = ref(false)
const canSearch = ref(false)
const entitlementLoading = ref(true)
const hasSearched = ref(false)
const results = ref([])
const total = ref(0)
const page = ref(1)
const contentScrollIntoView = ref('')
const showAdvancedFilters = ref(false)
const headerScrollTop = ref(0)

onShow(async () => {
  entitlementLoading.value = true
  canSearch.value = false
  try { canSearch.value = (await getMembershipApi()).canSearch === true }
  catch (error) { if (!handleMembershipError(error)) uni.showToast({ title: t('home.loadFailed'), icon: 'none' }) }
  finally { entitlementLoading.value = false }
  if (!canSearch.value) { results.value = []; total.value = 0 }
})

function toggle (list, value) { const index = list.indexOf(value); if (index >= 0) list.splice(index, 1); else list.push(value) }
function onContentScroll (event) { headerScrollTop.value = Number(event?.detail?.scrollTop) || 0 }
function clearGender () { form.gender.splice(0) }
function openAdvancedFilters () { showAdvancedFilters.value = true }
function closeAdvancedFilters () { if (!searching.value) showAdvancedFilters.value = false }
function onResultClick (item) { openProfileSheet(item.id) }
function onFindRecommend () { uni.showToast({ title: t('search.inDevelopment'), icon: 'none' }) }
function candidateName (item) { const nativeName = `${item.native_last_name || ''}${item.native_first_name || ''}`.trim(); return nativeName || [item.en_first_name, item.en_last_name].filter(Boolean).join(' ') || t('search.notFilled') }
function candidateInitial (item) { return candidateName(item).slice(0, 1) || '?' }
function candidateMeta (item) { const values = []; if (item.generation) values.push(choiceLabel(item.generation)); if (item.birth_year) values.push(t('search.yearsOld', { count: new Date().getFullYear() - Number(item.birth_year) })); if (item.height) values.push(`${item.height}cm`); return values.join(' · ') || t('search.notFilled') }
function candidateDetail (item) { return [item.country, item.church_name, item.occupation].filter(Boolean).join(' · ') }

async function doSearch (pageNum, append = false) {
  if (searching.value) return
  searching.value = true
  try {
    canSearch.value = (await getMembershipApi()).canSearch === true
    if (!canSearch.value) { results.value = []; total.value = 0; return openMembershipUpgrade('search') }
    const data = await searchCandidatesApi(buildSearchPayload(form, pageNum, PAGE_SIZE))
    total.value = Number(data?.total || 0)
    const list = data?.results || []
    results.value = append ? [...results.value, ...list] : list
    page.value = pageNum
    hasSearched.value = true
    if (!append) { contentScrollIntoView.value = ''; nextTick(() => { contentScrollIntoView.value = 'search-results' }) }
  } catch (error) {
    if (error?.code === 'MEMBERSHIP_REQUIRED') { canSearch.value = false; results.value = []; total.value = 0 }
    if (!handleMembershipError(error)) uni.showToast({ title: t('home.loadFailed'), icon: 'none' })
  } finally { searching.value = false }
}
function onSearch () { void doSearch(1, false) }
function applyAdvancedFilters () { showAdvancedFilters.value = false; void doSearch(1, false) }
function loadMore () { if (!searching.value && results.value.length < total.value) void doSearch(page.value + 1, true) }
function onReset () { Object.assign(form, createSearchForm()); results.value = []; total.value = 0; page.value = 1; hasSearched.value = false; contentScrollIntoView.value = '' }
</script>

<style scoped>
/* Native pages must have a bounded viewport too; H5 gets this from app-h5-screen. */
/* #ifndef H5 */
.page.app-h5-screen{position:fixed;top:0;right:0;bottom:0;left:0;height:100%;min-height:0;overflow:hidden;}
/* #endif */
.page .results-scroll{min-height:0;overflow:hidden;}
.page{display:flex;min-height:100vh;flex-direction:column;background:#eeedeb;color:#292825;box-sizing:border-box}.content-area{flex:1;height:0;padding:8px 20px 0;box-sizing:border-box}.search-membership-gate{display:flex;flex:1;align-items:center;justify-content:center;flex-direction:column;padding:32px;color:#746f66;text-align:center}.membership-button{min-height:48px;margin-top:20px;padding:0 24px;border:0;border-radius:18px;background:var(--bless-primary, #C2A052);color:#292825;font-size:15px;font-weight:650}.membership-button::after,button::after{border:0}.name-search-card{padding:20px;background:#fff;border-radius:24px;box-shadow:0 7px 24px rgba(64,57,46,.055)}.search-field{display:flex;height:58px;align-items:center;padding:0 7px 0 18px;border:1px solid #ebe9e5;border-radius:29px;background:#f7f7f6;box-sizing:border-box}.search-icon{position:relative;width:19px;height:19px;margin-right:13px;border:2px solid #44433f;border-radius:50%;box-sizing:border-box;flex:none}.search-icon::after{position:absolute;width:8px;height:2px;right:-6px;bottom:-3px;border-radius:2px;background:#44433f;content:'';transform:rotate(45deg)}.name-input{min-width:0;height:100%;flex:1;color:#292825;font-size:16px}.search-submit{display:flex;width:46px;height:46px;align-items:center;justify-content:center;margin:0;padding:0;border:0;border-radius:50%;background:var(--bless-primary, #C2A052);box-shadow:0 5px 14px rgba(201,162,43,.2);transform:scale(1);transition:transform 150ms cubic-bezier(.23,1,.32,1),background-color 150ms ease;flex:none}.search-submit[disabled]{opacity:.55}.search-submit--pressed{background:var(--bless-pressed, #AA873C);transform:scale(.94)}.search-arrow{position:relative;width:17px;height:2px;border-radius:2px;background:#292825}.search-arrow::before,.search-arrow::after{position:absolute;width:9px;height:2px;right:-1px;border-radius:2px;background:#292825;content:'';transform-origin:right center}.search-arrow::before{top:-1px;transform:rotate(45deg)}.search-arrow::after{bottom:-1px;transform:rotate(-45deg)}.filter-label{display:block;margin:20px 0 11px;color:#5e5a54;font-size:14px;font-weight:600}.primary-chips,.filter-chips{display:flex;flex-wrap:wrap;margin:-5px}.primary-chip,.filter-chip{display:flex;min-height:42px;align-items:center;justify-content:center;margin:5px;padding:8px 16px;border:1px solid #e3e1dd;border-radius:21px;background:#f8f7f5;color:#4f4c47;font-size:14px;line-height:1.35;text-align:center;transform:scale(1);transition:transform 140ms cubic-bezier(.23,1,.32,1),background-color 140ms ease,border-color 140ms ease}.primary-chip.selected,.filter-chip.selected{border-color:var(--bless-primary, #C2A052);background:var(--bless-primary, #C2A052);color:#292825}.chip-check{width:8px;height:4px;margin:-2px 9px 0 0;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg);flex:none}.chip-pressed,.press-scale{transform:scale(.97)}.more-filter-row{display:flex;width:100%;min-height:72px;align-items:center;margin-top:14px;padding:14px 18px;border:0;border-radius:23px;background:#fff;color:#292825;box-shadow:0 6px 20px rgba(64,57,46,.045);transform:scale(1);transition:transform 140ms cubic-bezier(.23,1,.32,1),background-color 140ms ease;text-align:left}.more-filter-row--pressed{background:#faf9f7;transform:scale(.99)}.sliders-icon{position:relative;width:26px;height:24px;margin-right:14px;flex:none}.sliders-icon>view{position:absolute;left:1px;width:24px;height:2px;border-radius:2px;background:#4b4944}.sliders-icon>view:nth-child(1){top:4px}.sliders-icon>view:nth-child(2){top:11px}.sliders-icon>view:nth-child(3){top:18px}.sliders-icon>view::after{position:absolute;width:7px;height:7px;top:-2.5px;border-radius:50%;background:#4b4944;content:''}.sliders-icon>view:nth-child(1)::after{left:5px}.sliders-icon>view:nth-child(2)::after{right:4px}.sliders-icon>view:nth-child(3)::after{left:9px}.more-filter-label{min-width:0;flex:1;font-size:16px;font-weight:650}.selected-count{margin-left:10px;color:#918d85;font-size:13px;white-space:nowrap}.chevron{width:8px;height:8px;margin:0 4px 0 12px;border-top:1.5px solid #aaa69f;border-right:1.5px solid #aaa69f;transform:rotate(45deg);flex:none}.results-section{padding-top:26px}.results-heading{display:flex;align-items:baseline;margin:0 4px 12px;color:#292825;font-size:21px;font-weight:680}.results-total{margin-left:12px;color:#918d85;font-size:13px;font-weight:400}.state-card{display:flex;min-height:116px;align-items:center;justify-content:center;padding:24px;border-radius:23px;background:#fff;color:#918d85;font-size:14px;text-align:center;box-sizing:border-box}.result-list{display:flex;flex-direction:column}.result-item{display:flex;width:100%;min-height:98px;align-items:center;margin-bottom:12px;padding:14px 17px;border:0;border-radius:23px;background:#fff;color:#292825;box-shadow:0 5px 18px rgba(64,57,46,.045);text-align:left;transform:scale(1);transition:transform 140ms cubic-bezier(.23,1,.32,1),background-color 140ms ease}.result-item--pressed{background:#faf9f7;transform:scale(.99)}.result-avatar{display:flex;width:64px;height:64px;align-items:center;justify-content:center;margin-right:15px;border-radius:50%;background:#e8e1cf;color:var(--bless-text, #775E25);font-size:20px;font-weight:650;overflow:hidden;flex:none}.avatar-img{width:100%;height:100%}.result-info{display:flex;min-width:0;flex:1;flex-direction:column}.result-name{color:#292825;font-size:17px;font-weight:650;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.result-meta,.result-detail{margin-top:5px;color:#858078;font-size:13px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.result-detail{margin-top:3px;color:#aaa59d;font-size:12px}.load-more{min-height:48px;margin:2px 0 10px;border:0;border-radius:18px;background:#fff;color:var(--bless-text, #775E25);font-size:14px;text-align:center}.all-loaded{display:block;padding:12px 0 20px;color:#aaa69f;font-size:12px;text-align:center}.scroll-spacer{height:calc(24px + env(safe-area-inset-bottom))}
.search-fixed-panel{position:relative;z-index:5;background:#eeedeb;box-shadow:0 0 0 rgba(62,57,48,0);transition:box-shadow 120ms linear;flex:none}.search-fixed-panel--scrolled{box-shadow:0 8px 22px rgba(62,57,48,.09)}.search-controls{padding:8px 20px 14px;box-sizing:border-box}.results-scroll{height:0;flex:1}.results-content{padding:0 20px;box-sizing:border-box}
.advanced-sheet{display:flex;height:82vh;max-height:720px;flex-direction:column;padding:20px 20px calc(14px + env(safe-area-inset-bottom));color:#292825;box-sizing:border-box}.sheet-header{display:flex;align-items:center;justify-content:space-between;padding-bottom:11px;flex:none}.sheet-header>view{display:flex;min-width:0;align-items:baseline;flex-wrap:wrap}.sheet-title{font-size:21px;font-weight:680;line-height:1.4}.sheet-count{margin-left:10px;color:#918d85;font-size:12px}.sheet-close{display:flex;width:44px;height:44px;align-items:center;justify-content:center;margin:0;padding:0;border:0;border-radius:50%;background:#fff;color:#5e5a54;font-size:28px;line-height:1;flex:none}.advanced-scroll{height:0;flex:1}.sheet-section{padding:17px 2px;border-top:1px solid #e8e5df}.sheet-section:first-child{border-top:0}.sheet-label{display:block;margin-bottom:10px;color:#4e4b46;font-size:14px;font-weight:650}.range-row{display:flex;align-items:center}.range-picker{min-width:0;flex:1}.range-value{display:flex;min-height:44px;align-items:center;justify-content:center;padding:0 14px;border:1px solid #e1ded8;border-radius:16px;background:#fff;color:#4e4b46;font-size:14px;box-sizing:border-box}.range-separator{margin:0 10px;color:#aaa69f}.toggle-row{display:flex;width:100%;min-height:44px;align-items:center;justify-content:space-between;padding:0;border:0;background:transparent;color:#4e4b46;font-size:14px;text-align:left}.square-check{display:flex;width:24px;height:24px;align-items:center;justify-content:center;margin-left:14px;border:1px solid #d7d3cc;border-radius:8px;background:#fff;box-sizing:border-box;flex:none}.square-check.selected{border-color:var(--bless-primary, #C2A052);background:var(--bless-primary, #C2A052)}.square-check>view{width:8px;height:4px;margin-top:-2px;border-left:2px solid #fff;border-bottom:2px solid #fff;transform:rotate(-45deg)}.tools-heading{display:flex;align-items:center;justify-content:space-between}.recommend-link{margin:0;padding:5px 0;border:0;background:transparent;color:var(--bless-text, #775E25);font-size:12px}.tools-description{display:block;margin:-3px 0 8px;color:#9b968e;font-size:12px;line-height:1.5}.tool-row{padding:6px 0;border-top:1px solid #eeece8}.tool-row:first-of-type{border-top:0}.sub-options{padding:0 0 9px 5px}.mbti-picker{margin:0 0 9px 5px}.sheet-scroll-spacer{height:10px}.sheet-actions{display:flex;padding-top:12px;flex:none}.reset-button,.apply-button{display:flex;min-height:50px;align-items:center;justify-content:center;margin:0;border:0;border-radius:19px;font-size:15px;font-weight:650;transform:scale(1);transition:transform 140ms cubic-bezier(.23,1,.32,1),background-color 140ms ease}.reset-button{width:34%;margin-right:10px;background:#fff;color:#615d56}.apply-button{min-width:0;flex:1;background:var(--bless-primary, #C2A052);color:#292825}.apply-button[disabled]{opacity:.55}
@media (max-width:340px){.search-controls,.results-content{padding-right:14px;padding-left:14px}.name-search-card{padding:16px}.primary-chip,.filter-chip{padding-right:12px;padding-left:12px}.result-avatar{width:56px;height:56px}.selected-count{max-width:92px;overflow:hidden;text-overflow:ellipsis}.advanced-sheet{padding-right:14px;padding-left:14px}}
@media (prefers-reduced-motion:reduce){.search-submit,.primary-chip,.filter-chip,.more-filter-row,.result-item,.reset-button,.apply-button{transition:none}.search-submit--pressed,.chip-pressed,.press-scale,.more-filter-row--pressed,.result-item--pressed{transform:none}}
</style>
