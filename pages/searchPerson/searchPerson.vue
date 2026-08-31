<template>
  <view class="page app-h5-screen">

    <view class="header">
      <text class="header-title">🔍 {{ t('search.title') }}</text>
    </view>

    <scroll-view scroll-y class="content-area app-h5-scroll" style="box-sizing: border-box;">

      <!-- 卡片1：選擇條件 -->
      <view class="form-card">
        <view class="section-title">{{ t('search.conditions') }}</view>

        <view class="form-row">
          <text class="form-label">{{ t('search.name') }}</text>
          <input class="form-input" v-model="form.name" :placeholder="t('search.namePlaceholder')" />
        </view>

        <view class="form-row">
          <text class="form-label">{{ t('search.gender') }}</text>
          <view class="checkbox-group">
            <view class="checkbox-item" @tap="form.gender = '女'">
              <view class="radio-dot" :class="{ checked: form.gender === '女' }"></view>
              <text>{{ choiceLabel('女') }}</text>
            </view>
            <view class="checkbox-item" @tap="form.gender = '男'">
              <view class="radio-dot" :class="{ checked: form.gender === '男' }"></view>
              <text>{{ choiceLabel('男') }}</text>
            </view>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t('search.generation') }}</text>
          <view class="checkbox-group">
            <view class="checkbox-item" @tap="form.generation = '祝福子女'">
              <view class="radio-dot" :class="{ checked: form.generation === '祝福子女' }"></view>
              <text>{{ choiceLabel('祝福子女') }}</text>
            </view>
            <view class="checkbox-item" @tap="form.generation = '一世會員'">
              <view class="radio-dot" :class="{ checked: form.generation === '一世會員' }"></view>
              <text>{{ choiceLabel('一世會員') }}</text>
            </view>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t('search.status') }}</text>
          <view class="checkbox-group">
            <view class="checkbox-item" v-for="opt in statusOptions" :key="opt" @tap="toggle(form.status, opt)">
              <view class="box" :class="{ checked: form.status.includes(opt) }">
                <text v-if="form.status.includes(opt)" class="check-mark">✓</text>
              </view>
              <text>{{ choiceLabel(opt) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 卡片2：進階條件 -->
      <view class="form-card">
        <view class="form-row">
          <text class="form-label">{{ t('search.preferredCountry') }}</text>
          <view class="checkbox-group">
            <view class="checkbox-item" v-for="opt in countryOptions" :key="opt" @tap="toggle(form.preferredCountries, opt)">
              <view class="box" :class="{ checked: form.preferredCountries.includes(opt) }">
                <text v-if="form.preferredCountries.includes(opt)" class="check-mark">✓</text>
              </view>
              <text>{{ choiceLabel(opt) }}</text>
            </view>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t('search.ageRange') }}</text>
          <view class="range-group">
            <picker mode="selector" :range="ageOptionLabels" @change="e => form.ageMin = ageOptions[e.detail.value]">
              <view class="form-select"><text>{{ choiceLabel(form.ageMin || '全部') }}</text></view>
            </picker>
            <text class="range-sep">~</text>
            <picker mode="selector" :range="ageOptionLabels" @change="e => form.ageMax = ageOptions[e.detail.value]">
              <view class="form-select"><text>{{ choiceLabel(form.ageMax || '全部') }}</text></view>
            </picker>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t('search.heightRange') }}</text>
          <view class="range-group">
            <picker mode="selector" :range="heightOptionLabels" @change="e => form.heightMin = heightOptions[e.detail.value]">
              <view class="form-select"><text>{{ choiceLabel(form.heightMin || '全部') }}</text></view>
            </picker>
            <text class="range-sep">~</text>
            <picker mode="selector" :range="heightOptionLabels" @change="e => form.heightMax = heightOptions[e.detail.value]">
              <view class="form-select"><text>{{ choiceLabel(form.heightMax || '全部') }}</text></view>
            </picker>
          </view>
        </view>
      </view>

      <!-- 卡片3：背景與信仰 -->
      <view class="form-card">
        <view class="form-row">
          <view class="checkbox-item" @tap="form.topGun = !form.topGun">
            <view class="box" :class="{ checked: form.topGun }">
              <text v-if="form.topGun" class="check-mark">✓</text>
            </view>
            <text>{{ t('search.topGun') }}</text>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t('search.jobs') }}</text>
          <view class="checkbox-group tight">
            <view class="checkbox-item" v-for="opt in jobOptions" :key="opt" @tap="toggle(form.jobs, opt)">
              <view class="box" :class="{ checked: form.jobs.includes(opt) }">
                <text v-if="form.jobs.includes(opt)" class="check-mark">✓</text>
              </view>
              <text>{{ choiceLabel(opt) }}</text>
            </view>
          </view>
        </view>

        <view class="form-row">
          <text class="form-label">{{ t('search.faith') }}</text>
          <view class="checkbox-group">
            <view class="checkbox-item" v-for="opt in faithOptions" :key="opt" @tap="toggle(form.faithLife, opt)">
              <view class="box" :class="{ checked: form.faithLife.includes(opt) }">
                <text v-if="form.faithLife.includes(opt)" class="check-mark">✓</text>
              </view>
              <text>{{ choiceLabel(opt) }}</text>
              <text class="help-icon">?</text>
            </view>
          </view>
        </view>

        <view class="form-row" style="margin-top: 15px;">
          <text class="form-label">{{ t('search.blessing2026') }}<text class="help-icon">?</text></text>
          <view class="checkbox-item" @tap="form.wantBlessing2026 = !form.wantBlessing2026">
            <view class="box" :class="{ checked: form.wantBlessing2026 }">
              <text v-if="form.wantBlessing2026" class="check-mark">✓</text>
            </view>
            <text>{{ t('search.wantJoin') }}</text>
          </view>
        </view>
      </view>

      <!-- 卡片4：分析工具 -->
      <view class="form-card">
        <view class="tools-header">
          <view class="section-title" style="margin: 0;">{{ t('search.tools') }}</view>
          <view class="btn-recommend" @tap="onFindRecommend">{{ t('search.recommend') }}</view>
        </view>
        <text class="tools-desc">{{ t('search.toolsDescription') }}</text>

        <view class="tool-list">
          <!-- Tool 1：雙手交握 -->
          <view class="tool-item">
            <view class="checkbox-item tool-title" @tap="form.tools.hands.enabled = !form.tools.hands.enabled">
              <view class="box" :class="{ checked: form.tools.hands.enabled }">
                <text v-if="form.tools.hands.enabled" class="check-mark">✓</text>
              </view>
              <text>{{ t('search.hands') }}</text>
              <text class="help-icon">?</text>
            </view>
            <view class="checkbox-group tool-options">
              <view class="checkbox-item" @tap="form.tools.hands.value = '右拇指'">
                <view class="radio-dot" :class="{ checked: form.tools.hands.value === '右拇指' }"></view>
                <text>{{ choiceLabel('右拇指') }}</text>
              </view>
              <view class="checkbox-item" @tap="form.tools.hands.value = '左拇指'">
                <view class="radio-dot" :class="{ checked: form.tools.hands.value === '左拇指' }"></view>
                <text>{{ choiceLabel('左拇指') }}</text>
              </view>
            </view>
          </view>

          <!-- Tool 2：陰/陽 -->
          <view class="tool-item">
            <view class="checkbox-item tool-title" @tap="form.tools.yinyang.enabled = !form.tools.yinyang.enabled">
              <view class="box" :class="{ checked: form.tools.yinyang.enabled }">
                <text v-if="form.tools.yinyang.enabled" class="check-mark">✓</text>
              </view>
              <text>{{ t('search.yinYang') }}</text>
              <text class="help-icon">?</text>
            </view>
            <view class="checkbox-group tool-options">
              <view class="checkbox-item" @tap="form.tools.yinyang.value = '陽'">
                <view class="radio-dot" :class="{ checked: form.tools.yinyang.value === '陽' }"></view>
                <text>{{ choiceLabel('陽') }}</text>
              </view>
              <view class="checkbox-item" @tap="form.tools.yinyang.value = '陰'">
                <view class="radio-dot" :class="{ checked: form.tools.yinyang.value === '陰' }"></view>
                <text>{{ choiceLabel('陰') }}</text>
              </view>
            </view>
          </view>

          <!-- Tool 3：五要素 -->
          <view class="tool-item">
            <view class="checkbox-item tool-title" @tap="form.tools.fiveElements.enabled = !form.tools.fiveElements.enabled">
              <view class="box" :class="{ checked: form.tools.fiveElements.enabled }">
                <text v-if="form.tools.fiveElements.enabled" class="check-mark">✓</text>
              </view>
              <text>{{ t('search.fiveElements') }}</text>
              <text class="help-icon">?</text>
            </view>
            <view class="checkbox-group tool-options">
              <view class="checkbox-item" v-for="opt in fiveElementOptions" :key="opt" @tap="toggle(form.tools.fiveElements.values, opt)">
                <view class="box" :class="{ checked: form.tools.fiveElements.values.includes(opt) }">
                  <text v-if="form.tools.fiveElements.values.includes(opt)" class="check-mark">✓</text>
                </view>
                <text>{{ choiceLabel(opt) }}</text>
              </view>
            </view>
          </view>

          <!-- Tool 4：九型人格 -->
          <view class="tool-item">
            <view class="checkbox-item tool-title" @tap="form.tools.enneagram.enabled = !form.tools.enneagram.enabled">
              <view class="box" :class="{ checked: form.tools.enneagram.enabled }">
                <text v-if="form.tools.enneagram.enabled" class="check-mark">✓</text>
              </view>
              <text>{{ t('search.enneagram') }}</text>
              <text class="help-icon">?</text>
            </view>
            <view class="checkbox-group tool-options tight">
              <view class="checkbox-item" v-for="opt in enneagramOptions" :key="opt" @tap="toggle(form.tools.enneagram.values, opt)">
                <view class="box" :class="{ checked: form.tools.enneagram.values.includes(opt) }">
                  <text v-if="form.tools.enneagram.values.includes(opt)" class="check-mark">✓</text>
                </view>
                <text>{{ choiceLabel(opt) }}</text>
              </view>
            </view>
          </view>

          <!-- Tool 5：MBTI -->
          <view class="tool-item">
            <view class="checkbox-item tool-title" @tap="form.tools.mbti.enabled = !form.tools.mbti.enabled">
              <view class="box" :class="{ checked: form.tools.mbti.enabled }">
                <text v-if="form.tools.mbti.enabled" class="check-mark">✓</text>
              </view>
              <text>MBTI</text>
              <text class="help-icon">?</text>
            </view>
            <view class="tool-options" style="padding-top: 4px;">
              <picker mode="selector" :range="mbtiOptions" @change="e => form.tools.mbti.value = mbtiOptions[e.detail.value]">
                <view class="form-select"><text>{{ form.tools.mbti.value || t('search.select') }}</text></view>
              </picker>
            </view>
          </view>
        </view>
      </view>

      <!-- 搜尋結果 -->
      <view v-if="hasSearched || searching" class="form-card result-card">
        <view class="section-title">
          {{ t('search.searchResults') }}
          <text v-if="!searching" class="result-count">{{ t('search.total', { count: total }) }}</text>
        </view>

        <view v-if="searching && results.length === 0" class="empty-tip">
          <text>{{ t('search.searching') }}</text>
        </view>

        <view v-else-if="results.length === 0" class="empty-tip">
          <text>{{ t('search.noResults') }}</text>
        </view>

        <view v-else>
          <view v-for="item in results" :key="item.id" class="result-item" @click="onResultClick(item)" >
            <view class="result-avatar">
              <image v-if="item.avatar_url" :src="item.avatar_url" mode="aspectFill" class="avatar-img" />
              <text v-else>{{ (item.native_last_name || item.en_last_name || '').slice(0, 1) || '?' }}</text>
            </view>
            <view class="result-info">
              <view class="result-name">
                <text>{{ item.native_first_name || item.en_first_name || t('search.notFilled') }} {{ item.native_last_name || item.en_last_name || '' }}</text>
              </view>
              <view class="result-meta">
                <text v-if="item.gender">{{ item.gender }} · </text>
                <text v-if="item.generation">{{ item.generation }} · </text>
                <text v-if="item.birth_year">{{ t('search.yearsOld', { count: new Date().getFullYear() - Number(item.birth_year) }) }} · </text>
                <text v-if="item.height">{{ item.height }}cm</text>
              </view>
              <view class="result-meta">
                <text v-if="item.country">{{ item.country }}</text>
                <text v-if="item.church_name"> · {{ item.church_name }}</text>
                <text v-if="item.occupation"> · {{ item.occupation }}</text>
              </view>
            </view>
          </view>

          <view class="result-more">
            <text v-if="searching">{{ t('search.searching') }}</text>
            <text v-else-if="results.length >= total">{{ t('search.allLoaded') }}</text>
            <text v-else class="link" @tap="loadMore">{{ t('search.loadMore') }}</text>
          </view>
        </view>
      </view>

    </scroll-view>

    <!-- 底部固定按鈕 -->
    <view class="bottom-bar app-h5-fixed-bottom">
      <view class="btn btn-submit" @tap="onSearch">{{ t('search.search') }}</view>
      <view class="btn btn-reset" @tap="onReset">{{ t('search.reset') }}</view>
    </view>

  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { searchCandidatesApi } from '@/api/index.js'
