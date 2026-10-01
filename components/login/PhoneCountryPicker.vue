<template>
  <BlessSheet :open="open" :label="t('phoneAuth.selectCountry')" :z-index="2000" @dismiss="emit('close')" @after-close="emit('after-close')">
    <view class="country-picker">
      <view class="drag-handle" aria-hidden="true" />
      <view class="picker-header">
        <text class="picker-title">{{ t('phoneAuth.selectCountry') }}</text>
        <button class="close-button" :aria-label="t('phoneAuth.close')" @click="emit('close')">×</button>
      </view>

      <view class="search-field">
        <uni-icons type="search" size="22" color="#77736d" />
        <input
          v-model="searchQuery"
          class="search-input"
          type="text"
          confirm-type="search"
          :placeholder="t('phoneAuth.searchCountry')"
          placeholder-class="search-placeholder"
          :aria-label="t('phoneAuth.searchCountry')"
        />
      </view>

      <view class="picker-body">
        <scroll-view class="country-scroll" scroll-y :scroll-into-view="scrollTarget" :show-scrollbar="false">
          <view id="phone-country-list-top" class="scroll-anchor" />
          <template v-if="!normalizedSearch">
            <view class="section-label common-label">{{ t('phoneAuth.commonCountries') }}</view>
            <button
              v-for="country in commonCountries"
              :key="`common-${country.iso2}`"
              class="country-row"
              :aria-label="rowLabel(country)"
              :aria-pressed="selectedIso2 === country.iso2"
              @click="selectCountry(country)"
            >
              <text class="country-name">{{ countryName(country) }}</text>
              <text class="dial-code">{{ country.dialCode }}</text>
              <text v-if="selectedIso2 === country.iso2" class="selected-mark" aria-hidden="true">✓</text>
            </button>
          </template>

          <template v-for="group in groupedCountries" :key="group.letter">
            <view :id="`phone-country-section-${group.letter}`" class="section-label alphabet-label">{{ group.letter }}</view>
            <button
              v-for="country in group.countries"
              :key="country.iso2"
              class="country-row"
              :aria-label="rowLabel(country)"
              :aria-pressed="selectedIso2 === country.iso2"
              @click="selectCountry(country)"
            >
              <text class="country-name">{{ countryName(country) }}</text>
              <text class="dial-code">{{ country.dialCode }}</text>
              <text v-if="selectedIso2 === country.iso2" class="selected-mark" aria-hidden="true">✓</text>
            </button>
          </template>
          <view v-if="!groupedCountries.length" class="empty-state">{{ t('phoneAuth.noCountries') }}</view>
        </scroll-view>

        <view class="alphabet-index" role="group" :aria-label="t('phoneAuth.selectCountry')" @touchstart.stop="onIndexTouchStart" @touchmove.stop.prevent="onIndexTouchMove" @touchend.stop="onIndexTouchEnd" @touchcancel.stop="onIndexTouchCancel">
          <button
            v-for="letter in alphabet"
            :key="letter"
            class="index-letter"
            :class="{ 'is-active': activeLetter === letter, 'is-unavailable': !availableLetters.includes(letter) }"
            :aria-disabled="!availableLetters.includes(letter)"
            :aria-label="letter"
            @click="onIndexClick(letter)"
          >{{ letter }}</button>
        </view>
      </view>
    </view>
  </BlessSheet>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue'
import BlessSheet from '@/components/common/BlessSheet.vue'
import { t } from '@/utils/localeRuntime.js'
import { PHONE_COUNTRIES, getPhoneCountryName, filterPhoneCountries } from '@/utils/phoneCountries.js'

const props = defineProps({
  open: Boolean,
  selectedIso2: { type: String, default: 'CN' },
  locale: { type: String, default: 'zh-Hans' }
})
const emit = defineEmits(['close', 'select', 'after-close'])

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const commonIso2 = ['US', 'CN', 'GB', 'JP', 'KR']
const searchQuery = ref('')
const scrollTarget = ref('')
const activeLetter = ref('A')
const instance = getCurrentInstance()
let jumpRevision = 0
let railBounds = null
let railQueryPending = false
let railTouchActive = false
let railTouchMoved = false
let railTouchY = null
let lastScrubLetter = ''
let ignoreClickUntil = 0

