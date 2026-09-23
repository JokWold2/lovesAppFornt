<template>
  <view class="vb-chart">
    <!-- 标题 + 峰值 -->
    <view class="vb-head" v-if="caption || peak > 0">
      <text class="vb-head-caption">{{ caption }}</text>
      <view class="vb-head-peak">
        <text class="vb-head-peak-label">峰值</text>
        <text class="vb-head-peak-value">{{ fmt(peak) }}</text>
      </view>
    </view>

    <!-- 空态 -->
    <view v-if="!groups.length" class="vb-empty">暂无数据</view>

    <template v-else>
      <!-- 图表区（可横向滚动） -->
      <scroll-view class="vb-scroll" scroll-x show-scrollbar="false">
        <view class="vb-canvas">
          <view class="vb-plot">
            <view class="vb-grid">
              <view class="vb-grid-line" v-for="n in 5" :key="n"></view>
            </view>

            <view class="vb-bars">
              <view
                class="vb-group"
                v-for="(g, gi) in groups"
                :key="gi"
                :style="{ width: groupWidth + 'px' }"
                :class="{ 'is-active': activeIndex === gi }"
                @click="selectGroup(gi)"
              >
                <!-- 堆叠模式 -->
                <block v-if="stacked">
                  <view class="vb-stack" :style="{ height: stackHeight(g) + 'px' }">
                    <view
                      class="vb-seg"
                      v-for="(s, si) in g.segs"
                      :key="si"
                      :style="{ height: barHeight(s.value) + 'px', backgroundColor: s.color }"
                    ></view>
                  </view>
                </block>
                <!-- 分组模式 -->
                <block v-else>
                  <view
                    class="vb-col"
                    v-for="(s, si) in g.segs"
                    :key="si"
                    :style="{ height: barHeight(s.value) + 'px', backgroundColor: s.color }"
                  ></view>
                </block>
              </view>
            </view>
          </view>

          <view class="vb-labels">
            <view
              class="vb-label"
              v-for="(g, gi) in groups"
              :key="gi"
              :style="{ width: groupWidth + 'px' }"
              :class="{ 'is-active': activeIndex === gi }"
              @click="selectGroup(gi)"
            >{{ g.label }}</view>
          </view>
        </view>
      </scroll-view>

      <!-- 选中项明细 -->
      <view class="vb-detail" v-if="activeGroup">
        <view class="vb-detail-head">
          <text class="vb-detail-date">{{ activeGroup.full || activeGroup.label }}</text>
          <text class="vb-detail-total">合计 {{ fmt(activeTotal) }}</text>
        </view>
        <view class="vb-detail-items">
          <view class="vb-detail-item" v-for="(s, si) in activeGroup.segs" :key="si">
            <view class="vb-dot" :style="{ backgroundColor: s.color }"></view>
            <text class="vb-detail-name">{{ s.name }}</text>
            <text class="vb-detail-value">{{ fmt(s.value) }}</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  // [{ label, full, segs: [{ name, value, color }] }]
  groups: { type: Array, default: () => [] },
  stacked: { type: Boolean, default: false },
  maxHeight: { type: Number, default: 170 },
  groupWidth: { type: Number, default: 62 },
  unit: { type: String, default: '$' },
  decimals: { type: Number, default: 2 },
  caption: { type: String, default: '' }
})

const activeIndex = ref(0)

const toNum = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/** 每个分组的合计值 */
const groupTotal = (g) => {
  const segs = g && Array.isArray(g.segs) ? g.segs : []
  return segs.reduce((sum, s) => sum + toNum(s.value), 0)
}

/** 峰值：堆叠看合计，分组看单柱最大值 */
const peak = computed(() => {
  let max = 0
  props.groups.forEach((g) => {
    const value = props.stacked ? groupTotal(g) : Math.max(0, ...(g.segs || []).map((s) => toNum(s.value)))
    if (value > max) max = value
  })
  return Math.round(max * 100) / 100
})

/** 按峰值等比换算像素高度 */
const barHeight = (value) => {
  const v = toNum(value)
  if (peak.value <= 0 || v <= 0) return 0
  return Math.max(Math.round((v / peak.value) * props.maxHeight), 3)
}

const stackHeight = (g) => {
  const segs = g && Array.isArray(g.segs) ? g.segs : []
  return segs.reduce((sum, s) => sum + barHeight(s.value), 0)
}

const selectGroup = (index) => {
  activeIndex.value = index
}

const activeGroup = computed(() => props.groups[activeIndex.value] || null)

const activeTotal = computed(() => {
  const g = activeGroup.value
  if (!g) return 0
  if (props.stacked) return groupTotal(g)
  const segs = Array.isArray(g.segs) ? g.segs : []
  return segs.length ? toNum(segs[0].value) : 0
})

// 数据刷新后定位到最新一天
watch(
  () => props.groups,
  (list) => {
    activeIndex.value = list && list.length ? list.length - 1 : 0
  },
  { immediate: true }
)

/** 金额格式化：$1,234.00 */
const fmt = (value) => {
  const n = toNum(value)
  const negative = n < 0
  const fixed = Math.abs(n).toFixed(props.decimals)
  const [int, dec] = fixed.split('.')
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const body = dec ? `${withSep}.${dec}` : withSep
  return `${negative ? '-' : ''}${props.unit}${body}`
}
</script>

<style lang="scss" scoped>
.vb-chart {
  width: 100%;
}

.vb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.vb-head-caption {
  font-size: 12px;
  color: #94a3b8;
}

.vb-head-peak {
  display: flex;
  align-items: center;
  gap: 4px;
}

.vb-head-peak-label {
  font-size: 11px;
  color: #94a3b8;
}

.vb-head-peak-value {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
}

.vb-empty {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #cbd5e1;
}

.vb-scroll {
  width: 100%;
}

.vb-canvas {
  display: flex;
  flex-direction: column;
  width: max-content;
  min-width: 100%;
}

.vb-plot {
  position: relative;
  height: 190px;
  padding-top: 20px;
  box-sizing: border-box;
}

.vb-grid {
  position: absolute;
  left: 0;
  right: 0;
  top: 20px;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.vb-grid-line {
  height: 1px;
  background-color: #f1f5f9;
  width: 100%;
}

.vb-bars {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
}

.vb-group {
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  border-radius: 8px 8px 0 0;
  transition: background-color 0.2s ease;

  &.is-active {
    background-color: rgba(37, 99, 235, 0.05);
  }
}

.vb-col {
  width: 15px;
  border-radius: 4px 4px 0 0;
}

.vb-stack {
  width: 22px;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 4px 4px 0 0;
  overflow: hidden;
}

.vb-seg {
  width: 100%;
}

.vb-labels {
  display: flex;
  flex-direction: row;
  margin-top: 8px;
  border-top: 1px solid #f1f5f9;
  padding-top: 6px;
}

.vb-label {
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
  flex-shrink: 0;

  &.is-active {
    color: #2563eb;
    font-weight: 600;
  }
}

.vb-detail {
  margin-top: 12px;
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
}

.vb-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.vb-detail-date {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.vb-detail-total {
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
}

.vb-detail-items {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.vb-detail-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.vb-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.vb-detail-name {
  font-size: 12px;
  color: #64748b;
}

.vb-detail-value {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}
</style>