import { currentLocale, t } from '@/utils/localeRuntime.js'
import { searchOptionLabel } from '@/utils/searchPresentation.js'

function defaultForm () {
  return {
    name: '',
    gender: '女',
    generation: '祝福子女',
    status: [],
    preferredCountries: [],
    ageMin: '',
    ageMax: '',
    heightMin: '',
    heightMax: '',
    topGun: false,
    jobs: [],
    faithLife: [],
    wantBlessing2026: false,
    tools: {
      hands: { enabled: false, value: '' },
      yinyang: { enabled: false, value: '' },
      fiveElements: { enabled: false, values: [] },
      enneagram: { enabled: false, values: [] },
      mbti: { enabled: false, value: '' }
    }
  }
}

const form = reactive(defaultForm())

// ---- 選項數據 ----
const statusOptions = ['申請者', '候選人']
const countryOptions = ['Korea', 'Japan(+Taiwan)', 'North America', 'Latin America', 'Asia', 'Europe(+Middle East)', 'Africa']
const jobOptions = ['公職幹部', '學生', '上班族', '自營商', '公務員', '專業人員', '職業軍人', '其他']
const faithOptions = ['非常傳統', '有彈性', '妥協']
const fiveElementOptions = ['木', '火', '土', '金', '水']
const enneagramOptions = ['1: 改革型', '2: 助人型', '3: 成就型', '4: 藝術型', '5: 智慧型', '6: 忠誠型', '7: 遠見型', '8: 領導型', '9: 和平型']
const mbtiOptions = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']
const ageOptions = ['全部', ...Array.from({ length: 63 }, (_, i) => `${18 + i}`)]
const heightOptions = ['全部', ...Array.from({ length: 71 }, (_, i) => `${140 + i}`)]
const choiceLabel = value => searchOptionLabel(currentLocale.value, value)
const ageOptionLabels = computed(() => ageOptions.map(choiceLabel))
const heightOptionLabels = computed(() => heightOptions.map(choiceLabel))