const normalizedSearch = computed(() => searchQuery.value.trim())
const commonCountries = computed(() => commonIso2.map(iso2 => PHONE_COUNTRIES.find(country => country.iso2 === iso2)).filter(Boolean))
const visibleCountries = computed(() => normalizedSearch.value ? filterPhoneCountries(normalizedSearch.value, props.locale) : PHONE_COUNTRIES)
const groupedCountries = computed(() => {
  const groups = new Map()
  for (const country of visibleCountries.value) {
    const letter = country.indexLetter
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter).push(country)
  }
  return alphabet.filter(letter => groups.has(letter)).map(letter => ({ letter, countries: groups.get(letter) }))
})
const availableLetters = computed(() => groupedCountries.value.map(group => group.letter))

function countryName(country) { return getPhoneCountryName(country, props.locale) }
function rowLabel(country) { return `${countryName(country)} ${country.dialCode}` }
function selectCountry(country) { emit('select', country) }

async function jumpToLetter(letter) {
  if (!availableLetters.value.includes(letter)) return
  const revision = ++jumpRevision
  activeLetter.value = letter
  scrollTarget.value = ''
  await nextTick()
  if (revision === jumpRevision) scrollTarget.value = `phone-country-section-${letter}`
}

function onIndexClick(letter) {
  if (Date.now() < ignoreClickUntil) return
  void jumpToLetter(letter)
}

function touchY(event) {
  const touch = event?.touches?.[0] || event?.changedTouches?.[0]
  const clientY = Number(touch?.clientY)
  if (Number.isFinite(clientY)) return clientY
  const pageY = Number(touch?.pageY)
  return Number.isFinite(pageY) ? pageY : null
}

function scrubAt(y) {
  if (!railBounds || !Number.isFinite(y)) return
  const offset = Math.max(0, Math.min(railBounds.height - 1, y - railBounds.top))
  const index = Math.floor(offset / railBounds.height * alphabet.length)
  const letter = alphabet[index]
  if (!availableLetters.value.includes(letter) || lastScrubLetter === letter) return
  lastScrubLetter = letter
  void jumpToLetter(letter)
}

function queryRail(scoped) {
  try {
    let query = uni.createSelectorQuery()
    if (scoped && instance?.proxy && typeof query.in === 'function') query = query.in(instance.proxy)
    else scoped = false
    query.select('.alphabet-index').boundingClientRect(rect => {
      if ((!rect || rect.height <= 0) && scoped) { queryRail(false); return }
      railQueryPending = false
      if (!props.open || !rect || rect.height <= 0) return
      railBounds = { top: rect.top, height: rect.height }
      if (railTouchMoved && railTouchY !== null) scrubAt(railTouchY)
    }).exec()
  } catch (_) {
    if (scoped) queryRail(false)
    else railQueryPending = false
  }
}

function measureRail() {
  if (railBounds || railQueryPending || !props.open || typeof uni.createSelectorQuery !== 'function') return
  railQueryPending = true
  queryRail(true)
}

function onIndexTouchStart() {
  railBounds = null
  railTouchActive = true
  railTouchMoved = false
  railTouchY = null
  lastScrubLetter = ''
  measureRail()
}

function onIndexTouchMove(event) {
  const y = touchY(event)
  if (!railTouchActive || y === null) return
  railTouchMoved = true
  railTouchY = y
  ignoreClickUntil = Date.now() + 400
  if (railBounds) scrubAt(y)
  else measureRail()
}

function onIndexTouchEnd(event) {
  if (railTouchMoved) {
    railTouchY = touchY(event) ?? railTouchY
    if (railBounds) scrubAt(railTouchY)
  }
  railTouchActive = false
}

function onIndexTouchCancel() {
  railTouchActive = false
  railTouchMoved = false
  railTouchY = null
}

