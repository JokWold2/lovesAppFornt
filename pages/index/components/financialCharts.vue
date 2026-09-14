<template>
  <view class="page-container">
    <!-- ===== 顶部：分店切换 + 刷新 ===== -->
    <view class="topbar">
      <scroll-view class="branch-scroll" scroll-x show-scrollbar="false">
        <view class="branch-row">
          <view
            class="branch-chip"
            :class="{ active: branchId === 0 }"
            @click="switchBranch(0)"
          >全部分店</view>
          <view
            class="branch-chip"
            v-for="i in 10"
            :key="i"
            :class="{ active: branchId === i }"
            @click="switchBranch(i)"
          >分店 {{ i }}</view>
        </view>
      </scroll-view>

      <view class="topbar-sub">
        <view class="topbar-title-row">
          <text class="topbar-title">{{ branchLabel }}</text>
          <text class="topbar-title-sub">数据分析与图表展示</text>
        </view>
        <view class="topbar-refresh" @click="loadData">
          <text class="topbar-refresh-icon" :class="{ spinning: loading }">↻</text>
          <text class="topbar-refresh-text">{{ loading ? '加载中' : '刷新' }}</text>
        </view>
      </view>
    </view>

    <!-- ===== 加载中 ===== -->
    <view v-if="loading && !loaded" class="state-box">
      <text class="state-icon">📊</text>
      <text class="state-text">正在加载财务数据…</text>
    </view>

    <!-- ===== 无数据 ===== -->
    <view v-else-if="isEmpty" class="state-box">
      <text class="state-icon">🗂️</text>
      <text class="state-text">{{ branchLabel }} 暂无财务数据</text>
      <text class="state-tip">请先在「财务录入表 / 报销明细表」中录入并提交数据</text>
    </view>

    <block v-else>
      <!-- ===== 核心指标 ===== -->
      <block v-if="hasFinancialData">
      <view class="kpi-grid">
        <view class="kpi-card kpi-blue">
          <text class="kpi-label">营业额合计</text>
          <text class="kpi-value" :class="kpiClass(summary.turnover)">{{ fmtMoney(summary.turnover) }}</text>
          <text class="kpi-sub">现金 + 八达通</text>
        </view>
        <view class="kpi-card kpi-cyan">
          <text class="kpi-label">营业收入合计</text>
          <text class="kpi-value" :class="kpiClass(summary.bizIncome)">{{ fmtMoney(summary.bizIncome) }}</text>
          <text class="kpi-sub">明细表「收入」字段</text>
        </view>
        <view class="kpi-card kpi-red">
          <text class="kpi-label">支出合计</text>
          <text class="kpi-value" :class="kpiClass(summary.totalCost)">{{ fmtMoney(summary.totalCost) }}</text>
          <text class="kpi-sub">录入表「总计」字段</text>
        </view>
        <view class="kpi-card" :class="summary.net >= 0 ? 'kpi-green' : 'kpi-red'">
          <text class="kpi-label">净额（营业额 - 支出）</text>
          <text class="kpi-value" :class="kpiClass(summary.net)">{{ fmtMoney(summary.net) }}</text>
          <text class="kpi-sub">{{ summary.net >= 0 ? '盈余' : '亏损' }}</text>
        </view>
      </view>

      <!-- 统计区间 -->
      <view class="range-bar">
        <view class="range-item">
          <text class="range-label">营业天数</text>
          <text class="range-value">{{ summary.incomeDays }}</text>
        </view>
        <view class="range-divider"></view>
        <view class="range-item">
          <text class="range-label">支出笔数</text>
          <text class="range-value">{{ summary.costDays }}</text>
        </view>
        <view class="range-divider"></view>
        <view class="range-item range-item-wide">
          <text class="range-label">数据区间</text>
          <text class="range-value">{{ summary.dateRange || '—' }}</text>
        </view>
      </view>
      </block>

      <view v-else class="info-tip">
        <text class="info-tip-text">💰 当前还没有财务录入数据，可先查看下方「价格参考」了解货品与参考单价。</text>
      </view>

      <!-- ===== Tab 切换 ===== -->
      <view class="tab-bar">
        <view
          class="tab-item"
          v-for="tab in tabs"
          :key="tab.key"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.label }}</view>
      </view>

      <!-- ===== 总览 ===== -->
      <block v-if="activeTab === 'overview'">
        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">💰</text>
            <text class="card-title-text">每日营业额构成</text>
            <text class="card-title-tag">现金 / 八达通（堆叠）</text>
          </view>
          <VBarChart
            :groups="turnoverGroups"
            stacked
            :caption="'单位：港币 · 点击柱子查看当日明细'"
          />
        </view>

        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">💸</text>
            <text class="card-title-text">每日支出趋势</text>
            <text class="card-title-tag">录入表数据</text>
          </view>
          <VBarChart
            :groups="costGroups"
            :caption="'单位：港币 · 点击柱子查看当日明细'"
          />
        </view>

        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">🧾</text>
            <text class="card-title-text">收支概况</text>
          </view>
          <view class="summary-list">
            <view class="summary-row">
              <text class="summary-name">营业额合计（现金 + 八达通）</text>
              <text class="summary-value">{{ fmtMoney(summary.turnover) }}</text>
            </view>
            <view class="summary-row">
              <text class="summary-name">营业收入合计</text>
              <text class="summary-value">{{ fmtMoney(summary.bizIncome) }}</text>
            </view>
            <view class="summary-row">
              <text class="summary-name">支出合计</text>
              <text class="summary-value danger">{{ fmtMoney(summary.totalCost) }}</text>
            </view>
            <view class="summary-row summary-row-total">
              <text class="summary-name">净额</text>
              <text class="summary-value" :class="summary.net >= 0 ? 'success' : 'danger'">
                {{ fmtMoney(summary.net) }}
              </text>
            </view>
          </view>
        </view>
      </block>

      <!-- ===== 收入分析（报销明细表 / financialExcel） ===== -->
      <block v-if="activeTab === 'income'">
        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">📈</text>
            <text class="card-title-text">每日营业收入</text>
            <text class="card-title-tag">收入字段</text>
          </view>
          <VBarChart
            :groups="bizIncomeGroups"
            :caption="'单位：港币 · 点击柱子查看当日明细'"
          />
        </view>

        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">🕒</text>
            <text class="card-title-text">班次营业额占比</text>
            <text class="card-title-tag">早 / 中 / 晚</text>
          </view>

          <view v-if="shiftTotal <= 0" class="card-empty">暂无数据</view>
          <block v-else>
            <view class="stack-bar">
              <view
                class="stack-seg"
                v-for="seg in shiftSegs"
                :key="seg.key"
                :style="{ width: seg.percent + '%', backgroundColor: seg.color }"
              ></view>
            </view>
            <view class="legend">
              <view class="legend-item" v-for="seg in shiftSegs" :key="seg.key">
                <view class="legend-dot" :style="{ backgroundColor: seg.color }"></view>
                <view class="legend-text">
                  <text class="legend-name">{{ seg.name }}</text>
                  <text class="legend-value">{{ fmtMoney(seg.value) }} · {{ seg.percent }}%</text>
                </view>
              </view>
            </view>
          </block>
        </view>

        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">📋</text>
            <text class="card-title-text">收入数据明细</text>
            <text class="card-title-tag">{{ incomeList.length }} 天</text>
          </view>

          <view v-if="!incomeList.length" class="card-empty">暂无数据</view>
          <scroll-view v-else class="mini-table-scroll" scroll-x show-scrollbar="false">
            <view class="mini-table">
              <view class="mt-row mt-head">
                <view class="mt-cell mt-col-date">日期</view>
                <view class="mt-cell mt-col-num">现金</view>
                <view class="mt-cell mt-col-num">八达通</view>
                <view class="mt-cell mt-col-num">小计</view>
              </view>
              <view class="mt-row" v-for="(row, index) in incomeList" :key="index">
                <view class="mt-cell mt-col-date">{{ row.date }}</view>
                <view class="mt-cell mt-col-num">{{ fmtMoney(row.cash) }}</view>
                <view class="mt-cell mt-col-num">{{ fmtMoney(row.octopus) }}</view>
                <view class="mt-cell mt-col-num mt-strong">{{ fmtMoney(row.total) }}</view>
              </view>
            </view>
          </scroll-view>
        </view>
      </block>

      <!-- ===== 支出分析（财务录入表 / financialTable） ===== -->
      <block v-if="activeTab === 'expense'">
        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">🏢</text>
            <text class="card-title-text">供应商支出排行</text>
            <text class="card-title-tag">TOP 10</text>
          </view>
          <HRankChart :items="stats.supplierCost" :top="10" caption="单位：港币" />
        </view>

        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">📦</text>
            <text class="card-title-text">货物支出排行</text>
            <text class="card-title-tag">TOP 10</text>
          </view>
          <HRankChart :items="stats.goodsCost" :top="10" caption="单位：港币" />
        </view>

        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">💸</text>
            <text class="card-title-text">每日支出趋势</text>
            <text class="card-title-tag">总计字段</text>
          </view>
          <VBarChart
            :groups="costGroups"
            :caption="'单位：港币 · 点击柱子查看当日明细'"
          />
        </view>

        <view class="card">
          <view class="card-title">
            <text class="card-title-icon">📋</text>
            <text class="card-title-text">支出数据明细</text>
            <text class="card-title-tag">{{ costList.length }} 天</text>
          </view>

          <view v-if="!costList.length" class="card-empty">暂无数据</view>
          <scroll-view v-else class="mini-table-scroll" scroll-x show-scrollbar="false">
            <view class="mini-table">
              <view class="mt-row mt-head">
                <view class="mt-cell mt-col-date">日期</view>
                <view class="mt-cell mt-col-num">支出金额</view>
                <view class="mt-cell mt-col-num">占总支比</view>
              </view>
              <view class="mt-row" v-for="(row, index) in costList" :key="index">
                <view class="mt-cell mt-col-date">{{ row.date }}</view>
                <view class="mt-cell mt-col-num mt-strong">{{ fmtMoney(row.cost) }}</view>
                <view class="mt-cell mt-col-num">{{ row.percent }}%</view>
              </view>
            </view>
          </scroll-view>
        </view>
      </block>

      <!-- ===== 价格参考（reference-data） ===== -->
      <block v-if="activeTab === 'reference'">
        <view v-if="!referenceData.length" class="card">
          <view class="card-empty">{{ refLoading ? '正在加载参考数据…' : '暂无参考数据' }}</view>
        </view>

        <block v-else>
          <view class="kpi-grid">
            <view class="kpi-card kpi-blue">
              <text class="kpi-label">供应商数</text>
              <text class="kpi-value">{{ refStats.supplierCount }}</text>
              <text class="kpi-sub">家</text>
            </view>
            <view class="kpi-card kpi-cyan">
              <text class="kpi-label">货品总数</text>
              <text class="kpi-value">{{ refStats.itemCount }}</text>
              <text class="kpi-sub">项</text>
            </view>
            <view class="kpi-card kpi-green">
              <text class="kpi-label">已报价货品</text>
              <text class="kpi-value">{{ refStats.pricedCount }}</text>
              <text class="kpi-sub">占 {{ refStats.pricedRatio }}%</text>
            </view>
            <view class="kpi-card kpi-orange">
              <text class="kpi-label">参考单价（中位数）</text>
              <text class="kpi-value" :class="kpiClass(refStats.medianPrice)">{{ fmtMoney(refStats.medianPrice) }}</text>
              <text class="kpi-sub">平均 {{ fmtMoney(refStats.avgPrice) }}</text>
            </view>
          </view>

          <view class="card">
            <view class="card-title">
              <text class="card-title-icon">🏷️</text>
              <text class="card-title-text">货品数量排行</text>
              <text class="card-title-tag">按供应商 TOP 10</text>
            </view>
            <HRankChart :items="refStats.countRank" :top="10" unit="" :decimals="0" caption="单位：项" />
          </view>

          <view class="card">
            <view class="card-title">
              <text class="card-title-icon">💲</text>
              <text class="card-title-text">平均单价排行</text>
              <text class="card-title-tag">按供应商 TOP 10</text>
            </view>
            <HRankChart :items="refStats.avgRank" :top="10" caption="单位：港币" />
          </view>

          <view class="card">
            <view class="card-title">
              <text class="card-title-icon">🥇</text>
              <text class="card-title-text">最贵货品</text>
              <text class="card-title-tag">TOP 10</text>
            </view>
            <HRankChart :items="refStats.expensiveRank" :top="10" caption="单位：港币" />
          </view>

          <view class="card">
            <view class="card-title">
              <text class="card-title-icon">📊</text>
              <text class="card-title-text">单价区间分布</text>
              <text class="card-title-tag">已报价 {{ refStats.pricedCount }} 项</text>
            </view>
            <VBarChart
              :groups="refStats.priceBuckets"
              :group-width="54"
              unit=""
              :decimals="0"
              :caption="'单位：项 · 横轴为单价区间（港币）'"
            />
          </view>

          <view class="card">
            <view class="card-title">
              <text class="card-title-icon">🔍</text>
              <text class="card-title-text">参考价格查询</text>
              <text class="card-title-tag">{{ refFiltered.length }} 条</text>
            </view>

            <view class="ref-search">
              <text class="ref-search-icon">🔍</text>
              <input
                class="ref-search-input"
                type="text"
                v-model="refKeyword"
                placeholder="搜索货名或供应商"
                placeholder-class="ph-color"
              />
              <text v-if="refKeyword" class="ref-search-clear" @click="refKeyword = ''">✕</text>
            </view>

            <view class="ref-filter-row">
              <view
                class="ref-chip"
                v-for="item in refPriceFilters"
                :key="item.key"
                :class="{ active: refPriceFilter === item.key }"
                @click="refPriceFilter = item.key"
              >{{ item.label }}</view>
            </view>

            <scroll-view class="ref-supplier-scroll" scroll-x show-scrollbar="false">
              <view class="ref-supplier-row">
                <view
                  class="ref-supplier-chip"
                  :class="{ active: !refSupplier }"
                  @click="refSupplier = ''"
                >全部供应商</view>
                <view
                  class="ref-supplier-chip"
                  v-for="name in refStats.supplierNames"
                  :key="name"
                  :class="{ active: refSupplier === name }"
                  @click="refSupplier = name"
                >{{ name }}</view>
              </view>
            </scroll-view>

            <view v-if="!refFiltered.length" class="card-empty">没有匹配的货品</view>
            <block v-else>
              <view class="ref-list">
                <view class="ref-item" v-for="(row, index) in refVisible" :key="index">
                  <view class="ref-item-main">
                    <text class="ref-item-name">{{ row.name || '（未命名）' }}</text>
                    <text class="ref-item-supplier">{{ row.supplier }}</text>
                  </view>
                  <text class="ref-item-price" :class="{ 'is-empty': !(row.price > 0) }">
                    {{ row.price > 0 ? fmtMoney(row.price) : '未报价' }}
                  </text>
                </view>
              </view>
              <view v-if="refFiltered.length > refVisible.length" class="ref-more">
                仅显示前 {{ refVisible.length }} / {{ refFiltered.length }} 条，请用搜索或供应商筛选缩小范围
              </view>
            </block>
          </view>
        </block>
      </block>

      <!-- 数据来源说明 -->
      <view class="source-note">
        <text class="source-note-title">数据来源</text>
        <text class="source-note-text" v-for="(note, index) in sourceNotes" :key="index">{{ note }}</text>
      </view>
    </block>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { get } from '@/utils/request.js'