// ---- 搜索状态 ----
const PAGE_SIZE = 20
const searching = ref(false)
const hasSearched = ref(false)
const results = ref([])
const total = ref(0)
const page = ref(1)

// ---- 方法 ----
function toggle (list, value) {
  const idx = list.indexOf(value)
  if (idx > -1) {
    list.splice(idx, 1)
  } else {
    list.push(value)
  }
}

function onResultClick (item) {
  console.log('onResultClick', item)
  uni.navigateTo({
    url: `/pages/searchPerson/personShow/personShow?id=${item.id}`
  })
}

function onFindRecommend () {
  // TODO: 接入「尋找推薦類型」實際邏輯 / 跳轉頁面
  uni.showToast({ title: t('search.inDevelopment'), icon: 'none' })
}

// 构造请求体：清理「全部」这类占位符，避免发给后端
function buildPayload (pageNum) {
  const f = JSON.parse(JSON.stringify(form))
  if (f.ageMin === '全部' || !f.ageMin) delete f.ageMin
  if (f.ageMax === '全部' || !f.ageMax) delete f.ageMax
  if (f.heightMin === '全部' || !f.heightMin) delete f.heightMin
  if (f.heightMax === '全部' || !f.heightMax) delete f.heightMax
  // 空数组保留即可，后端会跳过 length === 0 的项
  return { ...f, page: pageNum, pageSize: PAGE_SIZE }
}