watch(searchQuery, async () => {
  const revision = ++jumpRevision
  activeLetter.value = groupedCountries.value[0]?.letter || 'A'
  scrollTarget.value = ''
  await nextTick()
  if (revision === jumpRevision) scrollTarget.value = 'phone-country-list-top'
})
watch(() => props.open, value => {
  railBounds = null
  railTouchActive = false
  railTouchMoved = false
  railTouchY = null
  ignoreClickUntil = 0
  if (!value) return
  searchQuery.value = ''
  scrollTarget.value = ''
  activeLetter.value = 'A'
})
</script>

<style scoped>
.country-picker { display:flex; flex-direction:column; height:76vh; max-height:790px; box-sizing:border-box; padding:0 18px calc(12px + env(safe-area-inset-bottom)); background:#fff; color:#292825; }
.drag-handle { flex:none; width:44px; height:5px; margin:12px auto 16px; border-radius:5px; background:#dedbd5; }
.picker-header { flex:none; display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:58px; padding:0 2px 12px; }
.picker-title { flex:1; min-width:0; font-size:24px; font-weight:700; line-height:1.25; overflow-wrap:anywhere; }
.close-button { flex:none; display:flex; align-items:center; justify-content:center; width:44px; height:44px; margin:0; padding:0; border:0; border-radius:50%; background:transparent; color:#66625d; font-size:32px; font-weight:300; line-height:1; transition-property:background-color,transform; transition-duration:150ms; }
.close-button::after,.country-row::after,.index-letter::after { border:0; }
.close-button:active { background:#f5f4f1; transform:scale(.96); }
.search-field { flex:none; display:flex; align-items:center; gap:12px; min-height:54px; margin:0 36px 12px 0; padding:0 14px; box-sizing:border-box; border-radius:17px; background:#f5f4f2; }
.search-input { flex:1; min-width:0; height:54px; color:#292825; font-size:15px; }
.search-placeholder { color:#8c8882; }
.picker-body { display:flex; flex:1; min-height:0; gap:12px; }
.country-scroll { flex:1; min-width:0; height:100%; }
.scroll-anchor { height:1px; }
.section-label { display:flex; align-items:center; box-sizing:border-box; min-height:38px; color:#77736f; font-size:14px; font-weight:600; }
.common-label { padding-top:2px; }
.alphabet-label { min-height:26px; margin-top:0; padding:4px 0 0; }
.country-row { display:flex; align-items:center; width:100%; min-height:56px; margin:0; padding:8px 0; box-sizing:border-box; border:0; border-bottom:1px solid #efede9; border-radius:0; background:transparent; text-align:left; line-height:1.35; transition-property:background-color; transition-duration:120ms; }
.country-row:active { background:#faf7ee; }
.country-name { flex:1; min-width:0; color:#262521; font-size:16px; font-weight:600; overflow-wrap:anywhere; }
.dial-code { flex:none; margin-left:8px; color:#77736e; font-size:15px; }
.selected-mark { flex:none; width:22px; margin-left:8px; color:#b98b32; font-size:22px; font-weight:700; text-align:right; }
.alphabet-index { flex:none; display:flex; flex-direction:column; align-items:center; justify-content:space-around; width:30px; height:100%; min-height:0; padding:5px 0; box-sizing:border-box; border-radius:18px; background:#faf9f7; }
.index-letter { display:flex; flex-shrink:1; align-items:center; justify-content:center; width:27px; min-height:0; height:3.6%; margin:0; padding:0; border:0; border-radius:50%; background:transparent; color:#5c5955; font-size:11px; font-weight:500; line-height:1; }
.index-letter.is-active { background:#f2e6c5; color:#ad7b22; font-weight:700; }
.index-letter.is-unavailable { color:#c9c6c1; }
.empty-state { padding:34px 10px; color:#8e8982; font-size:14px; text-align:center; }
@media (max-height:650px) { .index-letter { font-size:9px; } .country-picker { height:82vh; } }
/* #ifdef H5 */
.country-picker { height:76dvh; max-height:calc(var(--app-viewport-height, 100dvh) - 40px); }
/* #endif */
</style>