import VBarChart from '@/components/financial/VBarChart.vue'
import HRankChart from '@/components/financial/HRankChart.vue'

const SHIFT_META = {
  morning: { name: '早班', color: '#f59e0b' },
  noon: { name: '中班', color: '#3b82f6' },
  night: { name: '晚班', color: '#8b5cf6' }
}

const tabs = [
  { key: 'overview', label: '总览' },
  { key: 'income', label: '收入分析' },
  { key: 'expense', label: '支出分析' },
  { key: 'reference', label: '价格参考' }
]

// 单价区间分桶（用于价格分布图）
const PRICE_BUCKETS = [
  { label: '≤50', min: 0, max: 50, color: '#93c5fd' },
  { label: '50-100', min: 50, max: 100, color: '#60a5fa' },
  { label: '100-200', min: 100, max: 200, color: '#3b82f6' },
  { label: '200-500', min: 200, max: 500, color: '#2563eb' },
  { label: '500-1000', min: 500, max: 1000, color: '#8b5cf6' },
  { label: '1000+', min: 1000, max: Infinity, color: '#ef4444' }
]

// 参考价格查询：报价状态筛选
const refPriceFilters = [
  { key: 'all', label: '全部' },
  { key: 'priced', label: '已报价' },
  { key: 'unpriced', label: '未报价' }
]

