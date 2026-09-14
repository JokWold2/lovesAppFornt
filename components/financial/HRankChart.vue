<template>
  <view class="hr-chart">
    <view class="hr-head" v-if="caption">
      <text class="hr-head-caption">{{ caption }}</text>
      <text class="hr-head-total">合计 {{ fmt(total) }}</text>
    </view>

    <view v-if="!list.length" class="hr-empty">暂无数据</view>

    <view v-else class="hr-list">
      <view class="hr-item" v-for="(item, index) in list" :key="index">
        <view class="hr-top">
          <view class="hr-rank" :class="'hr-rank-' + rankClass(index)">{{ index + 1 }}</view>
          <text class="hr-name">{{ item.name }}</text>
          <text class="hr-pct">{{ percent(item.value) }}%</text>
          <text class="hr-value">{{ fmt(item.value) }}</text>
        </view>
        <view class="hr-track">
          <view
            class="hr-fill"
            :class="'hr-fill-' + rankClass(index)"
            :style="{ width: widthOf(item.value) + '%' }"
          ></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // [{ name, value }]
  items: { type: Array, default: () => [] },
  // 最多展示条数
  top: { type: Number, default: 10 },
  unit: { type: String, default: '$' },
  decimals: { type: Number, default: 2 },
  caption: { type: String, default: '' }
})

const toNum = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

const list = computed(() =>
  props.items
    .map((item) => ({ name: item.name, value: toNum(item.value) }))
    .filter((item) => item.value > 0)
    .slice(0, props.top)
)

const max = computed(() => (list.value.length ? list.value[0].value : 0))
const total = computed(() => list.value.reduce((sum, item) => sum + item.value, 0))

const widthOf = (value) => (max.value > 0 ? Math.max((toNum(value) / max.value) * 100, 2) : 0)
const percent = (value) => (total.value > 0 ? ((toNum(value) / total.value) * 100).toFixed(1) : '0.0')

const rankClass = (index) => Math.min(index + 1, 4)

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
.hr-chart {
  width: 100%;
}

.hr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.hr-head-caption {
  font-size: 12px;
  color: #94a3b8;
}

.hr-head-total {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
}

.hr-empty {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #cbd5e1;
}

.hr-item {
  margin-bottom: 14px;

  &:last-child {
    margin-bottom: 0;
  }
}

.hr-top {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.hr-rank {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
  background-color: #cbd5e1;
}

.hr-rank-1 {
  background-color: #f59e0b;
}

.hr-rank-2 {
  background-color: #94a3b8;
}

.hr-rank-3 {
  background-color: #b45309;
}

.hr-name {
  flex: 1;
  font-size: 13px;
  color: #334155;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.hr-pct {
  font-size: 11px;
  color: #94a3b8;
  margin-right: 8px;
  flex-shrink: 0;
}

.hr-value {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  flex-shrink: 0;
}

.hr-track {
  height: 8px;
  background-color: #f1f5f9;
  border-radius: 6px;
  overflow: hidden;
}

.hr-fill {
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, #60a5fa 0%, #2563eb 100%);
  transition: width 0.3s ease;
}

.hr-fill-1 {
  background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
}

.hr-fill-2 {
  background: linear-gradient(90deg, #a5b4fc 0%, #818cf8 100%);
}

.hr-fill-3 {
  background: linear-gradient(90deg, #fdba74 0%, #f97316 100%);
}
</style>