async function doSearch (pageNum, append = false) {
  if (searching.value) return
  searching.value = true
  try {
    const payload = buildPayload(pageNum)
    const data = await searchCandidatesApi(payload)
    total.value = data && data.total ? Number(data.total) : 0
    const list = (data && data.results) || []
    results.value = append ? [...results.value, ...list] : list
    page.value = pageNum
    hasSearched.value = true
    if (!append) {
      // 第一次搜索完成后，让 scroll-view 滚到结果区
      uni.pageScrollTo({ duration: 200, scrollTop: 9999 })
    }
  } catch (e) {
    console.error('search error', e)
  } finally {
    searching.value = false
  }
}

function onSearch () {
  doSearch(1, false)
}

function loadMore () {
  if (searching.value || results.value.length >= total.value) return
  doSearch(page.value + 1, true)
}

function onReset () {
  Object.assign(form, defaultForm())
  results.value = []
  total.value = 0
  page.value = 1
  hasSearched.value = false
}
</script>

<style scoped>
.page {
  --primary-color: #fff6df;
  --secondary-color: #606266;
  --blue-color: #e6dcc4;
  --bg-color: #fff6df;
  --card-bg: #ffffff;
  --text-main: #2c3e50;
  --text-secondary: #5c6b7a;
  --border-color: #e1e4e8;

  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  color: var(--text-main);
  font-size: 14px;
}