// 参考价格列表单次最多渲染的行数（避免一次性渲染 700+ 行）
const REF_RENDER_LIMIT = 50

const branchId = ref(0)
const loading = ref(false)
const loaded = ref(false)
const activeTab = ref('overview')
const stats = ref({
  incomeTrend: [],
  costTrend: [],
  supplierCost: [],
  goodsCost: [],
  shiftIncome: []
})

// 参考数据（api/financial/reference-data）：供应商 + 货名 + 参考单价
const referenceData = ref([])
const refLoaded = ref(false)
const refLoading = ref(false)
const refKeyword = ref('')
const refSupplier = ref('')
const refPriceFilter = ref('all')

let skipNextShow = true

onLoad((options) => {
  if (options && options.branchId !== undefined && options.branchId !== null && options.branchId !== '') {
    const parsed = parseInt(options.branchId, 10)
    branchId.value = Number.isFinite(parsed) ? parsed : 0
  }
  loadData()
})

onShow(() => {
  // 首次进入由 onLoad 负责，之后从录入页返回时自动刷新
  if (skipNextShow) {
    skipNextShow = false
    return
  }
  loadData()
})

const loadReferenceData = async (force = false) => {
  if (refLoading.value) return
  if (refLoaded.value && !force) return
  refLoading.value = true
  try {
    const res = await get('/api/financial/reference-data')
    const list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : [])
    referenceData.value = list
    refLoaded.value = true
  } catch (e) {
    console.error('加载参考数据失败:', e)
  } finally {
    refLoading.value = false
  }
}

