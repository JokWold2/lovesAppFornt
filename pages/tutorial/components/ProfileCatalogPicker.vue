<template>
  <SlideUpPanel :open="open" full-height :z-index="25" :label="field?.label" @dismiss="emit('cancel')">
    <view v-if="field" class="profile-catalog-picker">
      <view class="catalog-handle" aria-hidden="true" />
      <view class="catalog-toolbar">
        <button class="catalog-circle catalog-cancel" :aria-label="t('profileEditor.common.cancel')" @click="emit('cancel')"><uni-icons type="closeempty" size="25" /></button>
        <text class="catalog-title">{{ field.label }}</text>
        <button class="catalog-circle catalog-confirm" :aria-label="t('profileEditor.common.confirm')" @click="emit('confirm', selected)"><uni-icons type="checkmarkempty" size="28" color="#fff" /></button>
      </view>
      <view class="catalog-search-wrap"><uni-icons type="search" size="21" color="#8d877d" /><input class="catalog-search" :value="query" :placeholder="t(`profileEditor.catalog.${field.catalog === 'languages' ? 'searchLanguages' : 'searchCountries'}`)" :aria-label="t('profileEditor.catalog.search')" :adjust-position="true" :cursor-spacing="24" confirm-type="search" @input="search($event.detail.value)" /><button v-if="query" class="catalog-clear-search" :aria-label="t('profileEditor.catalog.clearSearch')" @click="search('')"><uni-icons type="closeempty" size="18" color="#8d877d" /></button></view>
      <view v-if="selected" class="catalog-current"><text class="catalog-caption">{{ t('profileEditor.common.currentValue') }}</text><button class="catalog-choice selected catalog-selected-value" :aria-pressed="true" @click="selected = ''"><ProfileCountryFlag :index="selectedFlagIndex" /><text>{{ selected }}</text></button></view>
      <scroll-view class="catalog-results" scroll-y :scroll-top="scrollTop" :lower-threshold="160" @scrolltolower="loadMore">
        <view class="catalog-results-content">
          <text class="catalog-count">{{ t('profileEditor.catalog.results', { count: resultCount }) }}</text>
          <view class="catalog-choices"><button v-for="option in visibleRows" :key="option.code" :data-code="option.code" class="catalog-choice" :class="{ selected: selected === option.label }" :aria-pressed="selected === option.label" @click="selected = selected === option.label ? '' : option.label"><ProfileCountryFlag :index="option.flagIndex" /><text>{{ option.label }}</text></button></view>
          <view v-if="!resultCount" class="catalog-empty"><uni-icons type="search" size="30" color="#b7b0a5" /><text>{{ t('profileEditor.catalog.noResults') }}</text></view>
          <button v-if="hasMore" class="catalog-more" @click="loadMore">{{ t('profileEditor.catalog.loadMore') }}</button>
          <view class="catalog-bottom-space" />
        </view>
      </scroll-view>
    </view>
  </SlideUpPanel>
</template>
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import SlideUpPanel from '@/components/common/SlideUpPanel.vue'
import ProfileCountryFlag from './ProfileCountryFlag.vue'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { findProfileCountry, searchProfileCatalog } from '../utils/profileCatalog.js'
const props = defineProps({ open: Boolean, field: Object, value: { type: String, default: '' } })
const emit = defineEmits(['cancel', 'confirm'])
const query = ref(''), selected = ref(''), limit = ref(60), scrollTop = ref(0)
// Only the visible slice is sent to the mini-program view, never the full language catalog.
const matches = computed(() => props.field ? searchProfileCatalog(props.field.catalog, currentLocale.value, query.value) : [])
const visibleRows = computed(() => matches.value.slice(0, limit.value).map(({ code, label, flagIndex }) => ({ code, label, flagIndex })))
const resultCount = computed(() => matches.value.length)
const hasMore = computed(() => resultCount.value > limit.value)
const selectedFlagIndex = computed(() => props.field?.catalog === 'languages' ? -1 : findProfileCountry(selected.value)?.flagIndex ?? -1)
function loadMore() { if (props.open) limit.value = Math.min(limit.value + 60, resultCount.value) }
async function search(value) { query.value = value; limit.value = 60; scrollTop.value = 1; await nextTick(); scrollTop.value = 0 }
watch(() => props.open, value => { if (value) { query.value = ''; selected.value = props.value; limit.value = 60; scrollTop.value = 0 } }, { immediate: true })
</script>
<style scoped>
.profile-catalog-picker{height:100%;display:flex;flex-direction:column;min-height:0;color:#24221f;}button{margin:0;box-sizing:border-box;line-height:1.45;border:0;background:none;color:inherit;white-space:normal;overflow-wrap:anywhere;transition:transform 140ms cubic-bezier(.23,1,.32,1);}button::after{border:0;}button:active{transform:scale(.97);}button :deep(.uni-icons){pointer-events:none;}.catalog-handle{width:36px;height:4px;margin:10px auto 5px;border-radius:4px;background:#d3d0ca;flex-shrink:0;}.catalog-toolbar{display:flex;align-items:center;gap:12px;padding:10px 20px 18px;flex-shrink:0;}.catalog-circle{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:0;background:#fff;flex-shrink:0;}.catalog-confirm{background:#242321;}.catalog-title{font-size:21px;font-weight:600;line-height:1.4;flex:1;text-align:center;min-width:0;overflow-wrap:anywhere;}.catalog-search-wrap{display:flex;align-items:center;gap:10px;min-height:50px;border-radius:18px;background:#eae7e2;margin:0 20px 16px;padding:0 14px;flex-shrink:0;}.catalog-search{min-width:0;flex:1;width:100%;height:50px;font-size:16px;}.catalog-clear-search{width:44px;min-height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0;margin-right:-10px;}.catalog-current{padding:0 20px 16px;flex-shrink:0;border-bottom:1px solid #e4e0d9;}.catalog-caption{display:block;font-size:12px;color:#8d867b;margin:0 0 9px;}.catalog-results{height:0;flex:1;min-height:0;}.catalog-results-content{padding:16px 20px 0;}.catalog-count{display:block;font-size:12px;color:#8d867b;margin-bottom:14px;font-variant-numeric:tabular-nums;}.catalog-choices{display:flex;flex-wrap:wrap;gap:9px;}.catalog-choice{display:flex;align-items:center;gap:8px;min-height:46px;max-width:100%;padding:10px 15px;text-align:left;background:#eae7e2;border:1px solid transparent;border-radius:25px;font-size:14px;}.catalog-choice text{min-width:0;overflow-wrap:anywhere;}.catalog-choice.selected{background:var(--bless-soft, #F1E4BD);border-color:var(--bless-primary, #C2A052);color:var(--bless-text, #775E25);}.catalog-selected-value{width:fit-content;}.catalog-more{display:block;min-height:48px;width:100%;margin-top:20px;font-size:14px;border-radius:24px;background:#fff;}.catalog-empty{display:flex;flex-direction:column;align-items:center;gap:15px;padding:48px 12px;color:#8d867b;font-size:14px;text-align:center;line-height:1.7;}.catalog-bottom-space{height:calc(28px + env(safe-area-inset-bottom));}
@media(max-width:350px){.catalog-toolbar{padding-left:16px;padding-right:16px;}.catalog-title{font-size:18px;}.catalog-search-wrap{margin-left:16px;margin-right:16px;}.catalog-results-content{padding-left:16px;padding-right:16px;}.catalog-current{padding-left:16px;padding-right:16px;}.catalog-choice{padding:9px 12px;font-size:13px;}}
@media(prefers-reduced-motion:reduce){button{transition:none;}button:active{transform:none;}}
</style>