/* #ifdef H5 */
.page {
  min-height: 0;
}
/* #endif */

/* ====== 頂部 ====== */
.header {
  padding: 24px 20px 15px;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
}
.header-title {
  font-size: 20px;
  font-weight: bold;
  color: var(--text-main);
}

/* ====== 內容區 ====== */
.content-area {
  flex: 1;
  padding: 15px 15px calc(100px + env(safe-area-inset-bottom));
}

.form-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.section-title {
  font-size: 15px;
  font-weight: bold;
  color: var(--text-main);
  margin-bottom: 12px;
}

.form-row { margin-bottom: 15px; }
.form-row:last-child { margin-bottom: 0; }
.form-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: block;
  font-weight: 500;
}

.form-input, .form-select {
  width: 90%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-main);
  background: #fff;
}
.form-select { display: flex; align-items: center; }

.range-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.range-group .form-select { flex: 1; }
.range-sep {
  color: var(--text-secondary);
  font-size: 14px;
  flex-shrink: 0;
}

/* ====== 單選 / 多選 ====== */
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 15px;
}
.checkbox-group.tight {
  gap: 8px 12px;
}
.checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-main);
}

.box {
  width: 18px;
  height: 18px;
  border: 1.5px solid #c9ccd1;
  border-radius: 4px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.box.checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}
.check-mark {
  color: #fff;
  font-size: 12px;
  line-height: 1;
}

.radio-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid #c9ccd1;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.radio-dot.checked {
  border-color: var(--primary-color);
}
.radio-dot.checked::after {
  content: '';
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--primary-color);
}

.help-icon {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 16px;
  height: 16px;
  background: #666;
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
  margin-left: 4px;
}

/* ====== 分析工具 ====== */
.tools-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.tools-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.4;
  display: block;
}
.btn-recommend {
  background: #fff6df;
  color: #333333;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.tool-item {
  border-top: 1px solid var(--border-color);
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tool-item:first-child { border-top: none; padding-top: 0; }
.tool-title { font-weight: 600; font-size: 14px; }
.tool-options { padding-left: 24px; }

/* ====== 底部固定按鈕 ====== */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  padding: 12px 20px calc(env(safe-area-inset-bottom) + 12px);
  background: rgba(255, 255, 255, 0.95);
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 12px;
  z-index: 10;
}
.btn {
  flex: 1;
  padding: 14px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #333333;
  text-align: center;
}
.btn-submit { background-color: var(--primary-color); }
.btn-reset { background-color: #e6dcc4; }

/* ====== 搜尋結果 ====== */
.result-card { margin-top: 6px; }

.result-count {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: normal;
  margin-left: 8px;
}

.empty-tip {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 30px 0;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}
.result-item:last-child { border-bottom: none; }

.result-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-info { flex: 1; min-width: 0; }

.result-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 4px;
}

.result-meta {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-more {
  text-align: center;
  padding: 16px 0 4px;
  font-size: 13px;
  color: var(--text-secondary);
}
.result-more .link {
  color: var(--primary-color);
  font-weight: 600;
}
</style>