const loadData = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const [statsRes] = await Promise.all([
      get('/api/financial/statistics', { branchId: branchId.value }).catch((e) => {
        console.error('加载统计数据失败:', e)
        return null
      }),
      loadReferenceData()
    ])

    if (statsRes) {
      stats.value = {
        incomeTrend: Array.isArray(statsRes.incomeTrend) ? statsRes.incomeTrend : [],
        costTrend: Array.isArray(statsRes.costTrend) ? statsRes.costTrend : [],
        supplierCost: Array.isArray(statsRes.supplierCost) ? statsRes.supplierCost : [],
        goodsCost: Array.isArray(statsRes.goodsCost) ? statsRes.goodsCost : [],
        shiftIncome: Array.isArray(statsRes.shiftIncome) ? statsRes.shiftIncome : []
      }
    }

    // 没有财务数据时直接落到「价格参考」，不让用户看到空面板
    if (!hasFinancialData.value && referenceData.value.length) {
      activeTab.value = 'reference'
    }
  } catch (e) {
    console.error('加载统计数据失败:', e)
  } finally {
    // 保持已有数据，避免刷新失败后页面空白
    loaded.value = true
    loading.value = false
  }
}

const switchBranch = (id) => {
  if (branchId.value === id) return
  branchId.value = id
  loadData()
}

/* ---------------- 通用格式化 ---------------- */

const toNum = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const round2 = (n) => Math.round(n * 100) / 100

const fmtMoney = (v) => {
  const n = toNum(v)
  const negative = n < 0
  const fixed = Math.abs(n).toFixed(2)
  const [int, dec] = fixed.split('.')
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}$${withSep}.${dec}`
}

const shortDate = (date) => (typeof date === 'string' && date.length >= 10 ? date.slice(5) : date)

// 金额过长时自动缩小字号，避免撑破卡片
const kpiClass = (value) => {
  const len = fmtMoney(value).length
  if (len > 14) return 'kpi-value-xs'
  if (len > 11) return 'kpi-value-sm'
  return ''
}

/* ---------------- 顶部 / 状态 ---------------- */

const branchLabel = computed(() => (branchId.value === 0 ? '全部分店' : `分店 ${branchId.value}`))

const isEmpty = computed(() => !hasFinancialData.value && referenceData.value.length === 0)

const hasFinancialData = computed(() => {
  const s = stats.value
  return !!(
    s.incomeTrend.length ||
    s.costTrend.length ||
    s.supplierCost.length ||
    s.goodsCost.length ||
    s.shiftIncome.length
  )
})

/* ---------------- 指标汇总 ---------------- */

const summary = computed(() => {
  const s = stats.value
  const turnover = round2(
    s.incomeTrend.reduce((sum, r) => sum + toNum(r.total_cash) + toNum(r.total_octopus), 0)
  )
  const bizIncome = round2(s.incomeTrend.reduce((sum, r) => sum + toNum(r.total_income), 0))
  const totalCost = round2(s.costTrend.reduce((sum, r) => sum + toNum(r.total_cost), 0))

  const allDates = [
    ...s.incomeTrend.map((r) => r.date),
    ...s.costTrend.map((r) => r.date)
  ].filter(Boolean).sort()

  return {
    turnover,
    bizIncome,
    totalCost,
    net: round2(turnover - totalCost),
    incomeDays: s.incomeTrend.length,
    costDays: s.costTrend.length,
    dateRange: allDates.length ? `${allDates[0]} ~ ${allDates[allDates.length - 1]}` : ''
  }
})

/* ---------------- 图表数据 ---------------- */

// 每日营业额构成（现金 + 八达通，堆叠）
const turnoverGroups = computed(() =>
  stats.value.incomeTrend.map((r) => ({
    label: shortDate(r.date),
    full: r.date,
    segs: [
      { name: '现金', value: toNum(r.total_cash), color: '#2563eb' },
      { name: '八达通', value: toNum(r.total_octopus), color: '#8b5cf6' }
    ]
  }))
)

// 每日营业收入
const bizIncomeGroups = computed(() =>
  stats.value.incomeTrend.map((r) => ({
    label: shortDate(r.date),
    full: r.date,
    segs: [{ name: '营业收入', value: toNum(r.total_income), color: '#06b6d4' }]
  }))
)

// 每日支出
const costGroups = computed(() =>
  stats.value.costTrend.map((r) => ({
    label: shortDate(r.date),
    full: r.date,
    segs: [{ name: '支出', value: toNum(r.total_cost), color: '#ef4444' }]
  }))
)

// 班次占比
const shiftSegs = computed(() => {
  const map = { morning: null, noon: null, night: null }
  stats.value.shiftIncome.forEach((row) => {
    if (map[row.shift] !== undefined) map[row.shift] = row
  })

  const rows = Object.keys(SHIFT_META).map((key) => {
    const row = map[key] || {}
    const value = round2(toNum(row.total_cash) + toNum(row.total_octopus))
    return { key, name: SHIFT_META[key].name, color: SHIFT_META[key].color, value }
  })

  const total = rows.reduce((sum, r) => sum + r.value, 0)
  return rows.map((r) => ({
    ...r,
    percent: total > 0 ? Number(((r.value / total) * 100).toFixed(1)) : 0
  }))
})

const shiftTotal = computed(() => shiftSegs.value.reduce((sum, r) => sum + r.value, 0))

/* ---------------- 明细列表 ---------------- */

const incomeList = computed(() =>
  stats.value.incomeTrend.map((r) => {
    const cash = toNum(r.total_cash)
    const octopus = toNum(r.total_octopus)
    return { date: r.date, cash, octopus, total: round2(cash + octopus) }
  })
)

const costList = computed(() => {
  const total = summary.value.totalCost
  return stats.value.costTrend.map((r) => {
    const cost = toNum(r.total_cost)
    return {
      date: r.date,
      cost,
      percent: total > 0 ? ((cost / total) * 100).toFixed(1) : '0.0'
    }
  })
})

/* ---------------- 参考数据（reference-data）分析 ---------------- */

const refStats = computed(() => {
  const list = Array.isArray(referenceData.value) ? referenceData.value : []
  const supplierNames = []
  const countRank = []
  const avgRank = []
  const rows = []
  const prices = []
  let itemCount = 0

  list.forEach((group) => {
    const supplier = group && group.supplier !== undefined && group.supplier !== null
      ? String(group.supplier).trim()
      : ''
    const items = group && Array.isArray(group.items) ? group.items : []
    let pricedSum = 0
    let pricedCount = 0

    items.forEach((item) => {
      const name = item && item.name !== undefined && item.name !== null ? String(item.name).trim() : ''
      const price = toNum(item && item.price)
      itemCount += 1
      if (price > 0) {
        pricedSum += price
        pricedCount += 1
        prices.push(price)
      }
      rows.push({ supplier, name, price })
    })

    supplierNames.push(supplier)
    countRank.push({ name: supplier, value: items.length })
    avgRank.push({ name: supplier, value: pricedCount ? round2(pricedSum / pricedCount) : 0 })
  })

  countRank.sort((a, b) => b.value - a.value)
  avgRank.sort((a, b) => b.value - a.value)

  // 中位数比均值更抗极端值（比如 7500 的单项价）
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianPrice = sorted.length
    ? (sorted.length % 2 ? sorted[mid] : round2((sorted[mid - 1] + sorted[mid]) / 2))
    : 0
  const avgPrice = sorted.length ? round2(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0

  // 单价区间分布
  const priceBuckets = PRICE_BUCKETS.map((bucket) => {
    const count = prices.filter((p) => p > bucket.min && p <= bucket.max).length
    return {
      label: bucket.label,
      full: bucket.label,
      segs: [{ name: bucket.label, value: count, color: bucket.color }]
    }
  })

  // 最贵货品 TOP 10（带上供应商，便于定位）
  const expensiveRank = [...rows]
    .filter((row) => row.price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, 10)
    .map((row) => ({ name: row.supplier ? `${row.name}（${row.supplier}）` : row.name, value: row.price }))

  return {
    supplierCount: list.length,
    supplierNames,
    itemCount,
    pricedCount: prices.length,
    pricedRatio: itemCount ? ((prices.length / itemCount) * 100).toFixed(1) : '0.0',
    medianPrice,
    avgPrice,
    countRank,
    avgRank,
    expensiveRank,
    priceBuckets,
    rows
  }
})

const refFiltered = computed(() => {
  const keyword = refKeyword.value.trim().toLowerCase()
  const supplier = refSupplier.value
  const mode = refPriceFilter.value

  return refStats.value.rows.filter((row) => {
    if (supplier && row.supplier !== supplier) return false
    if (mode === 'priced' && !(row.price > 0)) return false
    if (mode === 'unpriced' && row.price > 0) return false
    if (keyword) {
      const hit = row.name.toLowerCase().includes(keyword) || row.supplier.toLowerCase().includes(keyword)
      if (!hit) return false
    }
    return true
  })
})

const refVisible = computed(() => refFiltered.value.slice(0, REF_RENDER_LIMIT))

/* ---------------- 数据来源说明（随 Tab 变化） ---------------- */

const sourceNotes = computed(() => {
  if (activeTab.value === 'reference') {
    const s = refStats.value
    return [
      `· 价格参考来自后端 /api/financial/reference-data：${s.supplierCount} 家供应商 / ${s.itemCount} 项货品`,
      `· 其中 ${s.pricedCount} 项有参考单价，录入表选择货名时会自动带出该单价`,
      '· 中位数已避免极端值干扰（均值更容易被高价单项拉偏）'
    ]
  }
  return [
    '· 收入类图表来自「报销明细表」：日期 / 班次 / 收入 / 现金 / 八达通',
    '· 支出类图表来自「财务录入表」：日期 / 公司名 / 货名 / 数量 / 单价 / 总计',
    '· 营业额 = 现金 + 八达通，与录入页底部「总金额」口径一致'
  ]
})
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #f4f5f7;
  padding: 12px 12px 32px 12px;
  box-sizing: border-box;
}

/* ===== 顶部 ===== */
.topbar {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  margin-bottom: 12px;
}

.branch-scroll {
  width: 100%;
  white-space: nowrap;
}

.branch-row {
  display: flex;
  flex-direction: row;
}

.branch-chip {
  display: inline-block;
  padding: 7px 16px;
  font-size: 13px;
  color: #555555;
  border-radius: 18px;
  margin-right: 8px;
  background-color: #f1f3f6;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &:last-child {
    margin-right: 0;
  }

  &.active {
    color: #ffffff;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    font-weight: bold;
    box-shadow: 0 3px 8px rgba(37, 99, 235, 0.25);
  }
}

.topbar-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.topbar-title-row {
  display: flex;
  align-items: baseline;
}

.topbar-title {
  font-size: 16px;
  font-weight: bold;
  color: #1e293b;
  margin-right: 8px;
}

.topbar-title-sub {
  font-size: 11px;
  color: #94a3b8;
}

.topbar-refresh {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 16px;
  background-color: #eff6ff;
  flex-shrink: 0;
}

.topbar-refresh-icon {
  font-size: 14px;
  color: #2563eb;
  margin-right: 4px;
  display: inline-block;

  &.spinning {
    animation: rotate 1s linear infinite;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.topbar-refresh-text {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
}

/* ===== 状态 ===== */
.state-box {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.state-icon {
  font-size: 34px;
  margin-bottom: 12px;
}

.state-text {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 6px;
}

.state-tip {
  font-size: 12px;
  color: #94a3b8;
}

.info-tip {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  border-left: 3px solid #f59e0b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.info-tip-text {
  font-size: 12.5px;
  color: #b45309;
  line-height: 1.6;
}

/* ===== KPI ===== */
.kpi-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 12px;
}

.kpi-card {
  width: 48.5%;
  background-color: #ffffff;
  border-radius: 10px;
  padding: 14px 12px;
  margin-bottom: 12px;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  border-left: 3px solid #cbd5e1;
}

.kpi-blue {
  border-left-color: #2563eb;
}

.kpi-cyan {
  border-left-color: #06b6d4;
}

.kpi-red {
  border-left-color: #ef4444;
}

.kpi-green {
  border-left-color: #10b981;
}

.kpi-orange {
  border-left-color: #f59e0b;
}

.kpi-label {
  font-size: 11px;
  color: #94a3b8;
  display: block;
  margin-bottom: 6px;
}

.kpi-value {
  font-size: 16px;
  font-weight: bold;
  color: #1e293b;
  display: block;
  margin-bottom: 4px;
}

.kpi-value-sm {
  font-size: 13px;
}

.kpi-value-xs {
  font-size: 11.5px;
}

.kpi-sub {
  font-size: 10px;
  color: #cbd5e1;
}

/* ===== 统计区间 ===== */
.range-bar {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.range-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 auto;
  padding: 0 8px;
}

.range-item-wide {
  flex: 1;
  align-items: flex-start;
  padding-left: 14px;
}

.range-label {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.range-value {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.range-item-wide .range-value {
  font-size: 12px;
  font-weight: 600;
}

.range-divider {
  width: 1px;
  height: 26px;
  background-color: #f1f5f9;
}

/* ===== Tabs ===== */
.tab-bar {
  display: flex;
  flex-direction: row;
  background-color: #ffffff;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.tab-item {
  flex: 1;
  text-align: center;
  font-size: 12.5px;
  color: #64748b;
  padding: 9px 0;
  border-radius: 8px;

  &.active {
    color: #ffffff;
    font-weight: bold;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 3px 8px rgba(37, 99, 235, 0.25);
  }
}

/* ===== 卡片 ===== */
.card {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 16px 14px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.card-title {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.card-title-icon {
  font-size: 15px;
  margin-right: 6px;
}

.card-title-text {
  font-size: 15px;
  font-weight: bold;
  color: #1e293b;
  margin-right: 8px;
}

.card-title-tag {
  font-size: 10px;
  color: #64748b;
  background-color: #f1f5f9;
  padding: 2px 8px;
  border-radius: 10px;
}

.card-empty {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #cbd5e1;
}

/* ===== 占比条 ===== */
.stack-bar {
  height: 22px;
  border-radius: 11px;
  overflow: hidden;
  display: flex;
  flex-direction: row;
  background-color: #f1f5f9;
  margin-bottom: 14px;
}

.stack-seg {
  height: 100%;
}

.legend {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.legend-item {
  width: 50%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}

.legend-text {
  display: flex;
  flex-direction: column;
}

.legend-name {
  font-size: 12px;
  color: #334155;
  font-weight: 600;
}

.legend-value {
  font-size: 11px;
  color: #94a3b8;
}

/* ===== 收支概况 ===== */
.summary-list {
  display: flex;
  flex-direction: column;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f8fafc;
}

.summary-row-total {
  border-bottom: none;
  border-top: 1px dashed #e2e8f0;
  margin-top: 4px;
}

.summary-name {
  font-size: 13px;
  color: #64748b;
}

.summary-value {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;

  &.danger {
    color: #ef4444;
  }

  &.success {
    color: #10b981;
  }
}

/* ===== 简易表格 ===== */
.mini-table-scroll {
  width: 100%;
}

.mini-table {
  width: max-content;
  min-width: 100%;
  display: flex;
  flex-direction: column;
}

.mt-row {
  display: flex;
  flex-direction: row;
  border-bottom: 1px solid #f5f6f8;
}

.mt-head {
  background-color: #f9fafe;
  border-radius: 6px;
}

.mt-cell {
  padding: 10px 8px;
  font-size: 12px;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mt-head .mt-cell {
  font-weight: bold;
  color: #555555;
}

.mt-col-date {
  width: 108px;
  justify-content: flex-start;
  padding-left: 10px;
}

.mt-col-num {
  width: 118px;
  justify-content: flex-end;
  padding-right: 10px;
}

.mt-strong {
  font-weight: 700;
  color: #2563eb;
}

/* ===== 价格参考 ===== */
.ref-search {
  display: flex;
  align-items: center;
  background-color: #f1f5f9;
  border-radius: 20px;
  padding: 0 12px;
  height: 38px;
  margin-bottom: 10px;
}

.ref-search-icon {
  font-size: 12px;
  margin-right: 6px;
  flex-shrink: 0;
}

.ref-search-input {
  flex: 1;
  font-size: 13px;
  color: #1e293b;
  height: 100%;
  text-align: left;
}

:deep(.ph-color) {
  color: #c0c4cc;
  font-size: 12.5px;
}

.ref-search-clear {
  font-size: 12px;
  color: #94a3b8;
  padding: 0 4px;
  flex-shrink: 0;
}

.ref-filter-row {
  display: flex;
  flex-direction: row;
  margin-bottom: 10px;
}

.ref-chip {
  padding: 5px 14px;
  border-radius: 14px;
  font-size: 12px;
  color: #64748b;
  background-color: #f1f5f9;
  margin-right: 8px;

  &:last-child {
    margin-right: 0;
  }

  &.active {
    color: #ffffff;
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    font-weight: 600;
  }
}

.ref-supplier-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 12px;
}

.ref-supplier-row {
  display: flex;
  flex-direction: row;
}

.ref-supplier-chip {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11.5px;
  color: #475569;
  border: 1px solid #e2e8f0;
  margin-right: 8px;
  flex-shrink: 0;

  &:last-child {
    margin-right: 0;
  }

  &.active {
    color: #2563eb;
    border-color: #93c5fd;
    background-color: #eff6ff;
    font-weight: 600;
  }
}

.ref-list {
  display: flex;
  flex-direction: column;
}

.ref-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f5f6f8;
}

.ref-item-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-right: 10px;
  overflow: hidden;
}

.ref-item-name {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ref-item-supplier {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 3px;
}

.ref-item-price {
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
  flex-shrink: 0;

  &.is-empty {
    color: #cbd5e1;
    font-weight: 400;
    font-size: 12px;
  }
}

.ref-more {
  padding-top: 12px;
  font-size: 11.5px;
  color: #94a3b8;
  text-align: center;
}

/* ===== 数据来源 ===== */
.source-note {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.source-note-title {
  font-size: 12px;
  font-weight: bold;
  color: #475569;
  margin-bottom: 8px;
}

.source-note-text {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.8;
}
</style>
